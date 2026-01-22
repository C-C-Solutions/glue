import { Queue } from "bullmq";
import { getRedisConnection } from "../connection";
import {
  ExecuteWorkflowJob,
  ResumeWorkflowJob,
  WorkflowJobData,
} from "../jobs";

/**
 * Workflow queue name constant
 */
export const WORKFLOW_QUEUE_NAME = "glue-workflows";

/**
 * Workflow queue wrapper
 */
export class WorkflowQueue {
  private queue: Queue<WorkflowJobData>;

  constructor(redisUrl: string) {
    const connection = getRedisConnection(redisUrl);

    this.queue = new Queue(WORKFLOW_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
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
  async addExecuteJob(
    workflowId: string,
    input: Record<string, unknown>,
  ): Promise<string> {
    const job = await this.queue.add(
      "execute-workflow",
      {
        type: "execute",
        workflowId,
        input,
      } as ExecuteWorkflowJob,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    if (!job.id) {
      throw new Error('Failed to create workflow job: job ID is undefined');
    }

    return job.id;
  }

  /**
   * Add resume workflow job
   */
  async addResumeJob(executionId: string): Promise<string> {
    const job = await this.queue.add(
      "resume-workflow",
      {
        type: "resume",
        executionId,
      } as ResumeWorkflowJob,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    );

    if (!job.id) {
      throw new Error('Failed to create resume job: job ID is undefined');
    }

    return job.id;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    return this.queue.getJob(jobId);
  }

  /**
   * Get queue instance for worker
   */
  getQueue(): Queue<WorkflowJobData> {
    return this.queue;
  }
  
  /**
   * Add repeatable job for scheduled workflows
   */
  async addRepeatableJob(
    workflowId: string,
    cron: string,
    timezone: string = 'UTC'
  ): Promise<string> {
    const job = await this.queue.add(
      'execute-workflow-scheduled',
      {
        type: 'execute',
        workflowId,
        input: {
          trigger: 'schedule',
          scheduledAt: new Date().toISOString(),
        },
      } as ExecuteWorkflowJob,
      {
        repeat: {
          pattern: cron,
          tz: timezone,
        },
      }
    );

    if (!job.id) {
      throw new Error('Failed to create repeatable job: job ID is undefined');
    }

    return job.id;
  }

  /**
   * Remove repeatable job
   */
  async removeRepeatableJob(workflowId: string, cron: string, timezone: string = 'UTC'): Promise<boolean> {
    try {
      await this.queue.removeRepeatable('execute-workflow-scheduled', {
        pattern: cron,
        tz: timezone,
      });
      return true;
    } catch (error) {
      console.error(`Failed to remove repeatable job for workflow ${workflowId}:`, error);
      return false;
    }
  }
  
  /**
   * Get all repeatable jobs
   */
  async getRepeatableJobs() {
    return this.queue.getRepeatableJobs();
  }
}
