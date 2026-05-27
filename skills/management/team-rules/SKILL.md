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
Establish team collaboration protocols covering code review, branch strategy, communication, incident response, and decision-making processes.

## Agent Protocol

### Trigger
User request includes: `team rules`, `team protocol`, `collaboration`, `code review`, `branch strategy`, `pr template`, `git flow`, `rfc process`, `incident response`, `on-call`, `decision making`.

### Input Context
- Team size and composition (devs, QA, devops, PM)
- Current workflow issues (slow reviews, broken builds, merge conflicts)
- Technology stack (Git provider, CI platform, communication tools)
- Company culture (remote, office, hybrid)

### Output Artifact
A markdown document containing:
- Code review protocol with review criteria checklist
- Branch strategy specification (GitFlow / Trunk-based)
- Pull request template
- Communication protocols (sync vs async, meeting cadence)
- On-call rotation and incident response procedure
- RFC decision-making process
- Knowledge sharing guidelines

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. Output artifacts rendered as markdown.

——

### Completion Criteria
- All protocols are actionable (numbered steps, checklists)
- Review criteria include clear Accept/Reject conditions
- Branch strategy includes naming convention and lifecycle
- Incident response includes severity levels and timeline
- RFC process includes template and approval criteria

### Max Response Length
4096 tokens

## Workflow

### Step 1: Establish Code Review Protocol
Define review criteria checklist with accept/reject conditions, review process with required approvals, and max review time.

### Step 2: Choose Branch Strategy
Select trunk-based development (recommended) or GitFlow based on release requirements, with naming conventions and branch lifecycle.

### Step 3: Set Up PR Template
Standardize pull requests with summary, changes, testing checklist, and related issues.

### Step 4: Establish Communication Protocols
Define sync and async communication channels with response SLAs, meeting cadence, and agenda requirements.

### Step 5: Implement On-call Rotation
Set up weekly rotation with primary/secondary roles, alert acknowledgment SLAs, and handoff procedure.

### Step 6: Define Incident Response
Create 6-step response process (detect, acknowledge, assess, mitigate, resolve, post-mortem) with severity levels.

### Step 7: Adopt RFC Decision-Making Process
Use lazy consensus with 48-hour comment period for architecture decisions, tool selections, and process changes.

### Step 8: Foster Knowledge Sharing
Maintain documentation as code, monthly tech talks, pair programming, and ADR decision log.

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

## 1. Code Review Protocol

### Review Criteria Checklist

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

### Review Process

1. Author opens PR with description and label
2. CI must pass before review starts
3. At least one approval from team member (not author)
4. All reviewer comments addressed (resolved or acknowledged)
5. No force-push after review starts (use merge commits or rebase before review)
6. PR open for max 24 hours before escalation

### Accept Conditions
- All checklist items checked
- No unresolved blockers from reviewer
- CI green
- No merge conflicts

### Reject Conditions
- Checklist items unchecked
- CI red (except flaky tests)
- Scope creep (PR does more than title describes)
- Tests missing for changed logic

## 2. Branch Strategy

### Trunk-based Development (Recommended)

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

### GitFlow (Use ONLY when)

- Multiple concurrent versions in production
- Strict release cadence with version lockstep
- Mobile apps with app store submission gating

## 3. Pull Request Template

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

## 4. Communication Protocols

### Sync Communication

| Meeting | Frequency | Duration | Attendees |
|---|---|---|---|
| Daily standup | Daily | 15 min | Dev team |
| Sprint planning | Bi-weekly | 60 min | Dev + PM |
| Sprint review | Bi-weekly | 30 min | Dev + PM + stakeholders |
| Retrospective | Bi-weekly | 45 min | Dev team |
| Architecture sync | Weekly | 30 min | Senior devs |

**Rules**:
- Standup: What I did yesterday, what I'll do today, blockers. No problem-solving in standup.
- Every meeting must have a published agenda 24h before.
- No meeting without a note-taker.
- Async-first principle: if it can be said in writing, don't schedule a meeting.

### Async Communication

| Channel | Purpose | Response SLA |
|---|---|---|
| **PR reviews** | Code changes | 4 hours (business hours) |
| **Slack/Discord** | Quick questions | 1 hour |
| **Email** | External communication | 24 hours |
| **RFC doc** | Decisions | 48 hours for feedback |
| **Incident** | Production issues | Immediate |

## 5. On-call Rotation

### Schedule
- Weekly rotation: Mon 09:00 → Mon 09:00
- Primary + secondary on-call
- Handoff during standup every Monday

### Responsibilities
- Acknowledge alerts within 5 minutes
- Respond to incidents per severity
- Update status page for user-facing incidents
- Document post-mortem within 48 hours of incident resolution

### Severity Levels

| Severity | Response Time | Resolution Time | Escalation |
|---|---|---|---|
| **P0** (Critical) | 5 min | 2 hours | Engineering manager |
| **P1** (Major) | 15 min | 8 hours | Team lead |
| **P2** (Minor) | 1 hour | 48 hours | None |
| **P3** (Trivial) | Next business day | Next sprint | None |

## 6. Incident Response

### Process

1. **Detect** — Alert from monitoring or user report
2. **Acknowledge** — On-call acknowledges in incident channel
3. **Assess** — Determine severity and impact
4. **Mitigate** — Rollback, feature flag, or hotfix
5. **Resolve** — Confirm fix in production
6. **Post-mortem** — Within 48 hours, blameless analysis

### Post-mortem Template

```markdown
## Summary
## Timeline
## Root Cause
## Impact
## Actions Taken
## Preventive Measures
## Action Items (with owners and deadlines)
```

## 7. RFC Decision-Making Process

### When to Write an RFC
- New architecture or significant refactor (>3 day effort)
- API design decisions (public contracts)
- Library/framework/tool selection
- Process changes affecting the whole team

### RFC Template

```markdown
## Problem Statement
## Proposed Solution
## Alternatives Considered
## Trade-offs
## Decision
## Action Items
```

### Process Flow

1. Author creates RFC doc in shared drive
2. Team reviews async (48 hours comment period)
3. Author addresses feedback
4. Decision: Accept / Reject / Amend
5. Accepted RFC is implemented or scheduled
6. RFC archived with decision noted

**Decision rule**: Lazy consensus — if no objections within 48 hours, proposal is accepted. Active blockers stop the clock until resolved.

## 8. Knowledge Sharing

- Every feature/component must have at least one secondary owner
- Documentation is code (updated in same PR as code changes)
- Tech talks: monthly internal presentation (any topic)
- Pair programming encouraged for: complex features, senior-junior knowledge transfer, critical bug fixes
- Decision log: every architecture decision documented in ADR format with date and rationale

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
