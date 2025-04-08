# Netlify MCP Server

[![smithery badge](https://smithery.ai/badge/@DynamicEndpoints/Netlify-MCP-Server)](https://smithery.ai/server/@DynamicEndpoints/Netlify-MCP-Server)

A Model Context Protocol (MCP) server that provides comprehensive tools and resources for interacting with Netlify through their CLI. This server enables deploying sites, managing deployments, handling environment variables, DNS settings, serverless functions, forms, plugins, webhooks, builds, and more.

<a href="https://glama.ai/mcp/servers/rmzusviqom">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/rmzusviqom/badge" alt="Netlify Server MCP server" />
</a>

## Features

- Deploy and manage sites (deploy, build, trigger build, link, unlink, status, create, delete)
- Manage environment variables (set, get, unset, import, clone)
- Configure DNS settings (add record, delete record)
- Manage serverless functions (invoke, delete, get logs)
- Manage forms (list, submissions, delete)
- Manage webhooks (create, list, show, update, delete)
- List plugins
- Access site data via Resources (sites, deploys, functions, env vars, DNS zones/records)
- Comprehensive error handling
- Type-safe parameter validation using Zod

## Installation

### Installing via Smithery

To install Netlify MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@DynamicEndpoints/Netlify-MCP-Server):

```bash
npx -y @smithery/cli install @DynamicEndpoints/Netlify-MCP-Server --client claude
```

### Manual Installation

1.  Clone the repository (if not already done).
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the server:
    ```bash
    npm run build
    ```
4.  Ensure Netlify CLI is installed (globally or locally):
    ```bash
    # Example global install:
    npm install -g netlify-cli
    ```

## Authentication

This MCP server interacts with the Netlify CLI, which requires authentication with your Netlify account. Since the server runs non-interactively, **you must use a Personal Access Token (PAT)**.

1.  **Generate a PAT:**
    *   Go to your Netlify User Settings > Applications > Personal access tokens ([Direct Link](https://app.netlify.com/user/applications#personal-access-tokens)).
    *   Select **New access token**.
    *   Give it a description (e.g., "MCP Server Token").
    *   Set an expiration date.
    *   Select **Generate token**.
    *   **Copy the token immediately** and store it securely.
2.  **Configure the Token:** You need to make this token available to the MCP server as the `NETLIFY_AUTH_TOKEN` environment variable. Add it to the `env` section of the server's configuration in your MCP settings file (see below).

**Note:** Using `netlify login` is **not** suitable for this server as it requires interactive browser authentication.

## Configuration

Add the following configuration to your MCP settings file (location varies by platform), replacing `"YOUR_NETLIFY_PAT_HERE"` with your actual Personal Access Token:

```json
{
  "mcpServers": {
    "netlify": {
      "command": "node",
      "args": ["/path/to/Netlify-MCP-Server/build/index.js"], // Adjust path if needed
      "env": {
        "NETLIFY_AUTH_TOKEN": "YOUR_NETLIFY_PAT_HERE"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

*Replace `/path/to/Netlify-MCP-Server` with the actual path where you cloned/installed the server.*

**Settings file locations:**
- Claude Desktop (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
- Cline Dev Extension (VS Code): `/home/user/.codeoss-cloudworkstations/data/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` (or similar based on OS/setup)
- *Consult your specific MCP client documentation for other potential locations.*

## Available Tools

*(Parameters are based on the Zod schemas defined in `src/index.ts`)*

### Site & Deployment Management

#### deploy-site
Deploy a site directory to Netlify.
```json
{
  "path": "string",        // Required: Path to the site directory
  "prod": "boolean?",      // Optional: Deploy to production
  "message": "string?"     // Optional: Deploy message
}
```

#### list-sites
List all Netlify sites linked to your account.
```json
{} // No parameters
```

#### get-deploy-status
Get deployment status list for a site. Can optionally filter by deploy ID (basic grep).
```json
{
  "siteId": "string",     // Required: Site ID or name
  "deployId": "string?"   // Optional: Specific deployment ID to filter for
}
```

#### trigger-build
Trigger a new build/deploy for a site.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "message": "string?"    // Optional: Deploy message
}
```

#### build-site
Run a Netlify build locally (mimics Netlify build environment).
```json
{
  "siteId": "string?",    // Optional: Site ID (if project dir not linked)
  "context": "string?",   // Optional: Build context (e.g., 'production', 'deploy-preview')
  "dry": "boolean?"       // Optional: Run a dry build (list steps without executing)
}
```

#### link-site
Link the current project directory to a Netlify site (requires Site ID for non-interactive use).
```json
{
  "siteId": "string?"     // Optional: Site ID to link to. **Required** for this tool as interactive linking is not supported.
}
```

#### unlink-site
Unlink the current project directory from the associated Netlify site.
```json
{} // No parameters
```

#### get-status
Show the Netlify status for the linked site/directory.
```json
{} // No parameters
```

#### create-site
Create a new site on Netlify (non-interactively).
```json
{
  "name": "string?",        // Optional: Site name (subdomain)
  "accountSlug": "string?"  // Optional: Account slug for the team
}
```

#### delete-site
Delete a site from Netlify.
```json
{
  "siteId": "string",     // Required: Site ID to delete
  "force": "boolean?"     // Optional: Force deletion without confirmation (default: true)
}
```

### Environment Variable Management

#### set-env-vars
Set one or more environment variables for a site.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "envVars": {            // Required: Object of key-value pairs
    "KEY": "value"
  }
}
```

#### get-env-var
Get the value of a specific environment variable.
```json
{
  "siteId": "string?",    // Optional: Site ID (if not linked)
  "key": "string",        // Required: The environment variable key
  "context": "string?",   // Optional: Specific context (e.g., 'production')
  "scope": "string?"      // Optional: Specific scope (e.g., 'builds', 'functions')
}
```

#### unset-env-var
Unset (delete) an environment variable.
```json
{
  "siteId": "string?",    // Optional: Site ID (if not linked)
  "key": "string",        // Required: The environment variable key
  "context": "string?"    // Optional: Specific context to unset from (otherwise all)
}
```

#### import-env
Import environment variables from a `.env` file.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "filePath": "string",   // Required: Path to the .env file
  "replace": "boolean?"   // Optional: Replace existing variables instead of merging
}
```

#### clone-env-vars
Clone environment variables from one site to another.
```json
{
  "fromSiteId": "string", // Required: Source Site ID
  "toSiteId": "string"    // Required: Destination Site ID
}
```

### DNS Management

#### add-dns-record
Add a DNS record to a specific DNS Zone.
```json
{
  "zoneId": "string",         // Required: DNS Zone ID (from `netlify dns:list`)
  "type": "string",         // Required: Record type (A, AAAA, CNAME, MX, TXT, NS)
  "name": "string",         // Required: Record name (e.g., 'www', '@')
  "value": "string",        // Required: Record value
  "ttl": "number?"          // Optional: Time to live in seconds
}
```

#### delete-dns-record
Delete a specific DNS record from a zone.
```json
{
  "zoneId": "string",         // Required: DNS Zone ID
  "recordId": "string",       // Required: DNS Record ID
  "force": "boolean?"         // Optional: Force deletion without confirmation (default: true)
}
```

### Serverless Functions

#### get-logs
View function logs (requires site context).
```json
{
  "siteId": "string",     // Required: Site ID or name
  "function": "string?"   // Optional: Specific function name to filter logs
}
```

#### invoke-function
Invoke a deployed serverless function.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "name": "string",       // Required: Function name to invoke
  "payload": "string?"    // Optional: JSON payload string or path to JSON file
}
```

#### delete-function
Delete a deployed serverless function.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "name": "string"        // Required: Function name to delete
}
```

### Form Management

#### manage-form
Manage Netlify forms (list, get submissions, delete).
```json
{
  "siteId": "string",     // Required: Site ID or name
  "formId": "string",     // Required: Form ID or name
  "action": "string"      // Required: Action ('list', 'submissions', 'delete')
}
```

### Plugin Management

#### manage-plugin
List installed plugins for a site. (Add/delete typically requires `netlify.toml` changes).
```json
{
  "siteId": "string",     // Required: Site ID or name
  "pluginId": "string",   // Required: Plugin package name (used for filtering, but action is list only)
  "action": "list"        // Required: Must be 'list' for this tool
}
```

### Webhook Management

#### manage-hook
Manage webhook notifications (create, list, show, update, delete).
```json
{
  "siteId": "string",     // Required: Site ID or name
  "hookId": "string?",    // Optional: Hook ID (required for show/update/delete)
  "action": "string",     // Required: Action ('create', 'list', 'show', 'update', 'delete')
  "type": "string?",      // Optional: Hook type (required for create)
  "event": "string?"      // Optional: Event type (required for create)
}
```

## Available Resources

Access Netlify data directly using these resource URIs:

*   `netlify://sites`: List all sites (JSON output of `sites:list --json`)
*   `netlify://sites/{siteId}`: Get details for a specific site (JSON output of `sites:get --id {siteId} --json` - *Note: `sites:get` command might be hypothetical*)
*   `netlify://sites/{siteId}/deploys`: List deploys for a site (JSON output of `deploys:list --site {siteId} --json`)
*   `netlify://sites/{siteId}/deploys/{deployId}`: Get details for a specific deploy (JSON output of `deploys:get {deployId} --json` - *Note: `deploys:get` command might be hypothetical*)
*   `netlify://sites/{siteId}/functions`: List functions for a site (JSON output of `functions:list --site {siteId} --json`)
*   `netlify://sites/{siteId}/env`: List environment variables for a site (JSON output of `env:list --site {siteId} --json`)
*   `netlify://dns_zones`: List all DNS zones (JSON output of `dns:list --json`)
*   `netlify://dns_zones/{zoneId}/records`: List DNS records for a specific zone (JSON output of `dns:records:list {zoneId} --json`)

## Limitations

-   **Interactive Commands:** Commands requiring interactive prompts (like `netlify login`, `netlify init`, `netlify dev`) are not supported by this server. Use a Personal Access Token for authentication.
-   **Plugin Management:** Adding/deleting plugins often involves modifying `netlify.toml` and `package.json`, which is beyond the scope of the simple `manage-plugin` tool (which currently only lists plugins).
-   **Hypothetical Commands:** Some resource implementations rely on hypothetical CLI commands (like `sites:get`, `deploys:get`) returning JSON. If these commands don't exist or don't support `--json`, the corresponding resources might return errors or raw text.

## Development

To modify the server:

1.  Update source code in `src/index.ts`.
2.  Build with `npm run build`.
3.  Restart the MCP server in your client application to load changes.
4.  Test your changes.

## Resources

-   [Netlify CLI Documentation](https://cli.netlify.com/)
-   [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
-   [Zod Documentation](https://github.com/colinhacks/zod)
