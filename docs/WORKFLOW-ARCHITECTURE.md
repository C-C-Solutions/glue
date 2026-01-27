# Workflow Architecture

## Overview

The CD system consists of 6 GitHub Actions workflows working together to provide automated deployments.

## Workflow Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        cd.yml (Main)                         │
│                                                              │
│  Triggered by: push to main, workflow_dispatch              │
└──────────────┬───────────────────────────────────────────────┘
               │
               │ Uses
               ▼
    ┌──────────────────────┐
    │ detect-changes.yml   │◄─── Analyzes git diff
    │                      │     Outputs: api-changed, worker-changed,
    │                      │              packages-changed, infra-changed
    └──────────────────────┘
               │
               │ Based on changes
               ▼
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────┐     ┌─────────────┐
│build-image  │     │build-image  │◄─── Reusable workflow
│   (API)     │     │  (Worker)   │     - Install deps
│             │     │             │     - Build workspace
└──────┬──────┘     └──────┬──────┘     - Build Docker image
       │                   │             - Push to GHCR
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│deploy-      │     │deploy-      │◄─── Reusable workflow
│coolify      │     │coolify      │     - Create deployment
│  (API)      │     │  (Worker)   │     - Call Coolify API
│             │     │             │     - Track status
└─────────────┘     └─────────────┘
```

## PR Automation

```
┌─────────────────────────────────────────────────────────────┐
│                   pr-automation.yml                          │
│                                                              │
│  Triggered by: pull_request events                          │
└──────────────┬───────────────────────────────────────────────┘
               │
               │ On PR open/sync
               ▼
    ┌──────────────────────┐
    │ Auto-label based on  │
    │ changed files        │
    └──────────────────────┘
               │
               ├─► Add size labels (xs, s, m, l, xl)
               │
               ├─► Validate PR title (conventional commits)
               │
               ├─► Check for breaking changes
               │
               └─► Add deployment impact comment
```

## Workflow Triggers

### cd.yml (Continuous Deployment)
- **Auto**: Push to `main` branch
- **Manual**: Workflow dispatch with options:
  - Force deploy all apps
  - Deploy specific app(s)

### pr-automation.yml
- **Auto**: Pull request opened, synchronized, reopened
- **Auto**: Pull request labeled/unlabeled

### ci.yml (Existing)
- **Auto**: Push to `main` branch
- **Auto**: Pull request to `main` branch

## Data Flow

### Change Detection Flow
```
Git Diff
   │
   ▼
┌────────────────────┐
│ apps/api/**        │──► api-changed: true
│ apps/worker/**     │──► worker-changed: true
│ packages/**        │──► packages-changed: true
│ docker-compose.yml │──► infra-changed: true
│ .github/workflows/ │──► infra-changed: true
└────────────────────┘
   │
   ▼
┌────────────────────┐
│ Decision Logic     │
│                    │
│ If infra or        │
│ packages changed:  │──► Deploy ALL apps
│                    │
│ Else:              │──► Deploy only changed apps
└────────────────────┘
```

### Build and Deploy Flow
```
Source Code
   │
   ▼
┌────────────────┐
│ pnpm install   │
│ pnpm build     │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Docker Build   │
│ (with built    │
│  artifacts)    │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Push to GHCR   │
│ with tags:     │
│ - main         │
│ - sha          │
│ - latest       │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Coolify API    │
│ GET /deploy    │
│ ?uuid=...      │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Coolify pulls  │
│ image and      │
│ redeploys      │
└────────────────┘
```

## Secrets and Variables

### Secrets (Repository Level)
- `COOLIFY_TOKEN` - API token for Coolify authentication
- `COOLIFY_URL` - Base URL of Coolify instance
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Variables (Repository Level)
- `COOLIFY_API_DEPLOYMENT_ID` - UUID for API resource
- `COOLIFY_WORKER_DEPLOYMENT_ID` - UUID for Worker resource

## Permissions

### cd.yml
- `contents: read` - Read repository code
- `packages: write` - Push to GHCR
- `deployments: write` - Create deployment records

### pr-automation.yml
- `contents: read` - Read repository code
- `pull-requests: write` - Add labels, comments
- `issues: write` - Add labels (PRs are issues)

### build-image.yml (reusable)
- `contents: read` - Read repository code
- `packages: write` - Push to GHCR

### deploy-coolify.yml (reusable)
- `contents: read` - Read repository code
- `deployments: write` - Create deployment records

## Error Handling

Each workflow includes:
- **always() conditions** - Jobs run even if dependencies fail
- **if conditions** - Smart skipping based on results
- **Status updates** - GitHub deployment API tracks success/failure
- **Detailed logging** - HTTP responses, build output, etc.

## Caching Strategy

- **Build cache**: Docker buildx with GitHub Actions cache
- **Dependencies**: pnpm cache via actions/setup-node
- **Layers**: Multi-stage Docker builds (when network available)

## Labels Used

### Auto-applied Labels
- `app:api` - API app changes
- `app:worker` - Worker app changes
- `packages` - Shared package changes
- `package:core`, `package:db`, etc. - Specific package
- `docker` - Dockerfile/compose changes
- `ci/cd` - Workflow changes
- `documentation` - Markdown file changes
- `dependencies` - package.json/lock changes
- `config` - Configuration file changes
- `tests` - Test file changes
- `size/*` - Size labels (xs to xl)
- `breaking-change` - Breaking changes detected

## Deployment States

GitHub tracks these deployment states:
1. **queued** - Deployment created
2. **in_progress** - Coolify API called
3. **success** - Deployment succeeded
4. **failure** - Deployment failed
5. **error** - Unexpected error

## Monitoring

### GitHub UI
- Actions tab: View workflow runs
- Deployments: Track deployment history
- Pull Requests: See labels and comments

### Coolify Dashboard
- Deployment logs
- Resource status
- Application health

### Notifications
- GitHub Actions emails
- Deployment status updates
- PR comments for deployment impact
