# GitHub Actions Workflow Optimization

## Overview
GitHub Actions provides CI/CD automation for GitHub repositories. Optimization covers workflow design, caching, parallel execution, self-hosted runners, matrix builds, and cost reduction strategies.

## Workflow Structure

### Optimized Workflow
```yaml
name: CI Pipeline

on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  pull_request:
    branches: [main]
    paths-ignore:
      - '**.md'

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm run test:ci

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: dist/
```

## Caching Strategies

### Dependency Caching
```yaml
- name: Cache npm dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-

- name: Cache pnpm store
  uses: actions/cache@v3
  with:
    path: |
      ~/.local/share/pnpm/store
      node_modules
    key: pnpm-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      pnpm-${{ runner.os }}-

- name: Cache build output
  uses: actions/cache@v3
  with:
    path: |
      dist
      .next
      .cache
    key: build-${{ github.sha }}
    restore-keys: |
      build-
```

### Docker Layer Caching
```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Cache Docker layers
  uses: actions/cache@v3
  with:
    path: /tmp/.buildx-cache
    key: buildx-${{ runner.os }}-${{ hashFiles('Dockerfile') }}
    restore-keys: |
      buildx-${{ runner.os }}-

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: myapp:latest
    cache-from: type=local,src=/tmp/.buildx-cache
    cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
```

## Parallel Execution

### Job and Step Parallelism
```yaml
jobs:
  # Parallel execution of independent jobs
  unit-test:
    runs-on: ubuntu-latest
  integration-test:
    runs-on: ubuntu-latest
  lint:
    runs-on: ubuntu-latest

  # Parallel matrix execution
  cross-platform:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macOS-latest]
        node: [16, 18, 20]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
```

### Fan-Out / Fan-In
```yaml
jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: |
          echo "matrix={\"module\":${{ format('[{0}]', join(needs.list-modules.outputs.modules, ',')) }}}" >> $GITHUB_OUTPUT

  test:
    needs: prepare
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.prepare.outputs.matrix) }}
    steps:
      - run: npm run test -- --scope=${{ matrix.module }}

  deploy:
    needs: test
    if: success()
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
```

## Conditional Execution

### Path Filtering
```yaml
jobs:
  build:
    # Only run when relevant files change
    if: |
      github.event_name == 'push' &&
      contains(github.event.head_commit.modified, 'src/') ||
      contains(github.event.head_commit.added, 'src/')

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
```

### Step Conditions
```yaml
- name: Deploy to production
  if: |
    github.event_name == 'push' &&
    github.ref == 'refs/heads/main' &&
    !cancelled()
  run: npm run deploy:prod

- name: Notify on failure
  if: failure()
  run: npm run notify:failure

- name: Always cleanup
  if: always()
  run: npm run cleanup
```

## Self-Hosted Runners

### Runner Configuration
```yaml
jobs:
  deploy:
    runs-on: [self-hosted, linux, x64, gpu]
    steps:
      - name: Check runner labels
        run: |
          echo "Running on: ${{ runner.name }}"
          echo "OS: ${{ runner.os }}"
          echo "Labels: ${{ join(runner.labels, ', ') }}"

      - name: Clean workspace
        run: |
          rm -rf ${{ github.workspace }}/*
          df -h
```

## Cost Optimization

### Concurrency Groups
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# Environment-level concurrency
environment: production
concurrency: production-deploy
```

### Resource Sizing
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    # Use smallest runner for simple tasks

  heavy-task:
    runs-on: ubuntu-latest-8-cores  # Larger runner when needed

  matrix-jobs:
    runs-on: ubuntu-latest
    strategy:
      max-parallel: 4  # Limit parallel matrix jobs
      matrix:
        version: [1, 2, 3, 4, 5, 6, 7, 8]
```

## Workflow Reusability

### Reusable Workflow
```yaml
# .github/workflows/test-and-lint.yml
name: Test and Lint

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
      os:
        default: ubuntu-latest
        type: string
    secrets:
      NPM_TOKEN:
        required: true

jobs:
  lint:
    runs-on: ${{ inputs.os }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ${{ inputs.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm test

# Caller workflow
jobs:
  ci:
    uses: ./.github/workflows/test-and-lint.yml
    with:
      node-version: '18'
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Key Points
- Use path filtering to skip unnecessary workflow runs
- Cache dependencies, build artifacts, and Docker layers
- Parallelize independent jobs and use matrix strategies
- Fan-out/fan-in patterns for dynamic parallel execution
- Self-hosted runners for specialized hardware needs
- Concurrency groups prevent redundant parallel runs
- Resource sizing matches runner capacity to job needs
- Reusable workflows reduce duplication across repositories
- Workflow commands (set-output, save-state) enable inter-step communication
- Composite actions encapsulate reusable step sequences
- Environment protection rules gate production deployments
- Artifact and cache retention policies manage storage costs
