---
name: penetration-testing
description: >
  Penetration Testing — structured methodology, tools, and reporting for web application,
  network, cloud, and API penetration tests. Use when the user asks about penetration testing,
  pentest, ethical hacking, Burp Suite, OWASP, exploit, vulnerability assessment, red team,
  or security testing methodology.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, penetration-testing, pentest, phase-8]
---

# Penetration Testing

## Purpose
Conduct structured penetration tests following industry-standard methodology (PTES, OWASP, OSSTMM) covering web applications, network infrastructure, cloud environments, APIs, and reporting with actionable remediation guidance.

## Agent Protocol

### Trigger
- "penetration testing", "pentest", "ethical hacking", "vulnerability assessment"
- "OWASP", "Burp Suite", "ZAP", "Metasploit", "Nmap", "Nessus"
- "web app pentest", "API pentest", "network pentest", "cloud pentest"
- "red team", "adversarial simulation", "exploit", "privilege escalation"
- "SQL injection", "XSS", "SSRF", "RCE", "Active Directory attack"
- "CVSS", "pentest report", "remediation", "retesting"

### Input Context
- Scope: web app URL, API endpoints, network ranges, cloud accounts
- Authentication details (if any) and role levels
- Threat model and business impact context
- Previous pentest reports for regression

### Output Artifact
- Pentest plan (scope, rules of engagement, methodology), technical findings with CVSS scores, evidence artifacts, executive summary report, remediation roadmap

### Response Format
```
## Executive Summary
{ business context, risk profile, key findings }

## Technical Findings
| ID | Finding | CVSS | Impact | Remediation |
|----|---------|------|--------|-------------|

## Methodology
{ Phases performed, tools used, techniques }
```

### Completion Criteria
- [ ] Rules of engagement defined and approved
- [ ] All phases completed: recon, scanning, exploitation, post-exploitation
- [ ] All findings documented with CVSSv3.1 scores and evidence
- [ ] Executive summary written for non-technical stakeholders
- [ ] Remediation recommendations provided with priority order
- [ ] Retesting window defined and scheduled

## Workflow

1. **Planning** — Define scope, RoE, threat model, test types (black/gray/white box)
2. **Reconnaissance** — Passive (OSINT, DNS, Shodan) and active (Nmap, crawlers) recon
3. **Scanning** — Vulnerability scanning (Nessus, Nuclei), service enumeration
4. **Exploitation** — Web (SQLi, XSS, SSRF), network (AD attacks, relay), cloud (IAM enum)
5. **Post-Exploitation** — Privilege escalation, lateral movement, persistence, data access
6. **Reporting** — Findings with CVSS, evidence, remediation, executive summary
7. **Remediation & Retest** — Track fixes, verify remediation, close findings

## Rules
- Never test outside authorized scope
- Use separate test accounts with documented approval
- Stop immediately if production data exposure is detected
- All findings must include reproducible steps and evidence
- CVSS scores must be calculated using CVSSv3.1 methodology
- Retesting must verify all remediated findings

## References
- `references/methodology-phases.md` — Pentest phases: recon through reporting
- `references/web-app-testing.md` — Web application testing: OWASP Top 10, Burp Suite, ZAP
- `references/network-pentest.md` — Network penetration testing: AD, Kerberos, pivot tunnels
- `references/cloud-pentest.md` — Cloud pentesting: AWS, Azure, GCP specific attacks
- `references/reporting-template.md` — Pentest reporting with executive summary and CVSS

## Handoff
Pentest findings can be handed to development for code fixes, infrastructure for network remediation, and management for risk acceptance decisions.
