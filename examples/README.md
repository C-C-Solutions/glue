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

## Two Approaches to Step Configuration

Glue supports two approaches for configuring steps:

### Approach 1: Transformer-Based (Legacy)

Uses transformer steps to prepare input for connectors. Data flows implicitly from step to step.

### Approach 2: Parameters-Based (Recommended)

Uses the `parameters` field with explicit variable interpolation. **This is the recommended approach** for most workflows.

## Parameters-Based Configuration

The `parameters` field allows you to explicitly reference workflow inputs, previous step outputs, and environment variables using variable interpolation syntax.

### Variable Interpolation Syntax

- `${workflow.input.fieldName}` - Reference workflow input
- `${steps.stepId.fieldName}` - Reference output from a specific step
- `${env.VAR_NAME}` - Reference environment variable

### Benefits

1. **Explicit Dependencies**: Clear what data each step needs
2. **No Extra Steps**: No transformer steps needed for simple data passing
3. **Decoupled Connectors**: Connectors don't need to know about other connectors
4. **Maintainable**: Easy to understand data flow at a glance

### Example: JavaScript Connector with Parameters

```json
{
  "id": "transform_data",
  "name": "Transform Data",
  "type": "connector",
  "config": {
    "connectorType": "javascript",
    "timeout": 5000
  },
  "parameters": {
    "code": "return { doubled: value * 2 };",
    "context": { "value": "${steps.fetch_data.data.number}" }
  },
  "dependsOn": ["fetch_data"]
}
```

**Key Points:**
- `config` contains connector settings (timeout)
- `parameters` contains the data to process with explicit references
- Dependencies are clear: references `${steps.fetch_data.data.number}`

### Example: OpenAI Connector with Parameters

```json
{
  "id": "generate_summary",
  "name": "Generate AI Summary",
  "type": "connector",
  "config": {
    "connectorType": "openai",
    "apiKey": "${env.OPENAI_API_KEY}",
    "model": "gpt-4o",
    "temperature": 0.7
  },
  "parameters": {
    "systemPrompt": "You are a helpful assistant",
    "userPrompt": "Summarize this: ${steps.fetch_post.data.content}"
  },
  "dependsOn": ["fetch_post"]
}
```

**Key Points:**
- `config` contains API key and model settings
- `parameters` contains prompts with explicit data references
- Static values (systemPrompt) and dynamic values (userPrompt) both in parameters

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

### 1. Parameters-Based Workflow (`parameters-workflow-example.json`) ⭐ **Recommended**

A clean example using the **parameters field** for explicit data flow:
1. Fetches data from HTTP API
2. Transforms with JavaScript using `parameters` to reference step 1 output
3. Saves to S3 using `parameters` to specify action and reference transformed data
4. Generates AI summary using `parameters` with explicit prompts
5. Sends email using `parameters` to reference workflow input and AI output

**Key Benefits:**
- Only 5 steps (no transformer steps needed!)
- Dependencies are explicit and clear
- Easy to understand data flow
- Parameters show exactly what data each connector uses

### 2. Multi-Connector Data Pipeline (`multi-connector-workflow.json`)

A complete example using the **transformer-based approach**:
1. Fetches data from an HTTP API
2. Prepares JavaScript code input with a transformer
3. Transforms data with JavaScript
4. Prepares S3 input with a transformer  
5. Saves to S3 (LocalStack)
6. Prepares OpenAI prompts with a transformer
7. Generates an AI summary with OpenAI
8. Prepares email content with a transformer
9. Sends an email via SMTP

**Key Learning:** This example shows the legacy approach where transformer steps prepare input for connectors. While functional, it requires more steps and implicit data flow.

### 3. Complete Workflow Example (`complete-workflow-example.json`)

A comprehensive example that uses all 7 available connectors with the transformer approach:
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
