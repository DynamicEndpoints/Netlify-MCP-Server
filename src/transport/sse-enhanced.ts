// Enhanced SSE Transport with WebSocket fallback and advanced features
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";

export interface SSETransportOptions {
  port: number;
  path?: string;
  enableWebSocket?: boolean;
  enableCors?: boolean;
  maxConnections?: number;
  heartbeatInterval?: number;
  compressionLevel?: number;
}

export class EnhancedSSETransport extends EventEmitter implements Transport {
  private server: any;
  private wsServer?: WebSocketServer;
  private connections = new Map<string, SSEConnection>();
  private options: Required<SSETransportOptions>;
  private isRunning = false;
  private heartbeatTimer?: NodeJS.Timeout;
  private stats = {
    totalConnections: 0,
    activeConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
  };

  constructor(options: SSETransportOptions) {
    super();
    this.options = {
      port: options.port,
      path: options.path || "/sse",
      enableWebSocket: options.enableWebSocket ?? true,
      enableCors: options.enableCors ?? true,
      maxConnections: options.maxConnections ?? 100,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      compressionLevel: options.compressionLevel ?? 6,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Transport is already running");
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      // Set up WebSocket server if enabled
      if (this.options.enableWebSocket) {
        this.wsServer = new WebSocketServer({ 
          server: this.server,
          path: this.options.path + "/ws"
        });
        
        this.wsServer.on("connection", (ws, req) => {
          this.handleWebSocketConnection(ws, req);
        });
      }

      this.server.listen(this.options.port, () => {
        this.isRunning = true;
        this.startHeartbeat();
        console.error(`[${new Date().toISOString()}] Enhanced SSE Transport started on port ${this.options.port}`);
        resolve();
      });

      this.server.on("error", reject);
    });
  }

  async close(): Promise<void> {
    if (!this.isRunning) return;

    return new Promise((resolve) => {
      this.isRunning = false;
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
      }

      // Close all connections
      for (const [id, connection] of this.connections) {
        connection.close();
      }
      this.connections.clear();

      // Close WebSocket server
      if (this.wsServer) {
        this.wsServer.close();
      }

      // Close HTTP server
      this.server.close(() => {
        console.error(`[${new Date().toISOString()}] Enhanced SSE Transport closed`);
        resolve();
      });
    });
  }

  send(message: JSONRPCMessage): Promise<void> {
    const messageStr = JSON.stringify(message);
    const promises: Promise<void>[] = [];

    for (const [id, connection] of this.connections) {
      promises.push(connection.send(messageStr));
    }

    this.stats.messagesSent++;
    return Promise.all(promises).then(() => {});
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || "", `http://${req.headers.host}`);

    // CORS headers
    if (this.options.enableCors) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cache-Control");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (url.pathname === this.options.path) {
      this.handleSSEConnection(req, res);
    } else if (url.pathname === "/stats") {
      this.handleStatsRequest(req, res);
    } else if (url.pathname === "/health") {
      this.handleHealthCheck(req, res);
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  }

  private handleSSEConnection(req: IncomingMessage, res: ServerResponse): void {
    if (this.connections.size >= this.options.maxConnections) {
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("Max connections exceeded");
      return;
    }

    const connectionId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    const connection = new SSEConnection(connectionId, res);
    this.connections.set(connectionId, connection);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    console.error(`[${new Date().toISOString()}] SSE connection established: ${connectionId}`);

    // Send welcome message
    connection.send(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {
        connectionId,
        transport: "sse",
        capabilities: {
          heartbeat: true,
          compression: true,
          binarySupport: false,
        },
      },
    }));

    // Handle connection close
    req.on("close", () => {
      this.connections.delete(connectionId);
      this.stats.activeConnections--;
      console.error(`[${new Date().toISOString()}] SSE connection closed: ${connectionId}`);
    });

    // Handle client messages (if any)
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const message = JSON.parse(body);
          this.stats.messagesReceived++;
          this.emit("message", message);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Invalid JSON received:`, error);
          this.stats.errors++;
        }
      });
    }
  }

  private handleWebSocketConnection(ws: WebSocket, req: IncomingMessage): void {
    if (this.connections.size >= this.options.maxConnections) {
      ws.close(1013, "Max connections exceeded");
      return;
    }

    const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const connection = new WebSocketConnection(connectionId, ws);
    
    this.connections.set(connectionId, connection);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    console.error(`[${new Date().toISOString()}] WebSocket connection established: ${connectionId}`);

    // Send welcome message
    connection.send(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {
        connectionId,
        transport: "websocket",
        capabilities: {
          heartbeat: true,
          compression: true,
          binarySupport: true,
        },
      },
    }));

    // Handle messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.stats.messagesReceived++;
        this.emit("message", message);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Invalid JSON received:`, error);
        this.stats.errors++;
      }
    });

    // Handle connection close
    ws.on("close", () => {
      this.connections.delete(connectionId);
      this.stats.activeConnections--;
      console.error(`[${new Date().toISOString()}] WebSocket connection closed: ${connectionId}`);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`[${new Date().toISOString()}] WebSocket error for ${connectionId}:`, error);
      this.stats.errors++;
    });
  }

  private handleStatsRequest(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ...this.stats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }));
  }

  private handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      activeConnections: this.stats.activeConnections,
      timestamp: new Date().toISOString(),
    }));
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const heartbeat = JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/heartbeat",
        params: { timestamp: Date.now() },
      });

      for (const [id, connection] of this.connections) {
        connection.send(heartbeat).catch((error) => {
          console.error(`[${new Date().toISOString()}] Heartbeat failed for ${id}:`, error);
          this.connections.delete(id);
          this.stats.activeConnections--;
        });
      }
    }, this.options.heartbeatInterval);
  }

  getStats() {
    return { ...this.stats };
  }
}

// Base connection interface
interface SSEConnection {
  id: string;
  send(message: string): Promise<void>;
  close(): void;
}

// SSE connection implementation
class SSEConnection implements SSEConnection {
  constructor(public id: string, private response: ServerResponse) {}

  async send(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.response.write(`data: ${message}\n\n`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  close(): void {
    try {
      this.response.end();
    } catch (error) {
      // Connection already closed
    }
  }
}

// WebSocket connection implementation
class WebSocketConnection implements SSEConnection {
  constructor(public id: string, private ws: WebSocket) {}

  async send(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(message, (error) => {
          if (error) reject(error);
          else resolve();
        });
      } else {
        reject(new Error("WebSocket is not open"));
      }
    });
  }

  close(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}
