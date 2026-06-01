# GitLab CI Fundamentals

## Overview
GitLab CI/CD is a built-in continuous integration and delivery platform within GitLab. It automates building, testing, and deploying code with pipelines defined in .gitlab-ci.yml.

## Core Concepts

### Pipelines
Pipelines are the top-level CI/CD structure. They are triggered by code pushes, merge requests, schedules, or manual actions. Pipelines consist of stages that run sequentially. Each stage contains jobs that run in parallel.

### Stages and Jobs
Stages define the pipeline phase order: build, test, deploy. Jobs define individual work units within a stage. Jobs run in parallel within the same stage. Use needs for DAG-style execution (run jobs out of stage order).

### Runners
Runners execute CI/CD jobs. Shared runners: GitLab SaaS managed, auto-scaling. Group runners: shared across group projects. Specific runners: dedicated to a single project. Runners can be Docker, Kubernetes, Shell, or SSH executors.

### Cache and Artifacts
Cache: share dependencies across pipeline runs. Key based on lock file hash. Artifacts: pass build outputs between jobs within same pipeline. Upload at end of job, available to downstream jobs. Set expire_in to prevent storage bloat.

### Rules
Rules replace the deprecated only/except syntax. Rules support: if (condition), changes (file paths), exists (file existence), when (always, never, manual, delayed). Multiple rules evaluated in order, first match wins.

## Key Components

### .gitlab-ci.yml Structure
```yaml
stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "22"

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

build-app:
  stage: build
  image: node:22-alpine
  script:
    - npm ci
    - npm run build
```

### Rules Examples
```yaml
deploy-prod:
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
      allow_failure: false
```

## Best Practices
- Use rules instead of only/except (deprecated).
- Cache dependencies with lock-file-based keys.
- Set artifact expire_in on all artifacts.
- Use needs for parallel job execution.
- Never hardcode secrets -- use CI/CD variables with masking.
- Use YAML anchors and extends to reduce duplication.
- Enable merge request pipelines for pre-merge validation.
- Use protected variables for production secrets.

## References
- gitlab-ci-advanced.md -- Advanced GitLab CI topics
- pipeline-structure.md -- Pipeline Structure
- gitlab-runners.md -- GitLab Runners
- security-scanning.md -- Security Scanning
- advanced-patterns.md -- Advanced Patterns
