# Code Review Protocol Reference

## Review Types and Depth

| Review Type | Scope | Time Budget | Reviewer |
|---|---|---|---|
| **Lightweight** | Bug fix, typo, docs, tests | 15 min | Any team member |
| **Standard** | Feature, refactor, new component | 30 min | Assigned reviewer |
| **Heavyweight** | Architecture, new service, breaking change | 60 min | Senior engineer + architect |

## PR Size Limits

| Metric | Hard Limit | Soft Limit |
|---|---|---|
| Files changed | 20 | 10 |
| Lines added | 500 | 200 |
| Commits | 10 | 5 |

**Rule**: If PR exceeds hard limit, author must split into smaller PRs. Exception: auto-generated files (lock files, migrations).

## Review Checklist (Detailed)

### Functionality
- [ ] Code implements the requirements as specified in the ticket
- [ ] Edge cases handled: empty state, error state, boundary values
- [ ] No regression introduced (existing tests pass)

### Security
- [ ] No SQL injection (parameterized queries only)
- [ ] No XSS (output encoded, no dangerouslySetInnerHTML)
- [ ] Authentication checks on all protected endpoints
- [ ] Authorization checks for data access (user can only access own data)
- [ ] No secrets in code, config, or comments

### Performance
- [ ] No N+1 queries (eager loading / batch fetching)
- [ ] No unnecessary re-renders (memo, useMemo, useCallback as needed)
- [ ] Pagination on list endpoints
- [ ] Indexes on queried columns

### Maintainability
- [ ] Code follows project conventions (naming, file structure)
- [ ] No deeply nested conditionals (max 3 levels)
- [ ] Functions do one thing (SRP)
- [ ] No magic numbers or strings (extract to constants/enums)

### Testing
- [ ] Unit tests cover business logic
- [ ] Integration tests cover API endpoints
- [ ] Test covers: happy path, error path, edge cases
- [ ] No tests depending on other tests (order-dependent tests)

## Review Comments Format

```
{Label}: {Comment}

Labels:
[BLOCKER] — Must be fixed before merge
[REQUIRED] — Should be fixed, can merge only if follow-up created
[NIT] — Style preference, author's discretion
[QUESTION] — Clarification needed
[PRAISE] — Something well done
```

## Reviewer Responsibility

1. Review within 4 business hours of assignment
2. Focus on correctness, not style (lint handles style)
3. Approve only when all BLOCKER/REQUIRED items are resolved
4. If PR is too large → request split
5. If PR is unclear → request description update before reviewing

## Author Responsibility

1. Self-review before assigning reviewer
2. Keep PR scope minimal (one feature/fix)
3. Respond to comments within 4 hours
4. If reviewer disagrees → discuss in comments, do not resolve silently
5. After merge → delete branch

## Conflict Resolution

1. Author and reviewer discuss in PR comments
2. If unresolved → escalate to team lead
3. Team lead decision is final
4. If pattern disagreement → create RFC for team-wide decision
