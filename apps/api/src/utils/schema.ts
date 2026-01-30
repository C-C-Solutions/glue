import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

/**
 * Convert a Zod schema to JSON Schema for Fastify
 */
export function zodToFastifySchema(zodSchema: any): any {
  return zodToJsonSchema(zodSchema, {
    target: "openApi3",
    $refStrategy: "none",
  });
}

/**
 * Create a Fastify route schema with Zod validation
 */
export function createRouteSchema(config: {
  tags?: string[];
  summary?: string;
  description?: string;
  body?: z.ZodTypeAny;
  querystring?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  response?: Record<number, z.ZodTypeAny>;
}): any {
  const schema: Record<string, unknown> = {};

  if (config.tags) schema.tags = config.tags;
  if (config.summary) schema.summary = config.summary;
  if (config.description) schema.description = config.description;

  if (config.body) {
    schema.body = zodToFastifySchema(config.body);
  }

  if (config.querystring) {
    schema.querystring = zodToFastifySchema(config.querystring);
  }

  if (config.params) {
    schema.params = zodToFastifySchema(config.params);
  }

  if (config.response) {
    schema.response = Object.fromEntries(
      Object.entries(config.response).map(([code, zodSchema]) => [
        code,
        zodToFastifySchema(zodSchema),
      ]),
    );
  }

  return schema;
}
