---
name: security-secrets-management
description: >
  Use this skill when asked about secrets management, secret scanning, GitLeaks, truffleHog, Vault, credential rotation, .env files, environment variables, secrets detection, or secrets storage. This skill enforces: pre-commit secret scanning with GitLeaks/truffleHog, centralized secret storage with Vault/AWS Secrets Manager, automated rotation policies, and developer prevention patterns. Do NOT use for: general dependency scanning (SBOM), container image security, or API key generation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, devops, phase-10]
---

# Security Secrets Management

## Purpose
Design a secrets management strategy covering detection, centralized storage, automated rotation, and developer workflow prevention.

## Agent Protocol

### Trigger
Exact user phrases: "secrets management", "secret scanning", "GitLeaks", "truffleHog", "vault", "credential rotation", ".env", "environment variables", "secret detection", "secret storage", "HashiCorp Vault", "AWS Secrets Manager", "secret rotation", "pre-commit secret", "credential leak", "hardcoded secret".

### Input Context
Before activating, verify:
- Cloud provider (AWS, GCP, Azure, or on-prem)
- CI/CD platform and integration points
- Existing secrets detection tools or incidents
- Deployment platform (Kubernetes, serverless, VMs)
- Current secret storage approach (env files, SSM, Vault)

### Output Artifact
Secrets management strategy as YAML configs and workflow documentation.

### Response Format
```yaml
# Secret detection config (.gitleaks.toml)
# Pre-commit hook config
# Storage namespace layout
# Rotation policy
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Secret scanning configured with pre-commit hook and CI scan
- [ ] Centralized secret store deployed (Vault or cloud-native)
- [ ] Secret namespace hierarchy and access policies defined
- [ ] Rotation policy with interval and automation configured
- [ ] Developer prevention patterns documented
- [ ] Incident response for leaked credentials defined

### Max Response Length
250 lines of configuration.

## Workflow

### Step 1: Secret Detection - Pre-commit
GitLeaks: `gitleaks detect --source . --config .gitleaks.toml`. truffleHog: `trufflehog git file://. --only-verified`. Pre-commit hook: block commit if secrets detected. Config: define custom regex patterns for project-specific secrets (internal tokens, connection strings). Whitelist known test credentials with `allowlist` paths. GitLeaks as primary, truffleHog as secondary for verified secrets.

### Step 2: Secret Detection - CI
Scan full git history on push to main. Scan PR diff for new secrets. TruffleHog verified mode: correlates detected secrets with known credential patterns (AWS keys, GitHub tokens). Alert on detection: Slack/PagerDuty for verified secrets, email for potential secrets. Block PR merge if verified secret found.

### Step 3: Secret Storage
HashiCorp Vault: for multi-cloud/on-prem, dynamic secrets, PKI. AWS Secrets Manager: for AWS-native, automatic rotation, cross-account access. Kubernetes: External Secrets Operator syncs from Vault/Secrets Manager to K8s secrets. Structure: `/<env>/<service>/<secret-key>`. Access: IAM roles for cloud, AppRole for Vault.

### Step 4: Secret Rotation
Rotation interval: database credentials (30 days), API keys (90 days), service tokens (auto-refresh). Automate: Secrets Manager automatic rotation with Lambda. Vault: dynamic secrets auto-expire, static secrets rotated via cron with SIGHUP. Zero-downtime rotation: dual credentials during rotation window.

### Step 5: Developer Prevention
Template `.env.example` with placeholder values. Lint rules: ESLint `no-process-env` for direct access, shellcheck for env var leaks. Documentation: README section on adding new secrets. IDE: use .env file in `.gitignore` with example template. Ban: no secrets in code reviews — automated check in PR template.

### Step 6: Incident Response
Leaked credential: immediate revoke, rotate, audit access logs. Containment: invalidate tokens, rotate DB passwords, check CloudTrail for misuse. Post-mortem: root cause, scanning gap, prevention improvement. Runbook: step-by-step for secret leak scenarios.

## Rules
- All secrets detected pre-commit, never reach remote
- No secrets in code, config files, or Dockerfiles
- Centralized store with access audit logging
- Rotation automated where possible, scheduled otherwise
- .env files in .gitignore — always
- CI blocks on verified secret detection
- Dynamic secrets for databases (short-lived, auto-revoke)
- Every secret has a single source of truth

## References
- `references/secret-detection.md` — GitLeaks, truffleHog, pre-commit hooks, CI scanning integration
- `references/secret-storage.md` — Vault, AWS Secrets Manager, Kubernetes External Secrets, rotation patterns

## Handoff
`security-container-security` for secrets injection into containers
`security-api-security` for API key management and JWT signing secrets
