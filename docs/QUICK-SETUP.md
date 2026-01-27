# Quick Setup Guide

This is a quick reference for setting up continuous delivery. For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

1. **Coolify Instance**: Running and accessible
2. **GitHub Repository**: With admin access
3. **Docker Registry**: GitHub Container Registry (GHCR) - automatically available

## Setup Steps

### 1. Create Coolify Resources

In your Coolify dashboard:
1. Create a new project (or use existing)
2. Add two resources:
   - **API**: Docker-based service
   - **Worker**: Docker-based service
3. Note the resource UUIDs from the URL

### 2. Configure GitHub Secrets

Go to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Add these secrets:
- **COOLIFY_TOKEN**: Your Coolify API token
- **COOLIFY_URL**: Your Coolify instance URL (e.g., `https://coolify.example.com`)

### 3. Configure GitHub Variables

Go to: `Settings` → `Secrets and variables` → `Actions` → `Variables` → `New repository variable`

Add these variables:
- **COOLIFY_API_DEPLOYMENT_ID**: UUID of the API resource
- **COOLIFY_WORKER_DEPLOYMENT_ID**: UUID of the worker resource

### 4. Configure Coolify Resources

For each resource (API and Worker):

#### General Settings
- **Name**: glue-api or glue-worker
- **Source**: GitHub
- **Build Pack**: Dockerfile
- **Dockerfile Location**: 
  - API: `apps/api/Dockerfile`
  - Worker: `apps/worker/Dockerfile`
- **Build Context**: `.`

#### Environment Variables (API)
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-mongodb:27017/glue
REDIS_URL=redis://your-redis:6379
LOG_LEVEL=info
```

#### Environment Variables (Worker)
```bash
NODE_ENV=production
MONGODB_URI=mongodb://your-mongodb:27017/glue
REDIS_URL=redis://your-redis:6379
LOG_LEVEL=info
```

### 5. Test the Deployment

1. Push a commit to `main` branch
2. Go to: `Actions` tab in GitHub
3. Watch the CD workflow run
4. Check Coolify dashboard for deployment logs

## Common Commands

### Manual Deployment (via GitHub CLI)
```bash
# Deploy all apps
gh workflow run cd.yml -f force-deploy-all=true

# Deploy API only
gh workflow run cd.yml -f deploy-api=true

# Deploy Worker only
gh workflow run cd.yml -f deploy-worker=true
```

### Check Deployment Status
```bash
# View recent workflow runs
gh run list --workflow=cd.yml

# View logs for a specific run
gh run view <run-id> --log
```

## Workflow Files

- `.github/workflows/cd.yml` - Main CD workflow
- `.github/workflows/build-image.yml` - Build Docker images
- `.github/workflows/deploy-coolify.yml` - Deploy to Coolify
- `.github/workflows/pr-automation.yml` - PR automation
- `.github/labeler.yml` - Auto-labeling config

## Troubleshooting

### Builds fail
- Check that `pnpm build` works locally
- Verify Dockerfile paths are correct

### Deployments fail
- Verify `COOLIFY_TOKEN` is valid
- Check `COOLIFY_URL` is correct (no trailing slash)
- Ensure deployment UUIDs are correct

### Images can't be pulled
- Make package public in GitHub settings, or
- Add GHCR credentials to Coolify:
  - Username: Your GitHub username
  - Password: GitHub PAT with `read:packages` scope

## Next Steps

- Read the full [Deployment Guide](./DEPLOYMENT.md)
- Configure PR automation labels
- Set up deployment notifications
- Add staging environment (optional)
