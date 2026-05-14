# Pentest Findings Library

## OWASP Top 10 Findings

| ID | Category | Finding | CVSS | Typical Fix |
|---|---|---|---|---|
| INJ-001 | Injection | SQLi in search parameter | 9.8 | Parameterized queries |
| INJ-002 | Injection | NoSQLi in JSON body | 8.1 | Input sanitization |
| AUTH-001 | Broken Auth | JWT no signature verification | 9.1 | Verify `alg: RS256` |
| AUTH-002 | Broken Auth | Session not invalidated on logout | 6.5 | Server-side session invalidation |
| XSS-001 | XSS | Stored XSS in comment field | 7.2 | Output encoding |
| IDOR-001 | IDOR | User can access other user's orders | 8.6 | Ownership check |
| SSRF-001 | SSRF | URL parameter accepts internal IPs | 8.8 | Block private IP ranges |
| CRYPTO-001 | Crypto | TLS 1.0 enabled | 5.0 | Disable old TLS versions |
| CONFIG-001 | Misconfig | Debug endpoint enabled in prod | 5.3 | Disable debug in production |
| AUTHZ-001 | Broken Access | Admin API accessible by user role | 7.5 | RBAC enforcement |

## Remediation Priority
- Critical + High: Fix immediately, block release.
- Medium: Fix within 30 days.
- Low: Fix within 90 days or accept risk.
