import { z } from "zod";
import OpenAI from "openai";
import {
  BaseConnector,
  ConnectorResult,
  ValidationResult,
} from "./base.connector";

/**
 * OpenAI connector configuration schema
 */
const openaiConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  model: z
    .string()
    .optional()
    .default("gpt-4o"),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().optional(),
  timeout: z.number().optional().default(60000),
});

export type OpenAIConfig = z.infer<typeof openaiConfigSchema>;

/**
 * OpenAI connector input schema
 */
const openaiInputSchema = z.object({
  systemPrompt: z.string().optional(),
  userPrompt: z.string().min(1, "User prompt is required"),
});

export type OpenAIInput = z.infer<typeof openaiInputSchema>;

/**
 * OpenAI/LLM connector implementation
 * Executes AI prompts for data transformation and intelligent processing
 */
export class OpenAIConnector extends BaseConnector {
  readonly type = "openai";
  private clients: Map<string, OpenAI> = new Map();

  /**
   * Execute AI prompt
   */
  async execute(config: unknown, input: unknown): Promise<ConnectorResult> {
    // Validate config
    const configResult = openaiConfigSchema.safeParse(config);
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
    const inputResult = openaiInputSchema.safeParse(input);
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

    const openaiConfig = configResult.data;
    const openaiInput = inputResult.data;

    try {
      // Get or create client
      const client = this.getClient(openaiConfig);

      // Build messages array
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (openaiInput.systemPrompt) {
        messages.push({
          role: "system",
          content: openaiInput.systemPrompt,
        });
      }

      messages.push({
        role: "user",
        content: openaiInput.userPrompt,
      });

      // Execute completion
      const completion = await client.chat.completions.create(
        {
          model: openaiConfig.model,
          messages,
          temperature: openaiConfig.temperature,
          max_tokens: openaiConfig.maxTokens,
        },
        {
          timeout: openaiConfig.timeout,
        },
      );

      return {
        success: true,
        data: {
          content: completion.choices[0]?.message?.content || "",
          finishReason: completion.choices[0]?.finish_reason,
          usage: completion.usage,
          model: completion.model,
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
   * Validate OpenAI connector configuration
   */
  validate(config: unknown): ValidationResult {
    return this.validateWithZod(openaiConfigSchema, config);
  }

  /**
   * Get or create OpenAI client
   */
  private getClient(config: OpenAIConfig): OpenAI {
    const key = config.apiKey;

    if (!this.clients.has(key)) {
      const client = new OpenAI({
        apiKey: config.apiKey,
      });

      this.clients.set(key, client);
    }

    return this.clients.get(key)!;
  }
}
