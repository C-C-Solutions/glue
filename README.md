# glue

An opinionated integration engine for connecting services, transforming data, and orchestrating workflows.

## 🚀 Features

- **Workflow Orchestration**: Define and execute complex workflows with DAG support
- **Connectors**: Built-in connectors for common integrations:
  - **HTTP/REST**: API calls with variable interpolation
  - **PostgreSQL**: SQL query execution with connection pooling
  - **OpenAI**: AI-powered text processing and transformation
  - **SMTP**: Email sending with attachment support
  - **S3**: Object storage operations (AWS S3 compatible)
  - **JavaScript**: Sandboxed code execution for custom logic
  - **GraphQL**: Query and mutation execution
- **Data Transformation**: JSONPath-based transformations
- **Queue-based Processing**: BullMQ for reliable job processing
- **REST API**: Fastify-based API for workflow management
- **Type Safety**: Full TypeScript support with Zod validation
- **Persistence**: MongoDB for workflow and execution storage

## 📦 Monorepo Structure

```plaintext
glue/
├── apps/
│   ├── api/          # REST API service (Fastify)
│   └── worker/       # BullMQ worker service
├── packages/
│   ├── core/         # Core business logic & execution engine
│   ├── db/           # Database layer (MongoDB/Mongoose)
│   ├── queue/        # Queue utilities (BullMQ/Redis)
│   └── config/       # Shared configuration (Zod validation)
├── .devcontainer/
│   ├── devcontainer.json           # Dev container configuration
│   └── docker-compose.override.yml   # Dev-specific compose overrides
└── docker-compose.yml  # Infrastructure services (MongoDB, Redis)
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

1. Open in VS Code:

```bash
code .
```

1. When prompted, click "Reopen in Container" (or press F1 and select "Dev Containers: Reopen in Container")

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

1. Install dependencies:

```bash
pnpm install
```

1. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

1. Start infrastructure (MongoDB + Redis):

```bash
docker compose up -d
```

1. Build all packages:

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

The new **parameters-based approach** makes dependencies explicit and eliminates unnecessary transformer steps:

```bash
# Create a workflow with parameters
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "id": "data-pipeline",
    "name": "Data Processing Pipeline",
    "version": "1.0.0",
    "trigger": {
      "type": "manual"
    },
    "steps": [
      {
        "id": "fetch_data",
        "name": "Fetch User Data",
        "type": "connector",
        "config": {
          "connectorType": "http",
          "url": "https://api.github.com/users/octocat",
          "method": "GET"
        }
      },
      {
        "id": "transform",
        "name": "Transform with JavaScript",
        "type": "connector",
        "config": {
          "connectorType": "javascript",
          "timeout": 5000
        },
        "parameters": {
          "code": "return { name: user.name, repos: user.public_repos };",
          "context": { "user": "${steps.fetch_data.data}" }
        },
        "dependsOn": ["fetch_data"]
      }
    ]
  }'

# Execute the workflow
curl -X POST http://localhost:3000/workflows/data-pipeline/execute \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail": "user@example.com"}'

# Check execution status
curl http://localhost:3000/executions/{execution-id}
```

**Key Features:**
- `parameters` field with explicit variable interpolation
- `${steps.stepId.field}` references previous step outputs
- `${workflow.input.field}` references workflow inputs
- `${env.VAR_NAME}` references environment variables
- No transformer steps needed for simple data passing

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
- **Parameters** (NEW): Runtime-configurable parameters with variable interpolation
- **Error Handling**: Retry policies and error strategies

#### Parameters-Based Configuration (Recommended)

Use the `parameters` field for explicit, maintainable workflows:

```json
{
  "id": "step1",
  "name": "Process Data",
  "type": "connector",
  "config": {
    "connectorType": "openai",
    "apiKey": "${env.OPENAI_API_KEY}",
    "model": "gpt-4o"
  },
  "parameters": {
    "systemPrompt": "You are a helpful assistant",
    "userPrompt": "Summarize: ${steps.fetch_data.data.content}"
  },
  "dependsOn": ["fetch_data"]
}
```

**Variable Interpolation:**
- `${workflow.input.field}` - Reference workflow input
- `${steps.stepId.field}` - Reference specific step output
- `${env.VAR_NAME}` - Reference environment variable

**Benefits:**
- Explicit dependencies (clear data flow)
- No transformer steps for simple data passing
- Connectors remain decoupled
- Easy to maintain and understand

### Example Workflows

See the [`examples/`](./examples) directory for complete workflow examples:

- **`parameters-workflow-example.json`** ⭐ **Recommended** - Clean 5-step pipeline using parameters
- **`multi-connector-workflow.json`** - Legacy transformer-based approach (9 steps)
- **`complete-workflow-example.json`** - All 7 connectors with transformer steps

Each example includes detailed comments explaining data flow and connector usage.

### Execution Engine

The execution engine (`@glue/core`):

- Executes steps sequentially with DAG support for dependencies
- Persists execution state after each step
- Supports retry policies per step
- Emits events for observability

### Connectors

Connectors integrate with external systems:

- **HTTP Connector**: REST API calls with variable interpolation
- **PostgreSQL Connector**: Execute SQL queries with connection pooling for database operations
- **OpenAI Connector**: AI-powered text processing using GPT models for intelligent data transformation
- **SMTP Connector**: Send emails with attachments via SMTP servers
- **S3 Connector**: Object storage operations (putObject, getObject, listObjects) for AWS S3 or compatible services
- **JavaScript Connector**: Execute custom JavaScript code in a sandboxed environment for complex data mapping
- **GraphQL Connector**: Execute GraphQL queries and mutations with variable support
- **Base Connector**: Abstract class for implementing custom connectors

Each connector follows a consistent pattern:
- Zod schema validation for configuration and input
- Type-safe TypeScript interfaces
- Comprehensive error handling
- Connection pooling/reuse where applicable

### Queue Processing

BullMQ worker processes jobs from Redis queue:

- Reliable job processing with retries
- Concurrent execution
- Job progress tracking

## 🔒 Environment Variables

### Core Application

| Variable      | Description               | Default       |
| ------------- | ------------------------- | ------------- |
| `NODE_ENV`    | Environment               | `development` |
| `PORT`        | API server port           | `3000`        |
| `MONGODB_URI` | MongoDB connection string | Required      |
| `REDIS_URL`   | Redis connection string   | Required      |
| `LOG_LEVEL`   | Logging level             | `info`        |

### AWS / LocalStack Configuration

| Variable               | Description                                  | Default (LocalStack)       |
| ---------------------- | -------------------------------------------- | -------------------------- |
| `AWS_ENDPOINT_URL`     | AWS endpoint (use LocalStack for local dev)  | `http://localhost:4566` (host) / `http://localstack:4566` (container) |
| `AWS_DEFAULT_REGION`   | AWS region                                   | `us-east-1`                |
| `AWS_ACCESS_KEY_ID`    | AWS access key ID                            | `test` (for LocalStack)    |
| `AWS_SECRET_ACCESS_KEY`| AWS secret access key                        | `test` (for LocalStack)    |
| `S3_BUCKET`            | Default S3 bucket for workflows              | `glue-test-bucket`         |
| `S3_ENDPOINT`          | S3-specific endpoint (if different from AWS) | `http://localhost:4566` (host) / `http://localstack:4566` (container) |

**Note**: 
- When running via **dev container**, these variables are pre-configured in docker-compose.override.yml with container hostnames (e.g., `http://localstack:4566`)
- When running on **host** (outside container), use `.env` file with localhost URLs (e.g., `http://localhost:4566`)
- The `.env.example` file shows host-based values as a reference

## 🐳 Docker Compose Configuration

This repository uses the **extension pattern** for docker-compose files to maintain a single source of truth:

- **`docker-compose.yml`** (root): Defines infrastructure services (MongoDB, Redis) as they exist in production/staging
- **`.devcontainer/docker-compose.override.yml`**: Contains only dev-specific overrides (app service, dev volumes, shared network, LocalStack)

### Why This Pattern?

This approach ensures that:

- Infrastructure changes are made in one place and automatically apply to dev containers
- Dev and production configurations never drift apart
- Dev-specific settings (like volume mounts, network modes) don't pollute the base configuration
- Dev container uses separate volumes (`mongodb-data-dev`, `redis-data-dev`, `localstack-data`) to isolate development data from standalone usage

### LocalStack for AWS Services

The dev container includes [LocalStack](https://localstack.cloud/) for mocking AWS services during local development and testing:

- **Services**: Currently configured for S3 (can be extended to include SQS, SNS, DynamoDB, etc.)
- **Endpoint**: `http://localstack:4566` (within container) or `http://localhost:4566` (from host)
- **Credentials**: Use `test` / `test` for access key and secret
- **Region**: `us-east-1`

#### Setting up LocalStack

After starting the dev container, initialize the S3 bucket:

```bash
# Run the setup script
./scripts/setup-localstack.sh

# Or manually create the bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://glue-test-bucket
```

#### Testing S3 Connector with LocalStack

Use the provided example workflow to test S3 operations:

```bash
# Start the API and worker
pnpm dev

# In another terminal, create and execute the LocalStack test workflow
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d @examples/12-localstack-s3-test.json

curl -X POST http://localhost:3000/workflows/localstack-s3-test/execute \
  -H "Content-Type: application/json" \
  -d '{}'
```

The workflow tests all S3 operations: `putObject`, `getObject`, and `listObjects`.

### Using Docker Compose Standalone

For manual development (without devcontainer):

```bash
# Start infrastructure (MongoDB, Redis, LocalStack)
docker compose -f docker-compose.yml -f .devcontainer/docker-compose.override.yml up -d

# Initialize LocalStack
./scripts/setup-localstack.sh

# Stop infrastructure
docker compose -f docker-compose.yml -f .devcontainer/docker-compose.override.yml down
```

### Dev Container Usage

The devcontainer automatically loads both files in sequence:

1. First, the base `docker-compose.yml` (infrastructure)
2. Then, `.devcontainer/docker-compose.override.yml` (dev overrides including LocalStack)

Services use the default Docker network; use service names (e.g., `mongodb`, `redis`, `localstack`) as hosts — for example `mongodb://mongodb:27017`, `redis://redis:6379`, and `http://localstack:4566`.
