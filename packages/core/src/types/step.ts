/**
 * Retry policy configuration for step execution
 */
export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
}

/**
 * Available connector types
 */
export const CONNECTOR_TYPES = [
  'http',
  'postgres',
  'openai',
  'smtp',
  's3',
  'javascript',
  'graphql',
] as const;

export type ConnectorType = typeof CONNECTOR_TYPES[number];

/**
 * Connector step configuration
 * Embeds connector-specific data including type and connector config
 */
export interface ConnectorStepConfig {
  connectorType: ConnectorType;
  [key: string]: unknown;
}

/**
 * Transformer step configuration
 */
export interface TransformerStepConfig {
  mapping: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Condition step configuration
 */
export interface ConditionStepConfig {
  condition: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: unknown;
  };
  [key: string]: unknown;
}

/**
 * Step configuration (union type that embeds step-specific data)
 * Note: Includes a generic fallback to allow runtime validation of unknown configs
 */
export type StepConfig = ConnectorStepConfig | TransformerStepConfig | ConditionStepConfig | { [key: string]: unknown };

/**
 * Individual step definition in a workflow
 */
export interface StepDefinition {
  id: string;
  name: string;
  type: 'connector' | 'transformer' | 'condition' | 'parallel';
  config: StepConfig;
  /**
   * Runtime-configurable parameters that can reference workflow inputs or previous step outputs
   * Supports variable interpolation:
   * - ${workflow.input.fieldName} - Reference workflow input
   * - ${steps.stepId.fieldName} - Reference output from a specific step
   * - ${env.VAR_NAME} - Reference environment variable
   */
  parameters?: Record<string, unknown>;
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
