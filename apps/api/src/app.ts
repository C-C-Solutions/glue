import Fastify from 'fastify';
import plugins from './plugins';
import routes from './routes';

/**
 * Build Fastify application
 */
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });
  
  // Register plugins
  await app.register(plugins);
  
  // Register routes
  await app.register(routes);
  
  return app;
}
