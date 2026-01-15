import { z } from 'zod';
import { BaseConnector, ConnectorResult, ValidationResult } from './base.connector';

/**
 * HTTP connector configuration schema
 */
const httpConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  timeout: z.number().optional().default(30000),
});

export type HttpConfig = z.infer<typeof httpConfigSchema>;

/**
 * HTTP/REST connector implementation
 * Executes HTTP requests to external services
 */
export class HttpConnector extends BaseConnector {
  readonly type = 'http';
  
  /**
   * Execute HTTP request
   */
  async execute(config: unknown, input: unknown): Promise<ConnectorResult> {
    const validation = this.validate(config);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          message: 'Invalid configuration',
          code: 'INVALID_CONFIG',
          details: validation.errors,
        },
      };
    }
    
    const httpConfig = config as HttpConfig;
    
    try {
      // Replace variables in URL and body from input
      const url = this.interpolate(httpConfig.url, input);
      const body = httpConfig.body ? this.interpolate(JSON.stringify(httpConfig.body), input) : undefined;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), httpConfig.timeout);
      
      const response = await fetch(url, {
        method: httpConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...httpConfig.headers,
        },
        body: body ? body : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type');
      let data: unknown;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `HTTP ${response.status}: ${response.statusText}`,
            code: 'HTTP_ERROR',
            details: { status: response.status, data },
          },
        };
      }
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          message: errorMessage,
          code: 'EXECUTION_ERROR',
          details: error,
        },
      };
    }
  }
  
  /**
   * Validate HTTP connector configuration
   */
  validate(config: unknown): ValidationResult {
    return this.validateWithZod(httpConfigSchema, config);
  }
  
  /**
   * Simple variable interpolation (e.g., ${input.field})
   */
  private interpolate(template: string, input: unknown): string {
    if (!input || typeof input !== 'object') {
      return template;
    }
    
    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const value = this.getNestedValue(input, path);
      return value !== undefined ? String(value) : match;
    });
  }
  
  /**
   * Get nested value from object by path
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }
    
    const parts = path.split('.');
    let current: any = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
}
