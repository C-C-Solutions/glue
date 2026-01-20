# Workflow Examples

This directory contains example workflow definitions that demonstrate the power of the Glue integration engine.

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
