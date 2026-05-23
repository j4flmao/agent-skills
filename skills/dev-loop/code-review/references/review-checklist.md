# Code Review Checklist

## Correctness
- [ ] Code produces expected output for all valid inputs
- [ ] Edge cases handled: null, empty, zero, negative, max values, special characters
- [ ] Error paths handled — every fallible function has error handling
- [ ] No off-by-one errors in loops, indices, slices, or ranges
- [ ] No race conditions — proper locking, atomics, channels, or mutex usage
- [ ] Type contracts honored — no implicit coercion or unsafe casts
- [ ] State transitions valid (finite state machine correctness)
- [ ] Idempotency considered for retryable operations
- [ ] Idempotency keys used for mutating endpoints
- [ ] No resource leaks — streams, sockets, file handles closed in finally/defer/Dispose

## Architecture
- [ ] Code belongs in correct layer (domain/application/infrastructure)
- [ ] No circular dependencies between modules/packages
- [ ] Domain layer has zero imports from infrastructure or frameworks
- [ ] Dependency injection for external services — no hardcoded instantiations
- [ ] Interface segregation — consumers depend on abstractions, not concretions
- [ ] Feature envy detected — methods using more data from other classes than their own
- [ ] Law of Demeter respected — no deep method chaining on foreign objects
- [ ] Configuration externalized — no environment-specific hardcoded values
- [ ] Separation of concerns — command/query separation where appropriate

## Clarity
- [ ] Names reveal intent — function names describe behavior, variable names describe content
- [ ] No magic numbers or strings — all literals named as constants
- [ ] No dead code, commented-out code, or TODO without ticket reference
- [ ] Functions do one thing (single responsibility at function level)
- [ ] Functions fit on one screen (< 40 lines)
- [ ] No nested conditionals beyond 3 levels — extract or early return
- [ ] Boolean parameters flagged — split into two methods instead
- [ ] Asynchronous code uses async/await (not raw callbacks or .then chains)
- [ ] Log messages include enough context to debug without code reading

## Performance
- [ ] No N+1 queries — batch loading or eager loading used
- [ ] No unnecessary allocations in hot paths (boxing, temporary objects)
- [ ] Async code has no blocking calls (no `.Result`, `Wait()`, `Thread.Sleep`)
- [ ] Database queries have appropriate indexes (check EXPLAIN PLAN where applicable)
- [ ] Caching strategy for expensive or frequently accessed data
- [ ] Payload size considered — pagination, field selection, compression
- [ ] Connection pool settings appropriate for expected concurrency
- [ ] No synchronous waiting in async contexts (risk of deadlock)
- [ ] Object pooling considered for expensive-to-create resources

## Security
- [ ] Input validation on every user-facing endpoint (type, length, format, range)
- [ ] Authorization check on every endpoint (not just UI hiding)
- [ ] No secrets, tokens, passwords, or connection strings in code
- [ ] SQL queries use parameterized statements — no string interpolation
- [ ] XSS prevention — output encoding for user-supplied data in HTML/JS
- [ ] CSRF protection on state-changing endpoints
- [ ] Rate limiting on auth endpoints
- [ ] Upload validation — file type, size, path traversal checks
- [ ] Security headers set in responses (CSP, HSTS, X-Frame-Options)

## Tests
- [ ] Tests cover acceptance criteria from the story
- [ ] Tests test behavior, not implementation (refactoring safe)
- [ ] Edge cases tested beyond happy path
- [ ] No test interdependence — tests run independently in any order
- [ ] Mocks at architectural boundaries only — not on domain objects
- [ ] Test pyramid respected: unit > integration > e2e
- [ ] Assertions are specific — no bare `assertTrue` without meaningful messages
- [ ] Flaky tests investigated and stabilized, not ignored

## Observations
- [ ] At least one positive observation included for every 3 critical findings
- [ ] Findings include exact file and line number references
- [ ] Severity labels correct: MUST (blocks merge), SHOULD (best practice), CONSIDER (suggestion)
