import { WorkflowDefinition } from '../types';
import {
  TriggerHandler,
  ScheduleTriggerConfig,
  WorkflowExecutionCallback,
} from './types';

/**
 * Schedule registration data
 */
export interface ScheduleRegistration {
  workflowId: string;
  workflow: WorkflowDefinition;
  config: ScheduleTriggerConfig;
  repeatableKey?: string;
}

/**
 * Schedule handler - manages scheduled workflows
 * Uses BullMQ's repeatable jobs functionality
 */
export class ScheduleHandler implements TriggerHandler {
  private registrations: Map<string, ScheduleRegistration> = new Map();
  private executeCallback?: WorkflowExecutionCallback;
  private addRepeatableJobCallback?: (
    workflowId: string,
    cron: string,
    timezone: string
  ) => Promise<string>;

  /**
   * Set the workflow execution callback
   */
  setExecutionCallback(callback: WorkflowExecutionCallback): void {
    this.executeCallback = callback;
  }

  /**
   * Set the callback for adding repeatable jobs to the queue
   */
  setAddRepeatableJobCallback(
    callback: (
      workflowId: string,
      cron: string,
      timezone: string
    ) => Promise<string>
  ): void {
    this.addRepeatableJobCallback = callback;
  }

  /**
   * Initialize schedule handler
   */
  async initialize(): Promise<void> {
    console.log('ScheduleHandler initialized');
  }

  /**
   * Shutdown schedule handler
   */
  async shutdown(): Promise<void> {
    this.registrations.clear();
    console.log('ScheduleHandler shutdown');
  }

  /**
   * Register a workflow with schedule trigger
   */
  async registerWorkflow(workflow: WorkflowDefinition): Promise<void> {
    if (workflow.trigger.type !== 'schedule') {
      throw new Error(`Invalid trigger type: ${workflow.trigger.type}`);
    }

    const config = workflow.trigger.config as unknown as ScheduleTriggerConfig;
    if (!config?.cron) {
      throw new Error('Schedule trigger requires a cron expression');
    }

    // Validate cron expression (basic validation)
    this.validateCronExpression(config.cron);

    const timezone = config.timezone || 'UTC';

    // Add repeatable job to queue if callback is set
    let repeatableKey: string | undefined;
    if (this.addRepeatableJobCallback) {
      repeatableKey = await this.addRepeatableJobCallback(
        workflow.id,
        config.cron,
        timezone
      );
    }

    this.registrations.set(workflow.id, {
      workflowId: workflow.id,
      workflow,
      config,
      repeatableKey,
    });

    console.log(
      `Registered schedule for workflow ${workflow.id} with cron ${config.cron} (${timezone})`
    );
  }

  /**
   * Unregister a workflow schedule
   */
  unregisterWorkflow(workflowId: string): void {
    if (this.registrations.has(workflowId)) {
      this.registrations.delete(workflowId);
      console.log(`Unregistered schedule for workflow ${workflowId}`);
    }
  }

  /**
   * Get schedule registration by workflow ID
   */
  getRegistration(workflowId: string): ScheduleRegistration | undefined {
    return this.registrations.get(workflowId);
  }

  /**
   * Get all schedule registrations
   */
  getAllRegistrations(): ScheduleRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Validate cron expression
   */
  private validateCronExpression(cron: string): void {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6) {
      throw new Error(
        `Invalid cron expression: ${cron}. Expected 5 or 6 fields.`
      );
    }

    // Basic validation - each part should be valid cron syntax
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Allow * and numbers with ranges and steps
      if (
        part !== '*' &&
        !/^[0-9\-\/,]+$/.test(part) &&
        !/^[A-Z]{3}(-[A-Z]{3})?(,[A-Z]{3}(-[A-Z]{3})?)*$/i.test(part)
      ) {
        throw new Error(
          `Invalid cron expression part: ${part} at position ${i + 1}`
        );
      }
    }
  }

  /**
   * Execute scheduled workflow
   */
  async executeScheduledWorkflow(
    workflowId: string
  ): Promise<{ jobId: string; workflowId: string }> {
    const registration = this.registrations.get(workflowId);
    if (!registration) {
      throw new Error(`No schedule registered for workflow: ${workflowId}`);
    }

    if (!this.executeCallback) {
      throw new Error('Execution callback not set');
    }

    // Execute workflow with empty input (scheduled workflows don't have external input)
    const jobId = await this.executeCallback(workflowId, {
      trigger: 'schedule',
      executedAt: new Date().toISOString(),
    });

    return { jobId, workflowId };
  }
}
