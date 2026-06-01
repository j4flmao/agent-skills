---
name: team-rules
description: >
  Use this skill when the user asks about team rules, collaboration, code review,
  branch strategy, PR templates, git flow, RFC process, incident response, on-call,
  or decision making.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, team, phase-8]
---

# Team Rules

## Purpose
Establish team collaboration protocols covering code review, branch strategy, communication, incident response, decision-making, working agreements, and knowledge sharing processes that scale from small teams to organizations.

## Agent Protocol

### Trigger
User request includes: `team rules`, `team protocol`, `collaboration`, `code review`, `branch strategy`, `pr template`, `git flow`, `rfc process`, `incident response`, `on-call`, `decision making`, `working agreements`, `team norms`, `async communication`, `meeting cadence`.

### Input Context
- Team size and composition (devs, QA, devops, PM)
- Current workflow issues (slow reviews, broken builds, merge conflicts)
- Technology stack (Git provider, CI platform, communication tools)
- Company culture (remote, office, hybrid)
- Team maturity level and pain points

### Output Artifact
A markdown document containing:
- Code review protocol with review criteria checklist
- Branch strategy specification (GitFlow / Trunk-based)
- Pull request template
- Communication protocols (sync vs async, meeting cadence)
- On-call rotation and incident response procedure
- RFC decision-making process
- Knowledge sharing guidelines
- Working agreements and team norms

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. Output artifacts rendered as markdown.

——

### Completion Criteria
- All protocols are actionable (numbered steps, checklists)
- Review criteria include clear Accept/Reject conditions
- Branch strategy includes naming convention and lifecycle
- Incident response includes severity levels and timeline
- RFC process includes template and approval criteria
- Working agreements documented and socialized

### Max Response Length
4096 tokens

## Workflow

### Step 0: Assess Team Maturity

#### Team Maturity Assessment
```
Level 1 — Forming: No rules, informal processes, chaotic
Level 2 — Norming: Basic rules exist, inconsistently followed
Level 3 — Performing: Rules followed, continuously improved
Level 4 — Optimizing: Metrics-driven, automated enforcement
```

Choose rule complexity based on maturity. Start with 3-5 essential
rules at Level 1. Add ceremony as team grows. Never add rules the
team cannot or will not follow.

### Step 1: Define Working Agreements

#### Working Agreement Template
```
## Communication
- Async-first: prefer Slack/issue comments over meetings
- Sync meetings have agenda shared 24h in advance
- Decisions documented in writing (ADR, issue, PR)
- Assume good intent — ask clarifying questions, not accusations
- Reply within 4 business hours during working hours

## Availability
- Core hours: {start}-{end} local time
- Calendar reflects true availability (focus blocks, PTO, appointments)
- PTO: minimum 2 weeks notice for >2 days

## Decision Making
- Default to autonomy: make decision, document, move on
- Escalate when: high impact, irreversible, cross-team
- Disagree and commit: once decided, everyone supports

## Quality
- No broken builds on main — fix or revert within 30 min
- Tests not optional — every PR includes tests or documented exception
- Tech debt: 15-20% sprint capacity allocated
```

#### Decision Making Level Framework
```
Level | Scope                    | Decision Maker      | Process
L1    | Within team, reversible  | Individual          | Document in ticket
L2    | Within team, irreversible| Team consensus      | ADR + team discussion
L3    | Cross-team               | Tech lead + PM      | RFC + review process
L4    | Organization-wide        | Architecture comm.  | Formal RFC with voting
```

### Step 2: Establish Code Review Protocol

#### Review Criteria Decision Tree
```
PR submitted
├── CI passes?
│   ├── NO → Reject, fix CI issues first
│   └── YES →
│       ├── Single responsibility? (one feature/fix per PR)
│       │   ├── NO → Reject, split PR
│       │   └── YES →
│       │       ├── Tests included for new logic?
│       │       │   ├── NO → Reject, require tests
│       │       │   └── YES →
│       │       │       ├── Any secrets, credentials, hardcoded URLs?
│       │       │       │   ├── YES → Reject, block immediately
│       │       │       │   └── NO →
│       │       │       │       ├── Error paths handled?
│       │       │       │       │   ├── NO → Request changes
│       │       │       │       │   └── YES →
│       │       │       │       │       ├── Scope creep beyond title?
│       │       │       │       │       │   ├── NO → Approve (or comment nits)
│       │       │       │       │       │   └── YES → Reject, re-scope
```

#### Review Criteria Checklist

Every PR must pass all applicable checks before merging:

```
[ ] No commented-out code or console.log/debug statements
[ ] No secrets, credentials, or hardcoded URLs
[ ] Error paths handled (no empty catch blocks)
[ ] Input validation present on all public endpoints
[ ] Tests included for new logic (unit ≥80% coverage for new code)
[ ] No type errors (TypeScript strict / Pyright / mypy)
[ ] No lint violations (ESLint / ruff / dotnet-format)
[ ] Documentation updated if API/behavior changed
[ ] No unused imports or dead code
[ ] Single responsibility per PR (scope limited to one feature/fix)
```

#### Review Process

1. Author opens PR with description and label
2. CI must pass before review starts
3. At least one approval from team member (not author)
4. All reviewer comments addressed (resolved or acknowledged)
5. No force-push after review starts (use merge commits or rebase before review)
6. PR open for max 24 hours before escalation

#### Accept Conditions
- All checklist items checked
- No unresolved blockers from reviewer
- CI green
- No merge conflicts

#### Reject Conditions
- Checklist items unchecked
- CI red (except flaky tests)
- Scope creep (PR does more than title describes)
- Tests missing for changed logic

### Step 3: Choose Branch Strategy

#### Branch Strategy Decision Tree
```
How many production versions maintained concurrently?
├── 1 (single version) → Trunk-based Development (recommended)
│   ├── Feature flags for incomplete work
│   ├── Branches live <2 days
│   └── Tag releases on main
├── 2-3 (patch older versions) → GitHub Flow
│   ├── Release branches for older versions
│   ├── Cherry-pick critical fixes
│   └── Main is always latest
└── 4+ or mobile app store → GitFlow
    ├── develop + main + release branches
    ├── Hotfix branches from main
    └── Version lockstep releases
```

#### Trunk-based Development (Recommended)

```
main ──────── feat/A ──────── feat/B ────────
               │               │
               └── short-lived feature branches, <2 days
```

| Element | Rule |
|---|---|
| **Main branch** | Always deployable. Protected: no direct pushes, PR required. |
| **Feature branches** | Branch from main, merge back via squash-merge. Name: `feat/description`, `fix/description`, `chore/description`. |
| **Branch lifetime** | Max 2 days. Longer? Feature flag or break into smaller PRs. |
| **Hotfix branches** | `hotfix/description` — branch from main, merge with `--no-ff`. |
| **Release branches** | Only if needed for versioning. Prefer tagging on main. |

#### GitFlow (Use ONLY when)

- Multiple concurrent versions in production
- Strict release cadence with version lockstep
- Mobile apps with app store submission gating

### Step 4: Set Up PR Template

```markdown
## Summary
<!-- One sentence: what does this PR do? -->

## Changes
- <!-- bullet list of changes -->

## Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Related Issues
Closes #ISSUE_NUMBER

## Checklist
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings/lint errors
```

### Step 5: Establish Communication Protocols

#### Sync Communication

| Meeting | Frequency | Duration | Attendees |
|---|---|---|---|
| Daily standup | Daily | 15 min | Dev team |
| Sprint planning | Bi-weekly | 60 min | Dev + PM |
| Sprint review | Bi-weekly | 30 min | Dev + PM + stakeholders |
| Retrospective | Bi-weekly | 45 min | Dev team |
| Architecture sync | Weekly | 30 min | Senior devs |
| 1:1 with manager | Weekly | 30 min | Individual |

**Rules**:
- Standup: What I did yesterday, what I'll do today, blockers. No problem-solving in standup.
- Every meeting must have a published agenda 24h before.
- No meeting without a note-taker.
- Async-first principle: if it can be said in writing, don't schedule a meeting.
- Meetings start on time, end on time.
- No meeting without a clear outcome.

#### Meeting Design Patterns
```
Pattern            | When to Use                   | Format
Standup            | Daily coordination            | 15 min, async-first
Sprint planning    | Start of sprint               | 60-90 min, capacity-first
Sprint review      | End of sprint                 | 30 min, demo working features
Retrospective      | End of sprint                 | 45-60 min, blameless
Brainstorm         | Early exploration             | 30 min, no judgment
Decision meeting   | Need to decide                | 30 min, pre-read required
Status update      | Regular check-in              | Prefer async (written)
Workshop           | Complex problem solving       | 2 hours, hands-on
```

#### Async Communication

| Channel | Purpose | Response SLA |
|---|---|---|
| **PR reviews** | Code changes | 4 hours (business hours) |
| **Slack/Discord** | Quick questions | 1 hour |
| **Email** | External communication | 24 hours |
| **RFC doc** | Decisions | 48 hours for feedback |
| **Incident** | Production issues | Immediate |

#### Async Communication Patterns
```
Pattern            | When to Use                          | Format
Decision request   | Need input from specific people       | Structured options + deadline
Status update      | Regular progress sharing              | Bullet list, no meeting needed
RFC                | Significant decision with trade-offs  | Full proposal + comment period
ADR                | Decision already made, documenting    | Context → Decision → Consequences
Question           | Need quick answer                     | Channel question with context
FYI                | Information only, no action needed    | Summary with link to details
```

### Step 6: Implement On-call Rotation

#### Schedule
- Weekly rotation: Mon 09:00 → Mon 09:00
- Primary + secondary on-call
- Handoff during standup every Monday
- Secondary shadows primary for knowledge transfer
- No single person on-call more than 1 week in 4

#### Responsibilities
- Acknowledge alerts within 5 minutes
- Respond to incidents per severity
- Update status page for user-facing incidents
- Document post-mortem within 48 hours of incident resolution
- Handoff documentation includes active incidents, known issues, ongoing investigations

#### On-call Handoff Template
```
## Handoff: {name} → {name}
## Date: {date}

### Active Incidents
{Incident ID, status, next action}

### Known Issues
{Issue, workaround, monitoring}

### Ongoing Investigations
{What's being investigated, current hypothesis}

### Pending Post-mortems
{Incident ID, due date, owner}

### Tips for This Week
{Environment quirks, upcoming changes, maintenance windows}
```

#### Severity Levels

| Severity | Response Time | Resolution Time | Escalation |
|---|---|---|---|
| **P0** (Critical) | 5 min | 2 hours | Engineering manager |
| **P1** (Major) | 15 min | 8 hours | Team lead |
| **P2** (Minor) | 1 hour | 48 hours | None |
| **P3** (Trivial) | Next business day | Next sprint | None |

### Step 7: Define Incident Response

#### Process

1. **Detect** — Alert from monitoring or user report
2. **Acknowledge** — On-call acknowledges in incident channel
3. **Assess** — Determine severity and impact
4. **Mitigate** — Rollback, feature flag, or hotfix
5. **Resolve** — Confirm fix in production
6. **Post-mortem** — Within 48 hours, blameless analysis

#### Incident Command System
```
Role           | Responsibility
Incident Cmd   | Coordinates response, communicates status
Communications | Updates stakeholders, status page
Operations     | Technical mitigation (fix, rollback, feature flag)
Scribe         | Timeline documentation for post-mortem
```

#### Post-mortem Template

```markdown
## Summary
## Timeline
## Root Cause
## Impact (users affected, duration, revenue)
## Actions Taken
## Preventive Measures
## Action Items (with owners and deadlines)
## What Went Well
## What Could Be Improved
```

### Step 8: Adopt RFC Decision-Making Process

#### When to Write an RFC
- New architecture or significant refactor (>3 day effort)
- API design decisions (public contracts)
- Library/framework/tool selection
- Process changes affecting the whole team
- Any decision that is L3 or L4 (irreversible or cross-team)

#### RFC Template

```markdown
## Problem Statement
## Proposed Solution
## Alternatives Considered
## Trade-offs
## Decision
## Action Items
```

#### Process Flow

1. Author creates RFC doc in shared drive
2. Team reviews async (48 hours comment period)
3. Author addresses feedback
4. Decision: Accept / Reject / Amend
5. Accepted RFC is implemented or scheduled
6. RFC archived with decision noted

**Decision rule**: Lazy consensus — if no objections within 48 hours, proposal is accepted. Active blockers stop the clock until resolved.

### Step 9: Foster Knowledge Sharing

- Every feature/component must have at least one secondary owner
- Documentation is code (updated in same PR as code changes)
- Tech talks: monthly internal presentation (any topic)
- Pair programming encouraged for: complex features, senior-junior knowledge transfer, critical bug fixes
- Decision log: every architecture decision documented in ADR format with date and rationale
- Onboarding checklist: documented process for new team members including environment setup, domain overview, team norms

#### Knowledge Sharing Matrix
```
Activity           | Cadence      | Participants        | Duration
Tech talks         | Monthly      | Whole team           | 30-45 min
Pair programming   | Weekly       | 2 developers         | 2-4 hours
ADR review         | Monthly      | Senior devs          | 30 min
Show and tell      | Per sprint   | Whole team + stake   | 30 min
Brown bag lunch    | Monthly      | Optional             | 30-60 min
Code walkthrough   | Per feature  | Author + reviewers   | 30 min
```

### Step 10: Team Health and Metrics

#### Team Effectiveness Metrics
```
Metric                  | Target          | How to Measure
PR review time          | < 4 hours       | Time from open to first review
PR merge time           | < 24 hours      | Time from open to merge
Branch lifetime         | < 2 days        | Time from branch creation to merge
CI green rate           | > 90%           | % of CI runs passing on main
Incident MTTR           | < 1 hour        | Time from detection to resolution
Incident count trend    | Decreasing      | Count per sprint/quarter
Meeting efficiency      | > 3.5/5         | Survey: "Was this meeting a good use of time?"
Async response SLA      | > 90%           | % of messages answered within SLA
Decision turnaround     | < 48 hours      | RFC to decision time
Onboarding time         | < 2 weeks       | New hire to first PR merged
```

#### Team Health Scorecard
```
Score each dimension 1-5 quarterly:

Delivery: Are we shipping predictably? (velocity predictability)
Quality: Are we shipping without regressions? (bug rate, escape rate)
Morale: Is the team happy and engaged? (survey, retention)
Process: Are our rules helping or hindering? (retro feedback)
Learning: Are we growing as engineers? (tech talks, knowledge sharing)

Health score = (Delivery + Quality + Morale + Process + Learning) / 5
≥ 4.0: Healthy — maintain
3.0-3.9: Stable — address weak areas
< 3.0: At risk — restructure rules and processes
```

## Anti-Patterns

### Anti-Pattern 1: Rule Proliferation Without Enforcement
Adding rules faster than the team can adopt them. 20+ rules that
no one remembers or enforces. Creates process theater where rules
exist on paper but are ignored in practice.
Fix: start with 5 essential rules. Add one at a time. Enforce
consistently before adding the next.

### Anti-Pattern 2: Reviewer Bottleneck
Only 1-2 people can review code. All PRs wait for the same
senior engineer. Reviews become the blocker, not the accelerator.
Fix: define required reviewers per domain. Train juniors to review.
Set max review time with escalation. Use rotating review duty.

### Anti-Pattern 3: Death by Meeting
Every decision requires a meeting. Standup turns into 45 minutes.
Agendas are ignored. Meetings have no note-taker and no outcomes.
Fix: async-first principle. Meeting must have published agenda
and desired outcome. Timebox strictly. No agenda = no meeting.

### Anti-Pattern 4: Alert Fatigue
Too many alerts, most are noise. On-call ignores notifications.
Real incidents get lost in the noise. Burnout follows.
Fix: review and tune alert thresholds quarterly. Every alert
must trigger an actionable response. Silence noisy alerts.
Use alert fatigue scoring (see alerting skill).

### Anti-Pattern 5: Documentation Graveyard
ADRs are written, approved, and never read again. Docs are
outdated the day after they're written. No one knows where
to find decisions.
Fix: link ADRs from README and code comments. Review and
archive quarterly. Treat docs as code — update in same PR.

### Anti-Pattern 6: Consensus Trap
Every decision needs everyone's agreement. RFCs stall for weeks.
Teams avoid making decisions because they can't get consensus.
Fix: use decision levels. L1 is individual. L2 is team consensus.
L3 is tech lead decision with input. L4 is formal process.
Not every decision needs full consensus.

### Anti-Pattern 7: Blame Culture in Incident Response
Post-mortems focus on "who made the mistake" rather than
"what system failure allowed this." Engineers hide incidents
to avoid blame.
Fix: blameless post-mortems. Every incident is a system failure
opportunity. Celebrate thorough post-mortems. No punishment for
honest mistakes.

### Anti-Pattern 8: Inconsistent Enforcement
Rules applied differently based on seniority or team pressure.
Juniors must follow all rules; seniors bypass them. Erodes trust.
Fix: rules apply to everyone equally. Automate enforcement
where possible (CI gates, linters, branch protection). Exceptions
documented and timeboxed.

## Team Rules Maturity Model

### Level 1: Ad Hoc
No written rules. Processes are tribal knowledge. On-call is
undefined. Code review is informal. Decisions are made in hallway
conversations. Meetings have no agenda. Documentation doesn't exist.

### Level 2: Defined
Basic rules documented in single README. Code review checklist
exists. Branch strategy defined. PR template in place. On-call
rotation exists with primary/secondary. Basic incident process
documented. Meeting cadence defined.

### Level 3: Managed
Working agreements documented and followed. Review criteria
enforced by CI. Branch protection rules active. Incident severity
levels defined with SLAs. Post-mortems conducted for all P0/P1.
RFC process adopted. Decision levels understood. Metrics tracked.

### Level 4: Optimized
Rules reviewed and refined quarterly based on metrics. Automated
enforcement with CI gates for all criteria. Incident MTTR tracked
and trending down. Decision turnaround measured. PR review time
SLAs met consistently. Team health score tracked. On-call fatigue
monitored. Continuous improvement from retros.

## Key Metrics Summary

| Metric | Target | Leading Indicator |
|--------|--------|-------------------|
| PR review time | < 4 hours | PR queue depth |
| Branch lifetime | < 2 days | Open branch count |
| CI green rate | > 90% | Flaky test count |
| Incident MTTR | < 1 hour | Acknowledgment time |
| On-call fatigue | < 1 week in 4 | Rotation frequency |
| Decision turnaround | < 48 hours | RFC backlog |
| Meeting efficiency | > 3.5/5 | Meeting count trend |

## Rules
- Every PR must pass all checklist items before merging
- CI must pass before review starts
- At least one approval required from team member other than author
- No force-push after review starts
- Branch lifetime max 2 days — longer branches must use feature flags or be split
- Main branch always deployable and protected with no direct pushes
- PR open for max 24 hours before escalation
- Standup: no problem-solving during standup
- Every meeting must have a published agenda 24h before and a note-taker
- RFC: lazy consensus — if no objections within 48 hours, proposal is accepted
- Decisions documented in writing within 1 week
- Rules apply equally to all team members regardless of seniority

## References
  - references/branch-strategy.md — Branch Strategy Reference
  - references/code-review-protocol.md — Code Review Protocol Reference
  - references/communication-protocol.md — Communication Protocol Reference
  - references/conflict-resolution.md — Conflict Resolution
  - references/team-rules-advanced.md — Team Rules Advanced Topics
  - references/team-rules-fundamentals.md — Team Rules Fundamentals
  - references/working-agreements.md — Working Agreements
## Handoff

Hand off to `management/pm/SKILL.md` for sprint planning and estimation ceremonies. Hand off to `management/qc/SKILL.md` for quality gates integration in CI pipeline.
