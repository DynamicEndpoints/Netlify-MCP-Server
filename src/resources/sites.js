import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const siteResource = {
  name: "site",
  template: new ResourceTemplate("netlify://sites/{siteId}", { list: undefined }),
  handler: async (uri, { siteId }, context) => {
    const token = context.request?.headers?.authorization?.replace("Bearer ", "") || "";
    
    if (!token) {
      return {
        contents: [{
          uri: uri.href,
          text: "Error: No authentication token provided"
        }]
      };
    }
    
    try {
      const site = await callNetlifyApi(`/sites/${siteId}`, "GET", token);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(site, null, 2)
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error: ${error.message}`
        }]
      };
    }
  }
};

export const sitesResource = {
  name: "sites",
  template: "netlify://sites",
  handler: async (uri, _, context) => {
    const token = context.request?.headers?.authorization?.replace("Bearer ", "") || "";
    
    if (!token) {
      return {
        contents: [{
          uri: uri.href,
          text: "Error: No authentication token provided"
        }]
      };
    }
    
    try {
      const sites = await callNetlifyApi("/sites", "GET", token);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(sites, null, 2)
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error: ${error.message}`
        }]
      };
    }
  }
};
