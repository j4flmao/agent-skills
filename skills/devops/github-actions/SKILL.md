---
name: github-actions
description: >
  Use this skill when the user says 'GitHub Actions', 'CI/CD', 'workflow',
  'reusable workflow', 'composite action', 'matrix build', 'actions/checkout',
  'GITHUB_TOKEN', 'self-hosted runner', or when setting up CI/CD pipelines on
  GitHub. Covers: workflow files, reusable workflows, composite actions, matrix
  strategies, expressions, environments, artifacts, caching, OIDC. Do NOT use
  this for: Jenkins pipelines, GitLab CI, CircleCI, or non-GitHub CI systems.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, ci-cd, github-actions, phase-5]
---

# GitHub Actions

## Purpose
Define CI/CD pipelines using GitHub Actions workflows, reusable workflows, and composite actions.

## Agent Protocol

### Trigger
Exact user phrases: "GitHub Actions", "CI/CD", "workflow", "reusable workflow", "composite action", "matrix build", "actions/checkout", "GITHUB_TOKEN", "self-hosted runner".

### Input Context
- Language/framework (for setup action selection).
- Test/build toolchain (for step configuration).
- Deployment target (for deploy job design).
- Whether reusable workflows or composite actions are needed.

### Output Artifact
Writes to .github/workflows/*.yml, action.yml, and/or .github/actions/*/action.yml.

### Response Format
YAML workflow file with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- Workflow file(s) exist in .github/workflows/.
- Matrix strategy configured for multi-version or multi-OS testing.
- Caching configured for dependencies and build output.
- Artifacts uploaded for build outputs.
- Secrets referenced via secrets.X -- never hardcoded.

## Architecture / Decision Trees

### Workflow Structure Decision Tree

| Complexity | Approach | Best For |
|---|---|---|
| Simple, single job | Single workflow file | Small projects, one build |
| Multi-job with dependencies | Stages with needs | Medium projects, build-test-deploy |
| Shared across repos | Reusable workflows | Org-wide CI standardization |
| Custom step logic | Composite actions | Encapsulated multi-step setup |
| Complex matrix | Strategy matrix + include/exclude | Multi-version, multi-OS testing |
| Monorepo | Path filters + matrix | Multi-package monorepo |

### Runner Selection

| Runner Type | Maintenance | Network | Security | Cost |
|---|---|---|---|---|
| GitHub-hosted | None | Public internet | Ephemeral, isolated | Included in plan |
| Self-hosted (Linux) | Team manages | Corporate network | Persistent, needs hardening | Free (no GH billing) |
| Self-hosted (Windows) | Team manages | Corporate network | Persistent, needs hardening | Free (no GH billing) |
| Auto-scaling self-hosted | Complex setup | Corporate network | Ephemeral options | Free + infra cost |
| Larger runners | None | Public internet | Ephemeral | Pay per minute |

### Trigger Event Decision Tree

| Trigger | Typical Use | Notes |
|---|---|---|
| push (branches) | CI on merge to main | Build + test + deploy |
| pull_request | CI on PR | Build + test only |
| workflow_dispatch | Manual trigger | Deploy, maintenance, custom |
| schedule (cron) | Nightly builds | Security scan, dependency update |
| release | Package publishing | Create release artifacts |
| workflow_call | Reusable workflow | Called by other workflows |
| repository_dispatch | External trigger | Webhook from external systems |

## Core Workflow

### Step 1: Basic CI Workflow
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "22"

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"
      - run: npm ci
      - run: npm test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results-${{ matrix.os }}-${{ matrix.node-version }}
          path: test-results/

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
```

### Step 2: Reusable Workflow
```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow
on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
        description: "Node.js version to use"
      build-command:
        required: false
        type: string
        default: "npm run build"
        description: "Build command"
    secrets:
      NPM_TOKEN:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          registry-url: "https://npm.pkg.github.com"
      - run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - run: ${{ inputs.build-command }}
      - run: npm test
```

```yaml
# Calling workflow
name: CI
on: [pull_request]

jobs:
  test-node-20:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: "20"
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  test-node-22:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: "22"
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Step 3: Composite Action
```yaml
# .github/actions/setup-project/action.yml
name: "Setup Project"
description: "Checkout, install deps, cache, and build"
inputs:
  node-version:
    description: "Node.js version"
    required: false
    default: "22"
  install-command:
    description: "Dependency install command"
    required: false
    default: "npm ci"
  build-command:
    description: "Build command"
    required: false
    default: "npm run build"

runs:
  using: "composite"
  steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: "npm"

    - name: Install dependencies
      run: ${{ inputs.install-command }}
      shell: bash

    - name: Build project
      run: ${{ inputs.build-command }}
      shell: bash

    - name: Cache build output
      uses: actions/cache@v4
      with:
        path: dist/
        key: build-${{ github.sha }}
```

```yaml
# Using the composite action
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup-project
        with:
          node-version: "22"
          build-command: "npm run build:prod"
```

### Step 4: Matrix Strategies
```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
        exclude:
          - os: macos-latest
            node: 18
        include:
          - os: ubuntu-latest
            node: 22
            experimental: true
    runs-on: ${{ matrix.os }}
    continue-on-error: ${{ matrix.experimental || false }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

### Step 5: Environments and Deployments
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: ./deploy-staging.sh

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-role
          aws-region: us-east-1
      - run: npm ci
      - run: npm run build
      - run: ./deploy-prod.sh
```

### Step 6: Caching and Optimization
```yaml
jobs:
  build:
    steps:
      - uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            node_modules
          key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            npm-${{ runner.os }}-

      - uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: pip-${{ runner.os }}-${{ hashFiles('requirements.txt') }}
          restore-keys: |
            pip-${{ runner.os }}-
```

### Step 7: Conditional Execution
```yaml
steps:
  - name: Conditional step on event
    if: github.event_name == 'pull_request' && github.event.pull_request.draft == false
    run: npm test

  - name: Skip if docs only
    if: contains(github.event.head_commit.message, '[skip ci]')
    run: echo "Skipping CI"

  - name: Conditional on failure
    if: failure()
    run: echo "Previous step failed"

  - name: Conditional on success
    if: success()
    run: echo "All steps passed"

  - name: Deploy based on branch
    if: github.ref_name == 'main' || startsWith(github.ref_name, 'release/')
    run: npm run deploy

  - name: Always run even on failure
    if: always()
    uses: actions/upload-artifact@v4
    with:
      name: logs
      path: logs/
```

### Step 8: Self-Hosted Runner
```yaml
name: CI on Self-Hosted
on: [push]

jobs:
  build:
    runs-on: [self-hosted, linux, x64, gpu]
    steps:
      - uses: actions/checkout@v4
      - run: nvidia-smi
      - run: docker build -t app .
      - run: docker run --gpus all app pytest
```

## Anti-Patterns

### Anti-Pattern 1: Hardcoded Secrets
Writing secrets directly in workflow files exposes them in git history and to anyone with repo access. Always use secrets.X or OIDC for cloud authentication.

### Anti-Pattern 2: Not Pinning Action Versions
Using @main or @v1 for actions means the action can change without notice, breaking CI or introducing supply chain attacks. Pin to SHA or full semver tag.

### Anti-Pattern 3: No Dependency Caching
Without caching, CI pipelines reinstall all dependencies on every run, adding 1-5 minutes per job. Always configure actions/cache or use setup-action cache parameter.

### Anti-Pattern 4: Monolithic Workflow
Putting everything in one workflow file makes it hard to maintain and debug. Split into multiple workflows by purpose (ci.yml, deploy.yml, security.yml).

### Anti-Pattern 5: No Matrix Strategy
Using a single OS/node version misses compatibility issues. Use matrix strategy for multi-version and multi-OS testing.

### Anti-Pattern 6: Not Using Needs
Running deploy before tests complete can deploy broken code. Use needs to define job dependencies. Test must complete before deploy starts.

### Anti-Pattern 7: Ignoring Artifacts on Failure
When tests fail, test results are not available for debugging. Always use if: failure() or if: always() with upload-artifact.

## Production Considerations

### Security
- Use OIDC for cloud provider authentication instead of long-lived secrets.
- Pin all action versions to SHA digests.
- Use minimal permissions with permissions block at job level.
- Enable Dependabot for action version updates.
- Review permissions for third-party actions.
- Use environment protection rules for production deployments.
- Never use GITHUB_TOKEN with unnecessary permissions.

### Performance
- Cache dependencies, build output, and Docker layers.
- Use matrix strategies to parallelize test execution.
- Use concurrency to cancel redundant runs.
- Use job summaries for quick status overview.
- Configure timeout-minutes to prevent runaway jobs.

### Reliability
- Use retry strategies for flaky steps.
- Use continue-on-error for non-critical matrix entries.
- Set up deployment health checks with rollback.
- Use reusable workflows for consistency.
- Monitor workflow run duration and failure rate.

## Rules
- Never hardcode secrets -- always use secrets.X or OIDC.
- Pin action versions to SHA or major tag -- never @main or @latest.
- Every job should have strategy.matrix for multi-version testing where applicable.
- Always configure dependency caching.
- Use upload-artifact with if: always() to preserve test results on failure.
- Prefer reusable workflows over copy-pasting across repos.
- Composite actions keep step logic DRY.
- Set environment protection rules for production deployments.
- Use concurrency to cancel redundant workflow runs.
- Set timeout-minutes on all jobs.
- Use if: failure() for failure notification and artifact upload.
- Use needs to enforce job execution order.
- Keep workflow files under 500 lines -- break into reusable workflows.

## Compared With

### GitHub Actions vs GitLab CI vs CircleCI
GitHub Actions: GitHub-native, marketplace, tight integration, free for public repos. GitLab CI: single app for code + CI, auto DevOps, built-in registry. CircleCI: fast, parallel by default, powerful caching, orbs. Choose based on where your code lives.

### Reusable Workflows vs Composite Actions
Reusable workflows: call another workflow file, support secrets and matrix, good for multi-job patterns. Composite actions: encapsulate steps for reuse within a job, support inputs, good for setup logic. Use reusable workflows for multi-job pipelines, composite actions for setup sequences.

## References
- references/best-practices.md -- Best Practices
- references/composite-actions.md -- Composite Actions
- references/custom-actions.md -- Custom GitHub Actions Development
- references/github-actions-advanced.md -- Github Actions Advanced Topics
- references/github-actions-fundamentals.md -- Github Actions Fundamentals
- references/reusable-workflows.md -- Reusable Workflows
- references/workflow-basics.md -- Workflow Basics
- references/workflow-optimization.md -- GitHub Actions Workflow Optimization

## Handoff
After completing this skill:
- Next skill: gitops -- ArgoCD/Flux deployment from CI artifacts
- Pass context: workflow file paths, artifact names, deployment environments

## Architecture Decision Trees

### Composite vs Reusable Workflow

| Decision | Composite Action | Reusable Workflow |
|---|---|---|
| Scope | Single job (multi-step) | Full workflow (multi-job) |
| Call context | Same workflow, step level | Separate workflow call |
| Input/Output | `inputs`, `outputs` | `workflow_call` inputs, secrets |
| Use case | Shared step logic (build, test) | Shared pipeline (deploy, release) |
| Versioning | Branch/commit SHA | Branch/tag in `uses` |
| Debugging | Step inside caller's workflow | Separate run, harder to trace |

### GitHub-hosted vs Self-hosted Runners

| Aspect | GitHub-hosted | Self-hosted |
|---|---|---|
| Maintenance | Zero (GitHub managed) | Team maintains patching |
| Scale | Auto-scales | Fixed capacity |
| Network | Public internet | VPC, private access |
| Cost | Included in plan minutes | Compute cost only |
| Customization | Limited OS/images | Any OS, any tooling |
| Security | Ephemeral (clean slate) | Persistent, needs hardening |

## Implementation Patterns

### YAML: Multi-job CI/CD with Matrix and Environments

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.node-version }}
          path: coverage/

  build-and-push:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: |
          echo "Deploying ${{ github.sha }} to production"
```

### Bash: Dispatch Workflow from CLI

```bash
#!/usr/bin/env bash
trigger_workflow() {
  local repo=$1
  local workflow=$2
  local branch=$3
  local payload=$4

  gh workflow run "$workflow" \
    --repo "$repo" \
    --ref "$branch" \
    --json "$payload"
}

verify_run() {
  local run_id
  run_id=$(gh run list --repo "$1" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run watch "$run_id" --repo "$1" --exit-status
}
```

## Production Considerations

- Use **OpenID Connect (OIDC)** for cloud provider access instead of long-lived secrets
- Set **environment protection rules** — required reviewers for production deployments
- Configure **artifact retention** — default 90 days; set shorter for ephemeral build artifacts
- Enable **GitHub Actions cache** with v2 (cross-branch cache access) for dependency caching
- Use **status checks** in branch protection rules to require all jobs pass before merge
- Label **self-hosted runners** by capability (gpu, arm64, windows) and scope to specific repos
- Pin **third-party actions** to commit SHAs instead of major version tags for supply chain security

## Anti-Patterns

- Storing **secrets as plain text in YAML** — always use GitHub Secrets or OIDC
- Running **build and test on every push** to all branches — use path filters for non-code changes
- Using **`GITHUB_TOKEN`** with excessive permissions — scope `permissions:` per job
- Neglecting **matrix strategy** for multi-version testing — testing only latest misses regressions
- Creating **monolithic workflows** — split into focused workflows for faster feedback
- Leaving **action versions unpinned** (`uses: actions/checkout` v no @v4) — breaks on major updates
- Ignoring **concurrency groups** — concurrent deploys to the same environment cause conflicts

## Performance Optimization

- Use **cache action** with `restore-keys` to fall back to previous cache if exact match not found
- Enable **BuildKit caching** with `docker/build-push-action` `cache-from` and `cache-to` layers
- Split **test runs** into parallel matrix jobs using `strategy.fail-fast: false` for full results
- Use **path filtering** (`paths-ignore`) to skip CI for documentation-only changes
- Download **pre-built tool caches** with `actions/cache` or `actions/setup-*` restore features
- Set **job timeout-minutes** appropriately — prevents hung jobs from burning runner minutes
- Combine **multiple build steps** into a single composite action to reduce setup overhead

## Security Considerations

- Enable **Dependabot** for Actions and Docker dependencies with auto-merge for patch updates
- Verify **attestations** on third-party actions using GitHub's artifact attestations
- Use **minimum required permissions** per job with `permissions:` block instead of default broad access
- Scan **container images** in the build pipeline with Trivy before pushing to registry
- Rotate **deployment keys** and secrets quarterly; revoke immediately on team member departure
- Set **IP allowlist** on self-hosted runners to prevent unauthorized workflow execution
- Restrict **workflow triggers** to `pull_request_target` only with safe checkout patterns
