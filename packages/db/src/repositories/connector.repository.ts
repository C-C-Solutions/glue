import { ConnectorDefinition } from '@glue/core';
import { ConnectorModel, ConnectorDocument } from '../models/connector.model';

/**
 * Connector repository for database operations
 */
export class ConnectorRepository {
  /**
   * Create a new connector
   */
  async create(connector: ConnectorDefinition): Promise<ConnectorDefinition> {
    const doc = await ConnectorModel.create({
      connectorId: connector.id,
      name: connector.name,
      type: connector.type,
      description: connector.description,
      config: connector.config,
      auth: connector.auth,
      metadata: connector.metadata,
    });
    
    return (doc as ConnectorDocument).toConnectorDefinition();
  }
  
  /**
   * Find connector by ID
   */
  async findById(id: string): Promise<ConnectorDefinition | null> {
    const doc = await ConnectorModel.findOne({ connectorId: id });
    return doc ? (doc as ConnectorDocument).toConnectorDefinition() : null;
  }
  
  /**
   * Find all connectors
   */
  async findAll(limit = 100, skip = 0): Promise<ConnectorDefinition[]> {
    const docs = await ConnectorModel.find().limit(limit).skip(skip).sort({ createdAt: -1 });
    return docs.map((doc) => (doc as ConnectorDocument).toConnectorDefinition());
  }
  
  /**
   * Find connectors by type
   */
  async findByType(type: string): Promise<ConnectorDefinition[]> {
    const docs = await ConnectorModel.find({ type });
    return docs.map((doc) => (doc as ConnectorDocument).toConnectorDefinition());
  }
  
  /**
   * Update connector
   */
  async update(id: string, updates: Partial<ConnectorDefinition>): Promise<ConnectorDefinition | null> {
    const doc = await ConnectorModel.findOneAndUpdate(
      { connectorId: id },
      {
        ...(updates.name && { name: updates.name }),
        ...(updates.type && { type: updates.type }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.config && { config: updates.config }),
        ...(updates.auth !== undefined && { auth: updates.auth }),
        ...(updates.metadata !== undefined && { metadata: updates.metadata }),
      },
      { new: true }
    );
    
    return doc ? (doc as ConnectorDocument).toConnectorDefinition() : null;
  }
  
  /**
   * Delete connector
   */
  async delete(id: string): Promise<boolean> {
    const result = await ConnectorModel.deleteOne({ connectorId: id });
    return result.deletedCount > 0;
  }
  
  /**
   * Check if connector exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await ConnectorModel.countDocuments({ connectorId: id });
    return count > 0;
  }
}
