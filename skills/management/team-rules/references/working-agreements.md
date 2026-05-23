# Working Agreements

## Communication

- Async-first: prefer Slack/issue comments over real-time interrupts
- Sync meetings have an agenda shared 24h in advance
- Decisions documented in writing (ADR, issue comment, PR description)
- Assume good intent — ask clarifying questions, don't assume malice
- Disagreements are about ideas, not people — challenge the approach, not the person
- Reply within 4 business hours during working hours

## Meetings

| Type | Frequency | Duration | Format |
|------|-----------|----------|--------|
| Daily standup | Daily | 15 min | Async-first, sync only if needed |
| Sprint planning | Biweekly | 90 min | In-person / video |
| Sprint review | Biweekly | 60 min | Demo + feedback |
| Sprint retro | Biweekly | 60 min | In-person / video |
| 1:1 with manager | Weekly | 30 min | Private |
| Team sync | Weekly | 30 min | Optional, agenda-driven |

- Meetings start on time, end on time
- No meeting scheduled without a clear outcome
- Standup covers: what I did yesterday, what I'll do today, blockers
- Retro is blameless — focus on process, not people

## Code

- All changes go through PR review
- PRs < 400 lines for focused review
- Review turnaround target: < 4 business hours
- No direct pushes to main/master
- Branch naming: `{type}/{ticket-number}-{description}`
- Commit messages follow Conventional Commits

### PR Review Etiquette
- Reviewer's job is to find issues; author's job is to fix them
- Use "I notice that..." not "You forgot to..."
- Ask "What do you think about...?" not "This should be..."
- Approve with confidence, request changes with specific reasoning
- If a comment is optional, mark it as such: "Nit: ..." or "Optional: ..."

## Availability

- Core hours: 10:00-15:00 local time (all team members available)
- Outside core hours: async communication only
- Calendar reflects true availability (blocks for focus time, PTO, appointments)
- PTO: minimum 2 weeks notice for > 2 days, documented in team calendar
- On-call: rotated weekly, documented escalation path

## Decision Making

- Default to autonomy: make the decision, document it, move on
- Escalate when: high impact, irreversible, or cross-team scope
- Disagree and commit: once a decision is made, everyone supports it
- Revisit decisions when new information is available — no sunk cost fallacy

### Decision Levels
| Level | Scope | Decision Maker | Process |
|-------|-------|---------------|---------|
| L1 | Within team, reversible | Individual | Document in ticket/PR |
| L2 | Within team, irreversible | Team consensus | ADR + team discussion |
| L3 | Cross-team | Tech lead + stakeholders | RFC + review process |
| L4 | Organization-wide | Architecture committee | Formal RFC with voting |

## Quality

- No broken builds on main — fix immediately, revert if > 30 min
- Tests are not optional — every PR includes tests or a documented exception
- Code coverage should not decrease on any PR
- Lint and type errors are build failures
- Security vulnerabilities: fix P0/P1 before end of sprint
- Technical debt is tracked and allocated 15-20% of sprint capacity

## Tools

- Single source of truth for each artifact:
  - Code: GitHub
  - Issues: Jira/Linear
  - Docs: Notion/Confluence
  - Decisions: ADRs in repo
  - Architecture: Diagrams in repo
- Personal notification preferences respected (don't @here unless urgent)
- Tools are suggestions, not rules — if a tool doesn't work, discuss changing it
