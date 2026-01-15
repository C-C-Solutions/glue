# Dev Container Configuration

This directory contains the VS Code Dev Container configuration for Glue development.

## What's Included

- **Node.js 22 LTS**: Latest LTS version for production-ready development
- **MongoDB 8**: Latest stable version for data persistence
- **Redis 8.4**: Latest stable version for queue management
- **VS Code Extensions**: Pre-configured with essential TypeScript, MongoDB, and development tools
- **Auto-setup**: Dependencies are automatically installed on container creation

## Quick Start

1. Install [VS Code](https://code.visualstudio.com/) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open this repository in VS Code
3. Click "Reopen in Container" when prompted (or use Command Palette: "Dev Containers: Reopen in Container")
4. Wait for the container to build and initialize (first time only)
5. Start developing! All services (MongoDB, Redis) are already running

## Services

The dev container includes the following services:

- **App Container**: Node.js 22 development environment with pnpm
- **MongoDB**: Running on port 27017 (accessible as `localhost:27017`)
- **Redis**: Running on port 6379 (accessible as `localhost:6379`)
- **API Server**: Port 3000 is forwarded for the Fastify API

## Environment Variables

Environment variables are pre-configured in the dev container. You can find them in `docker-compose.yml`:

```
MONGODB_URI=mongodb://localhost:27017/glue
REDIS_URL=redis://localhost:6379
PORT=3000
```

## VS Code Extensions

The following extensions are automatically installed:

- ESLint
- Prettier
- TypeScript support
- MongoDB for VS Code
- YAML support
- GitHub Copilot

## Troubleshooting

### Container won't start
- Make sure Docker is running
- Try rebuilding the container: Command Palette → "Dev Containers: Rebuild Container"

### Ports already in use
- Check if MongoDB or Redis are running locally and stop them
- Or modify the port mappings in `.devcontainer/docker-compose.yml`

### Dependencies not installed
- Run `pnpm install` manually in the terminal
- Or rebuild the container to re-run postCreateCommand
