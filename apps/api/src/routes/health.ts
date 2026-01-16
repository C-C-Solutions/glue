import { FastifyPluginAsync } from 'fastify';

/**
 * Health check route
 */
const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
};

export default healthRoutes;
