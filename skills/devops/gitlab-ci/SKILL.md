---
name: devops-gitlab-ci
description: >
  GitLab CI/CD pipeline configuration and management.
  Covers: .gitlab-ci.yml structure, stages, jobs, parallel, needs, artifacts, cache,
  child/parent pipelines, multi-project pipelines, rules, YAML anchors, templates,
  includes, Container Registry, Kaniko, security scanning (SAST, DAST, dependency),
  runner management, autoscaling.
  Do NOT use for: GitHub Actions, CircleCI, Jenkins, or other CI/CD platforms.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, gitlab, ci, cd, pipelines, phase-5]
---

# GitLab CI/CD

## Purpose
Design, implement, and optimize GitLab CI/CD pipelines for automated build, test, security scanning, and deployment workflows.

## Agent Protocol

### Trigger
Exact user phrases: "GitLab CI", ".gitlab-ci.yml", "GitLab pipeline", "GitLab runner", "GitLab CI/CD", "CI pipeline", "GitLab security scanning", "SAST", "DAST", "child pipeline", "multi-project pipeline".

### Input Context
Before activating, verify:
- GitLab version (self-managed or SaaS) and CI/CD feature flags.
- Runner configuration: shared, group, or specific runners.
- Build method: Docker-in-Docker, Kaniko, or shell executor.
- Deployment target: Kubernetes, ECS, SSH, or serverless.

### Output Artifact
Writes to `.gitlab-ci.yml`, template YAML files in `ci/` directory, and GitLab CI configuration.

### Response Format
YAML configuration with GitLab CI keywords, ready to commit.

### Completion Criteria
This skill is complete when:
- [ ] Pipeline structure defined with appropriate stages.
- [ ] Jobs configured with proper caching, artifacts, and dependencies.
- [ ] Security scanning stages (SAST, DAST, dependency check) configured.
- [ ] Rules and conditions for branch/tag-based execution.
- [ ] Runner configuration matches team requirements.

### Max Response Length
Direct file write. No response text.

## Quick Start
Define `stages` → Add build job with Docker image → Configure `test` stage with caching → Add `sast` stage → Define `deploy` stage with `rules` → Use `include` for template reuse → Add child pipelines for microservices.

## When to Use This Skill
- Building CI pipelines for GitLab-hosted repositories
- Multi-stage build, test, security scanning, and deployment
- Monorepo with child pipelines for each component
- Compliance-driven security scanning requirements
- Optimizing pipeline speed with caching and parallelism

## Core Workflow

### Step 1: Pipeline Structure
```yaml
stages:
  - build
  - test
  - security
  - package
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""
  DEPLOY_ENV: $CI_COMMIT_BRANCH

build-app:
  stage: build
  image: node:20-alpine
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
```

### Step 2: Security Scanning
```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml
  - template: Jobs/Secret-Detection.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml

sast:
  stage: security
  variables:
    SAST_EXCLUDED_PATHS: node_modules, tests, vendor
```

### Step 3: Deployment with Rules
```yaml
deploy-staging:
  stage: deploy
  image: alpine:3.19
  script:
    - apk add --no-cache kubectl
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual

deploy-production:
  stage: deploy
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  environment:
    name: production
    url: https://example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
      allow_failure: false
```

## Rules & Constraints
- Never hardcode secrets — use CI/CD variables with masking.
- Always cache `node_modules`, `.m2`, `vendor/bundle` for performance.
- Use `needs` to parallelize independent jobs, not `dependencies`.
- Every job must have an explicit `stage` and meaningful `name`.
- Use `rules` over `only`/`except` (deprecated).
- Set artifact `expire_in` to prevent storage bloat.
- Never run production deployments automatically — require manual approval.

## References
- `references/pipeline-structure.md` — Stages, jobs, needs, artifacts, cache
- `references/advanced-patterns.md` — Child pipelines, multi-project, rules, anchors
- `references/container-integration.md` — Container Registry, Kaniko, scanning
- `references/security-scanning.md` — SAST, DAST, secret detection, dependency
- `references/gitlab-runners.md` — Runner types, autoscaling, cache

## Handoff
After completing this skill:
- Next skill: **devops-circleci** — CircleCI CI/CD pipeline configuration
- Pass context: Build image, test commands, artifact patterns, deployment environment names
