// Custom Workflow System for User-defined Templates
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { EventEmitter } from "events";

// Workflow step schema
const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["tool", "prompt", "condition", "loop", "parallel", "delay"]),
  tool: z.string().optional(),
  prompt: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  condition: z.string().optional(), // JavaScript expression
  onSuccess: z.string().optional(), // Next step ID
  onFailure: z.string().optional(), // Next step ID on failure
  retryCount: z.number().default(0),
  timeout: z.number().optional(), // Timeout in milliseconds
  parallel: z.array(z.string()).optional(), // Parallel step IDs
  loopVariable: z.string().optional(),
  loopItems: z.array(z.any()).optional(),
  delayMs: z.number().optional(),
});

// Workflow schema
const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().default("1.0.0"),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().default("custom"),
  arguments: z.array(z.object({
    name: z.string(),
    type: z.enum(["string", "number", "boolean", "array", "object"]),
    description: z.string(),
    required: z.boolean().default(false),
    defaultValue: z.any().optional(),
    validation: z.string().optional(), // Regex or validation rule
  })).default([]),
  variables: z.record(z.any()).default({}),
  steps: z.array(WorkflowStepSchema),
  errorHandling: z.object({
    strategy: z.enum(["stop", "continue", "retry"]).default("stop"),
    maxRetries: z.number().default(3),
    retryDelay: z.number().default(1000),
  }).default({}),
  metadata: z.record(z.any()).default({}),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "running" | "completed" | "failed" | "paused";
  startTime: number;
  endTime?: number;
  currentStep?: string;
  variables: Record<string, any>;
  results: Record<string, any>;
  errors: Array<{ step: string; error: string; timestamp: number }>;
  logs: Array<{ timestamp: number; level: string; message: string; step?: string }>;
}

export class CustomWorkflowManager extends EventEmitter {
  private workflows = new Map<string, Workflow>();
  private executions = new Map<string, WorkflowExecution>();
  private workflowsDir: string;
  private maxExecutions = 1000;

  constructor(workflowsDir = "./workflows") {
    super();
    this.workflowsDir = workflowsDir;
    this.initializeWorkflows();
  }

  private async initializeWorkflows(): Promise<void> {
    try {
      await fs.mkdir(this.workflowsDir, { recursive: true });
      await this.loadWorkflows();
      await this.createDefaultWorkflows();
      console.error(`[${new Date().toISOString()}] Custom Workflow Manager initialized`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to initialize workflows:`, error);
    }
  }

  // Load workflows from disk
  private async loadWorkflows(): Promise<void> {
    try {
      const files = await fs.readdir(this.workflowsDir);
      const workflowFiles = files.filter(f => f.endsWith(".json"));

      for (const file of workflowFiles) {
        try {
          const content = await fs.readFile(path.join(this.workflowsDir, file), "utf-8");
          const workflowData = JSON.parse(content);
          const workflow = WorkflowSchema.parse(workflowData);
          this.workflows.set(workflow.id, workflow);
          console.error(`[${new Date().toISOString()}] Loaded workflow: ${workflow.name}`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Failed to load workflow ${file}:`, error);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load workflows:`, error);
    }
  }

  // Create default workflow templates
  private async createDefaultWorkflows(): Promise<void> {
    const defaultWorkflows = [
      {
        id: "netlify-ci-cd-pipeline",
        name: "Complete CI/CD Pipeline",
        description: "Full CI/CD pipeline with testing, building, and deployment",
        category: "deployment",
        tags: ["ci-cd", "testing", "deployment"],
        arguments: [
          { name: "repositoryPath", type: "string", description: "Path to repository", required: true },
          { name: "branch", type: "string", description: "Branch to deploy", defaultValue: "main" },
          { name: "environment", type: "string", description: "Target environment", defaultValue: "production" },
          { name: "runTests", type: "boolean", description: "Run tests before deployment", defaultValue: true },
        ],
        steps: [
          {
            id: "validate-repo",
            name: "Validate Repository",
            description: "Check if repository exists and is accessible",
            type: "condition",
            condition: "fs.existsSync(variables.repositoryPath)",
            onSuccess: "install-dependencies",
            onFailure: "report-error",
          },
          {
            id: "install-dependencies",
            name: "Install Dependencies",
            description: "Install project dependencies",
            type: "tool",
            tool: "shell_execute",
            parameters: { command: "npm ci", cwd: "${repositoryPath}" },
            onSuccess: "run-tests",
            onFailure: "report-error",
          },
          {
            id: "run-tests",
            name: "Run Tests",
            description: "Execute test suite",
            type: "condition",
            condition: "arguments.runTests",
            onSuccess: "execute-tests",
            onFailure: "build-project",
          },
          {
            id: "execute-tests",
            name: "Execute Tests",
            description: "Run the test command",
            type: "tool",
            tool: "shell_execute",
            parameters: { command: "npm test", cwd: "${repositoryPath}" },
            onSuccess: "build-project",
            onFailure: "report-error",
          },
          {
            id: "build-project",
            name: "Build Project",
            description: "Build the project for deployment",
            type: "tool",
            tool: "netlify_build_site",
            parameters: { siteId: "${siteId}" },
            onSuccess: "deploy-site",
            onFailure: "report-error",
          },
          {
            id: "deploy-site",
            name: "Deploy to Netlify",
            description: "Deploy the built site",
            type: "tool",
            tool: "netlify_deploy_site",
            parameters: {
              path: "${repositoryPath}/dist",
              prod: "${environment === 'production'}",
              message: "Automated deployment from ${branch}",
            },
            onSuccess: "verify-deployment",
            onFailure: "report-error",
          },
          {
            id: "verify-deployment",
            name: "Verify Deployment",
            description: "Verify the deployment was successful",
            type: "tool",
            tool: "netlify_get_site_info",
            parameters: { siteId: "${siteId}" },
            onSuccess: "notify-success",
            onFailure: "report-error",
          },
          {
            id: "notify-success",
            name: "Notify Success",
            description: "Send success notification",
            type: "tool",
            tool: "send_notification",
            parameters: {
              message: "Deployment successful for ${siteId}",
              type: "success",
            },
          },
          {
            id: "report-error",
            name: "Report Error",
            description: "Report deployment error",
            type: "tool",
            tool: "send_notification",
            parameters: {
              message: "Deployment failed: ${lastError}",
              type: "error",
            },
          },
        ],
      },
      {
        id: "site-health-check",
        name: "Site Health Check",
        description: "Comprehensive site health monitoring",
        category: "monitoring",
        tags: ["health", "monitoring", "diagnostics"],
        arguments: [
          { name: "siteId", type: "string", description: "Site ID to check", required: true },
          { name: "checkFunctions", type: "boolean", description: "Check functions", defaultValue: true },
          { name: "checkForms", type: "boolean", description: "Check forms", defaultValue: true },
        ],
        steps: [
          {
            id: "get-site-info",
            name: "Get Site Information",
            description: "Retrieve basic site information",
            type: "tool",
            tool: "netlify_get_site_info",
            parameters: { siteId: "${siteId}" },
            onSuccess: "check-recent-deploys",
          },
          {
            id: "check-recent-deploys",
            name: "Check Recent Deploys",
            description: "Check the status of recent deployments",
            type: "tool",
            tool: "netlify_list_deploys",
            parameters: { siteId: "${siteId}" },
            onSuccess: "parallel-checks",
          },
          {
            id: "parallel-checks",
            name: "Run Parallel Checks",
            description: "Run multiple checks in parallel",
            type: "parallel",
            parallel: ["check-functions", "check-forms", "check-env-vars"],
          },
          {
            id: "check-functions",
            name: "Check Functions",
            description: "Check Netlify Functions",
            type: "condition",
            condition: "arguments.checkFunctions",
            onSuccess: "list-functions",
            onFailure: "generate-report",
          },
          {
            id: "list-functions",
            name: "List Functions",
            description: "Get function list and status",
            type: "tool",
            tool: "netlify_list_functions",
            parameters: { siteId: "${siteId}" },
          },
          {
            id: "check-forms",
            name: "Check Forms",
            description: "Check form submissions",
            type: "condition",
            condition: "arguments.checkForms",
            onSuccess: "get-form-submissions",
            onFailure: "generate-report",
          },
          {
            id: "get-form-submissions",
            name: "Get Form Submissions",
            description: "Retrieve recent form submissions",
            type: "tool",
            tool: "netlify_get_form_submissions",
            parameters: { siteId: "${siteId}" },
          },
          {
            id: "check-env-vars",
            name: "Check Environment Variables",
            description: "Validate environment configuration",
            type: "tool",
            tool: "netlify_get_env_var",
            parameters: { siteId: "${siteId}", key: "NODE_ENV" },
          },
          {
            id: "generate-report",
            name: "Generate Health Report",
            description: "Compile health check report",
            type: "tool",
            tool: "generate_health_report",
            parameters: { results: "${allResults}" },
          },
        ],
      },
    ];

    for (const workflow of defaultWorkflows) {
      if (!this.workflows.has(workflow.id)) {
        await this.saveWorkflow(workflow as Workflow);
      }
    }
  }

  // Save workflow to disk
  async saveWorkflow(workflow: Workflow): Promise<void> {
    try {
      // Validate workflow
      const validatedWorkflow = WorkflowSchema.parse(workflow);
      this.workflows.set(validatedWorkflow.id, validatedWorkflow);

      // Save to disk
      const filename = `${validatedWorkflow.id}.json`;
      const filepath = path.join(this.workflowsDir, filename);
      await fs.writeFile(filepath, JSON.stringify(validatedWorkflow, null, 2));

      console.error(`[${new Date().toISOString()}] Saved workflow: ${validatedWorkflow.name}`);
      this.emit("workflow-saved", validatedWorkflow);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to save workflow:`, error);
      throw error;
    }
  }

  // Get all workflows
  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  // Get workflow by ID
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  // Delete workflow
  async deleteWorkflow(id: string): Promise<void> {
    try {
      if (!this.workflows.has(id)) {
        throw new Error(`Workflow ${id} not found`);
      }

      this.workflows.delete(id);

      // Delete from disk
      const filename = `${id}.json`;
      const filepath = path.join(this.workflowsDir, filename);
      await fs.unlink(filepath);

      console.error(`[${new Date().toISOString()}] Deleted workflow: ${id}`);
      this.emit("workflow-deleted", id);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to delete workflow:`, error);
      throw error;
    }
  }

  // Execute workflow
  async executeWorkflow(
    workflowId: string,
    arguments_: Record<string, any> = {},
    context: any = {}
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Validate arguments
    for (const arg of workflow.arguments) {
      if (arg.required && !(arg.name in arguments_)) {
        throw new Error(`Required argument ${arg.name} not provided`);
      }
    }

    // Create execution
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: "running",
      startTime: Date.now(),
      variables: { ...workflow.variables, ...arguments_ },
      results: {},
      errors: [],
      logs: [],
    };

    this.executions.set(executionId, execution);
    this.emit("execution-started", execution);

    // Start execution
    this.runWorkflowExecution(execution, workflow, context);

    return executionId;
  }

  // Run workflow execution
  private async runWorkflowExecution(
    execution: WorkflowExecution,
    workflow: Workflow,
    context: any
  ): Promise<void> {
    try {
      execution.currentStep = workflow.steps[0]?.id;
      
      while (execution.currentStep && execution.status === "running") {
        const step = workflow.steps.find(s => s.id === execution.currentStep);
        if (!step) {
          throw new Error(`Step ${execution.currentStep} not found`);
        }

        this.log(execution, "info", `Executing step: ${step.name}`, step.id);

        try {
          const result = await this.executeStep(step, execution, workflow, context);
          execution.results[step.id] = result;

          // Determine next step
          execution.currentStep = result.success ? step.onSuccess : step.onFailure;
        } catch (error) {
          this.log(execution, "error", `Step failed: ${error}`, step.id);
          execution.errors.push({
            step: step.id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
          });

          if (workflow.errorHandling.strategy === "stop") {
            execution.status = "failed";
            break;
          } else if (workflow.errorHandling.strategy === "retry") {
            // Implement retry logic
            execution.currentStep = step.id; // Retry current step
          } else {
            // Continue to next step
            execution.currentStep = step.onFailure;
          }
        }
      }

      execution.status = execution.status === "running" ? "completed" : execution.status;
      execution.endTime = Date.now();

      this.log(execution, "info", `Workflow ${execution.status}`);
      this.emit("execution-completed", execution);

    } catch (error) {
      execution.status = "failed";
      execution.endTime = Date.now();
      this.log(execution, "error", `Workflow failed: ${error}`);
      this.emit("execution-failed", execution);
    }

    // Clean up old executions
    if (this.executions.size > this.maxExecutions) {
      const oldestExecution = Array.from(this.executions.values())
        .sort((a, b) => a.startTime - b.startTime)[0];
      this.executions.delete(oldestExecution.id);
    }
  }

  // Execute individual step
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    workflow: Workflow,
    context: any
  ): Promise<any> {
    switch (step.type) {
      case "tool":
        return this.executeToolStep(step, execution, context);
      case "condition":
        return this.executeConditionStep(step, execution);
      case "delay":
        return this.executeDelayStep(step);
      case "parallel":
        return this.executeParallelStep(step, execution, workflow, context);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  // Execute tool step
  private async executeToolStep(step: WorkflowStep, execution: WorkflowExecution, context: any): Promise<any> {
    if (!step.tool) {
      throw new Error("Tool step requires tool name");
    }

    // Interpolate parameters
    const parameters = this.interpolateParameters(step.parameters || {}, execution);
    
    // Call tool through context
    if (context.callTool) {
      const result = await context.callTool(step.tool, parameters);
      return { success: true, result };
    } else {
      throw new Error("Tool execution context not available");
    }
  }

  // Execute condition step
  private executeConditionStep(step: WorkflowStep, execution: WorkflowExecution): any {
    if (!step.condition) {
      throw new Error("Condition step requires condition");
    }

    try {
      // Simple condition evaluation (could be enhanced with a proper expression parser)
      const condition = this.interpolateString(step.condition, execution);
      const result = eval(condition); // Note: In production, use a safe expression evaluator
      return { success: result };
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${error}`);
    }
  }

  // Execute delay step
  private async executeDelayStep(step: WorkflowStep): Promise<any> {
    const delay = step.delayMs || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    return { success: true };
  }

  // Execute parallel step
  private async executeParallelStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    workflow: Workflow,
    context: any
  ): Promise<any> {
    if (!step.parallel) {
      throw new Error("Parallel step requires parallel step IDs");
    }

    const parallelSteps = step.parallel.map(stepId => 
      workflow.steps.find(s => s.id === stepId)
    ).filter(s => s !== undefined);

    const results = await Promise.allSettled(
      parallelSteps.map(parallelStep => 
        this.executeStep(parallelStep!, execution, workflow, context)
      )
    );

    return { 
      success: results.every(r => r.status === "fulfilled"),
      results: results.map((r, i) => ({
        stepId: parallelSteps[i]!.id,
        result: r.status === "fulfilled" ? r.value : r.reason,
      }))
    };
  }

  // Interpolate parameters with variables
  private interpolateParameters(parameters: Record<string, any>, execution: WorkflowExecution): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === "string") {
        result[key] = this.interpolateString(value, execution);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // Interpolate string with variables
  private interpolateString(str: string, execution: WorkflowExecution): string {
    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      if (varName.startsWith("arguments.")) {
        const argName = varName.substring(10);
        return execution.variables[argName] || match;
      } else if (varName.startsWith("variables.")) {
        const varNameOnly = varName.substring(10);
        return execution.variables[varNameOnly] || match;
      } else {
        return execution.variables[varName] || match;
      }
    });
  }

  // Log execution events
  private log(execution: WorkflowExecution, level: string, message: string, step?: string): void {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      step,
    };
    
    execution.logs.push(logEntry);
    console.error(`[${new Date().toISOString()}] [${execution.id}] ${level.toUpperCase()}: ${message}`);
  }

  // Get execution status
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  // Get all executions
  getExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  // Cancel execution
  cancelExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === "running") {
      execution.status = "paused";
      execution.endTime = Date.now();
      this.log(execution, "info", "Execution cancelled");
      this.emit("execution-cancelled", execution);
    }
  }

  // Import workflow from JSON
  async importWorkflow(workflowData: any): Promise<void> {
    const workflow = WorkflowSchema.parse(workflowData);
    await this.saveWorkflow(workflow);
  }

  // Export workflow to JSON
  exportWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  // Search workflows
  searchWorkflows(query: string): Workflow[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.workflows.values()).filter(workflow =>
      workflow.name.toLowerCase().includes(lowercaseQuery) ||
      workflow.description.toLowerCase().includes(lowercaseQuery) ||
      workflow.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }
}
