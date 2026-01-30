import { FastifyPluginAsync } from "fastify";

/**
 * Health check route
 */
const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Check API health",
        description: "Returns the health status of the API server",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              timestamp: { type: "string", format: "date-time" },
              uptime: {
                type: "number",
                description: "Server uptime in seconds",
              },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  );
};

export default healthRoutes;
