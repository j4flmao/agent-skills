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
Before activating, verify:
- The language/framework is known (for setup action selection).
- The test/build toolchain is known (for step configuration).
- The deployment target is known (for deploy job design).
- Whether reusable workflows or composite actions are needed.

### Output Artifact
Writes to `.github/workflows/*.yml`, `action.yml`, and/or `.github/actions/*/action.yml`.

### Response Format
YAML workflow file with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
This skill is complete when:
- [ ] Workflow file(s) exist in `.github/workflows/`.
- [ ] Matrix strategy is configured for multi-version or multi-OS testing.
- [ ] Caching is configured for dependencies and build output.
- [ ] Artifacts are uploaded for build outputs.
- [ ] Secrets are referenced via `${{ secrets.X }}` — never hardcoded.

### Max Response Length
Direct file write. No response text.

## Quick Start
Single workflow: trigger on push/PR, setup action, matrix build, cache deps, run tests, upload artifacts. Use `actions/setup-*` for language setup. Use `actions/cache` for dependency caching.

## When to Use This Skill
- Setting up CI for a new repository
- Creating reusable workflow templates across an org
- Breaking a monolithic workflow into composable actions
- Adding matrix builds for multi-version testing

## Core Workflow

### Step 1: Basic CI Workflow
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "22"

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-${{ matrix.node-version }}
          path: test-results/
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
      - run: npm test
```

```yaml
# .github/workflows/ci.yml — calling the reusable workflow
jobs:
  test-node-20:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: "20"
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Step 3: Composite Action
```yaml
# .github/actions/setup-project/action.yml
name: "Setup Project"
description: "Checkout, install deps, and build"
inputs:
  node-version:
    description: "Node version"
    required: false
    default: "22"
  install-command:
    description: "Install command"
    required: false
    default: "npm ci"

runs:
  using: "composite"
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: "npm"
    - run: ${{ inputs.install-command }}
      shell: bash
    - run: npm run build
      shell: bash
```

### Step 4: Expressions and Conditionals
```yaml
steps:
  - name: Skip if docs only
    if: ${{ !contains(github.event.head_commit.message, '[skip ci]') }}
    run: npm test

  - name: Conditional step on failure
    if: ${{ failure() && steps.test.outcome == 'failure' }}
    run: echo "Tests failed"

  - name: Deploy only on main
    if: ${{ github.ref == 'refs/heads/main' && github.event_name == 'push' }}
    run: npm run deploy
```

### Step 5: Environments and OIDC
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-role
          aws-region: us-east-1
      - run: npm run deploy
```

## Rules & Constraints
- Never hardcode secrets — always use `${{ secrets.X }}` or OIDC
- Pin action versions to SHA or major tag — never use `@main` or `@latest`
- Every job should have a `strategy.matrix` for multi-version testing where applicable
- Always configure dependency caching (`actions/cache` or setup-action `cache:` param)
- Use `actions/upload-artifact` with `if: always()` to preserve test results on failure
- Prefer reusable workflows over copy-pasting the same steps across repos
- Composite actions keep step logic DRY when reusable workflows aren't enough
- Set environment protection rules for production deployments

## Output Format
YAML workflow files in `.github/workflows/` and/or `action.yml` files for composite/reusable actions.

## References
- `references/workflow-basics.md` — workflow syntax, triggers, jobs, steps
- `references/reusable-workflows.md` — `workflow_call`, `workflow_dispatch`, sharing across repos
- `references/composite-actions.md` — building and publishing composite actions
- `references/best-practices.md` — caching, security, performance, monitoring

## Handoff
After completing this skill:
- Next skill: **gitops** — ArgoCD/Flux deployment from CI artifacts
- Pass context: workflow file paths, artifact names, deployment environments
