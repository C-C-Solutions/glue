import { z } from 'zod';

/**
 * Result of connector execution
 */
export interface ConnectorResult {
  success: boolean;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Base connector interface
 * All connectors must extend this class
 */
export abstract class BaseConnector {
  abstract readonly type: string;
  
  /**
   * Execute the connector with given configuration and input
   */
  abstract execute(config: unknown, input: unknown): Promise<ConnectorResult>;
  
  /**
   * Validate the connector configuration
   */
  abstract validate(config: unknown): ValidationResult;
  
  /**
   * Helper method to safely validate config with Zod
   */
  protected validateWithZod<T>(schema: z.ZodSchema<T>, config: unknown): ValidationResult {
    const result = schema.safeParse(config);
    if (result.success) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
}
