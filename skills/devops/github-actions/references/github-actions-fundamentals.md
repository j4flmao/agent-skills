# GitHub Actions Fundamentals

## Overview
GitHub Actions is a CI/CD platform integrated into GitHub. It automates software workflows: building, testing, and deploying code directly from GitHub repositories.

## Core Concepts

### Workflows
Workflows are automated processes defined in YAML files in .github/workflows/. Each workflow is triggered by events (push, pull_request, schedule, workflow_dispatch). Workflows consist of jobs that run in parallel or sequentially.

### Jobs and Steps
Jobs are units of work running on a runner. Jobs can depend on other jobs via needs. Steps are individual commands or actions within a job. Steps run sequentially in a job. Steps share environment variables and filesystem.

### Actions
Actions are reusable units of code. Types: Docker container actions (any language), JavaScript actions (fast, runs on runner), Composite actions (combine multiple steps). Actions can be from GitHub Marketplace, public repos, or local.

### Runners
GitHub-hosted runners: Ubuntu, Windows, macOS maintained by GitHub. Self-hosted runners: your own infrastructure, more control, no per-minute cost. Runners can be tagged for specific capabilities (GPU, custom hardware).

### Events and Triggers
push: code push to branch. pull_request: PR opened, synchronized, reopened. workflow_dispatch: manual trigger. schedule: cron-based trigger. release: release published. workflow_call: reusable workflow invocation.

### Expressions and Contexts
${{ }} syntax for dynamic values. Contexts: github (event, repo, actor), env, secrets, matrix, steps, runner. Functions: contains(), startsWith(), endsWith(), format(), join(), hashFiles().

## Key Components

### Matrix Strategy
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
```

### Caching
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles("package-lock.json") }}
```

### Environment Protection
```yaml
environment:
  name: production
  url: https://example.com
```

## Best Practices
- Pin action versions to SHA or major tag, never @main.
- Use secrets for sensitive data, never hardcode.
- Cache dependencies for faster builds.
- Use matrix builds for multi-version testing.
- Use if: failure() and if: always() for artifact uploads.
- Use reusable workflows for shared pipeline logic.
- Set environment protection rules for production deployments.
- Use concurrency to cancel redundant runs.

## References
- github-actions-advanced.md -- Advanced GitHub Actions topics
- reusable-workflows.md -- Reusable Workflows
- composite-actions.md -- Composite Actions
- workflow-optimization.md -- Workflow Optimization
- best-practices.md -- Best Practices
