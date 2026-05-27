# Pipeline Optimization

## Purpose

Pipeline optimization reduces CI/CD execution time, improves reliability, and minimizes infrastructure costs. Key techniques include caching strategies, parallel execution, matrix builds, conditional stages, and build artifact management. Every optimization must be measured — reduce pipeline time by at least 10% before considering it successful.

## Caching Strategies

### Dependency Cache

Cache dependencies between pipeline runs to avoid re-downloading packages.

```yaml
# GitHub Actions — npm cache
- name: Cache npm dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-

# GitHub Actions — pip cache
- name: Cache pip dependencies
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      pip-

# GitHub Actions — Go module cache
- name: Cache Go modules
  uses: actions/cache@v4
  with:
    path: |
      ~/go/pkg/mod
      ~/.cache/go-build
    key: go-${{ hashFiles('go.sum') }}
    restore-keys: |
      go-
```

### Cache Key Design

```
Primary key:   cache-<type>-<hash(lockfile)>
               Exact match → cache hit (fastest)
Restore keys:  cache-<type>-
               Partial match → cache hit (may have stale deps)
               Used when lockfile changes slightly
```

### Docker Layer Cache

```yaml
# GitHub Actions — Docker layer caching with buildx
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Cache Docker layers
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: docker-${{ hashFiles('Dockerfile', 'package-lock.json') }}
    restore-keys: |
      docker-

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    cache-from: type=local,src=/tmp/.buildx-cache
    cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max

  # Move cache to avoid unbounded growth
- name: Move cache
  run: |
    rm -rf /tmp/.buildx-cache
    mv /tmp/.buildx-cache-new /tmp/.buildx-cache
```

### Monorepo Cache

For monorepos, cache per-project or use tools like Turborepo/Nx that provide distributed caching.

```yaml
# Turborepo — remote caching
- name: Cache Turborepo
  uses: actions/cache@v4
  with:
    path: |
      .turbo
      node_modules/.cache/turbo
    key: turbo-${{ github.ref_name }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      turbo-${{ github.ref_name }}-
      turbo-

# In turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    }
  }
}
```

## Parallel Job Execution

### Job Dependencies

```yaml
name: CI
on: [push, pull_request]

jobs:
  # Independent jobs run in parallel
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run typecheck

  # Dependent jobs wait for prerequisites
  test:
    needs: [lint, typecheck]  # Waits for both to pass
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test

  build:
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

  deploy:
    needs: [build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying..."
```

### Test Sharding

Split tests across multiple parallel runners to reduce wall clock time.

```yaml
# GitHub Actions — matrix-based test sharding
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 4 parallel shards
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run tests (shard ${{ matrix.shard }})
        run: npx vitest run --shard=${{ matrix.shard }}/4

# Playwright sharding
- name: Run Playwright tests
  run: npx playwright test --shard=${{ matrix.shard }}/4
```

### Parallel vs Sequential Trade-offs

```yaml
scenarios:
  small-project:
    total-test-time: "2 minutes"
    overhead-of-parallel: "1 minute (job startup + deps)"
    recommendation: "Sequential (single job, no matrix)"

  medium-project:
    total-test-time: "10 minutes"
    overhead-of-parallel: "2 minutes"
    recommendation: "Matrix with 3-4 shards"

  large-project:
    total-test-time: "45 minutes"
    overhead-of-parallel: "3 minutes"
    recommendation: "Matrix with 8-12 shards + parallel integration tests"
```

## Matrix Builds

### Language Version Matrix

Test across multiple versions of the runtime.

```yaml
jobs:
  test:
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
        # Exclude known incompatible combinations
        exclude:
          - node: 18
            os: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

### Environment Variable Matrix

```yaml
jobs:
  integration:
    strategy:
      matrix:
        db: [postgres:16, postgres:15, mysql:8]
        cache: [redis:7, redis:6]
    services:
      postgres:
        image: ${{ matrix.db }}
        env:
          POSTGRES_PASSWORD: testpass
      redis:
        image: ${{ matrix.cache }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:testpass@localhost:5432/test
          REDIS_URL: redis://localhost:6379
```

## Pipeline Time Reduction

### Identify Bottlenecks

```yaml
# GitHub Actions timing log
Timings:
  Total: 12m 30s
  Setup: 45s (6%)
  Install deps: 4m 30s (36%)     ← bottleneck
  Lint: 30s (4%)
  Typecheck: 1m 30s (12%)
  Test: 3m 15s (26%)
  Build: 2m (16%)
```

### Optimization Techniques

#### Faster Dependency Installation

```yaml
# Use npm ci with lockfile-only cache
- name: Install dependencies
  run: |
    npm ci --prefer-offline --no-audit --no-fund
  # --prefer-offline: use cache, avoid network
  # --no-audit: skip vulnerability audit
  # --no-fund: skip funding message

# Use pnpm for faster installs
- name: Install with pnpm
  run: |
    corepack enable
    pnpm install --frozen-lockfile
```

#### Conditional Stage Execution

```yaml
# Skip lint if only markdown files changed
jobs:
  lint:
    if: |
      !contains(github.event.head_commit.message, 'skip ci') &&
      !startsWith(github.event.head_commit.message, 'docs:')
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

# Only run deployment checks on main branch
  security-scan:
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm audit
```

#### Path Filtering

```yaml
# Only run tests for changed projects in monorepo
on:
  pull_request:
    paths:
      - 'packages/**'
      - '!packages/docs/**'  # Skip docs changes
      - '!*.md'

# Or use separate workflows per project
jobs:
  api-tests:
    if: contains(github.event.pull_request.files.*.path, 'packages/api/')
    steps:
      - run: npm run test:api

  web-tests:
    if: contains(github.event.pull_request.files.*.path, 'packages/web/')
    steps:
      - run: npm run test:web
```

## Build Artifacts

### Artifact Types

```yaml
# Upload build artifacts for later stages
jobs:
  build:
    steps:
      - run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7  # Auto-delete after 7 days

  deploy:
    needs: [build, security-scan]
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist

      - name: Deploy to production
        run: ./deploy.sh
```

### Artifact Retention

```yaml
# Repository-level retention settings
# Settings > Actions > Artifact and log retention
retention:
  pull-request-artifacts: "1 day"
  main-branch-artifacts: "30 days"
  release-artifacts: "90 days"
  logs: "90 days"
```

### Docker Image Artifacts

```yaml
jobs:
  build:
    steps:
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Conditional Stages

### Environment-Specific Deployments

```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - run: ./deploy-staging.sh

  deploy-production:
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - run: ./deploy-production.sh
```

### Approval Gates

```yaml
# Environment with required reviewers
environments:
  production:
    type: environment
    deployment_branch: main
    required_reviewers:
      - team-leads
    wait_timer: 300  # 5 minute delay before deployment
    prevent_self_review: true

# In workflow
deploy-production:
  environment: production
  steps:
    - run: ./deploy.sh
```

## CI/CD Cost Optimization

### Self-Hosted Runners

```yaml
# Use self-hosted runners for heavy workloads
runs-on: [self-hosted, linux, x64, gpu]

# Tag runners for specific jobs
jobs:
  e2e-tests:
    runs-on: [self-hosted, docker]
    steps:
      - run: npx playwright test
```

### Reduce Runner Time

```yaml
# Combine small steps into one to reduce job overhead
- name: Lint and typecheck
  run: |
    npm run lint
    npm run typecheck
  # Single step avoids additional job startup cost
```

### Action Usage Analytics

```yaml
# Monitor action usage in organization settings
# Settings > Billing > Actions
metrics:
  total-minutes: "15,000 / month"
  cost: "$75 / month"
  top-actions:
    - "actions/checkout": "2,500 minutes"
    - "actions/setup-node": "1,800 minutes"
    - "actions/cache": "1,200 minutes"
  optimization-target:
    reduce: "20%"
    estimated-savings: "$15 / month"
```

## Key Points

- Cache dependencies with content-hash keys to maximize hit rate.
- Use Docker layer caching to avoid rebuilding layers on every push.
- Run independent jobs (lint, typecheck) in parallel.
- Shard tests across multiple runners to reduce wall clock time.
- Use matrix builds for cross-version and cross-platform testing.
- Skip unnecessary stages with path filtering and conditional execution.
- Upload build artifacts for subsequent stages (security scan, deploy).
- Use environment-specific deployments with approval gates for production.
- Monitor CI/CD costs and optimize runner time for frequently used actions.
- Measure pipeline time before and after optimizations — aim for 10%+ improvement.
