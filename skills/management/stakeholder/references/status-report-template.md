# Status Report Template

## Weekly Status Report

```
# Weekly Status Report — {Team Name}
Week of {YYYY-MM-DD}

## Summary
{1-2 sentences on overall progress, health, and key events}

## Metrics
| Metric | This Week | Last Week | Target | Trend |
|--------|-----------|-----------|--------|-------|
| Velocity | {points} | {points} | {points} | ↑↓→ |
| Burndown | {remaining} | {remaining} | {target} | ↑↓→ |
| Open defects | {count} | {count} | {limit} | ↑↓→ |
| Code coverage | {%} | {%} | {target%} | ↑↓→ |
| CI pass rate | {%} | {%} | {target%} | ↑↓→ |

## Completed This Week
- {Ticket-123}: {description} (owner)
- {Ticket-124}: {description} (owner)
- {Ticket-125}: {description} (owner)

## In Progress
- {Ticket-126}: {description} (owner, x% complete, eta {date})
- {Ticket-127}: {description} (owner, x% complete, eta {date})

## Blocked
- {Ticket-128}: {description} blocked by {reason} (owner)
  - Unblock plan: {action} by {date}
- {Ticket-129}: {description} blocked by {reason} (owner)
  - Unblock plan: {action} by {date}

## Risks
| Risk | Likelihood | Impact | Score | Mitigation |
|------|------------|--------|-------|------------|
| {description} | {H/M/L} | {H/M/L} | {score} | {action} |

## Upcoming (Next Week)
- {Ticket-130}: {description} (owner, priority)
- {Ticket-131}: {description} (owner, priority)

## Need from Stakeholders
- {specific ask 1}
- {specific ask 2}

## Key Decisions Needed
- {decision 1} — deadline {date}
- {decision 2} — deadline {date}
```

## Executive Summary (1-pager)

For leadership stakeholders who need a concise view:

```
# {Project Name} — Executive Summary
Period: {Month} {Year}

## Health: {Green / Yellow / Red}

### Green → On track, no intervention needed
### Yellow → At risk, monitoring required
### Red → Off track, escalation needed

## Key Accomplishments
- {Bullet 1}
- {Bullet 2}
- {Bullet 3}

## Milestones
| Milestone | Planned | Actual | Status |
|-----------|---------|--------|--------|
| {M1} | {date} | {date} | ✅ On track |
| {M2} | {date} | {date} | ⚠️ At risk |
| {M3} | {date} | {date} | ❌ Delayed |

## Budget
| Category | Budget | Spent | Remaining | % Used |
|----------|--------|-------|-----------|--------|
| Engineering | ${K} | ${K} | ${K} | {X%} |
| Infrastructure | ${K} | ${K} | ${K} | {X%} |
| External | ${K} | ${K} | ${K} | {X%} |
| Total | ${K} | ${K} | ${K} | {X%} |

## Top 3 Risks
1. {Risk 1} — {mitigation}
2. {Risk 2} — {mitigation}
3. {Risk 3} — {mitigation}

## Escalations (if any)
- {Issue needing executive attention}
```

## Release Status Report

```
# Release {version} — Status Report
Target Date: {YYYY-MM-DD}
Current Status: {On Track / At Risk / Delayed}

## Release Scope
- {Feature 1}
- {Feature 2}
- {Feature 3}

## Progress
| Area | Progress | Remaining |
|------|----------|-----------|
| Development | {X%} | {items} |
| Testing | {X%} | {tests} |
| Documentation | {X%} | {pages} |
| Security review | {X%} | {findings} |

## Quality Gates
| Gate | Status | Notes |
|------|--------|-------|
| All tests passing | ✅ / ❌ | |
| Code coverage >= 80% | ✅ / ❌ | |
| Security scan passed | ✅ / ❌ | |
| Performance within SLA | ✅ / ❌ | |
| Accessibility audit | ✅ / ❌ | |
| Stakeholder sign-off | ✅ / ❌ | |

## Go/No-Go Checklist
- [ ] All P0 and P1 bugs fixed
- [ ] Regression suite passed
- [ ] Rollback plan validated
- [ ] Monitoring dashboards set up
- [ ] Runbook updated
- [ ] Release notes published
- [ ] On-call notified
```

## Status Report Distribution

| Audience | Format | Frequency | Channel |
|----------|--------|-----------|---------|
| Engineering team | Detailed | Weekly | Shared doc / Slack |
| Product stakeholders | Summary | Weekly | Email / Confluence |
| Leadership | Executive summary | Monthly | Email / Slide deck |
| Release stakeholders | Release report | Per release | Email + meeting |
| Cross-team dependencies | Brief update | Weekly | Shared doc |
