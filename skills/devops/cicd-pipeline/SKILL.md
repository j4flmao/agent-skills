---
name: cicd-pipeline
description: >
  Use this skill when the user says 'CI/CD', 'GitHub Actions', 'GitLab CI',
  'pipeline', 'deployment pipeline', 'automated testing pipeline', 'workflow yaml',
  'build pipeline', 'deploy workflow', 'continuous integration', 'continuous delivery'.
  Covers: pipeline stages (lint → test → build → security scan → deploy), caching,
  parallel execution, deployment strategies (blue/green, canary, rolling),
  security scanning, secret management, rollback.
  Do NOT use for: Dockerfile optimization, Kubernetes, local dev setup.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cicd, pipeline, phase-5]
---

# CI/CD Pipeline

## Purpose
Design and implement CI/CD pipelines with proper stages, dependency caching, parallel execution, security scanning, deployment strategies, and rollback procedures.

## Architecture Decision Trees

### CI/CD Platform Comparison
| Feature | GitHub Actions | GitLab CI | Jenkins | CircleCI |
|---|---|---|---|---|
| Hosted runners | Linux, macOS, Windows | Linux, macOS, Windows | N/A (self-hosted) | Linux, macOS, Windows |
| Self-hosted runners | Yes | Yes | Native | Yes |
| Reusable configs | Composite actions + reusable workflows | Include templates + CI components | Shared libraries | Orbs |
| Container support | Native (service containers) | Native (services) | Docker plugin | Native |
| Secret management | GitHub Secrets | CI/CD Variables | Credentials plugin | Project env vars |
| Parallelism | Matrix strategy | Parallel keyword | Parallel stages | Parallelism × resource class |
| Cache | actions/cache | cache: keyword | Plugin | Store/cache |
| Artifacts | Built-in | Built-in | Built-in | Built-in |
| Pricing | Free: 2000 min/mo | Free: 400 min/mo | Free | Free: 6000 min/mo |
| Best for | Open source, GitHub-native | Monorepo, GitLab-native | Complex enterprise | Performance-focused |

### Pipeline Stage Decisions
| Stage | When to Include | Estimated Time | Fail Fast |
|---|---|---|---|
| Lint | Always (fast feedback) | <2 min | Yes (fail early) |
| Unit tests | Always | <10 min | Yes |
| Build | Always | 1-30 min | Yes |
| Integration tests | Code changes affect DB/external | 5-30 min | After build |
| Security scan | Production branches | 2-15 min | Yes (high vulns) |
| Docker build | Containerized apps | 2-10 min | Yes |
| Deploy staging | PR to main/develop | 1-10 min | No (non-blocking) |
| E2E tests | Before production deployment | 10-30 min | On staging |
| Deploy production | Main branch merge | 1-15 min | With approval gate |
| Smoke tests | Every production deploy | 2-5 min | Yes (rollback) |

### Caching Strategy by Dependency Manager
| Manager | Cache Key | Cache Path | Restore Behavior |
|---|---|---|---|
| npm | `npm-cache-${{ hashFiles('package-lock.json') }}` | `~/.npm` | Restore + install |
| pip | `pip-cache-${{ hashFiles('requirements.txt') }}` | `~/.cache/pip` | Restore only |
| Go | `go-mod-cache-${{ hashFiles('go.sum') }}` | `~/go/pkg/mod` | Restore + download |
| Cargo | `cargo-cache-${{ hashFiles('Cargo.lock') }}` | `~/.cargo/registry` | Restore + build |
| Maven | `maven-cache-${{ hashFiles('pom.xml') }}` | `~/.m2/repository` | Restore + install |
| Gradle | `gradle-cache-${{ hashFiles('*.gradle*') }}` | `~/.gradle/caches` | Restore + build |
| Yarn | `yarn-cache-${{ hashFiles('yarn.lock') }}` | `~/.cache/yarn` | Restore + install |

### Deployment Strategy Comparison
| Strategy | Downtime | Risk | Rollback Speed | Complexity | Traffic Shift |
|---|---|---|---|---|---|
| Recreate | Yes (full) | High | N/A | Low | Instant |
| Rolling | None | Medium | Medium | Low | Gradual (batch) |
| Blue/Green | None | Low | Instant | Medium | DNS/LB switch |
| Canary | None | Very Low | Fast | High | %-based routing |
| A/B Testing | None | Very Low | Fast | High | User segment-based |

### Security Scanning Integration
| Scan Type | Tools | Stage | Speed |
|---|---|---|---|
| SAST (Static Analysis) | SonarQube, Semgrep, CodeQL, Snyk Code | After checkout | 5-15 min |
| DAST (Dynamic) | OWASP ZAP, Burp Suite | After deploy to staging | 10-30 min |
| Dependency scan | OWASP DC, Snyk, Trivy, npm audit | After install | 2-5 min |
| Container scan | Trivy, Clair, Snyk Container, Grype | After docker build | 2-10 min |
| IaC scan | Checkov, tfsec, KICS, Terrascan | After infrastructure code | 1-3 min |
| Secret scan | Gitleaks, TruffleHog, GitGuardian | On every commit | 1-3 min |

## Quick Start
Pipeline stages: lint → test → build → security scan → deploy staging → deploy prod. Cache dependencies with content-hash keys. Use environment secrets. Implement blue-green or canary for prod.

## Core Workflow

### Step 1: Standard Pipeline — GitHub Actions
```yaml
name: CI/CD Pipeline
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  NODE_VERSION: "22"

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_PASSWORD: testpass }
        options: >-
          --health-cmd pg_isready --health-interval 10s
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ matrix.node-version }}", cache: 'npm' }
      - run: npm ci
      - run: npm run test
      - run: npm run test:integration
        env: { DATABASE_URL: postgres://postgres:testpass@localhost:5432/postgres }

  security:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.build.outputs.image-tag }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }},
          password: ${{ secrets.GITHUB_TOKEN }} }
      - id: build
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy-staging:
    needs: [build, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: echo "Deploying to staging..."
      - run: echo "Tag: ${{ needs.build.outputs.image-tag }}"

  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    concurrency: production-deploy
    steps:
      - uses: actions/checkout@v4
      - run: |
          echo "Deploying to production (canary 10% → 50% → 100%)"
          echo "Health check: https://app.example.com/health"
```

### Step 2: GitLab CI Pipeline
```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - build
  - security
  - deploy

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  NODE_VERSION: "22"

lint:
  stage: lint
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run lint

test:
  stage: test
  image: node:${NODE_VERSION}
  services:
    - postgres:16-alpine
  variables:
    DATABASE_URL: postgres://postgres:testpass@postgres:5432/postgres
  script:
    - npm ci
    - npm run test
    - npm run test:integration

security:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy fs --severity CRITICAL,HIGH --exit-code 1 .

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $DOCKER_IMAGE .
    - docker push $DOCKER_IMAGE

.deploy:
  stage: deploy
  image: alpine
  script:
    - echo "Deploying $DOCKER_IMAGE to $CI_ENVIRONMENT_NAME"

deploy-staging:
  extends: .deploy
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  extends: .deploy
  environment:
    name: production
    url: https://app.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  when: manual
  needs: [deploy-staging]
```

### Step 3: Canary Deployment with Kubernetes
```yaml
# kubernetes/canary-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-stable
  labels: { app: myapp, track: stable }
spec:
  replicas: 9
  selector:
    matchLabels: { app: myapp, track: stable }
  template:
    metadata:
      labels: { app: myapp, track: stable }
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
          ports: [{ containerPort: 8080 }]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
  labels: { app: myapp, track: canary }
spec:
  replicas: 1
  selector:
    matchLabels: { app: myapp, track: canary }
  template:
    metadata:
      labels: { app: myapp, track: canary }
    spec:
      containers:
        - name: app
          image: myapp:1.1.0
          ports: [{ containerPort: 8080 }]
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector: { app: myapp }
  ports: [{ port: 80, targetPort: 8080 }]
```

### Step 4: Pipeline Optimization — Matrix Build
```yaml
# parallel matrix build
test:
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false
    matrix:
      os: [ubuntu-latest, macos-latest]
      node: [18, 20, 22]
      experimental: [false]
      include:
        - os: ubuntu-latest
          node: 23
          experimental: true
    max-parallel: 6
  continue-on-error: ${{ matrix.experimental }}
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: "${{ matrix.node }}" }
    - run: npm ci && npm test
```

### Step 5: Rollback Strategy
```yaml
# rollback/rollback.sh
#!/bin/bash
set -euo pipefail

ENVIRONMENT="${1:-production}"
IMAGE_TAG="${2:-rollback-target}"

echo "=== Initiating rollback for $ENVIRONMENT to $IMAGE_TAG ==="

# 1. Stop further deployment
echo "Locking deployment pipeline..."
export DEPLOY_LOCK=true

# 2. Rollback application
echo "Redeploying previous version..."
kubectl set image deployment/myapp \
  app=myapp:"$IMAGE_TAG" \
  -n "$ENVIRONMENT"

# 3. Rollback database (if needed)
echo "Verifying database schema..."
# Run migration rollback if schema changed
# ./rollback-db.sh

# 4. Verify health
echo "Running health checks..."
for i in {1..30}; do
  HEALTH=$(curl -sf -o /dev/null -w "%{http_code}" "https://$ENVIRONMENT.example.com/health")
  if [ "$HEALTH" = "200" ]; then
    echo "Health check passed"
    break
  fi
  echo "Waiting for health... attempt $i"
  sleep 10
done

# 5. Notify team
echo "Rollback to $IMAGE_TAG completed"
```

## Anti-Patterns

### Anti-Pattern 1: Monolithic Pipeline
Single giant job with all steps sequentially. Split into parallel stages that can fail independently.

### Anti-Pattern 2: No Cache
Not caching dependencies, rebuilding from scratch every time. Add dependency caching to reduce pipeline time by 50-80%.

### Anti-Pattern 3: Hardcoded Secrets
Storing API keys, passwords in YAML files. Use CI/CD secrets/environment variables with access control.

### Anti-Pattern 4: Deploy Without Approval
Automatic production deployment without approval gates. Add manual approval for production deployments.

### Anti-Pattern 5: Ignoring Rollback
No rollback plan documented. Every deployment must have a tested rollback procedure.

### Anti-Pattern 6: Slow Feedback
Pipeline runs for 30+ min before failing at end. Fail fast: lint first, then build, then test.

## Production Considerations

### Security
- Scan dependencies for vulnerabilities in every build.
- Scan container images before registry push.
- Scan IaC templates for misconfigurations.
- Use OIDC/Workload Identity instead of static credentials.
- Audit pipeline access and changes regularly.
- Sign build artifacts and images (cosign).

### Performance
- Use matrix builds to run tests in parallel.
- Cache dependencies and Docker layers.
- Use buildx with cache-from for faster Docker builds.
- Run integration tests with service containers.
- Use deployment environments for targeted rollouts.

### Governance
- Require PR approval before pipeline trigger.
- Enforce branch protection rules.
- Audit pipeline changes via code review.
- Use pipeline templates/shared configs across teams.
- Define deployment freeze windows.

## Rules & Constraints
- Pipeline must fail fast — lint before test, test before build.
- Secrets injected at runtime — never in YAML or repository.
- Cache dependencies with content-hash keys.
- Production deployment requires all prior stages + manual approval.
- Every deployment must be repeatable and auditable (version tags).
- Rollback plan must exist before deployment.

## References
  - references/caching-strategies.md
  - references/cicd-pipeline-advanced.md
  - references/cicd-pipeline-fundamentals.md
  - references/deployment-strategies.md
  - references/github-actions-guide.md
  - references/matrix-strategies.md
  - references/multi-environment.md
  - references/pipeline-optimization.md
  - references/pipeline-security.md
  - references/canary-deployment-guide.md

## Handoff
Next: **kubernetes-patterns** — K8s deployment for pipeline output.

## Implementation Patterns

### YAML: Multi-stage CI Pipeline with Conditional Deploy

```yaml
stages:
  - lint
  - test
  - build
  - deploy

lint-job:
  stage: lint
  script:
    - npm ci
    - npm run lint
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - node_modules/

test-job:
  stage: test
  script:
    - npm run test:unit
    - npm run test:integration
  artifacts:
    reports:
      junit: junit.xml

build-job:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main
    - tags

deploy-staging:
  stage: deploy
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  environment: staging
  only:
    - main
```

### Bash: Pipeline Promotion Gate

```bash
#!/usr/bin/env bash
set -euo pipefail

promote_to_prod() {
  local tag=$1
  local env=$2

  echo "Promoting $tag to $env"

  # Run smoke tests against staging
  if ! curl -sf "https://staging.example.com/health" | grep -q "ok"; then
    echo "Staging health check failed — aborting promotion"
    exit 1
  fi

  # Deploy to production
  kubectl set image deployment/app \
    "app=${CI_REGISTRY_IMAGE}:${tag}" \
    --namespace production

  # Monitor rollout
  kubectl rollout status deployment/app \
    --namespace production --timeout=5m
}

promote_to_prod "$@"
```

## Production Considerations

- Implement **change management** so every production deploy requires an approved MR/ticket
- Use **feature flags** to decouple deploy from release — enables instant rollback
- Store all pipeline artifacts in a **central artifact repository** with retention policies
- Configure **pipeline notifications** to Slack/PagerDuty on failure with run links
- Enforce **branch protection** rules: no direct pushes to main, require PR approvals
- Set up **pipeline concurrency limits** to prevent resource exhaustion on runners
- Use **signed commits** and verify signatures in the pipeline to ensure supply chain integrity

## Anti-Patterns

- Single **monolithic pipeline** for everything — split by service for parallel execution
- Hardcoding **secrets** in pipeline YAML — always use CI/CD secret vaults or external secrets
- Ignoring **pipeline failures** on non-critical jobs — fail the pipeline by default, opt-in for soft failures
- Running **all stages sequentially** when they could run in parallel — increases feedback time
- Deploying directly to **production without staging** validation — always promote through environments
- Using **`latest` tag** for Docker images — always pin to semantic version or commit SHA
- Neglecting **pipeline cleanup** — stale artifacts, caches, and workspaces waste storage

## Performance Optimization

- Use **pipeline caching** for dependencies (npm, pip, Maven) to avoid re-downloading
- Enable **parallel job execution** for independent stages (lint, test, security scan)
- Split **test suites** into shards and run them concurrently to reduce wall-clock time
- Use **self-hosted runners** with warm caches instead of ephemeral cloud runners
- Optimize **Docker layer caching** — order RUN commands from least to most frequently changing
- Implement **conditional stage skipping** — skip build if only docs changed
- Use **build matrix** for multi-version testing instead of sequential jobs

## Security Considerations

- Scan all container images with **Trivy or Snyk** before pushing to registry — fail on critical CVEs
- Enable **SBOM generation** in every pipeline and upload to a central store
- Sign all pipeline artifacts with **Sigstore/cosign** and verify before deployment
- Rotate CI/CD tokens and service account credentials every 30 days
- Scan **infrastructure-as-code** (Terraform, Helm) for misconfigurations using Checkov
- Restrict **pipeline trigger** permissions to trusted actors only
- Audit **pipeline logs** centrally and alert on suspicious activity (exfiltrated env vars)
