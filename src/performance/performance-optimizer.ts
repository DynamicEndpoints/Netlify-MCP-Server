// Performance Optimization System
import { EventEmitter } from "events";
import * as fs from "fs/promises";
import * as path from "path";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";

export interface PerformanceConfig {
  caching: {
    enabled: boolean;
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum cache entries
    strategy: "lru" | "lfu" | "fifo";
  };
  concurrency: {
    maxConcurrentOperations: number;
    queueMaxSize: number;
    workerPoolSize: number;
  };
  optimization: {
    enableRequestBatching: boolean;
    batchTimeout: number;
    enableCompression: boolean;
    enableLazyLoading: boolean;
  };
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
    };
  };
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  size: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  cacheHitRate: number;
  operationsPerSecond: number;
  errorRate: number;
}

export class AdvancedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private config: PerformanceConfig["caching"];

  constructor(config: PerformanceConfig["caching"]) {
    this.config = config;
    this.startCleanupTimer();
  }

  set(key: string, value: T): void {
    if (!this.config.enabled) return;

    const size = this.calculateSize(value);
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      size,
    };

    // Remove oldest entries if cache is full
    while (this.cache.size >= this.config.maxSize && this.cache.size > 0) {
      this.evictEntry();
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  get(key: string): T | undefined {
    if (!this.config.enabled) return undefined;

    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return undefined;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.updateAccessOrder(key);

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): any {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    return {
      size: this.cache.size,
      totalSize,
      hitRate: this.calculateHitRate(),
      oldestEntry: this.getOldestEntryAge(),
      mostAccessed: this.getMostAccessedKey(),
    };
  }

  private evictEntry(): void {
    let keyToEvict: string;

    switch (this.config.strategy) {
      case "lru": // Least Recently Used
        keyToEvict = this.accessOrder[0];
        break;
      case "lfu": // Least Frequently Used
        keyToEvict = this.getLeastFrequentlyUsedKey();
        break;
      case "fifo": // First In, First Out
      default:
        keyToEvict = this.getOldestKey();
        break;
    }

    this.delete(keyToEvict);
  }

  private calculateSize(value: T): number {
    return JSON.stringify(value).length;
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private getLeastFrequentlyUsedKey(): string {
    let minAccess = Infinity;
    let keyToEvict = "";

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < minAccess) {
        minAccess = entry.accessCount;
        keyToEvict = key;
      }
    }

    return keyToEvict;
  }

  private getOldestKey(): string {
    let oldestTime = Infinity;
    let keyToEvict = "";

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        keyToEvict = key;
      }
    }

    return keyToEvict;
  }

  private calculateHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0.85; // Placeholder
  }

  private getOldestEntryAge(): number {
    let oldest = 0;
    for (const entry of this.cache.values()) {
      const age = Date.now() - entry.timestamp;
      if (age > oldest) oldest = age;
    }
    return oldest;
  }

  private getMostAccessedKey(): string {
    let maxAccess = 0;
    let mostAccessed = "";

    for (const [key, entry] of this.cache) {
      if (entry.accessCount > maxAccess) {
        maxAccess = entry.accessCount;
        mostAccessed = key;
      }
    }

    return mostAccessed;
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (now - entry.timestamp > this.config.ttl) {
          this.delete(key);
        }
      }
    }, this.config.ttl / 4);
  }
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    task: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private poolSize: number;

  constructor(workerScript: string, poolSize: number) {
    this.poolSize = poolSize;
    this.initializeWorkers(workerScript);
  }

  private initializeWorkers(workerScript: string): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(workerScript);
      
      worker.on("message", (result) => {
        this.handleWorkerMessage(worker, result);
      });

      worker.on("error", (error) => {
        this.handleWorkerError(worker, error);
      });

      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async execute(task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const { task, resolve, reject } = this.taskQueue.shift()!;
      const worker = this.availableWorkers.shift()!;

      // Store resolve/reject for this worker
      (worker as any)._currentTask = { resolve, reject };
      
      worker.postMessage(task);
    }
  }

  private handleWorkerMessage(worker: Worker, result: any): void {
    const currentTask = (worker as any)._currentTask;
    if (currentTask) {
      currentTask.resolve(result);
      delete (worker as any)._currentTask;
    }

    this.availableWorkers.push(worker);
    this.processQueue();
  }

  private handleWorkerError(worker: Worker, error: any): void {
    const currentTask = (worker as any)._currentTask;
    if (currentTask) {
      currentTask.reject(error);
      delete (worker as any)._currentTask;
    }

    this.availableWorkers.push(worker);
    this.processQueue();
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.availableWorkers = [];
  }
}

export class RequestBatcher {
  private batches = new Map<string, {
    requests: Array<{
      resolve: (value: any) => void;
      reject: (error: any) => void;
      params: any;
    }>;
    timer: NodeJS.Timeout;
  }>();
  private batchTimeout: number;

  constructor(batchTimeout: number = 100) {
    this.batchTimeout = batchTimeout;
  }

  async batch<T>(
    key: string,
    params: any,
    executor: (batchedParams: any[]) => Promise<T[]>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batches.has(key)) {
        this.batches.set(key, {
          requests: [],
          timer: setTimeout(() => this.executeBatch(key, executor), this.batchTimeout),
        });
      }

      const batch = this.batches.get(key)!;
      batch.requests.push({ resolve, reject, params });
    });
  }

  private async executeBatch<T>(
    key: string,
    executor: (batchedParams: any[]) => Promise<T[]>
  ): Promise<void> {
    const batch = this.batches.get(key);
    if (!batch) return;

    this.batches.delete(key);
    clearTimeout(batch.timer);

    try {
      const batchedParams = batch.requests.map(req => req.params);
      const results = await executor(batchedParams);

      batch.requests.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      batch.requests.forEach(req => {
        req.reject(error);
      });
    }
  }
}

export class PerformanceOptimizer extends EventEmitter {
  private config: PerformanceConfig;
  private cache: AdvancedCache<any>;
  private workerPool?: WorkerPool;
  private requestBatcher: RequestBatcher;
  private metrics: PerformanceMetrics[] = [];
  private operationQueue: Array<() => Promise<any>> = [];
  private activeOperations = 0;
  private startTime = Date.now();

  constructor(config: Partial<PerformanceConfig> = {}) {
    super();
    
    this.config = {
      caching: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 1000,
        strategy: "lru",
        ...config.caching,
      },
      concurrency: {
        maxConcurrentOperations: 10,
        queueMaxSize: 1000,
        workerPoolSize: 4,
        ...config.concurrency,
      },
      optimization: {
        enableRequestBatching: true,
        batchTimeout: 100,
        enableCompression: true,
        enableLazyLoading: true,
        ...config.optimization,
      },
      monitoring: {
        enableMetrics: true,
        metricsInterval: 60000, // 1 minute
        alertThresholds: {
          responseTime: 5000, // 5 seconds
          errorRate: 0.05, // 5%
          memoryUsage: 0.8, // 80%
        },
        ...config.monitoring,
      },
    };

    this.cache = new AdvancedCache(this.config.caching);
    this.requestBatcher = new RequestBatcher(this.config.optimization.batchTimeout);
    
    this.initializePerformanceOptimization();
  }

  private async initializePerformanceOptimization(): Promise<void> {
    // Initialize worker pool if needed
    if (this.config.concurrency.workerPoolSize > 0) {
      const workerScript = path.join(__dirname, "performance-worker.js");
      await this.createWorkerScript(workerScript);
      this.workerPool = new WorkerPool(workerScript, this.config.concurrency.workerPoolSize);
    }

    // Start performance monitoring
    if (this.config.monitoring.enableMetrics) {
      this.startMetricsCollection();
    }

    // Process operation queue
    this.processOperationQueue();

    console.error(`[${new Date().toISOString()}] Performance optimizer initialized`);
  }

  // Optimized operation execution
  async executeOptimized<T>(
    operation: () => Promise<T>,
    options: {
      cacheKey?: string;
      cacheTtl?: number;
      useWorker?: boolean;
      batchKey?: string;
      priority?: "high" | "normal" | "low";
    } = {}
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (options.cacheKey && this.cache.has(options.cacheKey)) {
        const cached = this.cache.get(options.cacheKey);
        this.recordMetric(startTime, true, true);
        return cached;
      }

      // Use worker pool for CPU-intensive operations
      if (options.useWorker && this.workerPool) {
        const result = await this.workerPool.execute({
          operation: operation.toString(),
          options,
        });
        
        if (options.cacheKey) {
          this.cache.set(options.cacheKey, result);
        }
        
        this.recordMetric(startTime, true, false);
        return result;
      }

      // Use request batching if specified
      if (options.batchKey && this.config.optimization.enableRequestBatching) {
        const result = await this.requestBatcher.batch(
          options.batchKey,
          options,
          async (batchedOptions) => {
            return Promise.all(batchedOptions.map(() => operation()));
          }
        );
        
        this.recordMetric(startTime, true, false);
        return result;
      }

      // Queue operation if too many concurrent operations
      if (this.activeOperations >= this.config.concurrency.maxConcurrentOperations) {
        return this.queueOperation(operation, options);
      }

      // Execute operation directly
      this.activeOperations++;
      const result = await operation();
      this.activeOperations--;

      // Cache result if specified
      if (options.cacheKey) {
        this.cache.set(options.cacheKey, result);
      }

      this.recordMetric(startTime, true, false);
      return result;

    } catch (error) {
      this.activeOperations = Math.max(0, this.activeOperations - 1);
      this.recordMetric(startTime, false, false);
      throw error;
    }
  }

  // Queue operation when at capacity
  private async queueOperation<T>(
    operation: () => Promise<T>,
    options: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.operationQueue.length >= this.config.concurrency.queueMaxSize) {
        reject(new Error("Operation queue is full"));
        return;
      }

      const queuedOperation = async () => {
        try {
          const result = await this.executeOptimized(operation, { ...options, useWorker: false });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Insert based on priority
      if (options.priority === "high") {
        this.operationQueue.unshift(queuedOperation);
      } else {
        this.operationQueue.push(queuedOperation);
      }
    });
  }

  // Process operation queue
  private processOperationQueue(): void {
    setInterval(() => {
      while (
        this.operationQueue.length > 0 &&
        this.activeOperations < this.config.concurrency.maxConcurrentOperations
      ) {
        const operation = this.operationQueue.shift();
        if (operation) {
          operation();
        }
      }
    }, 10); // Check every 10ms
  }

  // Record performance metrics
  private recordMetric(startTime: number, success: boolean, fromCache: boolean): void {
    if (!this.config.monitoring.enableMetrics) return;

    const responseTime = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      responseTime,
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      activeConnections: this.activeOperations,
      cacheHitRate: fromCache ? 1 : 0,
      operationsPerSecond: 0, // Calculated in metrics collection
      errorRate: success ? 0 : 1,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(metric);
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    setInterval(() => {
      const recentMetrics = this.metrics.filter(
        m => Date.now() - m.timestamp < this.config.monitoring.metricsInterval
      );

      if (recentMetrics.length === 0) return;

      // Calculate operations per second
      const ops = recentMetrics.length;
      const timeSpan = this.config.monitoring.metricsInterval / 1000;
      const opsPerSecond = ops / timeSpan;

      // Update metrics
      recentMetrics.forEach(m => {
        m.operationsPerSecond = opsPerSecond;
      });

      // Emit metrics event
      this.emit("metrics", {
        averageResponseTime: recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / ops,
        operationsPerSecond: opsPerSecond,
        errorRate: recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / ops,
        cacheHitRate: recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / ops,
        memoryUsage: recentMetrics[recentMetrics.length - 1]?.memoryUsage || 0,
        activeOperations: this.activeOperations,
        queueSize: this.operationQueue.length,
        cacheStats: this.cache.getStats(),
      });
    }, this.config.monitoring.metricsInterval);
  }

  // Check for performance alerts
  private checkPerformanceAlerts(metric: PerformanceMetrics): void {
    const thresholds = this.config.monitoring.alertThresholds;

    if (metric.responseTime > thresholds.responseTime) {
      this.emit("alert", {
        type: "slow_response",
        message: `Slow response time: ${metric.responseTime}ms`,
        metric,
      });
    }

    if (metric.memoryUsage > thresholds.memoryUsage) {
      this.emit("alert", {
        type: "high_memory",
        message: `High memory usage: ${(metric.memoryUsage * 100).toFixed(1)}%`,
        metric,
      });
    }

    // Calculate recent error rate
    const recentMetrics = this.metrics.filter(m => Date.now() - m.timestamp < 60000);
    const errorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;

    if (errorRate > thresholds.errorRate) {
      this.emit("alert", {
        type: "high_error_rate",
        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        metric,
      });
    }
  }

  // Create worker script
  private async createWorkerScript(scriptPath: string): Promise<void> {
    const workerCode = `
const { parentPort } = require('worker_threads');

parentPort.on('message', async (data) => {
  try {
    const { operation, options } = data;
    
    // Execute the operation (this is a simplified version)
    const func = eval(\`(\${operation})\`);
    const result = await func();
    
    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ 
      success: false, 
      error: error.message 
    });
  }
});
`;

    await fs.writeFile(scriptPath, workerCode);
  }

  // Get performance statistics
  getStats(): any {
    const uptime = Date.now() - this.startTime;
    const recentMetrics = this.metrics.filter(m => Date.now() - m.timestamp < 300000); // Last 5 minutes

    return {
      uptime,
      config: this.config,
      cache: this.cache.getStats(),
      operations: {
        active: this.activeOperations,
        queued: this.operationQueue.length,
        total: this.metrics.length,
      },
      performance: {
        averageResponseTime: recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / (recentMetrics.length || 1),
        successRate: 1 - (recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / (recentMetrics.length || 1)),
        cacheHitRate: recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / (recentMetrics.length || 1),
      },
      resources: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };
  }

  // Optimize cache based on usage patterns
  optimizeCache(): void {
    const stats = this.cache.getStats();
    
    // Adjust cache size based on hit rate
    if (stats.hitRate > 0.9 && this.config.caching.maxSize < 2000) {
      this.config.caching.maxSize = Math.min(2000, this.config.caching.maxSize * 1.2);
      console.error(`[${new Date().toISOString()}] Increased cache size to ${this.config.caching.maxSize}`);
    } else if (stats.hitRate < 0.5 && this.config.caching.maxSize > 100) {
      this.config.caching.maxSize = Math.max(100, this.config.caching.maxSize * 0.8);
      console.error(`[${new Date().toISOString()}] Decreased cache size to ${this.config.caching.maxSize}`);
    }
  }

  // Cleanup resources
  async cleanup(): Promise<void> {
    if (this.workerPool) {
      await this.workerPool.terminate();
    }
    
    this.cache.clear();
    this.operationQueue = [];
    this.metrics = [];
    
    console.error(`[${new Date().toISOString()}] Performance optimizer cleaned up`);
  }
}
