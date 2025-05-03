[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/dynamicendpoints-netlify-mcp-server-badge.png)](https://mseep.ai/app/dynamicendpoints-netlify-mcp-server)

# Netlify MCP Server

[![smithery badge](https://smithery.ai/badge/@DynamicEndpoints/Netlify-MCP-Server)](https://smithery.ai/server/@DynamicEndpoints/Netlify-MCP-Server)

A Model Context Protocol (MCP) server that provides tools and resources for interacting with Netlify through their CLI. This server enables deploying sites, managing environment variables, builds, and more, compatible with Netlify CLI v19.1.5.

<a href="https://glama.ai/mcp/servers/rmzusviqom">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/rmzusviqom/badge" alt="Netlify Server MCP server" />
</a>

## Recent Changes (April 8, 2025)

*   **Compatibility Update:** Verified tool compatibility with Netlify CLI v19.1.5.
*   **Removed Unsupported Tools/Resources:** Removed functionality related to unavailable CLI command groups: `dns`, `forms`, `plugins`, `hooks`, `deploys`. Specific commands like `functions:delete`, `functions:invoke`, and `sites:get` were also removed as they were either unavailable or incompatible with non-interactive use via the MCP server.
*   **Site Context Workaround:** Updated tools requiring site context (like `env:*`, `logs:function`, `build`, `trigger-build`) to pass the `siteId` via the `NETLIFY_SITE_ID` environment variable, as the `--site` flag is not supported for these commands in this CLI version.

## Features (Compatible with Netlify CLI v19.1.5)

*   Deploy and manage sites (`deploy-site`, `build-site`, `trigger-build`, `link-site`, `unlink-site`, `get-status`, `create-site`, `delete-site`)
*   Manage environment variables (`set-env-vars`, `get-env-var`, `unset-env-var`, `import-env`, `clone-env-vars`)
*   Get function logs (`get-logs`)
*   Access site data via Resources (`list-sites`, `list-functions`, `list-env-vars`)
*   Comprehensive error handling
*   Type-safe parameter validation using Zod

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
4.  Ensure Netlify CLI is installed (v19.1.5 or compatible):
    ```bash
    # Example global install:
    npm install -g netlify-cli@19.1.5
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

## Available Tools (Netlify CLI v19.1.5 Compatible)

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
*Example:*
```json
{
  "path": "./dist",
  "prod": true,
  "message": "Deploying latest changes"
}
```

#### list-sites
List all Netlify sites linked to your account.
```json
{} // No parameters
```
*Example:*
```json
{}
```

#### trigger-build
Trigger a new build/deploy for a site. Site context is passed via `NETLIFY_SITE_ID` env var.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "message": "string?"    // Optional: Deploy message
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "message": "Triggering rebuild"
}
```

#### build-site
Run a Netlify build locally (mimics Netlify build environment). Site context is passed via `NETLIFY_SITE_ID` env var if `siteId` is provided.
```json
{
  "siteId": "string?",    // Optional: Site ID (if project dir not linked)
  "context": "string?",   // Optional: Build context (e.g., 'production', 'deploy-preview')
  "dry": "boolean?"       // Optional: Run a dry build (list steps without executing)
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "context": "production"
}
```

#### link-site
Link the current project directory to a Netlify site (requires Site ID for non-interactive use).
```json
{
  "siteId": "string"     // Required: Site ID to link to.
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here"
}
```

#### unlink-site
Unlink the current project directory from the associated Netlify site.
```json
{} // No parameters
```
*Example:*
```json
{}
```

#### get-status
Show the Netlify status for the linked site/directory. (Will likely fail if run via MCP server unless the server directory itself is linked).
```json
{} // No parameters
```
*Example:*
```json
{}
```

#### create-site
Create a new site on Netlify (non-interactively).
```json
{
  "name": "string?",        // Optional: Site name (subdomain)
  "accountSlug": "string?"  // Optional: Account slug for the team (defaults to 'playhousehosting' if omitted)
}
```
*Example:*
```json
{
  "name": "my-awesome-new-site"
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
*Example:*
```json
{
  "siteId": "site-id-to-delete",
  "force": true
}
```

### Environment Variable Management

#### set-env-vars
Set one or more environment variables for a site. Site context is passed via `NETLIFY_SITE_ID` env var.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "envVars": {            // Required: Object of key-value pairs
    "KEY": "value"
  }
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "envVars": {
    "API_KEY": "secret123",
    "NODE_ENV": "production"
  }
}
```

#### get-env-var
Get the value of a specific environment variable. Site context is passed via `NETLIFY_SITE_ID` env var if `siteId` is provided.
```json
{
  "siteId": "string?",    // Optional: Site ID (if not linked)
  "key": "string",        // Required: The environment variable key
  "context": "string?",   // Optional: Specific context (e.g., 'production')
  "scope": "string?"      // Optional: Specific scope (e.g., 'builds', 'functions')
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "key": "API_KEY"
}
```

#### unset-env-var
Unset (delete) an environment variable. Site context is passed via `NETLIFY_SITE_ID` env var if `siteId` is provided.
```json
{
  "siteId": "string?",    // Optional: Site ID (if not linked)
  "key": "string",        // Required: The environment variable key
  "context": "string?"    // Optional: Specific context to unset from (otherwise all)
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "key": "OLD_VAR"
}
```

#### import-env
Import environment variables from a `.env` file. Site context is passed via `NETLIFY_SITE_ID` env var.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "filePath": "string",   // Required: Path to the .env file
  "replace": "boolean?"   // Optional: Replace existing variables instead of merging
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "filePath": ".env.production",
  "replace": true
}
```

#### clone-env-vars
Clone environment variables from one site to another. Requires source site to be linked or specified via `NETLIFY_SITE_ID`.
```json
{
  "fromSiteId": "string", // Required: Source Site ID
  "toSiteId": "string"    // Required: Destination Site ID
}
```
*Example:*
```json
{
  "fromSiteId": "source-site-id",
  "toSiteId": "destination-site-id"
}
```

### Serverless Functions

#### get-logs
View function logs. Site context is passed via `NETLIFY_SITE_ID` env var.
```json
{
  "siteId": "string",     // Required: Site ID or name
  "function": "string?"   // Optional: Specific function name to filter logs
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "function": "my-serverless-func"
}
```

## Available Resources (Netlify CLI v19.1.5 Compatible)

Access Netlify data directly using these resource URIs:

*   `netlify://sites`: List all sites (JSON output of `sites:list --json`)
*   `netlify://sites/{siteId}/functions`: List functions for a site (JSON output of `functions:list --json`, requires `NETLIFY_SITE_ID={siteId}` env var)
*   `netlify://sites/{siteId}/env`: List environment variables for a site (JSON output of `env:list --json`, requires `NETLIFY_SITE_ID={siteId}` env var)

## Limitations (Netlify CLI v19.1.5)

-   **Interactive Commands:** Commands requiring interactive prompts (like `netlify login`, `netlify init`, `netlify dev`) are not supported by this server. Use a Personal Access Token for authentication.
-   **Site Context:** Many commands (`env:*`, `logs:function`, `build`, `trigger-build`, `functions:list`) require site context. This server passes the required `siteId` via the `NETLIFY_SITE_ID` environment variable when executing these commands. Commands like `status` and `unlink` operate on the *current working directory* of the server, which is typically not linked, and thus may not function as expected when called via the MCP server.
-   **Unsupported Commands:** Functionality related to DNS, Forms, Plugins, Hooks, and Deploys (listing specific deploys, getting deploy status) has been removed due to incompatibility with CLI v19.1.5.

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
