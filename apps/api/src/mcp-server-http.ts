#!/usr/bin/env node
import "dotenv/config";
import { loadEnv } from "@glue/config";
import {
  connectToDatabase,
  WorkflowRepository,
  ExecutionRepository,
} from "@glue/db";
import { WorkflowQueue } from "@glue/queue";
import { TriggerManager } from "./triggers";
import { createMCPServer } from "./mcp";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";

/**
 * Start the MCP server over HTTP/SSE for remote access (SaaS mode)
 * This allows decoupled applications (n8n, other agentic servers) to access MCP tools remotely
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

    // Create Express app for HTTP/SSE transport
    const app = express();
    
    // Enable CORS for cross-origin requests (needed for SaaS usage)
    app.use(cors({
      origin: process.env.MCP_ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
    }));
    
    app.use(express.json());

    // Health check endpoint
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // SSE endpoint for MCP connection
    app.get("/sse", async (req, res) => {
      console.error(`New SSE connection from ${req.ip}`);
      
      const transport = new SSEServerTransport("/message", res);
      const mcpServer = createMCPServer(
        workflowRepo,
        executionRepo,
        workflowQueue,
        triggerManager,
      );
      
      await mcpServer.connect(transport);
      
      // Keep connection alive
      req.on("close", () => {
        console.error(`SSE connection closed from ${req.ip}`);
      });
    });

    // POST endpoint for client messages
    app.post("/message", async (_req, res) => {
      // SSE transport handles this automatically
      res.status(200).send();
    });

    const port = parseInt(process.env.MCP_HTTP_PORT || "3001", 10);
    const host = process.env.MCP_HTTP_HOST || "0.0.0.0";

    app.listen(port, host, () => {
      console.error(`🚀 MCP HTTP/SSE server running at http://${host}:${port}`);
      console.error(`   SSE endpoint: http://${host}:${port}/sse`);
      console.error(`   Message endpoint: http://${host}:${port}/message`);
      console.error(`   Health check: http://${host}:${port}/health`);
    });
  } catch (error) {
    console.error("Failed to start MCP HTTP server:", error);
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
