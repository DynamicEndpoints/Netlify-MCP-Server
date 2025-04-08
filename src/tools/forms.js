import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listFormSubmissionsTool = {
  name: "listFormSubmissions",
  schema: {
    token: z.string().describe("Netlify API token"),
    formId: z.string().describe("Form ID")
  },
  handler: async ({ token, formId }) => {
    try {
      const submissions = await callNetlifyApi(`/forms/${formId}/submissions`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(submissions, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
