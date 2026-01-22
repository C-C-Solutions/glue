# Trigger Implementation

This document describes the implementation of webhook, scheduled, and event triggers for the Glue integration engine.

## Overview

The trigger system allows workflows to be executed automatically in response to different events:

- **Webhook Triggers**: HTTP endpoints that execute workflows when called
- **Schedule Triggers**: Cron-based scheduling for time-based execution
- **Event Triggers**: Internal event bus for application event handling

## Architecture

### Core Components

#### Trigger Handlers (`packages/core/src/triggers/`)

Each trigger type has a dedicated handler:

- `WebhookHandler`: Manages webhook registrations and request handling
- `ScheduleHandler`: Manages cron schedules using BullMQ repeatable jobs
- `EventHandler`: Manages event subscriptions and filtering

#### Trigger Manager (`apps/api/src/triggers/`)

The `TriggerManager` coordinates all trigger handlers:
- Initializes handlers on API startup
- Registers workflows with appropriate handlers
- Provides unified interface for trigger operations

### Data Flow

```
Workflow Creation
    ↓
TriggerManager.registerWorkflow()
    ↓
Handler (Webhook/Schedule/Event)
    ↓
Registration Complete

Trigger Event
    ↓
Handler.handle*() / publishEvent()
    ↓
WorkflowQueue.addExecuteJob()
    ↓
Worker processes job
    ↓
Workflow execution
```

## API Endpoints

### Webhooks

#### List Registered Webhooks
```bash
GET /webhooks
```

Returns all registered webhook workflows with their configuration.

#### Trigger Webhook
```bash
POST /webhooks/<path>
Content-Type: application/json
X-Webhook-Secret: <secret>  # Optional, based on config

{
  "your": "payload"
}
```

The `<path>` is defined in the workflow's trigger configuration.

### Schedules

#### List Scheduled Workflows
```bash
GET /schedules
```

Returns all registered scheduled workflows with their cron expressions.

### Events

#### List Event Triggers
```bash
GET /events/triggers
```

Returns all registered event-triggered workflows.

#### Publish Event
```bash
POST /events
Content-Type: application/json

{
  "eventType": "user.created",
  "source": "auth-service",
  "data": {
    "userId": "123",
    "email": "user@example.com"
  },
  "metadata": {
    "optional": "metadata"
  }
}
```

## Configuration Examples

### Webhook Trigger

```json
{
  "trigger": {
    "type": "webhook",
    "config": {
      "path": "/github/push",
      "method": "POST",
      "authentication": {
        "type": "secret",
        "headerName": "X-Hub-Signature-256",
        "secret": "${env.GITHUB_WEBHOOK_SECRET}"
      }
    }
  }
}
```

**Authentication Types:**
- `none`: No authentication required
- `secret`: Header-based secret validation
- `bearer`: Bearer token authentication
- `basic`: Basic HTTP authentication

### Schedule Trigger

```json
{
  "trigger": {
    "type": "schedule",
    "config": {
      "cron": "0 8 * * *",
      "timezone": "America/New_York"
    }
  }
}
```

**Cron Format:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-6, Sunday to Saturday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Common Patterns:**
- `0 * * * *` - Every hour
- `*/15 * * * *` - Every 15 minutes
- `0 8 * * *` - Daily at 8 AM
- `0 9 * * 1-5` - Weekdays at 9 AM
- `0 0 1 * *` - First of month at midnight

### Event Trigger

```json
{
  "trigger": {
    "type": "event",
    "config": {
      "eventType": "user.created",
      "source": "auth-service",
      "filters": {
        "accountType": "premium"
      }
    }
  }
}
```

**Event Filtering:**
- `eventType`: Required, the type of event to listen for
- `source`: Optional, filter by event source
- `filters`: Optional, key-value pairs to filter event data

## Testing

### Unit Tests

Run trigger handler tests:
```bash
cd packages/core
pnpm test
```

Tests cover:
- Workflow registration
- Trigger validation
- Authentication handling
- Event filtering
- Schedule validation

### Integration Testing

Use the provided test script:
```bash
cd examples
./test-trigger-types.sh
```

This script:
1. Creates workflows for each trigger type
2. Lists registered triggers
3. Triggers webhooks with sample payloads
4. Publishes events
5. Verifies execution

### Manual Testing

1. Start the infrastructure:
```bash
docker-compose up -d
```

2. Start the API and worker:
```bash
# Terminal 1
cd apps/api
pnpm dev

# Terminal 2
cd apps/worker
pnpm dev
```

3. Create a webhook workflow:
```bash
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d @examples/09-webhook-github-push.json
```

4. Trigger the webhook:
```bash
curl -X POST http://localhost:3000/webhooks/github/push \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: test" \
  -d '{"repository": {"name": "test"}, "head_commit": {"id": "abc123"}}'
```

5. Check execution:
```bash
curl http://localhost:3000/workflows/webhook-github-push/executions
```

## Implementation Details

### Webhook Handler

- Registers webhook paths on workflow creation
- Validates HTTP method and authentication
- Normalizes paths to start with `/`
- Supports multiple authentication schemes
- Returns job ID immediately for async processing

### Schedule Handler

- Uses BullMQ's repeatable jobs feature
- Validates cron expressions on registration
- Supports timezone configuration
- Automatically registers on API startup
- Cleans up when workflows are deleted

### Event Handler

- In-memory event subscription system
- Supports multiple workflows per event type
- Filters events by source and custom criteria
- Returns all triggered job IDs
- Executes workflows asynchronously

### Trigger Manager

- Singleton coordinator for all handlers
- Initializes handlers on API startup
- Loads existing workflows from database
- Handles workflow lifecycle (create/delete)
- Provides unified interface for all trigger types

## Security Considerations

### Webhooks

- Always use authentication for production webhooks
- Validate webhook signatures for external services
- Use HTTPS in production
- Consider rate limiting for webhook endpoints
- Log all webhook attempts for security auditing

### Schedules

- Validate cron expressions to prevent denial of service
- Monitor scheduled job execution for failures
- Use appropriate retry policies
- Consider time zone implications for critical tasks

### Events

- Validate event payloads before processing
- Consider event schema versioning
- Implement dead letter queues for failed events
- Monitor event processing metrics

## Performance Considerations

- Webhook responses are immediate (job is queued)
- Schedule jobs use BullMQ's built-in optimizations
- Event handlers execute subscriptions in parallel
- All trigger types leverage the existing queue system
- Failed executions are retried according to job configuration

## Future Enhancements

Potential improvements:
- Webhook signature validation for specific providers (GitHub, Stripe, etc.)
- Schedule triggers with dynamic parameters
- Event schema validation
- Trigger execution history and metrics
- Webhook replay capabilities
- Advanced event filtering with JSONPath or expressions
- Trigger rate limiting and throttling
