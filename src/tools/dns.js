import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const createDnsZoneTool = {
  name: "createDnsZone",
  schema: {
    token: z.string().describe("Netlify API token"),
    name: z.string().describe("DNS zone name"),
    accountId: z.string().describe("Account ID")
  },
  handler: async ({ token, name, accountId }) => {
    try {
      const zone = await callNetlifyApi("/dns_zones", "POST", token, { name, account_id: accountId });
      return {
        content: [{ type: "text", text: JSON.stringify(zone, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const listDnsRecordsTool = {
  name: "listDnsRecords",
  schema: {
    token: z.string().describe("Netlify API token"),
    zoneId: z.string().describe("DNS zone ID")
  },
  handler: async ({ token, zoneId }) => {
    try {
      const records = await callNetlifyApi(`/dns_zones/${zoneId}/dns_records`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(records, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
