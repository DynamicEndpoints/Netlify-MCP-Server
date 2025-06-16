// Extensible Plugin System for MCP Server
import { EventEmitter } from "events";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

// Plugin manifest schema
const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string().optional(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  engines: z.object({
    node: z.string().optional(),
    mcp: z.string().optional(),
  }).optional(),
  main: z.string().default("index.js"),
  dependencies: z.record(z.string()).default({}),
  capabilities: z.object({
    tools: z.array(z.string()).default([]),
    resources: z.array(z.string()).default([]),
    prompts: z.array(z.string()).default([]),
    hooks: z.array(z.string()).default([]),
  }).default({}),
  configuration: z.record(z.any()).default({}),
  permissions: z.object({
    fileSystem: z.boolean().default(false),
    network: z.boolean().default(false),
    environment: z.boolean().default(false),
    shell: z.boolean().default(false),
  }).default({}),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// Plugin interface
export interface Plugin {
  manifest: PluginManifest;
  activate(context: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;
  onConfigChange?(config: Record<string, any>): Promise<void>;
}

// Plugin context interface
export interface PluginContext {
  mcp: {
    registerTool(name: string, handler: ToolHandler): void;
    registerResource(uri: string, handler: ResourceHandler): void;
    registerPrompt(name: string, handler: PromptHandler): void;
    registerHook(event: string, handler: HookHandler): void;
    unregisterTool(name: string): void;
    unregisterResource(uri: string): void;
    unregisterPrompt(name: string): void;
    unregisterHook(event: string, handler: HookHandler): void;
  };
  logger: {
    info(message: string, metadata?: any): void;
    warn(message: string, metadata?: any): void;
    error(message: string, metadata?: any): void;
    debug(message: string, metadata?: any): void;
  };
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
  };
  config: Record<string, any>;
  eventBus: EventEmitter;
  utils: {
    executeCommand(command: string, options?: any): Promise<string>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    httpRequest(url: string, options?: any): Promise<any>;
  };
}

// Handler types
export type ToolHandler = (parameters: any, context: PluginContext) => Promise<any>;
export type ResourceHandler = (uri: string, context: PluginContext) => Promise<any>;
export type PromptHandler = (name: string, arguments_: any, context: PluginContext) => Promise<any>;
export type HookHandler = (event: string, data: any, context: PluginContext) => Promise<any>;

// Plugin registry entry
interface PluginRegistryEntry {
  plugin: Plugin;
  manifest: PluginManifest;
  context: PluginContext;
  status: "loaded" | "active" | "error" | "disabled";
  error?: string;
  loadTime: number;
  activationTime?: number;
}

export class PluginManager extends EventEmitter {
  private plugins = new Map<string, PluginRegistryEntry>();
  private pluginsDir: string;
  private tools = new Map<string, { handler: ToolHandler; pluginId: string }>();
  private resources = new Map<string, { handler: ResourceHandler; pluginId: string }>();
  private prompts = new Map<string, { handler: PromptHandler; pluginId: string }>();
  private hooks = new Map<string, { handlers: Array<{ handler: HookHandler; pluginId: string }> }>();
  private storage = new Map<string, Map<string, any>>();
  private globalEventBus = new EventEmitter();

  constructor(pluginsDir = "./plugins") {
    super();
    this.pluginsDir = pluginsDir;
    this.initializePluginSystem();
  }

  private async initializePluginSystem(): Promise<void> {
    try {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      await this.loadPlugins();
      await this.createDefaultPlugins();
      console.error(`[${new Date().toISOString()}] Plugin system initialized`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to initialize plugin system:`, error);
    }
  }

  // Load all plugins from disk
  private async loadPlugins(): Promise<void> {
    try {
      const pluginDirs = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      const directories = pluginDirs.filter(dirent => dirent.isDirectory());

      for (const dir of directories) {
        try {
          await this.loadPlugin(dir.name);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Failed to load plugin ${dir.name}:`, error);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to scan plugins directory:`, error);
    }
  }

  // Load individual plugin
  async loadPlugin(pluginId: string): Promise<void> {
    const pluginPath = path.join(this.pluginsDir, pluginId);
    
    try {
      // Check if directory exists
      const stats = await fs.stat(pluginPath);
      if (!stats.isDirectory()) {
        throw new Error(`${pluginId} is not a directory`);
      }

      // Load manifest
      const manifestPath = path.join(pluginPath, "package.json");
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifestData = JSON.parse(manifestContent);
      const manifest = PluginManifestSchema.parse(manifestData);

      // Load plugin code
      const mainPath = path.join(pluginPath, manifest.main);
      const pluginModule = await import(mainPath);
      const plugin: Plugin = pluginModule.default || pluginModule;

      // Create plugin context
      const context = this.createPluginContext(pluginId, manifest);

      // Register plugin
      const entry: PluginRegistryEntry = {
        plugin,
        manifest,
        context,
        status: "loaded",
        loadTime: Date.now(),
      };

      this.plugins.set(pluginId, entry);
      console.error(`[${new Date().toISOString()}] Loaded plugin: ${manifest.name} v${manifest.version}`);
      
      this.emit("plugin-loaded", pluginId, manifest);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load plugin ${pluginId}:`, error);
      this.plugins.set(pluginId, {
        plugin: {} as Plugin,
        manifest: {} as PluginManifest,
        context: {} as PluginContext,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        loadTime: Date.now(),
      });
    }
  }

  // Activate plugin
  async activatePlugin(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (entry.status === "active") {
      return; // Already active
    }

    if (entry.status === "error") {
      throw new Error(`Plugin ${pluginId} has errors: ${entry.error}`);
    }

    try {
      await entry.plugin.activate(entry.context);
      entry.status = "active";
      entry.activationTime = Date.now();
      
      console.error(`[${new Date().toISOString()}] Activated plugin: ${entry.manifest.name}`);
      this.emit("plugin-activated", pluginId, entry.manifest);
    } catch (error) {
      entry.status = "error";
      entry.error = error instanceof Error ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] Failed to activate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  // Deactivate plugin
  async deactivatePlugin(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry || entry.status !== "active") {
      return;
    }

    try {
      if (entry.plugin.deactivate) {
        await entry.plugin.deactivate();
      }

      // Unregister all plugin resources
      this.unregisterPluginResources(pluginId);
      
      entry.status = "loaded";
      entry.activationTime = undefined;
      
      console.error(`[${new Date().toISOString()}] Deactivated plugin: ${entry.manifest.name}`);
      this.emit("plugin-deactivated", pluginId, entry.manifest);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deactivating plugin ${pluginId}:`, error);
      throw error;
    }
  }

  // Unregister all resources for a plugin
  private unregisterPluginResources(pluginId: string): void {
    // Remove tools
    for (const [toolName, toolData] of this.tools.entries()) {
      if (toolData.pluginId === pluginId) {
        this.tools.delete(toolName);
      }
    }

    // Remove resources
    for (const [resourceUri, resourceData] of this.resources.entries()) {
      if (resourceData.pluginId === pluginId) {
        this.resources.delete(resourceUri);
      }
    }

    // Remove prompts
    for (const [promptName, promptData] of this.prompts.entries()) {
      if (promptData.pluginId === pluginId) {
        this.prompts.delete(promptName);
      }
    }

    // Remove hooks
    for (const [event, hookData] of this.hooks.entries()) {
      hookData.handlers = hookData.handlers.filter(h => h.pluginId !== pluginId);
      if (hookData.handlers.length === 0) {
        this.hooks.delete(event);
      }
    }
  }

  // Create plugin context
  private createPluginContext(pluginId: string, manifest: PluginManifest): PluginContext {
    const pluginStorage = this.getPluginStorage(pluginId);

    return {
      mcp: {
        registerTool: (name: string, handler: ToolHandler) => {
          this.tools.set(name, { handler, pluginId });
        },
        registerResource: (uri: string, handler: ResourceHandler) => {
          this.resources.set(uri, { handler, pluginId });
        },
        registerPrompt: (name: string, handler: PromptHandler) => {
          this.prompts.set(name, { handler, pluginId });
        },
        registerHook: (event: string, handler: HookHandler) => {
          if (!this.hooks.has(event)) {
            this.hooks.set(event, { handlers: [] });
          }
          this.hooks.get(event)!.handlers.push({ handler, pluginId });
        },
        unregisterTool: (name: string) => {
          const toolData = this.tools.get(name);
          if (toolData && toolData.pluginId === pluginId) {
            this.tools.delete(name);
          }
        },
        unregisterResource: (uri: string) => {
          const resourceData = this.resources.get(uri);
          if (resourceData && resourceData.pluginId === pluginId) {
            this.resources.delete(uri);
          }
        },
        unregisterPrompt: (name: string) => {
          const promptData = this.prompts.get(name);
          if (promptData && promptData.pluginId === pluginId) {
            this.prompts.delete(name);
          }
        },
        unregisterHook: (event: string, handler: HookHandler) => {
          const hookData = this.hooks.get(event);
          if (hookData) {
            hookData.handlers = hookData.handlers.filter(
              h => h.pluginId !== pluginId || h.handler !== handler
            );
          }
        },
      },
      logger: {
        info: (message: string, metadata?: any) => {
          console.error(`[${new Date().toISOString()}] [${pluginId}] INFO: ${message}`, metadata);
        },
        warn: (message: string, metadata?: any) => {
          console.error(`[${new Date().toISOString()}] [${pluginId}] WARN: ${message}`, metadata);
        },
        error: (message: string, metadata?: any) => {
          console.error(`[${new Date().toISOString()}] [${pluginId}] ERROR: ${message}`, metadata);
        },
        debug: (message: string, metadata?: any) => {
          console.error(`[${new Date().toISOString()}] [${pluginId}] DEBUG: ${message}`, metadata);
        },
      },
      storage: {
        get: async (key: string) => pluginStorage.get(key),
        set: async (key: string, value: any) => pluginStorage.set(key, value),
        delete: async (key: string) => pluginStorage.delete(key),
        has: async (key: string) => pluginStorage.has(key),
      },
      config: manifest.configuration,
      eventBus: this.globalEventBus,
      utils: {
        executeCommand: async (command: string, options?: any) => {
          if (!manifest.permissions?.shell) {
            throw new Error("Plugin does not have shell permissions");
          }
          // Implement safe command execution
          const { execSync } = await import("child_process");
          return execSync(command, { encoding: "utf-8", ...options });
        },
        readFile: async (filePath: string) => {
          if (!manifest.permissions?.fileSystem) {
            throw new Error("Plugin does not have file system permissions");
          }
          return fs.readFile(filePath, "utf-8");
        },
        writeFile: async (filePath: string, content: string) => {
          if (!manifest.permissions?.fileSystem) {
            throw new Error("Plugin does not have file system permissions");
          }
          return fs.writeFile(filePath, content);
        },
        httpRequest: async (url: string, options?: any) => {
          if (!manifest.permissions?.network) {
            throw new Error("Plugin does not have network permissions");
          }
          // Implement HTTP request functionality
          const fetch = await import("node-fetch");
          const response = await fetch.default(url, options);
          return response.json();
        },
      },
    };
  }

  // Get plugin storage
  private getPluginStorage(pluginId: string): Map<string, any> {
    if (!this.storage.has(pluginId)) {
      this.storage.set(pluginId, new Map());
    }
    return this.storage.get(pluginId)!;
  }

  // Execute plugin tool
  async executePluginTool(toolName: string, parameters: any): Promise<any> {
    const toolData = this.tools.get(toolName);
    if (!toolData) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const entry = this.plugins.get(toolData.pluginId);
    if (!entry || entry.status !== "active") {
      throw new Error(`Plugin ${toolData.pluginId} is not active`);
    }

    try {
      return await toolData.handler(parameters, entry.context);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Plugin tool ${toolName} failed:`, error);
      throw error;
    }
  }

  // Execute plugin resource
  async executePluginResource(uri: string): Promise<any> {
    const resourceData = this.resources.get(uri);
    if (!resourceData) {
      throw new Error(`Resource ${uri} not found`);
    }

    const entry = this.plugins.get(resourceData.pluginId);
    if (!entry || entry.status !== "active") {
      throw new Error(`Plugin ${resourceData.pluginId} is not active`);
    }

    try {
      return await resourceData.handler(uri, entry.context);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Plugin resource ${uri} failed:`, error);
      throw error;
    }
  }

  // Execute plugin prompt
  async executePluginPrompt(promptName: string, arguments_: any): Promise<any> {
    const promptData = this.prompts.get(promptName);
    if (!promptData) {
      throw new Error(`Prompt ${promptName} not found`);
    }

    const entry = this.plugins.get(promptData.pluginId);
    if (!entry || entry.status !== "active") {
      throw new Error(`Plugin ${promptData.pluginId} is not active`);
    }

    try {
      return await promptData.handler(promptName, arguments_, entry.context);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Plugin prompt ${promptName} failed:`, error);
      throw error;
    }
  }

  // Execute hooks
  async executeHooks(event: string, data: any): Promise<void> {
    const hookData = this.hooks.get(event);
    if (!hookData) {
      return; // No hooks for this event
    }

    const promises = hookData.handlers.map(async ({ handler, pluginId }) => {
      const entry = this.plugins.get(pluginId);
      if (entry && entry.status === "active") {
        try {
          await handler(event, data, entry.context);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Hook ${event} failed for plugin ${pluginId}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  // Get plugin information
  getPluginInfo(pluginId: string): PluginRegistryEntry | undefined {
    return this.plugins.get(pluginId);
  }

  // List all plugins
  listPlugins(): Array<{ id: string; manifest: PluginManifest; status: string }> {
    return Array.from(this.plugins.entries()).map(([id, entry]) => ({
      id,
      manifest: entry.manifest,
      status: entry.status,
    }));
  }

  // Get registered tools
  getRegisteredTools(): string[] {
    return Array.from(this.tools.keys());
  }

  // Get registered resources
  getRegisteredResources(): string[] {
    return Array.from(this.resources.keys());
  }

  // Get registered prompts
  getRegisteredPrompts(): string[] {
    return Array.from(this.prompts.keys());
  }

  // Create default plugins
  private async createDefaultPlugins(): Promise<void> {
    const defaultPlugins = [
      {
        id: "git-integration",
        name: "Git Integration Plugin",
        version: "1.0.0",
        description: "Git repository management tools",
        main: "git-plugin.js",
        capabilities: {
          tools: ["git_status", "git_commit", "git_push", "git_pull"],
        },
        permissions: {
          shell: true,
          fileSystem: true,
        },
      },
      {
        id: "monitoring-alerts",
        name: "Monitoring & Alerts Plugin",
        version: "1.0.0", 
        description: "Advanced monitoring and alerting capabilities",
        main: "monitoring-plugin.js",
        capabilities: {
          tools: ["send_alert", "check_health"],
          hooks: ["deployment", "error"],
        },
        permissions: {
          network: true,
        },
      },
    ];

    for (const plugin of defaultPlugins) {
      const pluginDir = path.join(this.pluginsDir, plugin.id);
      try {
        await fs.mkdir(pluginDir, { recursive: true });
        await fs.writeFile(
          path.join(pluginDir, "package.json"),
          JSON.stringify(plugin, null, 2)
        );
        
        // Create basic plugin implementation
        const pluginCode = this.generateDefaultPluginCode(plugin);
        await fs.writeFile(path.join(pluginDir, plugin.main), pluginCode);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to create default plugin ${plugin.id}:`, error);
      }
    }
  }

  // Generate default plugin code
  private generateDefaultPluginCode(manifest: any): string {
    return `
// Auto-generated plugin: ${manifest.name}
module.exports = {
  manifest: ${JSON.stringify(manifest, null, 2)},
  
  async activate(context) {
    context.logger.info("Plugin ${manifest.name} activated");
    
    ${manifest.capabilities.tools?.map((tool: string) => `
    context.mcp.registerTool("${tool}", async (parameters) => {
      context.logger.info("Executing tool: ${tool}", parameters);
      // TODO: Implement ${tool} functionality
      return { success: true, message: "Tool ${tool} executed" };
    });
    `).join('\n') || ''}
    
    ${manifest.capabilities.hooks?.map((hook: string) => `
    context.mcp.registerHook("${hook}", async (event, data) => {
      context.logger.info("Hook ${hook} triggered", { event, data });
      // TODO: Implement ${hook} hook functionality
    });
    `).join('\n') || ''}
  },
  
  async deactivate() {
    console.log("Plugin ${manifest.name} deactivated");
  }
};
`;
  }

  // Install plugin from package
  async installPlugin(packagePath: string): Promise<void> {
    // Implementation for installing plugins from npm packages or archives
    throw new Error("Plugin installation not yet implemented");
  }

  // Uninstall plugin
  async uninstallPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId);
    this.plugins.delete(pluginId);
    
    // Remove plugin directory
    const pluginPath = path.join(this.pluginsDir, pluginId);
    await fs.rm(pluginPath, { recursive: true, force: true });
    
    this.emit("plugin-uninstalled", pluginId);
  }
}
