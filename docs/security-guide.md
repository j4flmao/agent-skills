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

## Best Practices
- SAST before SBOM — fix your own code before worrying about dependency issues
- Secrets scanning runs on every push, not just merges — credentials in feature branches still count
- Container images should be rebuilt regularly even without code changes — base images get CVEs over time
- DAST complements SAST — SAST finds issues in code, DAST finds issues in deployed configuration
- API security is not a one-time review — every endpoint change should trigger a security review
- All tools should have a "fail open" mode — if the scanner itself fails, the pipeline should not block the entire deployment

## Skills List
- `skills/security/sast-dast/SKILL.md`
- `skills/security/sbom/SKILL.md`
- `skills/security/secrets-management/SKILL.md`
- `skills/security/container-security/SKILL.md`
- `skills/security/api-security/SKILL.md`
