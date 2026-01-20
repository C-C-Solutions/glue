import { WorkflowDefinition } from '../types';
import {
  TriggerHandler,
  WebhookTriggerConfig,
  WorkflowExecutionCallback,
} from './types';

/**
 * Webhook registration data
 */
export interface WebhookRegistration {
  workflowId: string;
  workflow: WorkflowDefinition;
  config: WebhookTriggerConfig;
}

/**
 * Webhook handler - manages webhook-triggered workflows
 */
export class WebhookHandler implements TriggerHandler {
  private registrations: Map<string, WebhookRegistration> = new Map();
  private executeCallback?: WorkflowExecutionCallback;

  /**
   * Set the workflow execution callback
   */
  setExecutionCallback(callback: WorkflowExecutionCallback): void {
    this.executeCallback = callback;
  }

  /**
   * Initialize webhook handler
   */
  async initialize(): Promise<void> {
    console.log('WebhookHandler initialized');
  }

  /**
   * Shutdown webhook handler
   */
  async shutdown(): Promise<void> {
    this.registrations.clear();
    console.log('WebhookHandler shutdown');
  }

  /**
   * Register a workflow with webhook trigger
   */
  async registerWorkflow(workflow: WorkflowDefinition): Promise<void> {
    if (workflow.trigger.type !== 'webhook') {
      throw new Error(`Invalid trigger type: ${workflow.trigger.type}`);
    }

    const config = workflow.trigger.config as unknown as WebhookTriggerConfig;
    if (!config?.path) {
      throw new Error('Webhook trigger requires a path configuration');
    }

    // Normalize path to ensure it starts with /
    const normalizedPath = config.path.startsWith('/')
      ? config.path
      : `/${config.path}`;

    this.registrations.set(normalizedPath, {
      workflowId: workflow.id,
      workflow,
      config: {
        ...config,
        path: normalizedPath,
      },
    });

    console.log(
      `Registered webhook for workflow ${workflow.id} at path ${normalizedPath}`
    );
  }

  /**
   * Unregister a workflow webhook
   */
  unregisterWorkflow(workflowId: string): void {
    for (const [path, registration] of this.registrations.entries()) {
      if (registration.workflowId === workflowId) {
        this.registrations.delete(path);
        console.log(`Unregistered webhook for workflow ${workflowId}`);
        break;
      }
    }
  }

  /**
   * Get webhook registration by path
   */
  getRegistrationByPath(path: string): WebhookRegistration | undefined {
    return this.registrations.get(path);
  }

  /**
   * Get all webhook registrations
   */
  getAllRegistrations(): WebhookRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Handle webhook request
   */
  async handleWebhook(
    path: string,
    method: string,
    headers: Record<string, string | string[] | undefined>,
    body: Record<string, unknown>
  ): Promise<{ jobId: string; workflowId: string }> {
    const registration = this.registrations.get(path);
    if (!registration) {
      throw new Error(`No webhook registered at path: ${path}`);
    }

    const { config, workflowId } = registration;

    // Validate HTTP method
    const expectedMethod = config.method || 'POST';
    if (method.toUpperCase() !== expectedMethod.toUpperCase()) {
      throw new Error(
        `Method not allowed. Expected ${expectedMethod}, got ${method}`
      );
    }

    // Validate authentication
    if (config.authentication && config.authentication.type !== 'none') {
      this.validateAuthentication(headers, config.authentication);
    }

    // Execute workflow with webhook payload
    if (!this.executeCallback) {
      throw new Error('Execution callback not set');
    }

    const jobId = await this.executeCallback(workflowId, body);

    return { jobId, workflowId };
  }

  /**
   * Validate webhook authentication
   */
  private validateAuthentication(
    headers: Record<string, string | string[] | undefined>,
    authConfig: WebhookTriggerConfig['authentication']
  ): void {
    if (!authConfig) return;

    const { type, headerName, secret } = authConfig;

    if (type === 'secret') {
      const header = headerName || 'X-Webhook-Secret';
      const providedSecret = headers[header.toLowerCase()];

      if (!providedSecret) {
        throw new Error(`Missing authentication header: ${header}`);
      }

      if (secret && providedSecret !== secret) {
        throw new Error('Invalid webhook secret');
      }
    } else if (type === 'bearer') {
      const authHeader = headers['authorization'];
      if (!authHeader) {
        throw new Error('Missing Authorization header');
      }

      const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (!token.startsWith('Bearer ')) {
        throw new Error('Invalid Authorization header format');
      }

      if (secret && token.substring(7) !== secret) {
        throw new Error('Invalid bearer token');
      }
    } else if (type === 'basic') {
      const authHeader = headers['authorization'];
      if (!authHeader) {
        throw new Error('Missing Authorization header');
      }

      const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (!token.startsWith('Basic ')) {
        throw new Error('Invalid Authorization header format');
      }

      if (secret) {
        const decoded = Buffer.from(token.substring(6), 'base64').toString();
        if (decoded !== secret) {
          throw new Error('Invalid basic auth credentials');
        }
      }
    }
  }
}
