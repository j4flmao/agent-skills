# Incident Response Advanced Topics

Scaling incident response beyond a single team: major-incident coordination across organizations, security-incident integration and regulatory notification clocks, automation and ChatOps, learning from incidents beyond root cause, on-call sustainability, and how to use (and not misuse) incident metrics.

## Major Incident Coordination

When an incident spans many teams or lasts many hours, a single channel and one IC stop scaling.

```text
                  Incident Commander (overall)
                 /           |              \
   Ops lead: payments   Ops lead: data   Ops lead: networking
        |                     |                  |
   workstream channel   workstream channel   workstream channel
                 \           |              /
            Liaison / Comms lead ── execs, support, legal, customers
```

Practices:
- Split into workstreams with their own leads and channels; the IC runs a short sync at a fixed cadence (e.g. every 30 minutes).
- Keep a single "current state" document: impact, hypotheses, active actions with owners, decisions, next sync time.
- Plan for duration: rotate ICs and leads every few hours with written handoffs; send people to rest.
- Assign a liaison for executives so they get updates without joining the working channel.
- Freeze unrelated changes in affected systems during the incident.

## Security Incidents

Security incidents follow the same command structure with extra constraints:

| Difference | Implication |
|------------|-------------|
| Adversary may be watching | Use out-of-band communication if internal chat may be compromised |
| Evidence matters | Preserve logs, disk/memory images before wiping; record chain of custody |
| Containment vs. eradication timing | Premature eradication can tip off the attacker; coordinate with the security lead |
| Legal privilege and disclosure | Involve legal counsel early; control who writes what |
| Credentials | Rotate secrets and revoke sessions in a planned order |

Use the NIST SP 800-61 incident handling lifecycle (preparation; detection and analysis; containment, eradication and recovery; post-incident activity) as the common vocabulary with security teams.

### Notification Clocks (examples)

| Regime | Requirement (summary) |
|--------|-----------------------|
| GDPR Art. 33 | Notify the supervisory authority of a personal data breach without undue delay and, where feasible, within 72 hours of becoming aware |
| NIS2 (EU) | Early warning within 24 hours of becoming aware of a significant incident, incident notification within 72 hours, final report within one month |
| DORA (EU financial entities) | Initial notification of major ICT-related incidents on tight deadlines (hours after classification), followed by intermediate and final reports |
| US SEC (public companies) | Form 8-K Item 1.05 within four business days after determining a cybersecurity incident is material |
| Contracts / SLAs | Customer notification terms in DPAs and enterprise agreements |

These clocks start from awareness or determination, not from resolution. Decide in advance who determines applicability (legal/privacy) and build the trigger into the severity process. This table is orientation, not legal advice.

## Automation and ChatOps

Automate the toil, not the judgment:

| Automate | Keep human |
|----------|-----------|
| Create channel, ticket, video bridge, status-page draft on declaration | Severity decisions |
| Page roles by severity and service ownership | Mitigation choice with customer impact |
| Pull recent deploys, flag changes, dashboards into the channel | External messaging approval |
| Timeline capture from channel messages and commands | Declaring resolution |
| Pre-approved runbook actions (rollback, scale, failover) as commands with audit | Novel actions on production data |

```text
/incident declare sev2 "Checkout errors EU" --service payments
/incident role ic @dana
/rollback payments-service --to v2.40 --reason "INC-482 mitigation"
/status draft "We are investigating elevated checkout errors in Europe."
```

Every automated action must be logged with who triggered it; automation that changes production needs the same review as code.

## Learning From Incidents

Root cause analysis that stops at one cause ("human error", "bad deploy") produces weak actions. Stronger practices:

- **Contributing factors**: list technical, organizational and process factors that made the incident possible, worse or longer.
- **Ask how, not why-who**: how did the system allow the change; how did detection work; what information did responders have at each decision point.
- **Look at what went right**: adaptations that limited damage reveal capabilities worth investing in.
- **Action quality**: prefer actions that change the system (guardrails, automation, architecture) over "be more careful" or "add a checklist item".
- **Track action completion** and review themes across incidents quarterly.

## Incident Metrics: Use with Care

| Metric | Use | Caveat |
|--------|-----|--------|
| Time to detect / acknowledge | Alerting and paging health | Depends on detection method |
| Time to mitigate | Effectiveness of rollback/failover paths | Distribution is heavy-tailed; report percentiles or individual incidents, not just means |
| Incident count by severity | Trend signal | Incentivizes under-declaration if used as a target |
| Repeat incidents (same contributing factor) | Effectiveness of follow-ups | Requires consistent tagging |
| Pages per on-call shift, off-hours pages | On-call load | Leading indicator of burnout |
| Error budget consumption | Ties incidents to SLOs | Needs agreed SLOs |

Do not set targets that reward declaring fewer incidents or closing them prematurely. Mean time to recovery across heterogeneous incidents says little; review individual long incidents instead.

## On-Call Sustainability

- Target a manageable number of pages per shift and treat excess as a reliability bug.
- Every page must be actionable, urgent and user-impacting; others become tickets or dashboards.
- Follow-the-sun rotations for global teams where possible; minimum team size for a rotation so people are not on call too often.
- Secondary on-call and clear escalation paths to service owners.
- Post-incident recovery time for responders after long night incidents.

## Exercises

| Exercise | Purpose |
|----------|---------|
| Tabletop | Walk through a scenario verbally; test roles, comms, decision rights, legal triggers |
| Game day | Inject real failures in staging or production with safeguards; test detection and runbooks |
| Chaos experiments | Continuous, automated fault injection with hypotheses and abort conditions |
| Comms drill | Practice status page and executive updates under time pressure |

Run at least one cross-team exercise per quarter for critical services and include the security and legal teams in breach scenarios.

## Third-Party and Cloud Provider Incidents

- Maintain a dependency map with vendor status pages and support contacts.
- Have degraded modes for critical vendors (queue and retry, alternate provider, cached responses).
- Escalate through support with your contract's severity definitions; record vendor ticket IDs in the timeline.

## Checklist

- [ ] Workstream structure and IC rotation defined for long, cross-team incidents
- [ ] Security incident path with evidence preservation and legal involvement
- [ ] Regulatory/contractual notification triggers mapped to severity process
- [ ] Declaration, paging, timeline and status drafting automated; actions audited
- [ ] Reviews identify contributing factors and system-level actions; actions tracked
- [ ] Metrics used for learning, not as targets; on-call load monitored
- [ ] Regular tabletop and game-day exercises
