---
name: devops-circleci
description: >
  CircleCI CI/CD pipeline configuration and optimization.
  Covers: .circleci/config.yml structure, jobs, workflows, executors, steps,
  caching, workspaces, artifacts, orbs (pre-built and custom), performance
  optimization (parallelism, test splitting, resource classes, Docker layer
  caching), Kubernetes integration (Helm, kubectl, kustomize).
  Do NOT use for: GitLab CI, GitHub Actions, Jenkins, or other CI/CD platforms.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, circleci, ci, cd, pipelines, phase-5]
---

# CircleCI CI/CD

## Purpose
Design, implement, and optimize CircleCI CI/CD pipelines for automated build, test, and deployment workflows with parallel execution and caching strategies.

## Agent Protocol

### Trigger
Exact user phrases: "CircleCI", "config.yml", "CircleCI orb", "CircleCI pipeline", "CircleCI workflow", "CircleCI parallelism", "test splitting", "CircleCI cache", "Docker layer caching".

### Input Context
Before activating, verify:
- CircleCI plan (Free, Performance, Scale) and available resource classes.
- Execution environment (Docker, Machine, macOS, Windows).
- Current pipeline bottlenecks (build time, test time, deploy time).
- Target deployment platform (Kubernetes, ECS, serverless).

### Output Artifact
Writes to `.circleci/config.yml`, orb YAML files, and scripts directory.

### Response Format
YAML configuration with CircleCI 2.1+ syntax, ready to commit.

### Completion Criteria
This skill is complete when:
- [ ] Workflow defined with ordered job stages.
- [ ] Caching configured for dependencies and build outputs.
- [ ] Parallelism and test splitting configured for test jobs.
- [ ] Deployment jobs configured for target environment.

### Max Response Length
Direct file write. No response text.

## Quick Start
Define `version: 2.1` → Set up `executors` → Add `commands` → Define `jobs` with caching → Create `workflows` with dependencies → Add `orbs` for integrations → Configure parallelism.

## When to Use This Skill
- Building CI/CD pipelines for GitHub repositories using CircleCI
- Optimizing pipeline speed with parallelism and caching
- Creating reusable orbs for common CI/CD patterns
- Deploying to Kubernetes from CircleCI workflows

## Core Workflow

### Step 1: Basic Pipeline
```yaml
version: 2.1

orbs:
  node: circleci/node@5.2.0
  docker: circleci/docker@2.5.0

jobs:
  build-and-test:
    docker:
      - image: cimg/node:20.12
    steps:
      - checkout
      - node/install-packages
      - run: npm run build
      - run: npm test
      - persist_to_workspace:
          root: .
          paths:
            - dist/

workflows:
  build-deploy:
    jobs:
      - build-and-test
```

### Step 2: Multi-Job Workflow
```yaml
workflows:
  pipeline:
    jobs:
      - build
      - test:
          requires:
            - build
      - security-scan:
          requires:
            - build
      - deploy-staging:
          requires:
            - test
            - security-scan
          filters:
            branches:
              only: main
      - approve-prod:
          type: approval
          requires:
            - deploy-staging
      - deploy-production:
          requires:
            - approve-prod
```

## Rules & Constraints
- Never hardcode secrets — use CircleCI project environment variables.
- Always cache node_modules and dependency directories.
- Use `persist_to_workspace` for sharing data across jobs, not artifacts.
- Set `resource_class` appropriately for job requirements.
- Always pin Docker image versions in executors.

## References
  - references/circleci-advanced.md — Circleci Advanced Topics
  - references/circleci-fundamentals.md — Circleci Fundamentals
  - references/config-structure.md — CircleCI Configuration Structure
  - references/kubernetes-integration.md — CircleCI Kubernetes Integration
  - references/orb-ecosystem.md — CircleCI Orb Ecosystem
  - references/performance-optimization.md — CircleCI Performance Optimization
## Handoff
After completing this skill:
- Next skill: **devops-kubernetes-autoscaling** — autoscaling configurations deployed via CircleCI
- Pass context: Kubeconfig context name, deployment names, Helm chart paths
