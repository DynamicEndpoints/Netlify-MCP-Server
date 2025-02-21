# AI Agent Installation Guide

This guide is specifically designed for AI agents like Cline to help with installing and configuring the Netlify MCP server.

## Repository Structure

```
netlify-server/
├── src/
│   └── index.ts          # Main server implementation
├── package.json          # Node.js dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── README.md            # General documentation
└── LLMS-INSTALL.md      # This installation guide
```

## Installation Steps

1. **Project Setup**
   ```bash
   # Create project directory
   mkdir netlify-server
   cd netlify-server

   # Initialize Node.js project
   npm init -y

   # Install dependencies
   npm install @modelcontextprotocol/sdk netlify-cli typescript @types/node zod
   ```

2. **TypeScript Configuration**
   - Ensure tsconfig.json is configured for ES modules
   - Set target to ES2022
   - Enable strict type checking
   - Configure proper module resolution

3. **Netlify Authentication**
   When helping users set up Netlify:
   1. Direct them to install Netlify CLI globally: `npm install -g netlify-cli`
   2. Guide them to run: `netlify login`
   3. This will open a browser window for authentication
   4. After authentication, the CLI will store the token locally

## MCP Configuration

### Settings File Location
- Windows: `%APPDATA%/Windsurf/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/claude/settings.json`

### Configuration Template
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

## Tool Implementation Details

### Site Management Tools

#### deploy-site
```typescript
const DeploySiteSchema = z.object({
  path: z.string(),
  prod: z.boolean().optional(),
  message: z.string().optional(),
});

// Example usage
const result = await mcpClient.useTool('netlify', 'deploy-site', {
  path: './build',
  prod: false,
  message: 'Test deployment'
});
```

#### get-deploy-status
```typescript
const GetDeployStatusSchema = z.object({
  siteId: z.string(),
  deployId: z.string().optional(),
});

// Example usage
const result = await mcpClient.useTool('netlify', 'get-deploy-status', {
  siteId: 'site-123',
  deployId: 'deploy-456'
});
```

### DNS Management Tools

#### add-dns-record
```typescript
const AddDNSRecordSchema = z.object({
  siteId: z.string(),
  domain: z.string(),
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]),
  value: z.string(),
  ttl: z.number().optional(),
});

// Example usage
const result = await mcpClient.useTool('netlify', 'add-dns-record', {
  siteId: 'site-123',
  domain: 'example.com',
  type: 'A',
  value: '192.0.2.1',
  ttl: 3600
});
```

### Function Management Tools

#### deploy-function
```typescript
const DeployFunctionSchema = z.object({
  path: z.string(),
  name: z.string(),
  runtime: z.string().optional(),
});

// Example usage
const result = await mcpClient.useTool('netlify', 'deploy-function', {
  path: './functions/hello-world',
  name: 'hello-world',
  runtime: 'nodejs'
});
```

### Form Management Tools

#### manage-form
```typescript
const ManageFormSchema = z.object({
  siteId: z.string(),
  formId: z.string(),
  action: z.enum(["enable", "disable", "delete"]),
});

// Example usage
const result = await mcpClient.useTool('netlify', 'manage-form', {
  siteId: 'site-123',
  formId: 'form-456',
  action: 'enable'
});
```

### Plugin Management Tools

#### manage-plugin
```typescript
const ManagePluginSchema = z.object({
  siteId: z.string(),
  pluginId: z.string(),
  action: z.enum(["install", "uninstall", "update"]),
  config: z.record(z.unknown()).optional(),
});

// Example usage
const result = await mcpClient.useTool('netlify', 'manage-plugin', {
  siteId: 'site-123',
  pluginId: 'netlify-plugin-gatsby',
  action: 'install',
  config: { setting: 'value' }
});
```

### Environment Variable Tools

#### set-env-vars
```typescript
const SetEnvVarsSchema = z.object({
  siteId: z.string(),
  envVars: z.record(z.string()),
});

// Example usage
const result = await mcpClient.useTool('netlify', 'set-env-vars', {
  siteId: 'site-123',
  envVars: {
    API_KEY: 'secret-key',
    DEBUG: 'false'
  }
});
```

### Webhook Management Tools

#### manage-hook
```typescript
const ManageHookSchema = z.object({
  siteId: z.string(),
  event: z.string(),
  url: z.string(),
  action: z.enum(["create", "delete", "update"]),
});

// Example usage
const result = await mcpClient.useTool('netlify', 'manage-hook', {
  siteId: 'site-123',
  event: 'deploy-succeeded',
  url: 'https://example.com/webhook',
  action: 'create'
});
```

## Validation Steps

When implementing the server:
1. Verify TypeScript compilation succeeds
2. Check Netlify CLI authentication works
3. Ensure error handling is comprehensive
4. Validate input parameters thoroughly
5. Test each tool with example data
6. Verify Zod schema validations

## Common Issues and Solutions

### Authentication
- Ensure user is logged in with `netlify login`
- Verify token is properly stored
- Check for expired tokens

### Deployment
- Verify site directory exists
- Check build output directory is correct
- Validate site ID for existing sites

### Error Handling
- Handle CLI command failures
- Provide clear error messages
- Handle network issues gracefully
- Validate all input parameters
- Handle Zod validation errors

## Testing Instructions

For validating the installation:

1. **Basic Connectivity**
```typescript
const result = await mcpClient.useTool('netlify', 'list-sites', {});
```

2. **Full Deployment Flow**
```typescript
// Deploy site
const deployResult = await mcpClient.useTool('netlify', 'deploy-site', {
  path: './build',
  prod: false,
  message: 'Test deployment'
});

// Check status
const statusResult = await mcpClient.useTool('netlify', 'get-deploy-status', {
  siteId: deployResult.siteId
});
```

## Version Compatibility

- Node.js: 16.x or later
- TypeScript: 5.0 or later
- MCP SDK: latest version
- Netlify CLI: latest version
- Zod: latest version

## Additional Resources

- [Netlify CLI Documentation](https://cli.netlify.com/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Zod Documentation](https://github.com/colinhacks/zod)
- [Netlify API Documentation](https://docs.netlify.com/api/get-started/)
