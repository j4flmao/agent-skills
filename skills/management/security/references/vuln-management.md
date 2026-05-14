# Vulnerability Management Reference

## Severity Matrix

| Severity | CVSS 3.1 | Impact | Exploitability | SLA | Escalation |
|---|---|---|---|---|---|
| **Critical** | 9.0-10.0 | Remote code execution, data breach | Public exploit available | 24 hours | CISO |
| **High** | 7.0-8.9 | Privilege escalation, sensitive data exposure | Exploit likely | 7 days | Security lead |
| **Medium** | 4.0-6.9 | Limited data access, DoS | Exploit possible | 30 days | Engineering manager |
| **Low** | 0.1-3.9 | Minimal impact | Exploit unlikely | 90 days | Team lead |
| **Info** | 0.0 | No direct risk | N/A | Backlog | — |

## Triage Workflow

```
FINDING → Triage (15 min) → Severity assigned
                           → Critical/High → Incident response
                           → Medium/Low → Ticket created
                                         → Assigned to owner
                                         → Fix implemented
                                         → Re-test → Closed
```

## Remediation Tracking

```markdown
# Vulnerability Report
## Summary
- **Total findings:** 12
- **Critical:** 1 (broken)
- **High:** 3 (planned)
- **Medium:** 5 (planned)
- **Low:** 3 (accepted)

## Findings
| ID | Title | Severity | Status | Owner | Due | Notes |
|---|---|---|---|---|---|---|
| VULN-001 | SQL Injection in Order Search | Critical | Fixed | alice | 2026-05-15 | Parameterized queries applied |
| VULN-002 | Weak TLS Cipher | High | In Progress | bob | 2026-05-20 | Config change in progress |
| VULN-003 | Missing CSP Header | Medium | Accepted | — | — | WAF handles CSP; accept risk |
```
