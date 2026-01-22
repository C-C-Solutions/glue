import { describe, it, expect, beforeEach } from 'vitest';
import { ScheduleHandler } from './schedule-handler';
import { WorkflowDefinition } from '../types';

describe('ScheduleHandler', () => {
  let handler: ScheduleHandler;
  let mockExecuteCallback: (workflowId: string, input: Record<string, unknown>) => Promise<string>;

  beforeEach(() => {
    handler = new ScheduleHandler();
    mockExecuteCallback = async (workflowId: string) => `job-${workflowId}-123`;
    handler.setExecutionCallback(mockExecuteCallback);
  });

  it('should register a workflow with schedule trigger', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Schedule Workflow',
      version: '1.0.0',
      trigger: {
        type: 'schedule',
        config: {
          cron: '0 8 * * *',
          timezone: 'UTC',
        },
      },
      steps: [],
    };

    await handler.registerWorkflow(workflow);
    const registration = handler.getRegistration('test-workflow');

    expect(registration).toBeDefined();
    expect(registration?.workflowId).toBe('test-workflow');
    expect(registration?.config.cron).toBe('0 8 * * *');
    expect(registration?.config.timezone).toBe('UTC');
  });

  it('should use UTC as default timezone', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Schedule Workflow',
      version: '1.0.0',
      trigger: {
        type: 'schedule',
        config: {
          cron: '0 8 * * *',
        },
      },
      steps: [],
    };

    await handler.registerWorkflow(workflow);
    const registration = handler.getRegistration('test-workflow');

    expect(registration?.config.timezone).toBeUndefined();
  });

  it('should throw error for invalid trigger type', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      trigger: {
        type: 'manual',
      },
      steps: [],
    };

    await expect(handler.registerWorkflow(workflow)).rejects.toThrow('Invalid trigger type');
  });

  it('should throw error for missing cron configuration', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      trigger: {
        type: 'schedule',
        config: {},
      },
      steps: [],
    };

    await expect(handler.registerWorkflow(workflow)).rejects.toThrow('Schedule trigger requires a cron expression');
  });

  it('should validate cron expression format', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      trigger: {
        type: 'schedule',
        config: {
          cron: 'invalid',
        },
      },
      steps: [],
    };

    await expect(handler.registerWorkflow(workflow)).rejects.toThrow('Invalid cron expression');
  });

  it('should accept valid cron expressions', async () => {
    const validCrons = [
      '0 8 * * *',        // Daily at 8 AM
      '*/15 * * * *',     // Every 15 minutes
      '0 0 1 * *',        // First of month
      '0 9 * * 1-5',      // Weekdays at 9 AM
    ];

    for (const cron of validCrons) {
      const workflow: WorkflowDefinition = {
        id: `test-workflow-${cron}`,
        name: 'Test Workflow',
        version: '1.0.0',
        trigger: {
          type: 'schedule',
          config: { cron },
        },
        steps: [],
      };

      await expect(handler.registerWorkflow(workflow)).resolves.not.toThrow();
    }
  });

  it('should execute scheduled workflow', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Schedule Workflow',
      version: '1.0.0',
      trigger: {
        type: 'schedule',
        config: {
          cron: '0 8 * * *',
        },
      },
      steps: [],
    };

    await handler.registerWorkflow(workflow);
    const result = await handler.executeScheduledWorkflow('test-workflow');

    expect(result.workflowId).toBe('test-workflow');
    expect(result.jobId).toBe('job-test-workflow-123');
  });
});
