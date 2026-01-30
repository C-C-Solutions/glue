import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import plugins from "./plugins";
import routes from "./routes";

/**
 * Build Fastify application
 */
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // Register plugins (CORS, etc.)
  await app.register(plugins);

  // Register Swagger before routes so it can capture schemas
  await app.register(swagger, {
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

  // Register routes
  await app.register(routes, { prefix: "/api/v1" });

  // Register Swagger UI after routes
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
  });

  return app;
}
