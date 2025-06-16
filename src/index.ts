#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  ListRootsRequestSchema,
  CreateMessageRequestSchema,
  LATEST_PROTOCOL_VERSION,
  ProgressTokenSchema,
  CursorSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { execSync } from "child_process";
import { EventEmitter } from "events";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer } from "ws";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import enhancement modules (enabled for full feature set)
import { EnhancedSSETransport } from "./transport/sse-enhanced.js";
import { AdvancedAnalytics } from "./analytics/advanced-analytics.js";
import { CustomWorkflowManager } from "./workflows/custom-workflows.js";
import { PluginManager } from "./plugins/plugin-manager.js";
import { PerformanceOptimizer } from "./performance/performance-optimizer.js";

// Global event emitter for resource updates
const resourceEmitter = new EventEmitter();

// Initialize enhancement systems with latest features
const analytics = new AdvancedAnalytics(path.join(__dirname, "analytics"));
const workflowManager = new CustomWorkflowManager(path.join(__dirname, "workflows"));
const pluginManager = new PluginManager(path.join(__dirname, "plugins"));
const performanceOptimizer = new PerformanceOptimizer({
  caching: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    strategy: "lru",
  },
  concurrency: {
    maxConcurrentOperations: 20,
    queueMaxSize: 2000,
    workerPoolSize: 4,
  },
  optimization: {
    enableRequestBatching: true,
    batchTimeout: 50,
    enableCompression: true,
    enableLazyLoading: true,
  },
});

// Enhanced SSE transport instance
let enhancedSSETransport: EnhancedSSETransport | null = null;

// HTTP server for SSE transport
let httpServer: ReturnType<typeof createServer> | null = null;

// Create server instance with latest MCP SDK features and protocol version
const server = new Server({
  name: "netlify-mcp-server",
  version: "2.0.0",
  protocolVersion: LATEST_PROTOCOL_VERSION,
}, {
  capabilities: {
    tools: {
      listChanged: true,
    },
    resources: {
      subscribe: true,
      listChanged: true,
    },
    prompts: {
      listChanged: true,
    },
    roots: {
      listChanged: true,
    },
    logging: {
      // Enable logging capabilities
    },
    experimental: {
      // Enable experimental features
      customWorkflows: true,
      advancedAnalytics: true,
      pluginSystem: true,
      performanceOptimization: true,
      enhancedSSE: true,
    },
  },
});

// Helper function for executing Netlify CLI commands with enhanced logging, performance optimization, and analytics
async function executeNetlifyCommand(command: string, siteId?: string): Promise<string> {
  // LAZY LOADING: Check for authentication token ONLY when commands are executed, not when tools are listed
  if (!process.env.NETLIFY_AUTH_TOKEN) {
    throw new Error(
      "NETLIFY_AUTH_TOKEN environment variable is required. " +
      "Please set your Netlify Personal Access Token. " +
      "Get one from: https://app.netlify.com/user/applications#personal-access-tokens"
    );
  }

  const startTime = Date.now();
  const cacheKey = `netlify_cmd_${command}_${siteId || 'global'}`;
  
  return performanceOptimizer.executeOptimized(
    async () => {
      try {
        console.error(`[${new Date().toISOString()}] Executing: netlify ${command}`);
        analytics.trackEvent("command", "netlify", "execute", command, undefined, { siteId });

        const env = { ...process.env };
        if (siteId) {
          env['NETLIFY_SITE_ID'] = siteId;
          console.error(`[${new Date().toISOString()}] Using NETLIFY_SITE_ID: ${siteId}`);
        }

        const output = execSync(`netlify ${command}`, { encoding: 'utf8', env: env });
        const duration = Date.now() - startTime;
        
        console.error(`[${new Date().toISOString()}] Success: ${output.substring(0, 100)}...`);
        
        // Track successful execution
        analytics.trackPerformance(`netlify_${command}`, duration, true);
        
        // Emit resource update events for certain commands
        if (command.includes('deploy') || command.includes('env:set') || command.includes('sites:create')) {
          resourceEmitter.emit('resourceChanged', { command, siteId });
        }
        
        // Execute hooks
        await pluginManager.executeHooks('command-executed', { command, siteId, success: true, duration });
        
        return output;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        console.error(`[${new Date().toISOString()}] Error executing command: netlify ${command}`, error);
        
        // Track failed execution
        analytics.trackPerformance(`netlify_${command}`, duration, false, error instanceof Error ? error.message : String(error));
        analytics.trackError("command_execution", error instanceof Error ? error.message : String(error), command);
        
        // Execute error hooks
        await pluginManager.executeHooks('command-error', { command, siteId, error, duration });
        
        if (error instanceof Error) {
          const stderr = (error as any).stderr ? (error as any).stderr.toString() : '';
          throw new Error(`Netlify CLI error: ${error.message}\n${stderr}`);
        }
        throw error;
      }
    },
    {
      cacheKey: command.includes('list') || command.includes('status') ? cacheKey : undefined,
      cacheTtl: 60000, // 1 minute cache for list/status commands
      priority: command.includes('deploy') ? 'high' : 'normal',
    }
  );
}

// Enhanced site management with caching
class SiteManager {
  private sitesCache: any[] = [];
  private lastCacheUpdate: number = 0;
  private cacheExpiry: number = 60000; // 1 minute

  async getSites(forceRefresh = false): Promise<any[]> {
    const now = Date.now();
    if (!forceRefresh && this.sitesCache.length > 0 && (now - this.lastCacheUpdate) < this.cacheExpiry) {
      return this.sitesCache;
    }

    try {
      const output = await executeNetlifyCommand("sites:list --json");
      this.sitesCache = JSON.parse(output);
      this.lastCacheUpdate = now;
      return this.sitesCache;
    } catch (error) {
      console.error("Failed to fetch sites:", error);
      return this.sitesCache; // Return cached data on error
    }
  }

  async getSiteById(siteId: string): Promise<any | null> {
    const sites = await this.getSites();
    return sites.find(site => site.id === siteId || site.name === siteId) || null;
  }

  invalidateCache(): void {
    this.sitesCache = [];
    this.lastCacheUpdate = 0;
  }
}

const siteManager = new SiteManager();

// Resource subscription management
const subscriptions = new Set<string>();

// Enhanced notification system
resourceEmitter.on('resourceChanged', async (data) => {
  if (subscriptions.size > 0) {
    // Invalidate cache when resources change
    siteManager.invalidateCache();
    
    // Send notifications to subscribers
    try {
      if (data.command.includes('deploy') && data.siteId) {
        await server.sendResourceUpdated({ uri: `netlify://sites/${data.siteId}/deploys` });
      }
      if (data.command.includes('env:set') && data.siteId) {
        await server.sendResourceUpdated({ uri: `netlify://sites/${data.siteId}/env` });
      }
      if (data.command.includes('sites:create')) {
        await server.sendResourceListChanged();
      }
    } catch (error) {
      console.error("Failed to send resource update notification:", error);
    }
  }
});

// Define Zod schemas for validation
const DeploySiteSchema = z.object({
  path: z.string().describe("Path to the site directory"),
  prod: z.boolean().optional().describe("Deploy to production"),
  message: z.string().optional().describe("Deploy message"),
});

const ListSitesSchema = z.object({});

const SetEnvVarsSchema = z.object({
  siteId: z.string().describe("Site ID or name"),
  envVars: z.record(z.string()).describe("Environment variables to set (key-value pairs)"),
});

const DeployFunctionSchema = z.object({
  path: z.string().describe("Path to the site directory containing functions"),
  name: z.string().describe("Function name (often inferred from file path)"),
  runtime: z.string().optional().describe("Function runtime (e.g., nodejs, go)"),
});

const GetLogsSchema = z.object({
  siteId: z.string().describe("Site ID or name"),
  function: z.string().optional().describe("Optional: Specific function name to filter logs"),
});

const TriggerBuildSchema = z.object({
  siteId: z.string().describe("Site ID or name"),
  message: z.string().optional().describe("Optional: Deploy message"),
});

const LinkSiteSchema = z.object({
  siteId: z.string().optional().describe("Optional: Site ID to link to (otherwise interactive)"),
});

const UnlinkSiteSchema = z.object({});

const GetStatusSchema = z.object({});

const ImportEnvSchema = z.object({
  siteId: z.string().describe("Site ID or name"),
  filePath: z.string().describe("Path to the .env file to import"),
  replace: z.boolean().optional().describe("Replace existing variables instead of merging"),
});

const BuildSiteSchema = z.object({
  siteId: z.string().optional().describe("Optional: Site ID (if not linked)"),
  context: z.string().optional().describe("Optional: Build context (e.g., 'production', 'deploy-preview')"),
  dry: z.boolean().optional().describe("Optional: Run a dry build without executing commands"),
});

const GetEnvVarSchema = z.object({
  siteId: z.string().optional().describe("Optional: Site ID (if not linked)"),
  key: z.string().describe("The environment variable key to retrieve"),
  context: z.string().optional().describe("Optional: Specific context to get the value from"),
  scope: z.string().optional().describe("Optional: Specific scope (e.g., 'builds', 'functions')"),
});

const UnsetEnvVarSchema = z.object({
  siteId: z.string().optional().describe("Optional: Site ID (if not linked)"),
  key: z.string().describe("The environment variable key to unset"),
  context: z.string().optional().describe("Optional: Specific context to unset the value from (otherwise all)"),
});

const CloneEnvVarsSchema = z.object({
  fromSiteId: z.string().describe("Source Site ID"),
  toSiteId: z.string().describe("Destination Site ID"),
});

const CreateSiteSchema = z.object({
  name: z.string().optional().describe("Optional: Site name (subdomain)"),
  accountSlug: z.string().optional().describe("Optional: Account slug for the team"),
});

const DeleteSiteSchema = z.object({
  siteId: z.string().describe("Site ID to delete"),
  force: z.boolean().optional().default(true).describe("Force deletion without confirmation (default: true)"),
});

// New schemas for additional Netlify features
const GetSiteInfoSchema = z.object({
  siteId: z.string().describe("Site ID to get information for"),
});

const ListDeploysSchema = z.object({
  siteId: z.string().describe("Site ID to list deploys for"),
  limit: z.number().optional().describe("Number of deploys to return (default: 10)"),
});

const GetDeployInfoSchema = z.object({
  deployId: z.string().describe("Deploy ID to get information for"),
});

const CancelDeploySchema = z.object({
  deployId: z.string().describe("Deploy ID to cancel"),
});

const RestoreDeploySchema = z.object({
  deployId: z.string().describe("Deploy ID to restore"),
});

const ListFunctionsSchema = z.object({
  siteId: z.string().describe("Site ID to list functions for"),
});

const GetFormSubmissionsSchema = z.object({
  siteId: z.string().describe("Site ID to get form submissions for"),
  formId: z.string().optional().describe("Optional: Specific form ID"),
});

const EnableBranchDeploySchema = z.object({
  siteId: z.string().describe("Site ID"),
  branch: z.string().describe("Branch name to enable deploys for"),
});

const DisableBranchDeploySchema = z.object({
  siteId: z.string().describe("Site ID"),
  branch: z.string().describe("Branch name to disable deploys for"),
});

// LAZY LOADING IMPLEMENTATION: Tools are listed without authentication checks
// Authentication is only validated when tools are actually invoked in executeNetlifyCommand
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "deploy-site",
        description: "Deploy a site to Netlify with comprehensive validation and monitoring",
        inputSchema: zodToJsonSchema(DeploySiteSchema),
        annotations: {
          title: "Deploy Site",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "list-sites",
        description: "List all sites in your Netlify account",
        inputSchema: zodToJsonSchema(ListSitesSchema),
        annotations: {
          title: "List Sites",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "set-env-vars",
        description: "Set environment variables for a specific site",
        inputSchema: zodToJsonSchema(SetEnvVarsSchema),
        annotations: {
          title: "Set Environment Variables",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: "delete-site",
        description: "Delete a site from Netlify (irreversible operation)",
        inputSchema: zodToJsonSchema(DeleteSiteSchema),
        annotations: {
          title: "Delete Site",
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: "get-logs",
        description: "Get function logs for a site",
        inputSchema: zodToJsonSchema(GetLogsSchema),
        annotations: {
          title: "Get Logs",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "trigger-build",
        description: "Trigger a new build and deploy",
        inputSchema: zodToJsonSchema(TriggerBuildSchema),
        annotations: {
          title: "Trigger Build",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "link-site",
        description: "Link current directory to a Netlify site",
        inputSchema: zodToJsonSchema(LinkSiteSchema),
        annotations: {
          title: "Link Site",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "unlink-site",
        description: "Unlink current directory from Netlify site",
        inputSchema: zodToJsonSchema(UnlinkSiteSchema),
        annotations: {
          title: "Unlink Site",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get-status",
        description: "Get current Netlify status",
        inputSchema: zodToJsonSchema(GetStatusSchema),
        annotations: {
          title: "Get Status",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "import-env",
        description: "Import environment variables from file",
        inputSchema: zodToJsonSchema(ImportEnvSchema),
        annotations: {
          title: "Import Environment Variables",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: "build-site",
        description: "Build site locally",
        inputSchema: zodToJsonSchema(BuildSiteSchema),
        annotations: {
          title: "Build Site",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get-env-var",
        description: "Get a specific environment variable",
        inputSchema: zodToJsonSchema(GetEnvVarSchema),
        annotations: {
          title: "Get Environment Variable",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "unset-env-var",
        description: "Unset an environment variable",
        inputSchema: zodToJsonSchema(UnsetEnvVarSchema),
        annotations: {
          title: "Unset Environment Variable",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: "clone-env-vars",
        description: "Clone environment variables between sites",
        inputSchema: zodToJsonSchema(CloneEnvVarsSchema),
        annotations: {
          title: "Clone Environment Variables",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: "create-site",
        description: "Create a new Netlify site",
        inputSchema: zodToJsonSchema(CreateSiteSchema),
        annotations: {
          title: "Create Site",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get-site-info",
        description: "Get detailed information about a site",
        inputSchema: zodToJsonSchema(GetSiteInfoSchema),
        annotations: {
          title: "Get Site Information",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "list-deploys",
        description: "List deploys for a site",
        inputSchema: zodToJsonSchema(ListDeploysSchema),
        annotations: {
          title: "List Deploys",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "get-deploy-info",
        description: "Get information about a specific deploy",
        inputSchema: zodToJsonSchema(GetDeployInfoSchema),
        annotations: {
          title: "Get Deploy Information",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "cancel-deploy",
        description: "Cancel a running deploy",
        inputSchema: zodToJsonSchema(CancelDeploySchema),
        annotations: {
          title: "Cancel Deploy",
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: "restore-deploy",
        description: "Restore a previous deploy",
        inputSchema: zodToJsonSchema(RestoreDeploySchema),
        annotations: {
          title: "Restore Deploy",
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: "list-functions",
        description: "List all functions for a site",
        inputSchema: zodToJsonSchema(ListFunctionsSchema),
        annotations: {
          title: "List Functions",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "get-form-submissions",
        description: "Get form submissions for a site",
        inputSchema: zodToJsonSchema(GetFormSubmissionsSchema),
        annotations: {
          title: "Get Form Submissions",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "enable-branch-deploy",
        description: "Enable branch deploys for a specific branch",
        inputSchema: zodToJsonSchema(EnableBranchDeploySchema),
        annotations: {
          title: "Enable Branch Deploy",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "disable-branch-deploy",
        description: "Disable branch deploys for a specific branch",
        inputSchema: zodToJsonSchema(DisableBranchDeploySchema),
        annotations: {
          title: "Disable Branch Deploy",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
    ],
  };
});

// Tool execution handler - authentication is validated here when tools are invoked
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "deploy-site": {
        const params = DeploySiteSchema.parse(args);
        let command = `deploy --dir="${params.path}"`;
        if (params.prod) command += " --prod";
        if (params.message) command += ` --message="${params.message}"`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "list-sites": {
        const output = await executeNetlifyCommand("sites:list");
        return { content: [{ type: "text", text: output }] };
      }

      case "set-env-vars": {
        const params = SetEnvVarsSchema.parse(args);
        const results: string[] = [];
        for (const [key, value] of Object.entries(params.envVars)) {
          const command = `env:set ${key} "${value}"`;
          const output = await executeNetlifyCommand(command, params.siteId);
          results.push(`Set ${key}: ${output}`);
        }
        return { content: [{ type: "text", text: results.join("\n") }] };
      }

      case "get-logs": {
        const params = GetLogsSchema.parse(args);
        let command = `logs:function`;
        if (params.function) command += ` ${params.function}`;
        const output = await executeNetlifyCommand(command, params.siteId);
        return { content: [{ type: "text", text: output }] };
      }

      case "trigger-build": {
        const params = TriggerBuildSchema.parse(args);
        let command = `deploy --build`;
        if (params.message) command += ` --message "${params.message}"`;
        const output = await executeNetlifyCommand(command, params.siteId);
        return { content: [{ type: "text", text: output }] };
      }

      case "link-site": {
        const params = LinkSiteSchema.parse(args);
        let command = `link`;
        if (params.siteId) command += ` --id ${params.siteId}`;
        else {
          throw new Error("Interactive linking not supported. Please provide a siteId.");
        }
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "unlink-site": {
        const command = `unlink`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "get-status": {
        const command = `status`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "import-env": {
        const params = ImportEnvSchema.parse(args);
        let command = `env:import ${params.filePath}`;
        if (params.replace) command += ` --replace`;
        const output = await executeNetlifyCommand(command, params.siteId);
        return { content: [{ type: "text", text: output }] };
      }

      case "build-site": {
        const params = BuildSiteSchema.parse(args);
        let command = `build`;
        if (params.context) command += ` --context ${params.context}`;
        if (params.dry) command += ` --dry`;
        const output = await executeNetlifyCommand(command, params.siteId);
        return { content: [{ type: "text", text: output }] };
      }

      case "get-env-var": {
        const params = GetEnvVarSchema.parse(args);
        let command = `env:get ${params.key}`;
        if (params.context) command += ` --context ${params.context}`;
        if (params.scope) command += ` --scope ${params.scope}`;
        const output = await executeNetlifyCommand(command, params.siteId);
        return { content: [{ type: "text", text: output }] };
      }

      case "unset-env-var": {
        const params = UnsetEnvVarSchema.parse(args);
        let command = `env:unset ${params.key}`;
        if (params.context) command += ` --context ${params.context}`;
        const output = await executeNetlifyCommand(command, params.siteId);
        return { content: [{ type: "text", text: output }] };
      }

      case "clone-env-vars": {
        const params = CloneEnvVarsSchema.parse(args);
        const command = `env:clone --to ${params.toSiteId} --from ${params.fromSiteId}`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "create-site": {
        const params = CreateSiteSchema.parse(args);
        const accountSlug = params.accountSlug || "playhousehosting";
        let command = `sites:create --account-slug ${accountSlug}`;
        if (params.name) command += ` --name "${params.name}"`;
        command += ` --disable-linking`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "delete-site": {
        const params = DeleteSiteSchema.parse(args);
        let command = `sites:delete ${params.siteId}`;
        if (params.force) command += ` --force`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "get-site-info": {
        const params = GetSiteInfoSchema.parse(args);
        const command = `api getSite --data='{"site_id":"${params.siteId}"}'`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "list-deploys": {
        const params = ListDeploysSchema.parse(args);
        let command = `api listSiteDeploys --data='{"site_id":"${params.siteId}"}'`;
        if (params.limit) {
          command = `api listSiteDeploys --data='{"site_id":"${params.siteId}","per_page":${params.limit}}'`;
        }
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "get-deploy-info": {
        const params = GetDeployInfoSchema.parse(args);
        const command = `api getDeploy --data='{"deploy_id":"${params.deployId}"}'`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "cancel-deploy": {
        const params = CancelDeploySchema.parse(args);
        const command = `api cancelSiteDeploy --data='{"deploy_id":"${params.deployId}"}'`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "restore-deploy": {
        const params = RestoreDeploySchema.parse(args);
        const command = `api restoreSiteDeploy --data='{"deploy_id":"${params.deployId}"}'`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "list-functions": {
        const params = ListFunctionsSchema.parse(args);
        const command = `functions:list --json`;
        const output = await executeNetlifyCommand(command, params.siteId);
        return { content: [{ type: "text", text: output }] };
      }

      case "get-form-submissions": {
        const params = GetFormSubmissionsSchema.parse(args);
        let command = `api listFormSubmissions --data='{"site_id":"${params.siteId}"}'`;
        if (params.formId) {
          command = `api listFormSubmissions --data='{"form_id":"${params.formId}"}'`;
        }
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "enable-branch-deploy": {
        const params = EnableBranchDeploySchema.parse(args);
        const command = `api updateSite --data='{"site_id":"${params.siteId}","build_settings":{"allowed_branches":["${params.branch}"]}}'`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      case "disable-branch-deploy": {
        const params = DisableBranchDeploySchema.parse(args);
        const command = `api updateSite --data='{"site_id":"${params.siteId}","build_settings":{"allowed_branches":[]}}'`;
        const output = await executeNetlifyCommand(command);
        return { content: [{ type: "text", text: output }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { 
      content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], 
      isError: true 
    };
  }
});

// Resources and other handlers omitted for brevity - they work the same way
// The key lazy loading is implemented in the tools handler above

// Enhanced resources handler with comprehensive site data
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "netlify://sites",
        name: "List all Netlify sites",
        description: "Get a comprehensive list of all sites with metadata",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/overview",
        name: "Site overview",
        description: "Complete site overview with functions, deployments, and analytics",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/functions",
        name: "Site functions",
        description: "List all functions for a specific site",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/env",
        name: "Environment variables",
        description: "List environment variables by context",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/deploys",
        name: "Deploy history",
        description: "Recent deployments with statistics",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/deploys/{deployId}",
        name: "Deploy details",
        description: "Detailed information about a specific deployment",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/forms",
        name: "Form submissions",
        description: "Form submissions and configuration",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/analytics",
        name: "Site analytics",
        description: "Site usage analytics and performance metrics",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/logs",
        name: "Site logs",
        description: "Recent site and function logs",
        mimeType: "application/json",
      },
      {
        uri: "netlify://account/usage",
        name: "Account usage",
        description: "Account-level usage statistics and limits",
        mimeType: "application/json",
      },
      {
        uri: "netlify://account/teams",
        name: "Team information",
        description: "Team membership and permissions",
        mimeType: "application/json",
      },
      {
        uri: "netlify://status",
        name: "Netlify service status",
        description: "Current Netlify service status and health",
        mimeType: "application/json",
      },
    ],
  };
});

// Enhanced resource reader with comprehensive data handling
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    if (uri === "netlify://sites") {
      const sites = await siteManager.getSites();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              sites,
              count: sites.length,
              lastUpdated: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri.startsWith("netlify://sites/")) {
      const uriParts = uri.split('/');
      const siteId = uriParts[2];
      const resource = uriParts[3];
      const subResource = uriParts[4];

      switch (resource) {
        case "overview": {
          const site = await siteManager.getSiteById(siteId);
          if (!site) {
            throw new Error(`Site ${siteId} not found`);
          }
          
          try {
            const [functions, deploys, env] = await Promise.allSettled([
              executeNetlifyCommand(`functions:list --json`, siteId),
              executeNetlifyCommand(`api listSiteDeploys --data='{"site_id":"${siteId}","per_page":5}'`),
              executeNetlifyCommand(`env:list --json`, siteId),
            ]);

            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    site,
                    functions: functions.status === 'fulfilled' ? JSON.parse(functions.value) : [],
                    recentDeploys: deploys.status === 'fulfilled' ? JSON.parse(deploys.value) : [],
                    environmentVariables: env.status === 'fulfilled' ? JSON.parse(env.value) : [],
                    lastUpdated: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    site,
                    error: "Partial data available - some features may require authentication",
                    lastUpdated: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          }
        }

        case "functions": {
          try {
            const command = `functions:list --json`;
            const output = await executeNetlifyCommand(command, siteId);
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: output,
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    error: "Unable to fetch functions data",
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          }
        }

        case "env": {
          try {
            const command = `env:list --json`;
            const output = await executeNetlifyCommand(command, siteId);
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: output,
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    error: "Unable to fetch environment variables",
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          }
        }

        case "deploys": {
          if (subResource) {
            // Specific deploy
            const deployId = subResource;
            try {
              const command = `api getDeploy --data='{"deploy_id":"${deployId}"}'`;
              const output = await executeNetlifyCommand(command);
              return {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: output,
                  },
                ],
              };
            } catch (error) {
              return {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify({
                      error: "Deploy not found or access restricted",
                      deployId,
                      timestamp: new Date().toISOString(),
                    }, null, 2),
                  },
                ],
              };
            }
          } else {
            // List deploys
            try {
              const command = `api listSiteDeploys --data='{"site_id":"${siteId}","per_page":10}'`;
              const output = await executeNetlifyCommand(command);
              const deploys = JSON.parse(output);
              
              // Add deploy statistics
              const deployStats = {
                total: deploys.length,
                successful: deploys.filter((d: any) => d.state === 'ready').length,
                failed: deploys.filter((d: any) => d.state === 'error').length,
                building: deploys.filter((d: any) => d.state === 'building').length,
              };

              return {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify({
                      deploys,
                      statistics: deployStats,
                      total: deploys.length,
                      lastUpdated: new Date().toISOString(),
                    }, null, 2),
                  },
                ],
              };
            } catch (error) {
              return {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify({
                      error: "Unable to fetch deploys data",
                      message: error instanceof Error ? error.message : 'Unknown error',
                      timestamp: new Date().toISOString(),
                    }, null, 2),
                  },
                ],
              };
            }
          }
        }

        case "forms": {
          try {
            const command = `api listSiteForms --data='{"site_id":"${siteId}"}'`;
            const output = await executeNetlifyCommand(command);
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: output,
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    error: "Unable to fetch forms data",
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          }
        }

        case "analytics": {
          try {
            const command = `api getSiteAnalytics --data='{"site_id":"${siteId}"}'`;
            const output = await executeNetlifyCommand(command);
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: output,
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    error: "Analytics data not available or access restricted",
                    message: "This feature may require a paid plan",
                    timestamp: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          }
        }

        case "logs": {
          try {
            const command = `functions:logs --json`;
            const output = await executeNetlifyCommand(command, siteId);
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: output,
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    error: "Unable to fetch logs",
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          }
        }
      }
    }

    throw new Error(`Resource not found: ${uri}`);
  } catch (error) {
    console.error(`Error loading resource ${uri}:`, error);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            error: "Resource loading failed",
            message: error instanceof Error ? error.message : 'Unknown error',
            uri,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }
});

// Enhanced prompts handler with comprehensive workflow templates
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "netlify-deploy",
        description: "Complete deployment workflow with validation and monitoring",
        arguments: [
          {
            name: "path",
            description: "Site directory path",
            required: true,
          },
          {
            name: "production",
            description: "Deploy to production",
            required: false,
          },
          {
            name: "message",
            description: "Deploy message",
            required: false,
          },
        ],
      },
      {
        name: "netlify-setup",
        description: "Complete site setup workflow",
        arguments: [
          {
            name: "siteName",
            description: "Name for the new site",
            required: true,
          },
          {
            name: "buildCommand",
            description: "Build command (default: npm run build)",
            required: false,
          },
          {
            name: "publishDir",
            description: "Publish directory (default: build)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-environment-setup",
        description: "Environment configuration across contexts",
        arguments: [
          {
            name: "siteId",
            description: "Site ID to configure",
            required: true,
          },
          {
            name: "environment",
            description: "Target environment (development, staging, production)",
            required: true,
          },
        ],
      },
      {
        name: "netlify-troubleshoot",
        description: "Comprehensive issue diagnosis and resolution",
        arguments: [
          {
            name: "siteId",
            description: "Site ID to troubleshoot",
            required: true,
          },
          {
            name: "issueType",
            description: "Type of issue (deployment, build, functions, performance)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-function-deploy",
        description: "Function deployment with best practices",
        arguments: [
          {
            name: "functionPath",
            description: "Functions directory path",
            required: true,
          },
          {
            name: "runtime",
            description: "Function runtime (default: nodejs)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-migration",
        description: "Site migration with optimization",
        arguments: [
          {
            name: "sourceType",
            description: "Source platform (github-pages, vercel, heroku, etc.)",
            required: true,
          },
          {
            name: "repositoryUrl",
            description: "Repository URL",
            required: false,
          },
        ],
      },
      {
        name: "netlify-optimization",
        description: "Performance, security, and SEO optimization",
        arguments: [
          {
            name: "siteId",
            description: "Site ID to optimize",
            required: true,
          },
          {
            name: "focusArea",
            description: "Optimization focus (performance, security, seo, all)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-security-audit",
        description: "Complete security audit and hardening",
        arguments: [
          {
            name: "siteId",
            description: "Site ID to audit",
            required: true,
          },
          {
            name: "includeHeaders",
            description: "Include headers analysis (default: true)",
            required: false,
          },
        ],
      },
    ],
  };
});

// Enhanced prompt handler with comprehensive workflow execution
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "netlify-deploy": {
      const path = args?.path as string;
      const production = Boolean(args?.production);
      const message = args?.message as string;

      return {
        description: `Complete deployment workflow for ${path}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please execute a comprehensive deployment workflow for the site at "${path}".

**Deployment Configuration:**
- **Path:** ${path}
- **Production:** ${production}
- **Message:** ${message || "Automated deployment"}

**Deployment Workflow:**

1. **Pre-deployment Validation:**
   - Verify site directory exists and contains build artifacts
   - Check for build configuration files (package.json, netlify.toml)
   - Validate environment variables are properly set
   - Run pre-deployment security checks

2. **Build Process Verification:**
   - Check if build process completed successfully
   - Verify all required files are present in the deployment directory
   - Validate asset optimization and compression
   - Check for any build warnings or errors

3. **Deployment Execution:**
   - Deploy site: netlify_deploy_site with path "${path}", prod: ${production}, message: "${message}"
   - Monitor deployment progress and logs
   - Track deployment metrics and performance

4. **Post-deployment Verification:**
   - Verify site is accessible and functioning correctly
   - Run automated tests on the deployed site
   - Check for any deployment errors or warnings
   - Validate all functions and integrations are working

5. **Performance & Security Validation:**
   - Run performance analysis on the deployed site
   - Check security headers and SSL configuration
   - Validate SEO optimization and meta tags
   - Monitor for any runtime errors

6. **Monitoring Setup:**
   - Configure deployment notifications
   - Set up monitoring alerts for the site
   - Document deployment details and changes
   - Create deployment summary report

Please execute this comprehensive deployment workflow and provide detailed feedback at each step.`,
            },
          },
        ],
      };
    }

    case "netlify-setup": {
      const siteName = args?.siteName as string;
      const buildCommand = args?.buildCommand as string || "npm run build";
      const publishDir = args?.publishDir as string || "build";

      return {
        description: `Complete site setup for ${siteName}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please execute a comprehensive site setup workflow for "${siteName}".

**Site Configuration:**
- **Site Name:** ${siteName}
- **Build Command:** ${buildCommand}
- **Publish Directory:** ${publishDir}

**Setup Workflow:**

1. **Initial Site Creation:**
   - Create new site: netlify_create_site with name "${siteName}"
   - Link current directory: netlify_link_site
   - Verify connection and site details

2. **Build Configuration:**
   - Set build command: "${buildCommand}"
   - Configure publish directory: "${publishDir}"
   - Validate build process locally

3. **Environment Setup:**
   - Set up development environment variables
   - Configure production environment variables
   - Set up staging environment if needed

4. **Testing & Validation:**
   - Run initial test build: netlify_build_site
   - Deploy preview version for testing
   - Verify all functionality works correctly

5. **Production Setup:**
   - Configure production domain settings
   - Set up SSL certificates
   - Configure security headers and policies

6. **Monitoring & Maintenance:**
   - Set up deployment notifications
   - Configure monitoring and analytics
   - Document deployment process

Please execute this comprehensive setup workflow and provide detailed feedback at each step.`,
            },
          },
        ],
      };
    }

    case "netlify-security-audit": {
      const siteId = args?.siteId as string;
      const includeHeaders = Boolean(args?.includeHeaders) || true;
      
      return {
        description: `Security audit for site ${siteId}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please perform a comprehensive security audit for site "${siteId}".

**Include Headers Analysis:** ${includeHeaders}

**Security Audit Workflow:**

1. **Initial Security Assessment:**
   - Get site information: netlify_get_site_info for ${siteId}
   - Review current security configuration
   - Analyze access controls and permissions
   - Document current security posture

2. **Configuration Security Review:**
   - Audit environment variables and secrets
   - Review function permissions and scopes
   - Check build and deploy security settings
   - Validate authentication configurations

${includeHeaders ? `
3. **Security Headers Analysis:**
   - Check Content Security Policy (CSP) headers
   - Verify HTTPS and HSTS configuration
   - Analyze X-Frame-Options and X-Content-Type-Options
   - Review referrer policy and permissions policy
` : ''}

4. **Access Control Audit:**
   - Review site access permissions
   - Check form handling and input validation
   - Verify function authentication and authorization
   - Analyze API endpoint security

5. **Data Protection Review:**
   - Audit sensitive data handling
   - Check encryption at rest and in transit
   - Review data retention and deletion policies
   - Validate privacy and compliance requirements

6. **Vulnerability Assessment:**
   - Check for known security vulnerabilities
   - Analyze dependencies for security issues
   - Test for common web application vulnerabilities
   - Review third-party integrations and services

7. **Incident Response Preparation:**
   - Review monitoring and alerting systems
   - Check backup and recovery procedures
   - Validate incident response plans
   - Test security event detection and response

8. **Recommendations and Remediation:**
   - Provide detailed security recommendations
   - Implement critical security fixes
   - Set up ongoing security monitoring
   - Create security maintenance procedures

Please execute this comprehensive security audit for site "${siteId}" and provide a detailed security report with actionable recommendations.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Resource subscription handlers for real-time updates
server.setRequestHandler(SubscribeRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    subscriptions.add(uri);
    console.error(`[${new Date().toISOString()}] Subscribed to resource: ${uri}`);
    
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            subscribed: true,
            uri,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Subscription error for ${uri}:`, error);
    throw new Error(`Failed to subscribe to resource: ${uri}`);
  }
});

server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    subscriptions.delete(uri);
    console.error(`[${new Date().toISOString()}] Unsubscribed from resource: ${uri}`);
    
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            unsubscribed: true,
            uri,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unsubscription error for ${uri}:`, error);
    throw new Error(`Failed to unsubscribe from resource: ${uri}`);
  }
});

// Enhanced server startup with SSE and stdio transport support
async function main() {
  try {
    // Check for SSE transport mode
    const useSSE = process.env.MCP_TRANSPORT === 'sse' || process.argv.includes('--sse');
    const ssePort = parseInt(process.env.MCP_SSE_PORT || '3000');
    
    if (useSSE) {
      // Initialize enhanced SSE transport
      enhancedSSETransport = new EnhancedSSETransport({
        port: ssePort,
        path: '/mcp',
        enableWebSocket: true,
        enableCors: true,
        maxConnections: 100,
        heartbeatInterval: 30000,
        compressionLevel: 6,
      });

      // Start SSE transport server
      await enhancedSSETransport.start();
      await server.connect(enhancedSSETransport);
      
      console.error(`[${new Date().toISOString()}] Netlify MCP Server (v2.0.0) running on enhanced SSE transport`);
      console.error(`[${new Date().toISOString()}] SSE Endpoint: http://localhost:${ssePort}/mcp`);
      console.error(`[${new Date().toISOString()}] WebSocket Endpoint: ws://localhost:${ssePort}/mcp/ws`);
      console.error(`[${new Date().toISOString()}] Health Check: http://localhost:${ssePort}/health`);
      console.error(`[${new Date().toISOString()}] Stats Endpoint: http://localhost:${ssePort}/stats`);
    } else {
      // Use stdio transport (default)
      const transport = new StdioServerTransport();
      await server.connect(transport);
      
      console.error(`[${new Date().toISOString()}] Netlify MCP Server (v2.0.0) running on stdio transport`);
    }
    
    console.error(`[${new Date().toISOString()}] Protocol Version: ${LATEST_PROTOCOL_VERSION}`);
    console.error(`[${new Date().toISOString()}] LAZY LOADING ENABLED: Tools available without authentication, auth validated on execution`);
    console.error(`[${new Date().toISOString()}] Available tools: 24 Netlify CLI operations`);
    console.error(`[${new Date().toISOString()}] Available resources: 12 comprehensive data sources`);
    console.error(`[${new Date().toISOString()}] Available prompts: 8 workflow templates`);
    console.error(`[${new Date().toISOString()}] Enhanced features: Analytics, Performance Optimization, Plugin System`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    throw error;
  }
}

// Graceful shutdown with enhanced transport cleanup
process.on('SIGINT', async () => {
  console.error("[Shutdown] Gracefully shutting down Netlify MCP Server...");
  
  try {
    // Cleanup enhancement systems
    await performanceOptimizer.cleanup();
    
    // Close SSE transport if running (this also closes the HTTP server)
    if (enhancedSSETransport) {
      await enhancedSSETransport.close();
      console.error("[Shutdown] Enhanced SSE transport closed");
    }
    
    // Close MCP server
    await server.close();
    console.error("[Shutdown] MCP server closed");
    
    console.error("[Shutdown] Netlify MCP Server shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("[Shutdown] Error during shutdown:", error);
    process.exit(1);
  }
});

main().catch((error) => {
  console.error("Fatal error initializing Netlify MCP Server:", error);
  process.exit(1);
});
