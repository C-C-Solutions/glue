import { WorkflowDefinition } from '../types';
import {
  TriggerHandler,
  EventTriggerConfig,
  WorkflowExecutionCallback,
} from './types';

/**
 * Event registration data
 */
export interface EventRegistration {
  workflowId: string;
  workflow: WorkflowDefinition;
  config: EventTriggerConfig;
}

/**
 * Internal event structure
 */
export interface InternalEvent {
  eventType: string;
  source?: string;
  data: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Event handler - manages event-triggered workflows
 */
export class EventHandler implements TriggerHandler {
  private registrations: Map<string, EventRegistration[]> = new Map();
  private executeCallback?: WorkflowExecutionCallback;

  /**
   * Set the workflow execution callback
   */
  setExecutionCallback(callback: WorkflowExecutionCallback): void {
    this.executeCallback = callback;
  }

  /**
   * Initialize event handler
   */
  async initialize(): Promise<void> {
    console.log('EventHandler initialized');
  }

  /**
   * Shutdown event handler
   */
  async shutdown(): Promise<void> {
    this.registrations.clear();
    console.log('EventHandler shutdown');
  }

  /**
   * Register a workflow with event trigger
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    if (workflow.trigger.type !== 'event') {
      throw new Error(`Invalid trigger type: ${workflow.trigger.type}`);
    }

    const config = workflow.trigger.config as unknown as EventTriggerConfig;
    if (!config?.eventType) {
      throw new Error('Event trigger requires an eventType configuration');
    }

    const eventType = config.eventType;
    const registrations = this.registrations.get(eventType) || [];
    registrations.push({
      workflowId: workflow.id,
      workflow,
      config,
    });

    this.registrations.set(eventType, registrations);

    console.log(
      `Registered event trigger for workflow ${workflow.id} on event type ${eventType}`
    );
  }

  /**
   * Unregister a workflow event trigger
   */
  unregisterWorkflow(workflowId: string): void {
    for (const [eventType, registrations] of this.registrations.entries()) {
      const filtered = registrations.filter(
        (reg) => reg.workflowId !== workflowId
      );
      if (filtered.length === 0) {
        this.registrations.delete(eventType);
      } else if (filtered.length !== registrations.length) {
        this.registrations.set(eventType, filtered);
      }
    }
    console.log(`Unregistered event trigger for workflow ${workflowId}`);
  }

  /**
   * Get event registrations by event type
   */
  getRegistrationsByEventType(eventType: string): EventRegistration[] {
    return this.registrations.get(eventType) || [];
  }

  /**
   * Get all event registrations
   */
  getAllRegistrations(): EventRegistration[] {
    const allRegistrations: EventRegistration[] = [];
    for (const registrations of this.registrations.values()) {
      allRegistrations.push(...registrations);
    }
    return allRegistrations;
  }

  /**
   * Publish an event and trigger matching workflows
   */
  async publishEvent(event: InternalEvent): Promise<string[]> {
    const registrations = this.registrations.get(event.eventType) || [];
    const jobIds: string[] = [];

    for (const registration of registrations) {
      // Check if event matches filters
      if (this.matchesFilters(event, registration.config)) {
        try {
          if (!this.executeCallback) {
            throw new Error('Execution callback not set');
          }

          const jobId = await this.executeCallback(registration.workflowId, {
            event: {
              type: event.eventType,
              source: event.source,
              timestamp: event.timestamp.toISOString(),
            },
            data: event.data,
            metadata: event.metadata,
          });

          jobIds.push(jobId);
          console.log(
            `Triggered workflow ${registration.workflowId} for event ${event.eventType}`
          );
        } catch (error) {
          console.error(
            `Failed to trigger workflow ${registration.workflowId}:`,
            error
          );
        }
      }
    }

    return jobIds;
  }

  /**
   * Check if event matches registration filters
   */
  private matchesFilters(
    event: InternalEvent,
    config: EventTriggerConfig
  ): boolean {
    // Check source filter
    if (config.source && event.source !== config.source) {
      return false;
    }

    // Check custom filters
    if (config.filters) {
      for (const [key, value] of Object.entries(config.filters)) {
        if (event.data[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }
}
