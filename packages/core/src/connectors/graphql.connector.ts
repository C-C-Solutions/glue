import { z } from "zod";
import { GraphQLClient } from "graphql-request";
import {
  BaseConnector,
  ConnectorResult,
  ValidationResult,
} from "./base.connector";

/**
 * GraphQL connector configuration schema
 */
const graphqlConfigSchema = z.object({
  endpoint: z.string().url("Valid GraphQL endpoint URL is required"),
  headers: z.record(z.string()).optional(),
  timeout: z.number().optional().default(30000),
});

export type GraphQLConfig = z.infer<typeof graphqlConfigSchema>;

/**
 * GraphQL connector input schema
 */
const graphqlInputSchema = z.object({
  query: z.string().min(1, "GraphQL query or mutation is required"),
  variables: z.record(z.any()).optional(),
});

export type GraphQLInput = z.infer<typeof graphqlInputSchema>;

/**
 * GraphQL connector implementation
 * Executes GraphQL queries and mutations
 */
export class GraphQLConnector extends BaseConnector {
  readonly type = "graphql";
  private clients: Map<string, GraphQLClient> = new Map();

  /**
   * Execute GraphQL query/mutation
   */
  async execute(config: unknown, input: unknown): Promise<ConnectorResult> {
    // Validate config
    const configResult = graphqlConfigSchema.safeParse(config);
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
    const inputResult = graphqlInputSchema.safeParse(input);
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

    const graphqlConfig = configResult.data;
    const graphqlInput = inputResult.data;

    try {
      // Get or create client
      const client = this.getClient(graphqlConfig);

      // Execute query/mutation with timeout using Promise.race
      const requestPromise = client.request(
        graphqlInput.query,
        graphqlInput.variables || {},
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${graphqlConfig.timeout}ms`));
        }, graphqlConfig.timeout);
      });

      const data = await Promise.race([requestPromise, timeoutPromise]);

      return {
        success: true,
        data,
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
   * Validate GraphQL connector configuration
   */
  validate(config: unknown): ValidationResult {
    return this.validateWithZod(graphqlConfigSchema, config);
  }

  /**
   * Get or create GraphQL client
   */
  private getClient(config: GraphQLConfig): GraphQLClient {
    const key = config.endpoint;

    if (!this.clients.has(key)) {
      const client = new GraphQLClient(config.endpoint, {
        headers: config.headers || {},
      });

      this.clients.set(key, client);
    }

    return this.clients.get(key)!;
  }
}
