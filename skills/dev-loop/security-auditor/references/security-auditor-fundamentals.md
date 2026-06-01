# Security Auditor Fundamentals

## Overview
Security auditing systematically examines an application for vulnerabilities, misconfigurations, and insecure practices. A structured approach ensures coverage across all attack surfaces.

## Core Concepts

### Concept 1: Threat Modeling
STRIDE per component: Spoofing (auth bypass), Tampering (data modification), Repudiation (audit log gaps), Information Disclosure (data leaks), Denial of Service (rate limits), Elevation of Privilege (authz bypass). Diagram data flows and trust boundaries.

### Concept 2: OWASP Top 10
Prioritized web app risks: Broken Access Control, Cryptographic Failures, Injection (XSS, SQLi), Insecure Design, Security Misconfiguration, Vulnerable Components, Auth Failures, Data Integrity Failures, Logging/Monitoring, SSRF. Check each against the application.

### Concept 3: Dependency Scanning
SCA (Software Composition Analysis) for known CVEs: npm audit, cargo audit, pip-audit, Dependabot, Renovate, Grype, Trivy. Scan runtime dependencies, dev dependencies, and container images. Correlate CVSS score with exploitability.

### Concept 4: SAST and DAST
SAST (Static Analysis Security Testing): scans source code (Semgrep, CodeQL, SonarQube, ESLint plugin security). DAST (Dynamic Analysis Security Testing): tests running app (ZAP, Burp Suite, Nuclei). SAST catches issues early, DAST validates runtime behavior.

### Concept 5: Least Privilege
Every component should have minimum necessary permissions: IAM roles (read-only vs write), database accounts (read-only service accounts), API tokens (scoped scopes), network rules (ingress/egress restrictions), and secrets management (Vault, Key Vault).

## Best Practices

- Threat model before implementation
- Scan dependencies before each release
- Run SAST in CI (gate on critical/high issues)
- DAST on staging before production
- Principle of least privilege everywhere
- Validate all inputs (length, type, range)
- Use parameterized queries (prevent injection)
- Keep dependencies updated (no known CVEs)
- Log security events (audit trail)
- Regular penetration testing schedule

## Anti-Patterns

- Security as afterthought (no threat model)
- No dependency scanning (supply chain attacks)
- Ignoring SAST findings (noise without fix plan)
- Admin-level service accounts everywhere
- Secrets in source code / environment variables
- Roll-your-own crypto (DO NOT implement algorithms)
- No rate limiting (DDoS vulnerability)
- Missing CORS configuration (wide-open API)
- Not updating dependencies (unpatched CVEs)
