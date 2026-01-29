# Build stage
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json tsconfig.base.json ./

# Copy all package.json and tsconfig.json files first for better caching
COPY packages/config/package.json packages/config/tsconfig.json ./packages/config/
COPY packages/core/package.json packages/core/tsconfig.json ./packages/core/
COPY packages/db/package.json packages/db/tsconfig.json ./packages/db/
COPY packages/queue/package.json packages/queue/tsconfig.json ./packages/queue/
COPY apps/worker/package.json apps/worker/tsconfig.json ./apps/worker/

# Install dependencies (this layer will be cached if package files don't change)
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY packages ./packages
COPY apps/worker ./apps/worker

# Build the workspace
RUN pnpm build

# Production stage
FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json tsconfig.base.json ./

# Copy package source (needed for runtime imports)
COPY packages/config/package.json ./packages/config/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/queue/package.json ./packages/queue/package.json

# Copy worker app package.json
COPY apps/worker/package.json ./apps/worker/package.json

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/queue/dist ./packages/queue/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

WORKDIR /app/apps/worker

# Run the worker
CMD ["node", "dist/index.js"]
