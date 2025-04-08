# Netlify MCP Server

A comprehensive Model Context Protocol (MCP) server implementation for the Netlify API, providing a standardized interface for LLM applications to interact with Netlify services.

## Features

- Complete implementation of Netlify API endpoints
- Modular and maintainable codebase structure
- Standardized error handling
- Type-safe schema validation using Zod
- Environment variable management
- Comprehensive documentation

## Installation

```bash
git clone https://github.com/DynamicEndpoints/Netlify-MCP-Server.git
cd Netlify-MCP-Server
npm install
```

## Configuration

Create a `.env` file in the root directory with your Netlify API token:

```env
NETLIFY_API_TOKEN=your_netlify_personal_access_token
PORT=3000
```

## Available Tools

### 1. Site Management
- `listSites` - List all sites in your Netlify account
- `getSite` - Get details for a specific site
- `createSite` - Create a new site
- `updateSite` - Update site settings
- `deleteSite` - Delete a site

### 2. Deployments and Builds
- `listDeploys` - List site deployments
- `getSiteDeploy` - Get deployment details
- `lockDeploy` - Lock a deployment
- `listBuilds` - List site builds
- `startBuild` - Start a build
- `createBuildHook` - Create a build hook

### 3. Forms
- `listFormSubmissions` - List form submissions

### 4. Environment Variables
- `listEnvVars` - List environment variables
- `getEnvVar` - Get environment variable details
- `createEnvVars` - Create environment variables
- `setEnvVarValue` - Update environment variable value
- `deleteEnvVarValue` - Delete environment variable value

### 5. DNS Management
- `createDnsZone` - Create a DNS zone
- `listDnsRecords` - List DNS records

### 6. Account Management
- `listAccounts` - List user accounts
- `listAccountMembers` - List account members

### 7. SSL Certificates
- `provisionSslCertificate` - Provision SSL certificate

### 8. Snippets
- `listSnippets` - List site snippets

### 9. Assets
- `listSiteAssets` - List site assets
- `getSiteAsset` - Get asset details
- `updateSiteAsset` - Update asset state
- `deleteSiteAsset` - Delete an asset

### 10. Hooks
- `listHookTypes` - List available hook types

### 11. Dev Servers
- `listDevServers` - List dev servers
- `createDevServer` - Create a dev server
- `listDevServerHooks` - List dev server hooks
- `createDevServerHook` - Create a dev server hook

## Resources

- `netlify://sites` - List all sites
- `netlify://sites/{siteId}` - Get site details

## Prompts

- `create-site` - Template for creating a new site

## Usage Examples

### Creating a New Site

```javascript
const response = await server.tools.createSite({
  token: process.env.NETLIFY_API_TOKEN,
  name: "my-awesome-site",
  customDomain: "example.com"
});
```

### Managing Environment Variables

```javascript
// List environment variables
const envVars = await server.tools.listEnvVars({
  token: process.env.NETLIFY_API_TOKEN,
  accountId: "your-account-id"
});

// Create environment variables
const newVars = await server.tools.createEnvVars({
  token: process.env.NETLIFY_API_TOKEN,
  accountId: "your-account-id",
  variables: [
    {
      key: "API_KEY",
      value: "secret-value",
      scopes: ["builds", "runtime"]
    }
  ]
});
```

### Managing Deployments

```javascript
// List deployments
const deploys = await server.tools.listDeploys({
  token: process.env.NETLIFY_API_TOKEN,
  siteId: "your-site-id"
});

// Lock a deployment
const locked = await server.tools.lockDeploy({
  token: process.env.NETLIFY_API_TOKEN,
  deployId: "deploy-id"
});
```

## Project Structure

```
netlify-mcp-server/
├── src/
│   ├── resources/
│   │   └── sites.js
│   ├── tools/
│   │   ├── sites.js
│   │   ├── deploys.js
│   │   ├── forms.js
│   │   ├── env.js
│   │   ├── dns.js
│   │   ├── builds.js
│   │   ├── accounts.js
│   │   ├── ssl.js
│   │   ├── snippets.js
│   │   ├── assets.js
│   │   ├── hooks.js
│   │   └── dev.js
│   ├── prompts/
│   │   └── sites.js
│   └── utils/
│       └── netlifyApi.js
├── server.js
├── package.json
├── .env.example
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please email kameron@dynamicendpoints.com or open an issue in the GitHub repository.
