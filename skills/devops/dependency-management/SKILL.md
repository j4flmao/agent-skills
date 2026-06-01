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
  or dependency graph visualization (use monorepo skill).
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
- Package ecosystem (npm, pip, maven, go, cargo, nuget, docker, terraform).
- Package manager (npm, yarn, pnpm, pip, poetry, maven, gradle, go, cargo).
- Automation tool (Dependabot, Renovate, or both).
- Update cadence (daily, weekly, monthly).
- Vulnerability severity threshold (critical only, high+, all).

### Output Artifact
Writes to .github/dependabot.yml, renovate.json, or .github/renovate.json.

### Response Format
dependabot.yml or renovate.json with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- Dependabot or Renovate configured for the project's ecosystems.
- Update schedule and strategy defined.
- Auto-merge rules configured for safe updates.
- Vulnerability scanning enabled with alerting.
- Lock file committed and kept up-to-date.

## Architecture / Decision Trees

### Tool Selection: Dependabot vs Renovate

| Feature | Dependabot | Renovate |
|---|---|---|
| Configuration | YAML (dependabot.yml) | JSON (renovate.json) |
| Auto-merge | Via GitHub Actions | Built-in (platformAutomerge) |
| Grouped updates | Manual allow lists | Automatic grouping rules |
| Custom registries | Limited | Extensive (any host) |
| Onboarding PR | No | Yes (configurable) |
| Regex manager | No | Yes (Docker, custom) |
| Presets/shared config | No (org-level only) | Presets, extends, shareable |
| Lock file maintenance | Manual | Built-in schedule |
| Dashboard | Dependencies tab only | Dependency Dashboard PR |
| Rate limiting | GitHub API limits | Configurable concurrency |
| Monorepo support | Per-directory config | Automatic workspace detection |
| Self-hosted | Via GitHub | Via Renovate self-hosted |

### Update Strategy Decision Tree
- Major version updates: manual review with quarterly batch.
- Minor version updates: auto-merge after CI passes, weekly batch.
- Patch updates: auto-merge within 3 days, no batch delay.
- Security fixes: immediate PR, direct assign to security team.
- Dev dependencies: weekly batch, auto-merge patch/minor.
- Direct dependencies (production): manual review for major, auto-merge for minor/patch.

### Vulnerability Severity Thresholds

| Severity | Response | SLA | Assignee |
|---|---|---|---|
| Critical | Emergency patch, immediate PR | 24 hours | Security team |
| High | Prioritized patch within 7 days | 7 days | Security + dev team |
| Medium | Patch within next release cycle | 30 days | Dev team |
| Low | Patch within next major | 90 days | Dev team |

### Auto-Merge Risk Assessment

| Update Type | Auto-Merge | Requires | Risk Level |
|---|---|---|---|
| Patch (devDeps) | Yes | CI passes | Low |
| Patch (dependencies) | Yes | CI + code coverage | Low |
| Minor (devDeps) | Yes | CI passes | Medium |
| Minor (dependencies) | Conditional | CI + review if breaking | Medium |
| Major (any) | Never | Manual review required | High |
| Security (any) | Conditional | CI + security team review | High |

## Core Workflow

### Step 1: Dependabot Configuration
```yaml
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
    groups:
      actions:
        patterns:
          - "actions/*"
          - "github/codeql-action/*"
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
  "assigneesFromCodeOwners": true,
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
      "assignees": ["team-lead"],
      "reviewers": ["team-lead"]
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
  "prHourlyLimit": 2,
  "osvVulnerabilityAlerts": true
}
```

### Step 3: Auto-Merge Workflow
```yaml
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
          GITHUB_TOKEN: {% raw %}${{ secrets.GITHUB_TOKEN }}{% endraw %}
```

### Step 4: Vulnerability Scanning
```yaml
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

### Step 5: Lock File Policy
```
# .gitattributes - ensure lock files are treated as binary for PR diffs
package-lock.json binary
yarn.lock binary
pnpm-lock.yaml binary
Cargo.lock binary
go.sum binary
Gemfile.lock binary
```

### Step 6: SBOM Generation
```yaml
name: SBOM Generation
on:
  push:
    branches: [main]
  schedule:
    - cron: "0 0 * * 0"

jobs:
  generate-sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: CycloneDX/gh-node-module-generatebom@v2
        with:
          path: .
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: bom.xml
```

### Step 7: Dependency Review in CI
```yaml
name: Dependency Review
on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          license-check: true
          deny-licenses: GPL-3.0, AGPL-3.0
          comment-summary-in-pr: always
```

## Anti-Patterns

### Anti-Pattern 1: Ignoring Lock Files
.gitignoring lock files means builds are non-reproducible and vulnerability scans are inaccurate. Lock files are the source of truth for what is actually installed. Always commit lock files.

### Anti-Pattern 2: Auto-Merging Major Updates
Major version bumps often contain breaking API changes that break builds silently. Auto-merging bypasses review. Always require manual review for major version updates.

### Anti-Pattern 3: No Vulnerability Alerting
Without vulnerability scanning and alerting, critical security patches go unnoticed. An unpatched CVE in a production dependency can lead to exploitation. Enable and monitor vulnerability alerts.

### Anti-Pattern 4: Not Pinning GitHub Actions
Using @v1 or @main for GitHub Actions means the action can change without notice, potentially breaking CI or introducing supply chain vulnerabilities. Pin to SHA or full semver tag.

### Anti-Pattern 5: Too Many Open PRs
Dependabot or Renovate opens 50+ PRs overwhelming CI and reviewers. Set open-pull-requests-limit or prConcurrentLimit. Use grouped updates to reduce PR count.

### Anti-Pattern 6: Ignoring Transitive Dependencies
Auditing only direct dependencies misses vulnerabilities in transitive dependencies. Use npm audit, Dependabot alerts (which scan the full tree), or Renovate vulnerability alerts with OSV.

### Anti-Pattern 7: No Update Schedule
Running updates daily creates noise. Running updates monthly misses critical security patches. Weekly schedule with security alerts on-demand is the recommended balance.

## Production Considerations

### Supply Chain Security
- Pin all dependency versions (never ranges like ^1.2.3 in production).
- Use lock files for deterministic installs.
- Sign commits and tags from Dependabot/Renovate.
- Scan for malicious packages (Socket.dev, npm audit, Snyk).
- Maintain an SBOM for every release.
- Enable Dependabot security updates for critical and high alerts.

### CI Integration
- Run npm audit / pip audit in CI on every PR.
- Fail CI on critical and high vulnerabilities.
- Block PRs that add dependencies with known vulnerabilities.
- Require SBOM generation in release pipeline.
- Validate dependency licenses in CI.

### Monorepo Strategy
- One Dependabot config per monorepo with per-directory updates.
- Renovate auto-detects workspaces (npm, pnpm, lerna).
- Use Renovate packageRules with matchFileNames for subdirectories.
- Group updates by workspace to reduce PR count.

## Rules
- Always commit lock files -- never .gitignore them.
- Never auto-merge major version updates without manual review.
- Pin GitHub Action versions to SHA for supply chain security.
- Enable vulnerability alerts for all production dependencies.
- Use grouped updates (Renovate) or allow rules (Dependabot) to reduce PR noise.
- Set open-pull-requests-limit / prConcurrentLimit to avoid overwhelming CI.
- Configure schedule during business hours to avoid weekend CI usage.
- Use Renovate presets for org-wide standardization.
- Enable lock file maintenance for regular lock file updates.
- Use dependency review action in CI to block vulnerable PRs.
- Maintain SBOM for compliance and incident response.
- Set vulnerability SLA: critical = 24h, high = 7d, medium = 30d.
- Use OSV database for comprehensive vulnerability coverage.

## Compared With

### Dependabot vs Renovate vs Manual
Dependabot: simplest setup, GitHub-native, limited customization. Renovate: more configurable, grouped updates, regex manager, self-hostable. Manual: outdated immediately, no vulnerability alerting, human error prone. Start with Dependabot for simple projects, Renovate for complex monorepos.

### npm audit vs Snyk vs Trivy
npm audit: built-in, free, limited to npm ecosystem. Snyk: broader language coverage, fix PRs, license checks, paid. Trivy: open-source, fast, covers filesystem, containers, repos, SBOM. Use npm audit as baseline, Trivy for CI scanning, Snyk for enterprise.

### Lock Files by Ecosystem
npm (package-lock.json): npm standard, deterministic. yarn (yarn.lock): yarn specific. pnpm (pnpm-lock.yaml): pnpm specific, efficient disk. Cargo.lock: Rust standard. go.sum: Go standard, checksum only. Gemfile.lock: Ruby standard. poetry.lock: Python poetry.

## Operations & Maintenance

### Weekly Tasks
- Review open dependency PRs and merge safe ones.
- Check vulnerability alerts and update SLAs.
- Monitor Renovate/Dependabot dashboard for issues.

### Monthly Tasks
- Review update configuration for new ecosystems.
- Update Renovate/Dependabot to latest version.
- Audit SBOM generation outputs.

### Quarterly Tasks
- Review dependency licensing.
- Audit transitive dependency footprint.
- Update dependency policies based on new supply chain threats.
- Test rollback of dependency update scenarios.

## References
- references/dependabot-setup.md -- Dependabot Setup
- references/dependency-management-advanced.md -- Dependency Management Advanced Topics
- references/dependency-management-fundamentals.md -- Dependency Management Fundamentals
- references/renovate-config.md -- Renovate Configuration
- references/update-strategies.md -- Update Strategies
- references/vulnerability-scanning.md -- Vulnerability Scanning

## Handoff
After completing this skill:
- Next skill: monorepo -- workspace dependency graph, internal packages
- Pass context: Dependabot/Renovate config, update schedules, security policies
