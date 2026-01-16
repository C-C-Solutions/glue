import cors from '@fastify/cors';
import { FastifyPluginAsync } from 'fastify';

/**
 * Register plugins
 */
const plugins: FastifyPluginAsync = async (fastify) => {
  // CORS plugin
  await fastify.register(cors, {
    origin: true,
  });
};

export default plugins;
