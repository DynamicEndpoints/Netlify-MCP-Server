# Netlify MCP Server - Smithery Configuration

This document explains how to properly configure the Netlify MCP Server for discovery on Smithery.

## Package.json Configuration

The `package.json` must include:

```json
{
  "name": "@dynamicendpoints/netlify-mcp-server",
  "version": "2.0.0",
  "description": "A Model Context Protocol (MCP) server for Netlify operations, providing comprehensive access to Netlify's features through CLI integration",
  "type": "module",
  "main": "./build/index.js",
  "bin": {
    "netlify-mcp-server": "./build/index.js"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "netlify",
    "deployment",
    "serverless",
    "cli",
    "ai",
    "assistant"
  ]
}
```

## Smithery.yaml Configuration

```yaml
# Smithery configuration file: https://smithery.ai/docs/config#smitheryyaml

startCommand:
  type: stdio
  configSchema:
    # JSON Schema defining the configuration options for the MCP.
    type: object
    required: []
    properties:
      NETLIFY_AUTH_TOKEN:
        type: string
        description: "Netlify Personal Access Token for authentication"
      NETLIFY_SITE_ID:
        type: string
        description: "Default site ID for operations (optional)"
  commandFunction: |
    (config) => ({
      command: 'node',
      args: ['build/index.js'],
      env: {
        ...process.env,
        ...(config.NETLIFY_AUTH_TOKEN && { NETLIFY_AUTH_TOKEN: config.NETLIFY_AUTH_TOKEN }),
        ...(config.NETLIFY_SITE_ID && { NETLIFY_SITE_ID: config.NETLIFY_SITE_ID })
      }
    })
```

## Lazy Loading Implementation

The server implements lazy loading for tool discovery:

1. **Tools are listed without authentication checks** - When Smithery queries for available tools, no Netlify token is required
2. **Authentication is validated only when tools are invoked** - The `NETLIFY_AUTH_TOKEN` check happens in `executeNetlifyCommand()` function

This ensures the server appears in Smithery's registry even before users configure their Netlify credentials.

## Key Features for Smithery

- ✅ 24 Netlify tools available for discovery
- ✅ Proper MCP protocol implementation
- ✅ Lazy loading for unauthenticated tool discovery
- ✅ Clear error messages for missing authentication
- ✅ Comprehensive tool descriptions and schemas

## Testing Tool Discovery

Run the test script to verify tools are discoverable:

```bash
node test-mcp.js
```

This will verify that the MCP server properly responds to `tools/list` requests without requiring authentication.
