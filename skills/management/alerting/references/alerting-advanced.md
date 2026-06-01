# Alerting Advanced Topics

## Introduction
Advanced alerting covers multi-window alerting strategies, burn rate alerts, alert fatigue prevention at scale, SLO-based alerting, incident management automation, and mature on-call practices.

## SLO-Based Alerting

### Service Level Concepts

**SLI (Service Level Indicator)**: a quantifiable measure of service quality (e.g., request latency, error rate, uptime).

**SLO (Service Level Objective)**: target value for an SLI (e.g., 99.9% of requests complete in < 200ms).

**Error Budget**: 100% - SLO. The amount of unreliability the service can tolerate within a period. 99.9% SLO = 0.1% error budget = ~43 minutes of downtime per month.

**Error Budget Policy**: when error budget is exhausted, development velocity slows. Focus shifts to reliability. Feature releases are halted until budget is replenished.

### Burn Rate Alerts

Alert when error budget is being consumed faster than sustainable:

| Burn Rate | Error Budget Consumption | Example (30-day window) |
|-----------|------------------------|------------------------|
| 1x | Consumes all budget in 30 days | Normal operation |
| 2x | Consumes all budget in 15 days | Alert: watch |
| 5x | Consumes all budget in 6 days | Page: investigate |
| 10x | Consumes all budget in 3 days | Page: immediate response |

**Multi-window approach**: alert when both short window (5 min) and long window (60 min) show elevated burn rate. Short window catches fast problems; long window prevents false positives.

**Implementation (Prometheus)**:
```yaml
# Alert when burn rate > 10x over 5 min AND > 2x over 60 min
expr: |
  (
    (1 - ratio_of_requests_under_200ms[5m]) > 0.1 * (1 - 0.999)
    and
    (1 - ratio_of_requests_under_200ms[60m]) > 0.02 * (1 - 0.999)
  )
```

### Multi-Window, Multi-Burn-Rate Alerting

Combine multiple burn rate thresholds for complete coverage:

```
Burn Rate | Short Window | Long Window | Severity | Response
1x        | —            | 12 hours    | Warning  | Ticket
2x        | 10 min       | 1 hour      | P3       | Investigate
5x        | 5 min        | 30 min      | P1       | Page
10x       | 1 min        | 5 min       | P0       | Page immediately
```

## Alert Fatigue Prevention

### Alert Quality Metrics

Track these metrics to measure alert health:

| Metric | Definition | Target | Action If Off |
|--------|-----------|--------|---------------|
| Alert/incident ratio | Alerts fired per incident | < 5:1 | Reduce duplicate/noisy alerts |
| False positive rate | % of alerts with no action | < 10% | Tune thresholds, improve evaluation conditions |
| Time-to-acknowledge | Alert fire to acknowledgment | < 5 min (P0) | Check routing, on-call responsiveness |
| MTTA (Mean Time to Acknowledge) | Average ack time | < 10 min | Review alert clarity, runbook availability |
| Alert volume trend | Weekly total alerts | Stable or declining | Investigate increases |

### Alert Noise Reduction Techniques

**Silencing**: suppress alerts during known maintenance windows, planned deployments, and known issues.

**Grouping**: combine related alerts into a single incident (same service, same root cause). Alertmanager does this natively.

**Flapping detection**: alert that fires and resolves rapidly. Add hysteresis (different thresholds for firing and resolving). Extend evaluation window.

**Alert deduplication**: same condition from multiple sources → one alert. Use alert routing rules to consolidate.

**Scheduled maintenance windows**: suppress alerts for planned events. Auto-expire after maintenance window.

### Alert Threshold Tuning Process

1. Collect alert data for 2-4 weeks
2. Identify alerts that fired but required no action (false positives)
3. For each: adjust threshold, extend evaluation window, or silence
4. Identify alerts that should have fired but didn't (missed incidents)
5. For each: tighten threshold, add complementary alert
6. Review changes monthly until alert volume stabilizes
7. Quarterly full review of all active alerts

## Incident Management Automation

### Auto-Remediation

For known failure patterns, automate the response:

**Examples**:
- Auto-restart of crashed processes
- Scale up under CPU pressure
- Clear cache on memory pressure
- Rotate credentials on suspected compromise
- Rollback deployment on error rate spike

**Implementation pattern**: detect → diagnose → mitigate → verify → notify.

**Risk**: automated response may mask underlying issues. Always log auto-remediation actions. Create ticket to investigate root cause.

### Incident Command System

Structured roles for major incidents:

| Role | Responsibility | Assigned By |
|------|---------------|-------------|
| Incident Commander | Coordinates response, makes decisions, communicates status | First on-call or escalation |
| Communications | Updates stakeholders, status page, internal channels | Incident Commander |
| Operations Lead | Technical mitigation (fix, rollback, feature flag) | Incident Commander |
| Scribe | Timeline documentation for post-mortem | Incident Commander |
| Subject Matter Expert | Domain expertise for complex issues | Operations Lead |

**Switching command**: after 60 minutes, rotate Incident Commander to prevent fatigue.

### Incident Communication Automation

Automate status updates during incidents:

1. Alert fires → auto-create incident channel (Slack, Teams)
2. Incident channel auto-populated with runbook link, severity, current state
3. Scribe timeline auto-generated from channel activity
4. Status page update triggered by command (e.g., "/status update investigating")
5. Post-incident auto-create post-mortem document with timeline template

## Mature On-Call Practices

### On-Call Rotation Design

| Team Size | Rotation Duration | Primary | Secondary | Frequency per Person |
|-----------|------------------|---------|-----------|---------------------|
| 3-4 people | 1 week | 1 person | 1 person | Every 3-4 weeks |
| 5-6 people | 1 week | 1 person | 1 person | Every 5-6 weeks |
| 7-10 people | 1 week | 1 person | 1 person | Every 7-10 weeks |
| 2-3 people | 4 days | 1 person | None | Every 8-12 days |

**Follow-the-sun**: global teams cover 24 hours. Each timezone has primary during business hours. Handoff to next timezone at end of day.

**Opt-in on-call**: not everyone needs to be on-call. Junior engineers can opt in with secondary support. Specialists opt in for their domain.

### On-Call Health Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Alert volume | < 10 alerts per shift | Per-person alert count |
| False positive rate | < 10% | Alerts with no action |
| MTTA | < 10 min P0 | Time to acknowledge |
| Sleep interruptions | 0-1 per night | Post-shift survey |
| Burnout risk | Low | Quarterly survey, rotation compliance |
| Handoff quality | > 3/5 | Post-handoff survey |

### Post-Incident Review Maturity

| Level | Characteristics |
|-------|----------------|
| Level 1 | No post-mortems |
| Level 2 | Post-mortems for major incidents only, action items tracked |
| Level 3 | Post-mortems for all P0/P1 incidents, systemic root cause analysis |
| Level 4 | Data-driven incident analysis, trend tracking, preventive action validation |

## Advanced Runbook Design

### Runbook Automation

Levels of runbook maturity:

Level 1 — Documented: runbook exists as document. On-call reads and follows steps manually.

Level 2 — Semi-automated: runbook steps are scripts or CLI commands. On-call runs commands but decision-making is manual.

Level 3 — Automated: runbook triggers automated response with human approval step.

Level 4 — Self-healing: runbook runs automatically without human intervention for known patterns.

### Runbook Testing

Test runbooks during game days:
- Schedule quarterly game days for critical services
- Simulate each failure mode in the runbook
- Measure time-to-mitigate
- Update runbook based on what was learned
- Document runbook effectiveness score

## Key Points
- SLO-based alerting uses error budgets to trigger on business impact
- Burn rate alerts: multi-window, multi-threshold for fast detection + low false positives
- Track alert quality metrics (false positive rate, MTTA, alert/incident ratio)
- Tune alert thresholds monthly until stable, then quarterly
- Auto-remediate known failure patterns with human oversight
- Incident command system: Commander, Comms, Ops, Scribe
- On-call fatigue: max 1 week in 4, follow-the-sun for 24h coverage
- Runbook maturity: documented → semi-automated → automated → self-healing
- Game days test runbooks under controlled conditions
- Post-incident review maturity: no post-mortems → data-driven prevention
