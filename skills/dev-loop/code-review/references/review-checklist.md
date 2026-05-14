# Code Review Checklist

## Correctness
- [ ] Code produces the expected output for all valid inputs
- [ ] Edge cases handled: null, empty, zero, negative, max values
- [ ] Error paths handled — every function that can fail has error handling
- [ ] No off-by-one errors in loops, indices, or ranges
- [ ] No race conditions in concurrent code (proper locking, atomics, channels)
- [ ] Type contracts honored — no implicit type coercion or unsafe casts
- [ ] State transitions are valid (finite state machine correctness)

## Architecture
- [ ] Code belongs in the correct layer (domain/application/infrastructure)
- [ ] No circular dependencies between modules/packages
- [ ] Domain layer has zero imports from infrastructure or frameworks
- [ ] Dependency injection used for external dependencies — no hardcoded instantiations
- [ ] Interface segregation — consumers depend on abstractions, not concretions
- [ ] Feature envy detected? Methods that use more data from other classes than their own

## Clarity
- [ ] Names reveal intent — function names describe what they do, variable names describe what they hold
- [ ] No magic numbers or strings — all literals named as constants
- [ ] No dead code, commented-out code, or TODO without ticket reference
- [ ] Functions do one thing (single responsibility at function level)
- [ ] Functions fit on one screen (< 40 lines)
- [ ] No nested conditionals beyond 3 levels — extract or early return
- [ ] Boolean parameters flag — split into two methods instead

## Performance
- [ ] No N+1 queries — batch loading or eager loading used
- [ ] No unnecessary allocations in hot paths (avoid boxing, temporary objects)
- [ ] Async code has no blocking calls (no `.Result`, no `Thread.Sleep`)
- [ ] Database queries have appropriate indexes (check EXPLAIN PLAN)
- [ ] Caching strategy for expensive or frequently accessed data
- [ ] Payload size considered — pagination, field selection, compression

## Security
- [ ] Input validation on every user-facing endpoint (type, length, format, range)
- [ ] Authorization check on every endpoint (not just UI-level hiding)
- [ ] No secrets, tokens, passwords, or connection strings in code
- [ ] SQL queries use parameterized statements — no string interpolation
- [ ] XSS prevention — output encoding for user-supplied data in HTML/JS
- [ ] CSRF protection on state-changing endpoints
- [ ] Rate limiting on auth endpoints

## Tests
- [ ] Tests cover the acceptance criteria from the story
- [ ] Tests test behavior, not implementation (refactoring shouldn't break tests)
- [ ] Edge cases tested beyond the happy path
- [ ] No test interdependence — tests can run independently in any order
- [ ] Mocks used at architectural boundaries only (not on domain objects)
- [ ] Test pyramid respected: unit > integration > e2e
