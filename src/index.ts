#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { execSync } from "child_process";

// Create server instance
const server = new Server(
  {
    name: "netlify-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function for executing Netlify CLI commands
async function executeNetlifyCommand(command: string): Promise<string> {
  try {
    return execSync(command).toString();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Netlify CLI error: ${error.message}`);
    }
    throw error;
  }
}

// Define Zod schemas for validation
const DeploySiteSchema = z.object({
  path: z.string(),
  prod: z.boolean().optional(),
  message: z.string().optional(),
});

const SetEnvVarsSchema = z.object({
  siteId: z.string(),
  envVars: z.record(z.string()),
});

const GetDeployStatusSchema = z.object({
  siteId: z.string(),
  deployId: z.string().optional(),
});

const AddDNSRecordSchema = z.object({
  siteId: z.string(),
  domain: z.string(),
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]),
  value: z.string(),
  ttl: z.number().optional(),
});

const DeployFunctionSchema = z.object({
  path: z.string(),
  name: z.string(),
  runtime: z.string().optional(),
});

const ManageFormSchema = z.object({
  siteId: z.string(),
  formId: z.string(),
  action: z.enum(["enable", "disable", "delete"]),
});

const ManagePluginSchema = z.object({
  siteId: z.string(),
  pluginId: z.string(),
  action: z.enum(["install", "uninstall", "update"]),
  config: z.record(z.unknown()).optional(),
});

const ManageHookSchema = z.object({
  siteId: z.string(),
  event: z.string(),
  url: z.string(),
  action: z.enum(["create", "delete", "update"]),
});

type DeploySiteParams = z.infer<typeof DeploySiteSchema>;
type SetEnvVarsParams = z.infer<typeof SetEnvVarsSchema>;
type GetDeployStatusParams = z.infer<typeof GetDeployStatusSchema>;
type AddDNSRecordParams = z.infer<typeof AddDNSRecordSchema>;
type DeployFunctionParams = z.infer<typeof DeployFunctionSchema>;
type ManageFormParams = z.infer<typeof ManageFormSchema>;
type ManagePluginParams = z.infer<typeof ManagePluginSchema>;
type ManageHookParams = z.infer<typeof ManageHookSchema>;

// Register Netlify tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "deploy-site",
      description: "Deploy a site to Netlify",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to the site directory",
          },
          prod: {
            type: "boolean",
            description: "Deploy to production",
          },
          message: {
            type: "string",
            description: "Deploy message",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "list-sites",
      description: "List all Netlify sites",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "set-env-vars",
      description: "Set environment variables for a site",
      inputSchema: {
        type: "object",
        properties: {
          siteId: {
            type: "string",
            description: "Site ID or name",
          },
          envVars: {
            type: "object",
            description: "Environment variables to set",
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["siteId", "envVars"],
      },
    },
    {
      name: "get-deploy-status",
      description: "Get deployment status for a site",
      inputSchema: {
        type: "object",
        properties: {
          siteId: {
            type: "string",
            description: "Site ID or name",
          },
          deployId: {
            type: "string",
            description: "Deployment ID",
          },
        },
        required: ["siteId"],
      },
    },
    {
      name: "add-dns-record",
      description: "Add a DNS record to a site",
      inputSchema: {
        type: "object",
        properties: {
          siteId: {
            type: "string",
            description: "Site ID or name",
          },
          domain: {
            type: "string",
            description: "Domain name",
          },
          type: {
            type: "string",
            enum: ["A", "AAAA", "CNAME", "MX", "TXT", "NS"],
            description: "DNS record type",
          },
          value: {
            type: "string",
            description: "DNS record value",
          },
          ttl: {
            type: "number",
            description: "Time to live in seconds",
          },
        },
        required: ["siteId", "domain", "type", "value"],
      },
    },
    {
      name: "deploy-function",
      description: "Deploy a serverless function",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to the function file",
          },
          name: {
            type: "string",
            description: "Function name",
          },
          runtime: {
            type: "string",
            description: "Function runtime (e.g., nodejs, go)",
          },
        },
        required: ["path", "name"],
      },
    },
    {
      name: "manage-form",
      description: "Manage form submissions",
      inputSchema: {
        type: "object",
        properties: {
          siteId: {
            type: "string",
            description: "Site ID or name",
          },
          formId: {
            type: "string",
            description: "Form ID",
          },
          action: {
            type: "string",
            enum: ["enable", "disable", "delete"],
            description: "Action to perform",
          },
        },
        required: ["siteId", "formId", "action"],
      },
    },
    {
      name: "manage-plugin",
      description: "Manage site plugins",
      inputSchema: {
        type: "object",
        properties: {
          siteId: {
            type: "string",
            description: "Site ID or name",
          },
          pluginId: {
            type: "string",
            description: "Plugin ID",
          },
          action: {
            type: "string",
            enum: ["install", "uninstall", "update"],
            description: "Action to perform",
          },
          config: {
            type: "object",
            description: "Plugin configuration",
          },
        },
        required: ["siteId", "pluginId", "action"],
      },
    },
    {
      name: "manage-hook",
      description: "Manage webhook notifications",
      inputSchema: {
        type: "object",
        properties: {
          siteId: {
            type: "string",
            description: "Site ID or name",
          },
          event: {
            type: "string",
            description: "Event type",
          },
          url: {
            type: "string",
            description: "Webhook URL",
          },
          action: {
            type: "string",
            enum: ["create", "delete", "update"],
            description: "Action to perform",
          },
        },
        required: ["siteId", "event", "url", "action"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "deploy-site": {
        const params = DeploySiteSchema.parse(request.params.arguments);
        let command = `netlify deploy --dir="${params.path}"`;
        if (params.prod) {
          command += " --prod";
        }
        if (params.message) {
          command += ` --message="${params.message}"`;
        }

        const output = await executeNetlifyCommand(command);
        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "list-sites": {
        const output = await executeNetlifyCommand("netlify sites:list");
        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "set-env-vars": {
        const params = SetEnvVarsSchema.parse(request.params.arguments);
        const results: string[] = [];
        for (const [key, value] of Object.entries(params.envVars)) {
          const output = await executeNetlifyCommand(
            `netlify env:set ${key} "${value}" --site-id ${params.siteId}`
          );
          results.push(output);
        }

        return {
          content: [{ type: "text", text: results.join("\n") }],
        };
      }

      case "get-deploy-status": {
        const params = GetDeployStatusSchema.parse(request.params.arguments);
        let command = `netlify deploy:list --site-id ${params.siteId}`;
        if (params.deployId) {
          command += ` --id ${params.deployId}`;
        }

        const output = await executeNetlifyCommand(command);
        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "add-dns-record": {
        const params = AddDNSRecordSchema.parse(request.params.arguments);
        let command = `netlify dns:add ${params.domain} ${params.type} ${params.value}`;
        if (params.ttl) {
          command += ` --ttl ${params.ttl}`;
        }
        command += ` --site-id ${params.siteId}`;

        const output = await executeNetlifyCommand(command);
        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "deploy-function": {
        const params = DeployFunctionSchema.parse(request.params.arguments);
        let command = `netlify functions:create ${params.name} --path ${params.path}`;
        if (params.runtime) {
          command += ` --runtime ${params.runtime}`;
        }

        const output = await executeNetlifyCommand(command);
        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "manage-form": {
        const params = ManageFormSchema.parse(request.params.arguments);
        const command = `netlify forms:${params.action} ${params.formId} --site-id ${params.siteId}`;

        const output = await executeNetlifyCommand(command);
        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "manage-plugin": {
        const params = ManagePluginSchema.parse(request.params.arguments);
        let command = `netlify plugins:${params.action} ${params.pluginId} --site-id ${params.siteId}`;
        if (params.config && params.action !== "uninstall") {
          command += ` --config '${JSON.stringify(params.config)}'`;
        }

        const output = await executeNetlifyCommand(command);
        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "manage-hook": {
        const params = ManageHookSchema.parse(request.params.arguments);
        const command = `netlify hooks:${params.action} --site-id ${params.siteId} --event ${params.event} --url ${params.url}`;

        const output = await executeNetlifyCommand(command);
        return {
          content: [{ type: "text", text: output }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error occurred" }],
      isError: true,
    };
  }
});

// Run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Netlify MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
