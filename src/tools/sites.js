import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listSitesTool = {
  name: "listSites",
  schema: {
    token: z.string().describe("Netlify API token")
  },
  handler: async ({ token }) => {
    try {
      const sites = await callNetlifyApi("/sites", "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(sites, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getSiteTool = {
  name: "getSite",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      const site = await callNetlifyApi(`/sites/${siteId}`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(site, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const createSiteTool = {
  name: "createSite",
  schema: {
    token: z.string().describe("Netlify API token"),
    name: z.string().describe("Site name"),
    customDomain: z.string().optional().describe("Custom domain")
  },
  handler: async ({ token, name, customDomain }) => {
    try {
      const site = await callNetlifyApi("/sites", "POST", token, {
        name,
        custom_domain: customDomain
      });
      return {
        content: [{ type: "text", text: JSON.stringify(site, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const updateSiteTool = {
  name: "updateSite",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID"),
    name: z.string().optional().describe("New site name"),
    customDomain: z.string().optional().describe("New custom domain"),
    password: z.string().optional().describe("Site password"),
    forceSsl: z.boolean().optional().describe("Force SSL")
  },
  handler: async ({ token, siteId, ...updateData }) => {
    try {
      const site = await callNetlifyApi(`/sites/${siteId}`, "PATCH", token, updateData);
      return {
        content: [{ type: "text", text: JSON.stringify(site, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const deleteSiteTool = {
  name: "deleteSite",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      await callNetlifyApi(`/sites/${siteId}`, "DELETE", token);
      return {
        content: [{ type: "text", text: "Site deleted successfully" }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
