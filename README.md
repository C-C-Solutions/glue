# Glue

An opinionated integration engine for connecting services, transforming data, and orchestrating workflows.

## 🚀 Features

- **Workflow Orchestration**: Define and execute complex workflows with DAG support
- **Connectors**: Built-in HTTP/REST connector with extensible architecture
- **Data Transformation**: JSONPath-based transformations
- **Queue-based Processing**: BullMQ for reliable job processing
- **REST API**: Fastify-based API for workflow management
- **Type Safety**: Full TypeScript support with Zod validation
- **Persistence**: MongoDB for workflow and execution storage

## 📦 Monorepo Structure

```
glue/
├── apps/
│   ├── api/          # REST API service (Fastify)
│   └── worker/       # BullMQ worker service
├── packages/
│   ├── core/         # Core business logic & execution engine
│   ├── db/           # Database layer (MongoDB/Mongoose)
│   ├── queue/        # Queue utilities (BullMQ/Redis)
│   └── config/       # Shared configuration (Zod validation)
└── docker/
    └── docker-compose.yml  # Local dev infrastructure
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript 5.x
- **Package Manager**: pnpm with workspaces
- **Build System**: Turborepo
- **Database**: MongoDB 8
- **Queue**: BullMQ with Redis 8.4
- **API Framework**: Fastify
- **Validation**: Zod
- **Dev Environment**: VS Code Dev Containers support

## 🏁 Getting Started

### Prerequisites

- Node.js 22+ and pnpm 8+
- Docker and Docker Compose (for local development)
- **OR** VS Code with Dev Containers extension (recommended)

### Option 1: Dev Container (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/C-C-Solutions/glue.git
cd glue
```

2. Open in VS Code:
```bash
code .
```

3. When prompted, click "Reopen in Container" (or press F1 and select "Dev Containers: Reopen in Container")

The dev container will automatically:
- Set up Node.js 22 environment
- Start MongoDB 8 and Redis 8.4
- Install dependencies with pnpm
- Configure VS Code extensions

### Option 2: Manual Setup

### Prerequisites

- Node.js 22+ and pnpm 8+
- Docker and Docker Compose (for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/C-C-Solutions/glue.git
cd glue
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start infrastructure (MongoDB + Redis):
```bash
docker compose -f docker/docker-compose.yml up -d
```

5. Build all packages:
```bash
pnpm build
```

### Development

Start all services in development mode:
```bash
pnpm dev
```

Or start individual services:
```bash
# API server
cd apps/api
pnpm dev

# Worker
cd apps/worker
pnpm dev
```

### API Endpoints

- `GET /health` - Health check
- `POST /workflows` - Create workflow definition
- `GET /workflows` - List workflows
- `GET /workflows/:id` - Get workflow
- `POST /workflows/:id/execute` - Execute workflow
- `GET /executions/:id` - Get execution status
- `POST /executions/:id/cancel` - Cancel execution

### Example: Create and Execute a Workflow

```bash
# Create a workflow
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "id": "hello-world",
    "name": "Hello World Workflow",
    "version": "1.0.0",
    "trigger": {
      "type": "manual"
    },
    "steps": [
      {
        "id": "step1",
        "name": "HTTP Request",
        "type": "connector",
        "config": {
          "url": "https://api.github.com/users/octocat",
          "method": "GET"
        }
      }
    ]
  }'

# Execute the workflow
curl -X POST http://localhost:3000/workflows/hello-world/execute \
  -H "Content-Type: application/json" \
  -d '{}'

# Check execution status
curl http://localhost:3000/executions/{execution-id}
```

## 🧪 Testing

Run tests across all packages:
```bash
pnpm test
```

## 🏗️ Building

Build all packages for production:
```bash
pnpm build
```

Type checking:
```bash
pnpm type-check
```

## 📝 Architecture

### Workflow Definition

Workflows are defined as JSON objects with:
- **Metadata**: ID, name, version, description
- **Trigger**: How the workflow starts (manual, webhook, schedule, event)
- **Steps**: Array of step definitions (connectors, transformers, conditions)
- **Error Handling**: Retry policies and error strategies

### Execution Engine

The execution engine (`@glue/core`):
- Executes steps sequentially with DAG support for dependencies
- Persists execution state after each step
- Supports retry policies per step
- Emits events for observability

### Connectors

Connectors integrate with external systems:
- **HTTP Connector**: REST API calls with variable interpolation
- **Base Connector**: Abstract class for custom connectors

### Queue Processing

BullMQ worker processes jobs from Redis queue:
- Reliable job processing with retries
- Concurrent execution
- Job progress tracking

## 🔒 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `LOG_LEVEL` | Logging level | `info` |
