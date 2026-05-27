# War Room Protocol

## Overview

The war room is the central coordination hub during active incidents. It provides a structured environment for communication, decision-making, and task execution under pressure. This reference covers the complete war room lifecycle from setup through cleanup.

## Incident Command System Roles

### Incident Commander (IC)

The IC owns the incident end-to-end. Responsibilities:
- Declares the incident and assigns severity
- Delegates tasks to SMEs — does NOT debug or investigate
- Makes go/no-go decisions on mitigation strategies
- Communicates with executive stakeholders
- Manages the timeline and decides when to declare resolved
- Hands off to next IC shift when crossing shift boundaries

**IC Selection Criteria:**
- Trained in incident command — not necessarily the most senior engineer
- Rotated every 2 hours during long incidents to prevent fatigue
- Has authority to make operational decisions (feature flags, rollbacks, traffic reroutes)

### Scribe

The Scribe is the single source of truth for the incident timeline. Responsibilities:
- Records every action, decision, and observation with precise timestamps
- Documents all commands run, outputs observed, and conclusions drawn
- Maintains the incident channel bookmark with current status
- Prepares the raw timeline for postmortem use
- Tracks action items and their owners

**Scribe Format:**
```
[T+12min] IC: Jane Smith assigned
[T+14min] SME: Database CPU at 98%, running pg_stat_activity
[T+17min] IC: Decision to failover read replica to primary
[T+19min] SME: Failover initiated
[T+22min] Database CPU drops to 45%
```

### Subject Matter Expert (SME)

SMEs perform the technical investigation and mitigation. Responsibilities:
- Executes diagnostic commands and reports findings to IC
- Proposes mitigation strategies to IC for approval
- Implements approved mitigation steps
- Escalates to other SMEs if issue is outside their domain
- Multiple SMEs may work in parallel on different subsystems

**SME Types During an Incident:**
- Infrastructure SME (networking, Kubernetes, cloud)
- Application SME (service code, database queries)
- Security SME (breach investigation, intrusion analysis)
- Data SME (data integrity, corruption assessment)

### Communications Lead (Comms)

Comms handles all external and stakeholder communication. Responsibilities:
- Drafts and sends status updates at defined cadence
- Updates status page (Statuspage, incident.io)
- Manages stakeholder expectations on ETA
- Coordinates regulatory notifications if required (GDPR breach, SOC2)
- Filters incoming questions so IC and SMEs stay focused

## War Room Setup

### Digital War Room

The war room has three components:

1. **Communication Channel** — Slack or Teams dedicated channel
2. **Voice Bridge** — Zoom, Google Meet, or Slack Huddle for real-time discussion
3. **Dashboard** — Shared screen with monitoring, logs, and timeline

### Incident Channel Setup Template

```
Channel: #inc-{date}-{short-description}
Example: #inc-2026-05-26-api-outage

Pinned Message:
────────────────────────────────────────────
INCIDENT: #inc-2026-05-26-api-outage
SEVERITY: SEV1
STATUS: Investigating
IC: @jane.smith
SCRIBE: @john.doe
SME: @backend-team
COMMS: @sarah.lee
BRIDGE: https://zoom.us/j/123456789
STARTED: 2026-05-26T14:32:00Z
STATUS PAGE: https://status.company.com
LATEST UPDATE: [T+12min] Investigating elevated error rates on API gateway
────────────────────────────────────────────
```

### Channel Sections

Organize the incident channel with section dividers:

```
─── INCIDENT INFO ───
Pinned message with current status

─── TIMELINE ───
All scribe entries (threaded for clarity)

─── INVESTIGATION ───
SME findings, diagnostic output, hypotheses

─── DECISIONS ───
Key decisions made by IC with rationale

─── COMMUNICATIONS ───
Status updates sent, stakeholder responses

─── ACTION ITEMS ───
Open and completed action items
```

### Dashboard Setup

The war room dashboard should display:
- **Service Health**: Current status of affected services (Grafana, Datadog)
- **Error Rate**: Error rate graph with incident start marked
- **Latency**: p50/p95/p99 latency overlay
- **Timeline**: Real-time incident timeline
- **Runbook**: Relevant runbook steps
- **Deployments**: Recent deploy history for affected services

## Decision-Making Under Uncertainty

### Decision Framework

When information is incomplete, use this framework:

| Question | Action |
|----------|--------|
| Is the system degrading? | Mitigate first, investigate after |
| Is there a known mitigation? | Execute known runbook step |
| Is the mitigation reversible? | Execute — reversible actions are low risk |
| Is the mitigation irreversible? | Escalate to senior IC for approval |
| Can we reproduce the issue? | Try in staging, then proceed |
| Is this a security incident? | Activate security IC immediately |

### Decision-Making Traps

- **Analysis paralysis**: Set a 5-minute timer for investigation before deciding
- **Bikeshedding**: Focus on high-impact decisions, not trivial details
- **Confirmation bias**: Actively seek disconfirming evidence
- **Social loafing**: Assign specific owners — never ask "someone should..."

## Delegation Patterns

### IC Delegation Script

```
IC: "SME-database, investigate CPU spike on primary. Report back in 5 minutes."
IC: "SME-app, check recent deploy for API gateway. Report back in 3 minutes."
IC: "Scribe, record that we're investigating database CPU and recent deploy."
IC: "Comms, send status update: investigating, no ETA yet."
```

### Delegation Rules

1. **One task per person**: Never assign multiple tasks to one person
2. **Explicit owners**: Always @-mention the assignee
3. **Time-bound**: Always specify a check-in time
4. **Closed-loop**: Assignee confirms receipt and reports completion
5. **Parallel assignments**: Multiple SMEs work simultaneously

### Task Tracking

Use a simple table in the incident channel:

```
Task | Owner | Status | Due
Check database CPU | @db-sme | ✅ Done | T+5min
Check recent deploy | @app-sme | 🔄 In progress | T+3min
Prepare rollback command | @ops-sme | ⏳ Pending | T+10min
```

## Stakeholder Communication Cadence

### Cadence by Severity

| Severity | Update Frequency | Audience | Format |
|----------|-----------------|----------|--------|
| SEV1 | Every 30 minutes | Executive, VP, all-hands | Email + Slack + Statuspage |
| SEV2 | Every 60 minutes | Engineering manager, product | Slack + Statuspage |
| SEV3 | On change | Team lead | Slack |
| SEV4 | No updates needed | None | None |

### Status Update Template

```
INCIDENT: {name}
TIME: {timestamp}
SEVERITY: {SEV1-4}
STATUS: {Investigating/Mitigating/Resolved/Monitoring}

WHAT HAPPENED:
{1-2 sentence description of what went wrong}

CURRENT IMPACT:
- Users affected: {count or percentage}
- Services affected: {list}
- Feature affected: {description}

WHAT WE'RE DOING:
- {action item 1}
- {action item 2}

NEXT UPDATE: {time}

CONTACT: @ic-name or #inc-channel
```

### Stakeholder Types

- **Executive**: Needs business impact, ETA, and customer-facing messaging
- **Product**: Needs feature impact, timeline for restoration
- **Customer support**: Needs talking points for user inquiries
- **Legal/Compliance**: Needs regulatory notification assessment
- **Security team**: Needs intrusion/breach assessment

## Handoff Protocol

### Shift Change During Long Incidents

Incidents lasting more than 2 hours require IC rotation. For SEV1s exceeding 4 hours, rotate all roles.

**Handoff Steps:**

1. **Incoming IC observes** for 15 minutes before taking over
2. **Outgoing IC provides verbal 2-minute summary** covering:
   - Current state and what's known
   - Active tasks and owners
   - Decisions made and rationale
   - Pending decisions needed
   - Stakeholder expectations set
3. **Scribe documents handoff in timeline**
4. **Incoming IC confirms understanding** and takes ownership
5. **Outgoing IC stays available** for 30 minutes as SME

### Handoff Template

```
─── HANDOFF ──────────────────────────────────
TIME: 2026-05-26T16:32:00Z
OUTGOING IC: @jane.smith
INCOMING IC: @mike.johnson

STATE: Investigating database failover
ACTIVE TASKS:
- @db-sme: checking replica sync lag (due T+5min)
- @app-sme: verifying connection pool config (due T+10min)

DECISIONS MADE:
- Failover to read replica completed at T+19min ✓
- Rollback blocked: last deploy was 6h ago, unrelated to symptoms
- NOT connecting directly to prod DB from bastion — use read-only replicas

PENDING DECISIONS:
- Whether to fail back to original primary after sync

STAKEHOLDER EXPECTATIONS:
- Comms just sent update: next update in 30min
- VP expects resolution within 1 hour

OUTGOING IC REACHABLE: @jane.smith — available for 30min
─── END HANDOFF ──────────────────────────────
```

## Tools

### PagerDuty

- **High-urgency notification**: SEV1 and SEV2 incidents
- **Low-urgency notification**: SEV3, non-critical alerts
- **Escalation policies**: Configured per service with primary/secondary/manager
- **Incident tracking**: PagerDuty incidents link to Slack channels
- **On-call schedules**: Weekly rotation with follow-the-sun handoff

### Slack

- **Dedicated channel**: `#inc-{date}-{name}` per incident
- **Slack workflows**: Automate channel creation with `/incident` slash command
- **Slack canvas**: Shared timeline document
- **Slack huddle**: Voice bridge for quick coordination
- **Bookmarks**: Pin current status, dashboard links, runbook links

### Grafana

- **Incident dashboard**: Pre-built dashboard showing key metrics
- **Annotations**: Mark incident start time on all relevant graphs
- **Alert rules**: Configured with proper thresholds and severity mapping
- **Explore**: Ad-hoc query interface for deep investigation

### Communication Flow

```
Detection (PagerDuty alert)
    ↓
Slack channel auto-created
    ↓
IC assigned (first responder or designated IC)
    ↓
Bridge link posted to channel
    ↓
Scribe starts timeline
    ↓
SMEs assigned
    ↓
Comms sends first stakeholder update
    ↓
[Ongoing coordination in channel + bridge]
    ↓
Resolution declared
    ↓
Post-incident cleanup
```

## Escalation Triggers

### When to Escalate Severity

| Trigger | Action |
|---------|--------|
| Incident exceeds 1 hour without resolution | Consider SEV upgrade |
| Blast radius expanding | Escalate to broader IC |
| Security compromise suspected | Escalate to security IC |
| Regulatory breach identified | Escalate to legal/compliance |
| Multiple services affected | Escalate to senior IC |
| IC is unable to make progress | Escalate to more senior IC |

### Escalation Chain

```
Primary IC
    → Senior IC (available for consultation)
    → Engineering Director (executive visibility)
    → VP Engineering (executive decision-making)
    → CTO/CISO (enterprise-wide impact)
```

## Post-Incident Cleanup

### Immediate Cleanup (within 1 hour of resolution)

1. **Archive incident channel**: Rename to `#inc-resolved-{date}-{name}`
2. **Publish final update**: Send last stakeholder update with resolution details
3. **Export timeline**: Scribe exports raw timeline to postmortem document
4. **Schedule postmortem**: SEV1 within 48h, SEV2 within 1 week
5. **Action items**: Create tracking tickets for all action items identified

### Cleanup Checklist

| Item | Owner | Status |
|------|-------|--------|
| Archive Slack channel | IC | |
| Export timeline | Scribe | |
| Update runbook with new findings | SME | |
| File postmortem action items | IC | |
| Schedule postmortem meeting | IC | |
| Send executive summary | Comms | |
| Restore normal monitoring | SME | |
| Verify all mitigations are permanent | SME | |
| Update on-call rotation if handoff occurred | IC | |

### Incident Channel Archive Message

```
INCIDENT RESOLVED: API Outage
SEVERITY: SEV1
DURATION: 2h 14min (14:32 UTC → 16:46 UTC)
IC: @jane.smith → @mike.johnson (handoff at 16:32)
RESOLUTION: Database failover to read replica + connection pool restart
ROOT CAUSE: Connection pool exhaustion due to query spike from new deploy
POSTMORTEM: Scheduled for 2026-05-28 15:00 UTC
ACTION ITEMS: 4 items created in linear
```

## Long Incident Protocol

### Incidents Exceeding 4 Hours

For incidents lasting more than 4 hours:

1. **Mandatory IC rotation**: Every 2 hours
2. **Mandatory SME rotation**: Every 4 hours
3. **Nutrition break**: Ensure all participants are eating and hydrating
4. **Executive escalation**: VP-level visibility
5. **War room expansion**: Dedicated Slack channel sections, separate voice bridges for parallel workstreams
6. **External communications**: Customer-facing status page updates, support team talking points
7. **Legal review**: If data loss or breach possible

### Fatigue Management

| Symptom | Action |
|---------|--------|
| Participants repeating themselves | Rotate out immediately |
| Decisions taking > 5 minutes | Rotate IC |
| Errors in commands or communication | Enforce 5-minute break |
| Participant unavailable for > 30 min | Assume they've rotated off |
| After 8 hours of incident | Mandatory team rotation |

## Key Points

- IC coordinates, does not debug — delegate everything
- Scribe documents every action with timestamps in real-time
- War room has three components: channel, bridge, dashboard
- Stakeholder updates follow severity-specific cadence (SEV1: 30min)
- Handoffs include 15min overlap and documented transfer summary
- Decisions under uncertainty favor reversible actions first
- No task is assigned without an explicit owner and deadline
- Post-incident cleanup must be completed within 1 hour of resolution
- Long incident protocol kicks in at 4 hours with mandatory rotation
- Fatigue management is an IC responsibility — watch for burnout signs
