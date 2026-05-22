# Compression Patterns

## Format Template
```
## Decisions
- Used X over Y — Z reason
- Chose A RB for B (alternative: C deemed too slow)
- Set TZ=UTC, LOG_LEVEL=info

## Files Changed
- src/auth.ts:42 — Added email validation
- src/user.ts:15-30 — Refactored cache strategy
- tests/auth.test.ts — Added edge case tests

## Current State
Dev env running. Auth flow complete. User CRUD in progress.

## Next Steps
1. Implement password reset endpoint
2. Add rate limiting to auth routes
3. Write integration tests for login flow

## Open Questions
- Should refresh tokens use Redis or DB?
- What's the password complexity requirement?
```

## Abbreviation Guide
| Full | Abbreviation |
|---|---|
| Configuration | config |
| Development | dev |
| Production | prod |
| Environment | env |
| Authentication | auth |
| Authorization | authz |
| Documentation | docs |
| Dependency | dep |
| Repository | repo |
| Implementation | impl |
| Established | est |
| Benchmark | bench |

## Compression Examples

| Verbose | Compressed |
|---|---|
| We decided to use PostgreSQL because it has better JSONB support | PG over MySQL — JSONB support needed |
| The user should set LOG_LEVEL to debug for more verbose logging | LOG_LEVEL=debug |
| We modified the auth middleware to check for JWT tokens in the Authorization header | auth middleware: JWT check from Authorization header |
| After discussing with the team, we increased the timeout from 10 seconds to 30 seconds | Timeout 10s → 30s (team consensus) |
