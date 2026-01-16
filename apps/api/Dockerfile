# Production image
# Note: This Dockerfile uses pre-built artifacts and node_modules from the local environment
# because the build environment has network restrictions that prevent installing packages
# during the Docker build. In a production environment with proper network access,
# a multi-stage build with pnpm install would be more appropriate.
FROM node:22-slim

WORKDIR /app

# Copy the entire workspace structure with built artifacts and dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json tsconfig.base.json ./

# Copy all node_modules (already installed locally)
COPY node_modules ./node_modules

# Copy packages with their dist folders and node_modules
COPY packages/config ./packages/config
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY packages/queue ./packages/queue

# Copy the API app with its dist folder
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Expose API port
EXPOSE 3000

# Run the API server
CMD ["node", "dist/index.js"]
