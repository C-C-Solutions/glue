import { FastifyPluginAsync } from 'fastify';
import { TriggerManager } from '../triggers';

/**
 * Webhook routes
 */
const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  const getTriggerManager = (): TriggerManager => {
    return (fastify as any).triggerManager;
  };

  /**
   * Webhook handler - catch-all route for webhook triggers
   */
  fastify.all('/webhooks/*', async (request, reply) => {
    try {
      const path = request.url.replace('/webhooks', '');
      const method = request.method;
      const headers: Record<string, string | string[] | undefined> = {};
      
      // Normalize headers to lowercase
      for (const [key, value] of Object.entries(request.headers)) {
        headers[key.toLowerCase()] = value;
      }
      
      const body = (request.body || {}) as Record<string, unknown>;

      const triggerManager = getTriggerManager();
      const webhookHandler = triggerManager.getWebhookHandler();

      const result = await webhookHandler.handleWebhook(
        path,
        method,
        headers,
        body
      );

      return reply.code(200).send({
        message: 'Workflow triggered successfully',
        jobId: result.jobId,
        workflowId: result.workflowId,
      });
    } catch (error) {
      fastify.log.error(error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Determine appropriate status code
      let statusCode = 500;
      if (errorMessage.includes('No webhook registered')) {
        statusCode = 404;
      } else if (errorMessage.includes('Method not allowed')) {
        statusCode = 405;
      } else if (
        errorMessage.includes('authentication') ||
        errorMessage.includes('secret') ||
        errorMessage.includes('token')
      ) {
        statusCode = 401;
      }

      return reply.code(statusCode).send({
        error: 'Webhook execution failed',
        message: errorMessage,
      });
    }
  });

  /**
   * List all registered webhooks
   */
  fastify.get('/webhooks', async (_request, reply) => {
    try {
      const triggerManager = getTriggerManager();
      const webhookHandler = triggerManager.getWebhookHandler();
      const registrations = webhookHandler.getAllRegistrations();

      return reply.send({
        webhooks: registrations.map((reg) => ({
          workflowId: reg.workflowId,
          workflowName: reg.workflow.name,
          path: reg.config.path,
          method: reg.config.method || 'POST',
          authentication: reg.config.authentication?.type || 'none',
        })),
        count: registrations.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to list webhooks',
      });
    }
  });
};

export default webhookRoutes;
