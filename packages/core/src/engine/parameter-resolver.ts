import { WorkflowExecution } from '../types';

/**
 * Context for parameter resolution
 */
export interface ParameterContext {
  workflowInput: Record<string, unknown>;
  stepExecutions: Map<string, Record<string, unknown>>;
  env: Record<string, string>;
}

/**
 * Parameter resolver - resolves variable references in parameters
 * Supports:
 * - ${workflow.input.field} - Reference workflow input
 * - ${steps.stepId.field} - Reference output from a specific step
 * - ${env.VAR_NAME} - Reference environment variable
 */
export class ParameterResolver {
  /**
   * Resolve parameters with variable interpolation
   */
  resolve(
    parameters: Record<string, unknown>,
    context: ParameterContext
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(parameters)) {
      resolved[key] = this.resolveValue(value, context);
    }

    return resolved;
  }

  /**
   * Resolve a single value (string, object, array, or primitive)
   */
  private resolveValue(value: unknown, context: ParameterContext): unknown {
    if (typeof value === 'string') {
      return this.interpolateString(value, context);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveValue(item, context));
    }

    if (value && typeof value === 'object') {
      const resolved: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = this.resolveValue(v, context);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Interpolate variable references in a string
   * Supports ${workflow.input.field}, ${steps.stepId.field}, ${env.VAR}
   */
  private interpolateString(template: string, context: ParameterContext): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const value = this.resolveReference(path, context);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Resolve a reference path like "workflow.input.field" or "steps.stepId.field"
   */
  private resolveReference(path: string, context: ParameterContext): unknown {
    const parts = path.split('.');

    if (parts[0] === 'workflow' && parts[1] === 'input') {
      // ${workflow.input.field}
      return this.getNestedValue(context.workflowInput, parts.slice(2));
    }

    if (parts[0] === 'steps' && parts.length >= 2) {
      // ${steps.stepId.field}
      const stepId = parts[1];
      const stepOutput = context.stepExecutions.get(stepId);
      if (stepOutput) {
        return this.getNestedValue(stepOutput, parts.slice(2));
      }
    }

    if (parts[0] === 'env' && parts.length === 2) {
      // ${env.VAR_NAME}
      return context.env[parts[1]];
    }

    return undefined;
  }

  /**
   * Get nested value from object by path
   */
  private getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
    let current: any = obj;

    for (const part of path) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Build context from workflow execution
   */
  static buildContext(
    workflowInput: Record<string, unknown>,
    execution: WorkflowExecution
  ): ParameterContext {
    const stepExecutions = new Map<string, Record<string, unknown>>();
    
    for (const stepExecution of execution.stepExecutions) {
      if (stepExecution.output) {
        stepExecutions.set(stepExecution.stepId, stepExecution.output);
      }
    }

    return {
      workflowInput,
      stepExecutions,
      env: process.env as Record<string, string>,
    };
  }
}
