# Incident Command Structure

## Overview

The Incident Command System (ICS) provides a standardized organizational structure for managing incidents of any scale. For SRE teams, this structure ensures clear roles, communication channels, and decision-making authority during production incidents.

## ICS Role Structure

### Core Roles

```
Incident Commander (IC)
  ├── Communications Officer (CO)
  ├── Scribe
  ├── Logistics Coordinator (LC)
  └── Technical Leads
      ├── Service Area A (SA)
      ├── Service Area B (SA)
      └── Subject Matter Experts (SMEs)
```

### Role Descriptions

#### Incident Commander (IC)

The IC owns the incident response and is responsible for driving resolution. They do NOT debug — they coordinate.

**Responsibilities:**
- Declare and terminate the incident
- Assign roles (CO, Scribe, SAs)
- Drive the timeline and decision-making
- Approve escalation decisions
- Ensure the Scribe is documenting accurately
- Manage stakeholder communication (via CO)
- Make GO/NO-GO decisions on mitigation actions
- Ensure team wellness (breaks, rotations)
- Hand off command cleanly during shift changes

**Qualities:**
- Strong process orientation
- Able to maintain calm under pressure
- Good judgment on when to escalate
- Not the most senior technical person (usually)
- Trained and certified in incident command

**DO NOT:**
- Debug or investigate
- Write code changes during the incident
- Get pulled into technical discussions
- Take over someone's keyboard or screen

#### Communications Officer (CO)

The CO manages external communication during the incident.

**Responsibilities:**
- Post status updates to status page (every 15-30 min)
- Communicate with stakeholders (product, support, executives)
- Escalate to VP Eng / CTO when appropriate
- Manage customer-facing messaging
- Draft root cause analysis (RCA) communication
- Coordinate with PR/legal if needed

**Communication Templates:**

```markdown
# Status Update Template
**Incident:** [INCIDENT-XXX] Brief Description
**Status:** [Investigating / Mitigating / Monitoring / Resolved]
**Severity:** [SEV1 / SEV2 / SEV3]
**Started:** [Timestamp]
**Services Affected:** [list]
**User Impact:** [description of what users experience]
**Current Actions:** [what the team is doing]
**Next Update:** [time]

**Scheduled Cadence:**
- SEV1: Every 15 minutes
- SEV2: Every 30 minutes
- SEV3: Every 60 minutes
- Post-resolution: +1h, +4h, +24h follow-ups
```

```markdown
# Stakeholder Update
Incident: [INCIDENT-XXX]
Impact: [X% of users affected, Y service degraded]
Current Status: [Investigating]
Estimated Resolution: [TBD / specific time]
Action Needed: [none / notify customers / prepare rollback]
```

```markdown
# Customer-Facing Status
We are currently investigating an issue affecting [service].
Users may experience [specific symptoms].
Our team is actively working on a fix.
Next update in [timeframe].

Status page: [status.company.com/incidents/XXX]
```

#### Scribe

The Scribe maintains the incident timeline and records all actions.

**Responsibilities:**
- Record all key events with timestamps
- Document decisions and rationale
- Track action items and owners
- Log all communication (Slack, Zoom, phone)
- Capture screenshots/data that will inform postmortem
- Maintain the incident document

**Timeline Template:**

```markdown
# Incident Timeline: [INCIDENT-XXX]

## Detection
[HH:MM] UTC - Alert triggered: [alert name]
[HH:MM] UTC - On-call acknowledged
[HH:MM] UTC - Incident declared by [IC name]

## Investigation
[HH:MM] UTC - SA [name] assigned to [service area]
[HH:MM] UTC - Initial finding: [description]
[HH:MM] UTC - Escalated to [team/individual]

## Mitigation
[HH:MM] UTC - Decision to [action] by [IC name]
[HH:MM] UTC - [Mitigation action] executed
[HH:MM] UTC - Metrics improving: [details]
[HH:MM] UTC - User impact reduced: [details]

## Resolution
[HH:MM] UTC - Incident resolved: [criteria met]
[HH:MM] UTC - Monitoring period started
[HH:MM] UTC - Incident declared resolved by [IC name]

## Post-Incident
[HH:MM] UTC - Status page updated
[HH:MM] UTC - RCA scheduled for [date]
[HH:MM] UTC - Action items created
```

#### Logistics Coordinator (LC)

The LC handles resource and tooling needs during the incident.

**Responsibilities:**
- Coordinate additional team members
- Set up communication channels (Slack, Zoom, bridge)
- Ensure tooling access (dashboards, logs, DB)
- Order food/breaks for extended incidents
- Track team rotation schedule
- Manage incident war room
- Handle administrative needs

#### Subject Matter Experts / Service Area Leads (SA)

SAs own the technical investigation within their area.

**Responsibilities:**
- Lead investigation in assigned service area
- Report findings to IC
- Propose mitigation options with risk assessment
- Execute approved mitigation actions
- Request additional SAs or SMEs as needed
- Hand off investigations during rotation

**DO:**
- Focus on one service area at a time
- Communicate clearly: "I found X, I think the cause is Y, I propose Z"
- Escalate blockers immediately
- Rotate out before exhaustion

**DON'T:**
- Make unilateral decisions that affect other services
- Implement mitigation without IC approval
- Stay on past effectiveness (rotate every 2-3 hours)

## Escalation Paths

### Time-Based Escalation

```
SEV4 (Minor):
  15 min: On-call engineer investigates
  30 min: No resolution → notify team lead
  60 min: No resolution → create ticket, continue investigation

SEV3 (Limited):
  5 min: On-call acknowledges
  15 min: No resolution → escalate to SRE lead
  30 min: No resolution → IC assigned, incident declared
  60 min: No resolution → escalate to engineering manager

SEV2 (Major):
  Immediate: IC assigned, incident declared
  15 min: No resolution → escalate to SRE director
  30 min: No resolution → escalate to VP Engineering
  60 min: No resolution → escalate to CTO

SEV1 (Critical):
  Immediate: IC assigned, incident declared, war room opened
  5 min: SRE director notified
  15 min: VP Engineering notified
  30 min: CTO notified
  60 min: CEO notified (if customer-facing)
```

### Technical Escalation

```yaml
# incident-escalation-paths.yaml
escalation_paths:
  database:
    l1: dba-oncall@team.com
    l2: database-engineering@team.com
    l3: vendor-support@vendor.com
  networking:
    l1: network-oncall@team.com
    l2: cloud-infra@team.com
    l3: cloud-provider-support
  application:
    l1: service-owner-oncall@team.com
    l2: platform-engineering@team.com
    l3: architecture-review@team.com
  security:
    l1: security-oncall@team.com
    l2: security-engineering@team.com
    l3: external-incident-response
```

## Communication Protocols

### Status Update Cadence

| Minutes Since Declaration | Update Cadence | Audience |
|--------------------------|----------------|----------|
| 0-30 | Every 5 min | Incident channel |
| 30-120 | Every 15 min | Incident channel + stakeholders |
| 120-480 | Every 30 min | All of the above + status page |
| 480+ | Every 60 min | All of the above |
| Post-resolution | +1h, +4h, +24h | All of the above + postmortem |

### Communication Channels

```yaml
# incident-communication-channels.yaml
channels:
  primary:
    type: slack
    channel: "#incident-XXX"
    purpose: "Real-time coordination among responders"
    retention: "90 days"
  
  command:
    type: zoom
    link: "https://zoom.us/j/incident-war-room"
    purpose: "IC, SAs, and decision-makers"
    recording: true
  
  external:
    type: status_page
    url: "https://status.company.com"
    purpose: "Customer-facing updates"
    integration: "automatic via incident tool"
  
  stakeholder:
    type: email
    distribution: "engineering-leads@company.com"
    purpose: "Executive visibility"
    cadence: "every 30 minutes"
  
  escalation:
    type: pagerduty
    purpose: "Page additional responders"
    auto_escalate: true
```

### Handoff Procedures

**IC Handoff:**

```markdown
# IC Handoff Template

## Current State
- Incident: [INCIDENT-XXX]
- Duration: [X hours]
- Current Severity: [SEVX]
- Services Affected: [list]

## What We Know
- Root cause hypothesis: [description]
- Evidence collected: [links to dashboards, logs, screenshots]
- What has been ruled out: [list]

## Actions Taken
- [action 1] — completed at [time]
- [action 2] — completed at [time]
- [action 3] — in progress, ETA [time]

## Pending Actions
- [action 4] — waiting on [dependency]
- [action 5] — needs decision from [person]

## Open Decisions
- [decision 1]: options are [A/B/C], recommended [A]
- [decision 2]: waiting for [data]

## Communications Status
- Last stakeholder update: [time]
- Last status page update: [time]
- Pending communications: [list]

## Team Status
- Responders currently active: [names + roles]
- Responders needing rotation: [names]
- Time since last break: [X hours]

## Handoff Checklist
- [ ] IC briefs incoming IC on all above
- [ ] Scribe confirms timeline is up to date
- [ ] CO confirms communication cadence
- [ ] Incoming IC acknowledges understanding
- [ ] Outgoing IC stays for 15 min overlap
```

**SA Handoff:**

```yaml
# sa-handoff-checklist.yaml
sa_handoff:
  before_leaving:
    - Document current hypothesis
    - Document evidence gathered so far
    - Document experiments tried and results
    - Share relevant dashboard links
    - Share relevant log queries
    - List next experiments to try
    - Brief incoming SA (5 min overlap)
    - Alert IC of the handoff
  
  incoming_sa:
    - Read incident timeline from start
    - Understand current hypothesis
    - Review evidence collected
    - Acknowledge understanding
    - IC confirms role transfer
```

## Post-Incident Review Coordination

### Scheduling

```yaml
# post-incident-review-schedule.yaml
post_incident:
  sev1:
    debrief: "Within 2 hours of resolution"
    rca_draft: "Within 24 hours"
    rca_review: "Within 48 hours"
    rca_published: "Within 72 hours"
    action_items_due: "Within 30 days"
  
  sev2:
    debrief: "Within 4 hours of resolution"
    rca_draft: "Within 48 hours"
    rca_review: "Within 72 hours"
    rca_published: "Within 5 business days"
    action_items_due: "Within 45 days"
  
  sev3:
    debrief: "Within 24 hours"
    rca_published: "Within 1 week"
    action_items_due: "Within 60 days"
```

### RCA Document Template

```markdown
# Post-Incident Review: [INCIDENT-XXX]

## Summary
- **Date:** [date]
- **Duration:** [X hours Y minutes]
- **Severity:** SEV[X]
- **Services Affected:** [list]
- **User Impact:** [description]
- **Lead IC:** [name]
- **Responders:** [names + roles]

## Timeline
[From Scribe's timeline]

## Detection
- How was this incident detected? (alert, user report, proactive)
- Time from introduction to detection: [X minutes/hours]
- Time from detection to mitigation: [X minutes/hours]
- Time from mitigation to resolution: [X minutes/hours]

## Root Causes
### Primary Cause
[Description of the direct cause]

### Contributing Factors
- [Factor 1]: [how it contributed]
- [Factor 2]: [how it contributed]
- [Factor 3]: [how it contributed]

## Impact Assessment
- Total errors: [count]
- Affected users: [count or percentage]
- Revenue impact: [$ amount if measurable]
- SLO attainment during incident: [percentage]
- Error budget consumed: [percentage]

## What Went Well
- [Thing 1]: [why it helped]
- [Thing 2]: [why it helped]

## What Went Wrong
- [Thing 1]: [what failed and why]
- [Thing 2]: [what failed and why]

## Action Items
| ID | Action | Owner | Due Date | Status |
|----|--------|-------|----------|--------|
| AI-001 | [action] | [name] | [date] | [open/closed] |
| AI-002 | [action] | [name] | [date] | [open/closed] |

## Preventative Measures
- Monitoring improvements
- Testing gaps addressed
- Documentation updates
- Process changes

## Appendices
- Relevant dashboards: [links]
- Relevant log queries: [links]
- Code changes: [PR links]
- Communication history: [links]
```

## Large-Scale Incident Management

### Incident Scale Definitions

| Scale | Services Affected | Responders | Duration | Command Structure |
|-------|-------------------|------------|----------|-------------------|
| Small | 1 service | 2-3 people | < 1 hour | Single IC |
| Medium | 2-5 services | 4-8 people | 1-4 hours | IC + SAs |
| Large | 5-15 services | 10-25 people | 4-24 hours | IC + Deputy IC + functional areas |
| Critical | 15+ services | 25+ people | 24+ hours | Multi-team ICS with planning section |

### Large-Scale Expanded Structure

```
Incident Commander
  ├── Deputy IC
  ├── Operations Section
  │   ├── Service Area Alpha (SA)
  │   ├── Service Area Beta (SA)
  │   ├── Service Area Gamma (SA)
  │   └── Infrastructure Support
  ├── Planning Section
  │   ├── Situation Status
  │   ├── Resource Tracking
  │   └── Documentation
  ├── Logistics Section
  │   ├── Communication
  │   ├── Tooling/Access
  │   ├── Team Rotation
  │   └── Facilities
  └── Communications Section
      ├── Internal Comms
      ├── External Comms
      ├── Executive Comms
      └── Status Page
```

## Key Points

- ICS separates command from technical work: IC coordinates, SAs investigate, CO communicates
- Every incident needs a Scribe: accurate timelines are critical for postmortems and learning
- Burnout prevention: rotate IC and SA roles every 2-3 hours during extended incidents
- Structured handoffs prevent information loss during shift changes
- Escalation paths must be pre-defined with time-based triggers for each severity level
- Communication cadence depends on severity: SEV1 updates every 15 minutes, SEV3 every 60
- Post-incident reviews follow a strict timeline: debrief at resolution, RCA within 72 hours for SEV1
- Large-scale incidents require expanded ICS structure with deputy IC and functional sections
- Practice incident command with regular tabletop exercises and incident simulations
- Every incident is an opportunity to improve both the system and the response process
