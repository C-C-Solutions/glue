import { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health';
import workflowRoutes from './workflows';

/**
 * Register all routes
 */
const routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(healthRoutes);
  fastify.register(workflowRoutes);
};

export default routes;
