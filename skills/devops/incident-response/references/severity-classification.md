# Severity Classification

## Overview

Severity classification determines how quickly an incident is responded to, who is paged, what stakeholders are notified, and what regulatory obligations are triggered. Consistent severity classification prevents under-reaction to critical issues and over-reaction to minor ones.

## Severity Matrix

### Standard SEV1-4 Definition

| Severity | Definition | Response Time | Escalation | Page Method |
|----------|------------|--------------|-------------|-------------|
| **SEV1** | Complete service outage, data loss, security breach, SLA violation, revenue impact >$10K/hr | 5 minutes | Full team + management + executive | PagerDuty high-urgency + phone call |
| **SEV2** | Major feature degraded, partial outage, >5% error rate, performance degradation >2x baseline | 15 minutes | Primary + secondary on-call | PagerDuty high-urgency |
| **SEV3** | Minor feature issue, single-user impact, non-critical bug, cosmetic defect, no revenue impact | 1 business hour | Team lead + ticket | PagerDuty low-urgency or Slack |
| **SEV4** | Internal tooling, documentation, tech debt, enhancement request | Next sprint | Ticket queue | None |

### Detailed SEV1 Criteria

All of the following qualify as SEV1:

| Criterion | Examples |
|-----------|----------|
| Complete service outage | Login page returns 500, API returns 503 for all endpoints |
| Data loss | Customer data deleted, database corruption, backup restoration failed |
| Security breach | Unauthorized access, data exfiltration, ransomware |
| SLA violation | 99.9% SLA at risk, breach of contractual uptime commitment |
| Revenue impact >$10K/hr | Payment processing down, checkout flow broken |
| Regulatory breach | PII exposed, PCI compliance violation, GDPR breach |
| All users affected | 100% of user base cannot access service |

### Detailed SEV2 Criteria

| Criterion | Examples |
|-----------|----------|
| Major feature degraded | Search returns incomplete results, file upload fails |
| Partial outage | One region down, one availability zone affected |
| >5% error rate | API error rate jumps from 0.1% to 5%+ |
| Performance degradation >2x | p99 latency from 200ms to 400ms+ |
| >10% of users affected | Feature flag broke functionality for beta users |
| Data processing delayed | Batch jobs >2x expected runtime |
| Payment processing degraded | Credit card failures for subset of users |

### Detailed SEV3 Criteria

| Criterion | Examples |
|----------|----------|
| Minor feature issue | Button misaligned, tooltip not showing |
| Single-user impact | One customer cannot access their account |
| Non-critical bug | Export CSV missing one column |
| Cosmetic defect | Color contrast issue, typo in UI text |
| No workaround required | Feature works but has minor UX friction |

### Detailed SEV4 Criteria

| Criterion | Examples |
|-----------|----------|
| Internal tooling bug | Admin dashboard showing wrong data |
| Documentation error | API docs have incorrect example |
| Tech debt | Code refactoring, dependency updates |
| Enhancement request | New feature request, UX improvement |
| No customer impact | Internal-only systems |

## Severity vs Priority

Severity describes the impact of the incident. Priority describes the order in which it should be addressed. They are related but distinct.

| | SEV1 | SEV2 | SEV3 | SEV4 |
|---|---|---|---|---|
| **P0 (Critical)** | ✓ Immediate response | ✗ | ✗ | ✗ |
| **P1 (High)** | ✗ | ✓ Respond within SLA | ✗ | ✗ |
| **P2 (Medium)** | ✗ | ✗ | ✓ Next business day | ✗ |
| **P3 (Low)** | ✗ | ✗ | ✗ | ✓ Next sprint |
| **P4 ( backlog)** | ✗ | ✗ | ✗ | ✓ Icebox |

### Mapping Example

A SEV2 incident with partial outage but affecting a critical customer contract could be P0 priority despite SEV2 severity. Always prioritize based on business context.

## Severity Upgrade/Downgrade Criteria

### Upgrade Triggers

| Current Severity | Upgrade To | Condition |
|-----------------|------------|-----------|
| SEV3 | SEV2 | Issue affecting >10 users |
| SEV3 | SEV2 | No workaround available |
| SEV3 | SEV2 | PII or sensitive data potentially exposed |
| SEV2 | SEV1 | Incident exceeds 1 hour without progress |
| SEV2 | SEV1 | Blast radius expanding |
| SEV2 | SEV1 | Data loss confirmed |
| SEV2 | SEV1 | Revenue impact confirmed >$10K/hr |
| Any | SEV1 | Security breach suspected |
| Any | SEV1 | Regulatory body notification required |

### Downgrade Triggers

| Current Severity | Downgrade To | Condition |
|-----------------|--------------|-----------|
| SEV1 | SEV2 | Mitigation complete, monitoring phase |
| SEV1 | SEV2 | Blast radius contained to <5% users |
| SEV2 | SEV3 | Workaround available for affected users |
| SEV2 | SEV3 | Team confirmed no data loss |
| SEV2 | SEV3 | Root cause determined to be isolated |
| SEV3 | SEV4 | Workaround provided, permanent fix scheduled |

### Upgrade/Downgrade Process

1. **Proposal**: Any team member can propose a severity change
2. **Confirmation**: IC confirms or rejects based on evidence
3. **Documentation**: Scribe records the change and rationale
4. **Notification**: Comms notifies stakeholders of severity change
5. **Re-escalation**: If downgraded and conditions worsen, re-escalate immediately

## Response Time SLAs

### Initial Response Time

| Severity | Response Time | Measurement |
|----------|---------------|-------------|
| SEV1 | 5 minutes | Time from alert to acknowledgment |
| SEV2 | 15 minutes | Time from alert to acknowledgment |
| SEV3 | 1 business hour | Time from ticket creation to first response |
| SEV4 | Next sprint | Time from ticket creation to sprint planning |

### Mitigation SLA

| Severity | Mitigation Target | Measurement |
|----------|------------------|-------------|
| SEV1 | < 1 hour | Time from alert to mitigation (stop the bleed) |
| SEV2 | < 4 hours | Time from alert to mitigation |
| SEV3 | < 1 week | Time from ticket to deploy |
| SEV4 | Next release | Time from acceptance to deploy |

### Resolution SLA

| Severity | Resolution Target | Measurement |
|----------|------------------|-------------|
| SEV1 | < 4 hours | Time from alert to full resolution |
| SEV2 | < 24 hours | Time from alert to full resolution |
| SEV3 | < 2 weeks | Time from ticket to production fix |
| SEV4 | Next quarter | Time from acceptance to production fix |

## Escalation Paths Per Severity

### SEV1 Escalation

```
First responder acknowledges (5min)
    ↓
IC assigned
    ↓
Primary SME team engaged
    ↓
Engineering manager notified
    ↓
VP/Director notified (15min)
    ↓
CTO/CISO notified (30min)
    ↓
Legal/Compliance notified (if security/data breach)
    ↓
Executive team notified (1hr)
```

### SEV2 Escalation

```
First responder acknowledges (15min)
    ↓
IC assigned
    ↓
Primary SME team engaged
    ↓
Engineering manager notified (30min)
    ↓
VP/Director notified (if > 2hrs without progress)
```

### SEV3 Escalation

```
Team member assigned
    ↓
Team lead notified
    ↓
Engineering manager notified (if > 2 weeks without fix)
```

## Reporting Requirements

### Regulatory Reporting

| Regulation | SEV1 Reporting | SEV2 Reporting |
|------------|---------------|----------------|
| **SOC2** | Report within 24h | Report within 72h |
| **PCI DSS** | Report within 24h | Report within 1 week |
| **HIPAA** | Report within 60 days | Document in incident log |
| **GDPR** | Report within 72 hours | Document in ROPA |
| **SOX** | Report immediately | Report within 24h |
| **FedRAMP** | Report within 1 hour | Report within 24h |

### Internal Reporting

| Report | SEV1 | SEV2 | SEV3 |
|--------|------|------|------|
| Postmortem | Within 48h | Within 1 week | Sprint review |
| Executive summary | Within 24h | Within 72h | Not required |
| Customer communication | Within 1h | Within 4h | On request |
| Root cause analysis | Within 1 week | Within 2 weeks | Not required |
| Metrics entry | Within 1 week | Within 1 week | Within 2 weeks |

## Severity Examples by Industry

### SaaS

| Example | Severity | Rationale |
|---------|----------|-----------|
| Login page returning 500 for all users | SEV1 | Complete outage |
| Dashboard charts not loading | SEV2 | Major feature degraded |
| Export CSV missing date column | SEV3 | Minor feature issue |
| Admin panel button misaligned | SEV4 | Cosmetic |
| Billing system down during business hours | SEV1 | Revenue impact |
| Search returns incomplete results | SEV2 | Major feature degraded |
| Profile picture not updating | SEV3 | Single-user workaround |

### Fintech

| Example | Severity | Rationale |
|---------|----------|-----------|
| Payment processing down | SEV1 | Direct revenue + regulatory |
| Transaction history delayed by 30min | SEV2 | SLAs affected |
| Currency converter rounding error | SEV3 | Minor feature impact |
| Statement PDF formatting issue | SEV4 | Cosmetic |
| Fraud detection system down | SEV1 | Regulatory + financial risk |
| Interest rate display stale | SEV2 | Compliance issue |
| Notification email delayed 2 hours | SEV3 | Non-critical delay |

### Healthcare

| Example | Severity | Rationale |
|---------|----------|-----------|
| Patient portal inaccessible | SEV1 | Patient care impacted |
| Lab results delayed > 4 hours | SEV2 | Clinical workflow impacted |
| Appointment reminder email formatting | SEV4 | Cosmetic |
| Provider directory search slow | SEV3 | Degraded but usable |
| PHI exposed in log files | SEV1 | HIPAA breach |
| E-Prescribing system down | SEV1 | Patient safety |
| Insurance verification delayed 1 hour | SEV2 | Operational impact |

### E-commerce

| Example | Severity | Rationale |
|---------|----------|-----------|
| Checkout page 500 error | SEV1 | Revenue impact |
| Product images not loading | SEV2 | Major UX degradation |
| Product description truncated | SEV3 | Minor UX issue |
| Footer link broken | SEV4 | Cosmetic |
| Cart persistence failing | SEV2 | User frustration, revenue risk |
| Search autocomplete not working | SEV3 | Minor feature |
| Store locator showing wrong hours | SEV3 | Misleading information |

## Severity Drift Prevention

### Common Drift Patterns

| Pattern | Description | Prevention |
|---------|-------------|------------|
| **Severity inflation** | Every bug becomes SEV2 | Regular calibration reviews |
| **Severity deflation** | SEV1 issues classified as SEV2 | Automated severity based on error rate |
| **Alert fatigue** | Too many SEV1 alerts desensitize team | Review alert thresholds quarterly |
| **Contextual drift** | Same issue classified differently by different teams | Shared severity calibration sessions |
| **Temporal drift** | Classification standards loosen over time | Annual severity policy review |

### Calibration Practices

1. **Monthly severity review**: Review last month's incidents for classification accuracy
2. **Cross-team calibration**: Quarterly sessions where teams classify shared scenarios
3. **Automated enforcement**: Monitoring alerts auto-classify based on metrics
4. **Escalation feedback**: When stakeholders escalate, retroactively review classification
5. **New service onboarding**: Every new service must define severity criteria before production

## Multi-Factor Severity Scoring

### Scoring Matrix

Score each dimension 0-5 and sum for total severity score:

| Factor | 0 | 1 | 2 | 3 | 4 | 5 |
|--------|---|---|---|---|---|---|
| **Users affected** | 0 | <10 | <100 | <1K | <10K | >10K |
| **Revenue impact** | $0 | <$100 | <$1K | <$10K | <$100K | >$100K |
| **Data loss** | None | Logs | Cache | Config | Customer data | All data |
| **Compliance breach** | None | Internal policy | SOC2 | PCI | HIPAA/GDPR | Multiple regs |
| **Blast radius** | Single pod | Single service | Single region | Multi-region | Multi-service | Platform-wide |
| **Customer trust** | None | Minor annoyance | Visible glitch | Degraded UX | Cannot use | Public outrage |

### Score Interpretation

| Total Score | Severity |
|-------------|----------|
| 0-5 | SEV4 |
| 6-10 | SEV3 |
| 11-18 | SEV2 |
| 19-30 | SEV1 |

### Scoring Example

A payment gateway incident during Black Friday:
- Users affected: 50,000 (5 points)
- Revenue impact: $50K/hr (4 points)
- Data loss: None (0 points)
- Compliance breach: PCI scope (3 points)
- Blast radius: Payment service only (2 points)
- Customer trust: Cannot purchase (4 points)
- **Total: 18 → SEV2** (borderline SEV1)

## Decision Tree for Severity Classification

```
Is the service completely down?
├── Yes → Are all users affected?
│   ├── Yes → SEV1
│   └── No → Is it > 10% of users?
│       ├── Yes → SEV1
│       └── No → SEV2
└── No → Is there data loss?
    ├── Yes → SEV1 (immediately)
    └── No → Is there security breach?
        ├── Yes → SEV1 (immediately)
        └── No → Check error rate:
            ├── > 5% → SEV2
            ├── > 1% → SEV3
            └── < 1% → Is revenue impacted?
                ├── Yes → SEV2
                └── No → SEV3/SEV4
```

### Quick Reference Decision Card

```
SEV1 if ANY:
  ☐ Complete outage
  ☐ Data loss confirmed
  ☐ Security breach
  ☐ Revenue > $10K/hr at risk
  ☐ All users affected
  ☐ SLA violation imminent

SEV2 if ANY:
  ☐ Major feature degraded
  ☐ > 5% error rate
  ☐ > 10% users affected
  ☐ Performance > 2x baseline
  ☐ No workaround available

SEV3 if ALL:
  ☐ Minor feature issue
  ☐ Workaround exists
  ☐ < 1% users affected
  ☐ No data loss

SEV4 if ALL:
  ☐ Cosmetic only
  ☐ Internal tooling
  ☐ Tech debt / enhancement
```

## Severity Classification Workflow

```
Alert fires
    ↓
First responder evaluates against SEV1 checklist
    ├── Matches SEV1 → Declare SEV1, page full team
    └── Not SEV1 → Move to SEV2 checklist
        ├── Matches SEV2 → Declare SEV2, page primary
        └── Not SEV2 → Evaluate SEV3/SEV4
            ├── Matches → Create ticket, assign
            └── Unsure → Escalate to senior on-call
```

### Automated Severity Assignment

When monitoring tools detect anomalies, they can auto-assign severity:

```
if error_rate > 5% AND users_affected > 10%:
    severity = "SEV1"
elif error_rate > 2% OR latency_p99 > 2s:
    severity = "SEV2"
elif error_rate > 0.5% OR latency_p99 > 1s:
    severity = "SEV3"
else:
    severity = "SEV4"
```

Automated severity should always be overridable by human operators.

## Key Points

- SEV1 requires 5-minute response, SEV4 is next sprint
- Severity and priority are distinct — a SEV2 can be P0 if business-critical
- Severity can be upgraded or downgraded as new information emerges
- Each severity has defined escalation paths and regulatory reporting requirements
- Multi-factor scoring (users, revenue, data, compliance, blast radius, trust) provides objective classification
- Severity drift must be actively prevented through regular calibration
- Decision trees help first responders classify quickly under pressure
- Automated severity assignment helps consistency but supports human override
- Industry-specific examples show how the same matrix applies to different contexts
- All severity changes must be documented with rationale by the scribe
