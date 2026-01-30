# MCP Server for SaaS and Remote Access

This guide explains how to use the Glue MCP server in a hosted/SaaS environment where the API is deployed remotely and needs to be accessed by decoupled applications.

## Overview

The Glue MCP server supports two transport modes:

1. **Stdio Transport** (Local) - For AI assistants running on the same machine
2. **HTTP/SSE Transport** (Remote) - For SaaS deployments and remote access

## Use Cases

### Stdio Transport (Local)
- Claude Desktop on your local machine
- Local development and testing
- Direct process-to-process communication

### HTTP/SSE Transport (Remote/SaaS)
- ✅ Hosted API (e.g., `https://glue.corbinmurray.dev`)
- ✅ Decoupled agentic servers (n8n, LangChain, etc.)
- ✅ Multiple clients accessing the same MCP server
- ✅ Cross-origin requests from web applications
- ✅ Cloud deployments (AWS, Azure, GCP, etc.)

## Running the HTTP/SSE MCP Server

### Development Mode

```bash
cd apps/api
pnpm dev:mcp-http
```

The server will start on `http://0.0.0.0:3001` by default.

### Production Mode

```bash
cd apps/api
pnpm build
pnpm start:mcp-http
```

## Environment Variables

Add these to your `.env` file:

```bash
# MCP HTTP Server Configuration
MCP_HTTP_PORT=3001                    # Port for MCP HTTP server
MCP_HTTP_HOST=0.0.0.0                 # Host (0.0.0.0 for all interfaces)
MCP_ALLOWED_ORIGINS=*                 # CORS origins (comma-separated or *)

# Same as regular API
MONGODB_URI=mongodb://localhost:27017/glue
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

### Production CORS Configuration

For production, specify allowed origins instead of `*`:

```bash
MCP_ALLOWED_ORIGINS=https://glue.corbinmurray.dev,https://n8n.example.com,https://app.example.com
```

## Endpoints

The HTTP/SSE MCP server exposes:

- **`GET /health`** - Health check endpoint
- **`GET /sse`** - SSE endpoint for MCP connections
- **`POST /message`** - Message endpoint for client requests

## Client Configuration

### For MCP-Compatible Clients

Configure your MCP client to connect via HTTP/SSE:

```json
{
  "mcpServers": {
    "glue-workflow-api": {
      "url": "https://glue.corbinmurray.dev/sse",
      "transport": "sse"
    }
  }
}
```

### For n8n

In n8n, use the **HTTP Request** node to interact with the MCP server:

1. **Establish SSE Connection**:
   - Method: `GET`
   - URL: `https://glue.corbinmurray.dev/sse`
   - Keep connection open

2. **Send Tool Requests**:
   - Method: `POST`
   - URL: `https://glue.corbinmurray.dev/message`
   - Body:
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "list_workflows",
         "arguments": {}
       }
     }
     ```

### For Custom Applications

Use any HTTP client that supports SSE:

#### JavaScript Example

```javascript
const eventSource = new EventSource('https://glue.corbinmurray.dev/sse');

eventSource.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('MCP Response:', response);
};

// Send a tool request
async function callTool(toolName, args) {
  const response = await fetch('https://glue.corbinmurray.dev/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    })
  });
  return response.json();
}

// Example: List workflows
callTool('list_workflows', { limit: 10 });
```

#### Python Example

```python
import requests
import json
from sseclient import SSEClient

# Establish SSE connection
messages = SSEClient('https://glue.corbinmurray.dev/sse')

for msg in messages:
    if msg.data:
        response = json.loads(msg.data)
        print('MCP Response:', response)

# Send tool request
def call_tool(tool_name, args):
    response = requests.post(
        'https://glue.corbinmurray.dev/message',
        json={
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'tools/call',
            'params': {'name': tool_name, 'arguments': args}
        }
    )
    return response.json()

# Example: List workflows
result = call_tool('list_workflows', {'limit': 10})
```

## Deployment

### Docker Compose

Add the MCP HTTP server to your `docker-compose.yml`:

```yaml
services:
  mcp-server:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    command: node dist/mcp-server-http.js
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MCP_HTTP_PORT=3001
      - MCP_HTTP_HOST=0.0.0.0
      - MONGODB_URI=mongodb://mongodb:27017/glue
      - REDIS_URL=redis://redis:6379
      - MCP_ALLOWED_ORIGINS=https://glue.corbinmurray.dev,https://n8n.example.com
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
```

### Reverse Proxy (Nginx)

Configure Nginx to proxy the MCP server:

```nginx
server {
    listen 443 ssl;
    server_name glue.corbinmurray.dev;

    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Regular API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # MCP SSE endpoint
    location /sse {
        proxy_pass http://localhost:3001/sse;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 24h;
    }

    # MCP message endpoint
    location /message {
        proxy_pass http://localhost:3001/message;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # MCP health check
    location /health {
        proxy_pass http://localhost:3001/health;
    }
}
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: glue-mcp-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: glue-mcp-server
  template:
    metadata:
      labels:
        app: glue-mcp-server
    spec:
      containers:
      - name: mcp-server
        image: glue-api:latest
        command: ["node", "dist/mcp-server-http.js"]
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: MCP_HTTP_PORT
          value: "3001"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: glue-secrets
              key: mongodb-uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: glue-secrets
              key: redis-url
        - name: MCP_ALLOWED_ORIGINS
          value: "https://glue.corbinmurray.dev,https://n8n.example.com"
---
apiVersion: v1
kind: Service
metadata:
  name: glue-mcp-service
spec:
  selector:
    app: glue-mcp-server
  ports:
  - port: 3001
    targetPort: 3001
  type: LoadBalancer
```

## Security Considerations

> **⚠️ IMPORTANT**: The HTTP/SSE MCP server currently does not include authentication. For production deployments, you **MUST** implement authentication and authorization to prevent unauthorized access to your workflows and data. Do not deploy to production without adding proper security measures.

### Authentication (Required for Production)

Implement authentication before deploying to production. Example using API key authentication:

```typescript
// Example middleware for API key authentication
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

**Recommended authentication methods:**
- API keys with key rotation
- OAuth 2.0 / OpenID Connect
- JWT tokens
- mTLS (mutual TLS) for server-to-server communication

### Rate Limiting

Add rate limiting to prevent abuse:

```bash
pnpm add express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### HTTPS

Always use HTTPS in production. The examples above show Nginx SSL configuration.

## Monitoring

### Health Check

Monitor the MCP server health:

```bash
curl https://glue.corbinmurray.dev/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T19:30:00.000Z"
}
```

### Logs

The MCP HTTP server logs to stderr:

```bash
# View logs in Docker
docker logs glue-mcp-server

# View logs in Kubernetes
kubectl logs deployment/glue-mcp-server
```

## Comparison: Stdio vs HTTP/SSE

| Feature | Stdio Transport | HTTP/SSE Transport |
|---------|----------------|-------------------|
| **Use Case** | Local AI assistants | Remote/SaaS access |
| **Network** | Same machine | Any network location |
| **Clients** | Single process | Multiple clients |
| **CORS** | N/A | Configurable |
| **Scalability** | Single instance | Horizontal scaling |
| **Authentication** | Process isolation | API keys, OAuth |
| **Firewall** | No network access | Requires port access |
| **Latency** | Lowest | Network dependent |

## Troubleshooting

### Connection Issues

**Problem**: SSE connection fails
```
Error: Failed to connect to SSE endpoint
```

**Solutions**:
1. Verify the server is running: `curl https://glue.corbinmurray.dev/health`
2. Check CORS configuration in `MCP_ALLOWED_ORIGINS`
3. Ensure firewall allows traffic on the MCP port
4. Verify SSL certificate is valid

### CORS Errors

**Problem**: CORS policy blocking requests

**Solution**: Add your client origin to `MCP_ALLOWED_ORIGINS`:
```bash
MCP_ALLOWED_ORIGINS=https://your-client-origin.com,https://another-origin.com
```

### Tool Execution Errors

**Problem**: Tool calls return errors

**Solutions**:
1. Verify MongoDB and Redis are accessible from the MCP server
2. Check environment variables are correctly set
3. Review server logs for detailed error messages
4. Test the same operation via the REST API to isolate the issue

## Example: n8n Workflow

Here's a complete n8n workflow to list workflows:

1. **HTTP Request Node** (List Workflows)
   - Method: `POST`
   - URL: `https://glue.corbinmurray.dev/message`
   - Headers:
     - `Content-Type`: `application/json`
   - Body:
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "list_workflows",
         "arguments": {
           "limit": 10,
           "skip": 0
         }
       }
     }
     ```

2. **Function Node** (Process Response)
   ```javascript
   const response = items[0].json;
   const workflows = JSON.parse(response.result.content[0].text);
   return workflows.workflows.map(w => ({ json: w }));
   ```

## Further Reading

- [MCP Specification](https://modelcontextprotocol.io)
- [SSE (Server-Sent Events) MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Express.js Documentation](https://expressjs.com)
