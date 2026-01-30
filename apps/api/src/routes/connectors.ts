import {
  ConnectorDefinition,
  ConnectorDefinitionSchema,
} from "@glue/core";
import { ConnectorRepository } from "@glue/db";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createRouteSchema } from "../utils/schema";

/**
 * Connector routes
 */
const connectorRoutes: FastifyPluginAsync = async (fastify) => {
  const connectorRepo = new ConnectorRepository();

  /**
   * Create connector definition
   */
  fastify.post(
    "/connectors",
    {
      schema: createRouteSchema({
        tags: ["connectors"],
        summary: "Create a new connector",
        description: "Create a new connector definition with configuration and auth",
        body: ConnectorDefinitionSchema,
        response: {
          201: ConnectorDefinitionSchema,
          400: z.object({ error: z.string() }),
        },
      }),
    },
    async (request, reply) => {
      try {
        const connector = request.body as ConnectorDefinition;

        // Validate required fields
        if (!connector.id || !connector.name || !connector.type) {
          return reply.code(400).send({
            error: "Missing required fields: id, name, type",
          });
        }

        // Check if connector already exists
        const exists = await connectorRepo.exists(connector.id);
        if (exists) {
          return reply.code(400).send({
            error: "Connector with this ID already exists",
          });
        }

        const created = await connectorRepo.create(connector);

        return reply.code(201).send(created);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to create connector",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  /**
   * List all connectors
   */
  fastify.get(
    "/connectors",
    {
      schema: createRouteSchema({
        tags: ["connectors"],
        summary: "List all connectors",
        description: "Retrieve a paginated list of all connector definitions",
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(1000).default(100),
          skip: z.coerce.number().int().min(0).default(0),
          type: z.string().optional(),
        }),
        response: {
          200: z.object({
            connectors: z.array(ConnectorDefinitionSchema),
            count: z.number(),
          }),
        },
      }),
    },
    async (request, reply) => {
      try {
        const { limit = 100, skip = 0, type } = request.query as any;
        
        let connectors: ConnectorDefinition[];
        if (type) {
          connectors = await connectorRepo.findByType(type);
        } else {
          connectors = await connectorRepo.findAll(
            Number(limit),
            Number(skip),
          );
        }
        
        return reply.send({
          connectors,
          count: connectors.length,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to list connectors",
        });
      }
    },
  );

  /**
   * Get connector by ID
   */
  fastify.get(
    "/connectors/:id",
    {
      schema: createRouteSchema({
        tags: ["connectors"],
        summary: "Get connector by ID",
        description: "Retrieve a specific connector definition by its ID",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: ConnectorDefinitionSchema,
          404: z.object({ error: z.string() }),
        },
      }),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const connector = await connectorRepo.findById(id);

        if (!connector) {
          return reply.code(404).send({
            error: "Connector not found",
          });
        }

        return reply.send(connector);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to get connector",
        });
      }
    },
  );

  /**
   * Update connector
   */
  fastify.put(
    "/connectors/:id",
    {
      schema: createRouteSchema({
        tags: ["connectors"],
        summary: "Update connector",
        description: "Update an existing connector definition",
        params: z.object({
          id: z.string(),
        }),
        body: ConnectorDefinitionSchema.partial().omit({ id: true }),
        response: {
          200: ConnectorDefinitionSchema,
          404: z.object({ error: z.string() }),
        },
      }),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const updates = request.body as Partial<ConnectorDefinition>;

        const connector = await connectorRepo.update(id, updates);

        if (!connector) {
          return reply.code(404).send({
            error: "Connector not found",
          });
        }

        return reply.send(connector);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to update connector",
        });
      }
    },
  );
};

export default connectorRoutes;
