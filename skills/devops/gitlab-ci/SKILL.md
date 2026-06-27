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
- GitLab version (self-managed or SaaS) and CI/CD feature flags.
- Runner configuration: shared, group, or specific runners.
- Build method: Docker-in-Docker, Kaniko, or shell executor.
- Deployment target: Kubernetes, ECS, SSH, or serverless.

### Output Artifact
Writes to .gitlab-ci.yml, template YAML files in ci/ directory, and GitLab CI configuration.

### Response Format
YAML configuration with GitLab CI keywords, ready to commit.

No preamble. No postamble. No explanations.

### Completion Criteria
- Pipeline structure defined with appropriate stages.
- Jobs configured with proper caching, artifacts, and dependencies.
- Security scanning stages (SAST, DAST, dependency check) configured.
- Rules and conditions for branch/tag-based execution.
- Runner configuration matches team requirements.

## Architecture / Decision Trees

### Pipeline Structure Decision Tree
- Small project, single app: Single pipeline with stages (build -> test -> deploy).
- Monorepo with multiple apps: Child/parent pipelines per component.
- Multi-project dependencies: Multi-project pipelines with trigger jobs.
- Compliance requirements: Security scanning stages (SAST, DAST, container scanning).
- Large monorepo: Cached dependencies + parallel jobs + needs DAG.

### Runner Selection

| Runner Type | Use Case | Pros | Cons |
|---|---|---|---|
| Shared (SaaS) | Small projects, quick start | No maintenance, auto-scaled | Limited concurrency, no custom HW |
| Group runner | Team-level standardization | Shared across projects, custom config | Team manages |
| Specific runner | Single project, custom HW | Full control, GPU/dedicated | Per-project maintenance |
| Auto-scaling (Docker Machine) | Variable load | Cost efficient, elastic | Complex setup |
| Auto-scaling (Kubernetes) | K8s-native, containerized | Native K8s, efficient | Requires K8s cluster |

### Build Method Decision Tree
- Docker-in-Docker (DIND): Most common, full Docker access, requires privileged mode.
- Kaniko: Rootless, no privileged mode, K8s-native, recommended for K8s executors.
- Buildah: Daemonless builds, rootless option, good for security.
- Shell executor: Direct host builds, no container isolation, not recommended.

### Security Scanning Integration

| Scan Type | GitLab Template | When to Run | Best For |
|---|---|---|---|
| SAST | Jobs/SAST.gitlab-ci.yml | Every PR | Source code vulnerabilities |
| Secret Detection | Jobs/Secret-Detection.gitlab-ci.yml | Every push | Hardcoded credentials |
| Dependency Scanning | Jobs/Dependency-Scanning.gitlab-ci.yml | Every PR | Known CVEs in deps |
| Container Scanning | Jobs/Container-Scanning.gitlab-ci.yml | After image build | Image vulnerabilities |
| DAST | Jobs/DAST.gitlab-ci.yml | Deploy to review app | Runtime vulnerabilities |
| API Fuzzing | Jobs/API-Fuzzing.gitlab-ci.yml | Deploy to staging | API security testing |
| License Scanning | Jobs/License-Scanning.gitlab-ci.yml | Every PR | License compliance |

## Core Workflow

### Step 1: Basic Pipeline Structure
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
  REGISTRY: $CI_REGISTRY_IMAGE
  TAG: $CI_COMMIT_SHORT_SHA

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

build-app:
  stage: build
  image: node:22-alpine
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run build
  artifacts:
    paths:
      - dist/
      - node_modules/
    expire_in: 1 hour

unit-test:
  stage: test
  image: node:22-alpine
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run test:ci
  artifacts:
    when: always
    reports:
      junit: test-results/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
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
    SEARCH_MAX_DEPTH: 10
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

secret_detection:
  stage: security
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

dependency_scanning:
  stage: security
  variables:
    DS_DEFAULT_ANALYZERS: node
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

### Step 3: Container Build and Push
```yaml
container-build:
  stage: package
  image:
    name: gcr.io/kaniko-project/executor:v1.23.2-debug
    entrypoint: [""]
  script:
    - /kaniko/executor
      --context $CI_PROJECT_DIR
      --dockerfile $CI_PROJECT_DIR/Dockerfile
      --destination $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
      --destination $CI_REGISTRY_IMAGE:$CI_COMMIT_BRANCH
      --cache=true
      --cache-ttl=168h

container-scan:
  stage: security
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --severity CRITICAL,HIGH --format sarif --output trivy.sarif $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  artifacts:
    reports:
      sast: trivy.sarif
  needs: [container-build]
```

### Step 4: Deployment with Rules
```yaml
.deploy-template: &deploy-template
  image: alpine:3.19
  before_script:
    - apk add --no-cache kubectl gettext
    - kubectl config use-context $KUBE_CONTEXT
  script:
    - envsubst < k8s/deployment.yaml | kubectl apply -f -
    - kubectl rollout status deployment/$APP_NAME -n $NAMESPACE --timeout=5m

deploy-staging:
  <<: *deploy-template
  stage: deploy
  variables:
    NAMESPACE: staging
    APP_NAME: myapp-staging
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
      allow_failure: true

deploy-production:
  <<: *deploy-template
  stage: deploy
  variables:
    NAMESPACE: production
    APP_NAME: myapp-prod
  environment:
    name: production
    url: https://example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
      allow_failure: false
```

### Step 5: Child/Parent Pipelines (Monorepo)
```yaml
# Parent .gitlab-ci.yml
stages:
  - triggers

trigger-backend:
  stage: triggers
  trigger:
    include: backend/.gitlab-ci.yml
    strategy: depend
  rules:
    - changes:
        - backend/**/*

trigger-frontend:
  stage: triggers
  trigger:
    include: frontend/.gitlab-ci.yml
    strategy: depend
  rules:
    - changes:
        - frontend/**/*
```

### Step 6: Multi-Project Pipelines
```yaml
trigger-lib:
  stage: triggers
  trigger:
    project: team/lib
    branch: main
    strategy: depend
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

### Step 7: YAML Anchors and Extends
```yaml
.job-template:
  image: node:22-alpine
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  before_script:
    - npm ci

lint:
  extends: .job-template
  stage: test
  script:
    - npm run lint

test:
  extends: .job-template
  stage: test
  script:
    - npm run test:ci
  coverage: '/Coverage: \d+\.\d+%/'
```

### Step 8: Review Apps
```yaml
review-deploy:
  stage: deploy
  image: alpine:3.19
  script:
    - apk add --no-cache kubectl
    - kubectl create namespace review-$CI_MERGE_REQUEST_IID || true
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA -n review-$CI_MERGE_REQUEST_IID || true
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    url: https://review-$CI_MERGE_REQUEST_IID.example.com
    on_stop: review-cleanup
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

review-cleanup:
  stage: deploy
  script:
    - kubectl delete namespace review-$CI_MERGE_REQUEST_IID || true
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    action: stop
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual
```

## Anti-Patterns

### Anti-Pattern 1: Hardcoded Secrets
Writing secrets in .gitlab-ci.yml exposes them in pipeline logs and to anyone with repo access. Use CI/CD variables with masked and protected flags.

### Anti-Pattern 2: No Caching
Without caching, every pipeline reinstalls all dependencies. Cache node_modules, .m2, vendor/bundle. Use key based on lock file hash.

### Anti-Pattern 3: Using only/except
The only/except keywords are deprecated and less flexible. Use rules for all conditional logic. Rules support if, changes, exists, and variables.

### Anti-Pattern 4: No Artifact Expiration
Artifacts without expire_in accumulate indefinitely, filling storage quotas. Set expire_in on all artifacts (1 hour for temporary, 30 days for reports).

### Anti-Pattern 5: Auto-Deploy to Production
Automatically deploying to production without manual approval risks deploying broken code. Always use when: manual for production deployments.

### Anti-Pattern 6: Overusing DIND
Docker-in-Docker requires privileged mode, which bypasses security controls. Use Kaniko for container builds on K8s runners. Reserve DIND for when Docker socket is required.

### Anti-Pattern 7: Too Many Stages
Having too many stages slows pipeline execution (each stage completes before next starts). Combine independent jobs into the same stage using needs for DAG execution.

## Production Considerations

### Pipeline Performance
- Use needs for DAG execution to parallelize independent jobs.
- Cache aggressively: node_modules, .m2, pip cache, go module cache.
- Use Kaniko instead of DIND for faster, more secure builds.
- Set CI_TIMEOUT to prevent runaway jobs (default 60 min).
- Use parallel for multi-configuration testing.

### Security
- Mask and protect all CI/CD variables.
- Enable pipeline security scanning (SAST, Secret Detection, Dependency).
- Use protected branches for main/master.
- Restrict runner access to specific projects.
- Use Kaniko over DIND for container builds.
- Disable debug logging in production pipelines.

### Monitoring
- Set up pipeline email notifications for failures.
- Use merge request widgets for pipeline status.
- Monitor runner utilization and job queue depth.
- Track pipeline duration and failure rate trends.
- Set up pipeline SLAs (e.g., CI under 10 minutes).

## Rules
- Never hardcode secrets -- use CI/CD variables with masking.
- Always cache dependencies for performance.
- Use needs to parallelize independent jobs.
- Every job must have explicit stage and meaningful name.
- Use rules over only/except (deprecated).
- Set artifact expire_in to prevent storage bloat.
- Never run production deployments automatically.
- Use Kaniko over DIND for container builds on K8s.
- Enable security scanning for all production pipelines.
- Use child/parent pipelines for monorepo components.
- Use YAML anchors and extends to reduce duplication.
- Set CI_TIMEOUT on long-running jobs.
- Enable merge request pipelines for pre-merge validation.
- Use protected variables for production secrets.

## Compared With

### GitLab CI vs GitHub Actions
GitLab CI: single app for code + CI, auto DevOps, built-in registry, self-managed option. GitHub Actions: marketplace ecosystem, simpler YAML, tighter GitHub integration. GitLab CI excels at security scanning and Kubernetes deployment.

### GitLab CI vs Jenkins
GitLab CI: cloud-native, simpler configuration, integrated with GitLab. Jenkins: extensive plugin ecosystem, any VCS, mature. GitLab CI is better for GitLab-centric teams; Jenkins for complex multi-VCS organizations.

### DIND vs Kaniko
DIND: requires privileged mode, full Docker daemon, faster for multi-stage builds. Kaniko: rootless, no privileged mode, K8s-native, safer. Use Kaniko on K8s runners, DIND on Docker executors.

## Operations & Maintenance

### Runner Management
- Tag runners for specific workloads (docker, k8s, windows, gpu).
- Set concurrent job limits per runner.
- Monitor runner disk space and Docker image cache.
- Update runner version monthly.
- Configure runner scaling policies for auto-scaling setups.

### Pipeline Maintenance
- Review pipeline duration trends weekly.
- Audit CI/CD variable usage.
- Update base images and runner versions.
- Clean up old artifacts and job logs.
- Test pipeline changes in fork first.

## References
- references/advanced-patterns.md -- GitLab CI Advanced Patterns
- references/container-integration.md -- GitLab CI Container Integration
- references/gitlab-ci-advanced.md -- Gitlab Ci Advanced Topics
- references/gitlab-ci-fundamentals.md -- Gitlab Ci Fundamentals
- references/gitlab-runners.md -- GitLab Runners
- references/pipeline-structure.md -- GitLab CI Pipeline Structure
- references/security-scanning.md -- GitLab CI Security Scanning

## Handoff
After completing this skill:
- Next skill: devops-circleci -- CircleCI CI/CD pipeline configuration
- Pass context: Build image, test commands, artifact patterns, deployment environment names

## Architecture Decision Trees

### GitLab CI vs GitLab CI + External CI

| Decision | GitLab CI Only | Hybrid (Jenkins/Argo) |
|---|---|---|
| Simplicity | Single platform | Multiple platforms to manage |
| Pipeline as Code | Full `.gitlab-ci.yml` | Split across tools |
| Features | Built-in registry, SAST, DAST | Specialized tool capabilities |
| Migration | Easier (all in GitLab) | Harder (multi-tool) |
| Cost | Same license | Additional licenses |
| Best for | GitLab-native orgs | Existing CI investments |

### Docker vs Shell Executor

| Aspect | Docker Executor | Shell Executor |
|---|---|---|
| Isolation | Full container isolation | Same host environment |
| Reproducibility | High (same image everywhere) | Low (depends on host state) |
| Performance | Slight overhead | Native speed |
| Cache | Volume mounts | Direct filesystem access |
| Use case | Standard CI/CD | Performance-critical or hardware access |

## Implementation Patterns

### YAML: Multi-project Pipeline with Downstream Triggers

```yaml
stages:
  - build
  - test
  - package
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

build-app:
  stage: build
  image: node:22
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

unit-test:
  stage: test
  image: node:22
  script:
    - npm ci
    - npm run test:unit
    - npm run test:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

deploy-staging:
  stage: deploy
  image: alpine/k8s:1.28
  script:
    - kubectl set image deployment/app app=${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHORT_SHA}
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - main

trigger-downstream:
  stage: deploy
  trigger:
    project: myorg/e2e-tests
    branch: main
    strategy: depend
  only:
    - tags
```

### Bash: GitLab CI Pipeline Status Check

```bash
#!/usr/bin/env bash
wait_for_pipeline() {
  local project_id=$1
  local pipeline_id=$2
  local token=$3

  while true; do
    status=$(curl -sf --header "PRIVATE-TOKEN: $token" \
      "https://gitlab.com/api/v4/projects/${project_id}/pipelines/${pipeline_id}" \
      | jq -r '.status')

    echo "Pipeline status: $status"

    case "$status" in
      success) return 0 ;;
      failed|canceled) return 1 ;;
      *) sleep 10 ;;
    esac
  done
}
```

## Production Considerations

- Use **GitLab-managed Terraform state** for infrastructure provisioning within CI pipelines
- Set **deployment freeze periods** in GitLab to prevent deployments during blackout windows
- Enable **merge trains** for main branch — ensures only passing combinations merge
- Configure **auto-stop** on review environments to prevent resource leak from stale MRs
- Use **seeds** (CI_JOB_TOKEN) for authenticating API calls to GitLab from within jobs
- Set **pipeline efficiency** badges on the repo to track and improve cycle time
- Implement **child pipelines** with dynamic generation for monorepo microservice builds

## Anti-Patterns

- Using **`before_script`** for long setup that should be in the image — bloats every job
- Ignoring **artifact expiration** — artifacts accumulate and fill up GitLab storage
- Putting **secrets in `.gitlab-ci.yml`** — always use CI/CD Settings → Variables
- Using **`only/except`** instead of `rules` — rules are more flexible and easier to debug
- Running **all jobs in the same stage** — wastes parallelization opportunity
- Forgetting to set **`needs`** dependencies — jobs wait unnecessarily for sibling completion
- Passing **large artifacts** between stages — increases pipeline time and storage costs

## Performance Optimization

- Use **Docker layer caching** with `DOCKER_BUILDKIT=1` and inline cache in GitLab runners
- Configure **distributed caching** for runner caches on S3-compatible storage (minio)
- Split **test suites** with `parallel:matrix` to run across multiple runner instances
- Enable **`GIT_STRATEGY: fetch`** instead of clone — saves time for large repositories
- Use **`GIT_DEPTH: 50`** to shallow-clone only the needed commit history
- Set up **pre-clone scripts** on self-hosted runners to pre-warm large repositories
- Use **Kaniko** instead of Docker-in-Docker for building images without privileged mode

## Security Considerations

- Enable **SAST, DAST, and Secret Detection** in every pipeline via GitLab Ultimate templates
- Use **CI_JOB_TOKEN** scope restrictions to limit which projects downstream pipelines can access
- Rotate **group access tokens** every 30 days and use lower-privilege project tokens where possible
- Sign **container images** with cosign and verify signatures during deployment stages
- Enable **pipeline execution policies** to enforce security scanning before production deploy
- Restrict **runner registration tokens** and only allow specific runners for protected branches
- Implement **dependency scanning** (Gemnasium) for all language ecosystems in the project
