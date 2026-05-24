# GitLab CI Pipeline Structure

## Overview

The `.gitlab-ci.yml` file defines pipeline structure using YAML syntax. Each pipeline consists of stages, jobs, and optional sub-components like parallel execution, dependencies, artifacts, and caching.

## Basic Structure

```yaml
# Top-level keywords
stages:          # Ordered list of stages
default:         # Default values for all jobs
variables:       # Global environment variables
include:         # External YAML includes
cache:           # Global cache configuration
workflow:        # Pipeline-level rules
```

### Stages
Stages run in order. Jobs in the same stage run in parallel.

```yaml
stages:
  - .pre            # Always runs first (built-in)
  - build
  - test
  - security
  - package
  - deploy
  - .post           # Always runs last (built-in)
```

### Jobs
```yaml
# Minimal job
build-app:
  stage: build
  script:
    - npm ci
    - npm run build

# Job with full configuration
build-app:
  stage: build
  image: node:20-alpine
  variables:
    NODE_ENV: production
  script:
    - echo "Building $CI_COMMIT_BRANCH"
    - npm ci --cache .npm
    - npm run build
  cache:
    key: ${CI_COMMIT_REF_SLUG}-npm
    paths:
      - .npm/
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
  tags:
    - docker
  retry: 2
  timeout: 30m
```

## Script Execution

### Multi-line Scripts
```yaml
build-app:
  script:
    - |
      echo "Building application"
      npm ci
      npm run build
      npm run test:unit
    - echo "Build complete"
```

### Before/After Script
```yaml
default:
  before_script:
    - echo "Starting job on $CI_COMMIT_BRANCH"
    - source environment.sh

  after_script:
    - echo "Job finished with exit code $?"
    - cleanup_temp_files

build-app:
  script:
    - npm run build
```

## Dependency Management

### `needs` — Parallel Dependencies
```yaml
# Jobs run in parallel if no needs specified
build-app:
  stage: build
  script: npm run build
  artifacts:
    paths: [dist/]

test-unit:
  stage: test
  needs: ["build-app"]  # Starts as soon as build-app finishes
  script: npm run test:unit

test-integration:
  stage: test
  needs: ["build-app"]
  script: npm run test:int

# Multiple dependencies with parallel execution
deploy:
  stage: deploy
  needs: ["test-unit", "test-integration", "security-scan"]
  script: deploy.sh
```

### `dependencies` — Artifact Control
```yaml
deploy:
  stage: deploy
  dependencies:           # Only download artifacts from these jobs
    - build-app
    - package
  script: deploy.sh
```

## Artifacts

### Types of Artifacts
```yaml
# Job artifacts
build-app:
  artifacts:
    paths:
      - dist/
      - build/
    exclude:              # Exclude certain files
      - dist/**/*.map
    expire_in: 1 week    # Clean up after period
    when: on_success     # on_success, on_failure, always
    name: "$CI_JOB_NAME-$CI_COMMIT_REF_SLUG"

# Report artifacts (special types)
test:
  artifacts:
    reports:
      junit: reports/unit-test.xml
      coverage_report:
        coverage_format: cobertura
        path: reports/coverage.xml
      terraform:
        - reports/tfplan.json

# Pipeline artifacts (across stages)
pages:
  stage: deploy
  artifacts:
    paths:
      - public/
  script: npm run build:docs
```

## Caching

### Global Cache
```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/
  policy: pull-push  # pull-push (default), pull (read-only)
```

### Per-Job Cache
```yaml
build-app:
  cache:
    key: ${CI_COMMIT_REF_SLUG}-build
    paths:
      - node_modules/
      - .npm/
    policy: pull-push

test:
  cache:
    key: ${CI_COMMIT_REF_SLUG}-build
    paths:
      - node_modules/
    policy: pull  # Only download, don't upload
```

### Cache Key Strategies
```yaml
# Branch-specific cache
cache:
  key: ${CI_COMMIT_REF_SLUG}

# Global cache fallback
cache:
  key:
    files:
      - package-lock.json
    prefix: ${CI_JOB_NAME}

# Fallback to global cache if branch cache missing
cache:
  key: ${CI_COMMIT_REF_SLUG}
  fallback_keys:
    - main
```

## Parallel Execution

### Parallel Jobs
```yaml
# Run 5 parallel instances
test:
  parallel: 5
  script:
    - npm run test -- --split $CI_NODE_INDEX/$CI_NODE_TOTAL
```

### Matrix Jobs
```yaml
# Multi-dimensional parallelization
build:
  parallel:
    matrix:
      - PLATFORM: [linux/amd64, linux/arm64]
        NODE_VERSION: ["18", "20"]
  script:
    - docker build --platform $PLATFORM --build-arg NODE_VERSION=$NODE_VERSION -t app .
```

## Variables

### Predefined Variables
```yaml
build-app:
  script:
    - echo "Pipeline ID: $CI_PIPELINE_ID"
    - echo "Branch: $CI_COMMIT_BRANCH"
    - echo "Commit SHA: $CI_COMMIT_SHORT_SHA"
    - echo "Job Token: $CI_JOB_TOKEN"          # Auth to GitLab API
    - echo "Registry: $CI_REGISTRY"
    - echo "User: $GITLAB_USER_LOGIN"
```

### Custom Variables
```yaml
variables:
  DOCKER_BUILDKIT: "1"
  COMPOSE_DOCKER_CLI_BUILD: "1"
  NODE_OPTIONS: "--max-old-space-size=4096"
  TERRAFORM_VERSION: "1.7.0"

deploy:
  variables:
    DEPLOY_ENV: staging    # Job-level override
```

## Environment Configuration

```yaml
deploy-staging:
  environment:
    name: staging
    url: https://staging.example.com
    on_stop: stop-staging  # Action to stop environment
    auto_stop_in: 2 hours  # Auto-stop for review apps
  script:
    - deploy staging

stop-staging:
  stage: deploy
  script:
    - teardown staging
  environment:
    name: staging
    action: stop
  rules:
    - if: $CI_MERGE_REQUEST_ID
      when: manual
```

## Interruptible Jobs

```yaml
# Auto-cancel outdated pipelines on same branch
test:
  interruptible: true
  script:
    - npm test

workflow:
  auto_cancel:
    on_new_commit: interruptible
```

## Resource Groups

```yaml
# Mutual exclusion for deployments
deploy:
  resource_group: production
  script: deploy.sh
```

## Job Types

### Trigger Job
```yaml
trigger-downstream:
  stage: deploy
  trigger:
    project: myorg/downstream-project
    branch: main
    strategy: depend  # Wait for downstream pipeline
```

### Manual Job
```yaml
approve-prod:
  stage: deploy
  script:
    - echo "Approved by $GITLAB_USER_LOGIN"
  when: manual
  allow_failure: false
  only:
    - main
```

### Delayed Job
```yaml
wait-for-canary:
  stage: deploy
  script:
    - echo "Waiting for canary observation period..."
  when: delayed
  start_in: 30 minutes
```

## Best Practices

1. **Use `default:`** to avoid repeating `before_script`, `image`, `tags`, etc.
2. **Prefer `needs`** over `dependencies` for parallel execution.
3. **Set artifact `expire_in`** to `1 hour` or `1 day` for intermediate builds.
4. **Use `key:files`** for cache that invalidates on dependency changes.
5. **Pin Docker image versions** (e.g., `node:20-alpine` not `node:latest`).
6. **Use `rules`** for conditional execution instead of deprecated `only`/`except`.
7. **Keep jobs focused** — one job should do one thing.
8. **Use GitLab CI local** to validate YAML syntax before pushing.
