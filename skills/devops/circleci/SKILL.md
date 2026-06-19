---
name: circleci
description: >
  Use this skill when the user says 'CircleCI', 'circleci config',
  'orb', 'workflows', 'jobs', 'steps', 'executors', 'Docker executor',
  'machine executor', 'CircleCI runner', 'pipeline', 'context',
  'store_artifacts', 'save_cache', 'restore_cache', 'parallelism',
  'circleci local', 'SSH debug'.
  Covers: CircleCI configuration (config.yml), executors, jobs, workflows,
  caching, orbs, matrix builds, contexts, parallel execution, self-hosted runners,
  pipeline parameters, triggers, artifacts, test splitting, SSH debug.
  Do NOT use for: GitHub Actions, GitLab CI, Jenkins, or other CI systems.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, circleci, ci-cd, phase-5]
---

# CircleCI

## Purpose
Define CI/CD pipelines using CircleCI configuration with workflows, jobs, orbs, caching strategies, and parallel execution for fast, reliable builds.

## Architecture Decision Trees

### Executor Selection
| Executor | Speed | Best For | Limitations |
|---|---|---|---|
| Docker | Fast (<30s start) | Standard builds | Container-only, limited to Docker |
| Machine | Slow (~60s start) | Docker-in-Docker, full VM | More expensive, fewer concurrent jobs |
| macOS | Slow | iOS/macOS builds | Apple-only, limited parallelism |
| Windows | Moderate | .NET, Windows-specific | Limited images, slower startup |
| GPU (Linux) | Fast | ML/DL training | Expensive, limited availability |

### Caching Strategy
| Strategy | Save Key | Restore Keys | Use Case |
|---|---|---|---|
| Lockfile hash | `v1-deps-{{ checksum "package-lock.json" }}` | `v1-deps-` | Node.js, Go, Rust |
| Multiple deps | `v1-deps-{{ arch }}-{{ .Branch }}-{{ checksum "..." }}` | `v1-deps-{{ arch }}-` | Cross-platform, multiple deps |
| Fallback chain | `v1-{{ .Branch }}-{{ .Revision }}` | `v1-{{ .Branch }}-, v1-master-` | Caching across branches |
| No-cache clean | Skip cache | None | Clean builds after dependency changes |

### Test Splitting Methods
| Method | Command | Best For |
|---|---|---|
| Timing-based | `circleci tests split --split-by=timings` | Uneven tests, rebalance over runs |
| Name-based | `circleci tests split --split-by=name` | Equal test distribution |
| File-size | `circleci tests split --split-by=filesize` | Integration tests with different sizes |
| Custom | Manual glob + assignment | Specific test grouping requirements |

### Workflow Triggers
| Trigger Type | When to Use | Configuration |
|---|---|---|
| Push to branch | Default CI | `on: [push]` |
| Pull request | Review validation | `on: [pull_request]` |
| Schedule | Nightly, weekly, monthly | `triggers: - schedule: {cron: "0 2 * * *"}` |
| Manual approval | Production deploy | `type: approval` in workflow |
| Pipeline parameter | Conditional triggers | `parameters: [deploy: {type: boolean}]` |

## Quick Start
config.yml with default Docker executor → checkout → restore_cache → install deps → run tests → save_cache → store_artifacts → workflow with lint-test-deploy stages.

## Core Workflow

### Step 1: Standard Configuration
```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5.1.0
  aws-cli: circleci/aws-cli@3.1.4
  slack: circleci/slack@4.12.5

parameters:
  deploy-prod:
    type: boolean
    default: false

executors:
  node-executor:
    docker:
      - image: cimg/node:22.0
    resource_class: medium
  machine-executor:
    machine:
      image: ubuntu-2204:current
    resource_class: medium

commands:
  setup-dependencies:
    steps:
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Verify dependencies
          command: |
            npm audit --audit-level=high
            npx license-checker --summary
  build-app:
    steps:
      - run: npm run build
      - persist_to_workspace:
          root: .
          paths:
            - dist/
            - node_modules/

jobs:
  lint:
    executor: node-executor
    steps:
      - checkout
      - setup-dependencies
      - run: npm run lint

  test:
    executor: node-executor
    parallelism: 4
    steps:
      - checkout
      - setup-dependencies
      - run:
          name: Run tests with splitting
          command: |
            circleci tests glob "tests/**/*.test.ts" | \
              circleci tests run --command="xargs npx jest --ci --runInBand" \
              --split-by=timings
      - store_test_results:
          path: test-results/
      - store_artifacts:
          path: test-results/
          destination: test-reports

  build:
    executor: machine-executor
    steps:
      - checkout
      - setup-dependencies
      - build-app
      - run:
          name: Build Docker image
          command: |
            docker build -t myapp:$CIRCLE_SHA1 .
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push myapp:$CIRCLE_SHA1
      - store_artifacts:
          path: dist/
          destination: build-output

  deploy-staging:
    executor: machine-executor
    steps:
      - attach_workspace:
          at: .
      - aws-cli/setup:
          aws-access-key-id: AWS_ACCESS_KEY_ID
          aws-secret-access-key: AWS_SECRET_ACCESS_KEY
          region: us-east-1
      - run:
          name: Deploy to staging
          command: |
            aws ecs update-service --cluster staging \
              --service myapp --force-new-deployment

  deploy-production:
    executor: machine-executor
    steps:
      - slack/notify:
          event: pending
          message: "Production deploy starting..."
      - deploy-staging
      - slack/notify:
          event: success
          message: "Production deploy completed successfully"
      - slack/notify:
          event: fail
          message: "Production deploy FAILED"

  security-scan:
    executor: node-executor
    steps:
      - checkout
      - node/install-packages
      - run: npm audit --audit-level=high
      - run:
          name: Snyk security scan
          command: |
            curl -sL https://snyk.io/cli/install | bash
            snyk test --severity-threshold=high

  nightly-e2e:
    machine: true
    steps:
      - checkout
      - run: npm ci
      - run: npm run test:e2e
      - store_artifacts:
          path: cypress/videos/

workflows:
  version: 2

  ci-pipeline:
    unless: << pipeline.parameters.deploy-prod >>
    jobs:
      - lint
      - test:
          requires: [lint]
      - build:
          requires: [test]
      - security-scan:
          requires: [lint]
      - deploy-staging:
          requires: [build, security-scan]
          filters:
            branches:
              only: main
      - hold-production:
          type: approval
          requires: [deploy-staging]
      - deploy-production:
          requires: [hold-production]
          filters:
            branches:
              only: main

  nightly-tests:
    triggers:
      - schedule:
          cron: "0 3 * * *"
          filters:
            branches:
              only: main
    jobs:
      - test
      - nightly-e2e

  production-deploy:
    when: << pipeline.parameters.deploy-prod >>
    jobs:
      - deploy-production
```

### Step 2: Dynamic Configuration with Pipeline Parameters
```yaml
# Trigger with API:
# curl -X POST https://circleci.com/api/v2/project/gh/org/repo/pipeline \
#   -H "Circle-Token: $TOKEN" \
#   -d '{"parameters": {"deploy-prod": true}}'

# In config.yml, use pipeline parameters
parameters:
  deploy-prod:
    type: boolean
    default: false
  service-name:
    type: string
    default: "all"

workflows:
  version: 2
  deploy-service:
    when: << pipeline.parameters.deploy-prod >>
    jobs:
      - deploy:
          name: "deploy-<< pipeline.parameters.service-name >>"
```

### Step 3: Matrix Build for Multi-Version
```yaml
# Matrix jobs
test-matrix:
  parameters:
    node-version:
      type: string
  executor:
    docker:
      - image: cimg/node:<< parameters.node-version >>
  steps:
    - checkout
    - run: npm ci
    - run: npm test

workflows:
  test-all-versions:
    jobs:
      - test-matrix:
          matrix:
            parameters:
              node-version: ["18.0", "20.0", "22.0"]
```

### Step 4: Custom Orbs
```yaml
# .circleci/orbs/my-orb/orb.yml
version: 2.1
description: "Custom deployment orb"

commands:
  deploy:
    parameters:
      environment:
        type: enum
        enum: ["dev", "staging", "prod"]
      cluster:
        type: string
    steps:
      - run:
          name: Deploy to << parameters.environment >>
          command: |
            aws ecs update-service \
              --cluster << parameters.cluster >> \
              --service myapp-<< parameters.environment >> \
              --force-new-deployment
      - run:
          name: Wait for deployment
          command: |
            aws ecs wait services-stable \
              --cluster << parameters.cluster >> \
              --services myapp-<< parameters.environment >>

  canary-deploy:
    parameters:
      percent:
        type: integer
        default: 10
    steps:
      - run:
          command: |
            echo "Deploying to << parameters.percent >>% of traffic"
            # Canary logic here

executors:
  aws-executor:
    docker:
      - image: cimg/python:3.11
    environment:
      AWS_REGION: us-east-1
```

### Step 5: Optimization Configuration
```yaml
# Performance optimization
jobs:
  test:
    docker:
      - image: cimg/node:22.0
    resource_class: medium+  # 4 vCPU, 8GB RAM
    parallelism: 8
    steps:
      - checkout
      # Dependency caching
      - restore_cache:
          keys:
            - v1-deps-{{ checksum "package-lock.json" }}
            - v1-deps-
      - run: npm ci
      - save_cache:
          key: v1-deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules
            - ~/.npm
      # Test with parallelization
      - run: |
          TESTFILES=$(circleci tests glob "tests/**/*.test.ts" | circleci tests split)
          npx jest --ci --maxWorkers=2 $TESTFILES
      - store_test_results:
          path: test-results/
```

## Anti-Patterns

### Anti-Pattern 1: No Resource Class Optimization
Using default `medium` for all jobs. Build and test jobs benefit from `medium+` (faster) or `arm.medium` (cheaper for ARM builds).

### Anti-Pattern 2: Monolithic Config File
Single huge config.yml. Split into reusable orbs, commands, and executors for composability.

### Anti-Pattern 3: Ignoring Test Splitting
Running all tests serially on one container. Use `parallelism: N` with `circleci tests split` for significant time reduction.

### Anti-Pattern 4: No Caching
Reinstalling dependencies every build. Use save_cache/restore_cache with appropriate key patterns.

### Anti-Pattern 5: Hardcoded Secrets
Putting environment variables in config.yml. Use CircleCI contexts and project environment variables.

## Production Considerations
- Use contexts to share environment variables across projects.
- Use SSH debug (`circleci local execute --job test`) for troubleshooting.
- Use custom Docker images (Dockerfile + `cimg/base`) for faster executor startup.
- Set resource class based on job requirements (CPU/memory).
- Monitor credit usage and set budget alerts.
- Configure auto-cancel redundant builds on branch pushes.

## Rules & Constraints
- Use version 2.1 configuration format.
- Cache dependencies with checksum-based keys.
- Use contexts for shared secrets across projects.
- Store test results and artifacts for every run.
- Use SSH debug jobs for troubleshooting — never for production.

## References
  - references/circleci-advanced.md
  - references/circleci-fundamentals.md
  - references/config-structure.md
  - references/kubernetes-integration.md
  - references/orb-ecosystem.md
  - references/performance-optimization.md
  - references/matrix-builds-guide.md

## Handoff
Next: **cicd-pipeline** — general pipeline concepts beyond CircleCI.
