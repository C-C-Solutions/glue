/**
 * Connector definition types
 */
export interface ConnectorDefinition {
  id: string;
  name: string;
  type: string;
  description?: string;
  config: Record<string, unknown>;
  auth?: {
    type: 'none' | 'apiKey' | 'oauth2' | 'basic' | 'bearer';
    credentials?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
