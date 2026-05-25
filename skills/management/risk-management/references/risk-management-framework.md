# Risk Management Framework

## ISO 31000 Framework

ISO 31000 provides principles, framework, and process for managing risk. It is principles-based rather than prescriptive.

### Core Principles
- Risk management creates and protects value
- Risk management is an integral part of all organizational processes
- Risk management is part of decision-making
- Risk management explicitly addresses uncertainty
- Risk management is systematic, structured, and timely
- Risk management is based on the best available information
- Risk management is tailored to the organization
- Risk management takes human and cultural factors into account
- Risk management is transparent and inclusive
- Risk management is dynamic, iterative, and responsive to change
- Risk management facilitates continual improvement of the organization

### Framework Components
```
Mandate and Commitment → Design of framework → Implement → Monitor → Improve
```

### Risk Management Process
1. **Communication and consultation** — engage stakeholders throughout
2. **Establishing context** — external, internal, risk management context
3. **Risk assessment**:
   - Risk identification (what can happen, when, why, how)
   - Risk analysis (consequences, probabilities, existing controls)
   - Risk evaluation (compare against criteria, prioritize)
4. **Risk treatment** — select and implement treatment options
5. **Monitoring and review** — detect changes in risk landscape
6. **Recording and reporting** — document process and outcomes

## FAIR Model (Factor Analysis of Information Risk)

FAIR quantifies risk in financial terms for informed decision-making.

### FAIR Taxonomy
```
Risk = Loss Event Frequency × Loss Magnitude

Loss Event Frequency:
- Threat Event Frequency (how often threats act)
- Vulnerability (probability threat succeeds)

Loss Magnitude:
- Primary Loss (direct costs)
- Secondary Loss (indirect/ripple effects)
```

### FAIR Analysis Steps
1. Scope the loss event scenario
2. Evaluate Loss Event Frequency (LEF)
3. Evaluate probable Loss Magnitude (LM)
4. Derive and articulate risk (annualized loss expectancy)
5. Run sensitivity analysis on key drivers

### FAIR Output Example
```
Scenario: Ransomware attack on production database
Annualized Loss Expectancy: $1.2M - $2.8M
Primary Driver: Weak access controls (80% contribution)
Top Risk: Data exfiltration + extended downtime
Recommended Controls: MFA, air-gapped backups, EDR
```

## Risk Register Structure

### Standard Risk Register Columns
```
| ID | Category | Risk Description | P | I | Score | Priority | Response | Owner | Status | Due |
|----|----------|-----------------|---|---|-------|----------|----------|-------|--------|-----|
| R01 | Security | Data breach via unpatched vuln | 3 | 5 | 15 | High | Mitigate | Alice | Open | 2026-05-30 |
| R02 | Schedule | Critical dependency delays | 4 | 4 | 16 | High | Accept | Bob | Monitor | 2026-06-15 |
| R03 | Resource | Senior dev departure risk | 2 | 4 | 8 | Medium | Mitigate | Carol | Active | 2026-06-01 |
```

### Risk Categories
```
Technical: tech-debt, performance, security, architecture
Schedule: timeline, dependency, scope-creep
Resource: team-capacity, turnover, skill-gap
External: vendor, market, regulatory, ecosystem
Operational: deployment, monitoring, incident-response
```

## Mitigation Strategies

### Strategy Selection Matrix
```
| Strategy | When to Use | Example |
|----------|-------------|---------|
| Avoid | Risk can be eliminated by changing plan | Choose different technology |
| Mitigate | Probability or impact can be reduced | Add redundancy, cross-train |
| Transfer | Third party can handle it better | SLA-backed vendor, insurance |
| Accept | Low score, mitigation costs > impact | Log and monitor only |
| Contingency | Cannot reduce but can prepare | Pre-written rollback plan |
```

### Mitigation Action Plan Template
```
Risk ID: R01
Risk: Data breach via unpatched vulnerability
Current Score: 15 (High)
Target Score: 6 (Medium) after mitigation

Actions:
1. Implement automated patch management (by 2026-06-01)
2. Deploy WAF with OWASP rules (by 2026-05-15)
3. Run weekly vulnerability scans (starting immediately)
4. Conduct quarterly penetration tests (starting Q3)

Owner: Alice (Security Lead)
Review Cadence: Weekly during standup
Target Close: 2026-07-01
```

## Risk Monitoring and Reporting

### Risk Burndown Tracking
```
Track total risk score over time:
Week 1: 187 (baseline — all risks identified)
Week 4: 142 (mitigation actions underway)
Week 8: 98 (high-score risks addressed)
Week 12: 76 (ongoing monitoring phase)
```

### Risk Status Reporting
```
Top 5 Risks This Week:
1. R01 - Data breach (Score: 15) — Mitigation on track
2. R02 - Dependency delay (Score: 16) — NEW, assess needed
3. R04 - Performance regression (Score: 12) — Decreasing
4. R07 - Compliance gap (Score: 10) — Stable
5. R09 - Vendor sunset (Score: 9) — Increasing

New Risks: R02, R10
Closed Risks: R03 (mitigated)
Materialized: None
Total Score: 62 (down from 87 last month)
```

## Framework Selection Guide

| Organization Type | Recommended Framework | Rationale |
|------------------|----------------------|-----------|
| ISO-certified org | ISO 31000 | Aligns with management system |
| Financial services | FAIR + ISO 31000 | Quantified risk for compliance |
| Startup <50 people | Simplified risk register | Lightweight, focus on top 10 risks |
| Government/Defense | RMF (NIST SP 800-37) | Regulatory requirement |
| Healthcare | ISO 31000 + HIPAA overlay | Domain-specific adaptation |
| Tech company | FAIR for decisions, risk register for tracking | Balance quantification and agility |
