#!/usr/bin/env node
import "dotenv/config";
import { loadEnv } from "@glue/config";
import { connectToDatabase, WorkflowRepository, ExecutionRepository } from "@glue/db";
import { WorkflowQueue } from "@glue/queue";
import { TriggerManager } from "./triggers";
import { startMCPServer } from "./mcp";

/**
 * Start the MCP server
 * This runs as a separate process from the API server
 */
async function start() {
  try {
    // Load and validate environment variables
    const env = loadEnv();

    // Connect to MongoDB
    await connectToDatabase(env.MONGODB_URI);

    // Create workflow queue
    const workflowQueue = new WorkflowQueue(env.REDIS_URL);

    // Create repositories
    const workflowRepo = new WorkflowRepository();
    const executionRepo = new ExecutionRepository();

    // Initialize trigger manager
    const triggerManager = new TriggerManager(workflowRepo, workflowQueue);
    await triggerManager.initialize();

    // Start MCP server on stdio
    await startMCPServer(
      workflowRepo,
      executionRepo,
      workflowQueue,
      triggerManager,
    );
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.error("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.error("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

start();
