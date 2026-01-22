import { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health';
import workflowRoutes from './workflows';
import webhookRoutes from './webhooks';
import eventRoutes from './events';
import scheduleRoutes from './schedules';

/**
 * Register all routes
 */
const routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(healthRoutes);
  fastify.register(workflowRoutes);
  fastify.register(webhookRoutes);
  fastify.register(eventRoutes);
  fastify.register(scheduleRoutes);
};

export default routes;
