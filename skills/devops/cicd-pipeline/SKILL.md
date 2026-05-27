---
name: cicd-pipeline
description: >
  Use this skill when the user says 'CI/CD', 'GitHub Actions', 'GitLab CI',
  'pipeline', 'deployment pipeline', 'automated testing pipeline', 'workflow yaml',
  'build pipeline', 'deploy workflow', or when setting up continuous integration
  and deployment. Covers: pipeline stages (lint → test → build → security scan →
  deploy), branch protection, secret management, dependency caching, deployment
  strategies (blue/green, canary, rolling), and rollback strategy. Primarily
  GitHub Actions with general concepts applicable to any CI system.
  Do NOT use this for: Dockerfile optimization, Kubernetes, or local dev setup.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cicd, phase-5]
---

# CI/CD Pipeline

## Purpose
Design and implement CI/CD pipelines with proper stages, caching, security checks, and deployment strategies.

## Agent Protocol

### Trigger
Exact user phrases: "CI/CD", "GitHub Actions", "GitLab CI", "pipeline", "deployment pipeline", "automated testing pipeline", "workflow yaml", "build pipeline", "deploy workflow".

### Input Context
Before activating, verify:
- The CI platform is known (GitHub Actions, GitLab CI, etc.).
- The stack and build tooling is known (for caching and test setup).
- The deployment target and strategy are clear.
- The required stages are defined.

### Output Artifact
Writes to `.github/workflows/ci.yml` or equivalent CI config file.

### Response Format
GitHub Actions YAML workflow with stages, caching, and deployment.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of CI/CD concepts.

### Completion Criteria
This skill is complete when:
- [ ] Pipeline stages are defined: lint -> test -> build -> security scan -> deploy.
- [ ] Dependency caching is configured with content-hash keys.
- [ ] Secrets reference environment variables (not hardcoded).
- [ ] Deployment strategy is specified.
- [ ] Rollback plan is documented.

### Max Response Length
Direct file write. No response text.

## Quick Start
Pipeline stages: lint → test → build → security scan → deploy staging → deploy prod. Use environment secrets for credentials. Cache dependencies between runs.

## When to Use This Skill
- Setting up CI/CD for a new project
- Reviewing pipeline efficiency
- Adding deployment automation
- Implementing security scanning

## Core Workflow

### Step 1: Standard Pipeline Stages
```
[Lint] → [Test] → [Build] → [Security Scan] → [Deploy Staging] → [Deploy Prod]
                                                                       ↓
                                                             [Smoke Test] → Rollback if fails
```

### Step 2: GitHub Actions Template
```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:testpass@localhost:5432/postgres

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

  security:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high

  deploy:
    needs: [build, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy
        run: |
          echo "Deploying..."
          # Your deployment script
```

### Step 3: Secret Management
- Store secrets in GitHub Secrets / GitLab CI variables — never in code
- Use environment-level secrets for per-environment configuration
- Rotate credentials regularly
- For Docker: use `docker login` with secrets, never hardcoded tokens

### Step 4: Caching Strategy
| Dependency Manager | Cache Key | Path |
|-------------------|-----------|------|
| npm | `npm-cache-${{ hashFiles('package-lock.json') }}` | `~/.npm` |
| Go | `go-mod-cache-${{ hashFiles('go.sum') }}` | `~/go/pkg/mod` |
| Cargo | `cargo-cache-${{ hashFiles('Cargo.lock') }}` | `~/.cargo/registry` |
| Python (pip) | `pip-cache-${{ hashFiles('requirements.txt') }}` | `~/.cache/pip` |

### Step 5: Deployment Strategies
| Strategy | Downtime | Risk | Rollback Speed |
|----------|----------|------|----------------|
| Rolling | None | Medium | Medium |
| Blue/Green | None | Low | Instant (DNS switch) |
| Canary | None | Very Low | Fast |
| Recreate | Yes | High | N/A (old version gone) |

### Step 6: Rollback Strategy
```
1. Detect failure → automated health check fails
2. Initiate rollback → redeploy previous version
3. Verify rollback → health checks pass on previous version
4. Notify team → postmortem initiated
```

## Rules & Constraints
- Pipeline must fail fast — fail at lint before waiting for tests
- Secrets are injected at runtime — never in the YAML or repository
- Cache dependencies with content-hash keys — invalidate when deps change
- Production deployment requires all previous stages to pass
- Every deployment must be repeatable and auditable (version tags)
- Rollback plan must exist before deployment — no "deploy and hope"

## Output Format
GitHub Actions YAML workflow with stages, caching, and deployment.

## References
  - references/caching-strategies.md — CI/CD Caching Strategies
  - references/cicd-pipeline-advanced.md — Cicd Pipeline Advanced Topics
  - references/cicd-pipeline-fundamentals.md — Cicd Pipeline Fundamentals
  - references/deployment-strategies.md — Deployment Strategies
  - references/github-actions-guide.md — GitHub Actions Patterns
  - references/matrix-strategies.md — Matrix Build Strategies
  - references/multi-environment.md — Multi-Environment Pipelines
  - references/pipeline-optimization.md — Pipeline Optimization
  - references/pipeline-security.md — CI/CD Pipeline Security
## Handoff
After completing this skill:
- Next skill: **kubernetes-patterns** — if deploying to K8s
- Pass context: pipeline stages, deployment strategy, secret management
