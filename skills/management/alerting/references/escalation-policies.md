# Escalation Policies

## Escalation Tiers

| Tier | Name | Response SLA | Notified | Authority |
|------|------|-------------|----------|-----------|
| T1 | Primary on-call | 5 min acknowledge | PagerDuty + Slack | Troubleshoot, rollback, feature flag |
| T2 | Secondary on-call | 15 min after T1 timeout | Phone + Slack | Escalate to engineering |
| T3 | Engineering manager | 30 min after T2 timeout | Phone | Resource allocation, declare incident |
| T4 | Incident commander | 60 min | Phone + exec brief | Cross-team coordination |
| T5 | CTO / VP Eng | 90 min | Phone | Public communication, legal |

## Escalation Rules

- T1 handles all alerts first. T1 escalates only after SLA expires or if unable to resolve within 15 min.
- T2 is automatically paged if T1 does not acknowledge within SLA.
- T3 is engaged when incident is classified P0 or when T2 requests escalation.
- T4 is mandatory for any incident affecting paying customers or involving data breach.
- T5 escalation requires CTO approval except for security incidents (automatic).

## Escalation Triggers

| Condition | Action | Escalates To |
|-----------|--------|-------------|
| T1 no acknowledge after 5 min | Auto-page T2 | T2 |
| T1 acknowledges but no status update after 15 min | Slack reminder to T1 | — |
| Incident unresolved after 30 min | Page T3 | T3 |
| P0 incident confirmed | Page T3 + T4 simultaneously | T3 + T4 |
| Security breach or data exposure | Auto-page T5 | T5 |
| Customer-reported outage with >100 users affected | Page T4 immediately | T4 |
| Second P0 within same shift | Rotate fresh T1, page T3 | T3 |

## Escalation Channels

| Tier | Primary | Secondary | Fallback |
|------|---------|-----------|----------|
| T1 | PagerDuty push + SMS | Slack DM + @mention | Email |
| T2 | Phone call | PagerDuty push | Slack DM |
| T3 | Phone call | SMS | Slack @here in #incidents |
| T4 | Phone conference bridge | Phone call | Slack #incident-command |
| T5 | Phone call (executive) | Email to assistant | Slack DM to chief of staff |

## Escalation Timeouts

Configuring proper timeouts prevents alert fatigue while ensuring coverage:

```
PagerDuty rule:
- T1 notification: push + SMS
- T1 acknowledge timeout: 5 min
  - No ack → T2 notified (push + SMS)
- T2 acknowledge timeout: 10 min (total 15 min from first alert)
  - No ack → T3 notified (phone call)
- T3 acknowledge timeout: 15 min (total 30 min)
  - No ack → T4 notified (phone + Slack)
```

## Escalation Policy Template

```yaml
# pagerduty-escalation-policy.yml
name: "Service X Escalation"
escalation_rules:
  - targets: [primary_oncall]
    escalation_delay_minutes: 5
  - targets: [secondary_oncall]
    escalation_delay_minutes: 10
  - targets: [eng_manager]
    escalation_delay_minutes: 15
num_loops: 2
```

## Rotation Handoff

- Handoff occurs every Monday at 09:00 local time
- Outgoing T1 writes handoff summary in #oncall-handoff
- Summary includes: open incidents, ongoing investigations, known issues, maintenance windows
- Incoming T1 shadows for 30 min after handoff
- No handoff during active P0 — extended until incident resolved

## Override Policy

- Planned PTO: swap must be arranged 1 week in advance
- Sick day: notify team lead before shift start, T2 becomes T1
- Holiday: double pay or comp time for on-call coverage
- No two consecutive weeks on primary — mandatory rotation

## Key Points

- Escalation is not failure — it is process. Waiting too long is the failure.
- Every escalation must include context: what happened, what was tried, what is needed.
- Post-incident review must evaluate if escalation timing was appropriate.
- Escalation policies are tested quarterly with drills (fire drills, tabletop exercises).
- Out-of-hours escalation must respect regional timezone — use follow-the-sun handoff.
