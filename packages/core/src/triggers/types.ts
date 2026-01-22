/**
 * Trigger handler interface
 */
export interface TriggerHandler {
  /**
   * Initialize the trigger handler
   */
  initialize(): Promise<void>;
  
  /**
   * Register a workflow with this trigger handler
   */
  registerWorkflow(workflow: any): Promise<void>;
  
  /**
   * Unregister a workflow from this trigger handler
   */
  unregisterWorkflow(workflowId: string): void;
  
  /**
   * Shutdown the trigger handler
   */
  shutdown(): Promise<void>;
}

/**
 * Webhook trigger configuration
 */
export interface WebhookTriggerConfig {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  authentication?: {
    type: 'secret' | 'bearer' | 'basic' | 'none';
    headerName?: string;
    secret?: string;
  };
}

/**
 * Schedule trigger configuration
 */
export interface ScheduleTriggerConfig {
  cron: string;
  timezone?: string;
}

/**
 * Event trigger configuration
 */
export interface EventTriggerConfig {
  eventType: string;
  source?: string;
  filters?: Record<string, unknown>;
}

/**
 * Workflow execution trigger callback
 */
export type WorkflowExecutionCallback = (
  workflowId: string,
  input: Record<string, unknown>
) => Promise<string>;
