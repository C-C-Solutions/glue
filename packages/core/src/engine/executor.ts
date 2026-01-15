import { WorkflowDefinition, WorkflowExecution } from '../types';
import { StepRunner } from './step-runner';

/**
 * Event emitter interface for workflow execution events
 */
export interface ExecutionEventEmitter {
  emit(event: string, data: unknown): void;
}

/**
 * Workflow executor - orchestrates workflow execution
 * Executes steps sequentially and manages execution state
 */
export class WorkflowExecutor {
  private stepRunner: StepRunner;
  private eventEmitter?: ExecutionEventEmitter;
  
  constructor(eventEmitter?: ExecutionEventEmitter) {
    this.stepRunner = new StepRunner();
    this.eventEmitter = eventEmitter;
  }
  
  /**
   * Execute a workflow
   */
  async execute(
    workflow: WorkflowDefinition,
    input: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: this.generateId(),
      workflowId: workflow.id,
      status: 'running',
      input,
      stepExecutions: [],
      startedAt: new Date(),
    };
    
    this.emitEvent('execution.started', execution);
    
    try {
      // Build execution context
      const context: Record<string, unknown> = {
        workflowId: workflow.id,
        executionId: execution.id,
      };
      
      // Execute steps sequentially
      for (const step of workflow.steps) {
        this.emitEvent('step.started', { executionId: execution.id, stepId: step.id });
        
        // Get input for this step (output from previous step or workflow input)
        const stepInput = this.getStepInput(execution, step, input);
        
        // Execute step with retry policy
        const stepExecution = await this.stepRunner.executeWithRetry(step, stepInput, context);
        execution.stepExecutions.push(stepExecution);
        
        this.emitEvent('step.completed', { executionId: execution.id, stepExecution });
        
        // Check if step failed and error handling
        if (stepExecution.status === 'failed') {
          const errorHandling = workflow.errorHandling?.onError || 'stop';
          
          if (errorHandling === 'stop') {
            execution.status = 'failed';
            execution.error = {
              message: `Step ${step.id} failed`,
              stepId: step.id,
              details: stepExecution.error,
            };
            break;
          }
          // Continue to next step if errorHandling is 'continue'
        }
      }
      
      // Set final status if not already set
      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.output = this.buildOutput(execution);
      }
    } catch (error) {
      execution.status = 'failed';
      execution.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      };
    }
    
    execution.completedAt = new Date();
    this.emitEvent('execution.completed', execution);
    
    return execution;
  }
  
  /**
   * Resume a paused or failed execution
   * @todo Implement resume functionality
   * @throws Error indicating resume is not yet implemented
   */
  async resume(_executionId: string): Promise<WorkflowExecution> {
    // TODO: Load execution from storage and resume from last successful step
    // This will require:
    // 1. Loading execution state from database
    // 2. Identifying last completed step
    // 3. Resuming from next step in sequence
    throw new Error('Resume not yet implemented');
  }
  
  /**
   * Cancel an ongoing execution
   * @todo Implement cancel functionality
   * @throws Error indicating cancel is not yet implemented
   */
  async cancel(_executionId: string): Promise<void> {
    // TODO: Mark execution as cancelled and stop processing
    // This will require:
    // 1. Updating execution status to 'cancelled'
    // 2. Signaling worker to stop processing
    throw new Error('Cancel not yet implemented');
  }
  
  /**
   * Get input for a step based on dependencies
   */
  private getStepInput(
    execution: WorkflowExecution,
    step: { id: string; dependsOn?: string[] },
    workflowInput: Record<string, unknown>
  ): Record<string, unknown> {
    // If no dependencies, use workflow input
    if (!step.dependsOn || step.dependsOn.length === 0) {
      return workflowInput;
    }
    
    // Merge outputs from dependent steps
    const input: Record<string, unknown> = { ...workflowInput };
    
    for (const dependencyId of step.dependsOn) {
      const dependencyExecution = execution.stepExecutions.find(
        se => se.stepId === dependencyId
      );
      
      if (dependencyExecution?.output) {
        Object.assign(input, dependencyExecution.output);
      }
    }
    
    return input;
  }
  
  /**
   * Build final output from step executions
   */
  private buildOutput(execution: WorkflowExecution): Record<string, unknown> {
    const lastStep = execution.stepExecutions[execution.stepExecutions.length - 1];
    return lastStep?.output || {};
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  /**
   * Emit event if emitter is available
   */
  private emitEvent(event: string, data: unknown): void {
    this.eventEmitter?.emit(event, data);
  }
}
