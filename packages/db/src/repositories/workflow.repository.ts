import { WorkflowDefinition } from '@glue/core';
import { WorkflowModel, WorkflowDocument } from '../models/workflow.model';

/**
 * Workflow repository for database operations
 */
export class WorkflowRepository {
  /**
   * Create a new workflow
   */
  async create(workflow: WorkflowDefinition): Promise<WorkflowDefinition> {
    const doc = await WorkflowModel.create({
      workflowId: workflow.id,
      name: workflow.name,
      version: workflow.version,
      description: workflow.description,
      trigger: workflow.trigger,
      steps: workflow.steps,
      errorHandling: workflow.errorHandling,
      metadata: workflow.metadata,
    });
    
    return (doc as any).toWorkflowDefinition();
  }
  
  /**
   * Find workflow by ID
   */
  async findById(id: string): Promise<WorkflowDefinition | null> {
    const doc = await WorkflowModel.findOne({ workflowId: id });
    return doc ? (doc as any).toWorkflowDefinition() : null;
  }
  
  /**
   * Find all workflows
   */
  async findAll(limit = 100, skip = 0): Promise<WorkflowDefinition[]> {
    const docs = await WorkflowModel.find().limit(limit).skip(skip).sort({ createdAt: -1 });
    return docs.map((doc: any) => doc.toWorkflowDefinition());
  }
  
  /**
   * Update workflow
   */
  async update(id: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | null> {
    const doc = await WorkflowModel.findOneAndUpdate(
      { workflowId: id },
      {
        ...(updates.name && { name: updates.name }),
        ...(updates.version && { version: updates.version }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.trigger && { trigger: updates.trigger }),
        ...(updates.steps && { steps: updates.steps }),
        ...(updates.errorHandling !== undefined && { errorHandling: updates.errorHandling }),
        ...(updates.metadata !== undefined && { metadata: updates.metadata }),
      },
      { new: true }
    );
    
    return doc ? (doc as any).toWorkflowDefinition() : null;
  }
  
  /**
   * Delete workflow
   */
  async delete(id: string): Promise<boolean> {
    const result = await WorkflowModel.deleteOne({ workflowId: id });
    return result.deletedCount > 0;
  }
  
  /**
   * Check if workflow exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await WorkflowModel.countDocuments({ workflowId: id });
    return count > 0;
  }
}
