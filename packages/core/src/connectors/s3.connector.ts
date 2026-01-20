import { z } from "zod";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
  BaseConnector,
  ConnectorResult,
  ValidationResult,
} from "./base.connector";

/**
 * S3 connector configuration schema
 */
const s3ConfigSchema = z.object({
  region: z.string().min(1, "AWS region is required"),
  bucket: z.string().min(1, "S3 bucket name is required"),
  accessKeyId: z.string().min(1, "AWS access key ID is required"),
  secretAccessKey: z.string().min(1, "AWS secret access key is required"),
  endpoint: z.string().optional(),
});

export type S3Config = z.infer<typeof s3ConfigSchema>;

/**
 * S3 connector input schema
 */
const s3InputSchema = z.object({
  action: z.enum(["putObject", "getObject", "listObjects"]),
  key: z.string().optional(),
  content: z.string().optional(),
  contentType: z.string().optional(),
  prefix: z.string().optional(),
  maxKeys: z.number().optional().default(1000),
});

export type S3Input = z.infer<typeof s3InputSchema>;

/**
 * S3/Blob Storage connector implementation
 * Manages files in AWS S3 or S3-compatible storage
 */
export class S3Connector extends BaseConnector {
  readonly type = "s3";
  private clients: Map<string, S3Client> = new Map();

  /**
   * Execute S3 operation
   */
  async execute(config: unknown, input: unknown): Promise<ConnectorResult> {
    // Validate config
    const configResult = s3ConfigSchema.safeParse(config);
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
    const inputResult = s3InputSchema.safeParse(input);
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

    const s3Config = configResult.data;
    const s3Input = inputResult.data;

    try {
      const client = this.getClient(s3Config);

      switch (s3Input.action) {
        case "putObject":
          return await this.putObject(client, s3Config, s3Input);
        case "getObject":
          return await this.getObject(client, s3Config, s3Input);
        case "listObjects":
          return await this.listObjects(client, s3Config, s3Input);
        default:
          return {
            success: false,
            error: {
              message: "Unknown action",
              code: "INVALID_ACTION",
            },
          };
      }
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
   * Put object to S3
   */
  private async putObject(
    client: S3Client,
    config: S3Config,
    input: S3Input,
  ): Promise<ConnectorResult> {
    if (!input.key) {
      return {
        success: false,
        error: {
          message: "Key is required for putObject action",
          code: "INVALID_INPUT",
        },
      };
    }

    if (!input.content) {
      return {
        success: false,
        error: {
          message: "Content is required for putObject action",
          code: "INVALID_INPUT",
        },
      };
    }

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.content,
      ContentType: input.contentType,
    });

    const response = await client.send(command);

    return {
      success: true,
      data: {
        etag: response.ETag,
        versionId: response.VersionId,
      },
    };
  }

  /**
   * Get object from S3
   */
  private async getObject(
    client: S3Client,
    config: S3Config,
    input: S3Input,
  ): Promise<ConnectorResult> {
    if (!input.key) {
      return {
        success: false,
        error: {
          message: "Key is required for getObject action",
          code: "INVALID_INPUT",
        },
      };
    }

    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
    });

    const response = await client.send(command);

    // Convert stream to string
    const content = await response.Body?.transformToString();

    return {
      success: true,
      data: {
        content,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
      },
    };
  }

  /**
   * List objects in S3
   */
  private async listObjects(
    client: S3Client,
    config: S3Config,
    input: S3Input,
  ): Promise<ConnectorResult> {
    const command = new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: input.prefix,
      MaxKeys: input.maxKeys,
    });

    const response = await client.send(command);

    return {
      success: true,
      data: {
        objects:
          response.Contents?.map((obj) => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            etag: obj.ETag,
          })) || [],
        isTruncated: response.IsTruncated,
        keyCount: response.KeyCount,
      },
    };
  }

  /**
   * Validate S3 connector configuration
   */
  validate(config: unknown): ValidationResult {
    return this.validateWithZod(s3ConfigSchema, config);
  }

  /**
   * Get or create S3 client
   */
  private getClient(config: S3Config): S3Client {
    const key = `${config.region}:${config.bucket}:${config.accessKeyId}`;

    if (!this.clients.has(key)) {
      const client = new S3Client({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        endpoint: config.endpoint,
      });

      this.clients.set(key, client);
    }

    return this.clients.get(key)!;
  }
}
