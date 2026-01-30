import { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health';
import workflowRoutes from './workflows';
import webhookRoutes from './webhooks';
import eventRoutes from './events';
import scheduleRoutes from './schedules';
import connectorRoutes from './connectors';

/**
 * Register all routes
 */
const routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(healthRoutes);
  fastify.register(workflowRoutes);
  fastify.register(webhookRoutes);
  fastify.register(eventRoutes);
  fastify.register(scheduleRoutes);
  fastify.register(connectorRoutes);
};

export default routes;
