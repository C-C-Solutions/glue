import 'dotenv/config';
import { loadEnv } from '@glue/config';
import { connectToDatabase, WorkflowRepository } from '@glue/db';
import { WorkflowQueue } from '@glue/queue';
import { buildApp } from './app';
import { TriggerManager } from './triggers';

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
    
    // Create workflow repository
    const workflowRepo = new WorkflowRepository();
    
    // Initialize trigger manager
    const triggerManager = new TriggerManager(workflowRepo, workflowQueue);
    await triggerManager.initialize();
    
    // Build Fastify app
    const app = await buildApp();
    
    // Attach queue and trigger manager to app context
    (app as any).workflowQueue = workflowQueue;
    (app as any).triggerManager = triggerManager;
    
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
