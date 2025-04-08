# Netlify MCP Server

This is a Model Context Protocol (MCP) server that provides access to the Netlify API. It allows LLM applications to interact with Netlify services through standardized resources, tools, and prompts.

## Features

- List and manage Netlify sites
- View and create site deployments
- Create build hooks
- Access form submissions
- Structured data access through MCP resources

## Installation

```bash
# Install dependencies
npm install
```

## Usage

### Running the Server

```bash
# Start the server
npm start
```

### Available Tools

The server exposes the following tools:

1. **listSites** - List all sites for a Netlify account
   - Parameters: token, name (optional), filter (optional)

2. **getSite** - Get details for a specific site
   - Parameters: token, siteId

3. **createSite** - Create a new Netlify site
   - Parameters: token, name, customDomain (optional), accountSlug (optional)

4. **listDeploys** - List all deploys for a site
   - Parameters: token, siteId

5. **createBuildHook** - Create a new build hook for a site
   - Parameters: token, siteId, title, branch

6. **listFormSubmissions** - List form submissions
   - Parameters: token, formId

### Available Resources

1. **netlify://sites** - List all sites
2. **netlify://sites/{siteId}** - Get details for a specific site

### Available Prompts

1. **create-site** - Template for creating a new site
   - Parameters: name, customDomain (optional)

## Authentication

All requests to the Netlify API require authentication using a personal access token. You can generate a token in the Netlify UI under User settings > Applications > Personal access tokens.

## Example Usage with MCP Inspector

You can test this server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector --command "node server.js"
```

## Integration with LLM Applications

This server can be integrated with any LLM application that supports the Model Context Protocol. The server communicates via stdin/stdout by default, but can be adapted to use HTTP with Server-Sent Events (SSE) for remote access.
