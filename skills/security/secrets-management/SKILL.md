---
name: security-secrets-management
description: >
  Use this skill when asked about secrets management, secret scanning, GitLeaks, truffleHog, ggshield, Vault, credential rotation, .env files, environment variables, secrets detection, or secrets storage. This skill enforces: pre-commit secret scanning with GitLeaks/truffleHog/ggshield, centralized secret storage with Vault/AWS Secrets Manager/GCP Secret Manager, automated rotation policies, Kubernetes External Secrets, and developer prevention patterns. Do NOT use for: general dependency scanning (SBOM), container image security, or API key generation.
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
Design a secrets management strategy covering detection
(GitLeaks, truffleHog, ggshield), centralized storage
(Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault),
automated rotation, Kubernetes External Secrets integration,
and developer workflow prevention.

## Agent Protocol

### Trigger
Exact user phrases: "secrets management", "secret scanning",
"GitLeaks", "truffleHog", "ggshield", "vault", "credential rotation",
".env", "environment variables", "secret detection", "secret storage",
"HashiCorp Vault", "AWS Secrets Manager", "GCP Secret Manager",
"secret rotation", "pre-commit secret", "credential leak",
"hardcoded secret", "External Secrets", "secret audit".

### Input Context
Before activating, verify:
- Cloud provider (AWS, GCP, Azure, or on-prem)
- CI/CD platform and integration points
- Existing secrets detection tools or incidents
- Deployment platform (Kubernetes, serverless, VMs)
- Current secret storage approach (env files, SSM, Vault)
- Compliance requirements (SOC 2, PCI DSS, HIPAA)

### Output Artifact
Secrets management strategy as YAML configs and workflow documentation.

### Response Format
```yaml
# Secret detection config (.gitleaks.toml)
# Pre-commit hook config
# Storage namespace layout
# Rotation policy
# ExternalSecret template
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Secret scanning configured with pre-commit hook and CI scan
- [ ] Centralized secret store deployed (Vault or cloud-native)
- [ ] Secret namespace hierarchy and access policies defined
- [ ] Rotation policy with interval and automation configured
- [ ] Developer prevention patterns documented
- [ ] Incident response for leaked credentials defined
- [ ] False positive management process in place
- [ ] Audit logging for secret access configured

### Max Response Length
250 lines of configuration.

## Workflow

### Step 1: Secret Detection - Pre-commit
GitLeaks: `gitleaks detect --source . --config .gitleaks.toml`.
Uses custom rules for project-specific patterns.
Target: internal tokens, JWTs, connection strings, cloud keys.

truffleHog: `trufflehog git file://. --only-verified --fail`.
Secondary deep scan verifying against live services.
Correlates with AWS STS, GitHub API, Slack API.

ggshield (GitGuardian): `ggsecret scan pre-commit`.
Covers 300+ detector types from 200+ services.
Higher SaaS API key coverage than GitLeaks alone.

Hook order: GitLeaks first (fast regex), ggshield second
(broad coverage), truffleHog last (verified deep scan).
Block commit if any tool detects a secret.
Allowlist known test credentials with path and regex rules.
Use `SKIP=<hook>` only with documented emergency reason.

### Step 2: Secret Detection - CI
Full history scan on push to main:
`gitleaks detect --source . --verbose`.

PR diff scan for new secrets:
`gitleaks detect --source . --log-opts="..origin/main"`.

TruffleHog verified mode checks live services.
AWS keys against STS.GetCallerIdentity.
GitHub tokens against GitHub API.
Slack tokens against Slack API.

CI gates:
- Fail on GitLeaks HIGH or CRITICAL severity
- Fail on truffleHog verified secret
- Warn on ggshield potential secret

Output: SARIF for GitHub Code Scanning integration.
Verified secrets → PagerDuty or Slack urgent.
Potential secrets → email digest to security team.
Block PR merge on verified secret detection.
Nightly full history scan for historical leaks.

### Step 3: False Positive Management
Triage each flagged secret in CI report.
Classify as true positive or false positive.
Document evidence for classification.

Allowlist in `.gitleaks.toml`:
- Path-based: `(test/fixtures/)`, `(vendor/)`
- Regex-based: exclude known non-secret patterns
- Commit-based: skip specific historical commits

Document rationale for every false positive.
Example: "test token in fixture file", "example in docs".

Quarterly audit of allowlist — remove stale entries.
Improve regex rules to reduce FP rate over time.
Target: less than 5% FP for GitLeaks.
Target: less than 10% FP for truffleHog.

### Step 4: Secret Storage
HashiCorp Vault: multi-cloud or on-premises.
Dynamic secrets, PKI engine, transit engine.
Auth: Kubernetes (service account), AppRole (machine), OIDC (human).
Structure: `secret/data/<env>/<service>/<key>`.

AWS Secrets Manager: AWS-native storage.
Automatic rotation with Lambda functions.
Cross-account access via resource policy.
Supports RDS, Redshift, DocumentDB, custom.

GCP Secret Manager: GCP-native storage.
IAM-based access, multi-region replication.
Version management with auto-cleanup.

Azure Key Vault: Azure-native storage.
Soft-delete protection, RBAC integration.

Kubernetes: External Secrets Operator.
Syncs from any provider to K8s secrets.
Automatic refresh on rotation.
Supports AWS, GCP, Azure, Vault, 20+ providers.

### Step 5: Secret Rotation
Rotation intervals:
- Database credentials: 30 days
- API keys: 90 days
- Service tokens: auto-refresh
- TLS certificates: 90 days
- JWT signing keys: 180 days

Automation strategies:
Secrets Manager: Lambda-based auto rotation for RDS.
Vault dynamic secrets: auto-expire with configurable TTL.
Vault static secrets: cron + SIGHUP reload.

Zero-downtime rotation:
Dual credentials during rotation window.
Old credential valid for N hours after new deployed.
Co-rotation: create new version while old stays active.
Grace period: old valid for configurable hours.

### Step 6: Developer Prevention
Template `.env.example` with placeholder values.
Document each variable with description and source.

Lint rules:
- ESLint: `no-process-env` for direct access
- shellcheck: detect env var leaks in scripts
- Custom: detect hardcoded credential patterns

IDE: `.env` file highlighting with leak warnings.
Code review: checklist item in PR template.
"Any new secrets or credentials in this change?"

Pre-commit: mandatory via `pre-commit` framework.
Config in repo, enforced for all developers.

Ban: no secrets in code, config files, Dockerfiles,
or Helm values — always reference the secret store.

### Step 7: Incident Response - Leaked Credential
Immediate: revoke credential, rotate to new value.
Audit access logs for signs of misuse.

Containment:
Invalidate all tokens tied to the credential.
Rotate DB passwords if DB credential leaked.
Check CloudTrail or Cloud Logging for unauthorized access.
Check GitHub audit log for repo access.

Communication:
Notify security team via incident channel.
Notify affected service owners.
Notify compliance if PII was potentially exposed.

Post-mortem: root cause analysis.
Why was it missed? Improve scanning rules.

Runbook per secret type: API key leak, DB password,
cloud credential, certificate, OAuth token.

### Step 8: Audit Logging
Vault audit: all reads, writes, deletes.
Logged with timestamp, path, auth method, client IP.

Cloud audit: CloudTrail (AWS), Cloud Logging (GCP),
Azure Monitor (Key Vault).

Retention: 90 days hot, 7 years cold for compliance.

Alerts on anomalous access:
- Multiple failed read attempts
- Access from unusual IP or geolocation
- Bulk secret retrieval (potential exfiltration)
- Access during unusual hours

Dashboard: secret access trends by service and user.
Review weekly for suspicious patterns.

## Rules
- All secrets detected pre-commit, never reach remote
- No secrets in code, config files, or Dockerfiles
- Centralized store with access audit logging
- Rotation automated where possible, scheduled otherwise
- .env files in .gitignore — always
- CI blocks on verified secret detection
- Dynamic secrets for databases (short-lived, auto-revoke)
- Every secret has a single source of truth
- False positives allowlisted with documented rationale
- Audit every secret access — who, what, when, why

## References
- `references/secret-detection.md`
  GitLeaks, truffleHog, ggshield, pre-commit hooks,
  CI scanning integration, false positive management
- `references/secret-storage.md`
  Vault, AWS Secrets Manager, GCP Secret Manager,
  Azure Key Vault, Kubernetes External Secrets, rotation
- `references/secrets-rotation.md`
  Rotation strategies, automation patterns, zero-downtime rotation
- `references/secrets-audit.md`
  Audit checklist, audit logging format, monitoring alerts

## Handoff
`security-container-security` for secrets injection into containers
`security-api-security` for API key management and JWT signing secrets
