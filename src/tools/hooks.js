import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listHookTypesTool = {
  name: "listHookTypes",
  schema: {
    token: z.string().describe("Netlify API token")
  },
  handler: async ({ token }) => {
    try {
      const hookTypes = await callNetlifyApi("/hooks/types", "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(hookTypes, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
