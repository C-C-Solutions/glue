import { FastifyPluginAsync } from 'fastify';
import { WorkflowRepository, ExecutionRepository } from '@glue/db';
import { WorkflowQueue } from '@glue/queue';
import { WorkflowDefinition } from '@glue/core';

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
  
  /**
   * Create workflow definition
   */
  fastify.post('/workflows', async (request, reply) => {
    try {
      const workflow = request.body as WorkflowDefinition;
      
      // Validate required fields
      if (!workflow.id || !workflow.name || !workflow.version) {
        return reply.code(400).send({
          error: 'Missing required fields: id, name, version',
        });
      }
      
      const created = await workflowRepo.create(workflow);
      return reply.code(201).send(created);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to create workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  /**
   * List all workflows
   */
  fastify.get('/workflows', async (request, reply) => {
    try {
      const { limit = 100, skip = 0 } = request.query as any;
      const workflows = await workflowRepo.findAll(Number(limit), Number(skip));
      return reply.send({
        workflows,
        count: workflows.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to list workflows',
      });
    }
  });
  
  /**
   * Get workflow by ID
   */
  fastify.get('/workflows/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const workflow = await workflowRepo.findById(id);
      
      if (!workflow) {
        return reply.code(404).send({
          error: 'Workflow not found',
        });
      }
      
      return reply.send(workflow);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to get workflow',
      });
    }
  });
  
  /**
   * Execute workflow
   */
  fastify.post('/workflows/:id/execute', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const input = (request.body as any) || {};
      
      // Check if workflow exists
      const workflow = await workflowRepo.findById(id);
      if (!workflow) {
        return reply.code(404).send({
          error: 'Workflow not found',
        });
      }
      
      // Add job to queue
      const queue = getWorkflowQueue();
      const jobId = await queue.addExecuteJob(id, input);
      
      return reply.code(202).send({
        message: 'Workflow execution queued',
        jobId,
        workflowId: id,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to execute workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  /**
   * Get execution status
   */
  fastify.get('/executions/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const execution = await executionRepo.findById(id);
      
      if (!execution) {
        return reply.code(404).send({
          error: 'Execution not found',
        });
      }
      
      return reply.send(execution);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to get execution',
      });
    }
  });
  
  /**
   * Cancel execution
   */
  fastify.post('/executions/:id/cancel', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // Update execution status to cancelled
      const execution = await executionRepo.update(id, { status: 'cancelled' });
      
      if (!execution) {
        return reply.code(404).send({
          error: 'Execution not found',
        });
      }
      
      return reply.send({
        message: 'Execution cancelled',
        execution,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to cancel execution',
      });
    }
  });
};

export default workflowRoutes;
