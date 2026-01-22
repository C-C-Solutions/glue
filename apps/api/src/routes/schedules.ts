import { FastifyPluginAsync } from 'fastify';
import { TriggerManager } from '../triggers';

/**
 * Schedule routes - for managing scheduled workflows
 */
const scheduleRoutes: FastifyPluginAsync = async (fastify) => {
  const getTriggerManager = (): TriggerManager => {
    return (fastify as any).triggerManager;
  };

  /**
   * List all registered scheduled workflows
   */
  fastify.get('/schedules', async (_request, reply) => {
    try {
      const triggerManager = getTriggerManager();
      const scheduleHandler = triggerManager.getScheduleHandler();
      const registrations = scheduleHandler.getAllRegistrations();

      return reply.send({
        schedules: registrations.map((reg) => ({
          workflowId: reg.workflowId,
          workflowName: reg.workflow.name,
          cron: reg.config.cron,
          timezone: reg.config.timezone || 'UTC',
          repeatableKey: reg.repeatableKey,
        })),
        count: registrations.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to list schedules',
      });
    }
  });
};

export default scheduleRoutes;
