# Security Skills Guide

## Overview
The Security skill set provides a defense-in-depth approach covering the full software security lifecycle: static analysis, software bill of materials, secrets detection, container hardening, and API protection.

## Security Workflow

```
Source Code ──► SAST/DAST ──► SBOM ──► Secrets Scan ──► Container Scan ──► API Security
   [code-level]      [dependencies]    [credentials]      [deploy artifact]    [runtime]
```

Each stage catches different classes of vulnerabilities. Run sequentially in CI/CD — earlier stages are cheaper and faster. Never deploy without passing all stages.

## Skill Map

| Skill | Stage | When to Use | Tools |
|---|---|---|---|
| `security/sast-dast` | Static & dynamic analysis | Scanning source code and running apps for vulnerabilities | Semgrep, SonarQube, CodeQL, Burp Suite, OWASP ZAP |
| `security/sbom` | Dependency inventory | Tracking open-source components, licenses, known CVEs | Syft, Grype, Dependency-Track, Snyk, npm audit |
| `security/secrets-management` | Credential detection | Finding hardcoded keys, tokens, passwords in code/repos | Gitleaks, TruffleHog, detect-secrets, GitGuardian |
| `security/container-security` | Image hardening | Scanning container images, securing Kubernetes deployments | Trivy, Docker Scout, Falco, Kube-bench, Kube-hunter |
| `security/api-security` | API protection | Securing endpoints, auth, rate limiting, WAF config | OWASP API Top 10, ModSecurity, Kong, Envoy, API gateways |

## When to Use Each Skill

- **sast-dast**: Every commit — integrate into CI pipeline with fail-on-critical policy. Run DAST on staging before production releases.
- **sbom**: Every build — generate SBOM for every deployable artifact. Store in centralized Dependency-Track instance for continuous monitoring.
- **secrets-management**: Every commit — scan all git history including branches. Block commits containing secrets via pre-commit hooks.
- **container-security**: Every image build — scan base images, all layers, and runtime dependencies. Reject images with critical/high CVEs.
- **api-security**: Every API change — threat model new endpoints, review auth/permission models, load test rate limiting.

## Tool Integration Patterns

### CI/CD Pipeline
```
git push → pre-commit hook (secrets scan)
  → build (sast + sbom generation)
  → image build (container scan)
  → deploy staging (dast on new endpoints)
  → integration tests (api-security checks)
  → deploy production (gate: all scans pass)
```

### Alert and Remediation
- Critical CVE: auto-create security ticket, block deployment, page security team
- Hardcoded secret: auto-revoke (if detected provider), notify committer, rotate immediately
- API abuse detected: auto-rate-limit, log for investigation, alert on-call
- Container critical CVE: rebuild image with patched base, redeploy, notify team

## Data Security

The `security/data-security` skill covers encryption (at rest, in transit, in use), key management (KMS, HSM), data masking (static/dynamic), column-level security, data classification, anonymization, tokenization, and compliance controls for GDPR, CCPA, and HIPAA. It composes with `security/secrets-management` for key rotation and `security/api-security` for encryption-in-transit at the API layer.

| Skill | Stage | When to Use | Tools |
|---|---|---|---|
| `security/data-security` | Data protection | Encrypting data at rest/transit, masking PII, managing keys, classifying data | AWS KMS, HashiCorp Vault, Azure Key Vault, GCP Cloud KMS, HSM, tokenization platforms |

## Complete Security Workflow

```
Source Code ──► SAST ──► SBOM ──► Secrets Scan ──► Container Scan ──► API Security ──► Data Security
   [commit]      [code]     [deps]      [creds]          [image]          [runtime]       [data]
```

```
git push
  ├── pre-commit hook: secrets scan (gitleaks, trufflehog)
  ├── CI build: SAST (semgrep, codeql) + SBOM (syft, grype)
  ├── image build: container scan (trivy, docker scout)
  ├── deploy staging: DAST (zap, burp) on new endpoints
  ├── integration tests: API security checks (OWASP Top 10)
  ├── data classification → encryption + masking rules applied
  └── deploy production (gate: ALL scans pass, ALL data classified)
```

## Tool Comparison Table

| Tool | Category | Best For | Limitations | Cost |
|---|---|---|---|---|
| Semgrep | SAST | Custom rules, multi-language | No DAST | Free OSS / Team paid |
| SonarQube | SAST | Code quality + security | Heavy infra | CE free / DC paid |
| CodeQL | SAST | Deep semantic analysis | GitHub-only ecosystem | Free for OSS |
| OWASP ZAP | DAST | Automated web app scanning | Slower, needs target running | Free |
| Burp Suite | DAST | Manual + automated pentesting | Expensive Pro license | Community free / Pro paid |
| Syft + Grype | SBOM | Fast, OSS, CLI-native | No policy engine built-in | Free |
| Dependency-Track | SBOM | Continuous monitoring, policies | Requires server setup | Free |
| Snyk | SBOM/SAST | Developer-friendly UI, IDE integration | Costly at scale | Free tier / Team paid |
| Gitleaks | Secrets | Git history scanning, fast | No cloud secret auto-revoke | Free |
| TruffleHog | Secrets | Deep content + entropy detection | Slower on large repos | Free OSS / Enterprise paid |
| Trivy | Container | Multi-scan (OS + libs + IaC) | No runtime monitoring | Free |
| Falco | Container | Runtime security monitoring | Complex rule tuning | Free (CNCF) |
| ModSecurity | API/WAF | Open-source WAF | No modern API-specific rules | Free |
| Vault | Data/KMS | Dynamic secrets, encryption as a service | Operational complexity | OSS free / Enterprise paid |

## Compliance Mapping

| Requirement | SOC 2 | GDPR | HIPAA | Applicable Skills |
|---|---|---|---|---|
| Code vulnerability scanning | ✓ | - | ✓ | sast-dast |
| Software bill of materials | ✓ | - | - | sbom |
| Secrets / credential detection | ✓ | ✓ | ✓ | secrets-management |
| Container image hardening | ✓ | - | ✓ | container-security |
| API security / auth controls | ✓ | ✓ | ✓ | api-security |
| Encryption at rest | ✓ | ✓ | ✓ | data-security |
| Encryption in transit | ✓ | ✓ | ✓ | data-security + api-security |
| Data classification | ✓ | ✓ | ✓ | data-security |
| Access controls (RBAC) | ✓ | ✓ | ✓ | data-security |
| Audit logging | ✓ | ✓ | ✓ | all skills + observability |
| PII detection / redaction | - | ✓ | ✓ | data-security, ai/ai-safety |
| Breach notification | ✓ | ✓ | ✓ | incident-response |
| Vendor risk management | ✓ | - | ✓ | sbom |
| Data retention / deletion | - | ✓ | ✓ | data-security |
| BAA agreements | - | - | ✓ | compliance-audit |

## Best Practices
- SAST before SBOM — fix your own code before worrying about dependency issues
- Secrets scanning runs on every push, not just merges — credentials in feature branches still count
- Container images should be rebuilt regularly even without code changes — base images get CVEs over time
- DAST complements SAST — SAST finds issues in code, DAST finds issues in deployed configuration
- API security is not a one-time review — every endpoint change should trigger a security review
- Data security must start with classification — you cannot protect what you have not categorized
- Encrypt data in transit AND at rest — one without the other leaves a gap
- Map each security control to a compliance requirement — gaps become visible
- All tools should have a "fail open" mode — if the scanner itself fails, the pipeline should not block the entire deployment
- Rotate keys and secrets on a schedule, not just on incident — automated rotation reduces blast radius

## Quick Reference: All Security Skills

| Skill | Stage | Purpose |
|---|---|---|
| `security/sast-dast` | Code & runtime | Static/dynamic vulnerability scanning |
| `security/sbom` | Dependencies | Software bill of materials, CVE tracking |
| `security/secrets-management` | Credentials | Hardcoded key/token/password detection |
| `security/container-security` | Images | Container image hardening, K8s security |
| `security/api-security` | APIs | Endpoint security, auth, rate limiting, WAF |
| `security/data-security` | Data | Encryption, key management, masking, classification |

## Skills List
- `skills/security/sast-dast/SKILL.md`
- `skills/security/sbom/SKILL.md`
- `skills/security/secrets-management/SKILL.md`
- `skills/security/container-security/SKILL.md`
- `skills/security/api-security/SKILL.md`
- `skills/security/data-security/SKILL.md`
