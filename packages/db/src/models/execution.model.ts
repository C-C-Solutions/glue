import mongoose, { Schema, Document } from 'mongoose';
import { WorkflowExecution, StepExecution, ExecutionError } from '@glue/core';

/**
 * Execution document interface
 */
export interface ExecutionDocument extends Document {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  stepExecutions: StepExecution[];
  startedAt: Date;
  completedAt?: Date;
  error?: ExecutionError;
  metadata?: Record<string, unknown>;
  toWorkflowExecution(): WorkflowExecution;
}

/**
 * Execution schema
 */
const executionSchema = new Schema<ExecutionDocument>(
  {
    executionId: { type: String, required: true, unique: true, index: true },
    workflowId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      required: true,
      index: true,
    },
    input: { type: Schema.Types.Mixed, required: true },
    output: { type: Schema.Types.Mixed },
    stepExecutions: [
      {
        stepId: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
          required: true,
        },
        input: { type: Schema.Types.Mixed },
        output: { type: Schema.Types.Mixed },
        error: {
          message: { type: String },
          code: { type: String },
          details: { type: Schema.Types.Mixed },
        },
        startedAt: { type: Date },
        completedAt: { type: Date },
        attempts: { type: Number, required: true, default: 1 },
      },
    ],
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    error: {
      message: { type: String },
      code: { type: String },
      stepId: { type: String },
      details: { type: Schema.Types.Mixed },
      stack: { type: String },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

/**
 * Convert document to WorkflowExecution
 */
executionSchema.methods.toWorkflowExecution = function (): WorkflowExecution {
  return {
    id: this.executionId,
    workflowId: this.workflowId,
    status: this.status,
    input: this.input,
    output: this.output,
    stepExecutions: this.stepExecutions,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    error: this.error,
    metadata: this.metadata,
  };
};

export const ExecutionModel = mongoose.model<ExecutionDocument>('Execution', executionSchema);
