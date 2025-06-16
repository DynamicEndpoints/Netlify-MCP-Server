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
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { execSync } from "child_process";
import { EventEmitter } from "events";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer } from "ws";
import * as fs from "fs";
import * as path from "path";

// Import enhancement modules
import { EnhancedSSETransport } from "./transport/sse-enhanced.js";
import { AdvancedAnalytics } from "./analytics/advanced-analytics.js";
import { CustomWorkflowManager } from "./workflows/custom-workflows.js";
import { PluginManager } from "./plugins/plugin-manager.js";
import { PerformanceOptimizer } from "./performance/performance-optimizer.js";

// Global event emitter for resource updates
const resourceEmitter = new EventEmitter();

// Initialize enhancement systems
const analytics = new AdvancedAnalytics("./analytics");
const workflowManager = new CustomWorkflowManager("./workflows");
const pluginManager = new PluginManager("./plugins");
const performanceOptimizer = new PerformanceOptimizer({
  caching: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    strategy: "lru",
  },
  concurrency: {
    maxConcurrentOperations: 15,
    queueMaxSize: 1000,
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

// Create server instance using the latest SDK patterns with enhanced capabilities
const server = new Server({
  name: "netlify-mcp-server",
  version: "2.0.0",
}, {
  capabilities: {
    tools: {},
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
    logging: {},
    experimental: {
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

// Set up tool handlers using the latest SDK patterns
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "deploy-site",
        description: "Deploy a site to Netlify",
        inputSchema: DeploySiteSchema,
      },
      {
        name: "list-sites",
        description: "List all Netlify sites",
        inputSchema: ListSitesSchema,
      },
      {
        name: "set-env-vars",
        description: "Set environment variables for a site",
        inputSchema: SetEnvVarsSchema,
      },
      {
        name: "get-logs",
        description: "Get function logs for a site",
        inputSchema: GetLogsSchema,
      },
      {
        name: "trigger-build",
        description: "Trigger a new build and deploy",
        inputSchema: TriggerBuildSchema,
      },
      {
        name: "link-site",
        description: "Link current directory to a Netlify site",
        inputSchema: LinkSiteSchema,
      },
      {
        name: "unlink-site",
        description: "Unlink current directory from Netlify site",
        inputSchema: UnlinkSiteSchema,
      },
      {
        name: "get-status",
        description: "Get current Netlify status",
        inputSchema: GetStatusSchema,
      },
      {
        name: "import-env",
        description: "Import environment variables from file",
        inputSchema: ImportEnvSchema,
      },
      {
        name: "build-site",
        description: "Build site locally",
        inputSchema: BuildSiteSchema,
      },
      {
        name: "get-env-var",
        description: "Get a specific environment variable",
        inputSchema: GetEnvVarSchema,
      },
      {
        name: "unset-env-var",
        description: "Unset an environment variable",
        inputSchema: UnsetEnvVarSchema,
      },
      {
        name: "clone-env-vars",
        description: "Clone environment variables between sites",
        inputSchema: CloneEnvVarsSchema,
      },
      {
        name: "create-site",
        description: "Create a new Netlify site",
        inputSchema: CreateSiteSchema,
      },
      {
        name: "delete-site",
        description: "Delete a Netlify site",
        inputSchema: DeleteSiteSchema,
      },
      {
        name: "get-site-info",
        description: "Get detailed information about a site",
        inputSchema: GetSiteInfoSchema,
      },
      {
        name: "list-deploys",
        description: "List deploys for a site",
        inputSchema: ListDeploysSchema,
      },
      {
        name: "get-deploy-info",
        description: "Get information about a specific deploy",
        inputSchema: GetDeployInfoSchema,
      },
      {
        name: "cancel-deploy",
        description: "Cancel a running deploy",
        inputSchema: CancelDeploySchema,
      },
      {
        name: "restore-deploy",
        description: "Restore a previous deploy",
        inputSchema: RestoreDeploySchema,
      },
      {
        name: "list-functions",
        description: "List all functions for a site",
        inputSchema: ListFunctionsSchema,
      },
      {
        name: "get-form-submissions",
        description: "Get form submissions for a site",
        inputSchema: GetFormSubmissionsSchema,
      },
      {
        name: "enable-branch-deploy",
        description: "Enable branch deploys for a specific branch",
        inputSchema: EnableBranchDeploySchema,
      },
      {
        name: "disable-branch-deploy",
        description: "Disable branch deploys for a specific branch",
        inputSchema: DisableBranchDeploySchema,
      },
    ],
  };
});

// Set up call tool handler
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

// Set up resources handler
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
        description: "Complete site overview including status, configuration, and metrics",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/functions",
        name: "Site functions",
        description: "List all functions with their configuration and status",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/env",
        name: "Environment variables",
        description: "Environment variables by context (build, function, etc.)",
        mimeType: "application/json",
      },
      {
        uri: "netlify://sites/{siteId}/deploys",
        name: "Deploy history",
        description: "Deployment history with detailed status and metrics",
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

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    if (uri === "netlify://sites") {
      const sites = await siteManager.getSites();
      // Enhance sites data with additional context
      const enhancedSites = sites.map(site => ({
        ...site,
        lastUpdated: new Date().toISOString(),
        resourceUri: `netlify://sites/${site.id}`,
      }));
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(enhancedSites, null, 2),
          },
        ],
      };
    }

    if (uri === "netlify://status") {
      try {
        const output = await executeNetlifyCommand("status --json");
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
                status: "error",
                message: "Unable to fetch Netlify status",
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }
    }

    if (uri === "netlify://account/usage") {
      try {
        const output = await executeNetlifyCommand("api getCurrentUser");
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
                error: "Unable to fetch account usage",
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }
    }

    // Handle site-specific resources
    const siteMatch = uri.match(/^netlify:\/\/sites\/([^\/]+)(?:\/(.+))?$/);
    if (siteMatch) {
      const [, siteId, resource] = siteMatch;
      
      switch (resource) {
        case "overview": {
          const site = await siteManager.getSiteById(siteId);
          if (!site) {
            throw new Error(`Site not found: ${siteId}`);
          }
          
          // Get comprehensive site information
          const [deployOutput, envOutput, functionsOutput] = await Promise.allSettled([
            executeNetlifyCommand(`api listSiteDeploys --data='{"site_id":"${siteId}","per_page":5}'`),
            executeNetlifyCommand(`env:list --json`, siteId),
            executeNetlifyCommand(`functions:list --json`, siteId),
          ]);

          const overview = {
            site,
            recentDeploys: deployOutput.status === 'fulfilled' ? JSON.parse(deployOutput.value) : [],
            environmentVariableCount: envOutput.status === 'fulfilled' ? 
              JSON.parse(envOutput.value).length : 0,
            functionCount: functionsOutput.status === 'fulfilled' ? 
              JSON.parse(functionsOutput.value).length : 0,
            lastUpdated: new Date().toISOString(),
          };

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(overview, null, 2),
              },
            ],
          };
        }
        
        case "functions": {
          const command = `functions:list --json`;
          const output = await executeNetlifyCommand(command, siteId);
          const functions = JSON.parse(output);
          
          // Enhance functions data with additional context
          const enhancedFunctions = functions.map((func: any) => ({
            ...func,
            lastUpdated: new Date().toISOString(),
            resourceUri: `netlify://sites/${siteId}/functions/${func.name}`,
          }));
          
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(enhancedFunctions, null, 2),
              },
            ],
          };
        }
        
        case "env": {
          const command = `env:list --json`;
          const output = await executeNetlifyCommand(command, siteId);
          const envVars = JSON.parse(output);
          
          // Group environment variables by context
          const groupedEnvVars = envVars.reduce((acc: any, envVar: any) => {
            const context = envVar.scope || 'global';
            if (!acc[context]) acc[context] = [];
            acc[context].push(envVar);
            return acc;
          }, {});
          
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify({
                  byContext: groupedEnvVars,
                  total: envVars.length,
                  lastUpdated: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        }
        
        case "deploys": {
          const command = `api listSiteDeploys --data='{"site_id":"${siteId}","per_page":20}'`;
          const output = await executeNetlifyCommand(command);
          const deploys = JSON.parse(output);
          
          // Enhance deploys with status summary
          const deployStats = deploys.reduce((acc: any, deploy: any) => {
            acc[deploy.state] = (acc[deploy.state] || 0) + 1;
            return acc;
          }, {});
          
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

        default:
          // Handle deploy-specific resources
          const deployMatch = resource?.match(/^deploys\/([^\/]+)$/);
          if (deployMatch) {
            const [, deployId] = deployMatch;
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
        description: "Deploy a site to Netlify with best practices and validation",
        arguments: [
          {
            name: "path",
            description: "Path to the site directory",
            required: true,
          },
          {
            name: "production",
            description: "Whether this is a production deployment",
            required: false,
          },
          {
            name: "message",
            description: "Deploy message for tracking",
            required: false,
          },
        ],
      },
      {
        name: "netlify-setup",
        description: "Complete setup workflow for a new Netlify site",
        arguments: [
          {
            name: "siteName",
            description: "Name for the new site",
            required: true,
          },
          {
            name: "buildCommand",
            description: "Build command for the site",
            required: false,
          },
          {
            name: "publishDir",
            description: "Directory to publish (e.g., build, dist, public)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-environment-setup",
        description: "Set up environment variables across different contexts",
        arguments: [
          {
            name: "siteId",
            description: "Site ID or name to configure",
            required: true,
          },
          {
            name: "environment",
            description: "Environment type (development, staging, production)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-troubleshoot",
        description: "Comprehensive troubleshooting workflow for deployment issues",
        arguments: [
          {
            name: "siteId",
            description: "Site ID or name having issues",
            required: true,
          },
          {
            name: "issueType",
            description: "Type of issue (build, deploy, function, dns)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-function-deploy",
        description: "Deploy and test Netlify Functions with best practices",
        arguments: [
          {
            name: "functionPath",
            description: "Path to functions directory",
            required: true,
          },
          {
            name: "runtime",
            description: "Function runtime (nodejs, go, python)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-migration",
        description: "Migrate an existing site to Netlify with optimization",
        arguments: [
          {
            name: "sourceType",
            description: "Source platform (github, gitlab, custom)",
            required: true,
          },
          {
            name: "repositoryUrl",
            description: "Repository URL if applicable",
            required: false,
          },
        ],
      },
      {
        name: "netlify-optimization",
        description: "Optimize site performance and configuration",
        arguments: [
          {
            name: "siteId",
            description: "Site ID to optimize",
            required: true,
          },
          {
            name: "focusArea",
            description: "Optimization focus (performance, security, seo)",
            required: false,
          },
        ],
      },
      {
        name: "netlify-security-audit",
        description: "Perform security audit and implement best practices",
        arguments: [
          {
            name: "siteId",
            description: "Site ID to audit",
            required: true,
          },
          {
            name: "includeHeaders",
            description: "Include security headers analysis",
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "netlify-deploy": {
      const path = args?.path as string || "./";
      const production = Boolean(args?.production) || false;
      const message = args?.message as string || `Deploy from ${path} at ${new Date().toISOString()}`;
      
      return {
        description: `Deploy ${path} to Netlify ${production ? 'production' : 'preview'}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please deploy the site at "${path}" to Netlify. ${production ? 'This is a production deployment.' : 'This is a preview deployment.'} 
              
Deploy message: "${message}"

Complete deployment workflow:
1. **Pre-deployment checks:**
   - Verify site status with netlify_get_status
   - Check current site configuration
   - Validate build directory exists

2. **Build validation:**
   - Check if build command exists in package.json
   - Run local build if needed: netlify_build_site
   - Verify build output directory

3. **Deploy execution:**
   - Use netlify_deploy_site with path: "${path}"
   - Set production flag: ${production}
   - Include deploy message: "${message}"

4. **Post-deployment verification:**
   - Check deploy status and URL
   - Verify site functionality
   - Monitor for any deployment errors

5. **Cleanup and reporting:**
   - Clean up any temporary files
   - Provide deployment summary with URLs
   - Log deployment details for future reference

Please execute this workflow step by step and report the results at each stage.`,
            },
          },
        ],
      };
    }
    
    case "netlify-setup": {
      const siteName = args?.siteName as string || "my-new-site";
      const buildCommand = args?.buildCommand as string || "npm run build";
      const publishDir = args?.publishDir as string || "build";
      
      return {
        description: `Complete setup workflow for Netlify site: ${siteName}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please set up a complete Netlify site named "${siteName}" with the following configuration:

**Site Configuration:**
- Site name: ${siteName}
- Build command: ${buildCommand}
- Publish directory: ${publishDir}

**Complete Setup Workflow:**

1. **Initial Setup:**
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

    case "netlify-environment-setup": {
      const siteId = args?.siteId as string;
      const environment = args?.environment as string || "all";
      
      return {
        description: `Set up environment variables for ${siteId} (${environment})`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please configure environment variables for site "${siteId}" targeting "${environment}" environment(s).

**Environment Configuration Workflow:**

1. **Current State Analysis:**
   - List existing environment variables: netlify_get_env_var for site ${siteId}
   - Identify any missing or outdated variables
   - Document current configuration

2. **Environment-Specific Setup:**
   ${environment === "development" || environment === "all" ? `
   **Development Environment:**
   - Set debug flags and verbose logging
   - Configure development API endpoints
   - Set up hot reloading and dev tools
   ` : ""}
   ${environment === "staging" || environment === "all" ? `
   **Staging Environment:**
   - Configure staging API endpoints
   - Set up test data connections
   - Enable staging-specific features
   ` : ""}
   ${environment === "production" || environment === "all" ? `
   **Production Environment:**
   - Set production API keys and secrets
   - Configure production database connections
   - Enable production monitoring and analytics
   ` : ""}

3. **Security Best Practices:**
   - Ensure sensitive data is properly encrypted
   - Use appropriate scopes (builds, functions, etc.)
   - Implement least-privilege access patterns

4. **Validation & Testing:**
   - Test environment variable access
   - Verify variables are properly scoped
   - Run test builds to validate configuration

5. **Documentation:**
   - Document all environment variables and their purposes
   - Create setup guide for future deployments
   - Update team documentation

Please execute this environment setup workflow for site "${siteId}".`,
            },
          },
        ],
      };
    }

    case "netlify-troubleshoot": {
      const siteId = args?.siteId as string;
      const issueType = args?.issueType as string || "general";
      
      return {
        description: `Troubleshoot ${issueType} issues for site ${siteId}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please perform comprehensive troubleshooting for site "${siteId}" focusing on "${issueType}" issues.

**Comprehensive Troubleshooting Workflow:**

1. **Initial Diagnostics:**
   - Get site status: netlify_get_status
   - Get site information: netlify_get_site_info for ${siteId}
   - List recent deploys: netlify_list_deploys for ${siteId}

2. **Issue-Specific Analysis:**
   ${issueType === "build" || issueType === "general" ? `
   **Build Issues:**
   - Check build logs from recent deploys
   - Verify build command and dependencies
   - Test local build process
   - Check for environment variable issues
   ` : ""}
   ${issueType === "deploy" || issueType === "general" ? `
   **Deploy Issues:**
   - Analyze deployment history and patterns
   - Check for failed deploys and error messages
   - Verify file permissions and paths
   - Test deploy process step by step
   ` : ""}
   ${issueType === "function" || issueType === "general" ? `
   **Function Issues:**
   - List and analyze function status: netlify_list_functions
   - Check function logs: netlify_get_logs
   - Verify function runtime and dependencies
   - Test function endpoints and responses
   ` : ""}
   ${issueType === "dns" || issueType === "general" ? `
   **DNS/Domain Issues:**
   - Check domain configuration
   - Verify SSL certificate status
   - Test domain resolution and routing
   - Check custom domain settings
   ` : ""}

3. **System Health Check:**
   - Verify Netlify service status
   - Check for any ongoing incidents
   - Validate account limits and quotas

4. **Resolution Steps:**
   - Implement fixes based on identified issues
   - Test solutions in staging environment
   - Deploy fixes to production
   - Monitor for resolution confirmation

5. **Prevention & Documentation:**
   - Document issues and solutions found
   - Implement monitoring to prevent recurrence
   - Update deployment and maintenance procedures

Please execute this troubleshooting workflow for site "${siteId}" and provide detailed analysis and solutions.`,
            },
          },
        ],
      };
    }

    case "netlify-function-deploy": {
      const functionPath = args?.functionPath as string || "./netlify/functions";
      const runtime = args?.runtime as string || "nodejs";
      
      return {
        description: `Deploy and test Netlify Functions from ${functionPath}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please deploy and test Netlify Functions from "${functionPath}" using "${runtime}" runtime.

**Function Deployment Workflow:**

1. **Pre-deployment Validation:**
   - Verify function directory structure at "${functionPath}"
   - Check function syntax and dependencies
   - Validate runtime configuration for "${runtime}"
   - Test functions locally if possible

2. **Function Analysis:**
   - List existing functions: netlify_list_functions
   - Identify new, modified, and deleted functions
   - Check function size and complexity limits

3. **Deployment Process:**
   - Deploy functions: netlify_deploy_function with path "${functionPath}"
   - Set runtime to "${runtime}"
   - Monitor deployment progress and logs

4. **Testing & Validation:**
   - Test each function endpoint
   - Verify function responses and error handling
   - Check function logs: netlify_get_logs
   - Validate function performance and timeout settings

5. **Environment Configuration:**
   - Set up function-specific environment variables
   - Configure function-level permissions and scopes
   - Test environment variable access from functions

6. **Monitoring Setup:**
   - Set up function monitoring and alerting
   - Configure logging and error reporting
   - Document function endpoints and usage

7. **Security & Best Practices:**
   - Verify function security configurations
   - Implement rate limiting if needed
   - Validate input sanitization and error handling

Please execute this function deployment workflow and provide detailed feedback on each function's status and performance.`,
            },
          },
        ],
      };
    }

    case "netlify-migration": {
      const sourceType = args?.sourceType as string;
      const repositoryUrl = args?.repositoryUrl as string || "";
      
      return {
        description: `Migrate site from ${sourceType} to Netlify`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please migrate a site from "${sourceType}" to Netlify with full optimization.

**Repository:** ${repositoryUrl || "Not specified - will use current directory"}

**Complete Migration Workflow:**

1. **Pre-migration Analysis:**
   - Analyze current site structure and dependencies
   - Identify build process and requirements
   - Document current hosting configuration
   - Plan migration strategy and timeline

2. **Netlify Site Setup:**
   - Create new Netlify site: netlify_create_site
   - Configure build settings and commands
   - Set up environment variables and secrets

3. **Build Process Migration:**
   ${sourceType === "github" || sourceType === "gitlab" ? `
   **Git-based Migration:**
   - Configure continuous deployment from repository
   - Set up branch-based deployments
   - Configure build hooks and notifications
   ` : `
   **Custom Migration:**
   - Set up manual deployment process
   - Configure build commands and scripts
   - Test local build process
   `}

4. **Content and Asset Migration:**
   - Transfer static assets and content
   - Update asset paths and references
   - Optimize images and media files
   - Configure redirects and URL routing

5. **Feature Migration:**
   - Migrate forms and form handling
   - Set up function equivalents for dynamic features
   - Configure authentication and user management
   - Migrate database connections and APIs

6. **Performance Optimization:**
   - Implement Netlify-specific optimizations
   - Set up CDN and caching strategies
   - Optimize build process and deployment speed
   - Configure performance monitoring

7. **Testing & Validation:**
   - Deploy to staging environment
   - Test all functionality and features
   - Verify performance and security
   - Conduct user acceptance testing

8. **Go-live Process:**
   - Update DNS settings
   - Configure SSL certificates
   - Monitor deployment and traffic
   - Provide rollback plan if needed

Please execute this migration workflow step by step and provide detailed progress reports.`,
            },
          },
        ],
      };
    }

    case "netlify-optimization": {
      const siteId = args?.siteId as string;
      const focusArea = args?.focusArea as string || "performance";
      
      return {
        description: `Optimize ${siteId} focusing on ${focusArea}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please optimize site "${siteId}" with focus on "${focusArea}" improvements.

**Site Optimization Workflow:**

1. **Current State Assessment:**
   - Get site information: netlify_get_site_info for ${siteId}
   - Analyze current build and deploy metrics
   - Review site performance and loading times
   - Document current configuration and settings

2. **${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)} Optimization:**
   ${focusArea === "performance" || focusArea === "all" ? `
   **Performance Optimization:**
   - Analyze build time and deployment speed
   - Optimize asset loading and compression
   - Implement lazy loading and code splitting
   - Configure CDN and caching strategies
   - Optimize images and media files
   ` : ""}
   ${focusArea === "security" || focusArea === "all" ? `
   **Security Optimization:**
   - Implement security headers and CSP
   - Configure HTTPS and SSL settings
   - Set up access controls and authentication
   - Secure environment variables and secrets
   - Implement rate limiting and DDoS protection
   ` : ""}
   ${focusArea === "seo" || focusArea === "all" ? `
   **SEO Optimization:**
   - Configure meta tags and structured data
   - Implement proper URL structure and redirects
   - Optimize page loading and Core Web Vitals
   - Set up analytics and search console
   - Configure sitemap and robots.txt
   ` : ""}

3. **Build Process Optimization:**
   - Optimize build commands and scripts
   - Implement build caching strategies
   - Configure parallel processing where possible
   - Minimize build dependencies and time

4. **Deployment Optimization:**
   - Configure branch-based deployment strategies
   - Set up deploy previews and testing
   - Implement atomic deployments
   - Configure rollback and recovery procedures

5. **Monitoring and Analytics:**
   - Set up performance monitoring
   - Configure error tracking and alerting
   - Implement usage analytics and reporting
   - Create optimization dashboards

6. **Testing and Validation:**
   - Test optimizations in staging environment
   - Measure performance improvements
   - Validate security enhancements
   - Conduct user experience testing

7. **Documentation and Maintenance:**
   - Document optimization changes and results
   - Create maintenance procedures
   - Set up regular optimization reviews
   - Train team on new processes

Please execute this optimization workflow for site "${siteId}" and provide detailed metrics on improvements achieved.`,
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
   - Analyze X-Frame-Options and clickjacking protection
   - Review CORS and cross-origin policies
   - Check X-Content-Type-Options and MIME sniffing protection
` : ""}

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
    
    // Send initial resource state
    if (uri.includes('/deploys') || uri.includes('/env') || uri === 'netlify://sites') {
      // Trigger initial resource load to populate cache
      if (uri === 'netlify://sites') {
        await siteManager.getSites(true); // Force refresh
      } else {
        const siteMatch = uri.match(/^netlify:\/\/sites\/([^\/]+)/);
        if (siteMatch) {
          const [, siteId] = siteMatch;
          await siteManager.getSiteById(siteId); // Ensure site is cached
        }
      }
    }
    
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

// Enhanced notification system with retry logic
const sendNotificationWithRetry = async (notificationFn: () => Promise<void>, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await notificationFn();
      return;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Notification attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        console.error(`[${new Date().toISOString()}] All notification attempts failed`);
      }
    }
  }
};

// Enhanced resource change notifications
resourceEmitter.on('resourceChanged', async (data) => {
  if (subscriptions.size > 0) {
    console.error(`[${new Date().toISOString()}] Processing resource change notification:`, data);
    
    // Invalidate relevant caches
    siteManager.invalidateCache();
      // Send targeted notifications based on the change type
    const notifications = [];
    
    if (data.command.includes('deploy') && data.siteId) {
      const deployUri = `netlify://sites/${data.siteId}/deploys`;
      const overviewUri = `netlify://sites/${data.siteId}/overview`;
      
      if (subscriptions.has(deployUri)) {
        notifications.push(() => server.sendResourceUpdated({ uri: deployUri }));
      }
      if (subscriptions.has(overviewUri)) {
        notifications.push(() => server.sendResourceUpdated({ uri: overviewUri }));
      }
    }
    
    if (data.command.includes('env:set') && data.siteId) {
      const envUri = `netlify://sites/${data.siteId}/env`;
      const overviewUri = `netlify://sites/${data.siteId}/overview`;
      
      if (subscriptions.has(envUri)) {
        notifications.push(() => server.sendResourceUpdated({ uri: envUri }));
      }
      if (subscriptions.has(overviewUri)) {
        notifications.push(() => server.sendResourceUpdated({ uri: overviewUri }));
      }
    }
    
    if (data.command.includes('sites:create') || data.command.includes('sites:delete')) {
      if (subscriptions.has('netlify://sites')) {
        notifications.push(() => server.sendResourceListChanged());
      }
    }
    
    if (data.command.includes('functions')) {
      const functionsUri = `netlify://sites/${data.siteId}/functions`;
      const overviewUri = `netlify://sites/${data.siteId}/overview`;
      
      if (subscriptions.has(functionsUri)) {
        notifications.push(() => server.sendResourceUpdated({ uri: functionsUri }));
      }
      if (subscriptions.has(overviewUri)) {
        notifications.push(() => server.sendResourceUpdated({ uri: overviewUri }));
      }
    }
    
    // Send all notifications with retry logic
    for (const notification of notifications) {
      await sendNotificationWithRetry(notification);
    }
    
    console.error(`[${new Date().toISOString()}] Sent ${notifications.length} notifications for resource changes`);
  }
});

// Periodic health check and cache management
setInterval(async () => {
  try {
    // Refresh site cache periodically if there are active subscriptions
    if (subscriptions.size > 0) {
      const hasRelevantSubscriptions = Array.from(subscriptions).some(
        uri => uri === 'netlify://sites' || uri.includes('overview')
      );
      
      if (hasRelevantSubscriptions) {
        await siteManager.getSites(true); // Force refresh
        console.error(`[${new Date().toISOString()}] Periodic cache refresh completed`);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Periodic health check failed:`, error);
  }
}, 300000); // Every 5 minutes

// Run the server with stdio transport (SSE support can be added later)
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error(`[${new Date().toISOString()}] Netlify MCP Server (v2.0.0) running on stdio transport`);
    console.error(`[${new Date().toISOString()}] Server capabilities: tools, resources (with subscriptions), prompts, logging`);
    console.error(`[${new Date().toISOString()}] Available tools: 23 Netlify CLI operations`);
    console.error(`[${new Date().toISOString()}] Available prompts: 8 workflow templates`);
    console.error(`[${new Date().toISOString()}] Available resources: 12 data sources with real-time updates`);
    console.error(`[${new Date().toISOString()}] Resource subscriptions: Active for real-time notifications`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error("Shutting down Netlify MCP Server...");
  await server.close();
  process.exit(0);
});

main().catch((error) => {
  console.error("Fatal error initializing Netlify MCP Server:", error);
  process.exit(1);
});
