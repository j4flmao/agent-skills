# GitLab CI Advanced Patterns

## Overview

Advanced GitLab CI/CD patterns for complex workflows including child/parent pipelines, multi-project pipelines, dynamic configuration, YAML anchors, templates, and includes.

## Include Types

### Local Includes
```yaml
# ci/build.yml
build-app:
  script: npm run build

# .gitlab-ci.yml
include:
  - local: ci/build.yml
  - local: ci/test.yml
  - local: ci/deploy.yml
```

### Project Includes
```yaml
include:
  - project: myorg/ci-templates
    file: templates/node.yml
    ref: v1.2.0  # Pin to a tag/branch
```

### Remote Includes
```yaml
include:
  - remote: https://gitlab.com/myorg/ci-templates/-/raw/main/templates/deploy.yml
```

### Template Includes
```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
  - template: Jobs/Secret-Detection.gitlab-ci.yml
  - template: Jobs/Code-Quality.gitlab-ci.yml
  - template: Jobs/Build.gitlab-ci.yml
```

## YAML Anchors and Extends

### Anchors (Reusable Blocks)
```yaml
# Define anchors
.job_template: &job_definition
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl jq
  tags:
    - docker
    - linux

# Use anchors
build-app:
  <<: *job_definition
  script:
    - ./build.sh

test-app:
  <<: *job_definition
  script:
    - ./test.sh
```

### Extends (Recommended)
```yaml
# Base job definitions
.job-defaults:
  image: node:20-alpine
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  before_script:
    - npm ci
  tags:
    - docker

.deploy-defaults:
  extends: .job-defaults
  stage: deploy
  image: alpine:3.19
  before_script:
    - apk add --no-cache kubectl
  environment:
    name: $DEPLOY_ENV

# Specific jobs
build-app:
  extends: .job-defaults
  stage: build
  script:
    - npm run build
  artifacts:
    paths: [dist/]

deploy-staging:
  extends: .deploy-defaults
  variables:
    DEPLOY_ENV: staging
  script:
    - kubectl apply -f k8s/staging/
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  extends: .deploy-defaults
  variables:
    DEPLOY_ENV: production
  script:
    - kubectl apply -f k8s/production/
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
      allow_failure: false
```

## Rules

### Basic Rules
```yaml
deploy:
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: always
    - if: $CI_COMMIT_BRANCH =~ /^feature/
      when: manual
    - when: never  # Default: don't run
```

### Complex Rules
```yaml
deploy:
  rules:
    # Run on main branch when merge request is not set
    - if: $CI_COMMIT_BRANCH == "main" && $CI_PIPELINE_SOURCE == "push"
      variables:
        DEPLOY_ENV: staging
    # Run on tags
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+/
      variables:
        DEPLOY_ENV: production
    # Run on merge request
    - if: $CI_MERGE_REQUEST_ID
      when: manual
      allow_failure: true
    # Don't run on schedule
    - if: $CI_PIPELINE_SOURCE == "schedule"
      when: never
    # Default
    - when: manual
```

### Changes Rules
```yaml
# Only run when specific files change
test-backend:
  rules:
    - changes:
        - backend/**/*
        - Gemfile*
      when: always
    - when: never

test-frontend:
  rules:
    - changes:
        - frontend/**/*
        - package.json
        - yarn.lock
      when: always
    - when: never

# Workflow-level changes rule
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - "*.md"
      when: never
    - when: always
```

## Child/Parent Pipelines (Multi-Project)

### Parent Pipeline
```yaml
# .gitlab-ci.yml (monorepo parent)
stages:
  - triggers

trigger-backend:
  stage: triggers
  trigger:
    include: backend/.gitlab-ci.yml
    strategy: depend  # Wait for child pipeline
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

trigger-infra:
  stage: triggers
  trigger:
    include: infra/.gitlab-ci.yml
    strategy: depend
  rules:
    - changes:
        - infra/**/*
```

### Child Pipeline Variable Passing
```yaml
# Parent passes variables to child
trigger-deploy:
  stage: triggers
  trigger:
    include: deploy/.gitlab-ci.yml
    strategy: depend
  variables:
    DEPLOY_ENV: staging
    APP_VERSION: $CI_COMMIT_TAG
    REGISTRY_URL: $CI_REGISTRY
```

### Dynamic Child Pipeline
```yaml
# Generate child pipeline config dynamically
generate-config:
  stage: build
  script:
    - |
      cat > generated-config.yml << 'EOF'
      stages:
        - test
      test-job:
        stage: test
        script:
          - echo "Running test for $CI_JOB_NAME"
      EOF
  artifacts:
    paths:
      - generated-config.yml

trigger-dynamic:
  stage: triggers
  trigger:
    include:
      - artifact: generated-config.yml
        job: generate-config
    strategy: depend
```

## Multi-Project Pipelines

### Trigger Downstream Project
```yaml
# .gitlab-ci.yml
stages:
  - build
  - trigger-deploy

build:
  stage: build
  script: ./build.sh

trigger-deploy-pipeline:
  stage: trigger-deploy
  trigger:
    project: myorg/deployment-project
    branch: main
    strategy: depend
  variables:
    VERSION: $CI_COMMIT_TAG
    ENVIRONMENT: production
```

### Bridge Job with Custom Strategy
```yaml
notify-downstream:
  stage: deploy
  trigger:
    project: myorg/notifications
    branch: main
    strategy: depend    # Wait for child to finish (default)
    # strategy: include  # Include downstream pipeline status

# Multiple downstream triggers
deploy-all:
  stage: deploy
  needs: ["build"]
  trigger:
    - project: myorg/k8s-deploy
      branch: main
    - project: myorg/db-migration
      branch: main
    - project: myorg/cdn-purge
      branch: main
```

## Dynamic Configuration

### CI/CD Template Generation
```yaml
generate-jobs:
  stage: build
  script:
    - |
      # Generate jobs for each microservice
      for service in api worker scheduler; do
        cat >> generated.yml << EOF
      build:\${service}:
        stage: build
        script:
          - cd services/\${service}
          - npm ci
          - npm run build
        artifacts:
          paths:
            - services/\${service}/dist/

      test:\${service}:
        stage: test
        needs: ["build:\${service}"]
        script:
          - cd services/\${service}
          - npm test
      EOF
      done
  artifacts:
    paths: [generated.yml]

trigger-generated:
  stage: triggers
  trigger:
    include:
      - artifact: generated.yml
        job: generate-jobs
```

## Workflow Rules

### Conditional Pipeline Execution
```yaml
workflow:
  name: "Pipeline for $CI_COMMIT_BRANCH"
  rules:
    # Don't run for documentation-only changes
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - "*.md"
        - docs/**/*
      when: never
    # Don't run for tags created by CI
    - if: $CI_COMMIT_TAG =~ /^ci-/
      when: never
    # Run for all other cases
    - when: always
```

### Merge Request Pipelines
```yaml
workflow:
  rules:
    # Run merge request pipelines
    - if: $CI_MERGE_REQUEST_ID
      variables:
        PIPELINE_TYPE: merge_request
    # Run branch pipelines
    - if: $CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS
      when: never  # Skip duplicate branch pipelines
    - if: $CI_COMMIT_BRANCH
      variables:
        PIPELINE_TYPE: branch
```

## Conditional Stages

```yaml
stages:
  - build
  - test
  - review
  - deploy

.review_template: &review
  stage: review
  script:
    - deploy review
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    on_stop: stop_review
    auto_stop_in: 1 week
  rules:
    - if: $CI_MERGE_REQUEST_ID
      when: manual

review-app:
  <<: *review

stop-review:
  stage: deploy
  script:
    - teardown review
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  rules:
    - if: $CI_MERGE_REQUEST_ID
      when: manual
```

## Best Practices

1. **Use `extends` over anchors** — better readability and debugging.
2. **Pin `include` refs to tags** for external includes, not branches.
3. **Use `strategy: depend`** for child pipelines to ensure ordering.
4. **Changes rules** reduce pipeline run time for monorepos.
5. **Dynamic configuration** is powerful but complex — use sparingly.
6. **Test includes locally** with `gitlab-ci-local` tool before pushing.
7. **Keep template depth shallow** — no more than 2 levels of extends.
