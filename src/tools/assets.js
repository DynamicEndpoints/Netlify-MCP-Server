import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listSiteAssetsTool = {
  name: "listSiteAssets",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      const assets = await callNetlifyApi(`/sites/${siteId}/assets`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(assets, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getSiteAssetTool = {
  name: "getSiteAsset",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID"),
    assetId: z.string().describe("Asset ID")
  },
  handler: async ({ token, siteId, assetId }) => {
    try {
      const asset = await callNetlifyApi(`/sites/${siteId}/assets/${assetId}`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(asset, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const updateSiteAssetTool = {
  name: "updateSiteAsset",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID"),
    assetId: z.string().describe("Asset ID"),
    state: z.string().describe("New state for the asset")
  },
  handler: async ({ token, siteId, assetId, state }) => {
    try {
      const asset = await callNetlifyApi(`/sites/${siteId}/assets/${assetId}`, "PUT", token, { state });
      return {
        content: [{ type: "text", text: JSON.stringify(asset, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const deleteSiteAssetTool = {
  name: "deleteSiteAsset",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID"),
    assetId: z.string().describe("Asset ID")
  },
  handler: async ({ token, siteId, assetId }) => {
    try {
      await callNetlifyApi(`/sites/${siteId}/assets/${assetId}`, "DELETE", token);
      return {
        content: [{ type: "text", text: "Asset deleted successfully" }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
