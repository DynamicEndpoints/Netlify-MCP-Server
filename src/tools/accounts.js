import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listAccountsTool = {
  name: "listAccounts",
  schema: {
    token: z.string().describe("Netlify API token")
  },
  handler: async ({ token }) => {
    try {
      const accounts = await callNetlifyApi("/accounts", "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const listAccountMembersTool = {
  name: "listAccountMembers",
  schema: {
    token: z.string().describe("Netlify API token"),
    accountSlug: z.string().describe("Account slug")
  },
  handler: async ({ token, accountSlug }) => {
    try {
      const members = await callNetlifyApi(`/${accountSlug}/members`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(members, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
