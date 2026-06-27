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

## Architecture / Decision Trees

### Secret Storage Decision Tree

```
What is the primary infrastructure platform?
├── Multi-cloud or on-premises
│   └── HashiCorp Vault (dynamic secrets, PKI, multi-datacenter replication)
├── AWS-only
│   └── AWS Secrets Manager (RDS rotation, cross-account, Lambda integration)
├── GCP-only
│   └── GCP Secret Manager (IAM, multi-region replication, version management)
└── Azure-only
    └── Azure Key Vault (RBAC, soft-delete, managed HSM tier)

Is Kubernetes in use?
├── Yes → External Secrets Operator + any of the above providers
├── No → Direct SDK integration per application
└── Both → Vault CSI Provider + External Secrets for K8s workloads

What is the compliance requirement?
├── SOC 2 → Audit logging, rotation, access controls
├── PCI DSS → HSMs, network isolation, key hierarchy
├── HIPAA → BAA with provider, audit trails, minimum necessary access
└── FedRAMP → FIPS 140-2 validated modules, GovCloud
```

### Secret Detection Placement Decision

```
Where should secrets be detected?
├── Pre-commit (fastest feedback, developer in flow)
│   ├── GitLeaks: custom regex rules, ~100ms per commit
│   ├── ggshield: 300+ detectors, ~200ms per commit
│   └── Order: GitLeaks → ggshield (fail-fast on regex)
├── Pre-push (catches what pre-commit misses)
│   ├── truffleHog verified: checks against live APIs, ~30s
│   └── Block push on verified secret
├── CI (branch protection, PR gates)
│   ├── Full scan on PR to main
│   ├── Diff scan only (faster, focused)
│   └── Block merge on HIGH/CRITICAL findings
└── Scheduled / periodic
    ├── Nightly full repo scan
    ├── Weekly scan of all repos in organization
    └── Monthly scan of all repos + S3 buckets + GCS buckets + Slack history
```

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

## Common Pitfalls

### Pitfall 1: Scanning Only Pre-Commit
Pre-commit hooks can be bypassed (--no-verify, git commit --amend, merge commits). Always add CI-level scanning and scheduled periodic scans as defense in depth.

### Pitfall 2: No Verified Mode
Relying solely on pattern matching generates false positives. truffleHog verified mode checks against live APIs (AWS STS, GitHub, Slack) and eliminates most false positives.

### Pitfall 3: Hardcoded Rotation Intervals
Setting rotation intervals without considering credential propagation time causes outages. Database credentials need a dual-credential window during rotation (old stays valid 24-48h after rotation). Test rotation in staging first.

### Pitfall 4: Overly Permissive Secret Access
Secrets Manager policies that grant wildcard access (`secretsmanager:*` or `secret:*`) defeat the purpose of centralized storage. Use least privilege with explicit paths and actions.

### Pitfall 5: No Secret Versioning
Overwriting secrets without keeping previous versions makes rollback impossible during incidents. Always version secrets and keep last 5 versions.

### Pitfall 6: Secrets in CI/CD Variables
CI/CD pipeline variables often grant access to all jobs in a project. Stored in plaintext in the CI provider's database. Use the secrets manager directly from CI instead.

### Pitfall 7: No Audit on Secret Access
Without audit logging, leaked credentials cannot be traced to the source. Always log who accessed what secret, when, and from where.

### Pitfall 8: Ignoring Environment-Specific Secrets
Using the same secret across dev/staging/prod violates least privilege and complicates rotation. Every environment gets its own secrets with separate access policies.

### Pitfall 9: Long-Lived Static Secrets
Static API keys and passwords that never expire are the highest risk. Replace with dynamic secrets (short TTL, auto-revoke) whenever possible.

### Pitfall 10: No Incident Response Runbook
When a secret leaks, every minute counts. Without a pre-defined runbook per secret type, response time increases 3-5x.

## Best Practices

- Use pre-commit scanning as first line of defense. Combine GitLeaks (fast regex, custom rules) + ggshield (broad coverage) + truffleHog (verified against live APIs).
- Enforce scanning in CI with merge gates. Reject PRs containing HIGH or CRITICAL secrets.
- Store secrets in a centralized vault (Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault). Never in .env files, config files, or Dockerfiles.
- Use dynamic secrets for databases: short-lived, auto-expire, auto-revoke. Vault database engine or cloud-native equivalents.
- Implement dual-credential rotation: old credential stays valid for a grace period after new one is deployed.
- Version all secrets. Keep minimum 5 versions. Enable rollback.
- Log every secret access: who, what, when, from where. Retain 90 days hot, 7 years cold.
- Set up alerts on anomalous access patterns: bulk retrieval, unusual hours, new geolocations.
- Use External Secrets Operator for Kubernetes: sync secrets from any provider, auto-refresh on rotation.
- Create incident response runbooks per secret type (API key, DB password, cloud credential, certificate, OAuth token).
- Audit false positive allowlist quarterly. Target <5% FP rate.
- Train developers: include secrets checklist in PR template, detect hardcoded patterns in lint.

## Compared With

### GitLeaks vs truffleHog vs ggshield
GitLeaks is fastest for custom regex patterns. truffleHog adds verified scanning against live APIs (zero false positives for verified). ggshield covers 300+ services with broadest SaaS coverage. Use all three in sequence: GitLeaks (fast), ggshield (broad), truffleHog (verified).

### Vault vs AWS Secrets Manager vs GCP Secret Manager vs Azure Key Vault
Vault is the most flexible (multi-cloud, dynamic secrets, PKI, transit encryption). AWS Secrets Manager is best for AWS-only shops with RDS rotation. GCP Secret Manager provides multi-region replication with IAM. Azure Key Vault offers managed HSM and RBAC. Choose based on platform lock-in tolerance and multi-cloud needs.

### Static vs Dynamic Secrets
Static secrets have infinite lifetime and require manual rotation. Dynamic secrets have configurable TTL, auto-expire, and auto-revoke. Dynamic secrets eliminate the risk of credential leak from stale credentials. Always prefer dynamic for databases, service accounts, and API tokens.

### External Secrets Operator vs Vault CSI Provider vs In-Tree K8s Secrets
External Secrets Operator is the most flexible (20+ providers, auto-refresh, namespace-scoped). Vault CSI Provider mounts secrets as volumes (no K8s Secret resource, reduces attack surface). In-tree K8s Secrets are base64 encoded only, no rotation, no access audit. Never use in-tree secrets for production.

## Secrets in CI/CD Pipelines

### GitHub Actions Example

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on:
  pull_request:
    branches: [main]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: GitLeaks Scan
        uses: gitleaks/gitleaks-action@v2
        with:
          config-path: .gitleaks.toml
      - name: truffleHog Verified Scan
        run: |
          trufflehog git file://. --only-verified --fail \
            --github-token ${{ secrets.GITHUB_TOKEN }}
```

### GitLab CI Example

```yaml
secret-scan:
  stage: test
  script:
    - gitleaks detect --source . --config .gitleaks.toml --verbose
  rules:
    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'
```

### Secrets Management in CI/CD

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fetch secrets from Vault
        uses: hashicorp/vault-action@v2
        with:
          url: https://vault.example.com
          method: jwt
          secrets: |
            secret/data/prod/db password | DB_PASSWORD;
            secret/data/prod/api key | API_KEY;
      - name: Deploy
        run: ./deploy.sh
        env:
          DB_PASSWORD: ${{ steps.secrets.outputs.DB_PASSWORD }}
```

## Secrets Management Anti-Patterns

### Anti-Pattern 1: .env in Version Control
Committing `.env` files to Git is the root cause of most credential leaks. `.env` contains production credentials. `.env.example` with placeholder values should be committed instead. Enforce via `.gitignore` and a CI check that rejects PRs containing `.env` or `.env.*` excluding `.env.example`.

### Anti-Pattern 2: Shared Secrets Across Environments
Using the same database password for dev, staging, and production. A developer with dev access can read production credentials. Compromise of a lower environment exposes production. Each environment must have separate credentials with independent access policies and rotation schedules.

### Anti-Pattern 3: Secrets in Build Artifacts
Embedding secrets in container images or compiled binaries during build. Anyone with registry access can extract secrets from the image. Always inject secrets at runtime via volume mount, environment injection, or secrets manager SDK. Verify with `docker history` that no secrets are in image layers.

### Anti-Pattern 4: Long-Lived Service Account Keys
Service account JSON keys with indefinite lifetime and broad permissions stored on developer machines. If the machine is compromised, the key is compromised. Use workload identity federation (OIDC) instead — short-lived tokens with automatic rotation and no static secret material.

### Anti-Pattern 5: Manual Secret Rotation
Engineers manually rotating secrets via SSH and config file edits. No audit trail, no rollback plan, high error rate. Automate rotation with secrets manager rotation functions or Vault dynamic secrets. Manual rotation must have a documented runbook.

### Anti-Pattern 6: Secrets in Logs and Error Messages
Application logging framework captures environment variables or request parameters containing secrets. Secrets appear in log aggregation tools with long retention. Implement secret redaction in logging pipeline. Test by searching logs for common secret patterns.

## Performance Considerations

- Detection speed: GitLeaks (50-100ms per commit), ggshield (150-300ms), truffleHog verified (10-30s). Pre-commit must stay under 500ms total.
- CI scan of a full repo: GitLeaks full history scan of 10k commits takes ~30s. PR diff scan takes <5s.
- Vault performance: ~10k reads/s per active node, ~500 writes/s. Scale via performance standby nodes.
- AWS Secrets Manager: 10k requests per second per region by default, burstable to 20k.
- GCP Secret Manager: 1k access requests per second per secret, 10k per project.
- Azure Key Vault: 2k transactions per second per vault (standard tier).
- Kubernetes External Secrets: polling interval minimum 30s, webhook-based refresh for faster propagation.
- Secret access latency: local Vault (1-5ms), cloud SM (10-50ms), K8s API (10-100ms). Cache when performance is critical.
- Encryption overhead: Vault transit engine adds 50-200μs per encrypt/decrypt operation. Acceptable for most workloads.

## Rules
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
  - references/secret-detection.md — Secret Detection
  - references/secret-storage.md — Secret Storage
  - references/secrets-audit.md — Secrets Audit
  - references/secrets-management-advanced.md — Secrets Management Advanced Topics
  - references/secrets-management-fundamentals.md — Secrets Management Fundamentals
  - references/secrets-rotation.md — Secrets Rotation Patterns
  - references/secrets-lifecycle-management.md — Full lifecycle management from creation to destruction
  - references/secrets-platform-comparison.md — Vault vs AWS Secrets Manager vs GCP Secret Manager vs Azure Key Vault
## Handoff
`security-container-security` for secrets injection into containers
`security-api-security` for API key management and JWT signing secrets
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.