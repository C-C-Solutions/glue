/**
 * Retry policy configuration for step execution
 */
export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
}

/**
 * Step configuration (union type, specific configs per step type)
 */
export interface StepConfig {
  [key: string]: unknown;
}

/**
 * Individual step definition in a workflow
 */
export interface StepDefinition {
  id: string;
  name: string;
  type: 'connector' | 'transformer' | 'condition' | 'parallel';
  config: StepConfig;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  dependsOn?: string[];
}

/**
 * Result of step execution
 */
export interface StepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
}
