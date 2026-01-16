# Production image
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
