# Netlify MCP Server v2.0.0

[![smithery badge](https://smithery.ai/badge/@DynamicEndpoints/Netlify-MCP-Server)](https://smithery.ai/server/@DynamicEndpoints/Netlify-MCP-Server)

A Model Context Protocol (MCP) server for Netlify, providing comprehensive access to ALL Netlify CLI features through the latest MCP SDK v1.12.3 and Netlify CLI v22.1.3. Now with 43 tools covering Blobs, Dev Server, Recipes, Analytics, Forms, and advanced API operations.

<a href="https://glama.ai/mcp/servers/rmzusviqom">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/rmzusviqom/badge" alt="Netlify Server MCP server" />
</a>

## 🚀 Latest Updates (v2.0.0 - June 2025)

- **Updated to MCP SDK v1.12.3** - Latest SDK with improved performance and new capabilities
- **Netlify CLI v22.1.3** - Latest Netlify CLI with new features and bug fixes
- **43 Comprehensive Tools** - Complete coverage of Netlify CLI including Blobs, Dev Server, Recipes
- **Netlify Blobs Support** - Full blob storage management (get, set, delete, list)
- **Dev Server Integration** - Local development server tools for testing
- **Recipe System** - Access to Netlify's automation recipes
- **Advanced API Access** - Direct Netlify API calls and method discovery
- **Enhanced Analytics** - Site analytics and performance monitoring
- **Form Management** - Complete form and submission handling
- **Real-time Monitoring** - Live log streaming and deployment watching
- **Account Management** - Multi-account switching and management
- **Improved Resource System** - Better resource handling with JSON output
- **Smart Prompts** - Pre-built prompts for common Netlify workflows
- **Better Error Handling** - More robust error reporting and recovery
- **Modern TypeScript Configuration** - Updated to latest TypeScript best practices

## ✨ Enhanced Features (NEW!)

### 🎯 AI-Optimized Workflow Prompts
28 comprehensive workflow templates designed specifically for AI coding agents:
- **`netlify-deploy`** - Complete deployment with validation and monitoring
- **`netlify-setup`** - Full site setup from creation to production
- **`netlify-environment-setup`** - Environment configuration across contexts
- **`netlify-troubleshoot`** - Comprehensive issue diagnosis and resolution
- **`netlify-function-deploy`** - Function deployment with best practices
- **`netlify-migration`** - Site migration with optimization
- **`netlify-optimization`** - Performance, security, and SEO optimization
- **`netlify-security-audit`** - Complete security audit and hardening
- **`netlify-performance-audit`** - Comprehensive performance analysis and optimization
- **`netlify-edge-functions-setup`** - Edge functions deployment and configuration
- **`netlify-blobs-management`** - Comprehensive blob storage management workflow
- **`netlify-forms-setup`** - Form handling and submission management setup
- **`netlify-analytics-dashboard`** - Analytics dashboard setup and monitoring
- **`netlify-domain-setup`** - Custom domain configuration and DNS management
- **`netlify-redirects-config`** - URL redirects and rewrite rules configuration
- **`netlify-build-optimization`** - Build process optimization and caching
- **`netlify-monitoring-setup`** - Comprehensive monitoring and alerting setup
- **`netlify-backup-strategy`** - Site backup and disaster recovery planning
- **`netlify-team-collaboration`** - Team workflow and collaboration setup
- **`netlify-api-integration`** - API integration and webhook configuration
- **`netlify-staging-workflow`** - Staging environment and preview deployment workflow
- **`netlify-seo-optimization`** - SEO optimization and search engine visibility
- **`netlify-cdn-optimization`** - CDN and edge network optimization
- **`netlify-compliance-audit`** - Compliance and accessibility audit
- **`netlify-cost-optimization`** - Cost analysis and optimization recommendations
- **`netlify-disaster-recovery`** - Disaster recovery testing and procedures
- **`netlify-advanced-deployment`** - Advanced deployment strategies and blue-green deployments

### 📊 Comprehensive Resources with Real-time Subscriptions
32 enhanced data sources with live updates:
- **Site Resources**: Overview, functions, environment variables, deploys, forms, analytics, logs, edge functions, domains, redirects, headers, performance, security, bandwidth, errors
- **Blob Storage**: Complete blob storage management and data access
- **Recipes & API**: Automation recipes and direct API method access
- **Account Resources**: Usage statistics, team information, billing, members, integrations, tokens, notifications
- **Global Resources**: Service status, deployment regions, and system health
- **Real-time Features**: Live subscriptions, automatic cache invalidation, event notifications

### 🔄 Advanced Subscription System
- Subscribe to any resource URI for real-time updates
- Automatic cache management with intelligent refresh
- Targeted notifications based on change types
- Retry logic for failed notifications

## Features

### 🛠️ Comprehensive Netlify CLI Coverage (43 Tools)

**Complete Netlify functionality at your fingertips:**
- **🚀 Deployment & Build Management** - Deploy, build, trigger, and monitor deployments
- **🏗️ Site Administration** - Create, manage, and configure Netlify sites  
- **⚙️ Environment Management** - Full environment variable control and cloning
- **📦 Netlify Blobs Storage** - Complete blob storage operations (get, set, delete, list)
- **⚡ Serverless Functions** - Build, invoke, and monitor function execution
- **🔧 Development Tools** - Local dev server and built site serving
- **🤖 Recipe Automation** - Access to Netlify's automation recipes
- **📊 Analytics & Monitoring** - Site analytics, real-time logs, and performance data
- **📋 Form Management** - Handle forms and submissions
- **🔌 Direct API Access** - Make direct Netlify API calls with method discovery
- **👥 Account Management** - Multi-account switching and team management

### 🛠️ Tools (43 Available)

#### Core Deployment
- `deploy-site` - Deploy a site to Netlify (production or preview)
- `trigger-build` - Trigger a new build and deploy
- `build-site` - Build site locally with context options

#### Site Management
- `list-sites` - List all Netlify sites
- `create-site` - Create a new Netlify site
- `delete-site` - Delete a Netlify site
- `get-site-info` - Get detailed site information
- `link-site` - Link current directory to a Netlify site
- `unlink-site` - Unlink current directory from Netlify site
- `get-status` - Get current Netlify status
- `init-site` - Initialize a new site in current directory
- `open-site` - Open site in browser

#### Environment Variables
- `set-env-vars` - Set environment variables for a site
- `get-env-var` - Get a specific environment variable
- `unset-env-var` - Unset an environment variable
- `clone-env-vars` - Clone environment variables between sites
- `import-env` - Import environment variables from file

#### Deployments & History
- `list-deploys` - List deploys for a site
- `get-deploy-info` - Get information about a specific deploy
- `cancel-deploy` - Cancel a running deploy
- `restore-deploy` - Restore a previous deploy
- `watch-deploy` - Watch deployment progress in real-time

#### Functions & Edge Functions
- `list-functions` - List all functions for a site
- `get-logs` - Get function logs for a site
- `build-function` - Build a serverless function
- `invoke-function-advanced` - Invoke function with advanced options

#### Netlify Blobs (Storage)
- `get-blob` - Get a blob from Netlify Blobs storage
- `set-blob` - Set/store a blob in Netlify Blobs storage
- `delete-blob` - Delete a blob from storage
- `list-blobs` - List all blobs in a store

#### Development & Testing
- `start-dev-server` - Start Netlify dev server locally
- `serve-built-site` - Serve a built site locally

#### Recipes & Automation
- `list-recipes` - List available Netlify recipes
- `run-recipe` - Run a specific Netlify recipe

#### API & Advanced Operations
- `call-netlify-api` - Make direct Netlify API calls
- `list-api-methods` - List available API methods

#### Forms & Analytics
- `get-form-submissions` - Get form submissions for a site
- `manage-form` - Manage site forms and submissions
- `get-analytics` - Get site analytics data

#### Monitoring & Logs
- `stream-logs` - Stream real-time logs from functions
- `enable-branch-deploy` - Enable branch deploys for a specific branch
- `disable-branch-deploy` - Disable branch deploys for a specific branch

#### Account Management
- `switch-account` - Switch between Netlify accounts

### 📋 Resources (32 Available)

- `netlify://sites` - List all sites (JSON)
- `netlify://sites/{siteId}/overview` - Complete site overview with functions, deployments, and analytics
- `netlify://sites/{siteId}/functions` - List site functions (JSON)
- `netlify://sites/{siteId}/env` - List environment variables (JSON)
- `netlify://sites/{siteId}/deploys` - List site deployments (JSON)
- `netlify://sites/{siteId}/deploys/{deployId}` - Detailed information about a specific deployment
- `netlify://sites/{siteId}/forms` - Form submissions and configuration
- `netlify://sites/{siteId}/analytics` - Site usage analytics and performance metrics
- `netlify://sites/{siteId}/logs` - Recent site and function logs
- `netlify://sites/{siteId}/edge-functions` - List and manage edge functions for a site
- `netlify://sites/{siteId}/build-hooks` - Manage build hooks and webhook configurations
- `netlify://sites/{siteId}/domains` - Custom domains and DNS configuration
- `netlify://sites/{siteId}/redirects` - URL redirects and rewrite rules
- `netlify://sites/{siteId}/headers` - Custom HTTP headers configuration
- `netlify://sites/{siteId}/performance` - Site performance analytics and optimization data
- `netlify://sites/{siteId}/security` - Security headers, SSL, and vulnerability analysis
- `netlify://sites/{siteId}/bandwidth` - Site bandwidth consumption and analytics
- `netlify://sites/{siteId}/errors` - Site error logs and exception tracking
- `netlify://blobs/{storeName}` - Netlify Blobs storage management
- `netlify://blobs/{storeName}/{key}` - Individual blob data and metadata
- `netlify://recipes` - Netlify automation recipes and templates
- `netlify://recipes/{recipeName}` - Detailed recipe configuration and steps
- `netlify://api/methods` - Available Netlify API endpoints and methods
- `netlify://account/usage` - Account-level usage statistics and limits
- `netlify://account/teams` - Team membership and permissions
- `netlify://account/billing` - Account billing details and usage costs
- `netlify://account/members` - Team member management and permissions
- `netlify://account/integrations` - Connected services and integrations
- `netlify://account/tokens` - Personal access tokens and API keys
- `netlify://account/notifications` - Email and webhook notification preferences
- `netlify://global/regions` - Available deployment regions and edge locations
- `netlify://status` - Current Netlify service status and health

### 💡 Smart Prompts (28 Available)

- `netlify-deploy` - Deploy a site with best practices guidance
- `netlify-setup` - Set up a new Netlify site with configuration
- `netlify-environment-setup` - Environment configuration across contexts
- `netlify-troubleshoot` - Comprehensive issue diagnosis and resolution
- `netlify-function-deploy` - Function deployment with best practices
- `netlify-migration` - Site migration with optimization
- `netlify-optimization` - Performance, security, and SEO optimization
- `netlify-security-audit` - Complete security audit and hardening
- `netlify-performance-audit` - Comprehensive performance analysis and optimization
- `netlify-edge-functions-setup` - Edge functions deployment and configuration
- `netlify-blobs-management` - Comprehensive blob storage management workflow
- `netlify-forms-setup` - Form handling and submission management setup
- `netlify-analytics-dashboard` - Analytics dashboard setup and monitoring
- `netlify-domain-setup` - Custom domain configuration and DNS management
- `netlify-redirects-config` - URL redirects and rewrite rules configuration
- `netlify-build-optimization` - Build process optimization and caching
- `netlify-monitoring-setup` - Comprehensive monitoring and alerting setup
- `netlify-backup-strategy` - Site backup and disaster recovery planning
- `netlify-team-collaboration` - Team workflow and collaboration setup
- `netlify-api-integration` - API integration and webhook configuration
- `netlify-staging-workflow` - Staging environment and preview deployment workflow
- `netlify-seo-optimization` - SEO optimization and search engine visibility
- `netlify-cdn-optimization` - CDN and edge network optimization
- `netlify-compliance-audit` - Compliance and accessibility audit
- `netlify-cost-optimization` - Cost analysis and optimization recommendations
- `netlify-disaster-recovery` - Disaster recovery testing and procedures
- `netlify-advanced-deployment` - Advanced deployment strategies and blue-green deployments

## Installation

### Installing via Smithery

To install Netlify MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@DynamicEndpoints/Netlify-MCP-Server):

```bash
npx -y @smithery/cli install @DynamicEndpoints/Netlify-MCP-Server --client claude
```

### Manual Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd Netlify-MCP-Server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Ensure Netlify CLI is installed (latest version):
```bash
npm install -g netlify-cli@latest
```

## Authentication

This MCP server interacts with the Netlify CLI, which requires authentication with your Netlify account. Since the server runs non-interactively, **you must use a Personal Access Token (PAT)**.

1. **Generate a PAT:**
   - Go to your Netlify User Settings > Applications > Personal access tokens ([Direct Link](https://app.netlify.com/user/applications#personal-access-tokens))
   - Select **New access token**
   - Give it a description (e.g., "MCP Server Token")
   - Set an expiration date
   - Select **Generate token**
   - **Copy the token immediately** and store it securely

2. **Configure the Token:** You need to make this token available to the MCP server as the `NETLIFY_AUTH_TOKEN` environment variable. Add it to the `env` section of the server's configuration in your MCP settings file (see below).

**Note:** Using `netlify login` is **not** suitable for this server as it requires interactive browser authentication.

## Configuration

Add the following configuration to your MCP settings file, replacing `"YOUR_NETLIFY_PAT_HERE"` with your actual Personal Access Token:

```json
{
  "mcpServers": {
    "netlify": {
      "command": "node",
      "args": ["C:\\path\\to\\Netlify-MCP-Server\\build\\index.js"],
      "env": {
        "NETLIFY_AUTH_TOKEN": "YOUR_NETLIFY_PAT_HERE"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**Settings file locations:**
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Other MCP clients**: Consult your specific MCP client documentation

## Available Tools (Netlify CLI v22.1.3 Compatible)

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

### Advanced Site Management

#### init-site
Initialize a new site in the current directory.
```json
{
  "name": "string?",        // Optional: Site name
  "accountSlug": "string?", // Optional: Account slug
  "manual": "boolean?"      // Optional: Skip git detection
}
```
*Example:*
```json
{
  "name": "my-new-site",
  "manual": true
}
```

#### open-site
Open site in browser.
```json
{
  "siteId": "string?",     // Optional: Site ID (if not linked)
  "admin": "boolean?"      // Optional: Open admin panel instead of site
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "admin": true
}
```

#### watch-deploy
Watch deployment progress in real-time.
```json
{
  "siteId": "string",      // Required: Site ID
  "deployId": "string?"    // Optional: Specific deploy ID to watch
}
```
*Example:*
```json
{
  "siteId": "your-site-id-here",
  "deployId": "deploy-id-123"
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

## Available Resources (Netlify CLI v22.1.3 Compatible)

Access Netlify data directly using these resource URIs:

*   `netlify://sites`: List all sites (JSON output of `sites:list --json`)
*   `netlify://sites/{siteId}/functions`: List functions for a site (JSON output of `functions:list --json`, requires `NETLIFY_SITE_ID={siteId}` env var)
*   `netlify://sites/{siteId}/env`: List environment variables for a site (JSON output of `env:list --json`, requires `NETLIFY_SITE_ID={siteId}` env var)
*   `netlify://sites/{siteId}/deploys`: List deployments for a site (JSON output of `deploys:list --json`, requires `NETLIFY_SITE_ID={siteId}` env var)
*   `netlify://sites/{siteId}/forms`: List forms for a site (JSON output from form management tools)
*   `netlify://sites/{siteId}/analytics`: Site analytics data (JSON output from analytics tools)
*   `netlify://blobs/{storeName}`: List blobs in a store (JSON output from blob storage tools)
*   `netlify://recipes`: List available recipes (JSON output from recipe tools)
*   `netlify://api/methods`: List available API methods (JSON output from API discovery tools)

## Limitations (Netlify CLI v22.1.3)

-   **Interactive Commands:** Commands requiring interactive prompts (like `netlify login`, `netlify init` without parameters, interactive dev mode) are not supported by this server. Use a Personal Access Token for authentication and provide required parameters explicitly.
-   **Site Context:** Many commands require site context. This server passes the required `siteId` via the `NETLIFY_SITE_ID` environment variable when executing these commands. Commands that operate on the *current working directory* (like `status` and `unlink`) may not function as expected when called via the MCP server unless the server directory is properly linked.
-   **Browser-dependent Features:** Some commands that require opening browsers or interactive authentication flows may have limited functionality in the MCP server environment.
-   **Real-time Streaming:** While log streaming is supported, the output is captured and returned rather than providing a true real-time stream interface.

**Note:** This comprehensive implementation now covers all major Netlify CLI functionality including Blobs, Dev Server, Recipes, Analytics, Forms, and advanced API operations. Previously unsupported features like DNS, Plugins, and Hooks may still have limited support depending on CLI capabilities.

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
