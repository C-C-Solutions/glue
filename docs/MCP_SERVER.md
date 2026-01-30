# MCP (Model Context Protocol) Server

The Glue Workflow API now includes MCP server support, enabling AI agents and assistants to interact with all API endpoints as MCP tools.

## Architecture Overview

```
┌─────────────────┐
│  AI Assistant   │
│ (Claude, etc.)  │
└────────┬────────┘
         │ stdio
         │
┌────────▼────────────────────────────────────────┐
│           MCP Server                            │
│  (apps/api/src/mcp-server.ts)                  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  13 MCP Tools (server.ts)                │  │
│  │  • health_check                          │  │
│  │  • create_workflow, list_workflows, ...  │  │
│  │  • execute_workflow, get_execution, ...  │  │
│  │  • publish_event, list_schedules, ...    │  │
│  └──────────────────────────────────────────┘  │
└────────┬────────────────────────────────────────┘
         │
         │ Uses same infrastructure as REST API
         │
    ┌────▼─────┬──────────┬──────────┐
    │          │          │          │
┌───▼────┐ ┌──▼────┐ ┌───▼────┐ ┌──▼────────┐
│MongoDB │ │ Redis │ │WorkRepo│ │ExecRepo   │
└────────┘ └───────┘ └────────┘ └───────────┘
```

## Overview

Model Context Protocol (MCP) is a standardized protocol for connecting external tools, resources, and prompts to AI agents. This implementation exposes all Glue API endpoints as MCP tools, allowing AI assistants like Claude to autonomously discover and use workflow management features.

## Available MCP Tools

All API endpoints are available as MCP tools:

### Health Check
- `health_check` - Check the health status of the API server

### Workflow Management
- `create_workflow` - Create a new workflow definition with steps and triggers
- `list_workflows` - List all workflow definitions with pagination
- `get_workflow` - Get a specific workflow definition by ID
- `execute_workflow` - Queue a workflow for execution with optional input data
- `list_workflow_executions` - Get executions for a specific workflow

### Execution Management
- `get_job_status` - Get the status of a queued job
- `get_execution` - Get detailed information about a workflow execution
- `cancel_execution` - Cancel a running or queued workflow execution

### Event Management
- `publish_event` - Publish an internal event to trigger workflows
- `list_event_triggers` - Get all workflows registered to listen for events

### Schedule Management
- `list_schedules` - Get all workflows registered with cron schedules

### Webhook Management
- `list_webhooks` - Get all workflows registered as webhook endpoints

For practical usage examples with AI assistants, see [MCP_USAGE_EXAMPLES.md](./MCP_USAGE_EXAMPLES.md).

## Running the MCP Server

### Development Mode

```bash
# From the root directory
cd apps/api
pnpm dev:mcp
```

### Production Mode

```bash
# Build first
cd apps/api
pnpm build

# Run the MCP server
pnpm start:mcp
```

## Configuration for AI Assistants

### Claude Desktop Configuration

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "glue-workflow-api": {
      "command": "node",
      "args": ["/path/to/glue/apps/api/dist/mcp-server.js"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017/glue",
        "REDIS_URL": "redis://localhost:6379",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Using tsx for Development

For development with auto-reload:

```json
{
  "mcpServers": {
    "glue-workflow-api": {
      "command": "npx",
      "args": ["tsx", "/path/to/glue/apps/api/src/mcp-server.ts"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017/glue",
        "REDIS_URL": "redis://localhost:6379",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Environment Variables

The MCP server requires the same environment variables as the API server:

- `MONGODB_URI` - MongoDB connection string (required)
- `REDIS_URL` - Redis connection string (required)
- `NODE_ENV` - Environment (default: development)
- `LOG_LEVEL` - Logging level (default: info)
- `PORT` - Not used by MCP server (uses stdio transport)

## Example Usage with AI Assistants

Once configured, AI assistants can use natural language to interact with the API:

### Creating a Workflow
```
"Create a workflow called 'hello-world' with version 1.0.0 that has a manual trigger and a single HTTP step to fetch data from https://api.example.com"
```

### Executing a Workflow
```
"Execute the workflow with ID 'hello-world' with input data { 'name': 'Alice' }"
```

### Monitoring Executions
```
"Show me the execution status for execution ID abc123"
```

### Managing Events
```
"Publish an event of type 'user.created' with data { 'userId': 42, 'email': 'user@example.com' }"
```

## Architecture

The MCP server:

1. **Runs as a separate process** from the API server on stdio transport
2. **Shares the same database and queue** connections as the API
3. **Implements all API endpoints** as MCP tools with identical functionality
4. **Uses Zod schemas** for input validation
5. **Returns JSON responses** formatted as text content

## Benefits

- **AI-Native Integration**: AI assistants can discover and use all API features autonomously
- **Consistent Interface**: MCP tools mirror the REST API exactly
- **Type Safety**: Full TypeScript support with Zod validation
- **Minimal Overhead**: Separate process allows independent scaling
- **Developer-Friendly**: Standard MCP protocol supported by major AI platforms

## Testing

You can test the MCP server using the MCP Inspector tool:

```bash
npx @modelcontextprotocol/inspector node dist/mcp-server.js
```

Or manually test with stdio:

```bash
# Start the server
node dist/mcp-server.js

# Send a tool call (as JSON on stdin)
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/mcp-server.js
```

## Troubleshooting

### Connection Issues

If the MCP server fails to connect:

1. Verify MongoDB and Redis are running
2. Check environment variables are correctly set
3. Ensure the database is accessible from the MCP server process

### Tool Discovery Issues

If AI assistants can't discover tools:

1. Verify the MCP server is running
2. Check the configuration file path
3. Restart the AI assistant application

### Execution Errors

If tool execution fails:

1. Check the MCP server logs (stderr)
2. Verify the input arguments match the schema
3. Ensure the database contains the required data

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop Configuration](https://docs.anthropic.com/en/docs/build-with-claude/model-context-protocol)
