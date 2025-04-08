import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listBuildsTool = {
  name: "listBuilds",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      const builds = await callNetlifyApi(`/sites/${siteId}/builds`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(builds, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const startBuildTool = {
  name: "startBuild",
  schema: {
    token: z.string().describe("Netlify API token"),
    buildId: z.string().describe("Build ID")
  },
  handler: async ({ token, buildId }) => {
    try {
      const result = await callNetlifyApi(`/builds/${buildId}/start`, "POST", token);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getSiteDeployTool = {
  name: "getSiteDeploy",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID"),
    deployId: z.string().describe("Deploy ID")
  },
  handler: async ({ token, siteId, deployId }) => {
    try {
      const deploy = await callNetlifyApi(`/sites/${siteId}/deploys/${deployId}`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(deploy, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const lockDeployTool = {
  name: "lockDeploy",
  schema: {
    token: z.string().describe("Netlify API token"),
    deployId: z.string().describe("Deploy ID")
  },
  handler: async ({ token, deployId }) => {
    try {
      const result = await callNetlifyApi(`/deploys/${deployId}/lock`, "POST", token);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
