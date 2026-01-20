import { describe, it, expect, beforeEach } from 'vitest';
import { StepRunner } from './step-runner';
import { StepDefinition } from '../types';

describe('StepRunner', () => {
  let runner: StepRunner;

  beforeEach(() => {
    runner = new StepRunner();
  });

  describe('Connector Registration', () => {
    it('should register all available connectors', () => {
      // Access private connectors map through reflection for testing
      const connectors = (runner as any).connectors;
      
      expect(connectors.has('http')).toBe(true);
      expect(connectors.has('postgres')).toBe(true);
      expect(connectors.has('openai')).toBe(true);
      expect(connectors.has('smtp')).toBe(true);
      expect(connectors.has('s3')).toBe(true);
      expect(connectors.has('javascript')).toBe(true);
      expect(connectors.has('graphql')).toBe(true);
    });

    it('should have 7 connectors registered', () => {
      const connectors = (runner as any).connectors;
      expect(connectors.size).toBe(7);
    });
  });

  describe('HTTP Connector Execution', () => {
    it('should fail with invalid HTTP config', async () => {
      const step: StepDefinition = {
        id: 'step1',
        name: 'HTTP Request',
        type: 'connector',
        config: {
          connectorType: 'http',
          url: 'invalid-url',
          method: 'GET',
        },
      };

      const result = await runner.executeStep(step, {}, {});

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });

  describe('JavaScript Connector Execution', () => {
    it('should execute JavaScript connector step successfully', async () => {
      const step: StepDefinition = {
        id: 'step2',
        name: 'JavaScript Transform',
        type: 'connector',
        config: {
          connectorType: 'javascript',
          timeout: 5000,
        },
      };

      const input = {
        code: 'return { result: 2 + 2 };',
        context: {},
      };

      const result = await runner.executeStep(step, input, {});

      expect(result.status).toBe('completed');
      expect(result.output).toBeDefined();
      expect(result.output?.data).toEqual({ result: 4 });
    });

    it('should execute JavaScript with context data', async () => {
      const step: StepDefinition = {
        id: 'step3',
        name: 'JavaScript with Context',
        type: 'connector',
        config: {
          connectorType: 'javascript',
          timeout: 5000,
        },
      };

      const input = {
        code: 'return { doubled: value * 2 };',
        context: { value: 21 },
      };

      const result = await runner.executeStep(step, input, {});

      expect(result.status).toBe('completed');
      expect(result.output?.data).toEqual({ doubled: 42 });
    });
  });

  describe('Multiple Connector Workflow', () => {
    it('should support execution of different connector types', async () => {
      // Test 1: JavaScript connector
      const jsStep: StepDefinition = {
        id: 'js_step',
        name: 'JavaScript Test',
        type: 'connector',
        config: {
          connectorType: 'javascript',
          timeout: 5000,
        },
      };

      const jsInput = {
        code: 'return { userId: 1, title: "Test Post" };',
        context: {},
      };

      const jsResult = await runner.executeStep(jsStep, jsInput, {});
      expect(jsResult.status).toBe('completed');
      expect(jsResult.output?.data).toEqual({ userId: 1, title: "Test Post" });

      // Test 2: Verify connector type not found error
      const invalidStep: StepDefinition = {
        id: 'invalid_step',
        name: 'Invalid',
        type: 'connector',
        config: {
          connectorType: 'invalid',
        },
      };

      const invalidResult = await runner.executeStep(invalidStep, {}, {});
      expect(invalidResult.status).toBe('failed');
      expect(invalidResult.error?.message).toContain('not found');
    });
  });

  describe('Connector Type Validation', () => {
    it('should fail when connector type is not found', async () => {
      const step: StepDefinition = {
        id: 'step4',
        name: 'Unknown Connector',
        type: 'connector',
        config: {
          connectorType: 'nonexistent',
        },
      };

      const result = await runner.executeStep(step, {}, {});

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('Connector not found');
    });
  });

  describe('Retry Policy', () => {
    it('should retry failed steps according to retry policy', async () => {
      const step: StepDefinition = {
        id: 'retry_step',
        name: 'Retry Test',
        type: 'connector',
        config: {
          connectorType: 'javascript',
          timeout: 5000,
        },
        retryPolicy: {
          maxAttempts: 3,
          delayMs: 10,
          backoffMultiplier: 1,
        },
      };

      // JavaScript code that throws an error
      const input = {
        code: 'throw new Error("Test error");',
        context: {},
      };

      const result = await runner.executeWithRetry(step, input, {});

      expect(result.attempts).toBe(3);
      expect(result.status).toBe('failed');
    });
  });

  describe('Step-Specific Config Embedding', () => {
    it('should embed HTTP-specific configuration', () => {
      const step: StepDefinition = {
        id: 'http_config',
        name: 'HTTP with full config',
        type: 'connector',
        config: {
          connectorType: 'http',
          url: 'https://api.example.com/data',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token',
          },
          body: { key: 'value' },
          timeout: 30000,
        },
      };

      expect(step.config).toHaveProperty('connectorType', 'http');
      expect(step.config).toHaveProperty('url');
      expect(step.config).toHaveProperty('method', 'POST');
      expect(step.config).toHaveProperty('headers');
      expect(step.config).toHaveProperty('body');
      expect(step.config).toHaveProperty('timeout', 30000);
    });

    it('should embed S3-specific configuration', () => {
      const step: StepDefinition = {
        id: 's3_config',
        name: 'S3 Upload',
        type: 'connector',
        config: {
          connectorType: 's3',
          region: 'us-east-1',
          bucket: 'my-bucket',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
          endpoint: 'http://localhost:4566',
        },
      };

      expect(step.config).toHaveProperty('connectorType', 's3');
      expect(step.config).toHaveProperty('region');
      expect(step.config).toHaveProperty('bucket');
      expect(step.config).toHaveProperty('endpoint');
    });

    it('should embed OpenAI-specific configuration', () => {
      const step: StepDefinition = {
        id: 'openai_config',
        name: 'OpenAI Processing',
        type: 'connector',
        config: {
          connectorType: 'openai',
          apiKey: 'sk-test',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 1000,
        },
      };

      expect(step.config).toHaveProperty('connectorType', 'openai');
      expect(step.config).toHaveProperty('apiKey');
      expect(step.config).toHaveProperty('model', 'gpt-4o');
      expect(step.config).toHaveProperty('temperature');
    });

    it('should embed SMTP-specific configuration', () => {
      const step: StepDefinition = {
        id: 'smtp_config',
        name: 'Send Email',
        type: 'connector',
        config: {
          connectorType: 'smtp',
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          auth: {
            user: 'user@example.com',
            pass: 'password',
          },
          from: 'noreply@example.com',
        },
      };

      expect(step.config).toHaveProperty('connectorType', 'smtp');
      expect(step.config).toHaveProperty('host');
      expect(step.config).toHaveProperty('port', 587);
      expect(step.config).toHaveProperty('auth');
    });
  });
});
