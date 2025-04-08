import { z } from "zod";
import { callNetlifyApi } from "../utils/netlifyApi.js";

export const listEnvVarsTool = {
  name: "listEnvVars",
  schema: {
    token: z.string().describe("Netlify API token"),
    accountId: z.string().describe("Account ID")
  },
  handler: async ({ token, accountId }) => {
    try {
      const envVars = await callNetlifyApi(`/accounts/${accountId}/env`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(envVars, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getEnvVarTool = {
  name: "getEnvVar",
  schema: {
    token: z.string().describe("Netlify API token"),
    accountId: z.string().describe("Account ID"),
    key: z.string().describe("Environment variable key")
  },
  handler: async ({ token, accountId, key }) => {
    try {
      const envVar = await callNetlifyApi(`/accounts/${accountId}/env/${key}`, "GET", token);
      return {
        content: [{ type: "text", text: JSON.stringify(envVar, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const createEnvVarsTool = {
  name: "createEnvVars",
  schema: {
    token: z.string().describe("Netlify API token"),
    accountId: z.string().describe("Account ID"),
    variables: z.array(z.object({
      key: z.string(),
      value: z.string(),
      scopes: z.array(z.string())
    })).describe("Environment variables to create")
  },
  handler: async ({ token, accountId, variables }) => {
    try {
      const result = await callNetlifyApi(`/accounts/${accountId}/env`, "POST", token, variables);
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

export const setEnvVarValueTool = {
  name: "setEnvVarValue",
  schema: {
    token: z.string().describe("Netlify API token"),
    accountId: z.string().describe("Account ID"),
    key: z.string().describe("Environment variable key"),
    value: z.string().describe("New value")
  },
  handler: async ({ token, accountId, key, value }) => {
    try {
      const result = await callNetlifyApi(`/accounts/${accountId}/env/${key}`, "PATCH", token, { value });
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

export const deleteEnvVarValueTool = {
  name: "deleteEnvVarValue",
  schema: {
    token: z.string().describe("Netlify API token"),
    accountId: z.string().describe("Account ID"),
    key: z.string().describe("Environment variable key"),
    valueId: z.string().describe("Value ID to delete")
  },
  handler: async ({ token, accountId, key, valueId }) => {
    try {
      await callNetlifyApi(`/accounts/${accountId}/env/${key}/value/${valueId}`, "DELETE", token);
      return {
        content: [{ type: "text", text: "Environment variable value deleted successfully" }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
