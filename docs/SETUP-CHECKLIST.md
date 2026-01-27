# Setup Checklist

Use this checklist to set up continuous delivery for your Glue monorepo.

## Prerequisites ✅

- [ ] Coolify instance is running and accessible
- [ ] You have admin access to the GitHub repository
- [ ] You have admin access to the Coolify instance

## Step 1: Coolify Setup

### Create Resources
- [ ] Log in to Coolify dashboard
- [ ] Create or select a project
- [ ] Create API resource:
  - [ ] Name: `glue-api`
  - [ ] Source: GitHub
  - [ ] Build Pack: Dockerfile
  - [ ] Dockerfile Location: `apps/api/Dockerfile`
  - [ ] Build Context: `.`
- [ ] Create Worker resource:
  - [ ] Name: `glue-worker`
  - [ ] Source: GitHub
  - [ ] Build Pack: Dockerfile
  - [ ] Dockerfile Location: `apps/worker/Dockerfile`
  - [ ] Build Context: `.`

### Note Resource UUIDs
- [ ] Copy API resource UUID from URL
- [ ] Copy Worker resource UUID from URL

### Configure Environment Variables

#### API Resource
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `MONGODB_URI=mongodb://your-host:27017/glue`
- [ ] `REDIS_URL=redis://your-host:6379`
- [ ] `LOG_LEVEL=info`

#### Worker Resource
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI=mongodb://your-host:27017/glue`
- [ ] `REDIS_URL=redis://your-host:6379`
- [ ] `LOG_LEVEL=info`

### Configure Health Checks

#### API
- [ ] Type: HTTP
- [ ] Path: `/health`
- [ ] Port: `3000`
- [ ] Interval: `30s`

#### Worker
- [ ] Type: Command
- [ ] Command: `node -e "process.exit(0)"`
- [ ] Interval: `30s`

## Step 2: Generate Coolify API Token

- [ ] Go to Coolify Settings → API Tokens
- [ ] Create new token with name: `github-actions`
- [ ] Copy the token (you won't see it again!)

## Step 3: Configure GitHub Secrets

Go to: Repository → Settings → Secrets and variables → Actions → Secrets

- [ ] Click "New repository secret"
- [ ] Add `COOLIFY_TOKEN`:
  - [ ] Name: `COOLIFY_TOKEN`
  - [ ] Value: (paste the API token from step 2)
- [ ] Add `COOLIFY_URL`:
  - [ ] Name: `COOLIFY_URL`
  - [ ] Value: `https://your-coolify-instance.com` (no trailing slash!)

## Step 4: Configure GitHub Variables

Go to: Repository → Settings → Secrets and variables → Actions → Variables

- [ ] Click "New repository variable"
- [ ] Add `COOLIFY_API_DEPLOYMENT_ID`:
  - [ ] Name: `COOLIFY_API_DEPLOYMENT_ID`
  - [ ] Value: (paste API resource UUID from step 1)
- [ ] Add `COOLIFY_WORKER_DEPLOYMENT_ID`:
  - [ ] Name: `COOLIFY_WORKER_DEPLOYMENT_ID`
  - [ ] Value: (paste Worker resource UUID from step 1)

## Step 5: Configure GitHub Permissions

Go to: Repository → Settings → Actions → General

- [ ] Under "Workflow permissions":
  - [ ] Select "Read and write permissions"
  - [ ] Check "Allow GitHub Actions to create and approve pull requests"
- [ ] Click "Save"

## Step 6: Configure GHCR Access (if using private registry)

### Option A: Public Registry (Recommended for open source)
- [ ] Go to: Your profile → Packages
- [ ] Find `glue/api` and `glue/worker` packages
- [ ] Change visibility to "Public"

### Option B: Private Registry
- [ ] Create GitHub Personal Access Token (PAT):
  - [ ] Go to: Settings → Developer settings → Personal access tokens → Tokens (classic)
  - [ ] Generate new token with `read:packages` scope
  - [ ] Copy the token
- [ ] Add credentials to Coolify:
  - [ ] Go to each resource → Registry
  - [ ] Registry: `ghcr.io`
  - [ ] Username: (your GitHub username)
  - [ ] Password: (paste the PAT)

## Step 7: Test the Setup

### Test 1: Manual Deployment
- [ ] Go to: Repository → Actions → CD workflow
- [ ] Click "Run workflow"
- [ ] Select options:
  - [ ] Branch: `main`
  - [ ] Check "Force deploy all apps"
- [ ] Click "Run workflow"
- [ ] Wait for workflow to complete
- [ ] Check Coolify dashboard for deployment status

### Test 2: Automatic Deployment
- [ ] Create a small change:
  ```bash
  echo "// test deployment" >> apps/api/src/index.ts
  git add .
  git commit -m "feat(api): test CD pipeline"
  git push origin main
  ```
- [ ] Go to: Repository → Actions
- [ ] Watch the CD workflow run
- [ ] Verify only API was deployed

### Test 3: PR Automation
- [ ] Create a feature branch
- [ ] Make a change
- [ ] Push and create a PR
- [ ] Verify:
  - [ ] Auto-labels were added
  - [ ] Size label was added
  - [ ] Deployment impact comment was added
  - [ ] PR title validation passed

## Step 8: Verify Deployment

### Check GitHub
- [ ] Go to: Repository → Actions
- [ ] Verify workflow run shows green checkmarks
- [ ] Go to: Repository → Code → Deployments (right sidebar)
- [ ] Verify deployment records were created

### Check Coolify
- [ ] Go to: Coolify → Your Project → Resources
- [ ] Verify API and Worker show as "Running"
- [ ] Check deployment logs for errors
- [ ] Verify application is accessible

### Check Application
- [ ] Test API health endpoint: `curl https://your-api-url/health`
- [ ] Verify worker is processing jobs
- [ ] Check MongoDB and Redis connections

## Step 9: Team Onboarding

- [ ] Share documentation with team:
  - [ ] `docs/DEPLOYMENT.md` - Complete guide
  - [ ] `docs/QUICK-SETUP.md` - Quick reference
  - [ ] `CONTRIBUTING.md` - Development workflow
- [ ] Review commit message conventions
- [ ] Review PR process
- [ ] Review deployment monitoring

## Step 10: Optional Enhancements

- [ ] Set up deployment notifications:
  - [ ] Slack webhook
  - [ ] Discord webhook
  - [ ] Email notifications
- [ ] Add staging environment:
  - [ ] Create staging Coolify resources
  - [ ] Add staging secrets/variables
  - [ ] Modify workflow for staging deploys
- [ ] Configure custom domain:
  - [ ] Add domain in Coolify
  - [ ] Configure DNS
  - [ ] Set up SSL certificate

## Troubleshooting

If something doesn't work, check:
- [ ] Are all secrets/variables spelled correctly?
- [ ] Is `COOLIFY_URL` without trailing slash?
- [ ] Are UUIDs correct (copy from Coolify URL)?
- [ ] Do you have correct permissions in GitHub?
- [ ] Check workflow logs in GitHub Actions
- [ ] Check deployment logs in Coolify

## Support Resources

- 📖 [Complete Deployment Guide](./DEPLOYMENT.md)
- 🏗️ [Workflow Architecture](./WORKFLOW-ARCHITECTURE.md)
- 🚀 [Quick Setup Guide](./QUICK-SETUP.md)
- 💬 GitHub Discussions for questions
- 🐛 GitHub Issues for bugs

## Checklist Complete! 🎉

When all items are checked:
- ✅ CD pipeline is configured
- ✅ Deployments are automated
- ✅ Team can contribute safely
- ✅ Monitoring is in place

**Next Steps:**
1. Make changes on feature branches
2. Create PRs for review
3. Merge to main
4. Watch automatic deployments!
