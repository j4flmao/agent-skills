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
Produce the artifact directly. No preamble. No postamble. No explanations. Compress output.

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

| SDLC Phase | Gate | Artifact | Owner |
|---|---|---|---|
| Requirements | Threat modeling | STRIDE diagram | Security engineer |
| Design | Architecture review | Data flow diagram | Security lead |
| Development | SAST scan | Scan report | Dev team |
| Testing | DAST + dependency scan | Vulnerability report | QA + Security |
| Release | Security sign-off | Approval ticket | Security lead |
| Operations | Continuous monitoring | Alerts dashboard | DevOps + Security |

### Step 2: Establish Vulnerability Severity Matrix
Define CVSS ranges, remediation SLAs, and notification paths per severity level.

| Severity | CVSS Range | Remediation SLA | Notification |
|---|---|---|---|
| Critical | 9.0-10.0 | 24 hours | CISO + team lead |
| High | 7.0-8.9 | 7 days | Security lead |
| Medium | 4.0-6.9 | 30 days | Ticket assigned |
| Low | 0.1-3.9 | 90 days | Backlog |

### Step 3: Create Incident Response Plan
Define severity levels, response team assignments, escalation paths, and the 6-step response flow.

```
P0: Data breach, active exploitation — Full security team — CISO immediate
P1: Critical vulnerability discovered — Security + DevOps — CISO <4 hours
P2: Policy violation, misconfiguration — Security engineer — Security lead <24h
P3: Low-risk finding — Assigned owner — No escalation

Response Flow:
1. Detect — alert, user report, scan finding, external disclosure
2. Triage — confirm, classify severity, assign owner (15 min SLA)
3. Contain — disable feature, block IP, revoke keys, rollback
4. Investigate — root cause, impact scope, data accessed
5. Remediate — fix, test, deploy
6. Post-mortem — within 48 hours, blameless
```

### Step 4: Select Tool Stack
Choose SAST, DAST, SCA, secret detection, container scan, IaC scan, cloud security, and SIEM tools.

| Category | Tool | Integration |
|---|---|---|
| SAST | SonarQube, Semgrep, CodeQL | CI pipeline, PR gate |
| DAST | OWASP ZAP, Burp Suite | Staging environment, scheduled |
| SCA | Dependabot, Snyk, Trivy | CI pipeline, automated PR |
| Secret Detection | GitLeaks, TruffleHog | Pre-commit hook, CI scan |
| Container Scan | Trivy, Clair, Grype | Registry scan, deploy gate |
| IaC Scan | Checkov, tfsec, Kics | Terraform/Helm CI pipeline |
| Cloud Security | CloudSploit, Prowler | Scheduled scan |
| SIEM | Wazuh, Elastic Security | Log aggregation |

### Step 5: Map Compliance Controls
Map security controls to applicable compliance frameworks (SOC2, HIPAA, PCI-DSS, GDPR).

### Step 6: Establish Security Champions Program
Designate security champions in each dev team for embedded security practices. Champions are embedded developers who spend 10-20% of time on security activities: reviewing designs for security concerns, triaging vulnerability findings, conducting security reviews of team changes, advocating for security tooling and practices. Provide champions with training, tools access, and a community of practice with monthly syncs.

### Step 7: Implement Vulnerability Management Lifecycle
Full lifecycle: discover (scanning, pentesting, bug bounty, disclosure), triage (verify, prioritize, assign), track (register with severity, SLA, owner), fix (implement fix, code review), verify (retest, confirm fix), close (update register, document lessons), report (metrics on time-to-fix, vulnerability aging). Review the register weekly.

### Step 8: Conduct Threat Modeling
Use STRIDE per feature or significant change: Spoofing (can someone impersonate?), Tampering (can data be modified?), Repudiation (can actions be denied?), Information Disclosure (can data leak?), Denial of Service (can service be disrupted?), Elevation of Privilege (can access be escalated?). Document threats, rate likelihood and impact, define mitigations, track to closure.

### Step 9: Design Security Training Program
Define mandatory training per role: all-hands security awareness (annual), developers (secure coding, OWASP Top 10, quarterly), DevOps (cloud security, CI/CD security, semi-annual), security team (advanced topics, continuous). Use internal incidents as case studies. Track completion rates. Test knowledge with phishing simulations and secure coding challenges.

### Step 10: Measure Security Effectiveness
Track KPIs: mean time to remediate (MTTR) by severity, vulnerability age (average days open), scan coverage (% of repos with SAST/SCA), false positive rate, security training completion rate, pentest finding density (findings per test hour), incident count by severity, time to detect and contain incidents.

## Security Governance Framework

### Security Program Maturity Levels

```yaml
security_maturity:
  level_1_ad_hoc:
    description: "Security is reactive — only addressed when incident occurs"
    characteristics:
      - "No dedicated security team"
      - "No security review process"
      - "Vulnerabilities found by accident or after breach"
    target_org: "Startup pre-product-market fit, <10 engineers"

  level_2_baseline:
    description: "Basic security practices established"
    characteristics:
      - "Security champion(s) embedded in dev teams"
      - "SAST scanning in CI"
      - "Dependency scanning enabled"
      - "Incident response plan documented"
      - "Basic security training for developers"
    target_org: "Growing startup, <50 engineers, SOC2 readiness"

  level_3_embedded:
    description: "Security integrated into SDLC"
    characteristics:
      - "Security review gates at every SDLC phase"
      - "Threat modeling for all architecture changes"
      - "DAST scanning in staging environments"
      - "Vulnerability management program with SLAs"
      - "Security champions program"
      - "Regular penetration testing"
    target_org: "Mid-market, 50-200 engineers, SOC2/HIPAA compliance"

  level_4_proactive:
    description: "Security anticipates and prevents threats"
    characteristics:
      - "Threat intelligence integration"
      - "Bug bounty program"
      - "Automated security testing in CI/CD pipeline"
      - "Continuous compliance monitoring"
      - "Security architecture review for all significant changes"
      - "Incident response drills and tabletop exercises"
      - "Supply chain security program"
    target_org: "Enterprise, 200+ engineers, multi-compliance framework"
```

### Security Tool Selection Framework

```yaml
tool_selection:
  saST:
    when_to_adopt: "Level 2+ — as soon as you have CI pipeline"
    options:
      starter: "Semgrep — free, multi-language, custom rules, low false positives"
      enterprise: "CodeQL — deep analysis, GitHub integration, wider coverage"

  daST:
    when_to_adopt: "Level 3 — once you have staging with realistic data"
    options:
      free: "OWASP ZAP — automated scanning, API support"
      commercial: "Burp Suite Enterprise — deeper analysis, CI integration"

  sca:
    when_to_adopt: "Level 2 — immediately, no infrastructure needed"
    options:
      starter: "Dependabot (GitHub native) + Trivy (container scanning)"
      enterprise: "Snyk — broader coverage, prioritization, fix PRs"

  secret_detection:
    when_to_adopt: "Level 2 — before first git commit in shared repo"
    options:
      free: "Gitleaks — fast, effective, pre-commit + CI scanning"
      enterprise: "TruffleHog — deep scanning, entropy detection"
```

### Vendor Security Assessment

```yaml
vendor_assessment:
  tier_1_low_risk:
    description: "No access to customer data, internal tooling only"
    assessment: "Self-attestation questionnaire"
    examples: ["Internal communication tool", "Project management software"]

  tier_2_medium_risk:
    description: "Access to non-sensitive business data"
    assessment: "Security questionnaire + SOC2 report review"
    examples: ["CRM", "Marketing automation", "HR system"]

  tier_3_high_risk:
    description: "Access to PII, payment data, or customer infrastructure"
    assessment: "Full security review: questionnaire + SOC2 + pentest + architecture review"
    examples: ["Cloud infrastructure provider", "Payment processor"]
```

## Common Pitfalls

1. **Security as a gate at the end** — Reviewing security only before release creates tension and delays. Fix: embed security at every SDLC phase.
2. **Tooling without process** — Buying a SAST tool and expecting security to improve without a triage process. Fix: define who triages findings, SLA for fixes, and escalation for failures.
3. **False positive neglect** — Teams overwhelmed by false positives ignore all findings. Fix: tune tools, document false positives, suppress known-safe patterns.
4. **No security champions** — Security team is a bottleneck for all security decisions. Fix: train and empower embedded champions.
5. **Pentest as compliance checkbox** — Running a pentest to satisfy auditors without fixing findings. Fix: track remediation of pentest findings with SLAs and verification.
6. **Incident response untested** — Plans exist but have never been drilled. Fix: run tabletop exercises quarterly. Test the plan, not just the technology.
7. **Secret scanning without rotation** — Finding secrets in git but fixing only by removing them. Fix: rotated exposed secrets immediately before removing them.
8. **Training as checkbox** — Annual slide-deck security training with no engagement. Fix: role-specific, interactive training with real incidents as case studies.
9. **Shadow IT** — Teams adopting tools without security review. Fix: make security approval easy and fast, or teams will bypass it.
10. **Compliance vs security** — Focusing on compliance checklists rather than actual risk reduction. Fix: use compliance as a baseline, not a ceiling.

## Best Practices

- Security review is required at every SDLC phase — no phase can be skipped
- Critical vulnerabilities require CISO notification within 24 hours
- Incident post-mortem must be completed within 48 hours and be blameless
- All SAST findings in CI must be triaged before merge
- Secrets detected in git must be rotated immediately, not just removed
- Third-party dependencies must be scanned for CVEs on every build
- Access to production secrets requires approval and is logged
- Security maturity should match organizational size and compliance requirements
- Vendor security assessments should be tiered by risk
- Train security champions in each dev team for embedded security
- Test incident response plans with tabletop exercises quarterly
- Track vulnerability aging and MTTR as key security metrics

## Compared With

| Approach | Strengths | Weaknesses |
|---|---|---|
| SDLC Gates (this skill) | Integrated, systematic | Requires organizational buy-in |
| Bug Bounty Only | Cost-effective, crowd-sourced | Reactive, no proactive prevention |
| Compliance-Driven | Structured, auditable | May miss real risks |
| DevSecOps | Automated, fast feedback | Tool-heavy, needs culture change |
| Penetration Test Only | Deep findings per test | Point-in-time, periodic |
| Threat Modeling Focused | Proactive, architectural | Requires expertise, time-intensive |

## Vulnerability Management Workflow

```
Discovery:
  ├── Automated scanning (SAST, DAST, SCA, container scan)
  ├── Penetration testing (scheduled)
  ├── Bug bounty program (continuous)
  └── External disclosure (user reports, security researchers)

Triage (within 24h of discovery):
  ├── Verify finding is valid (not false positive)
  ├── Assign severity using CVSS 3.1
  ├── Identify affected systems and data
  ├── Determine exploitability in current context
  └── Assign to appropriate team with SLA

Fix and Verify:
  ├── Develop fix following secure coding guidelines
  ├── Code review with security focus
  ├── Test fix in staging environment
  ├── Deploy to production with monitoring
  └── Retest to confirm vulnerability is resolved

Close and Report:
  ├── Update vulnerability register with resolution details
  ├── Document lessons learned
  └── Report metrics: time-to-fix, vulnerability aging, trends
```

## Incident Response Drill Template

```
## Tabletop Exercise: {scenario}
Date: {date} | Participants: {list}

Scenario: {description of simulated incident}

Timeline:
  T+0min: Incident detected — who detects it and how?
  T+5min: Triage — what is the severity? Who is notified?
  T+15min: Containment — what actions are taken to stop the bleeding?
  T+60min: Investigation — what is the root cause and impact scope?
  T+120min: Remediation — what fix is deployed?
  T+48hr: Post-mortem — what are the lessons learned?

Observations:
  - What went well: {list}
  - What went wrong: {list}
  - Action items: {list with owners and deadlines}
```

## Rules

- Security review is required at every SDLC phase — no phase can be skipped
- Critical vulnerabilities require CISO notification within 24 hours
- Incident post-mortem must be completed within 48 hours and be blameless
- All SAST findings in CI must be triaged before merge
- Secrets detected in git must be rotated immediately, not just removed
- Third-party dependencies must be scanned for CVEs on every build
- Access to production secrets requires approval and is logged
- Security maturity should match organizational size and compliance requirements
- Vendor security assessments should be tiered by risk
- Vulnerability management must track SLAs per severity
- Incident response plans must be tested quarterly
- Security champions must receive dedicated training and support
- Security tool false positives must be documented and tuned
- Compliance is a baseline, not a security strategy

## References
  - references/security-advanced.md — Security Advanced Topics
  - references/security-fundamentals.md — Security Fundamentals
  - references/security-policy.md — Security Policy
  - references/security-review-checklist.md — Security Review Checklist
  - references/security-training.md — Security Training
  - references/vuln-management.md — Vulnerability Management Reference

## Handoff
Hand off to `management/pentesting/SKILL.md` for pentest execution and reporting.
Hand off to `management/alerting/SKILL.md` for security alert rule configuration.
