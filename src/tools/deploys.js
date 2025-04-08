import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listDeploysTool = {
  name: "listDeploys",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      const deploys = await callNetlifyApi(`/sites/${siteId}/deploys`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(deploys, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const createBuildHookTool = {
  name: "createBuildHook",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID"),
    title: z.string().describe("Build hook title"),
    branch: z.string().describe("Git branch to build")
  },
  handler: async ({ token, siteId, title, branch }) => {
    try {
      const hook = await callNetlifyApi(`/sites/${siteId}/build_hooks`, "POST", token, {
        title,
        branch
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
