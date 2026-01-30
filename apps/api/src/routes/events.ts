import { InternalEvent } from "@glue/core";
import { FastifyPluginAsync } from "fastify";
import { TriggerManager } from "../triggers";

/**
 * Event routes - for publishing internal events
 */
const eventRoutes: FastifyPluginAsync = async (fastify) => {
  const getTriggerManager = (): TriggerManager => {
    return (fastify as any).triggerManager;
  };

  /**
   * Publish an internal event
   */
  fastify.post(
    "/events",
    {
      schema: {
        tags: ["events"],
        summary: "Publish an event",
        description: "Publish an internal event to trigger workflows",
        body: {
          type: "object",
          required: ["eventType"],
          properties: {
            eventType: { type: "string", description: "Type of event" },
            source: { type: "string", description: "Source of the event" },
            data: { type: "object", description: "Event data payload" },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Event timestamp",
            },
            metadata: { type: "object", description: "Additional metadata" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              eventType: { type: "string" },
              triggeredWorkflows: { type: "number" },
              jobIds: { type: "array", items: { type: "string" } },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as any;

        // Validate event structure
        if (!body.eventType) {
          return reply.code(400).send({
            error: "Missing required field: eventType",
          });
        }

        const event: InternalEvent = {
          eventType: body.eventType,
          source: body.source,
          data: body.data || {},
          timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
          metadata: body.metadata,
        };

        const triggerManager = getTriggerManager();
        const jobIds = await triggerManager.publishEvent(event);

        return reply.code(200).send({
          message: "Event published successfully",
          eventType: event.eventType,
          triggeredWorkflows: jobIds.length,
          jobIds,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to publish event",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  /**
   * List all registered event triggers
   */
  fastify.get(
    "/events/triggers",
    {
      schema: {
        tags: ["events"],
        summary: "List event triggers",
        description: "Get all workflows registered to listen for events",
        response: {
          200: {
            type: "object",
            properties: {
              eventTriggers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    workflowId: { type: "string" },
                    workflowName: { type: "string" },
                    eventType: { type: "string" },
                    source: { type: "string" },
                    filters: { type: "object" },
                  },
                },
              },
              count: { type: "number" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const triggerManager = getTriggerManager();
        const eventHandler = triggerManager.getEventHandler();
        const registrations = eventHandler.getAllRegistrations();

        return reply.send({
          eventTriggers: registrations.map((reg) => ({
            workflowId: reg.workflowId,
            workflowName: reg.workflow.name,
            eventType: reg.config.eventType,
            source: reg.config.source,
            filters: reg.config.filters,
          })),
          count: registrations.length,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to list event triggers",
        });
      }
    },
  );
};

export default eventRoutes;
