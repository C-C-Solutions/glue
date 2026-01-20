import { FastifyPluginAsync } from 'fastify';
import { TriggerManager } from '../triggers';
import { InternalEvent } from '@glue/core';

/**
 * Event routes - for publishing internal events
 */
const eventRoutes: FastifyPluginAsync = async (fastify) => {
  const getTriggerManager = (): TriggerManager => {
    return (fastify as any).triggerManager;
  };

  /**
   * Publish an internal event
   */
  fastify.post('/events', async (request, reply) => {
    try {
      const body = request.body as any;

      // Validate event structure
      if (!body.eventType) {
        return reply.code(400).send({
          error: 'Missing required field: eventType',
        });
      }

      const event: InternalEvent = {
        eventType: body.eventType,
        source: body.source,
        data: body.data || {},
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        metadata: body.metadata,
      };

      const triggerManager = getTriggerManager();
      const jobIds = await triggerManager.publishEvent(event);

      return reply.code(200).send({
        message: 'Event published successfully',
        eventType: event.eventType,
        triggeredWorkflows: jobIds.length,
        jobIds,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to publish event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * List all registered event triggers
   */
  fastify.get('/events/triggers', async (_request, reply) => {
    try {
      const triggerManager = getTriggerManager();
      const eventHandler = triggerManager.getEventHandler();
      const registrations = eventHandler.getAllRegistrations();

      return reply.send({
        eventTriggers: registrations.map((reg) => ({
          workflowId: reg.workflowId,
          workflowName: reg.workflow.name,
          eventType: reg.config.eventType,
          source: reg.config.source,
          filters: reg.config.filters,
        })),
        count: registrations.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to list event triggers',
      });
    }
  });
};

export default eventRoutes;
