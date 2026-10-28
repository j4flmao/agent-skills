# Incident Response Fundamentals

The minimum working model of incident response for software services: what counts as an incident, the roles, the first-hour flow, communication, and the handoff into a post-incident review. Severity details, runbooks, war-room protocol and postmortem templates live in sibling references.

## Definitions

| Term | Meaning |
|------|---------|
| Incident | Unplanned degradation or interruption of a service, or an event that threatens one (including security events), requiring coordinated response |
| Severity | Impact-based classification that sets urgency and who gets involved |
| Mitigation | Action that stops or reduces customer impact (rollback, failover, feature flag off) |
| Resolution | Underlying cause fixed and the system back to normal operation |
| Postmortem / post-incident review | Blameless analysis producing learning and follow-up actions |

Mitigate first, investigate later. The fastest path to reduced impact (rollback, disable a feature, shed load) beats finding the root cause during the incident.

## Roles

| Role | Responsibility | Not responsible for |
|------|----------------|---------------------|
| Incident Commander (IC) | Owns the incident: coordinates, decides, delegates, tracks state | Debugging hands-on (in larger incidents) |
| Operations / technical lead | Leads investigation and mitigation work | External communication |
| Communications lead | Status page, stakeholder and customer updates on a schedule | Technical decisions |
| Scribe | Timeline of observations, decisions and actions with timestamps | — |
| Subject-matter experts | Specific systems, pulled in by the IC | Running the incident |

In small incidents one person may hold several roles; the IC role is always explicitly assigned ("I am IC").

## Severity at a Glance

| Level | Typical criteria | Response |
|-------|------------------|----------|
| SEV1 | Major customer-facing outage, data loss/exposure, security breach in progress | Page immediately, all hands, exec notification, public status updates |
| SEV2 | Significant degradation or a key feature down for many users | Page on-call, dedicated IC, status page as appropriate |
| SEV3 | Minor or partial impact, workaround exists | Business-hours handling, ticket |
| SEV4 | No user impact, potential risk | Backlog |

Declare high and downgrade later; under-declaring delays help. Exact criteria belong in `severity-classification.md`.

## First-Hour Flow

```text
detect ─► acknowledge ─► declare & assign IC ─► assess impact ─► mitigate ─► communicate ─► monitor
   ▲                                                    │                          │
   └──────────────── re-evaluate every 15–30 min ◄──────┴──────────────────────────┘
```

1. **Detect**: alert, customer report, or engineer observation. Alerts should page on symptoms (error rate, latency, saturation of user-facing SLOs), not only causes.
2. **Acknowledge** the page within the on-call target.
3. **Declare**: open the incident channel/ticket, set severity, name the IC.
4. **Assess**: who is affected, since when, how badly, is it getting worse? Check recent changes (deploys, config, feature flags, infra events).
5. **Mitigate**: prefer reversible, fast actions: roll back the last deploy, turn off a flag, fail over, scale out, rate-limit abusive traffic.
6. **Communicate**: internal update immediately; external status update for customer-visible SEV1/SEV2.
7. **Monitor** until metrics are stable for an agreed period, then mark mitigated/resolved.

## Recent-Change Checklist

| Source | Question |
|--------|----------|
| Deploy history | Did anything ship in the last hours? Can we roll it back? |
| Feature flags | Was a flag flipped or a rollout percentage increased? |
| Config/infra | Terraform applies, Kubernetes changes, certificate or DNS changes, quota changes |
| Dependencies | Status pages of cloud providers and third-party APIs |
| Traffic | Unusual volume, new client version, bot traffic |

Most incidents correlate with a change; rolling back is often the fastest mitigation even before proof.

## Communication

Internal update template (every 30 minutes for SEV1, 60 for SEV2, or on state change):

```text
[SEV2] Checkout errors — update 14:30 UTC
Status: Mitigating
Impact: ~8% of checkout attempts failing (EU region) since 13:52
Actions: Rolled back payments-service v2.41 at 14:20; error rate dropping
Next: Confirm recovery, update by 15:00
IC: @dana  Comms: @lee
```

External status page update:
- Plain language, customer impact, workaround if any, next update time.
- No speculation about cause, no internal names, no blame of vendors in the first updates.

## Working Agreements

- One channel per incident; decisions recorded there.
- The IC asks for explicit acknowledgements: "Sam, roll back payments-service; report back in 10 minutes."
- Changes during the incident are announced before execution.
- Hand over the IC role explicitly when shifts change, with a summary.
- Bring in help early; escalation is normal, not a failure.

## After the Incident

1. Mark resolved with timestamps (start, detection, mitigation, resolution).
2. Schedule a blameless review within a few business days for SEV1/SEV2.
3. Produce a timeline, contributing factors, what went well, what was hard, and tracked action items with owners.
4. Feed learnings into alerts, runbooks, tests and architecture.

## On-Call Basics

- Rotations with primary and secondary; reasonable shift lengths; handoff notes.
- Every paging alert has a runbook link and is actionable; remove or downgrade noisy alerts.
- Compensate and protect on-call time; track pages per shift as a health metric.

## Checklist

- [ ] Severity levels and paging policy documented
- [ ] IC assigned explicitly for every incident
- [ ] Mitigation-first mindset; rollback paths tested
- [ ] Status update cadence and templates ready
- [ ] Timeline captured during the incident
- [ ] Blameless review with owned action items
