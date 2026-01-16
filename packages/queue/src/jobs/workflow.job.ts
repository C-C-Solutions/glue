/**
 * Execute workflow job data
 */
export interface ExecuteWorkflowJob {
  type: 'execute';
  workflowId: string;
  input: Record<string, unknown>;
}

/**
 * Resume workflow job data
 */
export interface ResumeWorkflowJob {
  type: 'resume';
  executionId: string;
}

/**
 * Union type for all workflow job types
 */
export type WorkflowJobData = ExecuteWorkflowJob | ResumeWorkflowJob;
