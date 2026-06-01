# Alerting Fundamentals

## Overview
Alerting detects and notifies when systems require attention. This reference covers fundamental concepts for defining alerts, choosing thresholds, reducing noise, and building effective on-call practices.

## Core Concepts

### Concept 1: What Makes a Good Alert?

A good alert is: actionable, timely, and unambiguous.

**Criteria**:
- Requires human judgment or intervention
- Can't be automated (if it can, automate it)
- Has a clear response procedure (runbook exists)
- Signals a real problem, not noise
- Arrives early enough to prevent user impact

**If no one takes action on an alert, it should not fire.** Every alert must trigger a response or be silenced.

### Concept 2: Alert Severity Levels

| Severity | Response Time | Resolution Time | Example |
|----------|--------------|-----------------|---------|
| P0 (Critical) | 5 min | 2 hours | Site down, data loss, security breach |
| P1 (Major) | 15 min | 8 hours | Feature degraded, high error rate |
| P2 (Minor) | 1 hour | 48 hours | Elevated latency, capacity warning |
| P3 (Trivial) | Next business day | Next sprint | Disk usage > 80%, deprecated cert |
| P4 (Informational) | None | None | Deploy completed, backup succeeded |

P0 and P1 page on-call. P2 and P3 go to team channel. P4 logs only.

### Concept 3: Alert Fatigue

When too many alerts desensitize responders. Symptoms: alerts ignored, silenced, or routed to email graveyard.

**Causes**:
- Thresholds too sensitive (minor fluctuations trigger alerts)
- Too many low-severity alerts mixed with critical ones
- Duplicate alerts from overlapping monitors
- Noisy alerts never tuned or retired

**Consequences**: real incidents missed, responder burnout, loss of trust in monitoring.

### Concept 4: The RED Method

Monitor every service by three metrics:
- **Rate**: requests per second (traffic)
- **Errors**: failed requests count or rate
- **Duration**: latency distribution (p50, p95, p99)

Alert on error rate spikes and latency degradation. Rate changes are informational unless sudden drops indicate issues.

### Concept 5: The USE Method

Monitor every resource by:
- **Utilization**: % of resource in use (CPU, memory, disk)
- **Saturation**: queue depth or contention
- **Errors**: error count

USE is for infrastructure resources (servers, databases, network). RED is for services. Combine both for complete coverage.

### Concept 6: Threshold Types

**Static threshold**: fixed value (e.g., CPU > 90%). Simple but requires manual tuning. Not adaptive to traffic patterns.

**Dynamic/baseline threshold**: based on historical patterns (e.g., request count deviates > 3σ from 7-day rolling average). Catches anomalies that static thresholds miss.

**Rate of change**: alert on how fast a metric changes (e.g., error rate doubling in 5 minutes). Catches problems faster than absolute thresholds.

### Concept 7: Alert States

- **Firing**: alert condition is currently true
- **Resolved**: alert condition has returned to normal
- **Pending**: condition detected but waiting for evaluation duration (prevents flapping)
- **Acknowledged**: responder has seen the alert and is working on it
- **Silenced**: alert temporarily suppressed (maintenance, known issue)

Every alert should auto-resolve when the condition clears. Manual resolution creates stale alerts.

### Concept 8: Runbook Fundamentals

A runbook answers: "What do I do when this alert fires?"

**Essential sections**:
- Alert name and description
- Severity and response SLA
- Impact assessment (what's affected, who's affected)
- Immediate mitigation steps (numbered, in order)
- Verification steps (how to confirm fix)
- Escalation path if mitigation fails
- Post-resolution tasks (post-mortem, monitoring check)

Runbooks should be tested during low-stress periods (game days). A runbook that hasn't been tested is a wish, not a plan.

### Concept 9: On-Call Rotation Basics

**Rotation types**:
- Weekly rotation: common, predictable, manageable
- Daily rotation: intensive, better for high-incident environments
- Follow-the-sun: global teams covering 24 hours

**Best practices**:
- Primary + secondary on-call
- Secondary shadows for knowledge transfer
- Max 1 week on-call per 4 weeks per person
- Handoff includes active incidents, known issues, tips
- No deploys during last day of on-call shift

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Alert on Symptoms | Not causes — page on user-facing impact | High |
| Every Alert Actionable | If no action, silence it | High |
| Runbooks for Every Alert | Tested runbook = quick resolution | High |
| Auto-Resolve | Alerts clear when condition normalizes | High |
| Silence During Maintenance | Planned work should not page | High |
| Review Thresholds Quarterly | Tune based on incident data | Medium |
| Track Alert Fatigue | Monitor alert volume per shift | Medium |

## Common Pitfalls

### Pitfall 1: Alerting on Causes
Alerting on specific failure modes (e.g., "disk full on server-3") instead of symptoms (e.g., "API error rate > 5%"). Causes change, symptoms matter.
Fix: alert on symptoms. Use cause information in runbook.

### Pitfall 2: Threshold Too Sensitive
Alert fires multiple times per day for minor fluctuations. Responders learn to ignore it.
Fix: use longer evaluation windows (5 min instead of 1 min). Add hysteresis (different thresholds for fire and resolve).

### Pitfall 3: No Runbook
Alert fires with no documented response. On-call wastes time figuring out what to do.
Fix: every alert must have a runbook. Write it before or immediately after creating the alert.

### Pitfall 4: Silent Degradation
No alert for gradual performance degradation. System slows down but no one notices until users complain.
Fix: alert on p95 latency trends and error rate increases. Use baseline/threshold alerts for slow degradation.

### Pitfall 5: Pager Happy
Everything is P0. No severity differentiation. On-call treats all alerts as noise.
Fix: classify severity by user impact. Only P0/P1 page. P2+ goes to channel.

## Tooling Ecosystem

### Alerting Platforms
- Prometheus + Alertmanager: open-source, Kubernetes-native
- Datadog: SaaS monitoring with integrated alerting
- Grafana: alerting on any data source
- PagerDuty: on-call scheduling + alert routing
- Opsgenie: alert management with escalation
- Sentry: application error alerting

### On-Call Tools
- PagerDuty: scheduling, escalation, incident response
- Opsgenie: rotation management, alert routing
- Squadcast: SRE-focused incident management
- Incident.io: incident command and timeline

## Key Points
- Alert on symptoms (user impact), not causes
- Every alert must be actionable — silence noise
- Runbook before alert goes live — test it
- Use RED (Rate, Errors, Duration) for services
- Use USE (Utilization, Saturation, Errors) for resources
- Auto-resolve alerts when condition clears
- P0/P1 page; P2+ go to channel
- Track alert fatigue — too many alerts = no alerts
- On-call max 1 week in 4 per person
- Review and tune thresholds quarterly
