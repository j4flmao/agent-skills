# Action Item Tracking

## Action Item Lifecycle

```
Identified → Assigned → In Progress → Verified → Closed
                    ↕               ↕
              Blocked          Rejected
```

## Action Item Template

```
### AI-{NNN}: {Short description}
- Source: {Sprint Retro / Incident / Code Review / Team Meeting}
- Date Identified: {YYYY-MM-DD}
- Owner: {Name}
- Priority: {P0 / P1 / P2 / P3}
- Category: {Process / Technical / People / Tooling / Documentation}
- Description: {1-2 sentence description of what needs to be done}
- Definition of Done: {specific, measurable criteria}
- Due Date: {YYYY-MM-DD}
- Status: {Open / In Progress / Blocked / Verified / Closed}
- Blockers (if any): {what is preventing progress}
- Verification Method: {Peer review / Test / Demo / Sign-off}
```

## Priority Definitions

| Priority | Label | Timeframe | Definition |
|----------|-------|-----------|------------|
| P0 | Critical | < 24 hours | Blocking team productivity or customer-facing issue |
| P1 | High | < 1 week | Significant improvement, preventing future issues |
| P2 | Medium | < 1 sprint | Important but not urgent |
| P3 | Low | Backlog | Nice to have, no immediate impact |

## Sprint Retro Action Items

Each retro produces 1-3 action items maximum. More than 3 items reduces follow-through.

```
Retro: Sprint 42 (2026-03-15)

Theme: Communication breakdown

Top Positive: Pair programming improved code quality
Top Improvement: Async updates between timezones

Action Items:
1. AI-042-01: Add daily async standup thread in Slack with EOD updates
   Owner: Alice | Priority: P1 | Status: In Progress | Due: 2026-03-18

2. AI-042-02: Document decision-making RACI for cross-team features
   Owner: Bob | Priority: P2 | Status: Open | Due: 2026-03-25

3. AI-042-03: Create shared calendar for team availability
   Owner: Carol | Priority: P2 | Status: Open | Due: 2026-03-22
```

## Tracking Board

| ID | Description | Owner | Priority | Status | Due | Days Open |
|----|-------------|-------|----------|--------|-----|-----------|
| AI-042-01 | Async standup thread | Alice | P1 | ✅ In Progress | 2026-03-18 | 3 |
| AI-042-02 | Decision-making RACI | Bob | P2 | 🔴 Open | 2026-03-25 | 1 |
| AI-041-02 | Test flakiness investigation | Carol | P1 | ✅ Verified | 2026-03-10 | 12 |
| AI-040-01 | Update onboarding docs | Dave | P2 | ✅ Closed | 2026-03-01 | 25 |
| AI-039-03 | API versioning strategy | Eve | P3 | ❌ Blocked | — | 42 |

## Review Cadence

- **Daily** (during standup): Owners report status changes
- **Weekly** (team sync): Review open items, identify blockers, re-prioritize
- **Monthly** (retro): Analyze closure rate, identify systemic issues, surface recurring patterns
- **Quarterly**: Deep analysis — are action items actually reducing problems?

## Metrics

| Metric | Target | Formula |
|--------|--------|---------|
| Closure rate | > 80% within due date | Closed on time / Total closed |
| Avg time to close | < 14 days | Average days from open to closed |
| Recurrence rate | < 20% | Items reopened / Total closed |
| Aging index | < 30 days | Average days open for incomplete items |
| P0/P1 completion | 100% | P0/P1 closed / P0/P1 total |

## Common Failure Patterns

| Pattern | Symptom | Fix |
|---------|---------|-----|
| Action item overload | > 3 items per retro | Limit to top 3, defer rest to backlog |
| No owner | Item never progresses | Assign owner before retro closes |
| Vague description | "Improve testing" | Write specific, measurable DoD |
| No follow-up | Item forgotten by next retro | Add to sprint backlog, track in standup |
| Skipped verification | Item closed but not actually done | Require verification step before close |
| No escalation | Blocked items stay blocked | Daily standup check, escalate to manager after 1 week |

## Automation

```yaml
# .github/workflows/action-item-tracking.yml
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday
  issues:
    types: [opened, closed]

jobs:
  track:
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const items = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ['action-item'],
              state: 'open'
            });
            const aging = items.data.map(i => ({
              number: i.number,
              title: i.title,
              daysOpen: Math.floor((Date.now() - new Date(i.created_at)) / 86400000),
              assignee: i.assignee?.login
            }));
            // Post to Slack or dashboard
```

## Integration with Sprint Backlog

Action items from retro should enter the sprint backlog like any other work item:
- Estimate effort (story points)
- Add to sprint if priority warrants it
- Track in standup alongside feature work
- Include in sprint review demo if completed
- Action items are not bonus work — they replace other work
