import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listSnippetsTool = {
  name: "listSnippets",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      const snippets = await callNetlifyApi(`/sites/${siteId}/snippets`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(snippets, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
