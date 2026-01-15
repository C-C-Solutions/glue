import { Queue, QueueOptions } from 'bullmq';
import { getRedisConnection } from '../connection';
import { WorkflowJobData } from '../jobs';

/**
 * Workflow queue name constant
 */
export const WORKFLOW_QUEUE_NAME = 'glue:workflows';

/**
 * Workflow queue instance
 */
let workflowQueue: WorkflowQueue | null = null;

/**
 * Workflow queue wrapper
 */
export class WorkflowQueue {
  private queue: import('bullmq').Queue<WorkflowJobData>;
  
  constructor(redisUrl: string) {
    const { Queue } = require('bullmq');
    const { getRedisConnection } = require('../connection');
    
    const connection = getRedisConnection(redisUrl);
    
    this.queue = new Queue(WORKFLOW_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 7 days
        },
      },
    });
  }
  
  /**
   * Add execute workflow job
   */
  async addExecuteJob(workflowId: string, input: Record<string, unknown>): Promise<string> {
    const job = await this.queue.add(
      'execute-workflow',
      {
        type: 'execute',
        workflowId,
        input,
      } as ExecuteWorkflowJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
    
    return job.id!;
  }
  
  /**
   * Add resume workflow job
   */
  async addResumeJob(executionId: string): Promise<string> {
    const job = await this.queue.add(
      'resume-workflow',
      {
        type: 'resume',
        executionId,
      } as ResumeWorkflowJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
    
    return job.id!;
  }
  
  /**
   * Get queue instance for worker
   */
  getQueue(): Queue<WorkflowJobData> {
    return this.queue;
  }
}
