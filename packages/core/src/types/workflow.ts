import { StepDefinition } from './step';

/**
 * Trigger configuration for workflows
 */
export interface TriggerConfig {
  type: 'manual' | 'webhook' | 'schedule' | 'event';
  config?: Record<string, unknown>;
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  onError?: 'stop' | 'continue' | 'retry';
  maxRetries?: number;
  fallbackStep?: string;
}

/**
 * Workflow definition - the blueprint for orchestration
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  trigger: TriggerConfig;
  steps: StepDefinition[];
  errorHandling?: ErrorHandlingConfig;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
