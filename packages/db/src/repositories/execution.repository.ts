import { WorkflowExecution } from '@glue/core';
import { ExecutionModel } from '../models/execution.model';

/**
 * Execution repository for database operations
 */
export class ExecutionRepository {
  /**
   * Create a new execution
   */
  async create(execution: WorkflowExecution): Promise<WorkflowExecution> {
    const doc = await ExecutionModel.create({
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      input: execution.input,
      output: execution.output,
      stepExecutions: execution.stepExecutions,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      error: execution.error,
      metadata: execution.metadata,
    });
    
    return (doc as any).toWorkflowExecution();
  }
  
  /**
   * Find execution by ID
   */
  async findById(id: string): Promise<WorkflowExecution | null> {
    const doc = await ExecutionModel.findOne({ executionId: id });
    return doc ? (doc as any).toWorkflowExecution() : null;
  }
  
  /**
   * Find executions by workflow ID
   */
  async findByWorkflowId(workflowId: string, limit = 100, skip = 0): Promise<WorkflowExecution[]> {
    const docs = await ExecutionModel.find({ workflowId })
      .limit(limit)
      .skip(skip)
      .sort({ startedAt: -1 });
    return docs.map((doc: any) => doc.toWorkflowExecution());
  }
  
  /**
   * Update execution
   */
  async update(id: string, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution | null> {
    const doc = await ExecutionModel.findOneAndUpdate(
      { executionId: id },
      {
        ...(updates.status && { status: updates.status }),
        ...(updates.output !== undefined && { output: updates.output }),
        ...(updates.stepExecutions && { stepExecutions: updates.stepExecutions }),
        ...(updates.completedAt && { completedAt: updates.completedAt }),
        ...(updates.error !== undefined && { error: updates.error }),
        ...(updates.metadata !== undefined && { metadata: updates.metadata }),
      },
      { new: true }
    );
    
    return doc ? (doc as any).toWorkflowExecution() : null;
  }
  
  /**
   * Get execution statistics
   */
  async getStats(workflowId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
  }> {
    const [total, completed, failed, running] = await Promise.all([
      ExecutionModel.countDocuments({ workflowId }),
      ExecutionModel.countDocuments({ workflowId, status: 'completed' }),
      ExecutionModel.countDocuments({ workflowId, status: 'failed' }),
      ExecutionModel.countDocuments({ workflowId, status: 'running' }),
    ]);
    
    return { total, completed, failed, running };
  }
}
