# Comprehensive Code Review Checklist

## Overview

A structured checklist covering every dimension of code review: correctness, architecture, clarity, performance, security, and test quality. Use this as a reference during every review pass to ensure no dimension is missed. Each item includes the severity level it maps to when violated.

---

## Checklist Usage

- **Pre-review**: Run automated checks first (lint, type check, test). Only start manual review after automated checks pass.
- **During review**: Go through each section. Mark items as PASS, FAIL, or N/A.
- **FAIL items become findings**: Map to [MUST], [SHOULD], or [CONSIDER] based on the severity guide.
- **Post-review**: Verify author addressed all [MUST] items before approving.

### Severity Mapping for Checklist Items

| Checklist Result | Typical Severity | Notes |
|-----------------|-----------------|-------|
| Logic error / wrong behavior | [MUST] | Blocks merge |
| Security vulnerability | [MUST] | Blocks merge |
| Missing tests for new logic | [MUST] | Blocks merge |
| Layer violation | [SHOULD] | Fix before next release |
| Missing edge case handling | [SHOULD] | Fix before next release |
| Naming / clarity issue | [CONSIDER] | Minor improvement |
| Missing error handling | [SHOULD] | Could become bug |
| Performance regression (measurable) | [SHOULD] | Fix before next release |
| Performance concern (theoretical) | [CONSIDER] | Monitor in production |
| Style preference (no convention) | Do not raise | Not actionable |

---

## 1. Correctness Checklist

### Data Validation
- [ ] All public API / function boundaries validate input types and formats
- [ ] Null / undefined / empty values are handled explicitly
- [ ] String inputs are validated for length, format, and allowed characters
- [ ] Numeric inputs are validated for range, precision, and sign
- [ ] Array inputs are validated for emptiness and element types
- [ ] Object inputs are validated for required fields and unexpected fields
- [ ] File uploads have extension, MIME type, and size validation

### Logic
- [ ] Conditional branches cover all possible states (no uncovered paths)
- [ ] Loops handle empty collections without iteration
- [ ] Loop invariants hold (variables that should stay constant across iterations)
- [ ] Off-by-one errors: array bounds, pagination offsets, exclusive vs inclusive ranges
- [ ] Integer overflow / underflow handled (use BigInt for large values, saturating math)
- [ ] Floating point precision: no direct equality comparison, use epsilon
- [ ] State transitions are valid (no illegal state changes)
- [ ] Data transformations preserve invariants (sort stability, deduplication, idempotency)
- [ ] Default values are appropriate and do not mask errors

### Error Handling
- [ ] Every error path is handled (not just happy path)
- [ ] Errors have distinct types or codes (not generic Error thrown everywhere)
- [ ] Caught errors are logged with context (function, input, correlation ID)
- [ ] Expected errors (validation failures, auth failures) are distinguished from unexpected errors (system failures)
- [ ] Error messages are user-facing: clear and actionable, no stack traces
- [ ] Async error propagation: promises have .catch or are awaited in try/catch
- [ ] Callback errors follow the "error-first" convention where applicable
- [ ] Resource cleanup happens on error (file handles, DB connections, network sockets)
- [ ] Transaction rollback on error in database operations
- [ ] Swallowed errors are intentional (with comment explaining why)

### Concurrency
- [ ] Shared mutable state is protected by locks, mutexes, or atomic operations
- [ ] No race conditions between async operations reading and writing the same data
- [ ] Deadlock prevention: consistent lock ordering, lock timeouts
- [ ] No stale data reads after state mutation (read-your-writes consistency)
- [ ] Event handlers are idempotent or deduplicated
- [ ] No blocking calls in async context (sync file I/O, sync HTTP, Thread.sleep)
- [ ] Cancellation/abort signals propagate correctly through async chains
- [ ] Debouncing/throttling is implemented correctly (leading vs trailing edge)

### Date and Time
- [ ] All timestamps are stored in UTC (convert at display layer only)
- [ ] Timezone conversions are explicit (not relying on system timezone)
- [ ] Date arithmetic accounts for DST transitions, leap seconds, and calendar edge cases
- [ ] Date range comparisons use half-open intervals [start, end) to avoid overlap
- [ ] No assumptions about time granularity (some systems store seconds, others milliseconds)

### Data Integrity
- [ ] No silent data truncation (long strings, large numbers in narrow columns)
- [ ] Encoding is explicit (UTF-8 for strings, base64 for binary data)
- [ ] Cryptography: use standard libraries, not custom implementations
- [ ] Hashing uses salt for passwords, pepper for sensitive data
- [ ] UUIDs are generated with proper random source (crypto.randomUUID not Math.random)
- [ ] Serialization/deserialization handles versioning and migration

---

## 2. Architecture Checklist

### Layering
- [ ] Code is in the correct layer (domain / application / infrastructure / presentation)
- [ ] No layer violations: domain does not import infrastructure, presentation does not import data access
- [ ] Business logic is in domain layer, not in controllers, handlers, or UI components
- [ ] Infrastructure code is abstracted behind interfaces defined in domain/application layers
- [ ] Cross-cutting concerns (logging, auth, metrics) are applied via middleware or decorators, not inline

### Dependency Management
- [ ] No circular dependencies between modules, packages, or namespaces
- [ ] Import direction follows dependency rule: inward toward domain, outward toward infrastructure
- [ ] New dependencies are justified (license compatibility, bundle size impact, maintenance status)
- [ ] Third-party libraries are wrapped behind application interfaces (not exposed throughout the codebase)
- [ ] Dependency injection is used for testability (no static/singleton service locators)

### Module Cohesion
- [ ] Each module has a single responsibility (gather related code, separate unrelated code)
- [ ] Public API surface is minimal (only expose what other modules need)
- [ ] Internal implementation details are hidden (private functions, internal scoping)
- [ ] Module boundaries align with business domain boundaries (bounded contexts)

### Patterns and Conventions
- [ ] New code follows existing project patterns (folder structure, naming, error handling)
- [ ] New abstractions are justified by current needs, not hypothetical future requirements
- [ ] Design patterns are used appropriately (not over-engineering simple problems)
- [ ] Configuration is externalized (environment variables, config files, feature flags)
- [ ] Feature flags are used for incomplete features (no commented-out code or incomplete implementations)

### Data Flow
- [ ] Data flow direction is clear and consistent (unidirectional where possible)
- [ ] Side effects are visible and explicit (no hidden mutations)
- [ ] Event/observer patterns are used for cross-module communication rather than direct coupling
- [ ] CQRS is followed when read and write models differ significantly
- [ ] Data transformation pipelines are explicit and testable

### API Design
- [ ] RESTful endpoints follow resource naming conventions (plural nouns, not verbs)
- [ ] API versioning strategy is defined (URL path, header, or query parameter)
- [ ] Request/response schemas are explicit (OpenAPI, GraphQL schema, protobuf)
- [ ] Response status codes are semantically correct
- [ ] Error responses follow a consistent structure (code, message, details)
- [ ] Pagination, filtering, and sorting follow consistent conventions
- [ ] Deprecated endpoints have sunset headers and migration guides

---

## 3. Clarity Checklist

### Naming
- [ ] Function names are verbs describing the action (`createUser`, not `userCreation`)
- [ ] Variable names describe meaning, not type (`users`, not `userArray`)
- [ ] Boolean variables use is/has/should prefix (`isActive`, `hasPermission`, `shouldRetry`)
- [ ] Constants are UPPER_SNAKE_CASE (language convention permitting)
- [ ] Acronyms are consistently cased (HTML, not Html; parseHTML, not ParseHtml)
- [ ] No single-letter variables except loop indices in trivial loops
- [ ] No abbreviations that are not universally understood (unless project convention)

### Structure
- [ ] Functions do one thing (single responsibility)
- [ ] Functions are under 30 lines (exceptions documented with rationale)
- [ ] Conditionals use early returns / guard clauses to reduce nesting
- [ ] No deeply nested callbacks or Promise chains (use async/await)
- [ ] Complex conditionals are extracted to named variables or functions
- [ ] Switch statements have default case (even if unreachable)
- [ ] Long parameter lists are extracted to parameter objects (4+ parameters)
- [ ] Boolean parameters are named at call sites (`createUser({ isAdmin: true })`)

### Comments
- [ ] Comments explain WHY, not WHAT (the code shows what it does)
- [ ] No commented-out code (delete it)
- [ ] TODO comments have a ticket number or owner
- [ ] Public API has documentation comments (JSDoc, Javadoc, docstrings)
- [ ] Complex algorithms have a brief explanation of the approach
- [ ] No misleading or outdated comments (comments that contradict the code)

### Dead Code Elimination
- [ ] No unused imports, variables, or functions
- [ ] No unreachable code (after return, throw, break in switch)
- [ ] No duplicate code (if repeated 3+ times, extract to function)
- [ ] No debug code (console.log, print, debugger statements)
- [ ] No stub/mock implementations in production code

### Error Messages
- [ ] Error messages are specific and actionable (`"Email must contain @"` not `"Invalid input"`)
- [ ] Error messages are user-facing: concise, human-readable, no acronyms
- [ ] Error messages are internationalizable (no concatenation, use template strings)
- [ ] Log messages include contextual data (ID, operation, duration)
- [ ] Log levels are appropriate (error for failures, warn for unexpected states, info for significant events)

---

## 4. Performance Checklist

### Database Access
- [ ] No N+1 queries (ORM lazy loading in loops)
- [ ] Query filters use indexed columns
- [ ] No SELECT * (select only needed columns)
- [ ] Pagination uses keyset pagination for large datasets (not OFFSET)
- [ ] Bulk operations use batch APIs (batch insert, bulk update)
- [ ] No queries inside loops (batch query first, then process in memory)
- [ ] Read replicas used for read-heavy workloads
- [ ] Connection pooling is configured appropriately
- [ ] Query execution plans are analyzed for expensive operations

### Memory Management
- [ ] No unnecessary object allocations in hot paths (inside loops, render functions)
- [ ] Large objects are released when no longer needed (null references, scope exit)
- [ ] Event listeners are removed when component/object is destroyed
- [ ] Caches have eviction policies (TTL, LRU, size limits)
- [ ] No memory leaks from closures holding references to large objects
- [ ] Streaming is used for large data processing (not loading entire file into memory)
- [ ] No unintentional retention of DOM references in single-page applications

### Async and Concurrency
- [ ] Parallelizable operations use Promise.all or equivalent (not sequential await)
- [ ] No unnecessary serialization (await in loop when calls are independent)
- [ ] Cancellation: long-running operations can be aborted (AbortController, context cancellation)
- [ ] Debounce/throttle high-frequency events (scroll, resize, input)
- [ ] Web Worker / worker thread used for CPU-intensive operations

### Rendering (Frontend)
- [ ] No unnecessary re-renders: memo, useMemo, useCallback for expensive computations
- [ ] Virtual scrolling for large lists (react-window, react-virtualized)
- [ ] Lazy loading for routes and images (code splitting, IntersectionObserver)
- [ ] Bundle size: tree-shaken imports, no duplicate dependencies
- [ ] CSS animations use GPU-composited properties (transform, opacity)
- [ ] Images are optimized (WebP, responsive srcset, lazy loading)
- [ ] No layout thrashing (batch DOM reads before writes)
- [ ] Font loading avoids FOIT/FOUT (font-display: swap)

### Network
- [ ] API calls are batched where feasible (GraphQL, batch endpoints)
- [ ] Responses use pagination or partial responses (not returning all data)
- [ ] Compression is enabled (gzip, brotli)
- [ ] Caching headers are set appropriately (Cache-Control, ETag)
- [ ] No sequential API calls that could be parallelized
- [ ] Prefetching is used for likely-next resources

---

## 5. Security Checklist

### Authentication
- [ ] All protected endpoints have authentication checks
- [ ] Token validation: signature verification, expiry check, revocation check
- [ ] Session management: secure cookies, httpOnly, sameSite, short expiry
- [ ] Password policies: minimum length, hashing (bcrypt/argon2), no plaintext storage
- [ ] MFA is required for sensitive operations (admin panel, payment changes)
- [ ] Rate limiting on authentication endpoints (login, registration, password reset)
- [ ] Account lockout after N failed attempts
- [ ] No sensitive data in authentication tokens (JWT payload is base64, not encrypted)

### Authorization
- [ ] Authorization checks at function level (not just route/UI level)
- [ ] No direct object reference without ownership validation (user A cannot access user B's data)
- [ ] Role-based access control: least privilege principle
- [ ] Admin endpoints are not discoverable and require elevated roles
- [ ] Vertical privilege escalation prevented (regular user cannot access admin functions)
- [ ] Horizontal privilege escalation prevented (user cannot access another user's resources)

### Input Validation
- [ ] All user input is validated server-side (client-side validation is convenience, not security)
- [ ] SQL injection: parameterized queries, no string concatenation
- [ ] NoSQL injection: input sanitization for MongoDB, Couchbase, etc.
- [ ] Command injection: no shell execution with user input, use execFile with args array
- [ ] Path traversal: validate file paths, prevent ../ sequences
- [ ] SSRF: validate URLs, restrict to allowlisted domains
- [ ] XXE: disable XML external entity processing
- [ ] LDAP injection: sanitize LDAP search filters

### Output Encoding
- [ ] XSS prevention: context-aware escaping (HTML, attribute, JS, CSS, URL)
- [ ] Content-Type headers are explicit (no content sniffing)
- [ ] CSP headers are set (Content-Security-Policy)
- [ ] No inline event handlers (onclick, onerror) in HTML
- [ ] Template engines use auto-escaping by default

### Data Protection
- [ ] Secrets are not hardcoded (use environment variables, secret manager, vault)
- [ ] No secrets, tokens, or passwords in code, logs, or error messages
- [ ] Data at rest: encryption for PII, financial data, health records
- [ ] Data in transit: TLS 1.2+ for all communications
- [ ] PII minimization: collect only what is needed, anonymize where possible
- [ ] Data retention and deletion policies are implemented
- [ ] Backup and restore procedures exist for critical data

### Dependency Security
- [ ] No dependencies with known vulnerabilities (scan with Snyk, Dependabot, npm audit)
- [ ] Lockfile is checked in (package-lock.json, yarn.lock, Cargo.lock)
- [ ] No deprecated or unmaintained dependencies
- [ ] Dependency licenses are compatible with project license
- [ ] Supply chain security: verify dependency integrity (subresource integrity, checksum verification)
- [ ] No accidental inclusion of dev dependencies in production builds

### Common Vulnerabilities
- [ ] CSRF: state-changing endpoints require CSRF token or SameSite cookie
- [ ] Open redirect: validate redirect URLs against allowlist
- [ ] Clickjacking: X-Frame-Options DENY or frame-ancestors CSP
- [ ] Server-side template injection: template engine sandboxing
- [ ] Insecure deserialization: validate serialized data, avoid eval/JSON.parse on untrusted input
- [ ] Prototype pollution: use Object.create(null) or Object.freeze for safe objects
- [ ] Cache poisoning: vary cache key by authentication state
- [ ] HTTP parameter pollution: use structured request parsing

---

## 6. Test Quality Checklist

### Coverage
- [ ] New code has corresponding tests
- [ ] Bug fixes include a regression test that would fail without the fix
- [ ] Tests cover the happy path (expected flow)
- [ ] Tests cover edge cases (empty state, boundary values, invalid input)
- [ ] Tests cover failure paths (validation errors, auth failures, system errors)
- [ ] Tests cover all branches of conditionals (if/else, switch cases)
- [ ] Branch coverage > 80% for new code paths

### Test Design
- [ ] Tests test behavior, not implementation (test the result, not internal calls)
- [ ] Test names describe the scenario and expected outcome (`returns_400_when_email_missing`)
- [ ] Each test has a single logical assertion (multiple assertions are okay if they test one behavior)
- [ ] No logic in tests (no conditionals, loops, or complex computations)
- [ ] No test-specific code in production (no test-only exports, no if(test) branches)
- [ ] Tests are independent (no shared state between tests, no test ordering dependencies)
- [ ] Tests are deterministic (no randomness, time-dependent failures, or external service dependencies)

### Mocks and Fixtures
- [ ] Mocks are minimal -- prefer real implementations for domain logic
- [ ] Mocked dependencies are at boundaries (external APIs, databases, file system)
- [ ] Mock expectations are specific (not overly broad any() matchers)
- [ ] Fixtures are static and version-controlled (not generated at test time)
- [ ] Fixtures are minimal (only include fields needed for the test scenario)
- [ ] Mock setup and verification are in the test (not in beforeAll/afterAll)

### Integration Tests
- [ ] Key user workflows are covered by integration tests
- [ ] Integration tests use real or containerized dependencies (not mocks)
- [ ] Test database is isolated (separate database or in-memory)
- [ ] API contract tests validate request/response schemas
- [ ] Integration tests have clean database state before each run

### Snapshot Tests
- [ ] Snapshot files are reviewed when created and updated
- [ ] Snapshots are meaningful (not too large, not containing non-deterministic data)
- [ ] Snapshot updates are intentional (not blindly accepted)
- [ ] Snapshots are committed to version control

### Flaky Test Prevention
- [ ] No time-dependent assertions (use fixed timestamps, mock time)
- [ ] No order-dependent tests (tests should pass in any order)
- [ ] No shared mutable state across tests
- [ ] No network calls in unit tests (mock external services)
- [ ] Async operations are properly awaited
- [ ] Test timeouts are generous enough for CI environments

### Performance Tests
- [ ] Performance-critical code paths have benchmark tests
- [ ] Benchmarks are statistically significant (warmup iterations, sufficient sample size)
- [ ] Regression thresholds are set (p95 latency, throughput, memory allocation)
- [ ] Load tests exist for critical endpoints (auth, search, checkout)

---

## 7. Documentation Checklist

### Code Documentation
- [ ] Public API has usage documentation (params, return values, exceptions)
- [ ] Complex algorithms or business rules have explanatory comments
- [ ] Configuration and environment variables are documented
- [ ] Setup and run instructions are up to date
- [ ] Architecture decisions are documented (ADR format)
- [ ] Migration scripts have rollback instructions

### PR / Review Documentation
- [ ] PR description explains WHAT changed and WHY
- [ ] Screenshots or screen recordings for UI changes
- [ ] Migration or breaking changes are called out
- [ ] Testing instructions (how to verify the change)
- [ ] Deployment considerations (database migrations, environment variables, feature flags)

---

## 8. Accessibility Checklist (Frontend)

### Semantic HTML
- [ ] Headings are in correct hierarchy (h1 -> h2 -> h3, no skipping)
- [ ] Interactive elements use native HTML elements (button, a, input, select)
- [ ] ARIA attributes are used correctly (role, aria-label, aria-describedby)
- [ ] Form inputs have associated labels
- [ ] Alt text is provided for meaningful images (decorative images have alt="")

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order follows visual order (tabindex is not used to reorder)
- [ ] Focus indicators are visible (no outline: none without replacement)
- [ ] No keyboard traps (focus cannot get stuck in a widget)
- [ ] Skip navigation link is present on every page

### Color and Contrast
- [ ] Text has at least 4.5:1 contrast ratio (3:1 for large text)
- [ ] UI components have at least 3:1 contrast ratio
- [ ] No information conveyed by color alone (add icons, patterns, or text labels)
- [ ] Focus indicators have at least 3:1 contrast

### Screen Readers
- [ ] Dynamic content changes are announced (aria-live regions, role=alert)
- [ ] Error messages are associated with inputs (aria-describedby, aria-invalid)
- [ ] Custom controls have proper ARIA roles and states
- [ ] Landmarks are used (nav, main, aside, footer)

---

## 9. Language-Specific Checklists

### TypeScript / JavaScript
- [ ] strict mode enabled in tsconfig (strict: true)
- [ ] No implicit any (types are explicit or inferred)
- [ ] No use of any (use unknown and type guard instead)
- [ ] Type predicates are accurate (function isX(value): value is X)
- [ ] Discriminated unions used for state machines
- [ ] Null checks use `??` not `||` for default values
- [ ] No unused variables with underscore prefix convention
- [ ] Async functions always return Promise (no fire-and-forget without error handling)
- [ ] No eval, Function constructor, or setTimeout with string argument

### Python
- [ ] Type hints provided for public functions and classes
- [ ] No bare except clauses (except: without exception type)
- [ ] Context managers used for resource management (with statement)
- [ ] No mutable default arguments
- [ ] Properties used instead of getter/setter methods
- [ ] List comprehensions used for simple transformations (not for side effects)
- [ ] f-strings for string formatting (not % or .format)

### Rust
- [ ] No unsafe blocks without justification comment
- [ ] Errors use Result<T, E>, not panics
- [ ] Unwrap/expect calls are justified (not in production paths)
- [ ] Lifetimes are explicit in function signatures
- [ ] Clonable types implement Clone, not manual duplication
- [ ] Standard traits implemented (Debug, Clone, PartialEq for public types)
- [ ] No performance-sensitive allocations in hot paths

### Go
- [ ] Errors are always checked (no _ assignments that ignore errors)
- [ ] No panic/recover in normal control flow
- [ ] Goroutine lifecycle is managed (no leaked goroutines)
- [ ] Context is passed as first parameter for cancellation
- [ ] Interface types are small (1-3 methods)
- [ ] No init() functions for logic (only for registration)
- [ ] go fmt has been run

### Java / Kotlin
- [ ] No null (use Optional, @Nullable annotations, or Kotlin nullable types)
- [ ] Immutable data classes preferred (record, data class)
- [ ] No checked exception swallowing
- [ ] Stream API used for collection transformations (not imperative loops)
- [ ] Dependency injection via constructor, not field injection
- [ ] No static utility classes (use top-level functions in Kotlin, instance methods in Java)

---

## 10. Environment and Configuration Checklist

- [ ] Environment variables have defaults or validation
- [ ] No hardcoded URLs, ports, or paths
- [ ] Configuration is environment-aware (dev, staging, production)
- [ ] Feature flags have removal timelines
- [ ] Logging levels are configurable
- [ ] Monitoring and alerting are configured for new features
- [ ] Health check endpoint exists and covers critical dependencies
- [ ] Graceful shutdown is implemented (SIGTERM handling)
- [ ] Database migrations are reversible

---

## Domain-Specific Checklists

### Web Application Checklist

- [ ] Route parameters validated (type, length, allowed characters)
- [ ] CORS headers configured correctly (not wildcard for credentialed requests)
- [ ] Session timeout and renewal handled
- [ ] CSRF protection on all state-changing endpoints
- [ ] Content-Type validation for request bodies
- [ ] API versioning strategy is consistent
- [ ] Error responses follow OpenAPI/contract spec
- [ ] Pagination limits enforced server-side, not just client-side

### API / Service Checklist

- [ ] Request schema validation at the service boundary
- [ ] Response schema validation (no extra fields, no missing fields)
- [ ] Idempotency keys for mutation endpoints
- [ ] Rate limiting headers returned (X-RateLimit-Remaining, Retry-After)
- [ ] Graceful degradation for downstream service failures (circuit breaker)
- [ ] Retry logic with exponential backoff for transient failures
- [ ] Timeout configuration for all outbound calls
- [ ] Logging includes correlation ID for request tracing

### Database / Data Layer Checklist

- [ ] Migrations are reversible (down migration exists)
- [ ] Migration changes are reviewed separately (not buried in feature PR)
- [ ] No raw SQL string concatenation (parameterized queries only)
- [ ] Transactions wrap multi-step write operations
- [ ] Indexes are added for new query patterns
- [ ] Read replicas used for read-heavy workloads
- [ ] Connection pool size configured appropriately
- [ ] No N+1 queries in serializers/resolvers
- [ ] Soft deletes used for critical data (with hard delete policy)
- [ ] Audit logging for all data mutations

### Frontend / UI Checklist

- [ ] Responsive layout tested at target breakpoints
- [ ] Loading states for all async operations
- [ ] Empty states for lists/tables with no data
- [ ] Error states for failed API calls
- [ ] Form validation provides real-time feedback
- [ ] Form submission prevents double-submit
- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus management for modals, drawers, and multi-step flows
- [ ] Accessibility: alt text, labels, ARIA roles, color contrast
- [ ] Bundle size impact assessed for new dependencies

### Mobile / React Native Checklist

- [ ] Touch targets are at least 44x44 points
- [ ] Network state changes handled (offline, slow connection)
- [ ] Deep linking configured for navigation
- [ ] Platform-specific code is isolated (iOS vs Android)
- [ ] Image sizing and caching optimized for mobile bandwidth
- [ ] Memory: no image or data leaks from unmounted screens
- [ ] Background/foreground lifecycle handled
- [ ] Push notification permissions requested contextually

### Configuration / Infrastructure Checklist

- [ ] Environment variables documented in .env.example
- [ ] Secrets stored in secret manager, not in code
- [ ] Feature flags have owner and removal date
- [ ] Logging level is configurable at runtime
- [ ] Health check endpoint covers all critical dependencies
- [ ] Metrics exported for new features (prometheus, datadog)
- [ ] Graceful shutdown implemented (SIGTERM handling, drain connections)
- [ ] Resource limits configured (memory, CPU for containers)
- [ ] Backup and restore strategy for new data stores

---

## Anti-Patterns Checklist

### Code-Level Anti-Patterns

- [ ] No God classes or monolithic functions (single responsibility violated)
- [ ] No shotgun changes (one change scattered across 10+ files unnecessarily)
- [ ] No copy-paste code (extract to shared function or module)
- [ ] No premature optimization (complex code without measured performance need)
- [ ] No over-engineering (abstractions, patterns, generics for hypothetical future use)
- [ ] No magic behavior (implicit side effects, hidden transformations, unexpected mutations)
- [ ] No lazy patterns (any, var, implicit any, unchecked casts, force unwraps)
- [ ] No cargo-culting (copying patterns without understanding why they exist)

### Architecture Anti-Patterns

- [ ] No dependency inversion violations (high-level modules depend on low-level modules)
- [ ] No circular package/module dependencies
- [ ] No leaky abstractions (implementation details exposed in interfaces)
- [ ] No anemic domain model (all logic in services, domain objects are data bags)
- [ ] No service locator pattern (request dependencies explicitly via constructor)
- [ ] No sequential coupling (methods must be called in a specific order without enforcement)
- [ ] No inappropriate intimacy (one class knows too much about another's internals)
- [ ] No feature envy (a method is more interested in another class's data than its own)

### Process Anti-Patterns

- [ ] No unreviewed code reaching production
- [ ] No self-approvals (except hotfixes with post-hoc review)
- [ ] No stale branches (branches older than 3 days without activity)
- [ ] No unreviewed dependencies (dependencies added without vetting)
- [ ] No silent failures (errors swallowed without logging or alerting)
- [ ] No undiscussed breaking changes (API changes, schema changes, dependency upgrades)

---

## Checklist Automation Script

### Pre-Commit Checklist Validation

```pwsh
# scripts/validate-pr.ps1
# Run this before requesting review to self-validate against the checklist

param(
    [string]$Branch = "HEAD",
    [string]$TargetBranch = "main"
)

$ErrorActionPreference = "Stop"
$issues = @()
$warnings = @()

Write-Host "Pre-review validation for branch: $Branch" -ForegroundColor Cyan

# 1. Check diff size
$diffOutput = & git diff "$TargetBranch...$Branch" --stat
$linesMatch = [regex]::Match($diffOutput, '(\d+) insertions')
$insertions = if ($linesMatch.Success) { [int]$linesMatch.Groups[1].Value } else { 0 }
$deletionsMatch = [regex]::Match($diffOutput, '(\d+) deletions')
$deletions = if ($deletionsMatch.Success) { [int]$deletionsMatch.Groups[1].Value } else { 0 }
$totalChanges = $insertions + $deletions

if ($totalChanges -gt 400) {
    $issues += "PR is $totalChanges lines. Maximum recommended is 400 lines. Split into smaller PRs."
}

# 2. Check for console.log
$consoleLogFiles = & git diff "$TargetBranch...$Branch" --name-only --diff-filter=AM
foreach ($file in $consoleLogFiles) {
    if ($file -match '\.(ts|tsx|js|jsx)$') {
        $diff = & git diff "$TargetBranch...$Branch" -- $file
        if ($diff -match '^\+.*console\.(log|debug)') {
            $issues += "console.log/debug found in $file. Remove before requesting review."
        }
    }
}

# 3. Check for TODO without ticket
foreach ($file in $consoleLogFiles) {
    if ($file -match '\.(ts|tsx|js|jsx|py|rs|go)$') {
        $diff = & git diff "$TargetBranch...$Branch" -- $file
        if ($diff -match '^\+.*TODO(?!\()') {
            $warnings += "TODO without ticket reference in $file. Add ticket number."
        }
    }
}

# 4. Check for test files
$hasTestChanges = $consoleLogFiles -match '\.(test|spec)\.' -or $consoleLogFiles -match '__tests__'
$hasSourceChanges = $consoleLogFiles -match '^src/' -or $consoleLogFiles -match '^app/'
if ($hasSourceChanges -and -not $hasTestChanges) {
    $warnings += "Source code changes without test changes. Add tests for new functionality."
}

# 5. Summary
Write-Host "`nValidation Results:" -ForegroundColor Cyan
if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "  All checks passed. PR is ready for review." -ForegroundColor Green
} else {
    if ($issues.Count -gt 0) {
        Write-Host "  Issues to fix:" -ForegroundColor Red
        $issues | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    }
    if ($warnings.Count -gt 0) {
        Write-Host "  Warnings:" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
    }
}

# Export validation report
$report = @{
    branch = $Branch
    timestamp = Get-Date -Format "o"
    totalLinesChanged = $totalChanges
    issues = $issues
    warnings = $warnings
    passed = $issues.Count -eq 0
}
$report | ConvertTo-Json | Out-File -FilePath "pr-validation-report.json"
Write-Host "`nValidation report saved to pr-validation-report.json" -ForegroundColor Gray
```

### CI Pre-Review Validation

```yaml
# .github/workflows/pre-review-validation.yml
name: Pre-Review Validation
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check PR size
        run: |
          PR_SIZE=$(git diff --diff-filter=AM --name-only origin/main...HEAD | xargs wc -l | tail -1 | awk '{print $1}')
          if [ "$PR_SIZE" -gt 400 ]; then
            echo "::error::PR size is $PR_SIZE lines (max 400). Please split into smaller PRs."
            exit 1
          fi

      - name: Check for console.log
        run: |
          if git diff origin/main...HEAD -G'console\.(log|debug)' -- '*.ts' '*.tsx' '*.js' '*.jsx' | grep '^+'; then
            echo "::warning::console.log/debug detected in changes. Review recommended."
          fi

      - name: Check for test coverage
        run: |
          HAS_SOURCE=$(git diff --diff-filter=AM --name-only origin/main...HEAD | grep -c -E '^src/|^app/' || true)
          HAS_TESTS=$(git diff --diff-filter=AM --name-only origin/main...HEAD | grep -c -E '\.(test|spec)\.' || true)
          if [ "$HAS_SOURCE" -gt 0 ] && [ "$HAS_TESTS" -eq 0 ]; then
            echo "::warning::Source changes without test changes. Add tests."
          fi
```

---

## Checklist Template for Review Sessions

```markdown
## Code Review Checklist: {PR/MR Title}

### Pre-review
- [ ] Lint passes (no errors, no warnings)
- [ ] Type check passes (no type errors)
- [ ] All existing tests pass
- [ ] Format matches project formatter

### Correctness
- [ ] Input validation at boundaries
- [ ] Edge cases handled (null, empty, zero, boundary values)
- [ ] Error handling covers all paths
- [ ] Concurrency safety (race conditions, deadlocks)

### Architecture
- [ ] Code in correct layer
- [ ] No circular dependencies
- [ ] Follows project patterns
- [ ] New abstractions justified

### Clarity
- [ ] Names reveal intent
- [ ] No dead code or commented code
- [ ] No magic numbers/strings
- [ ] Error messages actionable

### Performance
- [ ] No N+1 queries
- [ ] No blocking calls in async code
- [ ] No unnecessary allocations in hot paths
- [ ] Bundle impact acceptable

### Security
- [ ] Input validation on user-facing endpoints
- [ ] Authorization checks secure
- [ ] No secrets in code
- [ ] Injection prevention

### Tests
- [ ] Tests cover new code
- [ ] Edge cases tested
- [ ] Regression test for bug fixes
- [ ] Tests are deterministic

### Summary
- [MUST]: {count} items
- [SHOULD]: {count} items
- [CONSIDER]: {count} items
- Positive: {count} observations
```

---

## References

- `code-review-advanced.md` -- Code Review Advanced Topics
- `code-review-fundamentals.md` -- Code Review Fundamentals
- `review-checklist.md` -- Review Checklist
- `review-workflow.md` -- Review Workflow
- `security-review-checklist.md` -- Security Review Checklist
- `code-review-workflow-automation.md` -- Code Review Workflow and Automation
- OWASP Top 10 -- Web Application Security Risks
- Google Code Review Developer Guide
- Microsoft Code Review Best Practices
- CWE/SANS Top 25 Most Dangerous Software Errors
