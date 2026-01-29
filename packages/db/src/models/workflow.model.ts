import mongoose, { Schema, Document } from 'mongoose';
import { WorkflowDefinition, TriggerConfig, StepDefinition, ErrorHandlingConfig } from '@glue/core';

/**
 * Workflow document interface
 */
export interface WorkflowDocument extends Document {
  workflowId: string;
  name: string;
  version: string;
  description?: string;
  trigger: TriggerConfig;
  steps: StepDefinition[];
  errorHandling?: ErrorHandlingConfig;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  toWorkflowDefinition(): WorkflowDefinition;
}

/**
 * Workflow schema
 */
const workflowSchema = new Schema<WorkflowDocument>(
  {
    workflowId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    version: { type: String, required: true },
    description: { type: String },
    trigger: {
      type: {
        type: String,
        enum: ['manual', 'webhook', 'schedule', 'event'],
        required: true,
      },
      config: { type: Schema.Types.Mixed },
    },
    steps: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['connector', 'transformer', 'condition', 'parallel'],
          required: true,
        },
        config: { type: Schema.Types.Mixed, required: true },
        parameters: { type: Schema.Types.Mixed }, // Runtime-configurable parameters with variable interpolation
        retryPolicy: {
          maxAttempts: { type: Number },
          delayMs: { type: Number },
          backoffMultiplier: { type: Number },
        },
        timeout: { type: Number },
        dependsOn: [{ type: String }],
      },
    ],
    errorHandling: {
      onError: { type: String, enum: ['stop', 'continue', 'retry'] },
      maxRetries: { type: Number },
      fallbackStep: { type: String },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

/**
 * Convert document to WorkflowDefinition
 */
workflowSchema.methods.toWorkflowDefinition = function (): WorkflowDefinition {
  return {
    id: this.workflowId,
    name: this.name,
    version: this.version,
    description: this.description,
    trigger: this.trigger,
    steps: this.steps,
    errorHandling: this.errorHandling,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const WorkflowModel = mongoose.model<WorkflowDocument>('Workflow', workflowSchema);
