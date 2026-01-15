import 'dotenv/config';
import { loadEnv } from '@glue/config';
import { connectToDatabase } from '@glue/db';
import { WorkflowQueue } from '@glue/queue';
import { buildApp } from './app';

/**
 * Start the API server
 */
async function start() {
  try {
    // Load and validate environment variables
    const env = loadEnv();
    
    // Connect to MongoDB
    await connectToDatabase(env.MONGODB_URI);
    
    // Create workflow queue
    const workflowQueue = new WorkflowQueue(env.REDIS_URL);
    
    // Build Fastify app
    const app = await buildApp();
    
    // Attach queue to app context
    (app as any).workflowQueue = workflowQueue;
    
    // Start server
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });
    
    console.log(`🚀 API server started on port ${env.PORT}`);
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

start();
