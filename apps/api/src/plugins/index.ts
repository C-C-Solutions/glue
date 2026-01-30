import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { FastifyPluginAsync } from "fastify";

/**
 * Register plugins
 */
const plugins: FastifyPluginAsync = async (fastify) => {
  // CORS plugin
  await fastify.register(cors, {
    origin: true,
  });

  // Swagger OpenAPI documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Glue Workflow API",
        description:
          "API for managing and executing workflows with various connectors and triggers",
        version: "0.1.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
      ],
      tags: [
        { name: "health", description: "Health check endpoints" },
        { name: "workflows", description: "Workflow management" },
        { name: "executions", description: "Workflow execution tracking" },
        { name: "events", description: "Event publishing and triggers" },
        { name: "schedules", description: "Scheduled workflow management" },
        { name: "webhooks", description: "Webhook management" },
      ],
    },
  });

  // Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
  });
};

export default plugins;
