import { z } from "zod";

/**
 * Zod schema for retry policy
 */
export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1),
  delayMs: z.number().int().min(0),
  backoffMultiplier: z.number().min(1).optional(),
});

/**
 * Zod schema for connector types
 */
export const ConnectorTypeSchema = z.enum([
  "http",
  "postgres",
  "openai",
  "smtp",
  "s3",
  "javascript",
  "graphql",
]);

/**
 * Zod schema for step types
 */
export const StepTypeSchema = z.enum([
  "connector",
  "transformer",
  "condition",
  "parallel",
]);

/**
 * Zod schema for step definition
 */
export const StepDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: StepTypeSchema,
  config: z.record(z.unknown()),
  parameters: z.record(z.unknown()).optional(),
  retryPolicy: RetryPolicySchema.optional(),
  timeout: z.number().int().min(0).optional(),
  dependsOn: z.array(z.string()).optional(),
});

/**
 * Zod schema for trigger types
 */
export const TriggerTypeSchema = z.enum([
  "manual",
  "webhook",
  "schedule",
  "event",
]);

/**
 * Zod schema for trigger configuration
 */
export const TriggerConfigSchema = z.object({
  type: TriggerTypeSchema,
  config: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for error handling configuration
 */
export const ErrorHandlingConfigSchema = z.object({
  onError: z.enum(["stop", "continue", "retry"]).optional(),
  maxRetries: z.number().int().min(0).optional(),
  fallbackStep: z.string().optional(),
});

/**
 * Zod schema for workflow definition
 */
export const WorkflowDefinitionSchema = z.object({
  id: z.string().min(1).describe("Unique workflow identifier"),
  name: z.string().min(1).describe("Workflow name"),
  version: z.string().min(1).describe("Workflow version"),
  description: z.string().optional().describe("Workflow description"),
  trigger: TriggerConfigSchema,
  steps: z.array(StepDefinitionSchema).min(1),
  errorHandling: ErrorHandlingConfigSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

/**
 * Zod schema for workflow execution input
 */
export const WorkflowExecutionInputSchema = z
  .record(z.unknown())
  .describe("Input data for workflow execution");

/**
 * Zod schema for event publishing
 */
export const InternalEventSchema = z.object({
  eventType: z.string().min(1).describe("Type of event"),
  source: z.string().optional().describe("Source of the event"),
  data: z.record(z.unknown()).default({}).describe("Event data payload"),
  timestamp: z.date().optional().describe("Event timestamp"),
  metadata: z.record(z.unknown()).optional().describe("Additional metadata"),
});

/**
 * Type inference from Zod schemas
 */
export type WorkflowDefinitionInput = z.infer<typeof WorkflowDefinitionSchema>;
export type StepDefinitionInput = z.infer<typeof StepDefinitionSchema>;
export type TriggerConfigInput = z.infer<typeof TriggerConfigSchema>;
export type InternalEventInput = z.infer<typeof InternalEventSchema>;
