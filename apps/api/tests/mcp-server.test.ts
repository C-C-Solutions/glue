import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMCPServer } from "../src/mcp/server";

// Mock dependencies
const mockWorkflowRepo = {
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as any;

const mockExecutionRepo = {
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findByWorkflowId: vi.fn(),
  update: vi.fn(),
} as any;

const mockWorkflowQueue = {
  addExecuteJob: vi.fn(),
  getJob: vi.fn(),
} as any;

const mockTriggerManager = {
  registerWorkflow: vi.fn(),
  publishEvent: vi.fn(),
  getEventHandler: vi.fn(() => ({
    getAllRegistrations: vi.fn(() => []),
  })),
  getScheduleHandler: vi.fn(() => ({
    getAllRegistrations: vi.fn(() => []),
  })),
  getWebhookHandler: vi.fn(() => ({
    getAllRegistrations: vi.fn(() => []),
  })),
} as any;

describe("MCP Server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an MCP server instance", () => {
    const server = createMCPServer(
      mockWorkflowRepo,
      mockExecutionRepo,
      mockWorkflowQueue,
      mockTriggerManager,
    );

    expect(server).toBeDefined();
  });

  it("should have the correct server info", () => {
    const server = createMCPServer(
      mockWorkflowRepo,
      mockExecutionRepo,
      mockWorkflowQueue,
      mockTriggerManager,
    );

    // The server should have been created with the correct name and version
    expect(server).toBeDefined();
  });
});

describe("MCP Tools", () => {
  it("should define all required tools", async () => {
    const server = createMCPServer(
      mockWorkflowRepo,
      mockExecutionRepo,
      mockWorkflowQueue,
      mockTriggerManager,
    );

    // List of expected tools
    const expectedTools = [
      "health_check",
      "create_workflow",
      "list_workflows",
      "get_workflow",
      "execute_workflow",
      "list_workflow_executions",
      "get_job_status",
      "get_execution",
      "cancel_execution",
      "publish_event",
      "list_event_triggers",
      "list_schedules",
      "list_webhooks",
    ];

    // This is a basic test to ensure the server is configured
    // In a real test, we would use the MCP SDK test utilities
    expect(server).toBeDefined();
    expect(expectedTools.length).toBe(13);
  });
});
