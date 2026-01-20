import { WorkflowRepository } from '@glue/db';
import { WorkflowQueue } from '@glue/queue';
import {
  WebhookHandler,
  ScheduleHandler,
  EventHandler,
  InternalEvent,
} from '@glue/core';
import { WorkflowDefinition } from '@glue/core';

/**
 * Trigger manager - coordinates all trigger handlers
 */
export class TriggerManager {
  private webhookHandler: WebhookHandler;
  private scheduleHandler: ScheduleHandler;
  private eventHandler: EventHandler;
  private workflowRepo: WorkflowRepository;
  private workflowQueue: WorkflowQueue;
  private initialized = false;

  constructor(workflowRepo: WorkflowRepository, workflowQueue: WorkflowQueue) {
    this.workflowRepo = workflowRepo;
    this.workflowQueue = workflowQueue;
    this.webhookHandler = new WebhookHandler();
    this.scheduleHandler = new ScheduleHandler();
    this.eventHandler = new EventHandler();
  }

  /**
   * Initialize all trigger handlers and register workflows
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Set execution callbacks
    const executeWorkflow = async (
      workflowId: string,
      input: Record<string, unknown>
    ): Promise<string> => {
      return this.workflowQueue.addExecuteJob(workflowId, input);
    };

    this.webhookHandler.setExecutionCallback(executeWorkflow);
    this.scheduleHandler.setExecutionCallback(executeWorkflow);
    this.eventHandler.setExecutionCallback(executeWorkflow);

    // Set repeatable job callback for schedule handler
    this.scheduleHandler.setAddRepeatableJobCallback(
      async (workflowId: string, cron: string, timezone: string) => {
        return this.workflowQueue.addRepeatableJob(workflowId, cron, timezone);
      }
    );

    // Initialize handlers
    await this.webhookHandler.initialize();
    await this.scheduleHandler.initialize();
    await this.eventHandler.initialize();

    // Load and register all workflows
    await this.registerAllWorkflows();

    this.initialized = true;
    console.log('TriggerManager initialized');
  }

  /**
   * Shutdown all trigger handlers
   */
  async shutdown(): Promise<void> {
    await this.webhookHandler.shutdown();
    await this.scheduleHandler.shutdown();
    await this.eventHandler.shutdown();
    this.initialized = false;
    console.log('TriggerManager shutdown');
  }

  /**
   * Register all workflows with their respective trigger handlers
   */
  private async registerAllWorkflows(): Promise<void> {
    // Register webhook workflows
    const webhookWorkflows = await this.workflowRepo.findByTriggerType(
      'webhook'
    );
    for (const workflow of webhookWorkflows) {
      this.webhookHandler.registerWorkflow(workflow);
    }

    // Register scheduled workflows
    const scheduleWorkflows = await this.workflowRepo.findByTriggerType(
      'schedule'
    );
    for (const workflow of scheduleWorkflows) {
      await this.scheduleHandler.registerWorkflow(workflow);
    }

    // Register event workflows
    const eventWorkflows = await this.workflowRepo.findByTriggerType('event');
    for (const workflow of eventWorkflows) {
      this.eventHandler.registerWorkflow(workflow);
    }

    console.log(
      `Registered ${webhookWorkflows.length} webhook, ${scheduleWorkflows.length} scheduled, and ${eventWorkflows.length} event workflows`
    );
  }

  /**
   * Register a new workflow
   */
  async registerWorkflow(workflow: WorkflowDefinition): Promise<void> {
    const triggerType = workflow.trigger.type;

    switch (triggerType) {
      case 'webhook':
        this.webhookHandler.registerWorkflow(workflow);
        break;
      case 'schedule':
        await this.scheduleHandler.registerWorkflow(workflow);
        break;
      case 'event':
        this.eventHandler.registerWorkflow(workflow);
        break;
      case 'manual':
        // Manual triggers don't need registration
        break;
      default:
        throw new Error(`Unknown trigger type: ${triggerType}`);
    }
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): void {
    this.webhookHandler.unregisterWorkflow(workflowId);
    this.scheduleHandler.unregisterWorkflow(workflowId);
    this.eventHandler.unregisterWorkflow(workflowId);
  }

  /**
   * Get webhook handler
   */
  getWebhookHandler(): WebhookHandler {
    return this.webhookHandler;
  }

  /**
   * Get schedule handler
   */
  getScheduleHandler(): ScheduleHandler {
    return this.scheduleHandler;
  }

  /**
   * Get event handler
   */
  getEventHandler(): EventHandler {
    return this.eventHandler;
  }

  /**
   * Publish an event
   */
  async publishEvent(event: InternalEvent): Promise<string[]> {
    return this.eventHandler.publishEvent(event);
  }
}
