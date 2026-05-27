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
      - "SAST scanning in CI (Semgrep, SonarQube)"
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
      - "Security champions program with rotating members"
      - "Regular penetration testing (annual minimum)"
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
      - "Supply chain security program (SBOM, attestation)"
    target_org: "Enterprise, 200+ engineers, multi-compliance framework"
```

### Security Tool Selection Framework

```yaml
tool_selection:
  saST:
    when_to_adopt: "Level 2+ — as soon as you have CI pipeline"
    selection_criteria: ["Language coverage", "False positive rate", "Custom rule support", "CI integration"]
    options:
      starter: "Semgrep — free, multi-language, custom rules, low false positives"
      enterprise: "CodeQL — deep analysis, GitHub integration, wider coverage"
      
  daST:
    when_to_adopt: "Level 3 — once you have staging environment with realistic data"
    selection_criteria: ["Authentication support", "API scanning capability", "Scalability"]
    options:
      free: "OWASP ZAP — automated scanning, API support"
      commercial: "Burp Suite Enterprise — deeper analysis, CI integration"
      
  sca:
    when_to_adopt: "Level 2 — immediately, no infrastructure needed"
    selection_criteria: ["Dependency graph coverage", "CVE database freshness", "Fix recommendations"]
    options:
      starter: "Dependabot (GitHub native) + Trivy (container scanning)"
      enterprise: "Snyk — broader coverage, prioritization, fix PRs"
      
  secret_detection:
    when_to_adopt: "Level 2 — before first git commit in shared repo"
    selection_criteria: ["Pre-commit hooks", "Historical scan", "False positive rate"]
    options:
      free: "Gitleaks — fast, effective, pre-commit + CI scanning"
      enterprise: "TruffleHog — deep scanning, entropy detection, integration"
      
  iaC_scanning:
    when_to_adopt: "Level 2+ — when using Terraform, CloudFormation, Helm"
    options: ["Checkov — broad cloud coverage, Kubernetes support", "tfsec — Terraform-specific, fast"]
```

### Vendor Security Assessment

```yaml
vendor_assessment:
  tiers:
    tier_1_low_risk:
      description: "No access to customer data, internal tooling only"
      assessment: "Self-attestation questionnaire (SOC2, ISO 27001 status)"
      examples: ["Internal communication tool", "Project management software"]
      
    tier_2_medium_risk:
      description: "Access to non-sensitive business data"
      assessment: "Security questionnaire + SOC2 report review"
      examples: ["CRM", "Marketing automation", "HR system"]
      
    tier_3_high_risk:
      description: "Access to PII, payment data, or customer infrastructure"
      assessment: "Full security review: questionnaire + SOC2 review + penetration test + architecture review"
      examples: ["Cloud infrastructure provider", "Payment processor", "Data warehouse"]
      
  assessment_items:
    - "Data encryption at rest and in transit"
    - "Access control and identity management"
    - "Incident response process and SLA"
    - "Subprocessor list and their assessments"
    - "Data retention and deletion policies"
    - "Compliance certifications (SOC2, ISO 27001, PCI DSS)"
    - "Business continuity and disaster recovery"
    - "Penetration testing frequency and findings"
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
- Vendor security assessments should be tiered by risk — don't apply same rigor to all vendors

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
  - references/security-advanced.md — Security Advanced Topics
  - references/security-fundamentals.md — Security Fundamentals
  - references/security-policy.md — Security Policy
  - references/security-review-checklist.md — Security Review Checklist
  - references/security-training.md — Security Training
  - references/vuln-management.md — Vulnerability Management Reference
## Handoff

Hand off to `management/pentesting/SKILL.md` for pentest execution and reporting. Hand off to `management/alerting/SKILL.md` for security alert rule configuration.
