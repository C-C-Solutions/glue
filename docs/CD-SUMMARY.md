# Continuous Delivery Setup - Implementation Summary

## Overview

This repository now has a complete continuous delivery (CD) pipeline that automatically deploys apps to Coolify based on intelligent change detection.

## What's Included

### GitHub Actions Workflows (6 total)

1. **cd.yml** - Main CD Workflow
   - Triggered on push to `main` or manual workflow dispatch
   - Detects changed files and deploys only affected apps
   - Builds Docker images and pushes to GitHub Container Registry
   - Triggers Coolify deployments via API
   - Tracks deployment status in GitHub

2. **build-image.yml** - Reusable Build Workflow
   - Builds workspace with pnpm
   - Creates Docker images
   - Pushes to container registry
   - Supports caching for faster builds

3. **deploy-coolify.yml** - Reusable Deploy Workflow
   - Creates GitHub deployment records
   - Calls Coolify deployment API
   - Updates deployment status (success/failure)
   - Provides deployment URLs

4. **detect-changes.yml** - Reusable Change Detection
   - Analyzes git diff for changed files
   - Outputs flags for apps, packages, infrastructure
   - Used by other workflows

5. **pr-automation.yml** - PR Automation
   - Auto-labels based on changed files
   - Adds size labels (xs to xl)
   - Validates PR titles (conventional commits)
   - Detects breaking changes
   - Shows deployment impact in comments

6. **ci.yml** - Existing CI Workflow
   - Runs on PRs and pushes
   - Type checking, linting, building, testing
   - Not modified by this implementation

### Configuration Files

- `.github/labeler.yml` - Auto-labeling configuration for PRs
- `.github/ISSUE_TEMPLATE/deployment-issue.yml` - Issue template for deployment problems

### Documentation

1. **docs/DEPLOYMENT.md** (10,000+ words)
   - Complete deployment setup guide
   - Coolify configuration instructions
   - GitHub secrets and variables setup
   - Manual deployment options
   - Troubleshooting guide
   - Best practices

2. **docs/QUICK-SETUP.md**
   - Quick reference for setup
   - Common commands
   - Troubleshooting shortcuts

3. **docs/WORKFLOW-ARCHITECTURE.md**
   - Visual diagrams of workflow relationships
   - Data flow explanations
   - Deployment state tracking
   - Monitoring guidance

4. **CONTRIBUTING.md**
   - Development workflow
   - Commit message conventions
   - PR guidelines
   - Deployment process explanation
   - Code style guidelines

5. **README.md** (updated)
   - Added workflow badges
   - Added deployment section
   - Links to detailed documentation

## How It Works

### Automatic Deployment Flow

```
Push to main
     │
     ▼
Detect changes
     │
     ├─► API changed? → Build API → Deploy API
     ├─► Worker changed? → Build Worker → Deploy Worker
     └─► Packages/Infra changed? → Build ALL → Deploy ALL
```

### Change Detection Rules

| What Changed | What Deploys |
|-------------|--------------|
| `apps/api/**` | API only |
| `apps/worker/**` | Worker only |
| `packages/**` | Both apps (they depend on packages) |
| `docker-compose.yml` | Both apps (infrastructure change) |
| `.github/workflows/**` | Both apps (infrastructure change) |
| `pnpm-lock.yaml` | Both apps (dependencies change) |

### Manual Deployment

You can trigger deployments manually:

**Via GitHub UI:**
1. Go to Actions tab
2. Select "CD" workflow
3. Click "Run workflow"
4. Choose options (deploy all, specific apps)
5. Click "Run workflow"

**Via GitHub CLI:**
```bash
gh workflow run cd.yml -f force-deploy-all=true
gh workflow run cd.yml -f deploy-api=true
gh workflow run cd.yml -f deploy-worker=true
```

## Setup Requirements

### In Coolify

1. Create project (or use existing)
2. Add resources for API and Worker
3. Configure each resource:
   - Source: GitHub
   - Build Pack: Dockerfile
   - Dockerfile: `apps/api/Dockerfile` or `apps/worker/Dockerfile`
   - Build Context: `.`
4. Note the resource UUIDs

### In GitHub

**Secrets** (Settings → Secrets and variables → Actions):
- `COOLIFY_TOKEN` - Your Coolify API token
- `COOLIFY_URL` - Your Coolify instance URL

**Variables** (Settings → Secrets and variables → Actions → Variables):
- `COOLIFY_API_DEPLOYMENT_ID` - API resource UUID
- `COOLIFY_WORKER_DEPLOYMENT_ID` - Worker resource UUID

**Permissions** (Settings → Actions → General):
- Read and write permissions ✓
- Allow GitHub Actions to create and approve pull requests ✓

### In GHCR (GitHub Container Registry)

**For public access:**
- No additional setup needed
- Images are pushed to `ghcr.io/{org}/{repo}/{app}`

**For private access:**
- Add GHCR credentials to Coolify
- Username: Your GitHub username
- Password: GitHub PAT with `read:packages` scope

## Testing the Setup

### 1. Test Automatic Deployment

```bash
# Make a small change to API
echo "// test" >> apps/api/src/index.ts

# Commit and push
git add .
git commit -m "feat(api): test deployment"
git push origin main

# Watch in GitHub Actions
# Should see: CD workflow → Build API → Deploy API
```

### 2. Test Manual Deployment

```bash
# Deploy all apps
gh workflow run cd.yml -f force-deploy-all=true

# Check status
gh run list --workflow=cd.yml
gh run watch
```

### 3. Test PR Automation

```bash
# Create a feature branch
git checkout -b feat/test-pr

# Make a change
echo "// test" >> apps/api/src/index.ts

# Push and create PR
git add .
git commit -m "feat(api): test PR automation"
git push origin feat/test-pr

# Create PR in GitHub
# Should see: Auto-labels, size label, deployment impact comment
```

## Monitoring

### GitHub Actions
- **Actions tab**: View all workflow runs
- **Workflow run page**: View job logs, build output, deployment status
- **Deployments**: Track deployment history and status

### Coolify Dashboard
- **Resources**: View each app's status
- **Deployments**: View deployment logs
- **Logs**: Real-time application logs

## Troubleshooting

### Build Fails

**Check:**
- Does `pnpm build` work locally?
- Are dependencies in `package.json`?
- Are Dockerfiles correct?

**Fix:**
- Test build locally first
- Check workflow logs for errors
- Verify `pnpm-lock.yaml` is committed

### Deployment Fails

**Check:**
- Is `COOLIFY_TOKEN` valid?
- Is `COOLIFY_URL` correct (no trailing slash)?
- Are deployment UUIDs correct?

**Fix:**
- Regenerate Coolify API token
- Verify URLs and UUIDs
- Check Coolify logs for errors

### Wrong Apps Deploy

**Check:**
- Review change detection in workflow logs
- Check file paths in workflow filters

**Fix:**
- Use manual deployment to override
- Check `.github/workflows/cd.yml` filter paths

## Best Practices

1. **Always test locally** before pushing
2. **Use feature branches** and PRs
3. **Check deployment impact** before merging
4. **Monitor workflow runs** after deployment
5. **Review Coolify logs** if issues occur
6. **Keep secrets secure** and rotate regularly

## Support

- 📖 **Documentation**: See `docs/DEPLOYMENT.md`
- 🐛 **Issues**: Use deployment issue template
- 💬 **Discussions**: For questions and ideas

## Files to Review

Before deploying, review these key files:
- [ ] `.github/workflows/cd.yml` - Main CD logic
- [ ] `docker-compose.yml` - Infrastructure services
- [ ] `apps/*/Dockerfile` - Build instructions
- [ ] `.env.example` - Environment variables template

## Next Steps

After setup is complete:
1. ✅ Configure Coolify resources
2. ✅ Add GitHub secrets and variables
3. ✅ Test with a small change
4. ✅ Monitor first deployment
5. ✅ Document team-specific procedures
6. ✅ Set up notifications (optional)
7. ✅ Configure staging environment (optional)

## Maintenance

### Regular Tasks
- Review deployment logs weekly
- Update dependencies monthly
- Rotate API tokens quarterly
- Review workflow efficiency quarterly

### When to Update Workflows
- Adding new apps
- Changing build process
- Updating deployment targets
- Adding environments (staging, etc.)

## Success Metrics

Track these to measure CD effectiveness:
- ⏱️ **Deployment frequency**: How often you deploy
- 🚀 **Lead time**: Time from commit to production
- ✅ **Success rate**: Percentage of successful deployments
- 🔄 **Rollback rate**: Percentage requiring rollbacks
- ⏲️ **Recovery time**: Time to fix failed deployments

---

**Implementation Date**: January 2026  
**Version**: 1.0.0  
**Status**: ✅ Complete and Ready to Use
