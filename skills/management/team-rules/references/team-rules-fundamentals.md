# Team Rules Fundamentals

## Overview
Team rules establish the collaboration protocols, norms, and processes that enable effective teamwork. This reference covers fundamental concepts for code review, branch strategy, communication, incident response, and decision-making.

## Core Concepts

### Concept 1: Why Team Rules Matter

Team rules reduce ambiguity, create psychological safety, and enable autonomous decision-making within agreed boundaries. Good rules accelerate by removing the need to debate process repeatedly.

**Bad rules**: rigid, unenforced, apply to some but not others, unstated. They create process theater.
**Good rules**: few in number, consistently enforced, apply to everyone, reviewed and updated, documented.

Rule of thumb: start with 5 essential rules. Add one at a time when the team agrees it's needed. A rule that isn't enforced is worse than no rule at all.

### Concept 2: Code Review Fundamentals

Purpose of code review: catch defects, share knowledge, maintain consistency, improve code quality. NOT: gatekeeping, personal criticism, proving seniority.

**Review checklist essentials**:
- No secrets, credentials, or hardcoded URLs
- Error paths handled (no empty catch blocks)
- Input validation on public endpoints
- Tests included for new logic
- No lint or type errors
- Single responsibility per PR

**Review etiquette**: assume good intent, comment on code not author, mark optional comments as "Nit:" or "Optional:", approve with confidence, request changes with specific reasoning.

### Concept 3: Branch Strategy Fundamentals

**Trunk-based Development** (recommended for most teams):
- Main branch always deployable
- Feature branches live < 2 days
- Feature flags for incomplete work
- No direct pushes to main

**GitFlow** (use when):
- Multiple production versions maintained concurrently
- Mobile app store releases with version lockstep
- Strict release cadence required

Naming convention: `feat/description`, `fix/description`, `chore/description`, `hotfix/description`.

### Concept 4: Communication Protocols

**Sync communication**: meetings for decisions, alignment, conflict resolution. Must have published agenda and desired outcome. No agenda = no meeting.

**Async communication**: preferred for status updates, decisions, questions. Response SLAs: PR reviews (4 hours), Slack questions (1 hour), email (24 hours), incidents (immediate).

**Async-first principle**: if it can be communicated in writing, don't schedule a meeting. Saves time, creates record, respects focus time.

### Concept 5: On-Call Rotation

Weekly rotation with primary + secondary. Handoff at weekly standup.

**Responsibilities**: acknowledge alerts within 5 minutes, respond per severity, update status page for user-facing incidents, write post-mortem within 48 hours.

**Fatigue prevention**: max 1 week in 4 on-call per person, secondary shadows for knowledge transfer, handoff documentation mandatory.

### Concept 6: Incident Response Fundamentals

**6-step process**:
1. Detect — alert from monitoring or user report
2. Acknowledge — on-call acknowledges in incident channel
3. Assess — determine severity and impact
4. Mitigate — rollback, feature flag, or hotfix
5. Resolve — confirm fix in production
6. Post-mortem — within 48 hours, blameless analysis

**Severity levels**:
- P0 (Critical): respond 5 min, resolve 2 hours
- P1 (Major): respond 15 min, resolve 8 hours
- P2 (Minor): respond 1 hour, resolve 48 hours
- P3 (Trivial): next business day

### Concept 7: Decision-Making with RFC

RFC (Request for Comments) is a lightweight decision-making process for significant decisions.

**When to RFC**: new architecture, API design, tool selection, process changes affecting whole team.

**Process**: author writes proposal → team reviews async (48 hours) → feedback addressed → decision (Accept/Reject/Amend) → implement or schedule → archive with decision.

**Lazy consensus**: if no objections within 48 hours, proposal is accepted. Active blockers stop the clock until resolved.

### Concept 8: Knowledge Sharing

**Practices**:
- Documentation as code (updated in same PR as code changes)
- ADR (Architecture Decision Record) for every significant decision
- Monthly tech talks — any topic, any team member
- Pair programming for complex features and knowledge transfer
- Secondary owner for every feature/component

**Onboarding**: documented setup guide, domain overview, team norms, first PR checklist. Target: first PR merged within 2 weeks.

### Concept 9: Working Agreements

Team-defined norms for how they work together:

**Communication**: async-first, assume good intent, disagreements about ideas not people, reply within 4 business hours.

**Meetings**: start and end on time, agenda 24h before, note-taker assigned, clear outcome expected.

**Availability**: core hours defined, calendar reflects true availability, PTO documented in team calendar.

**Quality**: no broken builds on main (fix or revert within 30 min), tests not optional, tech debt allocated 15-20% sprint capacity.

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Start Small | 5 essential rules, add as needed | High |
| Enforce Consistently | Rules apply to everyone, not just juniors | High |
| Automate Gates | CI checks, branch protection, linters | High |
| Document Decisions | ADR for every significant decision | High |
| Review Quarterly | Rules should evolve with team maturity | Medium |
| Retro Process | Regularly ask: are our rules helping? | High |
| Async First | Meetings only when writing isn't enough | Medium |

## Common Pitfalls

### Pitfall 1: Rule Proliferation
Adding rules faster than team can adopt them. 20+ rules no one remembers or follows. Creates process theater.
Fix: start with 5 essential rules. Add one at a time. Enforce consistently before adding next.

### Pitfall 2: Reviewer Bottleneck
Only 1-2 people can review code. All PRs wait for same senior engineer. Reviews become blocker.
Fix: define reviewers per domain, train juniors to review, set max review time with escalation.

### Pitfall 3: Consensus Trap
Every decision needs everyone's agreement. RFCs stall for weeks. Teams avoid decisions.
Fix: use decision levels. L1 is individual. L4 is formal. Not every decision needs full consensus.

### Pitfall 4: Inconsistent Enforcement
Rules applied differently based on seniority. Juniors follow rules, seniors bypass them. Erodes trust.
Fix: rules apply to everyone equally. Automate enforcement. Exceptions timeboxed and documented.

## Tooling Ecosystem

### Code Review
- GitHub / GitLab: PR reviews with required approvals
- Bitbucket: inline comments, merge checks
- Reviewable: structured review workflow
- SonarQube: automated code quality gates

### Communication
- Slack / Discord: real-time messaging
- Confluence / Notion: documentation
- Linear / Jira: issue tracking
- Zoom / Meet: video meetings

### Incident Management
- PagerDuty: on-call scheduling and alerting
- Opsgenie: alert routing and escalation
- Incident.io: incident command and timeline
- Statuspage: user-facing status updates

## Key Points
- Start with 5 essential rules, add as needed
- Automate enforcement where possible (CI, branch protection)
- Async-first: write it before meeting about it
- PR review is collaboration, not gatekeeping
- Blameless post-mortems uncover systemic issues
- Lazy consensus prevents decision paralysis
- Document decisions in ADRs — they outlast memory
- Rules apply equally to everyone on the team
- Review rules quarterly — they should evolve with the team
- On-call fatigue is real: max 1 week in 4 per person
