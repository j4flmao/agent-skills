# On-Call Rotation Design

## Purpose
Provide comprehensive patterns for designing, implementing, and managing on-call rotations. Covers schedule design, escalation policies, handover procedures, incident response workflows, burnout prevention, and continuous improvement of on-call practices.

## Table of Contents
1. [On-Call Rotation Models](#on-call-rotation-models)
2. [Schedule Design](#schedule-design)
3. [Escalation Policy Architecture](#escalation-policy-architecture)
4. [Handover Procedures](#handover-procedures)
5. [Incident Response Workflow](#incident-response-workflow)
6. [Burnout Prevention](#burnout-prevention)
7. [On-Call Compensation](#on-call-compensation)
8. [On-Call Readiness](#on-call-readiness)
9. [Rotation Tooling](#rotation-tooling)
10. [Metrics and Improvement](#metrics-and-improvement)
11. [Specialized On-Call Patterns](#specialized-on-call-patterns)

---

## On-Call Rotation Models

### Primary/Secondary Model

```
Setup: Two engineers per shift: primary handles alerts, secondary assists if needed.
Rotation: 1 week primary, 1 week secondary, 2 weeks off.

Pros:
  - Built-in backup when primary is overloaded.
  - Secondary learns by shadowing.
  - Lower individual burden.

Cons:
  - Requires 2 engineers per shift.
  - Secondary may be distracted if not actively needed.
  - Coordination overhead.

Best for: Teams of 6-12 engineers, high-volume alerting.
```

### Follow-the-Sun Model

```
Setup: Three shifts covering 24 hours across time zones.
  Shift A: APAC (08:00-16:00 local)
  Shift B: EMEA (08:00-16:00 local)
  Shift C: AMER (08:00-16:00 local)
  Night hours covered by off-shift primary with secondary from next shift.

Pros:
  - Always daytime for on-call engineer.
  - Faster response during business hours.
  - Natural escalation across shifts.

Cons:
  - Requires presence in 3+ time zones.
  - Handover complexity between shifts.
  - Uneven workload (some shifts busier).

Best for: Global teams with presence in 3+ regions.
```

### Weekly Rotation

```
Setup: One engineer on-call for 7 days, then off for several weeks.
Rotation: 1 week on, 3 weeks off (for team of 4).
          1 week on, 5 weeks off (for team of 6).

Pros:
  - Simple to schedule and understand.
  - Long recovery period.
  - Clear ownership for incidents.

Cons:
  - Week-long shift can be exhausting during incident-heavy weeks.
  - Coverage gaps during PTO or sick leave.

Best for: Teams with manageable alert volume (< 5 pages/week).
```

### Daily Rotation

```
Setup: Engineer on-call for 24 hours, then handover.
Rotation: 24h on, N days off depending on team size.

Pros:
  - Short shift, easy to endure.
  - Fresh engineer each day.
  - Good for high-volume alerting environments.

Cons:
  - Frequent handovers (daily).
  - Reduced continuity for long-running incidents.
  - Administrative overhead.

Best for: Large teams, high page volume, SRE-focused roles.
```

### Optional: On-Call Pod

```
Setup: Small sub-team dedicated to incident response, rotating as a unit.
Rotation: Pod serves for 2 weeks, then they rotate off entirely.

Pros:
  - Deep focus on incident response.
  - Built-in collaboration.
  - Natural knowledge transfer.

Cons:
  - Expensive (multiple engineers dedicated).
  - May be overkill for smaller organizations.
  - Risk of pod being siloed.

Best for: Large organizations with dedicated SRE teams.
```

---

## Schedule Design

### Team Size Requirements

| Rotation Model | Minimum Team | Recommended Team |
|---|---|---|
| Weekly (1 on, N off) | 3 | 5-7 |
| Daily | 4 | 8-12 |
| Primary/Secondary | 4 | 6-10 |
| Follow-the-Sun | 6 | 9-15 |
| On-Call Pod | 6 | 8-12 |

### Fairness in Scheduling

Ensure schedule fairness by tracking:

```
On-call frequency:
  Engineer A: every 4 weeks (tier 1 services)
  Engineer B: every 6 weeks (tier 2 services)

Incident count per shift:
  Monitor: are certain days of week busier?
  Adjust: give lighter rotation for busy days.

Holiday coverage:
  Rotate holiday on-call duty fairly across team members.
  Compensate extra for holiday shifts (time off in lieu).
  Consider cultural/religious holiday preferences.
```

### Exclusions

```
Exclude from on-call during:
  - PTO, sick leave, personal leave.
  - Conference attendance (work-related travel).
  - First 2 weeks in role (ramp-up period).
  - Last week before long parental/medical leave.

Optional exclusions:
  - Engineers with known major life events (move, new parent).
  - Team lead / manager (should be secondary escalation only).
  - During performance improvement plans (reduced responsibility).
```

### Time Zone Considerations

```
For distributed teams:
  - Align shift start/end with local business hours.
  - Primary on-call during local daytime.
  - Night hours overflow to follow-the-sun team.
  - If single time zone: consider night coverage (budget for overnight response).

Night coverage decision:
  Low alert volume (< 1/week): mobile alert with acknowledge.
  Medium alert volume (1-5/week): follow-the-sun or secondary night shift.
  High alert volume (> 5/night): dedicated night shift with compensation.
```

### Holiday and Weekend Coverage

```
Holidays:
  - Pre-assign holiday coverage 3 months in advance.
  - Holiday rotation counts double for future scheduling.
  - Major holidays (Christmas, NYE) get maximum compensation.

Weekends:
  - Weekend shifts: Friday 18:00 to Monday 08:00.
  - Count as 1.5-2x weekday shift for scheduling purposes.
  - If weekend is quiet, consider Friday 18:00 to Sunday 20:00.
```

---

## Escalation Policy Architecture

### Multi-Level Escalation

```
Level 1: Primary On-Call Engineer
  Role: First responder
  Time to acknowledge: 5 min (P0), 15 min (P1)
  Responsibilities: Triage, containment, initial remediation

Level 2: Secondary On-Call Engineer
  Role: Support / backup
  Time to acknowledge: 15 min (P0), 30 min (P1)
  Responsibilities: Assist primary, handle high-complexity issues

Level 3: Team Lead / Subject Matter Expert
  Role: Escalation point
  Time to acknowledge: 30 min (P0), 1 hr (P1)
  Responsibilities: Major incident decision-making, cross-team coordination

Level 4: Engineering Manager / Director
  Role: Crisis management
  Time to acknowledge: 1 hr (P0)
  Responsibilities: Business impact decisions, stakeholder communication

Level 5: CTO / VP Engineering
  Role: Executive escalation
  Time to acknowledge: 2 hr (P0)
  Responsibilities: Company-wide communication, resource mobilization
```

### Escalation Timing

```
P0 escalation chain:
  0-5 min:     Primary should acknowledge
  5-10 min:    Auto-escalate to Secondary if not acknowledged
  10-15 min:   Auto-escalate to Team Lead
  15-30 min:   Auto-escalate to Engineering Manager
  30-60 min:   Auto-escalate to CTO

P1 escalation chain:
  0-15 min:    Primary should acknowledge
  15-30 min:   Auto-escalate to Secondary
  30-60 min:   Auto-escalate to Team Lead

P2 escalation chain:
  0-60 min:    Primary should acknowledge
  60-120 min:  Auto-escalate to Secondary (Slack only)
```

### Escalation Conditions

```
Escalate when:
  - Alert not acknowledged within SLA.
  - Incident unresolved within 30 minutes (P0).
  - Incident scope exceeds single team ownership.
  - Requires executive decision (customer impact, spend, etc.).

Do NOT escalate when:
  - Primary is actively working the incident.
  - Incident resolution is in progress with expected resolution.
  - Issue is informational only (P3).
```

---

## Handover Procedures

### Daily Handover

```
Timing: At shift change, 15-minute overlap if possible.

Agenda:
1. Active incidents review (current status, next steps, expected resolution).
2. Open tickets related to ongoing issues.
3. Maintenance windows scheduled during next shift.
4. Known conditions (deployments, A/B tests, expected traffic).
5. System state summary (any degraded services, recent changes).
6. Contact information for ongoing communication threads.

Documentation:
  Handover document in shared space (Confluence, Notion, shared doc):
  - Current incidents with status.
  - Anything the next shift should watch for.
  - Links to relevant dashboards and runbooks.
  - Slack threads or tickets in progress.
```

### Weekly Handover

```
Timing: Last day of on-call shift, Friday 16:00.

Format: 15-minute sync meeting + written handover doc.

Agenda:
1. Summary of incidents during the week (count, severity, resolution).
2. Post-mortems or incident reviews in progress.
3. Open action items and owners.
4. Recurring issues that need systemic fix.
5. Feedback on tools, runbooks, and processes.
6. Recommendations for next on-call engineer.

Written handover includes:
  - Incident log (severity, duration, root cause, actions taken).
  - Current state of all open issues.
  - Links to runbooks that need updating.
  - Suggestions for process improvement.
```

### Emergency Handover

```
When primary becomes unavailable mid-shift:
1. Alert secondary immediately about primary unavailability.
2. Secondary becomes primary for remainder of shift.
3. Document reason for handover (medical, personal, family).
4. Reschedule primary for catch-up shift within next rotation cycle.
5. Manager rebalances schedule if needed.

When incident needs cross-team handover:
1. Summarize incident timeline and current state.
2. Transfer relevant Slack threads and tickets.
3. Include next expected actions and decision-maker.
4. Confirm acceptance with receiving team.
```

---

## Incident Response Workflow

### Alert Receipt

```
Step 1: Acknowledge alert within SLA.
  5 min for P0, 15 min for P1, 60 min for P2.

Step 2: Assess severity.
  Is this a real incident?
  What is the user impact?
  Does this need immediate response or can it wait?

Step 3: Declare if needed.
  Create incident channel.
  Include relevant stakeholders.
  Start incident timeline.
```

### Triage and Containment

```
Step 1: Check runbook for the alert.
  Follow diagnostic steps.
  Document findings.

Step 2: Determine blast radius.
  How many users/services are affected?
  Is it getting worse?
  Can we contain?

Step 3: Contain the issue.
  Rollback recent deployment.
  Route traffic away from affected region.
  Scale up resources if capacity issue.
  Block bad traffic if security issue.

Step 4: Decide response mode.
  If containment is possible: fix mode.
  If containment not possible: mitigate and escalate.
```

### Remediation

```
Step 1: Identify root cause.
  Follow diagnostic steps.
  Check metrics, logs, traces.
  Determine trigger (deployment, config, traffic, dependency).

Step 2: Apply fix.
  For code issue: rollback or hotfix (with approval).
  For config issue: revert config change.
  For capacity issue: scale up, optimize.
  For dependency issue: failover, contact dependency owner.

Step 3: Verify fix.
  Check metrics return to normal.
  Confirm no cascading failures.
  Validate with test traffic.
```

### Resolution and Follow-Up

```
Step 1: Resolve alert.
  Confirm service is healthy.
  Close incident channel.
  Update stakeholders.

Step 2: Create incident report.
  Timeline of events.
  Root cause analysis.
  Blast radius documentation.
  Action items to prevent recurrence.

Step 3: Schedule post-mortem (if P0/P1).
  Within 5 business days.
  Blameless format.
  Focus on process improvements.
  Track action items to completion.
```

---

## Burnout Prevention

### Shift Frequency Guidelines

```
Maximum on-call load:
  - No more than 1 week in 4 (25% on-call ratio).
  - No more than 1 weekend in 6.
  - No consecutive on-call shifts.
  - Maximum 12 hours of active incident response per day.
  - Mandatory 8 hours of uninterrupted sleep time (can opt out).

Recommended ratios:
  - Healthy: 1 week on, 5+ weeks off (16% or less).
  - Moderate: 1 week on, 3 weeks off (25%).
  - Stretch: 1 week on, 2 weeks off (33%).
  - Unhealthy: > 33% on-call ratio.
```

### Page Volume Control

```
Target: < 5 pages per week per engineer.

If page volume exceeds target:
  - Review and tune alert thresholds (reduce false positives).
  - Move noisy alerts to dashboard-only.
  - Automate common remediation.
  - Reduce alert scope (only page for real incidents).
  - Increase for: duration requirement.

Firefighting mode detection:
  > 10 pages/day for 3+ consecutive days = firefighting.
  Activate: manager review of alert rules, additional staffing, rotation override.
```

### Fatigue Detection Signals

```
Signals:
  - Engineer acknowledges alerts but stops documenting actions.
  - Runbooks not followed or not updated.
  - Post-mortem quality declining.
  - Increased time to acknowledge.
  - Increase in handover issues.
  - Engineer expresses burnout or leaves on-call rotation.

Actions:
  - Immediate: shorten rotation, add backup.
  - Short-term: reduce alert volume, automate fixes.
  - Long-term: redistribute on-call load, adjust team composition.
```

### Support During On-Call

```
During on-call shift:
  - No mandatory meetings during on-call (except critical).
  - No sprint commitments outside of incident response.
  - Secondary can take non-critical tasks but must be available.
  - Shift can be shared (morning/evening split) if needed.

Post-incident decompression:
  - 24-hour cool-down after major incident (no meetings).
  - Manager check-in after P0 incident.
  - Time-banking for incidents outside normal hours.
```

---

## On-Call Compensation

### Compensation Models

```
Model 1: Fixed stipend per shift
  Amount: $XXX per week on-call (adjust for cost of living).
  Pros: Simple, predictable.
  Cons: Doesn't account for actual incident volume.

Model 2: Per-incident compensation
  Amount: $XX per acknowledged alert within SLA.
  Pros: Fair, compensates for actual work.
  Cons: Can incentivize alert volume over automation.

Model 3: Time-in-lieu (TIL)
  Amount: 1.5x time off for after-hours incidents.
  Pros: Common in EMEA, work-life balance focus.
  Cons: Requires tracking, can accumulate.

Model 4: Salary adjustment
  Amount: 10-20% base salary increase for regular on-call.
  Pros: Simple, predictable, no tracking needed.
  Cons: Same pay for easy and hard rotations.

Recommended: Hybrid (fixed stipend + TIL for night/weekend incidents).
```

### Time-in-Lieu Tracking

```
TIL accrual rules:
  - 1 hour TIL per hour of incident response outside business hours (18:00-08:00).
  - 1.5x for weekend and holiday incidents.
  - Minimum 1 hour per incident (even if resolved in 5 minutes).
  - TIL must be used within 90 days.
  - Manager cannot deny TIL usage (except for critical coverage gaps).
```

---

## On-Call Readiness

### Training Requirements

```
Before first on-call shift:
  - Complete on-call training (monitoring tools, escalation process).
  - Shadow a senior engineer for 1 full rotation.
  - Read all runbooks for owned services.
  - Access verified (PagerDuty, Slack, dashboards, VPN).
  - Pass on-call readiness checklist.
  - Execute a practice incident (fire drill).

Ongoing:
  - Quarterly runbook review updates.
  - Monthly fire drill participation.
  - New service onboarding includes runbook creation.
```

### Readiness Checklist

```
Before shift starts:
  [ ] Laptop charged with all tools installed.
  [ ] PagerDuty/Opsgenie app installed and notifications enabled.
  [ ] Slack notifications enabled for on-call channels.
  [ ] VPN access working.
  [ ] Production access verified.
  [ ] Dashboards bookmarked.
  [ ] Runbooks accessible offline (optional).
  [ ] Secondary contact stored in phone.
  [ ] Emergency contact numbers stored.
  [ ] Manager contact stored.
```

### Runbook Quality

```
Every runbook must be tested at least annually.

Quality criteria:
  - Step-by-step instructions that any engineer can follow.
  - Commands that can be copy-pasted (parameterized).
  - Expected output for each diagnostic step.
  - Clear decision tree for common scenarios.
  - Escalation contacts with availability windows.
  - Screenshots of dashboards and tools.
  - Last reviewed date visible.

Runbook maintenance:
  - Update within 1 week of incident that revealed gaps.
  - Review quarterly for stale content.
  - Test during fire drills.
  - Version-controlled alongside code.
```

---

## Rotation Tooling

### PagerDuty Configuration

```
Services:
  - One service per application or infrastructure component.
  - Service linked to escalation policy.
  - Integration with monitoring tool (Prometheus, Datadog, Grafana).

Escalation policies:
  - Level 1: Primary on-call (schedule-based).
  - Level 2: Secondary on-call (schedule-based).
  - Level 3: Team lead (fixed override if needed).
  - Level 4: Engineering manager (fixed override).

Schedules:
  - Primary on-call: weekly rotation, Monday 09:00.
  - Secondary on-call: same schedule, offset.
  - Layer (primary/secondary) support for clear differentiation.

Notification rules:
  - P0: Push notification -> Phone call -> SMS.
  - P1: Push notification -> Phone call.
  - P2: Push notification only.
  - P3: Email only.
```

### Opsgenie Configuration

```
Teams:
  - Each service team as separate Opsgenie team.
  - On-call schedule per team.

Routing:
  - Alert tags determine team routing:
    tag:service:payment -> payment team
    tag:severity:P0 -> site-reliability team first

Rotations:
  - Weekly rotation for primary.
  - Daily rotation for follow-the-sun.
  - Override support for PTO.

Notification policies:
  - Suppress non-business-hour P2/P3 during night (or auto-create ticket).
  - Forward P0 to on-call regardless of time.
```

### Squid Game / Incident Response

```
All tools integrated via webhook:
  PagerDuty alert -> Slack incident channel created automatically
  Slack incident channel -> Zoom bridge attached
  Incident timeline logged automatically
  Status page updated via approval workflow
  Post-mortem template auto-populated
```

---

## Metrics and Improvement

### Key On-Call Metrics

| Metric | Target | Measurement |
|---|---|---|
| Time to Acknowledge (TTA) | < 5 min P0, < 15 min P1 | PagerDuty |
| Time to Resolve (TTR) | < 1 hr P0, < 4 hr P1 | Incident tracking |
| Page volume | < 5/week/engineer | PagerDuty |
| False positive rate | < 20% | Manual review sampling |
| Escalation rate | < 10% of incidents | PagerDuty |
| Incident recurrence rate | < 5% within 30 days | Incident database |
| On-call satisfaction | > 4/5 | Quarterly survey |

### Dashboard Creation

```
On-call health dashboard:
  - Active incidents by severity.
  - MTTA and MTTR trend (30-day rolling).
  - Page volume per engineer per shift.
  - Escalation rate by team.
  - False positive rate by alert rule.
  - On-call schedule compliance (vacation coverage).
  - Action item closure rate from post-mortems.
```

### Incident Review Process

```
Weekly incident review (30 min):
  - Review all P2+ incidents from the week.
  - Identify patterns: recurring issues, seasonal effects.
  - Prioritize action items.
  - Check progress on previous action items.
  - Tune alert rules based on feedback.

Monthly on-call retrospective:
  - Review on-call experience feedback.
  - Adjust rotation schedule if needed.
  - Review page volume by enginee r.
  - Identify training needs.
  - Plan runbook improvements.

Quarterly on-call health review:
  - Full metrics review.
  - Burnout risk assessment.
  - Rotation model effectiveness review.
  - Compensation adjustment if needed.
  - Tooling improvement roadmap.
```

### Post-Mortem Quality

```
Blameless post-mortem template:

Title: {Date} - {Incident Title} - {Severity}

Summary:
  - What happened? (2-3 sentences)
  - Impact: {users affected, revenue impact, duration}

Timeline:
  - {Time} Event
  - {Time} First alert
  - {Time} Incident declared
  - {Time} Root cause identified
  - {Time} Fix applied
  - {Time} Service restored

Root Cause:
  - What went wrong?
  - Why was it not caught earlier?
  - Why did it cause this severity of impact?

Contributing Factors:
  - System complexity
  - Missing tests
  - Insufficient monitoring
  - Configuration error

Action Items:
  - Immediate: {owner, due date}
  - Short-term: {owner, due date}
  - Long-term: {owner, due date}

Prevention:
  - How will we prevent recurrence?
  - How will we detect faster next time?
  - How will we mitigate impact next time?

Lessons Learned:
  - What went well?
  - What went poorly?
  - What surprised us?
```

---

## Specialized On-Call Patterns

### On-Call for Databases

```
Specific considerations:
  - Database on-call requires deeper expertise.
  - Separate rotation from application on-call.
  - Runbooks for: replication lag, schema migration recovery, failover.
  - Cross-team dependency: notify application owners of DB issues.
  - Chaos engineering: periodic failover tests.
```

### On-Call for Security Incidents

```
Security-specific:
  - Security on-call is separate from engineering on-call.
  - 24/7 coverage for P0 security events.
  - SLA: 15 min for active exploitation, 1 hr for potential threats.
  - Runbooks for: credential leakage, DDoS, ransomware, data breach.
  - Legal/comms team escalation path.
  - Air-gapped communication channel for sensitive incidents.
```

### On-Call During Major Events

```
Black Friday / product launch:
  - Double staffing (2x primary, 1x secondary).
  - War room with representatives from all teams.
  - Executive on-site for decision-making.
  - Pre-event: load testing, runbook review, drill.
  - Post-event: debrief within 48 hours.
  - Compensate: extra TIL or bonus for event coverage.
```

### On-Call for Startups

```
Early-stage differences:
  - Smaller team => more frequent on-call.
  - Compensate with equity or flexible schedule.
  - Founder/CTO often on-call continuously.
  - Focus on alert reduction through automation.
  - Progress toward sustainable rotation as team grows.
  - Accept higher on-call ratio temporarily but have improvement plan.

Startup progression:
  < 5 engineers: Everyone always on-call.
  5-10 engineers: Weekly rotation (1 on, N-1 off).
  10-20 engineers: Primary/secondary rotation.
  20+ engineers: Follow-the-sun or dedicated SRE team.
```

## Handoff
`alerting-rule-design.md` for alert rule design patterns.
`../../../management/team-rules/` for team-level incident response procedures.
