import { describe, it, expect, beforeEach } from 'vitest';
import { EventHandler, InternalEvent } from './event-handler';
import { WorkflowDefinition } from '../types';

describe('EventHandler', () => {
  let handler: EventHandler;
  let mockExecuteCallback: (workflowId: string, input: Record<string, unknown>) => Promise<string>;

  beforeEach(() => {
    handler = new EventHandler();
    mockExecuteCallback = async (workflowId: string) => `job-${workflowId}-123`;
    handler.setExecutionCallback(mockExecuteCallback);
  });

  it('should register a workflow with event trigger', () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Event Workflow',
      version: '1.0.0',
      trigger: {
        type: 'event',
        config: {
          eventType: 'user.created',
          source: 'auth-service',
        },
      },
      steps: [],
    };

    handler.registerWorkflow(workflow);
    const registrations = handler.getRegistrationsByEventType('user.created');

    expect(registrations).toHaveLength(1);
    expect(registrations[0].workflowId).toBe('test-workflow');
    expect(registrations[0].config.eventType).toBe('user.created');
  });

  it('should register multiple workflows for the same event type', () => {
    const workflow1: WorkflowDefinition = {
      id: 'test-workflow-1',
      name: 'Test Event Workflow 1',
      version: '1.0.0',
      trigger: {
        type: 'event',
        config: {
          eventType: 'user.created',
        },
      },
      steps: [],
    };

    const workflow2: WorkflowDefinition = {
      id: 'test-workflow-2',
      name: 'Test Event Workflow 2',
      version: '1.0.0',
      trigger: {
        type: 'event',
        config: {
          eventType: 'user.created',
        },
      },
      steps: [],
    };

    handler.registerWorkflow(workflow1);
    handler.registerWorkflow(workflow2);

    const registrations = handler.getRegistrationsByEventType('user.created');
    expect(registrations).toHaveLength(2);
  });

  it('should throw error for invalid trigger type', () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      trigger: {
        type: 'manual',
      },
      steps: [],
    };

    expect(() => handler.registerWorkflow(workflow)).toThrow('Invalid trigger type');
  });

  it('should throw error for missing eventType configuration', () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      trigger: {
        type: 'event',
        config: {},
      },
      steps: [],
    };

    expect(() => handler.registerWorkflow(workflow)).toThrow('Event trigger requires an eventType configuration');
  });

  it('should publish event and trigger matching workflows', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Event Workflow',
      version: '1.0.0',
      trigger: {
        type: 'event',
        config: {
          eventType: 'user.created',
        },
      },
      steps: [],
    };

    handler.registerWorkflow(workflow);

    const event: InternalEvent = {
      eventType: 'user.created',
      data: { userId: '123', email: 'test@example.com' },
      timestamp: new Date(),
    };

    const jobIds = await handler.publishEvent(event);

    expect(jobIds).toHaveLength(1);
    expect(jobIds[0]).toBe('job-test-workflow-123');
  });

  it('should filter events by source', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Event Workflow',
      version: '1.0.0',
      trigger: {
        type: 'event',
        config: {
          eventType: 'user.created',
          source: 'auth-service',
        },
      },
      steps: [],
    };

    handler.registerWorkflow(workflow);

    // Event with matching source
    const event1: InternalEvent = {
      eventType: 'user.created',
      source: 'auth-service',
      data: { userId: '123' },
      timestamp: new Date(),
    };

    const jobIds1 = await handler.publishEvent(event1);
    expect(jobIds1).toHaveLength(1);

    // Event with different source
    const event2: InternalEvent = {
      eventType: 'user.created',
      source: 'admin-service',
      data: { userId: '456' },
      timestamp: new Date(),
    };

    const jobIds2 = await handler.publishEvent(event2);
    expect(jobIds2).toHaveLength(0);
  });

  it('should filter events by custom filters', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Event Workflow',
      version: '1.0.0',
      trigger: {
        type: 'event',
        config: {
          eventType: 'user.created',
          filters: {
            accountType: 'premium',
          },
        },
      },
      steps: [],
    };

    handler.registerWorkflow(workflow);

    // Event matching filter
    const event1: InternalEvent = {
      eventType: 'user.created',
      data: { userId: '123', accountType: 'premium' },
      timestamp: new Date(),
    };

    const jobIds1 = await handler.publishEvent(event1);
    expect(jobIds1).toHaveLength(1);

    // Event not matching filter
    const event2: InternalEvent = {
      eventType: 'user.created',
      data: { userId: '456', accountType: 'free' },
      timestamp: new Date(),
    };

    const jobIds2 = await handler.publishEvent(event2);
    expect(jobIds2).toHaveLength(0);
  });
});
