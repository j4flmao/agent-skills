# Dependency Management Fundamentals

## Overview
Dependency management automates the process of tracking, updating, and securing software dependencies. Tools like Dependabot and Renovate keep dependencies current while minimizing risk through automated testing and validation.

## Core Concepts

### Semantic Versioning
MAJOR.MINOR.PATCH format: MAJOR (breaking changes), MINOR (new features, backward compatible), PATCH (bug fixes, backward compatible). Version ranges: ^1.2.3 (compatible with 1.x.x), ~1.2.3 (compatible with 1.2.x). Lock files capture exact dependency tree for reproducible builds.

### Supply Chain Security
Vulnerability scanning identifies dependencies with known CVEs. SBOM (Software Bill of Materials) catalogs all components. Dependency review blocks PRs adding vulnerable dependencies. Software attestation verifies build integrity.

### Update Strategies
Security updates: immediate, automated, highest priority. Patch updates: auto-merge after CI passes. Minor updates: auto-merge with grouped PRs. Major updates: manual review required. Lock file maintenance: regular automated refresh.

## Key Tools

### Dependabot
GitHub-native dependency updater. Configuration in .github/dependabot.yml. Supports npm, pip, Maven, Go, Docker, GitHub Actions, and more. Creates PRs for version updates. GitHub-managed, no additional infrastructure.

### Renovate
Cross-platform dependency updater. JSON/JSON5 configuration. Supports all major ecosystems plus custom regex managers. Grouped updates, scheduled runs, dependency dashboard. Self-hostable or GitHub App. More configurable than Dependabot.

### Vulnerability Scanners
npm audit: built-in npm vulnerability scanner. pip audit: Python vulnerability scanner. Snyk: multi-language vulnerability scanning with fix PRs. Trivy: open-source scanner for filesystems, containers, and repos. OSV: open-source vulnerability database.

## Basic Configuration

### Dependabot Minimal Setup
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

## Best Practices
- Always commit lock files for reproducible builds.
- Enable vulnerability alerts for all ecosystems.
- Auto-merge patch updates that pass CI.
- Require manual review for major version updates.
- Pin GitHub Actions versions to SHA.
- Use grouped updates to reduce PR noise.
- Set update schedule during business hours.
- Use dependency review action in CI.

## References
- dependency-management-advanced.md -- Advanced dependency management topics
- dependabot-setup.md -- Dependabot Setup
- renovate-config.md -- Renovate Configuration
- update-strategies.md -- Update Strategies
- vulnerability-scanning.md -- Vulnerability Scanning
