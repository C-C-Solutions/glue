# Workflow Examples

This directory contains example workflow definitions that demonstrate the flexibility and power of the Glue integration engine.

## Overview

Glue supports **any number of connectors in any combination**, allowing you to build complex data pipelines by chaining connectors together. Each step's output automatically becomes available as input to subsequent steps.

## Available Connectors

The following connectors are available and can be used in any combination:

1. **HTTP** - Make HTTP/REST API calls
2. **JavaScript** - Execute JavaScript code for transformations
3. **Postgres** - Query and manipulate PostgreSQL databases
4. **S3** - Interact with AWS S3 or S3-compatible storage (like LocalStack)
5. **OpenAI** - Use AI for intelligent data processing and generation
6. **SMTP** - Send emails via SMTP
7. **GraphQL** - Query GraphQL APIs

## Step-Specific Configuration

Each step in a workflow embeds its own connector-specific configuration. The configuration is passed directly to the connector for execution:

```json
{
  "id": "my_step",
  "name": "My Step",
  "type": "connector",
  "config": {
    "connectorType": "http",
    "url": "https://api.example.com/data",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer ${env.API_TOKEN}"
    },
    "body": {
      "key": "value"
    }
  }
}
```

## Examples

### 1. Multi-Connector Data Pipeline (`multi-connector-workflow.json`)

A simple example demonstrating a data pipeline that:
1. Fetches data from an HTTP API
2. Transforms it with JavaScript
3. Saves to S3 (LocalStack)
4. Generates a summary with OpenAI
5. Sends an email via SMTP

This example shows how outputs flow from one step to the next.

### 2. Complete Workflow Example (`complete-workflow-example.json`)

A comprehensive example that uses all 7 available connectors:
1. **HTTP** - Fetches user data from an API
2. **JavaScript** - Transforms and enriches the data
3. **Postgres** - Queries additional data from a database
4. **OpenAI** - Generates an AI-powered report
5. **S3** - Saves the report to cloud storage
6. **SMTP** - Sends an email notification
7. **GraphQL** - Updates a GraphQL service

This example demonstrates:
- Step dependencies (`dependsOn`)
- Connector-specific configurations embedded in each step
- Environment variable interpolation (`${env.VAR_NAME}`)
- Input variable interpolation (`${input.field}`)
- Retry policies for fault tolerance
- Error handling strategies

## Connector Input Formats

Each connector expects input in a specific format. Here's a quick reference:

### HTTP Connector
```json
{
  "connectorType": "http",
  "url": "https://api.example.com",
  "method": "GET|POST|PUT|PATCH|DELETE",
  "headers": { "key": "value" },
  "body": { "data": "..." },
  "timeout": 30000
}
```

### JavaScript Connector
**Config:**
```json
{
  "connectorType": "javascript",
  "timeout": 5000
}
```
**Input (from previous step):**
```json
{
  "code": "return { result: data.value * 2 };",
  "context": { "data": { "value": 21 } }
}
```

### Postgres Connector
**Config:**
```json
{
  "connectorType": "postgres",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "user": "user",
  "password": "pass"
}
```
**Input (from previous step):**
```json
{
  "query": "SELECT * FROM users WHERE id = $1",
  "params": [123]
}
```

### S3 Connector
**Config:**
```json
{
  "connectorType": "s3",
  "region": "us-east-1",
  "bucket": "my-bucket",
  "accessKeyId": "key",
  "secretAccessKey": "secret",
  "endpoint": "http://localhost:4566"
}
```
**Input (from previous step):**
```json
{
  "action": "putObject",
  "key": "path/to/file.json",
  "content": "file content",
  "contentType": "application/json"
}
```

### OpenAI Connector
**Config:**
```json
{
  "connectorType": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "temperature": 0.7,
  "maxTokens": 1000
}
```
**Input (from previous step):**
```json
{
  "systemPrompt": "You are a helpful assistant",
  "userPrompt": "Generate a summary of this data: ..."
}
```

### SMTP Connector
**Config:**
```json
{
  "connectorType": "smtp",
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "user@example.com",
    "pass": "password"
  },
  "from": "noreply@example.com"
}
```
**Input (from previous step):**
```json
{
  "to": "recipient@example.com",
  "subject": "Report Ready",
  "html": "<p>Your report is ready</p>"
}
```

### GraphQL Connector
**Config:**
```json
{
  "connectorType": "graphql",
  "endpoint": "https://api.example.com/graphql",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```
**Input (from previous step):**
```json
{
  "query": "mutation { updateUser(id: $id, name: $name) { id name } }",
  "variables": { "id": "123", "name": "John" }
}
```

## Variable Interpolation

Glue supports variable interpolation in workflow definitions:

- **Environment variables**: `${env.VAR_NAME}`
- **Workflow input**: `${input.field.nested}`

These are resolved at runtime before the connector is executed.

## Step Dependencies

Use the `dependsOn` array to specify which steps must complete before a step can run:

```json
{
  "id": "step_2",
  "name": "Process Data",
  "type": "connector",
  "config": { ... },
  "dependsOn": ["step_1"]
}
```

The output from dependent steps is automatically merged into the input for the current step.

## Error Handling

Configure error handling at the workflow level:

```json
{
  "errorHandling": {
    "onError": "stop|continue|retry",
    "maxRetries": 3
  }
}
```

And at the step level with retry policies:

```json
{
  "retryPolicy": {
    "maxAttempts": 3,
    "delayMs": 1000,
    "backoffMultiplier": 2
  }
}
```

## Running Workflows

To execute a workflow, use the Glue API:

```bash
POST /api/workflows/{workflowId}/execute
Content-Type: application/json

{
  "input": {
    "userId": "123",
    "action": "generate_report"
  }
}
```

The workflow will execute steps in order, respecting dependencies, and return the execution results.

## Best Practices

1. **Keep steps focused**: Each step should do one thing well
2. **Use descriptive names**: Make it clear what each step does
3. **Add comments**: Use the `comment` field to document expected inputs
4. **Handle errors**: Configure appropriate retry policies and error handling
5. **Use environment variables**: Keep secrets out of workflow definitions
6. **Test incrementally**: Build workflows step by step, testing each addition
7. **Monitor executions**: Check execution logs to understand failures

## Contributing

Have a great workflow example? Submit a PR with your workflow definition and a brief description!
