#!/usr/bin/env node
// Adding .js extension back to specific paths
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"; 
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";
import { URL } from 'url'; // Needed for ResourceTemplate parsing

// Create server instance using McpServer
const server = new McpServer({
  name: "netlify-mcp-server", // Updated name slightly
  version: "1.1.0", // Incremented version
});

// Helper function for executing Netlify CLI commands
async function executeNetlifyCommand(command: string, siteId?: string): Promise<string> { // Added optional siteId
  try {
    // Ensure Netlify CLI is accessible, might need full path or PATH setup
    console.error(`Executing: netlify ${command}`); // Log command execution

    // Create environment object, copying current process env
    const env = { ...process.env };
    if (siteId) {
      env['NETLIFY_SITE_ID'] = siteId; // Add NETLIFY_SITE_ID if provided
      console.error(`Using NETLIFY_SITE_ID: ${siteId}`);
    }

    // Explicitly pass the potentially modified environment variables
    const output = execSync(`netlify ${command}`, { encoding: 'utf8', env: env });
    console.error(`Output: ${output.substring(0, 100)}...`); // Log truncated output
    return output;
  } catch (error) {
    console.error(`Error executing command: netlify ${command}`, error);
    if (error instanceof Error) {
      // Include stderr if available
      const stderr = (error as any).stderr ? (error as any).stderr.toString() : '';
      throw new Error(`Netlify CLI error: ${error.message}\n${stderr}`);
    }
    throw error;
  }
}

// Define Zod schemas for validation (keeping existing ones)
const DeploySiteSchema = z.object({
  path: z.string().describe("Path to the site directory"),
  prod: z.boolean().optional().describe("Deploy to production"),
  message: z.string().optional().describe("Deploy message"),
});

const ListSitesSchema = z.object({}); // No args needed

const SetEnvVarsSchema = z.object({
  siteId: z.string().describe("Site ID or name"),
  envVars: z.record(z.string()).describe("Environment variables to set (key-value pairs)"),
});

// Removed GetDeployStatusSchema as `netlify deploys` command group is not available in CLI v19.1.5

// Removed AddDNSRecordSchema as `netlify dns` command group is not available in CLI v19.1.5

const DeployFunctionSchema = z.object({
  // Netlify CLI deploys functions based on project structure, not individual files usually.
  // This tool might need rethinking based on typical `netlify deploy` usage.
  // Keeping schema for now, but implementation might need adjustment.
  path: z.string().describe("Path to the site directory containing functions"),
  name: z.string().describe("Function name (often inferred from file path)"),
  runtime: z.string().optional().describe("Function runtime (e.g., nodejs, go)"),
});

// Removed ManageFormSchema as `netlify forms` command group is not available in CLI v19.1.5

// Removed ManagePluginSchema as `netlify plugins` command group is not available in CLI v19.1.5

// Removed ManageHookSchema as `netlify hooks` command group is not available in CLI v19.1.5

// Schemas for New Tools
const GetLogsSchema = z.object({
  siteId: z.string().describe("Site ID or name"),
  function: z.string().optional().describe("Optional: Specific function name to filter logs"),
  // Add other potential filters like 'level', 'tail', 'number' if needed
});

// Removed InvokeFunctionSchema as `functions:invoke` does not support --site flag in CLI v19.1.5

// Removed DeleteFunctionSchema as `functions:delete` command is not available in CLI v19.1.5

const TriggerBuildSchema = z.object({
  siteId: z.string().describe("Site ID or name"),
  message: z.string().optional().describe("Optional: Deploy message"),
  // Add --clear-cache if needed
});

const LinkSiteSchema = z.object({
  siteId: z.string().optional().describe("Optional: Site ID to link to (otherwise interactive)"),
  // Add --name for repo linking if needed
});

const UnlinkSiteSchema = z.object({}); // No args needed

const GetStatusSchema = z.object({}); // No args needed

const ImportEnvSchema = z.object({
  siteId: z.string().describe("Site ID or name"),
  filePath: z.string().describe("Path to the .env file to import"),
  replace: z.boolean().optional().describe("Replace existing variables instead of merging"),
});

// Schemas for Comprehensive Tools
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
  // Scope might not be applicable for unset, check CLI docs
});

const CloneEnvVarsSchema = z.object({
  fromSiteId: z.string().describe("Source Site ID"),
  toSiteId: z.string().describe("Destination Site ID"),
});

const CreateSiteSchema = z.object({
  name: z.string().optional().describe("Optional: Site name (subdomain)"),
  accountSlug: z.string().optional().describe("Optional: Account slug for the team"),
  // Add other flags like --repo, --manual if needed for non-interactive creation
});

const DeleteSiteSchema = z.object({
  siteId: z.string().describe("Site ID to delete"),
  force: z.boolean().optional().default(true).describe("Force deletion without confirmation (default: true)"),
});

// Removed DeleteDNSRecordSchema as `netlify dns` command group is not available in CLI v19.1.5


// --- Register Netlify Tools using server.tool() ---

server.tool("deploy-site", DeploySiteSchema.shape, async (params: z.infer<typeof DeploySiteSchema>) => { // Use .shape
  try {
    let command = `deploy --dir="${params.path}"`;
    if (params.prod) command += " --prod";
    if (params.message) command += ` --message="${params.message}"`;
    const output = await executeNetlifyCommand(command);
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("list-sites", ListSitesSchema.shape, async () => { // Use .shape
  try {
    const output = await executeNetlifyCommand("sites:list");
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("set-env-vars", SetEnvVarsSchema.shape, async (params: z.infer<typeof SetEnvVarsSchema>) => { // Use .shape
  try {
    const results: string[] = [];
    // Note: `netlify env:set` sets one var at a time.
    // Consider `netlify env:import` for bulk setting from a file if needed.
    for (const [key, value] of Object.entries(params.envVars)) {
      // Value is a positional argument. Pass siteId via env var.
      const command = `env:set ${key} "${value}"`;
      const output = await executeNetlifyCommand(command, params.siteId); // Pass siteId here
      results.push(`Set ${key}: ${output}`);
    }
    return { content: [{ type: "text", text: results.join("\n") }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

// Removed get-deploy-status tool

// Removed add-dns-record tool

// Deploying individual functions via CLI isn't standard. Usually `netlify deploy` handles it.
// This tool might need removal or significant rework based on actual workflow.
// server.tool("deploy-function", DeployFunctionSchema.shape, async (params: z.infer<typeof DeployFunctionSchema>) => { ... }); // Use .shape if uncommented

// Removed manage-form tool

// Removed manage-plugin tool

// Removed manage-hook tool

// New Tools Implementation
server.tool("get-logs", GetLogsSchema.shape, async (params: z.infer<typeof GetLogsSchema>) => {
  try {
    let command = `logs:function`; // Use logs:function subcommand
    if (params.function) command += ` ${params.function}`; // Function name is an argument now
    // Site context passed via env var
    // Add other flags like --level, --number based on schema extensions if applicable to logs:function
    const output = await executeNetlifyCommand(command, params.siteId); // Pass siteId here
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

// Removed invoke-function tool

// Removed delete-function tool

server.tool("trigger-build", TriggerBuildSchema.shape, async (params: z.infer<typeof TriggerBuildSchema>) => {
  try {
    let command = `deploy --build`;
    if (params.message) command += ` --message "${params.message}"`;
    // Site context passed via env var
    const output = await executeNetlifyCommand(command, params.siteId); // Pass siteId here
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("link-site", LinkSiteSchema.shape, async (params: z.infer<typeof LinkSiteSchema>) => {
  try {
    // `netlify link` is typically interactive. Providing ID might bypass this.
    let command = `link`;
    if (params.siteId) command += ` --id ${params.siteId}`;
    else {
        // Cannot run interactive commands via MCP server
        throw new Error("Interactive linking not supported. Please provide a siteId.");
    }
    const output = await executeNetlifyCommand(command);
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("unlink-site", UnlinkSiteSchema.shape, async () => { // Use .shape
  try {
    const command = `unlink`;
    const output = await executeNetlifyCommand(command);
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("get-status", GetStatusSchema.shape, async () => { // Use .shape
  try {
    const command = `status`;
    const output = await executeNetlifyCommand(command);
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("import-env", ImportEnvSchema.shape, async (params: z.infer<typeof ImportEnvSchema>) => { // Use .shape
  try {
    let command = `env:import ${params.filePath}`;
    if (params.replace) command += ` --replace`;
    // Site context passed via env var
    const output = await executeNetlifyCommand(command, params.siteId); // Pass siteId here
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

// Comprehensive Tools Implementation
server.tool("build-site", BuildSiteSchema.shape, async (params: z.infer<typeof BuildSiteSchema>) => {
  try {
    let command = `build`;
    if (params.context) command += ` --context ${params.context}`;
    if (params.dry) command += ` --dry`;
    // Site context passed via env var if provided
    const output = await executeNetlifyCommand(command, params.siteId); // Pass siteId here
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("get-env-var", GetEnvVarSchema.shape, async (params: z.infer<typeof GetEnvVarSchema>) => {
  try {
    let command = `env:get ${params.key}`;
    if (params.context) command += ` --context ${params.context}`;
    if (params.scope) command += ` --scope ${params.scope}`;
    // Site context passed via env var if provided
    const output = await executeNetlifyCommand(command, params.siteId); // Pass siteId here
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("unset-env-var", UnsetEnvVarSchema.shape, async (params: z.infer<typeof UnsetEnvVarSchema>) => {
  try {
    let command = `env:unset ${params.key}`;
    if (params.context) command += ` --context ${params.context}`;
    // Site context passed via env var if provided
    // Unset usually applies to all scopes implicitly
    const output = await executeNetlifyCommand(command, params.siteId); // Pass siteId here
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("clone-env-vars", CloneEnvVarsSchema.shape, async (params: z.infer<typeof CloneEnvVarsSchema>) => {
  try {
    const command = `env:clone --to ${params.toSiteId} --from ${params.fromSiteId}`;
    const output = await executeNetlifyCommand(command);
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("create-site", CreateSiteSchema.shape, async (params: z.infer<typeof CreateSiteSchema>) => {
  try {
    // `sites:create` can be interactive. Need flags for non-interactive use.
    // Using the confirmed team slug to make it non-interactive.
    const accountSlug = params.accountSlug || "playhousehosting"; // Use provided or default to confirmed slug
    let command = `sites:create --account-slug ${accountSlug}`; 
    if (params.name) command += ` --name "${params.name}"`;
    // Add --disable-linking or other flags if needed to prevent interactive prompts
    command += ` --disable-linking`; // Assume non-interactive needed
    const output = await executeNetlifyCommand(command);
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

server.tool("delete-site", DeleteSiteSchema.shape, async (params: z.infer<typeof DeleteSiteSchema>) => {
  try {
    let command = `sites:delete ${params.siteId}`;
    if (params.force) command += ` --force`;
    const output = await executeNetlifyCommand(command);
    return { content: [{ type: "text", text: output }] };
  } catch (error: unknown) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
  }
});

// Removed delete-dns-record tool


// --- Register Netlify Resources using server.resource() ---

// List Sites Resource
server.resource(
  "list-sites",
  "netlify://sites",
  async (uri: URL) => {
    try {
      const output = await executeNetlifyCommand("sites:list --json"); // Request JSON output
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: output }] };
    } catch (error: unknown) {
      // Handle errors appropriately for resource loading
      return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: `Error loading sites: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
    }
  }
);

// Removed site-details resource as `sites:get` command is not available in CLI v19.1.5

// Removed list-deploys resource

// Removed deploy-details resource


// List Functions Resource
server.resource(
  "list-functions",
  new ResourceTemplate("netlify://sites/{siteId}/functions", { list: undefined }),
  async (uri: URL, params: Record<string, string | string[]>) => { // Updated params type
    try {
      const siteId = Array.isArray(params.siteId) ? params.siteId[0] : params.siteId;
      const command = `functions:list --json`; // Removed --site flag
      const output = await executeNetlifyCommand(command, siteId); // Pass siteId here
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: output }] };
    } catch (error: unknown) {
      const siteId = Array.isArray(params.siteId) ? params.siteId[0] : params.siteId;
      return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: `Error loading functions for site ${siteId}: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
    }
  }
);

// List Environment Variables Resource
server.resource(
  "list-env-vars",
  new ResourceTemplate("netlify://sites/{siteId}/env", { list: undefined }),
  async (uri: URL, params: Record<string, string | string[]>) => { // Updated params type
    try {
      // Requesting JSON might simplify parsing if available
      const siteId = Array.isArray(params.siteId) ? params.siteId[0] : params.siteId;
      const command = `env:list --json`; // Removed --site flag
      const output = await executeNetlifyCommand(command, siteId); // Pass siteId here
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: output }] };
    } catch (error: unknown) {
      const siteId = Array.isArray(params.siteId) ? params.siteId[0] : params.siteId;
      return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: `Error loading env vars for site ${siteId}: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
    }
  }
);

// Removed list-dns-zones resource

// Removed list-dns-records resource


// --- Run the server ---
async function main() {
  const transport = new StdioServerTransport();
  // Add error handling for server connection
  // server.onerror = (error: Error) => { // Removed as property doesn't exist
  //     console.error("[MCP Server Error]", error);
  // };
  await server.connect(transport);
  console.error("Netlify MCP Server (v1.1.0) running on stdio"); // Updated log message
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
