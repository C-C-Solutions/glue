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

# Copy the worker app with its dist folder
COPY apps/worker ./apps/worker

WORKDIR /app/apps/worker

# Run the worker
CMD ["node", "dist/index.js"]
