import mongoose, { Schema, Document } from 'mongoose';
import { ConnectorDefinition } from '@glue/core';

/**
 * Connector document interface
 */
export interface ConnectorDocument extends Document {
  connectorId: string;
  name: string;
  type: string;
  description?: string;
  config: Record<string, unknown>;
  auth?: {
    type: 'none' | 'apiKey' | 'oauth2' | 'basic' | 'bearer';
    credentials?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  toConnectorDefinition(): ConnectorDefinition;
}

/**
 * Connector schema
 */
const connectorSchema = new Schema<ConnectorDocument>(
  {
    connectorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String },
    config: { type: Schema.Types.Mixed, required: true },
    auth: {
      type: {
        type: String,
        enum: ['none', 'apiKey', 'oauth2', 'basic', 'bearer'],
      },
      credentials: { type: Schema.Types.Mixed },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

/**
 * Convert document to ConnectorDefinition
 */
connectorSchema.methods.toConnectorDefinition = function (): ConnectorDefinition {
  return {
    id: this.connectorId,
    name: this.name,
    type: this.type,
    description: this.description,
    config: this.config,
    auth: this.auth,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ConnectorModel = mongoose.model<ConnectorDocument>('Connector', connectorSchema);
