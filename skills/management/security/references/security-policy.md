# Security Policy

## Policy Scope

This policy applies to all systems, data, and personnel within the organization's IT environment: production systems, development and staging environments, source code repositories, CI/CD pipelines, employee workstations, mobile devices, and third-party services processing company data.

## Access Control Policy

### Principle of Least Privilege
- Every user and service account has the minimum permissions required to function
- Access reviews conducted quarterly for all production systems
- Orphaned accounts revoked within 24 hours of identification
- Service accounts: no interactive login, scoped to single service

### Authentication Requirements
- Password policy: minimum 12 characters, hashed with bcrypt/argon2, no rotation requirement (NIST SP 800-63B)
- MFA required for: all production access, admin panels, cloud provider consoles, VPN, source code management
- SSO enforced for internal tools (SAML/OIDC)
- API authentication: JWT with RS256 or OAuth2, short-lived tokens (< 15 min), refresh token rotation

### Authorization
- RBAC with clearly defined roles (admin, developer, operator, read-only)
- No shared accounts — every action traced to a specific human
- API keys scoped to specific resources and actions
- Just-in-time access for production — temporary elevation with approval

## Data Protection Policy

### Data Classification

| Level | Examples | Storage | Transmission |
|-------|----------|---------|-------------|
| Public | Marketing content, docs | No restrictions | TLS |
| Internal | Source code, internal docs | Access control | TLS |
| Confidential | Customer data, financial records | Encryption at rest (AES-256) | TLS 1.2+ |
| Restricted | PII, credentials, secrets | Encryption + access logging | TLS 1.3, mutual TLS |

### Data Handling Rules
- PII must be minimized — collect only what is needed
- Customer data never stored on local machines
- Production data never used in non-production without anonymization
- Data retention and deletion policies enforced automatically
- Encryption at rest: AES-256 for all confidential and restricted data
- Encryption in transit: TLS 1.2 minimum, TLS 1.3 preferred

## Vulnerability Management Policy

| Severity | CVSS Range | Remediation SLA | Notification |
|----------|------------|-----------------|--------------|
| Critical | 9.0-10.0 | 24 hours | CISO + team lead |
| High | 7.0-8.9 | 7 days | Security team |
| Medium | 4.0-6.9 | 30 days | Engineering owner |
| Low | 0.1-3.9 | 90 days | Backlog |

### Scanning Requirements
- SAST scan on every PR (Semgrep, CodeQL)
- Dependency scan on every build (Dependabot, Snyk, Trivy)
- DAST scan weekly (OWASP ZAP)
- Secret detection on every commit (pre-commit hook + CI)
- Container image scan on every build (Trivy, Grype)
- IaC scan on every infrastructure change (Checkov, tfsec)

## Incident Response Policy

| Severity | Definition | Response Team | Escalation |
|----------|------------|---------------|------------|
| SEV1 | Data breach, active exploitation, service outage | Full security team | CISO immediate |
| SEV2 | Critical vulnerability, policy violation | Security + DevOps | CISO < 4h |
| SEV3 | Configuration issue, low-risk finding | Security engineer | Security lead < 24h |
| SEV4 | Informational | Assigned owner | No escalation |

### Post-Mortem Requirements
- Completed within 48 hours of resolution
- Blameless — focus on systems and processes
- Action items with owners and deadlines
- Shared with the entire engineering organization
- Tracked in incident register for trend analysis

## Compliance Mapping

| Control | SOC 2 | HIPAA | PCI-DSS | GDPR |
|---------|-------|-------|---------|------|
| Access control | CC6.1 | §164.312(a)(1) | Req 7 | Art 32 |
| Encryption | CC6.7 | §164.312(e)(2)(ii) | Req 4 | Art 32 |
| Audit logging | CC7.2 | §164.312(b) | Req 10 | Art 30 |
| Incident response | CC7.3 | §164.308(a)(6) | Req 12 | Art 33 |
| Vulnerability management | CC7.1 | §164.308(a)(1) | Req 11 | Art 32 |
| Data retention | — | §164.316(b)(2) | — | Art 5 |
| Vendor management | CC9.2 | §164.308(b) | Req 12 | Art 28 |

## Policy Enforcement

- Violation of this policy may result in disciplinary action up to termination
- Exceptions require written approval from CISO with documented compensating controls
- Policy reviewed and updated annually
- All employees complete security awareness training annually
- Automated policy enforcement via CI/CD gates and infrastructure-as-code
