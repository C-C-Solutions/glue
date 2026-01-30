import { WorkflowDefinition } from "@glue/core";
import { ExecutionRepository, WorkflowRepository } from "@glue/db";
import { WorkflowQueue } from "@glue/queue";
import { FastifyPluginAsync } from "fastify";
import { TriggerManager } from "../triggers";

/**
 * Workflow routes
 */
const workflowRoutes: FastifyPluginAsync = async (fastify) => {
  const workflowRepo = new WorkflowRepository();
  const executionRepo = new ExecutionRepository();

  // Get workflow queue from app context
  const getWorkflowQueue = (): WorkflowQueue => {
    return (fastify as any).workflowQueue;
  };

  // Get trigger manager from app context
  const getTriggerManager = (): TriggerManager => {
    return (fastify as any).triggerManager;
  };

  /**
   * Create workflow definition
   */
  fastify.post(
    "/workflows",
    {
      schema: {
        tags: ["workflows"],
        summary: "Create a new workflow",
        description: "Create a new workflow definition with steps and triggers",
        body: {
          type: "object",
          required: ["id", "name", "version"],
          properties: {
            id: { type: "string", description: "Unique workflow identifier" },
            name: { type: "string", description: "Workflow name" },
            version: { type: "string", description: "Workflow version" },
            description: { type: "string" },
            steps: {
              type: "array",
              items: { type: "object" },
            },
            trigger: { type: "object" },
          },
        },
        response: {
          201: {
            type: "object",
            description: "Workflow created successfully",
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const workflow = request.body as WorkflowDefinition;

        // Validate required fields
        if (!workflow.id || !workflow.name || !workflow.version) {
          return reply.code(400).send({
            error: "Missing required fields: id, name, version",
          });
        }

        const created = await workflowRepo.create(workflow);

        // Register workflow with trigger manager
        try {
          const triggerManager = getTriggerManager();
          await triggerManager.registerWorkflow(created);
        } catch (error) {
          fastify.log.warn(`Failed to register workflow trigger: ${error}`);
        }

        return reply.code(201).send(created);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to create workflow",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  /**
   * List all workflows
   */
  fastify.get(
    "/workflows",
    {
      schema: {
        tags: ["workflows"],
        summary: "List all workflows",
        description: "Retrieve a paginated list of all workflow definitions",
        querystring: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              default: 100,
              description: "Maximum number of workflows to return",
            },
            skip: {
              type: "number",
              default: 0,
              description: "Number of workflows to skip",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              workflows: { type: "array", items: { type: "object" } },
              count: { type: "number" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { limit = 100, skip = 0 } = request.query as any;
        const workflows = await workflowRepo.findAll(
          Number(limit),
          Number(skip),
        );
        return reply.send({
          workflows,
          count: workflows.length,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to list workflows",
        });
      }
    },
  );

  /**
   * Get workflow by ID
   */
  fastify.get(
    "/workflows/:id",
    {
      schema: {
        tags: ["workflows"],
        summary: "Get workflow by ID",
        description: "Retrieve a specific workflow definition by its ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Workflow ID" },
          },
        },
        response: {
          200: {
            type: "object",
            description: "Workflow found",
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const workflow = await workflowRepo.findById(id);

        if (!workflow) {
          return reply.code(404).send({
            error: "Workflow not found",
          });
        }

        return reply.send(workflow);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to get workflow",
        });
      }
    },
  );

  /**
   * Execute workflow
   */
  fastify.post(
    "/workflows/:id/execute",
    {
      schema: {
        tags: ["workflows", "executions"],
        summary: "Execute a workflow",
        description: "Queue a workflow for execution with optional input data",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Workflow ID" },
          },
        },
        body: {
          type: "object",
          description: "Input data for workflow execution",
          additionalProperties: true,
        },
        response: {
          202: {
            type: "object",
            properties: {
              message: { type: "string" },
              jobId: { type: "string" },
              workflowId: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const input = (request.body as any) || {};

        // Check if workflow exists
        const workflow = await workflowRepo.findById(id);
        if (!workflow) {
          return reply.code(404).send({
            error: "Workflow not found",
          });
        }

        // Add job to queue
        const queue = getWorkflowQueue();
        const jobId = await queue.addExecuteJob(id, input);

        return reply.code(202).send({
          message: "Workflow execution queued",
          jobId,
          workflowId: id,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to execute workflow",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  /**
   * List workflow executions
   */
  fastify.get("/workflows/:id/executions", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { limit = 10, skip = 0 } = request.query as any;

      const executions = await executionRepo.findByWorkflowId(
        id,
        Number(limit),
        Number(skip),
      );

      return reply.send({
        executions,
        count: executions.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: "Failed to list executions",
      });
    }
  });

  /**
   * Get job status (job ID to execution mapping)
   */
  fastify.get("/jobs/:jobId", async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const queue = getWorkflowQueue();

      // Get job from queue
      const job = await queue.getJob(jobId);

      if (!job) {
        return reply.code(404).send({
          error: "Job not found",
        });
      }

      const jobState = await job.getState();
      const jobData = job.data;

      // Try to find the execution if the job completed
      let execution = null;
      let workflowId: string | null = null;

      if (jobData.type === "execute") {
        workflowId = jobData.workflowId;

        if (jobState === "completed" || jobState === "failed") {
          // Search for executions by workflow ID (recent ones)
          const executions = await executionRepo.findByWorkflowId(
            workflowId,
            100,
            0,
          );
          // Find execution that matches the approximate time (jobs and executions should be close in time)
          // This is a heuristic - ideally we'd store execution ID in job return value
          execution = executions.find(
            (e) =>
              Math.abs(new Date(e.startedAt).getTime() - job.processedOn!) <
              5000,
          );
        }
      } else if (jobData.type === "resume") {
        // For resume jobs, try to get the execution directly
        execution = await executionRepo.findById(jobData.executionId);
        workflowId = execution?.workflowId || null;
      }

      return reply.send({
        jobId: job.id,
        jobState,
        workflowId,
        executionId: execution?.id || null,
        execution: execution || null,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: "Failed to get job status",
      });
    }
  });

  /**
   * Get execution status by execution ID
   */
  fastify.get("/executions/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const execution = await executionRepo.findById(id);

      if (!execution) {
        return reply.code(404).send({
          error: "Execution not found",
        });
      }

      return reply.send(execution);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: "Failed to get execution",
      });
    }
  });

  /**
   * Cancel execution
   */
  fastify.post("/executions/:id/cancel", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Update execution status to cancelled
      const execution = await executionRepo.update(id, { status: "cancelled" });

      if (!execution) {
        return reply.code(404).send({
          error: "Execution not found",
        });
      }

      return reply.send({
        message: "Execution cancelled",
        execution,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: "Failed to cancel execution",
      });
    }
  });
};

export default workflowRoutes;
