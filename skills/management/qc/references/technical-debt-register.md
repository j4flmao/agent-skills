# Technical Debt Register Template

```markdown
# Technical Debt Register

| ID | Area | Description | Severity | Effort | Reported | Target Sprint | Status |
|----|------|-------------|----------|--------|----------|---------------|--------|
| TD-001 | Payment | Cyclomatic complexity 24 in PaymentService.process() | High | 3d | 2026-05-01 | Sprint 5 | Open |
| TD-002 | Auth | Password validator allows weak passwords | Critical | 1d | 2026-05-05 | Sprint 4 | In Progress |
| TD-003 | UI | Order list component has 40% code duplication | Medium | 2d | 2026-05-10 | Sprint 6 | Open |

## Columns
- **ID**: TD-NNN (sequential)
- **Area**: Module/component name
- **Description**: Specific issue with file reference
- **Severity**: Critical / High / Medium / Low
- **Effort**: Estimated person-days to fix
- **Reported**: Date identified
- **Target Sprint**: When it will be addressed
- **Status**: Open / In Progress / Resolved / Accepted

## Severity Definitions
| Severity | Action | Example |
|----------|--------|---------|
| Critical | Fix immediately, stop the line | Security vulnerability, data corruption |
| High | Fix within current or next sprint | Performance bottleneck, missing validation |
| Medium | Schedule within 2-3 sprints | Code duplication, dead code |
| Low | Fix opportunistically | Naming issues, minor style violations |

## Rules
- New tech debt items must be added within 24h of identification
- Critical debt blocks production deployment
- Each sprint should allocate 10-20% capacity to tech debt reduction
- Debt with no planned fix for > 6 months is "accepted" — document the decision
```
