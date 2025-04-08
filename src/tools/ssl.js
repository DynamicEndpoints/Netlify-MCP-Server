import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const provisionSslCertificateTool = {
  name: "provisionSslCertificate",
  schema: {
    token: z.string().describe("Netlify API token"),
    siteId: z.string().describe("Site ID")
  },
  handler: async ({ token, siteId }) => {
    try {
      const result = await callNetlifyApi(`/sites/${siteId}/ssl`, "POST", token);
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
