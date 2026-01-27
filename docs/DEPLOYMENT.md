# Continuous Delivery Setup Guide

This guide explains how to set up and use the continuous delivery (CD) pipeline for deploying apps to Coolify.

## Overview

The CD pipeline automatically:
- Detects which apps changed (API, Worker, or shared packages)
- Builds Docker images only for changed apps
- Pushes images to GitHub Container Registry (GHCR)
- Triggers Coolify deployments for affected apps
- Creates deployment records in GitHub

## Architecture

```
┌─────────────────┐
│   Push to main  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Detect Changes  │  ← Identifies affected apps
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────┐   ┌────────┐
│ API │   │ Worker │  ← Build & push Docker images
└──┬──┘   └───┬────┘
   │          │
   ▼          ▼
┌─────────────────┐
│Deploy to Coolify│  ← Trigger deployments
└─────────────────┘
```

## Change Detection Rules

The pipeline decides what to deploy based on file changes:

### Infrastructure Changes → Full Redeploy
Changes to these files trigger deployment of **all apps**:
- `docker-compose.yml`
- `.github/workflows/**`
- `apps/**/Dockerfile`
- `turbo.json`
- `pnpm-lock.yaml`

### Package Changes → Full Redeploy
Changes to `packages/**` trigger deployment of **all apps** (since apps depend on packages)

### App-Specific Changes → Individual Deployment
- Changes to `apps/api/**` → Deploy API only
- Changes to `apps/worker/**` → Deploy Worker only

## Prerequisites

### 1. Coolify Setup

You need a Coolify instance with:
- API access enabled
- API token generated
- Resource UUIDs for each app

#### Getting Resource UUIDs

1. Log in to your Coolify dashboard
2. Navigate to your project
3. Select each resource (API, Worker)
4. Copy the UUID from the URL: `https://your-coolify.com/project/{project-id}/resource/{resource-uuid}`

### 2. GitHub Container Registry

The pipeline uses GHCR to store Docker images. GitHub Actions automatically has access via `GITHUB_TOKEN`.

#### Image Naming Convention
Images are pushed to:
```
ghcr.io/{organization}/{repository}/{app-name}:{tag}
```

Example:
```
ghcr.io/c-c-solutions/glue/api:main
ghcr.io/c-c-solutions/glue/worker:main
```

### 3. Required GitHub Secrets

Add these secrets to your repository:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `COOLIFY_TOKEN` | Your Coolify API token | `your-api-token-here` |
| `COOLIFY_URL` | Your Coolify instance URL | `https://coolify.yourdomain.com` |

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### 4. Required GitHub Variables

Add these variables to your repository:

| Variable Name | Description | Example |
|--------------|-------------|---------|
| `COOLIFY_API_DEPLOYMENT_ID` | UUID of API resource in Coolify | `uuid-here` |
| `COOLIFY_WORKER_DEPLOYMENT_ID` | UUID of Worker resource in Coolify | `uuid-here` |

#### How to Add Secrets and Variables

1. Go to your repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Add Repository secrets
4. Add Repository variables

## Coolify Configuration

### Resource Setup

For each app (API and Worker), configure your Coolify resource:

1. **Source**: GitHub repository
2. **Build Pack**: Dockerfile
3. **Dockerfile Location**: 
   - API: `apps/api/Dockerfile`
   - Worker: `apps/worker/Dockerfile`
4. **Build Context**: `.` (repository root)
5. **Registry**: GitHub Container Registry (GHCR)
6. **Image**: Use the GHCR image path from above

### Environment Variables

Configure these environment variables in Coolify for each app:

#### API App
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-mongodb-host:27017/glue
REDIS_URL=redis://your-redis-host:6379
LOG_LEVEL=info
```

#### Worker App
```bash
NODE_ENV=production
MONGODB_URI=mongodb://your-mongodb-host:27017/glue
REDIS_URL=redis://your-redis-host:6379
LOG_LEVEL=info
```

### Health Checks

Configure health checks in Coolify:

#### API App
- **Path**: `/health`
- **Port**: `3000`
- **Interval**: `30s`

#### Worker App
- **Type**: Command
- **Command**: `node -e "process.exit(0)"`
- **Interval**: `30s`

## Workflows

### Main CD Workflow (`cd.yml`)

Triggers on:
- Push to `main` branch
- Manual workflow dispatch

Jobs:
1. **detect-changes**: Analyzes changed files
2. **build-api**: Builds API Docker image (if needed)
3. **build-worker**: Builds Worker Docker image (if needed)
4. **deploy-api**: Deploys API to Coolify (if built)
5. **deploy-worker**: Deploys Worker to Coolify (if built)
6. **summary**: Creates deployment summary

### Reusable Workflows

#### `build-image.yml`
Reusable workflow for building and pushing Docker images.

**Inputs**:
- `app-name`: Name of the app (api or worker)
- `dockerfile-path`: Path to Dockerfile
- `context`: Build context (default: `.`)
- `push`: Whether to push image (default: `true`)

**Features**:
- Sets up build environment (pnpm, Node.js)
- Installs dependencies and builds workspace
- Builds Docker image with proper caching
- Pushes to GHCR with semantic tags

#### `deploy-coolify.yml`
Reusable workflow for deploying to Coolify.

**Inputs**:
- `app-name`: Name of the app
- `deployment-id`: Coolify resource UUID
- `environment`: Deployment environment (default: `production`)

**Features**:
- Creates GitHub deployment record
- Triggers Coolify deployment via API
- Updates deployment status
- Provides deployment URL

#### `detect-changes.yml`
Reusable workflow for change detection.

**Outputs**:
- `api-changed`: Whether API changed
- `worker-changed`: Whether Worker changed
- `packages-changed`: Whether packages changed
- `infra-changed`: Whether infrastructure changed

### PR Automation (`pr-automation.yml`)

Automatically manages pull requests:

#### Auto-Labeling
- Labels based on changed files (apps, packages, docs, etc.)
- Adds size labels (xs, s, m, l, xl)
- Identifies breaking changes
- Shows deployment impact

#### Title Validation
Enforces conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests
- `ci:` - CI/CD changes
- `chore:` - Maintenance

#### Deployment Impact Comments
Posts a comment showing which apps will deploy when the PR is merged.

## Manual Deployments

### Deploy All Apps

```bash
# Via GitHub UI
1. Go to Actions tab
2. Select "CD" workflow
3. Click "Run workflow"
4. Check "Force deploy all apps"
5. Click "Run workflow"
```

### Deploy Specific App

```bash
# Via GitHub UI
1. Go to Actions tab
2. Select "CD" workflow
3. Click "Run workflow"
4. Check "Deploy API app" or "Deploy worker app"
5. Click "Run workflow"
```

### Via GitHub CLI

```bash
# Deploy all apps
gh workflow run cd.yml -f force-deploy-all=true

# Deploy API only
gh workflow run cd.yml -f deploy-api=true

# Deploy Worker only
gh workflow run cd.yml -f deploy-worker=true

# Deploy both
gh workflow run cd.yml -f deploy-api=true -f deploy-worker=true
```

## Monitoring Deployments

### GitHub UI

1. Go to **Actions** tab
2. Click on the workflow run
3. View job logs and deployment status

### Deployment Status

GitHub creates deployment records for each deploy. View them:
1. Go to **Code** tab
2. Click **Deployments** (right sidebar)
3. See deployment history and status

### Coolify Dashboard

Monitor deployments in Coolify:
1. Log in to Coolify
2. Navigate to your project
3. View deployment logs and status for each resource

## Troubleshooting

### Build Failures

**Problem**: Docker build fails
**Solution**: 
- Check that dependencies are properly defined
- Ensure `pnpm build` succeeds locally
- Verify Dockerfile paths are correct

### Deployment Failures

**Problem**: Coolify deployment fails
**Solution**:
- Verify `COOLIFY_TOKEN` is valid
- Check `COOLIFY_URL` is correct
- Ensure deployment UUIDs are correct
- Check Coolify logs for errors

### Change Detection Issues

**Problem**: Wrong apps deploying
**Solution**:
- Review change detection rules
- Check file paths in workflow
- Use manual deployment to override

### Image Pull Failures

**Problem**: Coolify can't pull image from GHCR
**Solution**:
- Make sure GHCR package is public, or
- Configure Coolify with GHCR credentials:
  - Username: Your GitHub username
  - Password: GitHub Personal Access Token with `read:packages` scope

## Best Practices

### 1. Commit Messages
Use conventional commit format for clear change tracking:
```
feat(api): add new endpoint
fix(worker): resolve queue processing bug
docs: update deployment guide
```

### 2. Feature Branches
- Work in feature branches
- Create PRs to main
- Review deployment impact before merging

### 3. Testing Before Deploy
- Run CI checks on PRs
- Test locally before pushing
- Monitor deployment logs

### 4. Rollbacks
If a deployment fails:
1. Revert the commit on main
2. Push to trigger automatic redeployment
3. Or use manual deployment with previous image tag

### 5. Secrets Management
- Never commit secrets to the repository
- Use GitHub Secrets for sensitive data
- Use Coolify environment variables for runtime config
- Rotate tokens regularly

## Advanced Configuration

### Custom Registry

To use a different registry (not GHCR):

1. Add secrets:
   - `REGISTRY_URL`
   - `REGISTRY_USERNAME`
   - `REGISTRY_PASSWORD`

2. Update workflow:
```yaml
secrets:
  registry-url: ${{ secrets.REGISTRY_URL }}
  registry-username: ${{ secrets.REGISTRY_USERNAME }}
  registry-password: ${{ secrets.REGISTRY_PASSWORD }}
```

### Multiple Environments

To add staging environment:

1. Create Coolify resources for staging
2. Add staging secrets and variables
3. Modify CD workflow to deploy to staging on non-main branches

### Custom Deployment Triggers

Add custom rules in `cd.yml`:
```yaml
on:
  push:
    branches: [main, staging]
    tags: ['v*']
```

## Support

For issues or questions:
- Check workflow logs in GitHub Actions
- Review Coolify deployment logs
- Consult the [Coolify API documentation](https://coolify.io/docs/api)
- Open an issue in this repository
