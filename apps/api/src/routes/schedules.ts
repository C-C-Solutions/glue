import { FastifyPluginAsync } from "fastify";
import { TriggerManager } from "../triggers";

/**
 * Schedule routes - for managing scheduled workflows
 */
const scheduleRoutes: FastifyPluginAsync = async (fastify) => {
  const getTriggerManager = (): TriggerManager => {
    return (fastify as any).triggerManager;
  };

  /**
   * List all registered scheduled workflows
   */
  fastify.get(
    "/schedules",
    {
      schema: {
        tags: ["schedules"],
        summary: "List all schedules",
        description: "Get all workflows registered with cron schedules",
        response: {
          200: {
            type: "object",
            properties: {
              schedules: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    workflowId: { type: "string" },
                    workflowName: { type: "string" },
                    cron: { type: "string" },
                    timezone: { type: "string" },
                    repeatableKey: { type: "string" },
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
        const scheduleHandler = triggerManager.getScheduleHandler();
        const registrations = scheduleHandler.getAllRegistrations();

        return reply.send({
          schedules: registrations.map((reg) => ({
            workflowId: reg.workflowId,
            workflowName: reg.workflow.name,
            cron: reg.config.cron,
            timezone: reg.config.timezone || "UTC",
            repeatableKey: reg.repeatableKey,
          })),
          count: registrations.length,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Failed to list schedules",
        });
      }
    },
  );
};

export default scheduleRoutes;
