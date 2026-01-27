# Contributing to Glue

Thank you for your interest in contributing to Glue! This guide will help you get started.

## Development Setup

### Prerequisites
- Node.js 22+
- pnpm 8+
- Docker and Docker Compose
- Git

### Getting Started

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/glue.git
   cd glue
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start infrastructure services**
   ```bash
   docker compose up -d
   ```

4. **Build all packages**
   ```bash
   pnpm build
   ```

5. **Run in development mode**
   ```bash
   pnpm dev
   ```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Write clean, maintainable code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run tests
pnpm test

# Build to ensure no build errors
pnpm build
```

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```bash
# Feature
git commit -m "feat(api): add new workflow endpoint"

# Bug fix
git commit -m "fix(worker): resolve queue processing issue"

# Documentation
git commit -m "docs: update API documentation"

# Breaking change
git commit -m "feat(core)!: change workflow execution API"
```

**Commit Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `build:` - Build system changes
- `ci:` - CI/CD changes
- `chore:` - Other changes (dependencies, etc.)

**Breaking Changes:**
- Add `!` after the type: `feat(api)!: change endpoint`
- Or include `BREAKING CHANGE:` in the commit body

### 5. Push and Create a Pull Request

```bash
git push origin feat/your-feature-name
```

Then create a pull request on GitHub.

## Pull Request Guidelines

### PR Title

Your PR title should follow the same conventional commit format:

```
feat(api): add pagination to workflows endpoint
fix(worker): handle edge case in queue processing
docs: improve deployment guide
```

### PR Description

Include:
- **Summary** of changes
- **Motivation** - why this change is needed
- **Testing** - how you tested the changes
- **Related Issues** - link to any related issues
- **Breaking Changes** - if any, describe them clearly

### PR Labels

Our PR automation will automatically add labels based on:
- Changed files (apps, packages, docs, etc.)
- PR size (xs, s, m, l, xl)
- Breaking changes

You can also manually add labels like:
- `enhancement` - New feature or improvement
- `bug` - Bug fix
- `good first issue` - Good for newcomers
- `help wanted` - Looking for contributions

### Deployment Impact

The PR automation will comment on your PR showing which apps will be deployed when merged:

```markdown
## 🚀 Deployment Impact

Merging this PR will deploy:
- API app
```

This helps reviewers understand the deployment consequences.

## Code Style

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Avoid `any` types
- Use proper types from Zod schemas

### Naming Conventions

- **Files**: kebab-case (`workflow-service.ts`)
- **Classes**: PascalCase (`WorkflowService`)
- **Functions/Variables**: camelCase (`executeWorkflow`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase, no `I` prefix (`WorkflowConfig`)

### Code Organization

- Keep files focused and single-purpose
- Group related functionality
- Use barrel exports (`index.ts`)
- Separate concerns (business logic, data access, API)

## Testing

### Unit Tests

Write unit tests for:
- Business logic
- Utility functions
- Connectors
- Transformers

```typescript
import { describe, it, expect } from 'vitest';

describe('WorkflowService', () => {
  it('should execute workflow steps in order', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Write integration tests for:
- API endpoints
- Database operations
- Queue processing

## Documentation

### Code Documentation

- Add JSDoc comments to public APIs
- Explain complex logic with inline comments
- Document function parameters and return types

```typescript
/**
 * Executes a workflow with the given input.
 * 
 * @param workflowId - The ID of the workflow to execute
 * @param input - The input data for the workflow
 * @returns The execution ID
 */
async function executeWorkflow(workflowId: string, input: unknown): Promise<string> {
  // Implementation
}
```

### README Updates

Update documentation when you:
- Add new features
- Change APIs
- Update configuration
- Add dependencies

## Deployment Process

### Automatic Deployment

When your PR is merged to `main`:
1. The CD workflow automatically runs
2. It detects which apps/packages changed
3. It builds and deploys only affected apps
4. Deployment status is tracked in GitHub

### Deployment Rules

- **App changes**: Only that app deploys
- **Package changes**: All apps deploy (they depend on packages)
- **Infrastructure changes**: Full redeploy

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for details.

## Monorepo Structure

```
glue/
├── apps/              # Applications
│   ├── api/          # REST API service
│   └── worker/       # Queue worker service
├── packages/         # Shared packages
│   ├── core/         # Core engine
│   ├── db/           # Database layer
│   ├── queue/        # Queue utilities
│   └── config/       # Configuration
├── docs/             # Documentation
└── examples/         # Example workflows
```

### Working with Apps

Apps depend on packages. When you change a package, test with affected apps:

```bash
# Build all packages
pnpm build

# Test with API
cd apps/api
pnpm dev
```

### Working with Packages

Packages should be:
- Self-contained
- Well-tested
- Properly typed
- Documented

## Common Tasks

### Adding a Dependency

```bash
# To a specific package
cd packages/core
pnpm add dependency-name

# To an app
cd apps/api
pnpm add dependency-name

# To the root (dev dependency)
pnpm add -D dependency-name -w
```

### Running Individual Services

```bash
# API only
cd apps/api
pnpm dev

# Worker only
cd apps/worker
pnpm dev
```

### Cleaning Build Artifacts

```bash
# Clean all
pnpm clean

# Clean specific package
cd packages/core
pnpm clean
```

## Getting Help

- 💬 **Discussions**: For questions and ideas
- 🐛 **Issues**: For bugs and feature requests
- 📧 **Email**: For security issues

## Code Review Process

1. **Automated checks**: CI must pass
2. **Code review**: At least one approval required
3. **Deployment check**: Verify deployment impact
4. **Merge**: Squash and merge to main
5. **Deploy**: Automatic deployment to production

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
