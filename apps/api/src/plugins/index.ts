import { FastifyPluginAsync } from 'fastify';

/**
 * Register plugins
 */
const plugins: FastifyPluginAsync = async (fastify) => {
  // CORS plugin
  await fastify.register(require('@fastify/cors'), {
    origin: true,
  });
};

export default plugins;
