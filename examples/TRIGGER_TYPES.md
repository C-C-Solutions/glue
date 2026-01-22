# Workflow Trigger Types

Triggers define how and when a workflow execution starts. The Glue integration engine supports four trigger types: **manual**, **webhook**, **schedule**, and **event**.

## Trigger Types Overview

| Type | When to Use | How It Works | Example Use Case |
|------|-------------|--------------|------------------|
| `manual` | On-demand execution | Started via API call | Testing, admin tasks, one-off data processing |
| `webhook` | External system integration | Started when HTTP webhook receives request | GitHub push events, Stripe payments, third-party notifications |
| `schedule` | Time-based automation | Started on a schedule (cron-like) | Daily reports, nightly backups, periodic data syncs |
| `event` | Internal system events | Started by internal application events | Database changes, queue messages, internal state changes |

## 1. Manual Trigger

**Purpose**: Execute workflow on-demand through direct API calls.

**Configuration**:
```json
{
  "trigger": {
    "type": "manual"
  }
}
```

**How to Execute**:
```bash
curl -X POST http://localhost:3000/workflows/{workflowId}/execute \
  -H "Content-Type: application/json" \
  -d '{"userId": 123, "action": "process"}'
```

**Use Cases**:
- Testing and development
- Administrative tasks requiring explicit execution
- User-initiated processes (e.g., "Generate Report" button)
- One-off data migrations or processing jobs

**Characteristics**:
- ✅ Simple to use and understand
- ✅ Full control over execution timing
- ✅ Can pass input data directly in API call
- ⚠️ Requires manual intervention or external orchestration

## 2. Webhook Trigger

**Purpose**: Execute workflow when an external HTTP webhook is called.

**Configuration**:
```json
{
  "trigger": {
    "type": "webhook",
    "config": {
      "path": "/webhook/process-data",
      "method": "POST",
      "authentication": {
        "type": "secret",
        "headerName": "X-Webhook-Secret",
        "secret": "${env.WEBHOOK_SECRET}"
      }
    }
  }
}
```

**How It Works**:
1. Glue API registers a webhook endpoint at the configured path
2. External service sends HTTP request to webhook URL
3. Workflow executes automatically with webhook payload as input
4. Response returned to the calling service

**Example Webhook URL**:
```
https://your-glue-instance.com/webhook/process-data
```

**Use Cases**:
- **GitHub**: Trigger on push, PR creation, issue updates
- **Stripe**: Process payment events, subscription changes
- **Shopify**: Handle new orders, inventory updates
- **Slack**: Respond to slash commands, interactive messages
- **CI/CD**: Deploy on successful build
- **IoT**: Process device events, sensor data

**Example - GitHub Push Event**:
```json
{
  "id": "github-ci-pipeline",
  "name": "GitHub CI Pipeline",
  "trigger": {
    "type": "webhook",
    "config": {
      "path": "/webhook/github/push",
      "method": "POST",
      "authentication": {
        "type": "secret",
        "headerName": "X-Hub-Signature-256"
      }
    }
  },
  "steps": [
    {
      "id": "extract_commit",
      "type": "connector",
      "config": { "connectorType": "javascript" },
      "parameters": {
        "code": "return { repo: payload.repository.name, commit: payload.head_commit.id, author: payload.head_commit.author.name };",
        "context": { "payload": "${workflow.input}" }
      }
    },
    {
      "id": "notify_slack",
      "type": "connector",
      "config": {
        "connectorType": "http",
        "url": "${env.SLACK_WEBHOOK_URL}",
        "method": "POST"
      },
      "parameters": {
        "body": {
          "text": "New commit to ${steps.extract_commit.data.repo} by ${steps.extract_commit.data.author}"
        }
      },
      "dependsOn": ["extract_commit"]
    }
  ]
}
```

**Characteristics**:
- ✅ Real-time integration with external systems
- ✅ Event-driven architecture
- ✅ No polling required
- ⚠️ Requires publicly accessible endpoint (or VPN/tunnel)
- ⚠️ Need to handle webhook authentication/security
- ⚠️ External service must support webhooks

## 3. Schedule Trigger

**Purpose**: Execute workflow on a recurring schedule.

**Configuration**:
```json
{
  "trigger": {
    "type": "schedule",
    "config": {
      "cron": "0 2 * * *",
      "timezone": "America/New_York"
    }
  }
}
```

**Cron Expression Format**:
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Common Schedules**:
| Schedule | Cron Expression | Use Case |
|----------|----------------|----------|
| Every hour | `0 * * * *` | Sync data, check status |
| Daily at 2 AM | `0 2 * * *` | Generate reports, backups |
| Every weekday at 9 AM | `0 9 * * 1-5` | Send morning digest |
| Every 15 minutes | `*/15 * * * *` | Monitor services |
| First of month at midnight | `0 0 1 * *` | Monthly reports |
| Every Sunday at 3 AM | `0 3 * * 0` | Weekly cleanup |

**Use Cases**:
- **Daily Reports**: Generate and email reports every morning
- **Nightly Backups**: Backup databases during off-peak hours
- **Data Synchronization**: Sync data between systems periodically
- **Monitoring**: Check service health regularly
- **Cleanup Tasks**: Remove old records, archive logs
- **Batch Processing**: Process accumulated data in batches

**Example - Daily Report**:
```json
{
  "id": "daily-sales-report",
  "name": "Daily Sales Report",
  "trigger": {
    "type": "schedule",
    "config": {
      "cron": "0 8 * * *",
      "timezone": "UTC"
    }
  },
  "steps": [
    {
      "id": "query_sales",
      "type": "connector",
      "config": {
        "connectorType": "postgres",
        "host": "${env.DB_HOST}",
        "database": "sales",
        "user": "${env.DB_USER}",
        "password": "${env.DB_PASSWORD}"
      },
      "parameters": {
        "query": "SELECT * FROM sales WHERE date = CURRENT_DATE - INTERVAL '1 day'"
      }
    },
    {
      "id": "generate_report",
      "type": "connector",
      "config": {
        "connectorType": "javascript"
      },
      "parameters": {
        "code": "const total = sales.reduce((sum, s) => sum + s.amount, 0); return { total, count: sales.length, average: total / sales.length };",
        "context": { "sales": "${steps.query_sales.data}" }
      },
      "dependsOn": ["query_sales"]
    },
    {
      "id": "email_report",
      "type": "connector",
      "config": {
        "connectorType": "smtp",
        "host": "${env.SMTP_HOST}",
        "from": "reports@company.com"
      },
      "parameters": {
        "to": "sales-team@company.com",
        "subject": "Daily Sales Report",
        "html": "<h2>Yesterday's Sales</h2><p>Total: $${steps.generate_report.data.total}</p><p>Orders: ${steps.generate_report.data.count}</p>"
      },
      "dependsOn": ["generate_report"]
    }
  ]
}
```

**Characteristics**:
- ✅ Automatic execution at specified times
- ✅ No manual intervention required
- ✅ Predictable execution schedule
- ⚠️ Fixed schedule (not event-driven)
- ⚠️ May run when no work is needed
- ⚠️ Time zone considerations important

## 4. Event Trigger

**Purpose**: Execute workflow in response to internal application events.

**Configuration**:
```json
{
  "trigger": {
    "type": "event",
    "config": {
      "eventType": "user.created",
      "source": "user-service",
      "filters": {
        "accountType": "premium"
      }
    }
  }
}
```

**How It Works**:
1. Application publishes events to event bus/queue
2. Glue workflow engine subscribes to specific event types
3. When matching event occurs, workflow executes with event data as input

**Use Cases**:
- **User Lifecycle**: Welcome emails, onboarding workflows
- **Order Processing**: Inventory updates, shipping notifications
- **Data Pipeline**: Process new records, trigger downstream jobs
- **State Machine**: React to state changes, orchestrate processes
- **Microservices**: Inter-service communication, saga patterns

**Example - User Onboarding**:
```json
{
  "id": "user-onboarding",
  "name": "New User Onboarding Workflow",
  "trigger": {
    "type": "event",
    "config": {
      "eventType": "user.created",
      "source": "auth-service"
    }
  },
  "steps": [
    {
      "id": "send_welcome_email",
      "type": "connector",
      "config": {
        "connectorType": "smtp",
        "host": "${env.SMTP_HOST}",
        "from": "welcome@company.com"
      },
      "parameters": {
        "to": "${workflow.input.user.email}",
        "subject": "Welcome to Our Platform!",
        "html": "<h1>Welcome ${workflow.input.user.name}!</h1>"
      }
    },
    {
      "id": "create_default_settings",
      "type": "connector",
      "config": {
        "connectorType": "postgres",
        "host": "${env.DB_HOST}",
        "database": "app"
      },
      "parameters": {
        "query": "INSERT INTO user_settings (user_id, theme, notifications) VALUES ($1, 'light', true)",
        "params": ["${workflow.input.user.id}"]
      }
    },
    {
      "id": "notify_admin",
      "type": "connector",
      "config": {
        "connectorType": "http",
        "url": "${env.SLACK_WEBHOOK_URL}",
        "method": "POST"
      },
      "parameters": {
        "body": {
          "text": "New user registered: ${workflow.input.user.email}"
        }
      }
    }
  ]
}
```

**Characteristics**:
- ✅ Event-driven, reactive architecture
- ✅ Decoupled from event source
- ✅ Real-time processing
- ✅ Scales with event volume
- ⚠️ Requires event infrastructure (message queue, event bus)
- ⚠️ Need to handle event ordering, deduplication
- ⚠️ More complex debugging and monitoring

## Choosing the Right Trigger

### Decision Tree

```
┌─ Need immediate response to external system?
│  └─ YES → Webhook
│
├─ Need to run on a schedule?
│  └─ YES → Schedule
│
├─ Responding to internal application events?
│  └─ YES → Event
│
└─ Everything else (testing, on-demand, user-initiated)
   └─ Manual
```

### Comparison Matrix

| Aspect | Manual | Webhook | Schedule | Event |
|--------|--------|---------|----------|-------|
| **Latency** | Immediate | Real-time | Scheduled | Real-time |
| **External Integration** | ❌ | ✅ | ❌ | ❌ |
| **Internal Integration** | ❌ | ❌ | ❌ | ✅ |
| **Automation** | ❌ | ✅ | ✅ | ✅ |
| **Complexity** | Low | Medium | Medium | High |
| **Predictability** | High | Medium | High | Low |
| **Resource Usage** | On-demand | Event-driven | Scheduled | Event-driven |

## Best Practices

### Manual Triggers
- ✅ Use for testing and development
- ✅ Document required input parameters
- ✅ Add authentication/authorization
- ✅ Provide clear error messages

### Webhook Triggers
- ✅ Validate webhook signatures
- ✅ Use HTTPS in production
- ✅ Implement idempotency for duplicate events
- ✅ Return appropriate HTTP status codes quickly
- ✅ Process asynchronously if workflow takes time
- ⚠️ Don't expose sensitive data in webhook URLs

### Schedule Triggers
- ✅ Use UTC timezone unless specific requirement
- ✅ Consider execution time and resource usage
- ✅ Add monitoring for missed executions
- ✅ Implement idempotency (in case of retries)
- ⚠️ Don't schedule too frequently (respect rate limits)
- ⚠️ Account for daylight saving time changes

### Event Triggers
- ✅ Define clear event schemas
- ✅ Use semantic event names (user.created, order.shipped)
- ✅ Include event metadata (timestamp, source, version)
- ✅ Implement dead letter queues for failures
- ✅ Monitor event processing metrics
- ⚠️ Handle duplicate events gracefully
- ⚠️ Consider event ordering requirements

## Current Implementation Status

As of this release, the Glue integration engine provides:

| Trigger Type | Status | Notes |
|--------------|--------|-------|
| Manual | ✅ Fully Implemented | Available via POST /workflows/:id/execute |
| Webhook | ✅ Fully Implemented | Registered on API startup, supports authentication |
| Schedule | ✅ Fully Implemented | Cron-based scheduling with BullMQ repeatable jobs |
| Event | ✅ Fully Implemented | Internal event bus with filtering support |

## Examples in This Repository

The repository includes example workflows for all trigger types:

**Manual Triggers** (examples 01-08):
```bash
# Execute any workflow manually
curl -X POST http://localhost:3000/workflows/{workflowId}/execute \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

**Webhook Triggers** (example 09):
```bash
# Trigger via webhook endpoint
curl -X POST http://localhost:3000/webhooks/github/push \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: your-secret" \
  -d '{"repository": {"name": "test"}, "head_commit": {...}}'
```

**Schedule Triggers** (example 10):
- Automatically executed based on cron schedule
- No manual trigger needed - runs at scheduled times

**Event Triggers** (example 11):
```bash
# Publish an event to trigger workflows
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"eventType": "user.created", "source": "auth-service", "data": {...}}'
```

## API Endpoints

### Webhook Management
- `GET /webhooks` - List all registered webhooks
- `POST /webhooks/*` - Webhook endpoint (dynamic path based on workflow config)

### Schedule Management
- `GET /schedules` - List all registered scheduled workflows

### Event Management
- `GET /events/triggers` - List all registered event triggers
- `POST /events` - Publish an event to trigger matching workflows

## Testing

Use the provided test script to try all trigger types:

```bash
cd examples
./test-trigger-types.sh
```

## Further Reading

- [Workflow Definition Documentation](../README.md#architecture)
- [API Documentation](../apps/api/README.md)
- [Testing Guide](./README.md)
- [Quick Reference](./QUICK_REFERENCE.md)
