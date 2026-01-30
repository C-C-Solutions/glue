import { z } from 'zod';

/**
 * Zod schema for authentication configuration
 */
export const AuthConfigSchema = z.object({
  type: z.enum(['none', 'apiKey', 'oauth2', 'basic', 'bearer']),
  credentials: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for connector definition
 */
export const ConnectorDefinitionSchema = z.object({
  id: z.string().min(1).describe('Unique connector identifier'),
  name: z.string().min(1).describe('Connector name'),
  type: z.string().min(1).describe('Connector type (http, postgres, openai, etc.)'),
  description: z.string().optional().describe('Connector description'),
  config: z.record(z.unknown()).describe('Connector configuration'),
  auth: AuthConfigSchema.optional().describe('Authentication configuration'),
  metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

/**
 * Type inference from Zod schema
 */
export type ConnectorDefinitionInput = z.infer<typeof ConnectorDefinitionSchema>;
