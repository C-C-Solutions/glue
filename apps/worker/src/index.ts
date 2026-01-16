import 'dotenv/config';
import { Worker } from 'bullmq';
import { loadEnv } from '@glue/config';
import { connectToDatabase } from '@glue/db';
import { getRedisConnection, WORKFLOW_QUEUE_NAME } from '@glue/queue';
import { WorkflowProcessor } from './processors';

/**
 * Start the worker
 */
async function start() {
  try {
    // Load and validate environment variables
    const env = loadEnv();
    
    // Connect to MongoDB
    await connectToDatabase(env.MONGODB_URI);
    
    // Create Redis connection
    const connection = getRedisConnection(env.REDIS_URL);
    
    // Create workflow processor
    const processor = new WorkflowProcessor();
    
    // Create worker
    const worker = new Worker(
      WORKFLOW_QUEUE_NAME,
      async (job) => {
        await processor.process(job);
      },
      {
        connection,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );
    
    // Worker event handlers
    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });
    
    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err.message);
    });
    
    worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
    
    console.log(`🔄 Worker started, processing jobs from queue: ${WORKFLOW_QUEUE_NAME}`);
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down worker...');
      await worker.close();
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

start();
