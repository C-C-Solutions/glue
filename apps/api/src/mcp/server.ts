import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WorkflowRepository, ExecutionRepository } from "@glue/db";
import { WorkflowQueue } from "@glue/queue";
import { TriggerManager } from "../triggers";
import { WorkflowDefinition, InternalEvent } from "@glue/core";

/**
 * Create and configure MCP server with all API endpoints as tools
 */
export function createMCPServer(
  workflowRepo: WorkflowRepository,
  executionRepo: ExecutionRepository,
  workflowQueue: WorkflowQueue,
  triggerManager: TriggerManager,
) {
  const server = new Server(
    {
      name: "glue-workflow-api",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Health check tool
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "health_check",
          description: "Check the health status of the API server",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "create_workflow",
          description: "Create a new workflow definition with steps and triggers",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique workflow ID" },
              name: { type: "string", description: "Workflow name" },
              version: { type: "string", description: "Workflow version" },
              description: {
                type: "string",
                description: "Workflow description",
              },
              trigger: {
                type: "object",
                description: "Workflow trigger configuration",
              },
              steps: {
                type: "array",
                description: "Array of workflow steps",
              },
            },
            required: ["id", "name", "version", "steps"],
          },
        },
        {
          name: "list_workflows",
          description:
            "List all workflow definitions with pagination support",
          inputSchema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Maximum number of workflows to return",
                default: 100,
              },
              skip: {
                type: "number",
                description: "Number of workflows to skip",
                default: 0,
              },
            },
          },
        },
        {
          name: "get_workflow",
          description: "Get a specific workflow definition by ID",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Workflow ID" },
            },
            required: ["id"],
          },
        },
        {
          name: "execute_workflow",
          description: "Queue a workflow for execution with optional input data",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Workflow ID to execute" },
              input: {
                type: "object",
                description: "Input data for the workflow execution",
              },
            },
            required: ["id"],
          },
        },
        {
          name: "list_workflow_executions",
          description: "Get a paginated list of executions for a specific workflow",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Workflow ID" },
              limit: {
                type: "number",
                description: "Maximum number of executions to return",
                default: 10,
              },
              skip: {
                type: "number",
                description: "Number of executions to skip",
                default: 0,
              },
            },
            required: ["id"],
          },
        },
        {
          name: "get_job_status",
          description: "Get the status of a queued job and its associated execution",
          inputSchema: {
            type: "object",
            properties: {
              jobId: { type: "string", description: "Job ID" },
            },
            required: ["jobId"],
          },
        },
        {
          name: "get_execution",
          description: "Get detailed information about a specific workflow execution",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Execution ID" },
            },
            required: ["id"],
          },
        },
        {
          name: "cancel_execution",
          description: "Cancel a running or queued workflow execution",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Execution ID to cancel" },
            },
            required: ["id"],
          },
        },
        {
          name: "publish_event",
          description: "Publish an internal event to trigger workflows",
          inputSchema: {
            type: "object",
            properties: {
              eventType: { type: "string", description: "Type of event" },
              source: { type: "string", description: "Source of the event" },
              data: { type: "object", description: "Event data payload" },
              timestamp: {
                type: "string",
                description: "Event timestamp (ISO format)",
              },
              metadata: { type: "object", description: "Additional metadata" },
            },
            required: ["eventType"],
          },
        },
        {
          name: "list_event_triggers",
          description: "Get all workflows registered to listen for events",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "list_schedules",
          description: "Get all workflows registered with cron schedules",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "list_webhooks",
          description: "Get all workflows registered as webhook endpoints",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  // Tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "health_check": {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "ok",
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "create_workflow": {
          const workflow = args as unknown as WorkflowDefinition;

          if (!workflow.id || !workflow.name || !workflow.version) {
            throw new Error("Missing required fields: id, name, version");
          }

          const created = await workflowRepo.create(workflow);

          // Register workflow with trigger manager
          try {
            await triggerManager.registerWorkflow(created);
          } catch (error) {
            console.warn(`Failed to register workflow trigger: ${error}`);
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(created, null, 2),
              },
            ],
          };
        }

        case "list_workflows": {
          const { limit = 100, skip = 0 } = args as {
            limit?: number;
            skip?: number;
          };
          const workflows = await workflowRepo.findAll(
            Number(limit),
            Number(skip),
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    workflows,
                    count: workflows.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "get_workflow": {
          const { id } = args as { id: string };
          const workflow = await workflowRepo.findById(id);

          if (!workflow) {
            throw new Error("Workflow not found");
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(workflow, null, 2),
              },
            ],
          };
        }

        case "execute_workflow": {
          const { id, input = {} } = args as { id: string; input?: any };

          // Check if workflow exists
          const workflow = await workflowRepo.findById(id);
          if (!workflow) {
            throw new Error("Workflow not found");
          }

          // Add job to queue
          const jobId = await workflowQueue.addExecuteJob(id, input);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    message: "Workflow execution queued",
                    jobId,
                    workflowId: id,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "list_workflow_executions": {
          const { id, limit = 10, skip = 0 } = args as {
            id: string;
            limit?: number;
            skip?: number;
          };

          const executions = await executionRepo.findByWorkflowId(
            id,
            Number(limit),
            Number(skip),
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    executions,
                    count: executions.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "get_job_status": {
          const { jobId } = args as { jobId: string };

          // Get job from queue
          const job = await workflowQueue.getJob(jobId);

          if (!job) {
            throw new Error("Job not found");
          }

          const jobState = await job.getState();
          const jobData = job.data;

          // Try to find the execution if the job completed
          let execution = null;
          let workflowId: string | null = null;

          if (jobData.type === "execute") {
            workflowId = jobData.workflowId;

            if (jobState === "completed" || jobState === "failed") {
              const executions = await executionRepo.findByWorkflowId(
                workflowId,
                100,
                0,
              );
              execution = executions.find(
                (e) =>
                  Math.abs(new Date(e.startedAt).getTime() - job.processedOn!) <
                  5000,
              );
            }
          } else if (jobData.type === "resume") {
            execution = await executionRepo.findById(jobData.executionId);
            workflowId = execution?.workflowId || null;
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    jobId: job.id,
                    jobState,
                    workflowId,
                    executionId: execution?.id || null,
                    execution: execution || null,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "get_execution": {
          const { id } = args as { id: string };
          const execution = await executionRepo.findById(id);

          if (!execution) {
            throw new Error("Execution not found");
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(execution, null, 2),
              },
            ],
          };
        }

        case "cancel_execution": {
          const { id } = args as { id: string };

          // Update execution status to cancelled
          const execution = await executionRepo.update(id, {
            status: "cancelled",
          });

          if (!execution) {
            throw new Error("Execution not found");
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    message: "Execution cancelled",
                    execution,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "publish_event": {
          const body = args as any;

          if (!body.eventType) {
            throw new Error("Missing required field: eventType");
          }

          const event: InternalEvent = {
            eventType: body.eventType,
            source: body.source,
            data: body.data || {},
            timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
            metadata: body.metadata,
          };

          const jobIds = await triggerManager.publishEvent(event);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    message: "Event published successfully",
                    eventType: event.eventType,
                    triggeredWorkflows: jobIds.length,
                    jobIds,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "list_event_triggers": {
          const eventHandler = triggerManager.getEventHandler();
          const registrations = eventHandler.getAllRegistrations();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    eventTriggers: registrations.map((reg) => ({
                      workflowId: reg.workflowId,
                      workflowName: reg.workflow.name,
                      eventType: reg.config.eventType,
                      source: reg.config.source,
                      filters: reg.config.filters,
                    })),
                    count: registrations.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "list_schedules": {
          const scheduleHandler = triggerManager.getScheduleHandler();
          const registrations = scheduleHandler.getAllRegistrations();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    schedules: registrations.map((reg) => ({
                      workflowId: reg.workflowId,
                      workflowName: reg.workflow.name,
                      cron: reg.config.cron,
                      timezone: reg.config.timezone || "UTC",
                      repeatableKey: reg.repeatableKey,
                    })),
                    count: registrations.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "list_webhooks": {
          const webhookHandler = triggerManager.getWebhookHandler();
          const registrations = webhookHandler.getAllRegistrations();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    webhooks: registrations.map((reg) => ({
                      workflowId: reg.workflowId,
                      workflowName: reg.workflow.name,
                      path: reg.config.path,
                      method: reg.config.method || "POST",
                      authentication: reg.config.authentication?.type || "none",
                    })),
                    count: registrations.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error:
                  error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start MCP server on stdio transport
 */
export async function startMCPServer(
  workflowRepo: WorkflowRepository,
  executionRepo: ExecutionRepository,
  workflowQueue: WorkflowQueue,
  triggerManager: TriggerManager,
) {
  const server = createMCPServer(
    workflowRepo,
    executionRepo,
    workflowQueue,
    triggerManager,
  );
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Glue MCP server running on stdio");
}
