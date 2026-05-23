# Mitigation Strategies

## Response Strategy Selection

| Strategy | When to Use | Effort | Outcome |
|----------|-------------|--------|---------|
| **Avoid** | Risk can be eliminated by changing the plan | High | Risk eliminated |
| **Mitigate** | Probability or impact can be reduced | Medium | Risk reduced |
| **Transfer** | Third party can handle it better | Low-Medium | Risk shifted |
| **Accept** | Low score, mitigation costs more than impact | None | Risk monitored |
| **Contingency** | Cannot reduce, but we can prepare | Medium | Plan B ready |

## Avoidance Strategies

| Risk | Avoidance Action | Trade-off |
|------|------------------|-----------|
| Third-party API deprecation | Use standard protocols (no vendor lock-in) | May lose vendor-specific features |
| Unproven technology | Use mature, well-adopted alternatives | May miss innovation |
| Regulatory non-compliance | Restrict scope to compliant markets | Reduced market access |
| Schedule overrun due to complexity | Remove complex feature from scope | Reduced functionality |
| Security vulnerability from new tech | Use audited, maintained dependencies | Slower adoption of new tools |

## Mitigation Strategies

### Technical Risks
- Tech debt: allocate 15-20% of sprint capacity to debt reduction
- Performance: implement load testing in CI, set performance budgets
- Architecture: create ADRs before implementation, review quarterly
- Single points of failure: add redundancy, implement circuit breakers

### Schedule Risks
- Critical path: track weekly, add buffer for each milestone
- Dependencies: identify external dependencies early, add 2× expected delay
- Scope creep: implement change control process, require impact assessment
- Estimation inaccuracy: use three-point estimates, track confidence

### Resource Risks
- Key person dependency: cross-train, document critical knowledge
- Turnover: maintain runbooks, reduce bus factor to < 3
- Skill gaps: schedule training early, pair junior with senior
- Burnout: monitor velocity trends, enforce PTO

### External Risks
- Vendor failure: have backup vendor identified, test fallback
- API changes: use contract tests with Pact, version APIs
- Regulatory changes: subscribe to regulatory alerts, quarterly review

## Transfer Strategies

| Risk | Transfer Method | Cost |
|------|-----------------|------|
| Infrastructure failure | Cloud provider SLA | Monthly premium |
| Security breach | Cyber insurance | Annual premium |
| Compliance reporting | Third-party auditor | Per-audit fee |
| Payment processing | Payment provider (Stripe, Adyen) | Per-transaction fee |
| Legal liability | Legal counsel retainer | Monthly retainer |

## Acceptance Strategies

Accepted risks are documented with:
- Rationale for acceptance (cost of mitigation > expected impact)
- Maximum acceptable loss (threshold for re-evaluation)
- Monitoring criteria (conditions that trigger re-assessment)
- Review cadence (typically quarterly)

```
### Accepted Risk: R-008 GDPR Non-compliance Fine
Rationale: Mitigation cost ($500K) exceeds expected fine ($200K)
Maximum acceptable loss: $500K
Monitoring: Quarterly regulatory review
Re-assessment trigger: New regulatory guidance or enforcement action
Owner: Compliance Lead
```

## Contingency Planning

### Contingency Plan Template

```
### Contingency Plan for: {Risk Description}

Trigger Condition: {specific, measurable event that activates the plan}

Plan B Actions:
1. {first action — who does what}
2. {second action — who does what}
3. {third action — who does what}

Communication:
- Internal notification: {channel}, {to whom}
- External notification: {channel}, {to whom}, {when}

Resources Required:
- {people, tools, budget needed}

Rollback Criteria: {when to revert to Plan A}

Post-Execution Review:
- What triggered the plan?
- Was the plan effective?
- What should change for next time?
```

### Contingency Plan Example

```
### Contingency Plan for: Database Migration Data Loss

Trigger Condition: Migration script reports >0.1% data mismatch or any data type conversion error

Plan B Actions:
1. Immediately stop migration script (DBA)
2. Restore database from pre-migration backup (DBA, estimated 30 min)
3. Notify affected teams that migration is rolled back (Tech Lead, Slack #engineering)
4. Analyze root cause of data mismatch (DBA + Dev Lead)
5. Fix migration script and re-test in staging (Dev Team)
6. Reschedule migration with new timeline (PM)

Communication:
- Internal: #engineering Slack channel, immediate
- Stakeholders: PM notifies affected stakeholders within 1 hour

Resources Required:
- DBA on-call
- Verified pre-migration backup
- Staging environment with production data clone

Rollback Criteria: Successful restore verified by health checks and data integrity scan
```

## Mitigation Monitoring

- Review mitigation effectiveness at every sprint retro
- Track risk score trend — decreasing trend means mitigation is working
- If risk score increases despite mitigation, try a different strategy
- If mitigation requires more effort than the risk justifies, switch to acceptance
- Document lessons learned: which strategies worked, which didn't
