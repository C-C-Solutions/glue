import { z } from "zod";
import * as vm from "vm";
import {
  BaseConnector,
  ConnectorResult,
  ValidationResult,
} from "./base.connector";

/**
 * JavaScript connector configuration schema
 */
const javascriptConfigSchema = z.object({
  timeout: z.number().optional().default(5000),
});

export type JavaScriptConfig = z.infer<typeof javascriptConfigSchema>;

/**
 * JavaScript connector input schema
 */
const javascriptInputSchema = z.object({
  code: z.string().min(1, "JavaScript code is required"),
  context: z.record(z.any()).optional(),
});

export type JavaScriptInput = z.infer<typeof javascriptInputSchema>;

/**
 * JavaScript/Code connector implementation
 * Executes JavaScript code in a sandboxed environment
 */
export class JavaScriptConnector extends BaseConnector {
  readonly type = "javascript";

  /**
   * Execute JavaScript code
   */
  async execute(config: unknown, input: unknown): Promise<ConnectorResult> {
    // Validate config
    const configResult = javascriptConfigSchema.safeParse(config);
    if (!configResult.success) {
      return {
        success: false,
        error: {
          message: "Invalid configuration",
          code: "INVALID_CONFIG",
          details: configResult.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          ),
        },
      };
    }

    // Validate input
    const inputResult = javascriptInputSchema.safeParse(input);
    if (!inputResult.success) {
      return {
        success: false,
        error: {
          message: "Invalid input",
          code: "INVALID_INPUT",
          details: inputResult.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          ),
        },
      };
    }

    const jsConfig = configResult.data;
    const jsInput = inputResult.data;

    try {
      // Sanitize user context - only allow primitive values and plain objects
      const sanitizedContext: Record<string, any> = {};
      if (jsInput.context) {
        for (const [key, value] of Object.entries(jsInput.context)) {
          // Only allow primitive types and plain objects/arrays
          if (
            value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            Array.isArray(value) ||
            (typeof value === "object" && value.constructor === Object)
          ) {
            sanitizedContext[key] = value;
          }
        }
      }

      // Create a sandboxed context with safe globals
      const sandbox = {
        // Provide safe built-ins
        console: {
          log: () => {}, // Disable logging to prevent information leakage
          error: () => {},
          warn: () => {},
        },
        JSON,
        Math,
        Date,
        String,
        Number,
        Boolean,
        Array,
        Object,
        // User-provided sanitized context
        ...sanitizedContext,
        // Variable to capture result
        __result: undefined,
      };

      // Wrap code to capture the result
      const wrappedCode = `
        __result = (function() {
          ${jsInput.code}
        })();
      `;

      // Create context
      const context = vm.createContext(sandbox);

      // Execute code with timeout
      vm.runInContext(wrappedCode, context, {
        timeout: jsConfig.timeout,
        displayErrors: true,
      });

      return {
        success: true,
        data: sandbox.__result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: {
          message: errorMessage,
          code: "EXECUTION_ERROR",
          details: error,
        },
      };
    }
  }

  /**
   * Validate JavaScript connector configuration
   */
  validate(config: unknown): ValidationResult {
    return this.validateWithZod(javascriptConfigSchema, config);
  }
}
