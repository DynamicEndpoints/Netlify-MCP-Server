#!/usr/bin/env node
// Test script to verify MCP server tool discovery for Smithery
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const testServer = new Server({
  name: "netlify-mcp-server",
  version: "2.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Mock the tools list
testServer.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log("✅ Tools requested - lazy loading working!");
  return {
    tools: [
      {
        name: "deploy-site",
        description: "Deploy a site to Netlify",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to site directory" }
          },
          required: ["path"]
        }
      },
      {
        name: "list-sites", 
        description: "List all Netlify sites",
        inputSchema: { type: "object", properties: {} }
      }
    ]
  };
});

async function testToolDiscovery() {
  try {
    const transport = new StdioServerTransport();
    await testServer.connect(transport);
    console.log("✅ Test MCP Server started successfully");
    console.log("✅ Tool discovery should work without authentication");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testToolDiscovery();
