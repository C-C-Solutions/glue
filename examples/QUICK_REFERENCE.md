# Example Workflows - Quick Reference

## Available Examples

| # | File | Connectors | Complexity | External Dependencies |
|---|------|-----------|------------|---------------------|
| 01 | `01-simple-http.json` | HTTP | ⭐ Simple | None (uses public API) |
| 02 | `02-http-with-javascript.json` | HTTP, JavaScript | ⭐⭐ Moderate | None (uses public API) |
| 03 | `03-graphql-basic.json` | GraphQL | ⭐⭐ Moderate | GITHUB_TOKEN |
| 04 | `04-postgres-query.json` | Postgres | ⭐⭐ Moderate | PostgreSQL database |
| 05 | `05-s3-operations.json` | HTTP, S3 | ⭐⭐ Moderate | S3/LocalStack |
| 06 | `06-openai-summarize.json` | HTTP, OpenAI | ⭐⭐ Moderate | OPENAI_API_KEY |
| 07 | `07-smtp-notification.json` | HTTP, SMTP | ⭐⭐ Moderate | SMTP server |
| 08 | `08-all-connectors-complete.json` | All 7 | ⭐⭐⭐ Complex | All services above |

## Quick Start

### 1. Start Services
```bash
# Start MongoDB and Redis
docker compose up -d

# Start API and Worker
pnpm dev
```

### 2. Test Simple Example (No Dependencies)
```bash
# Using the test script
./examples/test-workflows.sh test examples/01-simple-http.json

# Or manually
curl -X POST http://localhost:3000/workflows -H "Content-Type: application/json" -d @examples/01-simple-http.json
curl -X POST http://localhost:3000/workflows/simple-http-example/execute -H "Content-Type: application/json" -d '{}'
```

### 3. Check Results
```bash
# List all workflows
curl http://localhost:3000/workflows | jq

# Check job status (replace JOB_ID)
curl http://localhost:3000/jobs/{JOB_ID} | jq

# Get execution details (replace EXECUTION_ID)
curl http://localhost:3000/executions/{EXECUTION_ID} | jq
```

## Connector Reference

### HTTP Connector
```json
{
  "connectorType": "http",
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": { "Authorization": "Bearer ${env.TOKEN}" },
  "timeout": 30000
}
```

### JavaScript Connector
```json
{
  "connectorType": "javascript",
  "timeout": 5000
}
// Parameters:
{
  "code": "return { result: data.value * 2 };",
  "context": { "data": "${steps.previous.data}" }
}
```

### GraphQL Connector
```json
{
  "connectorType": "graphql",
  "endpoint": "https://api.example.com/graphql",
  "headers": { "Authorization": "Bearer ${env.TOKEN}" }
}
// Parameters:
{
  "query": "query { user(id: $id) { name } }",
  "variables": { "id": "${workflow.input.userId}" }
}
```

### Postgres Connector
```json
{
  "connectorType": "postgres",
  "host": "${env.DB_HOST}",
  "database": "${env.DB_NAME}",
  "user": "${env.DB_USER}",
  "password": "${env.DB_PASSWORD}"
}
// Parameters:
{
  "query": "SELECT * FROM users WHERE id = $1",
  "params": ["${workflow.input.userId}"]
}
```

### S3 Connector
```json
{
  "connectorType": "s3",
  "region": "us-east-1",
  "bucket": "${env.S3_BUCKET}",
  "accessKeyId": "${env.AWS_ACCESS_KEY_ID}",
  "secretAccessKey": "${env.AWS_SECRET_ACCESS_KEY}"
}
// Parameters:
{
  "action": "putObject",
  "key": "path/to/file.json",
  "content": "${steps.previous.data}",
  "contentType": "application/json"
}
```

### OpenAI Connector
```json
{
  "connectorType": "openai",
  "apiKey": "${env.OPENAI_API_KEY}",
  "model": "gpt-4o-mini",
  "temperature": 0.7
}
// Parameters:
{
  "systemPrompt": "You are a helpful assistant",
  "userPrompt": "Summarize: ${steps.previous.data}"
}
```

### SMTP Connector
```json
{
  "connectorType": "smtp",
  "host": "${env.SMTP_HOST}",
  "port": 587,
  "auth": {
    "user": "${env.SMTP_USER}",
    "pass": "${env.SMTP_PASS}"
  },
  "from": "${env.SMTP_FROM}"
}
// Parameters:
{
  "to": "${workflow.input.email}",
  "subject": "Your Report",
  "html": "<h1>Report</h1><p>${steps.previous.data}</p>"
}
```

## Common Patterns

### Sequential Steps with Dependencies
```json
{
  "steps": [
    {
      "id": "step1",
      "type": "connector",
      "config": { "connectorType": "http", "url": "..." }
    },
    {
      "id": "step2",
      "type": "connector",
      "config": { "connectorType": "javascript", "timeout": 5000 },
      "parameters": {
        "code": "return { result: data.value };",
        "context": { "data": "${steps.step1.data}" }
      },
      "dependsOn": ["step1"]
    }
  ]
}
```

### Using Workflow Input
```json
{
  "parameters": {
    "userId": "${workflow.input.userId}",
    "action": "${workflow.input.action}"
  }
}
```

### Environment Variables
```json
{
  "config": {
    "apiKey": "${env.API_KEY}",
    "endpoint": "${env.API_ENDPOINT}"
  }
}
```

## Troubleshooting

### Workflow Not Found
- Wait a moment after creation before executing
- Check workflow was created: `curl http://localhost:3000/workflows`

### Execution Failed
- Check job logs: `curl http://localhost:3000/jobs/{jobId} | jq`
- Check execution details: `curl http://localhost:3000/executions/{executionId} | jq`
- Verify environment variables are set
- Ensure external services are accessible

### API Not Responding
```bash
# Check health
curl http://localhost:3000/health

# Check services
docker ps

# Restart services
docker compose restart
```

## Next Steps

1. Review the comprehensive examples in the `examples/` directory
2. Read the detailed testing guide in `examples/README.md`
3. Check the testing report in `examples/TESTING_REPORT.md`
4. Create your own workflows based on these examples
5. Contribute new examples for other use cases!

## Resources

- [Main README](../README.md) - Full project documentation
- [Examples README](./README.md) - Detailed testing guide
- [Testing Report](./TESTING_REPORT.md) - Validation results
- [API Documentation](../apps/api/README.md) - API reference
- [Core Engine](../packages/core/README.md) - Engine internals
