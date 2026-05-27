---
name: dependency-management
description: >
  Use this skill when the user says 'Dependabot', 'Renovate', 'dependencies',
  'lock file', 'vulnerability scanning', 'update strategy', 'Renovate config',
  'dependabot.yml', 'dependency bump', 'automated updates', 'version pinning',
  'patch management', 'supply chain security', 'npm audit', 'SBOM'.
  Covers: Dependabot configuration, Renovate configuration, lock file management,
  vulnerability scanning, update strategy, dependency policy.
  Do NOT use this for: monorepo workspace configuration, package.json structure,
  or dependency graph visualization (see monorepo skill).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, dependencies, dependabot, renovate, security, phase-5]
---

# Dependency Management

## Purpose
Automate dependency updates, vulnerability scanning, and policy enforcement with Dependabot and Renovate.

## Agent Protocol

### Trigger
Exact user phrases: "Dependabot", "Renovate", "dependencies", "lock file", "vulnerability scanning", "update strategy", "dependabot.yml", "dependency bump", "automated updates", "version pinning", "patch management", "supply chain security", "SBOM", "npm audit".

### Input Context
Before activating, verify:
- Package ecosystem (npm, pip, maven, go, cargo, nuget, docker, terraform).
- Package manager (npm, yarn, pnpm, pip, poetry, maven, gradle, go, cargo).
- Automation tool (Dependabot, Renovate, or both).
- Update cadence (daily, weekly, monthly).
- Vulnerability severity threshold (critical only, high+, all).

### Output Artifact
Writes to `.github/dependabot.yml`, `renovate.json`, or `.github/renovate.json`.

### Response Format
dependabot.yml or renovate.json with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
This skill is complete when:
- [ ] Dependabot or Renovate is configured for the project's ecosystems.
- [ ] Update schedule and strategy are defined.
- [ ] Auto-merge rules are configured for safe updates.
- [ ] Vulnerability scanning is enabled with alerting.
- [ ] Lock file is committed and kept up-to-date.

### Max Response Length
Direct file write. No response text.

## Quick Start
Dependabot: `.github/dependabot.yml` with `version: 2`, `updates` array listing ecosystems, schedule, and reviewers. Renovate: `renovate.json` with `$schema` and package rules for automerge.

## When to Use This Skill
- Setting up automated dependency updates for a new project
- Migrating from manual updates to Dependabot or Renovate
- Enforcing security policies and vulnerability response
- Standardizing update processes across an organization

## Core Workflow

### Step 1: Dependabot Configuration
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/New_York"
    versioning-strategy: "increase-if-necessary"
    open-pull-requests-limit: 10
    rebase-strategy: "auto"
    labels:
      - "dependencies"
      - "npm"
    reviewers:
      - "team-devs"
    assignees:
      - "bot-owner"
    commit-message:
      prefix: "fix"
      prefix-development: "chore"
      include: "scope"
    allow:
      - dependency-type: "direct"
    ignore:
      - dependency-name: "react"
        versions: [">=19.0.0"]
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### Step 2: Renovate Configuration
```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    ":dependencyDashboard",
    ":semanticCommits",
    "group:allNonMajor"
  ],
  "labels": ["dependencies", "renovate"],
  "assignees": ["team-devs"],
  "schedule": ["before 9am on monday"],
  "timezone": "America/New_York",
  "rangeStrategy": "bump",
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 9am on monday"]
  },
  "packageRules": [
    {
      "description": "Auto-merge patch updates",
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr",
      "platformAutomerge": true
    },
    {
      "description": "Group dev dependencies",
      "matchDepTypes": ["devDependencies"],
      "groupName": "devDependencies",
      "groupSlug": "dev"
    },
    {
      "description": "Major updates require manual review",
      "matchUpdateTypes": ["major"],
      "labels": ["major-update"],
      "reviewers": ["team:lead"]
    },
    {
      "description": "Ignore certain packages",
      "matchPackageNames": ["react", "react-dom"],
      "allowedVersions": "<19.0.0"
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"],
    "assignees": ["security-team"]
  },
  "prConcurrentLimit": 5,
  "prHourlyLimit": 2
}
```

### Step 3: Auto-Merge Strategy
```yaml
# GitHub Actions auto-merge workflow
name: Auto-merge Dependencies
on:
  pull_request:
    types: [labeled, opened, synchronize]

jobs:
  auto-merge:
    if: contains(github.event.pull_request.labels.*.name, 'automerge')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: pascalgn/automerge-action@v0.16.4
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Step 4: Vulnerability Scanning
```yaml
# GitHub Actions vulnerability scan
name: Vulnerability Scan
on:
  schedule:
    - cron: "0 6 * * *"
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm audit --audit-level=high
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: advanced-security/sbom-generator-action@v0.0.1
        id: sbom
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: ${{ steps.sbom.outputs.sbomPath }}

  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif
```

### Step 5: Update Policy
```json
{
  "renovate.json": {
    "policy": {
      "patch": "auto-merge within 3 days",
      "minor": "auto-merge after tests pass, weekly batch",
      "major": "manual review, quarterly batch",
      "security": "immediate, direct assign to security team",
      "devDependencies": "weekly batch, auto-merge patch/minor"
    }
  }
}
```

## Rules & Constraints
- Always commit lock files — never `.gitignore` them
- Never auto-merge major version updates without review
- Pin GitHub Action versions to SHA for supply chain security
- Enable vulnerability alerts for all production dependencies
- Use grouped updates (Renovate) or `allow` rules (Dependabot) to reduce PR noise
- Set `open-pull-requests-limit` / `prConcurrentLimit` to avoid overwhelming CI
- Configure `schedule` during business hours to avoid weekend CI usage
- Opt-in (allow list) for Dependabot is safer than opt-out (ignore list)

## Output Format
`dependabot.yml`, `renovate.json`, and auto-merge CI workflow.

## References
  - references/dependabot-setup.md — Dependabot Setup
  - references/dependency-management-advanced.md — Dependency Management Advanced Topics
  - references/dependency-management-fundamentals.md — Dependency Management Fundamentals
  - references/renovate-config.md — Renovate Configuration
  - references/update-strategies.md — Update Strategies
  - references/vulnerability-scanning.md — Vulnerability Scanning
## Handoff
After completing this skill:
- Next skill: **monorepo** — workspace dependency graph, internal packages
- Pass context: Dependabot/Renovate config, update schedules, security policies
