---
name: security
description: >
  Use this skill when the user asks about security team operations, AppSec,
  vulnerability management, security review, threat modeling, security incident
  response, CVE, or compliance.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, security, phase-8]
---

# Security Team

## Purpose
Define security team operations including vulnerability management, security review gates, incident response, tool selection, and compliance mapping.

## Agent Protocol

### Trigger
User request includes: `security team`, `appsec`, `vulnerability`, `security review`, `threat model`, `security incident`, `cve`, `pentest`, `compliance`, `sdlc`.

### Input Context
- Team structure (dedicated security, embedded, or none)
- Current security posture (maturity level)
- Technology stack (for tool-specific recommendations)
- Compliance requirements (SOC2, HIPAA, PCI-DSS, GDPR)
- Recent incidents or findings

### Output Artifact
A markdown document containing:
- Security review process (threat modeling, code review, pentest schedule)
- Vulnerability management workflow (triage, fix, verify, close)
- Security incident response plan
- Tool recommendations (SAST, DAST, SCA, dependency scanning)
- Compliance mapping (controls mapped to frameworks)
- Security champions program

### Response Format
Produce the artifact directly. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

——

### Completion Criteria
- Security review process includes gates per SDLC phase
- Vulnerability management has severity matrix with SLA
- Incident response has severity levels and contact tree
- Tool recommendations include integration points
- Compliance controls mapped to specific standards

### Max Response Length
4096 tokens

## Workflow

### Step 1: Define Security Review Gates
Map security activities to each SDLC phase from requirements through operations.

### Step 2: Establish Vulnerability Severity Matrix
Define CVSS ranges, remediation SLAs, and notification paths per severity level.

### Step 3: Create Incident Response Plan
Define severity levels, response team assignments, escalation paths, and the 6-step response flow.

### Step 4: Select Tool Stack
Choose SAST, DAST, SCA, secret detection, container scan, IaC scan, cloud security, and SIEM tools.

### Step 5: Map Compliance Controls
Map security controls to applicable compliance frameworks (SOC2, HIPAA, PCI-DSS, GDPR).

### Step 6: Establish Security Champions Program
Designate security champions in each dev team for embedded security practices.

## Rules

- Security review is required at every SDLC phase — no phase can be skipped
- Critical vulnerabilities require CISO notification within 24 hours
- Incident post-mortem must be completed within 48 hours and be blameless
- All SAST findings in CI must be triaged before merge
- Secrets detected in git must be rotated immediately, not just removed
- Third-party dependencies must be scanned for CVEs on every build
- Access to production secrets requires approval and is logged

## Security Review Gates

| SDLC Phase | Gate | Artifact | Owner |
|---|---|---|---|
| **Requirements** | Threat modeling | STRIDE diagram | Security engineer |
| **Design** | Architecture review | Data flow diagram | Security lead |
| **Development** | SAST scan | Scan report | Dev team |
| **Testing** | DAST + dependency scan | Vulnerability report | QA + Security |
| **Release** | Security sign-off | Approval ticket | Security lead |
| **Operations** | Continuous monitoring | Alerts dashboard | DevOps + Security |

## Vulnerability Severity Matrix

| Severity | CVSS Range | Remediation SLA | Notification |
|---|---|---|---|
| **Critical** | 9.0-10.0 | 24 hours | CISO + team lead |
| **High** | 7.0-8.9 | 7 days | Security lead |
| **Medium** | 4.0-6.9 | 30 days | Ticket assigned |
| **Low** | 0.1-3.9 | 90 days | Backlog |

## Security Incident Response

### Severity Levels

| Level | Description | Response Team | Escalation |
|---|---|---|---|
| **P0** | Data breach, active exploitation | Full security team | CISO immediate |
| **P1** | Critical vulnerability discovered | Security + DevOps | CISO <4 hours |
| **P2** | Policy violation, misconfiguration | Security engineer | Security lead <24h |
| **P3** | Low-risk finding | Assigned owner | No escalation |

### Response Flow

1. **Detect** — alert, user report, scan finding, external disclosure
2. **Triage** — confirm, classify severity, assign owner (15 min SLA)
3. **Contain** — disable feature, block IP, revoke keys, rollback
4. **Investigate** — root cause, impact scope, data accessed
5. **Remediate** — fix, test, deploy
6. **Post-mortem** — within 48 hours, blameless

## Tool Stack

| Category | Tool | Integration |
|---|---|---|
| **SAST** | SonarQube, Semgrep, CodeQL | CI pipeline, PR gate |
| **DAST** | OWASP ZAP, Burp Suite | Staging environment, scheduled |
| **SCA** | Dependabot, Snyk, Trivy | CI pipeline, automated PR |
| **Secret Detection** | GitLeaks, TruffleHog | Pre-commit hook, CI scan |
| **Container Scan** | Trivy, Clair, Grype | Registry scan, deploy gate |
| **IaC Scan** | Checkov, tfsec, Kics | Terraform/Helm CI pipeline |
| **Cloud Security** | CloudSploit, Prowler | Scheduled scan |
| **SIEM** | Wazuh, Elastic Security, Sentinel | Log aggregation |

## References

### Reference Files
- `references/security-review-checklist.md` — Detailed security review checklist per SDLC phase
- `references/vuln-management.md` — Vulnerability management workflow and severity definitions

### Related Skills
- `management/pentesting/SKILL.md` — Penetration testing report standards
- `management/alerting/SKILL.md` — Security alert rule design
- `devops/monitoring/SKILL.md` — Monitoring and SIEM integration
- `devops/cicd-pipeline/SKILL.md` — Security gates in CI/CD

## Handoff

Hand off to `management/pentesting/SKILL.md` for pentest execution and reporting. Hand off to `management/alerting/SKILL.md` for security alert rule configuration.
