import { StepExecution } from './step';

/**
 * Execution error details
 */
export interface ExecutionError {
  message: string;
  code?: string;
  stepId?: string;
  details?: unknown;
  stack?: string;
}

/**
 * Workflow execution state - runtime instance of a workflow
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  stepExecutions: StepExecution[];
  startedAt: Date;
  completedAt?: Date;
  error?: ExecutionError;
  metadata?: Record<string, unknown>;
}
