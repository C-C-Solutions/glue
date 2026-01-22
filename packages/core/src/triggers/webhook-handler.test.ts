import { describe, it, expect, beforeEach } from 'vitest';
import { WebhookHandler } from './webhook-handler';
import { WorkflowDefinition } from '../types';

describe('WebhookHandler', () => {
  let handler: WebhookHandler;
  let mockExecuteCallback: (workflowId: string, input: Record<string, unknown>) => Promise<string>;

  beforeEach(() => {
    handler = new WebhookHandler();
    mockExecuteCallback = async (workflowId: string) => `job-${workflowId}-123`;
    handler.setExecutionCallback(mockExecuteCallback);
  });

  it('should register a workflow with webhook trigger', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Webhook Workflow',
      version: '1.0.0',
      trigger: {
        type: 'webhook',
        config: {
          path: '/test/webhook',
          method: 'POST',
        },
      },
      steps: [],
    };

    await handler.registerWorkflow(workflow);
    const registration = handler.getRegistrationByPath('/test/webhook');

    expect(registration).toBeDefined();
    expect(registration?.workflowId).toBe('test-workflow');
    expect(registration?.config.path).toBe('/test/webhook');
  });

  it('should normalize webhook path to start with /', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Webhook Workflow',
      version: '1.0.0',
      trigger: {
        type: 'webhook',
        config: {
          path: 'test/webhook',
          method: 'POST',
        },
      },
      steps: [],
    };

    await handler.registerWorkflow(workflow);
    const registration = handler.getRegistrationByPath('/test/webhook');

    expect(registration).toBeDefined();
    expect(registration?.config.path).toBe('/test/webhook');
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

  it('should throw error for missing path configuration', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      trigger: {
        type: 'webhook',
        config: {},
      },
      steps: [],
    };

    await expect(handler.registerWorkflow(workflow)).rejects.toThrow('Webhook trigger requires a path configuration');
  });

  it('should handle webhook request successfully', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Webhook Workflow',
      version: '1.0.0',
      trigger: {
        type: 'webhook',
        config: {
          path: '/test/webhook',
          method: 'POST',
        },
      },
      steps: [],
    };

    await handler.registerWorkflow(workflow);

    const result = await handler.handleWebhook(
      '/test/webhook',
      'POST',
      {},
      { test: 'data' }
    );

    expect(result.workflowId).toBe('test-workflow');
    expect(result.jobId).toBe('job-test-workflow-123');
  });

  it('should validate HTTP method', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Webhook Workflow',
      version: '1.0.0',
      trigger: {
        type: 'webhook',
        config: {
          path: '/test/webhook',
          method: 'POST',
        },
      },
      steps: [],
    };

    await handler.registerWorkflow(workflow);

    await expect(
      handler.handleWebhook('/test/webhook', 'GET', {}, {})
    ).rejects.toThrow('Method not allowed');
  });

  it('should validate secret authentication', async () => {
    const workflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Webhook Workflow',
      version: '1.0.0',
      trigger: {
        type: 'webhook',
        config: {
          path: '/test/webhook',
          method: 'POST',
          authentication: {
            type: 'secret',
            headerName: 'X-Webhook-Secret',
            secret: 'my-secret',
          },
        },
      },
      steps: [],
    };

    await handler.registerWorkflow(workflow);

    // Missing secret
    await expect(
      handler.handleWebhook('/test/webhook', 'POST', {}, {})
    ).rejects.toThrow('Missing authentication header');

    // Invalid secret
    await expect(
      handler.handleWebhook(
        '/test/webhook',
        'POST',
        { 'x-webhook-secret': 'wrong-secret' },
        {}
      )
    ).rejects.toThrow('Invalid webhook secret');

    // Valid secret
    const result = await handler.handleWebhook(
      '/test/webhook',
      'POST',
      { 'x-webhook-secret': 'my-secret' },
      { test: 'data' }
    );

    expect(result.workflowId).toBe('test-workflow');
  });
});
