# CircleCI Fundamentals

## Overview
CircleCI is a cloud-native CI/CD platform that automates build, test, and deployment pipelines. It supports parallel job execution, caching, Docker, and integrates with GitHub, GitLab, and Bitbucket.

## Core Concepts

### Pipeline Structure
Workflows: define job execution order (sequential, parallel, fan-out/in). Jobs: units of work running in isolated environments. Steps: individual commands within a job. Executors: runtime environment (Docker, machine, macOS, Windows). Orbs: reusable configuration packages.

### Configuration
CircleCI configuration lives in .circleci/config.yml. The config defines version, executors, jobs, workflows, and orbs. Configuration can be organized with YAML anchors and aliases for reuse.

### Resource Classes
Define CPU and memory allocation for jobs. Default is medium (2 vCPU, 4GB RAM). Options: small, medium, medium+, large, xlarge, 2xlarge. Larger classes cost more credits. Use appropriate size for job requirements.

## Key Features

### Caching
Save and restore dependencies between runs. Key based on lock file hash for cache invalidation. Save dependencies after install, restore before. Fallback to partial cache if exact key not found.

### Orbs
Orbs are reusable configuration packages. Auth orb: Docker Hub, ECR, GCR. Language orbs: node, python, go. Deployment orbs: aws-eks, gcp-gke, heroku. Orbs are versioned and published on CircleCI Orb Registry.

### Parallelism
Run tests in parallel across multiple containers. Automatic test splitting by timing, name, or size. Test splitting reduces pipeline duration linearly with parallelism.

## Basic Configuration

### Node.js Pipeline
```yaml
version: 2.1
orbs:
  node: circleci/node@5.0.0

jobs:
  build-and-test:
    executor:
      name: node/default
      tag: "22"
    steps:
      - checkout
      - node/install-packages:
          cache-version: v1
      - run: npm run lint
      - run: npm test
      - run: npm run build

workflows:
  ci:
    jobs:
      - build-and-test
```

## Best Practices
- Use orbs for common configuration patterns.
- Cache dependencies with lock-file-based keys.
- Split tests across parallel containers for speed.
- Use workspace for passing artifacts between jobs.
- Set resource class based on job requirements.
- Store test results and artifacts for debugging.

## References
- circleci-advanced.md -- Advanced CircleCI topics
- workflow-design.md -- Workflow Design
- caching-strategies.md -- Caching Strategies
- orb-development.md -- Orb Development
