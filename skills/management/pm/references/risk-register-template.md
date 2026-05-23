# Risk Register Template

## Risk Register Table

| ID | Category | Risk Description | P | I | Score | Priority | Response | Owner | Status | Target Close |
|----|----------|-----------------|---|---|-------|----------|----------|-------|--------|--------------|
| R-001 | Technical | Database migration causes data loss | 2 | 5 | 10 | Medium | Mitigate | Alice | Active | 2026-06-01 |
| R-002 | Schedule | Third-party API deprecation | 3 | 4 | 12 | Medium | Transfer | Bob | Monitoring | 2026-07-15 |
| R-003 | Resource | Key developer leave during critical phase | 3 | 4 | 12 | Medium | Mitigate | Carol | Active | 2026-05-30 |
| R-004 | Scope | Feature creep from stakeholder requests | 4 | 3 | 12 | Medium | Avoid | Dave | Active | Ongoing |
| R-005 | Technical | Performance regression at scale | 3 | 3 | 9 | Medium | Mitigate | Eve | Monitoring | 2026-08-01 |
| R-006 | External | Vendor pricing change | 2 | 3 | 6 | Low | Accept | Frank | Active | 2026-09-01 |
| R-007 | Security | Unpatched dependency CVE | 4 | 5 | 20 | High | Mitigate | Grace | Active | 2026-05-20 |
| R-008 | Compliance | GDPR audit non-compliance | 1 | 5 | 5 | Low | Accept | Henry | Archived | N/A |

## Priority Matrix

| Score | Priority | Action Required |
|-------|----------|----------------|
| 15-25 | High | Immediate mitigation plan, weekly monitoring, escalations defined |
| 6-14 | Medium | Assign owner, mitigation defined, monitor at sprint retro |
| 1-5 | Low | Log and accept, review quarterly, no active management |

## Risk Response Plan Template

```
Risk ID: R-007
Description: Unpatched dependency CVE-2026-1234 in logging library
Category: Security
Probability: 4 (Likely — public exploit exists)
Impact: 5 (Critical — RCE vulnerability)
Score: 20 (High)

Response Strategy: Mitigate

Mitigation Steps:
1. Immediate: Verify if running vulnerable version across all services
2. Short-term: Apply hotfix patch or WAF rule if available
3. Long-term: Update dependency to patched version, run full regression

Trigger: CVE published with CVSS > 7.0
Owner: Grace (Security Lead)
Review Date: 2026-05-20

Escalation:
  If unfixed by 2026-05-22 → escalate to CTO
  If exploit detected in wild → immediate incident response
```

## Risk Register Review Cadence

| Activity | Frequency | Participants | Output |
|----------|-----------|--------------|--------|
| Full review | Every sprint retro | Full team | Updated scores, status, new risks |
| Top 5 review | Daily standup | PM + tech lead | Quick status of high-priority risks |
| New risk entry | On discovery | Anyone | Risk ID, initial assessment |
| Quarterly deep dive | Every quarter | PM + team leads | Risk trend analysis, framework review |
| Close/archive | When risk resolved | PM | Closure note, date, lessons learned |

## Risk Burndown Chart

Track total risk score over time. A decreasing trend indicates effective mitigation.

```
Quarter 1: Total risk score 156
Quarter 2: Total risk score 118 (↓24%)
Quarter 3: Total risk score 92 (↓22%)
Quarter 4: Total risk score 74 (↓20%)
```

## Best Practices

- Include positive risks (opportunities) — not just threats
- Archive risks, never delete — historical data identifies patterns
- Make top 5 risks visible to the whole team on a shared dashboard
- Review the register at every sprint retro — stale risks are ignored risks
- One owner per risk — shared ownership means no ownership
- Contingency plans must be pre-defined before the risk materializes
- Update probability and impact as new information becomes available
- Risk scores should trend down over the project lifecycle — if they don't, mitigation is not working
