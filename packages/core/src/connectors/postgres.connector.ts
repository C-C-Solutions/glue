import { z } from "zod";
import { Pool, QueryResult } from "pg";
import {
  BaseConnector,
  ConnectorResult,
  ValidationResult,
} from "./base.connector";

/**
 * PostgreSQL connector configuration schema
 */
const postgresConfigSchema = z.object({
  connectionString: z.string().min(1, "Connection string is required"),
  max: z.number().optional().default(10),
  idleTimeoutMillis: z.number().optional().default(30000),
  connectionTimeoutMillis: z.number().optional().default(5000),
});

export type PostgresConfig = z.infer<typeof postgresConfigSchema>;

/**
 * PostgreSQL connector input schema
 */
const postgresInputSchema = z.object({
  query: z.string().min(1, "SQL query is required"),
  params: z.array(z.any()).optional(),
});

export type PostgresInput = z.infer<typeof postgresInputSchema>;

/**
 * PostgreSQL/SQL connector implementation
 * Executes SQL queries against PostgreSQL databases
 */
export class PostgresConnector extends BaseConnector {
  readonly type = "postgres";
  private pools: Map<string, Pool> = new Map();

  /**
   * Execute SQL query
   */
  async execute(config: unknown, input: unknown): Promise<ConnectorResult> {
    // Validate config
    const configResult = postgresConfigSchema.safeParse(config);
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
    const inputResult = postgresInputSchema.safeParse(input);
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

    const postgresConfig = configResult.data;
    const postgresInput = inputResult.data;

    try {
      // Get or create pool
      const pool = this.getPool(postgresConfig);

      // Execute query
      const result: QueryResult = await pool.query(
        postgresInput.query,
        postgresInput.params || [],
      );

      return {
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount,
          fields: result.fields.map((f) => ({
            name: f.name,
            dataTypeID: f.dataTypeID,
          })),
        },
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
   * Validate PostgreSQL connector configuration
   */
  validate(config: unknown): ValidationResult {
    return this.validateWithZod(postgresConfigSchema, config);
  }

  /**
   * Get or create connection pool
   */
  private getPool(config: PostgresConfig): Pool {
    const key = config.connectionString;

    if (!this.pools.has(key)) {
      const pool = new Pool({
        connectionString: config.connectionString,
        max: config.max,
        idleTimeoutMillis: config.idleTimeoutMillis,
        connectionTimeoutMillis: config.connectionTimeoutMillis,
      });

      this.pools.set(key, pool);
    }

    return this.pools.get(key)!;
  }

  /**
   * Close all connection pools
   * This method should be called when shutting down the application
   * or when you need to release database connections.
   * Not part of BaseConnector interface - call manually when needed.
   */
  async cleanup(): Promise<void> {
    const closePromises = Array.from(this.pools.values()).map((pool) =>
      pool.end(),
    );
    await Promise.all(closePromises);
    this.pools.clear();
  }
}
