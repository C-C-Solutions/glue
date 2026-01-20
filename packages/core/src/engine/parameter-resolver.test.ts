import { describe, it, expect, beforeEach } from 'vitest';
import { ParameterResolver, ParameterContext } from './parameter-resolver';

describe('ParameterResolver', () => {
  let resolver: ParameterResolver;

  beforeEach(() => {
    resolver = new ParameterResolver();
  });

  describe('String interpolation', () => {
    it('should interpolate workflow input references', () => {
      const context: ParameterContext = {
        workflowInput: { userId: '123', action: 'process' },
        stepExecutions: new Map(),
        env: {},
      };

      const parameters = {
        message: 'Processing user ${workflow.input.userId} with action ${workflow.input.action}',
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        message: 'Processing user 123 with action process',
      });
    });

    it('should interpolate step output references', () => {
      const context: ParameterContext = {
        workflowInput: {},
        stepExecutions: new Map([
          ['step1', { data: { id: 1, title: 'Test Post' } }],
        ]),
        env: {},
      };

      const parameters = {
        userPrompt: 'Summarize this post: ${steps.step1.data.title}',
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        userPrompt: 'Summarize this post: Test Post',
      });
    });

    it('should interpolate environment variable references', () => {
      const context: ParameterContext = {
        workflowInput: {},
        stepExecutions: new Map(),
        env: { API_KEY: 'secret-key-123', ENVIRONMENT: 'production' },
      };

      const parameters = {
        apiKey: '${env.API_KEY}',
        env: '${env.ENVIRONMENT}',
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        apiKey: 'secret-key-123',
        env: 'production',
      });
    });

    it('should handle multiple interpolations in one string', () => {
      const context: ParameterContext = {
        workflowInput: { name: 'John' },
        stepExecutions: new Map([['fetch', { data: { age: 30 } }]]),
        env: { SYSTEM: 'glue' },
      };

      const parameters = {
        message: 'User ${workflow.input.name} is ${steps.fetch.data.age} years old in ${env.SYSTEM}',
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        message: 'User John is 30 years old in glue',
      });
    });

    it('should leave undefined references unchanged', () => {
      const context: ParameterContext = {
        workflowInput: {},
        stepExecutions: new Map(),
        env: {},
      };

      const parameters = {
        message: 'Value: ${workflow.input.missing}',
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        message: 'Value: ${workflow.input.missing}',
      });
    });
  });

  describe('Nested object resolution', () => {
    it('should resolve nested objects', () => {
      const context: ParameterContext = {
        workflowInput: { user: { id: '123', name: 'Alice' } },
        stepExecutions: new Map(),
        env: {},
      };

      const parameters = {
        data: {
          userId: '${workflow.input.user.id}',
          userName: '${workflow.input.user.name}',
        },
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        data: {
          userId: '123',
          userName: 'Alice',
        },
      });
    });

    it('should resolve arrays', () => {
      const context: ParameterContext = {
        workflowInput: { name: 'Bob' },
        stepExecutions: new Map(),
        env: { DOMAIN: 'example.com' },
      };

      const parameters = {
        recipients: [
          '${workflow.input.name}@${env.DOMAIN}',
          'admin@${env.DOMAIN}',
        ],
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        recipients: ['Bob@example.com', 'admin@example.com'],
      });
    });
  });

  describe('Non-string values', () => {
    it('should preserve non-string primitive values', () => {
      const context: ParameterContext = {
        workflowInput: {},
        stepExecutions: new Map(),
        env: {},
      };

      const parameters = {
        count: 42,
        enabled: true,
        value: null,
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        count: 42,
        enabled: true,
        value: null,
      });
    });
  });

  describe('Nested path resolution', () => {
    it('should resolve deeply nested paths', () => {
      const context: ParameterContext = {
        workflowInput: {},
        stepExecutions: new Map([
          [
            'api_call',
            {
              data: {
                user: {
                  profile: {
                    email: 'test@example.com',
                  },
                },
              },
            },
          ],
        ]),
        env: {},
      };

      const parameters = {
        email: '${steps.api_call.data.user.profile.email}',
      };

      const resolved = resolver.resolve(parameters, context);

      expect(resolved).toEqual({
        email: 'test@example.com',
      });
    });
  });

  describe('buildContext', () => {
    it('should build context from workflow execution', () => {
      const workflowInput = { userId: '456' };
      const execution = {
        id: 'exec_1',
        workflowId: 'wf_1',
        status: 'running' as const,
        input: workflowInput,
        stepExecutions: [
          {
            stepId: 'step1',
            status: 'completed' as const,
            output: { result: 'success' },
            attempts: 1,
            startedAt: new Date(),
            completedAt: new Date(),
          },
          {
            stepId: 'step2',
            status: 'completed' as const,
            output: { data: { value: 42 } },
            attempts: 1,
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ],
        startedAt: new Date(),
      };

      const context = ParameterResolver.buildContext(workflowInput, execution);

      expect(context.workflowInput).toEqual({ userId: '456' });
      expect(context.stepExecutions.get('step1')).toEqual({ result: 'success' });
      expect(context.stepExecutions.get('step2')).toEqual({ data: { value: 42 } });
      expect(context.env).toBeDefined();
    });
  });
});
