import { Job } from 'bullmq';
import { WorkflowExecutor } from '@glue/core';
import { WorkflowRepository, ExecutionRepository } from '@glue/db';
import { WorkflowJobData, ExecuteWorkflowJob, ResumeWorkflowJob } from '@glue/queue';

/**
 * Workflow processor - handles workflow execution jobs
 */
export class WorkflowProcessor {
  private executor: WorkflowExecutor;
  private workflowRepo: WorkflowRepository;
  private executionRepo: ExecutionRepository;
  
  constructor() {
    this.executor = new WorkflowExecutor();
    this.workflowRepo = new WorkflowRepository();
    this.executionRepo = new ExecutionRepository();
  }
  
  /**
   * Process workflow job
   */
  async process(job: Job<WorkflowJobData>): Promise<void> {
    const { data } = job;
    
    console.log(`Processing job ${job.id} of type ${data.type}`);
    
    try {
      if (data.type === 'execute') {
        await this.processExecute(job as Job<ExecuteWorkflowJob>);
      } else if (data.type === 'resume') {
        await this.processResume(job as Job<ResumeWorkflowJob>);
      } else {
        throw new Error(`Unknown job type: ${(data as any).type}`);
      }
      
      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Process execute workflow job
   */
  private async processExecute(job: Job<ExecuteWorkflowJob>): Promise<void> {
    const { workflowId, input } = job.data;
    
    // Load workflow definition
    const workflow = await this.workflowRepo.findById(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    console.log(`Executing workflow: ${workflow.name} (${workflow.id})`);
    
    // Execute workflow
    const execution = await this.executor.execute(workflow, input);
    
    // Save execution to database
    await this.executionRepo.create(execution);
    
    console.log(`Execution ${execution.id} status: ${execution.status}`);
    
    // Update job progress
    await job.updateProgress(100);
  }
  
  /**
   * Process resume workflow job
   * @note Resume functionality is not yet implemented in the executor
   */
  private async processResume(job: Job<ResumeWorkflowJob>): Promise<void> {
    const { executionId } = job.data;
    
    console.log(`Resume requested for execution: ${executionId}`);
    
    // Check if execution exists
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    // Resume is not yet implemented - fail gracefully
    throw new Error('Resume functionality is not yet implemented. Please use execute to start a new workflow run instead.');
  }
}
