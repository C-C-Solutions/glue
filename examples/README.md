# Workflow Examples

This directory contains example workflow definitions that demonstrate the power of the Glue integration engine.

> **Note on Triggers**: All examples use `manual` triggers for easy testing. For detailed information about trigger types (`manual`, `webhook`, `schedule`, `event`), see [TRIGGER_TYPES.md](./TRIGGER_TYPES.md).

## 🚀 New: Individual Connector Examples

We've added simple, working examples for each connector that you can test immediately:

| File | Connectors | Description |
|------|-----------|-------------|
| `01-simple-http.json` | HTTP | Basic HTTP request to public API (no auth needed) |
| `02-http-with-javascript.json` | HTTP, JavaScript | Fetch data and transform with JavaScript |
| `03-graphql-basic.json` | GraphQL | Query GitHub's GraphQL API (requires token) |
| `04-postgres-query.json` | Postgres | Execute parameterized SQL query |
| `05-s3-operations.json` | HTTP, S3 | Fetch and save data to S3-compatible storage |
| `06-openai-summarize.json` | HTTP, OpenAI | Generate AI summary of fetched content |
| `07-smtp-notification.json` | HTTP, SMTP | Send email notification with data |
| `08-all-connectors-complete.json` | All 7 | Complete pipeline using all connectors |

## 🧪 Testing Workflows

### Prerequisites

1. Start the API and worker services:
```bash
# From repository root
pnpm dev
```

2. Ensure MongoDB and Redis are running (via `docker compose up -d` or dev container)

### Interactive Testing Tool

We provide a convenient test script:

```bash
# Run interactive menu
./examples/test-workflows.sh

# Or use specific commands:
./examples/test-workflows.sh create examples/01-simple-http.json
./examples/test-workflows.sh test examples/01-simple-http.json
./examples/test-workflows.sh list
```

### Manual Testing with curl

**Create a workflow:**
```bash
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d @examples/01-simple-http.json
```

**Execute a workflow:**
```bash
curl -X POST http://localhost:3000/workflows/simple-http-example/execute \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Check job status:**
```bash
curl http://localhost:3000/jobs/{jobId} | jq
```

**Get execution details:**
```bash
curl http://localhost:3000/executions/{executionId} | jq
```

### Testing Individual Examples

#### 1. Simple HTTP (No Dependencies)
```bash
./examples/test-workflows.sh test examples/01-simple-http.json
```

#### 2. HTTP + JavaScript (No Dependencies)
```bash
./examples/test-workflows.sh test examples/02-http-with-javascript.json
```

#### 3. GraphQL (Requires GITHUB_TOKEN)
```bash
export GITHUB_TOKEN="your_github_token"
./examples/test-workflows.sh test examples/03-graphql-basic.json
```

#### 4. Postgres (Requires Database)
Set up environment variables:
```bash
export DB_HOST=localhost
export DB_NAME=test_db
export DB_USER=postgres
export DB_PASSWORD=password
./examples/test-workflows.sh test examples/04-postgres-query.json
```

#### 5. S3 Operations (Requires S3 or LocalStack)
```bash
export S3_BUCKET=test-bucket
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export S3_ENDPOINT=http://localhost:4566  # For LocalStack
./examples/test-workflows.sh test examples/05-s3-operations.json
```

#### 6. OpenAI (Requires API Key)
```bash
export OPENAI_API_KEY="your_openai_api_key"
./examples/test-workflows.sh test examples/06-openai-summarize.json
```

#### 7. SMTP (Requires Mail Server)
```bash
export SMTP_HOST=smtp.example.com
export SMTP_USER=user
export SMTP_PASS=password
export SMTP_FROM=noreply@example.com

curl -X POST http://localhost:3000/workflows/smtp-notification-example/execute \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail": "test@example.com"}'
```

#### 8. All Connectors (Requires All Dependencies)
```bash
# Set all environment variables from examples 3-7
./examples/test-workflows.sh test examples/08-all-connectors-complete.json
```

### Environment Variables Summary

For testing all examples, you'll need:

```bash
# Optional: GitHub GraphQL (example 03)
export GITHUB_TOKEN="ghp_..."

# Optional: PostgreSQL (examples 04, 08)
export DB_HOST=localhost
export DB_NAME=test_db
export DB_USER=postgres
export DB_PASSWORD=password

# Optional: S3/LocalStack (examples 05, 08)
export S3_BUCKET=test-bucket
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export S3_ENDPOINT=http://localhost:4566

# Optional: OpenAI (examples 06, 08)
export OPENAI_API_KEY="sk-..."

# Optional: SMTP (examples 07, 08)
export SMTP_HOST=smtp.gmail.com
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-app-password
export SMTP_FROM=your-email@gmail.com

# Optional: GraphQL endpoint (example 08)
export GRAPHQL_ENDPOINT=https://api.example.com/graphql
export GRAPHQL_TOKEN="your_token"
```

## Quick Start: Parameters-Based Workflows ⭐

The **recommended approach** uses the `parameters` field for explicit, maintainable data flow.

### Basic Example

```json
{
  "steps": [
    {
      "id": "fetch",
      "type": "connector",
      "config": {
        "connectorType": "http",
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    },
    {
      "id": "process",
      "type": "connector",
      "config": {
        "connectorType": "javascript",
        "timeout": 5000
      },
      "parameters": {
        "code": "return { result: data.value * 2 };",
        "context": { "data": "${steps.fetch.data}" }
      },
      "dependsOn": ["fetch"]
    }
  ]
}
```

### Variable Interpolation

Reference data explicitly using these patterns:

| Pattern | Example | Description |
|---------|---------|-------------|
| `${workflow.input.field}` | `${workflow.input.userId}` | Workflow input data |
| `${steps.stepId.field}` | `${steps.fetch.data.name}` | Output from specific step |
| `${env.VAR_NAME}` | `${env.API_KEY}` | Environment variable |

### Why Parameters?

✅ **Explicit Dependencies** - Clear what data each step needs  
✅ **No Extra Steps** - Eliminate transformer steps for simple cases  
✅ **Decoupled** - Connectors don't know about other connectors  
✅ **Maintainable** - Easy to understand data flow at a glance  

## Available Connectors

All 7 connectors work with the parameters-based approach:

1. **HTTP** - REST API calls
2. **JavaScript** - Code execution for transformations
3. **Postgres** - SQL queries
4. **S3** - Object storage operations
5. **OpenAI** - AI-powered processing
6. **SMTP** - Email sending
7. **GraphQL** - GraphQL queries/mutations

## Connector Examples

### JavaScript Connector

Transform data with custom code:

```json
{
  "id": "transform",
  "type": "connector",
  "config": {
    "connectorType": "javascript",
    "timeout": 5000
  },
  "parameters": {
    "code": "return { doubled: value * 2, original: value };",
    "context": { "value": "${steps.fetch.data.number}" }
  },
  "dependsOn": ["fetch"]
}
```

### OpenAI Connector

Generate AI content with explicit prompts:

```json
{
  "id": "summarize",
  "type": "connector",
  "config": {
    "connectorType": "openai",
    "apiKey": "${env.OPENAI_API_KEY}",
    "model": "gpt-4o",
    "temperature": 0.7
  },
  "parameters": {
    "systemPrompt": "You are a helpful assistant",
    "userPrompt": "Summarize: ${steps.fetch.data.content}"
  },
  "dependsOn": ["fetch"]
}
```

### S3 Connector

Save files to cloud storage:

```json
{
  "id": "save",
  "type": "connector",
  "config": {
    "connectorType": "s3",
    "region": "us-east-1",
    "bucket": "my-bucket",
    "accessKeyId": "${env.AWS_ACCESS_KEY_ID}",
    "secretAccessKey": "${env.AWS_SECRET_ACCESS_KEY}"
  },
  "parameters": {
    "action": "putObject",
    "key": "reports/${workflow.input.userId}/data.json",
    "content": "${steps.transform.data}",
    "contentType": "application/json"
  },
  "dependsOn": ["transform"]
}
```

### SMTP Connector

Send emails with dynamic content:

```json
{
  "id": "notify",
  "type": "connector",
  "config": {
    "connectorType": "smtp",
    "host": "smtp.example.com",
    "port": 587,
    "auth": {
      "user": "${env.SMTP_USER}",
      "pass": "${env.SMTP_PASS}"
    },
    "from": "noreply@example.com"
  },
  "parameters": {
    "to": "${workflow.input.email}",
    "subject": "Report Ready",
    "html": "<h2>Summary</h2><p>${steps.summarize.data.content}</p>"
  },
  "dependsOn": ["summarize"]
}
```

### Postgres Connector

Query databases with parameters:

```json
{
  "id": "query",
  "type": "connector",
  "config": {
    "connectorType": "postgres",
    "host": "${env.DB_HOST}",
    "database": "analytics",
    "user": "${env.DB_USER}",
    "password": "${env.DB_PASSWORD}"
  },
  "parameters": {
    "query": "SELECT * FROM users WHERE id = $1",
    "params": ["${workflow.input.userId}"]
  }
}
```

### HTTP Connector

Make API calls with dynamic URLs:

```json
{
  "id": "fetch",
  "type": "connector",
  "config": {
    "connectorType": "http",
    "url": "https://api.example.com/users/${workflow.input.userId}",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer ${env.API_TOKEN}"
    }
  }
}
```

### GraphQL Connector

Execute GraphQL with variables:

```json
{
  "id": "update",
  "type": "connector",
  "config": {
    "connectorType": "graphql",
    "endpoint": "${env.GRAPHQL_ENDPOINT}",
    "headers": {
      "Authorization": "Bearer ${env.GRAPHQL_TOKEN}"
    }
  },
  "parameters": {
    "query": "mutation UpdateUser($id: ID!, $name: String!) { updateUser(id: $id, name: $name) { id name } }",
    "variables": {
      "id": "${workflow.input.userId}",
      "name": "${steps.transform.data.fullName}"
    }
  },
  "dependsOn": ["transform"]
}
```

## Complete Workflow Examples

### 1. Parameters-Based Pipeline ⭐ **Recommended**

**File:** `parameters-workflow-example.json`

A complete 5-step data pipeline using parameters:
1. **HTTP** - Fetch data from API
2. **JavaScript** - Transform with explicit code reference
3. **S3** - Save with explicit content reference
4. **OpenAI** - Generate summary with explicit prompts
5. **SMTP** - Send email with dynamic content

**Why this approach?**
- ✅ Only 5 steps (vs 9 with transformers)
- ✅ Dependencies are explicit and clear
- ✅ Easy to understand data flow
- ✅ No transformer steps needed

**Key pattern:**
```json
{
  "parameters": {
    "field": "${steps.previousStep.data.value}"
  }
}
```

### 2. Legacy Transformer-Based (For Reference)

**Files:** `multi-connector-workflow.json`, `complete-workflow-example.json`

These examples show the legacy approach using transformer steps. They're still supported but require more steps and implicit data flow.

## Migration Guide

### From Transformer-Based to Parameters

**Before (9 steps):**
```json
[
  { "id": "fetch", "type": "connector", "config": {...} },
  { "id": "prep_js", "type": "transformer", "config": { "mapping": {...} } },
  { "id": "transform", "type": "connector", "dependsOn": ["prep_js"] },
  { "id": "prep_s3", "type": "transformer", "config": { "mapping": {...} } },
  { "id": "save", "type": "connector", "dependsOn": ["prep_s3"] }
  // ... etc
]
```

**After (5 steps):**
```json
[
  { 
    "id": "fetch", 
    "type": "connector", 
    "config": {...} 
  },
  { 
    "id": "transform", 
    "type": "connector",
    "parameters": {
      "code": "...",
      "context": { "data": "${steps.fetch.data}" }
    },
    "dependsOn": ["fetch"]
  },
  { 
    "id": "save", 
    "type": "connector",
    "parameters": {
      "action": "putObject",
      "content": "${steps.transform.data}"
    },
    "dependsOn": ["transform"]
  }
  // ... etc
]
```

**Benefits:**
- 44% fewer steps
- Explicit dependencies
- Easier to maintain

## Best Practices

### 1. Use Parameters for Data References

✅ **Do:**
```json
{
  "parameters": {
    "userPrompt": "Process: ${steps.fetch.data.content}"
  }
}
```

❌ **Don't:**
```json
{
  "id": "prep",
  "type": "transformer",
  "config": { "mapping": { "userPrompt": "..." } }
}
```

### 2. Keep Config Static, Parameters Dynamic

✅ **Do:**
```json
{
  "config": { "apiKey": "${env.KEY}", "model": "gpt-4o" },
  "parameters": { "userPrompt": "${steps.fetch.data}" }
}
```

❌ **Don't:**
```json
{
  "config": { "apiKey": "${env.KEY}", "userPrompt": "${steps.fetch.data}" }
}
```

### 3. Use Descriptive Step IDs

✅ **Do:**
```json
"${steps.fetch_user_data.data.email}"
```

❌ **Don't:**
```json
"${steps.step1.data.email}"
```

### 4. Document Dependencies

```json
{
  "id": "send_email",
  "parameters": {
    "to": "${workflow.input.email}",
    "content": "${steps.generate_summary.data.content}"
  },
  "dependsOn": ["generate_summary"],
  "comment": "Sends email using AI-generated summary from previous step"
}
```

## Troubleshooting

### Variable Not Found

**Error:** `Variable ${steps.fetch.data} is undefined`

**Solution:** Check that:
1. Step ID is correct
2. Step has completed successfully
3. Path to data is correct

### Circular Dependencies

**Error:** `Circular dependency detected`

**Solution:** Review `dependsOn` fields and ensure no circular references.

## Additional Resources

- [API Documentation](../apps/api/README.md)
- [Core Engine](../packages/core/README.md)
- [Connector Development Guide](../packages/core/src/connectors/README.md)
