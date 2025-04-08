import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listDevServersTool = {
  name: "listDevServers",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      const servers = await callNetlifyApi(`/sites/${siteId}/dev_servers`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(servers, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const createDevServerTool = {
  name: "createDevServer",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID"),
    branch: z.string().describe("Git branch"),
    context: z.string().describe("Build context")
  },
  handler: async ({ token, siteId, branch, context }) => {
    try {
      const server = await callNetlifyApi(`/sites/${siteId}/dev_servers`, "POST", token, {
        branch,
        context
      });
      return {
        content: [{ type: "text", text: JSON.stringify(server, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const listDevServerHooksTool = {
  name: "listDevServerHooks",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      const hooks = await callNetlifyApi(`/sites/${siteId}/dev_server_hooks`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(hooks, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const createDevServerHookTool = {
  name: "createDevServerHook",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID"),
    branch: z.string().describe("Git branch"),
    url: z.string().describe("Webhook URL")
  },
  handler: async ({ token, siteId, branch, url }) => {
    try {
      const hook = await callNetlifyApi(`/sites/${siteId}/dev_server_hooks`, "POST", token, {
        branch,
        url
      });
      return {
        content: [{ type: "text", text: JSON.stringify(hook, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
