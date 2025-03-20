# Netlify MCP Server

[![smithery badge](https://smithery.ai/badge/@DynamicEndpoints/Netlify-MCP-Server)](https://smithery.ai/server/@DynamicEndpoints/Netlify-MCP-Server)

A Model Context Protocol server that provides comprehensive tools for working with Netlify through their CLI. This server enables deploying sites, managing deployments, handling environment variables, DNS settings, serverless functions, forms, plugins, and webhooks.

<a href="https://glama.ai/mcp/servers/rmzusviqom">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/rmzusviqom/badge" alt="Netlify Server MCP server" />
</a>

## Features

- Deploy and manage sites
- Configure DNS settings
- Deploy serverless functions
- Manage form submissions
- Handle environment variables
- Install and configure plugins
- Set up webhook notifications
- Comprehensive error handling
- Type-safe parameter validation

## Installation

### Installing via Smithery

To install Netlify MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@DynamicEndpoints/Netlify-MCP-Server):

```bash
npx -y @smithery/cli install @DynamicEndpoints/Netlify-MCP-Server --client claude
```

### Manual Installation

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Install Netlify CLI globally:
```bash
npm install -g netlify-cli
```

4. Authenticate with Netlify:
```bash
netlify login
```
This will open a browser window for authentication. After authenticating, the CLI will store your token locally.

## Configuration

Add to your MCP settings file (location varies by platform):

```json
{
  "mcpServers": {
    "netlify": {
      "command": "node",
      "args": ["path/to/netlify-server/build/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Settings file locations:
- Windows: `%APPDATA%/Windsurf/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/claude/settings.json`

## Available Tools

### Site Management

#### deploy-site
Deploy a site to Netlify
```typescript
{
  "path": "path/to/site",        // Required: Path to the site directory
  "prod": false,                 // Optional: Deploy to production
  "message": "New deployment"    // Optional: Deploy message
}
```

#### list-sites
List all Netlify sites
```typescript
// No parameters required
```

#### get-deploy-status
Get deployment status for a site
```typescript
{
  "siteId": "your-site-id",     // Required: Site ID or name
  "deployId": "deploy-id"       // Optional: Specific deployment ID
}
```

### DNS Management

#### add-dns-record
Add a DNS record to a site
```typescript
{
  "siteId": "your-site-id",     // Required: Site ID or name
  "domain": "example.com",      // Required: Domain name
  "type": "A",                  // Required: Record type (A, AAAA, CNAME, MX, TXT, NS)
  "value": "192.0.2.1",        // Required: Record value
  "ttl": 3600                  // Optional: Time to live in seconds
}
```

### Serverless Functions

#### deploy-function
Deploy a serverless function
```typescript
{
  "path": "path/to/function",   // Required: Path to the function file
  "name": "my-function",        // Required: Function name
  "runtime": "nodejs"           // Optional: Function runtime
}
```

### Form Management

#### manage-form
Manage form submissions
```typescript
{
  "siteId": "your-site-id",     // Required: Site ID or name
  "formId": "form-id",          // Required: Form ID
  "action": "enable"            // Required: Action (enable, disable, delete)
}
```

### Plugin Management

#### manage-plugin
Manage site plugins
```typescript
{
  "siteId": "your-site-id",     // Required: Site ID or name
  "pluginId": "plugin-id",      // Required: Plugin ID
  "action": "install",          // Required: Action (install, uninstall, update)
  "config": {                   // Optional: Plugin configuration
    "setting": "value"
  }
}
```

### Environment Variables

#### set-env-vars
Set environment variables for a site
```typescript
{
  "siteId": "your-site-id",     // Required: Site ID or name
  "envVars": {                  // Required: Environment variables
    "API_KEY": "your-api-key",
    "DEBUG": "false"
  }
}
```

### Webhook Management

#### manage-hook
Manage webhook notifications
```typescript
{
  "siteId": "your-site-id",     // Required: Site ID or name
  "event": "deploy-succeeded",  // Required: Event type
  "url": "https://example.com", // Required: Webhook URL
  "action": "create"            // Required: Action (create, delete, update)
}
```

## Error Handling

The server provides detailed error messages for:
- Authentication failures
- Invalid site IDs
- Deployment failures
- Network connectivity issues
- Invalid parameter types
- DNS configuration errors
- Function deployment issues
- Plugin installation problems
- Webhook configuration errors

## Development

To modify the server:

1. Update source code in `src/index.ts`
2. Build with `npm run build`
3. Test your changes by deploying a test site

## Type Safety

The server uses Zod for runtime type validation of all parameters, ensuring:
- Required parameters are provided
- Parameters have correct types
- Optional parameters are properly handled
- Enum values are validated
- Complex object structures are verified

## Resources

- [Netlify CLI Documentation](https://cli.netlify.com/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Zod Documentation](https://github.com/colinhacks/zod)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Netlify Forms Documentation](https://docs.netlify.com/forms/setup/)
- [Netlify DNS Documentation](https://docs.netlify.com/domains-https/netlify-dns/)