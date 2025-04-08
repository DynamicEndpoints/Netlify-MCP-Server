import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

// Base URL for Netlify API
const NETLIFY_API_BASE_URL = "https://api.netlify.com/api/v1";

// Helper function to make authenticated API calls to Netlify
async function callNetlifyApi(endpoint, method = "GET", token, body = null) {
  const url = `${NETLIFY_API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
  
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Netlify API error (${response.status}): ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error calling Netlify API:", error);
    throw error;
  }
}

// Import tools
import { listSitesTool, getSiteTool, createSiteTool, updateSiteTool, deleteSiteTool } from "./src/tools/sites.js";
import { listDeploysTool, createBuildHookTool } from "./src/tools/deploys.js";
import { listFormSubmissionsTool } from "./src/tools/forms.js";
import { listEnvVarsTool, getEnvVarTool, createEnvVarsTool, setEnvVarValueTool, deleteEnvVarValueTool } from "./src/tools/env.js";
import { createDnsZoneTool, listDnsRecordsTool } from "./src/tools/dns.js";
import { listBuildsTool, startBuildTool, getSiteDeployTool, lockDeployTool } from "./src/tools/builds.js";
import { listAccountsTool, listAccountMembersTool } from "./src/tools/accounts.js";
import { provisionSslCertificateTool } from "./src/tools/ssl.js";
import { listSnippetsTool } from "./src/tools/snippets.js";
import { listSiteAssetsTool, getSiteAssetTool, updateSiteAssetTool, deleteSiteAssetTool } from "./src/tools/assets.js";
import { listHookTypesTool } from "./src/tools/hooks.js";
import { listDevServersTool, createDevServerTool, listDevServerHooksTool, createDevServerHookTool } from "./src/tools/dev.js";

// Import resources
import { siteResource, sitesResource } from "./src/resources/sites.js";

// Import prompts
import { createSitePrompt } from "./src/prompts/sites.js";

// Create an MCP server for Netlify
const server = new McpServer({
  name: "Netlify API",
  version: "1.0.0"
});

// Register site tools
server.tool(listSitesTool.name, listSitesTool.schema, listSitesTool.handler);
server.tool(getSiteTool.name, getSiteTool.schema, getSiteTool.handler);
server.tool(createSiteTool.name, createSiteTool.schema, createSiteTool.handler);
server.tool(updateSiteTool.name, updateSiteTool.schema, updateSiteTool.handler);
server.tool(deleteSiteTool.name, deleteSiteTool.schema, deleteSiteTool.handler);

// Register deploy and build tools
server.tool(listDeploysTool.name, listDeploysTool.schema, listDeploysTool.handler);
server.tool(createBuildHookTool.name, createBuildHookTool.schema, createBuildHookTool.handler);
server.tool(listBuildsTool.name, listBuildsTool.schema, listBuildsTool.handler);
server.tool(startBuildTool.name, startBuildTool.schema, startBuildTool.handler);
server.tool(getSiteDeployTool.name, getSiteDeployTool.schema, getSiteDeployTool.handler);
server.tool(lockDeployTool.name, lockDeployTool.schema, lockDeployTool.handler);

// Register form tools
server.tool(listFormSubmissionsTool.name, listFormSubmissionsTool.schema, listFormSubmissionsTool.handler);

// Register environment variable tools
server.tool(listEnvVarsTool.name, listEnvVarsTool.schema, listEnvVarsTool.handler);
server.tool(getEnvVarTool.name, getEnvVarTool.schema, getEnvVarTool.handler);
server.tool(createEnvVarsTool.name, createEnvVarsTool.schema, createEnvVarsTool.handler);
server.tool(setEnvVarValueTool.name, setEnvVarValueTool.schema, setEnvVarValueTool.handler);
server.tool(deleteEnvVarValueTool.name, deleteEnvVarValueTool.schema, deleteEnvVarValueTool.handler);

// Register DNS tools
server.tool(createDnsZoneTool.name, createDnsZoneTool.schema, createDnsZoneTool.handler);
server.tool(listDnsRecordsTool.name, listDnsRecordsTool.schema, listDnsRecordsTool.handler);

// Register account tools
server.tool(listAccountsTool.name, listAccountsTool.schema, listAccountsTool.handler);
server.tool(listAccountMembersTool.name, listAccountMembersTool.schema, listAccountMembersTool.handler);

// Register SSL tools
server.tool(provisionSslCertificateTool.name, provisionSslCertificateTool.schema, provisionSslCertificateTool.handler);

// Register snippet tools
server.tool(listSnippetsTool.name, listSnippetsTool.schema, listSnippetsTool.handler);

// Register asset tools
server.tool(listSiteAssetsTool.name, listSiteAssetsTool.schema, listSiteAssetsTool.handler);
server.tool(getSiteAssetTool.name, getSiteAssetTool.schema, getSiteAssetTool.handler);
server.tool(updateSiteAssetTool.name, updateSiteAssetTool.schema, updateSiteAssetTool.handler);
server.tool(deleteSiteAssetTool.name, deleteSiteAssetTool.schema, deleteSiteAssetTool.handler);

// Register hook tools
server.tool(listHookTypesTool.name, listHookTypesTool.schema, listHookTypesTool.handler);

// Register dev server tools
server.tool(listDevServersTool.name, listDevServersTool.schema, listDevServersTool.handler);
server.tool(createDevServerTool.name, createDevServerTool.schema, createDevServerTool.handler);
server.tool(listDevServerHooksTool.name, listDevServerHooksTool.schema, listDevServerHooksTool.handler);
server.tool(createDevServerHookTool.name, createDevServerHookTool.schema, createDevServerHookTool.handler);

// Register resources
server.resource(siteResource.name, siteResource.template, siteResource.handler);
server.resource(sitesResource.name, sitesResource.template, sitesResource.handler);

// Register prompts
server.prompt(createSitePrompt.name, createSitePrompt.schema, createSitePrompt.handler);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

console.log("Netlify MCP Server started");
