---
name: code-review
description: >
  Use this skill when the user says 'review this code', 'code review', 'review PR',
  'check this implementation', 'is this code good', 'LGTM?', 'feedback on code', or
  wants a structured code review. Covers: correctness, architecture, clarity,
  performance, security, and test quality. Produces a structured review with
  severity levels: MUST, SHOULD, CONSIDER. Works with any language/stack.
  Do NOT use this for: debugging (use debugging-strategy), writing code, or
  architectural planning.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, review, phase-4, quality]
---

# Code Review

**Version:** 1.1.0
**Author:** j4flmao
**License:** MIT

---

## Purpose

Provide systematic, structured code reviews covering correctness, architecture, clarity, performance, security, and tests. Every finding is actionable, prioritized by severity, and anchored to a specific file and line.

---

## Agent Protocol

### Trigger

Exact user phrases: "review this code", "code review", "review PR", "check this implementation", "is this code good", "LGTM?", "feedback on code".

### Input Context

Before activating, verify:
- The code or diff to review is provided or accessible.
- The language/stack is known.
- The project's coding standards or conventions are available.

### Output Artifact

No file output. This skill produces structured review text.

### Response Format

Answer exactly:
```
## Code Review: {file/scope}

### [MUST] {short title}
- **File**: `src/path/file.ts:42`
- **Issue**: {what's wrong}
- **Why**: {impact}
- **Fix**: {suggested approach}

### [SHOULD] {short title}
...

### [CONSIDER] {short title}
...

### Positive
- {what's done well}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick. No explanations of what code review is.

### Completion Criteria

This skill is complete when:
- [ ] All findings are classified with severity [MUST]/[SHOULD]/[CONSIDER].
- [ ] Every finding includes exact file and line number.
- [ ] At least one positive observation is included for every 3 critical findings.
- [ ] No code has been rewritten -- only problems and suggested approaches.

### Max Response Length

100 lines or as many as needed to cover all findings in one pass.

---

## Component Architecture / Decision Trees

### Severity Classification Decision Tree

```
Is the finding a correctness bug (wrong behavior)?
  |-- YES --> [MUST] Blocks merge. Can cause production incidents.
  |-- NO  --> Is it a security vulnerability?
        |-- YES --> [MUST] Immediate fix required.
        |-- NO  --> Is it a performance regression (measurable)?
              |-- YES --> Is it likely to affect users in production?
              |     |-- YES --> [SHOULD] Fix before next release.
              |     |-- NO  --> [CONSIDER] Monitor and fix if needed.
              |-- NO  --> Is it an architecture or maintainability concern?
                    |-- YES --> Does it violate established patterns?
                    |     |-- YES --> [SHOULD] Follow project conventions.
                    |     |-- NO  --> [CONSIDER] Improvement suggestion.
                    |-- NO  --> Is it a clarity or naming issue?
                          |-- YES --> Does it block understanding for reviewers?
                          |     |-- YES --> [SHOULD] Rename or clarify.
                          |     |-- NO  --> [CONSIDER] Minor improvement.
                          |-- NO  --> Is it a test quality issue?
                                |-- YES --> Are tests missing for critical paths?
                                |     |-- YES --> [SHOULD] Add critical tests.
                                |     |-- NO  --> [CONSIDER] Expand test coverage.
```

### Review Depth Decision Tree

```
What is the scope of the change?
  |-- < 50 lines diff --> Full review (all 6 dimensions).
  |-- 50-200 lines --> Full review. Read every line.
  |-- 200-400 lines --> Full review. Focus on changed logic files over config/tests.
  |-- > 400 lines --> Review critical path diff. Flag: "Diff exceeds 400 lines. Focused on core logic changes."
  |     |-- Skip: formatting, comments, whitespace-only diffs.
  |     |-- Flag: large diffs that should be split into multiple PRs.

Is this a new feature or a bug fix?
  |-- New feature --> Heavy on architecture + correctness + test quality.
  |-- Bug fix --> Heavy on correctness + root cause analysis + regression tests.
  |-- Refactor --> Heavy on architecture + performance (verify no regression).
  |-- Dependency update --> Heavy on security + compatibility + changelog diff.

Does the code touch a critical path (auth, payments, data layer)?
  |-- YES --> Security + correctness = highest priority. MUST findings here are blockers.
  |-- NO  --> Standard review weighting.
```

### Framework/Language-Specific Considerations

| Aspect | Static Typed (TS, Rust, Java) | Dynamic (Python, JS, Ruby) |
|--------|-----------------------------|---------------------------|
| Type errors | Caught at compile time | Runtime risk. MUST review type contracts |
| Null safety | Compiler-enforced (strict mode) | Manual checks required. SHOULD validate all external inputs |
| Refactoring safety | Compiler-guided. SAFE | Manual. RISK of silent breakage |
| Performance optimization | Compiler handles many cases | Runtime profile required. SHOULD review hot paths |
| Testing depth | Integration + types tested | Unit + integration required for coverage |
| Documentation | Types are partial docs | Docstrings required for public APIs |

### Review Order of Operations

```
Pass 1: Scan -- Read diff structure. Identify affected files and changed modules.
   Identify critical path files. Note files to skip (generated, config, formatting).
   
Pass 2: Correctness -- Read each changed file in the context of the full function.
   Verify logic, edge cases, error handling, data flow.
   
Pass 3: Architecture -- Check patterns, layer violations, dependency direction.
   Does this code belong where it is placed?
   
Pass 4: Security + Performance + Clarity -- Combine these in a single pass.
   Input validation, auth checks, N+1 queries, naming, magic numbers.
   
Pass 5: Tests -- Review test coverage, assertions, edge cases.
   Do tests validate the change? Are they testing behavior, not implementation?
   
Pass 6: Positive observations -- Find at least one thing done well per 3 findings.
   This is not optional. Code reviews should not be purely negative.
```

---

## Workflow

### Step 1: Correctness

- Does the code do what it claims?
- Are edge cases handled? (null, empty, invalid input)
- Error handling -- are all error paths handled?
- Are there off-by-one errors, race conditions, or type mismatches?

**Correctness checklist**:
- [ ] All function parameters validated at public API boundaries
- [ ] Null/undefined/empty string/zero treated as distinct cases
- [ ] Error responses have distinct types, not generic `Error`
- [ ] Loops handle empty collections gracefully
- [ ] Async operations have proper error propagation (no swallowed rejections)
- [ ] State mutations are intentional and traceable
- [ ] Data transformation preserves invariants (e.g., sorting a list maintains idempotency)
- [ ] Side effects (I/O, DB writes, API calls) are idempotent or logged
- [ ] Math operations handle division by zero, overflow, precision loss
- [ ] Date/time operations handle timezone-aware and timezone-naive mismatches
- [ ] Off-by-one: array indices, pagination, range loops
- [ ] Race conditions: shared state between async operations without synchronization

### Step 2: Architecture

- Is the code in the right layer? (domain vs application vs infrastructure)
- Does it follow the project's architectural patterns (Clean Architecture, DDD)?
- Are there circular dependencies?
- Does it violate any layer rules (e.g., domain importing infrastructure)?

**Architecture checklist**:
- [ ] Code follows the project's defined architecture (folder structure, layer separation)
- [ ] No circular dependencies between modules or packages
- [ ] Imports respect dependency direction (domain <- application <- infrastructure)
- [ ] New abstractions are justified (not over-engineering for hypothetical future needs)
- [ ] Existing patterns are followed (not reinventing wheels)
- [ ] Inter-module communication follows established patterns (events, interfaces, DI)
- [ ] No leaky abstractions (implementation details exposed through public API)
- [ ] Configuration is externalized (not hardcoded)
- [ ] Business logic is in domain layer, not in controllers or UI
- [ ] Third-party dependencies are wrapped behind interfaces (not coupled directly)
- [ ] Feature flags or toggles are used for incomplete features (not commented code)

### Step 3: Clarity

- Do names reveal intent? (function names, variable names, class names)
- Is there dead code, commented-out code, or unnecessary complexity?
- Are there magic numbers or strings that should be constants?
- Is the code self-documenting, or does it need comments?

**Clarity checklist**:
- [ ] Function names are verbs describing what they do
- [ ] Variable names describe meaning, not type (`users` not `userList`, `index` not `i` except in trivial loops)
- [ ] No magic strings/numbers -- all extracted to named constants
- [ ] Boolean parameters are named at call sites (`createUser(isAdmin=true)` not `createUser(true)`)
- [ ] Functions do one thing (single responsibility at function level)
- [ ] Function length < 30 lines (exceptions for complex business logic with clear structure)
- [ ] No nested callbacks or deeply nested conditionals (refactor to early returns or guard clauses)
- [ ] Conditionals read naturally ("if user is active" not "if user.status === 'active' && user.subscription !== null")
- [ ] No commented-out code -- delete it
- [ ] No dead code -- unused functions, variables, imports
- [ ] Error messages are actionable ("Email is required" not "Validation failed")
- [ ] Log messages include context (user ID, correlation ID, function name)

### Step 4: Performance

- Any obvious N+1 queries?
- Unnecessary allocations in hot paths?
- Blocking calls in async code?
- Missing indexes for database queries?
- Unoptimized bundle imports?

**Performance checklist**:
- [ ] Database queries: check for N+1 (lazy loading in ORM loops)
- [ ] Database queries: missing indexes on filter/join/sort columns
- [ ] No unnecessary object/array copies in loops (spread, slice, filter in hot paths)
- [ ] No blocking I/O in async context (sync fs, sync HTTP calls)
- [ ] Memory: no large objects held in closure scope longer than needed
- [ ] Memory: no event listeners that are never removed
- [ ] Bundle: tree-shakeable imports (named imports, not `import *`)
- [ ] Bundle: no duplicate dependencies (check lockfile)
- [ ] Caching: repeated computations cached (memoization, computed properties)
- [ ] Network: no sequential API calls that could be parallelized
- [ ] React: no unnecessary re-renders (missing memo, unstable props, inline callbacks)
- [ ] CSS: no expensive selectors (`:nth-child` chains, universal selectors on large lists)

### Step 5: Security

- Input validation on all user-facing endpoints?
- Authorization checks where needed?
- No secrets, tokens, or passwords in code?
- SQL injection prevention? (parameterized queries)
- XSS prevention? (proper escaping)

**Security checklist**:
- [ ] All user input is validated (type, length, format, range)
- [ ] SQL queries use parameterized statements (not string concatenation)
- [ ] No hardcoded secrets, API keys, tokens, passwords
- [ ] Authentication checks on all protected endpoints
- [ ] Authorization checks at function level, not just route level
- [ ] No direct object references without ownership validation
- [ ] Output is properly escaped for the context (HTML, JSON, XML)
- [ ] File uploads have type validation and size limits
- [ ] Rate limiting on auth endpoints (login, password reset)
- [ ] CSRF protection on state-changing endpoints
- [ ] CORS configuration is appropriate for the deployment environment
- [ ] Dependencies are checked for known vulnerabilities
- [ ] Error messages do not leak stack traces or internal state
- [ ] Session management uses secure, httpOnly, sameSite cookies
- [ ] Redirect URLs are validated (no open redirects)

### Step 6: Tests

- Does the code have tests? Are they meaningful?
- Do tests cover the acceptance criteria?
- Are tests testing behavior, not implementation?
- Are there edge cases tested beyond the happy path?

**Test checklist**:
- [ ] Tests exist for the change (new code has new tests, bug fix has regression test)
- [ ] Tests cover the happy path
- [ ] Tests cover edge cases (empty state, error state, boundary values)
- [ ] Tests cover failure paths (invalid input, system errors, auth failures)
- [ ] Tests test behavior, not implementation (test the outcome, not internal calls)
- [ ] No flaky tests (time-dependent, order-dependent, shared state)
- [ ] Test names describe the scenario and expected outcome
- [ ] Mocks are minimal -- prefer real dependencies for domain logic
- [ ] No test logic in production code (no test-only exports or conditional behavior)
- [ ] Snapshot tests have meaningful titles and are reviewed on update
- [ ] Integration tests cover key user workflows, not just unit tests
- [ ] Coverage: new code paths should have > 80% branch coverage

---

## Rules & Constraints

- Every finding must include the exact file and line number.
- Severity labels: [MUST] = blocks merge, [SHOULD] = best practice, [CONSIDER] = suggestion.
- Include a positive observation for every 3 critical findings -- reviews shouldn't be purely negative.
- Never rewrite the code yourself -- point to the problem and suggest the approach.
- One review pass = one complete analysis -- don't do multiple passes on the same diff.
- If the diff is larger than 400 lines, focus on the most critical files.
- Do not raise style preferences as issues unless they violate project conventions.
- Do not review generated code, third-party code, or configuration unless it affects correctness.
- Each finding must be independently actionable. A reviewer should be able to fix each issue without context from other findings.
- If the same issue appears in multiple files, raise it once with a list of affected locations.
- If the code is correct but could be simpler, prefer [CONSIDER] over [SHOULD].
- Performance findings must include measurable impact estimate (e.g., "adds 200ms to page load").

---

## Common Pitfalls

### 1. Style Over Substance
Flagging formatting, naming, or style preferences as [MUST] when no project convention exists. Style is not correctness. Use [CONSIDER] for style unless it violates an established standard.

**Fix**: Before reviewing, check if the project has a style guide, linter config, or formatter. If it does, reference it. If not, style is [CONSIDER] at most.

### 2. Missing the Context
Reviewing a function without understanding how it is called or what data it processes. A function that is correct in isolation may be wrong in context.

**Fix**: Read calling code and test files before the implementation. Understand the data flow before evaluating the code.

### 3. Over-engineering Feedback
Suggesting abstractions, patterns, or refactors that are disproportionate to the change. A 5-line bug fix should not trigger a [MUST] to "extract a strategy pattern."

**Fix**: Proportionate feedback. A 10-line change gets 1-2 findings. A 200-line feature gets 5-10 findings. Match the review depth to the change size.

### 4. Negative-only Reviews
Listing 15 issues and 0 positives. This demoralizes the author and trains them to ignore feedback.

**Fix**: Every review must include positive observations. Find something the author did well, even if it is "good test coverage" or "clear variable naming."

### 5. False Positives (Nitpicking)
Raising issues that are technically correct but practically irrelevant: unused import in a test file, white-space inconsistency, variable name preference.

**Fix**: Ask: "If the author ignores this finding, will the code break or cause maintenance burden?" If no, it is not worth raising. Use [CONSIDER] sparingly for genuinely helpful suggestions, not perfectionism.

### 6. Ignoring Tests
Reviewing only production code and ignoring the test file. Tests are the only way to verify correctness; ignoring them means the review is incomplete.

**Fix**: Never mark a review complete without reviewing the test file. If there are no tests, that is a [MUST] finding.

### 7. Assuming Your Way Is the Only Way
Multiple approaches can be correct. If the code is correct, performant, and maintainable, do not flag it for not matching your preferred pattern.

**Fix**: Before raising an architecture finding, ask: "Is the current approach incorrect, or just different from how I would do it?" Only raise if it is genuinely wrong.

### 8. Reviewing Without the Diff Context
Looking at a changed function in isolation without seeing what changed from the previous version. The diff shows intent; the full file shows context. Both are needed.

**Fix**: Start with the diff to understand what changed. Then read the full file for the changed functions to understand context.

### 9. Inconsistent Severity Labeling
Labeling similar issues with different severity in the same review. This confuses the author and undermines the severity system.

**Fix**: Be consistent. Define severity before reviewing: "Is this a logic bug? MUST. Is this a naming preference? CONSIDER." Apply uniformly.

### 10. Rewriting Code in Comments
Writing long code snippets in review comments instead of pointing to the problem. The reviewer's job is to find issues, not to write the fix.

**Fix**: Describe the approach in 1-2 sentences. Only include code if the fix is non-obvious. For obvious fixes, just state the problem and suggested approach.

---

## Compared With

| Approach | Focus | Format | Best For |
|----------|-------|--------|----------|
| Code Review (this skill) | All 6 dimensions: correctness, architecture, clarity, performance, security, tests | Structured [MUST]/[SHOULD]/[CONSIDER] | General purpose, pre-merge |
| Security Review | Vulnerability assessment | CWE classification, exploitability scoring | Security-critical code, compliance audits |
| Architecture Review | System design, layer boundaries, coupling | ADR, architecture diagram | Major features, new modules, system design |
| Performance Review | Runtime profiling, bundle analysis, query optimization | Flame graph, bundle report | Performance-critical features, regression investigation |
| Pair Programming | Real-time feedback, shared ownership | Continuous conversation | Complex features, knowledge transfer |
| Automated Linting | Style, formatting, simple correctness | Linter output, CI integration | Every PR (supplementary, not replacement) |
| Formal Verification | Mathematical proof of correctness | Proof artifacts | Safety-critical systems (medical, aerospace) |

This review skill is the broadest, covering all dimensions in a single pass. It is the default starting point for any code review request.

---

## Performance Considerations

### Review Efficiency

**Time budget per line**: 30-60 seconds per changed line for critical code, 10-20 seconds for config/tests. Aim for 200-400 lines per hour maximum. Beyond this, review quality drops.

**Review fatigue**: After 60 minutes of continuous review, finding accuracy drops by 40%. Take breaks. Split large reviews across sessions.

**Priority allocation**: Spend 60% of review time on correctness + security (highest risk), 25% on architecture + tests, 15% on clarity + performance. This weighting ensures the most impactful issues are caught.

### Automation to Reduce Review Load

Automated checks that should pass before human review starts:

```yaml
# Pre-review CI checks
- Lint: passes project linting rules
- Type check: no type errors (strict mode where applicable)
- Test: all existing tests pass
- Format: matches project formatter
- Security scan: no known vulnerabilities in new dependencies
- Bundle size: within threshold (if applicable)
```

If any automated check fails, the author should fix it before requesting review. Do not waste reviewer time on issues automation can catch.

### Large PR Protocol

When a PR exceeds 400 lines:

1. Flag the size in the review header: "Diff is 800 lines. Review focused on critical path: auth flow and payment processing."
2. Explicitly state what was NOT reviewed: "Skipped: CSS changes, test data fixtures, logging config."
3. Recommend splitting: "This PR should be split: (a) backend API changes, (b) frontend integration, (c) schema migration."
4. If the PR cannot be split, prioritize review by risk: most complex logic first, most security-sensitive first.

---

## Ecosystem & Tooling

### CI Integration

```yaml
# GitHub Actions: Automated review gate
name: code-review-gate
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - name: Check coverage threshold
        run: |
          $coverage = (Get-Content coverage/coverage-summary.json | ConvertFrom-Json).total.lines.pct
          if ($coverage -lt 80) { throw "Coverage below 80%" }
      - name: Check for secrets
        run: npx secretlint "**/*"
```

### Review Tools

- **Reviewdog**: Automates review comment posting for linters and custom checks.
- **SonarQube / SonarCloud**: Static analysis with technical debt calculation.
- **CodeClimate**: Maintainability and test coverage metrics.
- **Snyk / Dependabot**: Dependency vulnerability scanning.
- **ESLint + plugins**: Language-specific linting for JS/TS.
- **Prettier**: Automatic formatting to eliminate style reviews.
- **Husky + lint-staged**: Pre-commit hooks for pre-review quality.

### Review Workflow Configuration

```json
// .github/CODEOWNERS
# Default reviewer
* @team/engineering

# Critical paths require senior review
src/auth/** @team/security-reviewers
src/payments/** @team/senior-engineers
src/db/migrations/** @team/db-admin

# Documentation
docs/** @team/tech-writers
```

---

## Rules

1. Every finding includes exact file and line number. No vague feedback.
2. Severity: [MUST] = blocks merge, [SHOULD] = best practice, [CONSIDER] = suggestion.
3. At least one positive observation per 3 critical findings.
4. Never rewrite code. Describe the problem and suggested approach.
5. One pass = complete. No multi-pass reviews on the same diff.
6. Diffs > 400 lines: focus on critical files, flag size issue.
7. Do not raise style issues unless they violate established conventions.
8. Generated code, third-party code, and config are not reviewed unless they affect correctness.
9. Each finding is independently actionable.
10. Performance findings include measurable impact estimate.
11. [MUST] only for correctness bugs, security vulnerabilities, or contract violations.
12. Deleted code is not reviewed unless it indicates a misunderstanding.
13. If the same issue appears in N files, raise once with N locations.
14. Do not review formatting if a formatter is configured. Refer the author to the formatter.
15. If the PR has no tests for new logic: [MUST] "Add tests covering the new behavior."

---

## Output Format

```
## Code Review: {file/scope}

### [MUST] {short title}
- **File**: `src/path/file.ts:42`
- **Issue**: {what's wrong}
- **Why**: {impact of the issue}
- **Fix**: {suggested approach}

### [SHOULD] {short title}
...

### [CONSIDER] {short title}
...

### Positive
- {what's done well}
```

---

## References

- `references/code-review-advanced.md` -- Code Review Advanced Topics
- `references/code-review-fundamentals.md` -- Code Review Fundamentals
- `references/review-checklist.md` -- Code Review Checklist
- `references/review-workflow.md` -- Code Review Workflow
- `references/security-review-checklist.md` -- Security Review Checklist
- `references/security-review-guide.md` -- Security Review Guide
- `references/code-review-checklist.md` -- Comprehensive Code Review Checklist
- `references/code-review-workflow-automation.md` -- Code Review Workflow and Automation

## Handoff

After completing this skill:
- Next skill: debugging-strategy -- if issues found need deeper investigation.
- Pass context: review findings, files reviewed, severity levels.

Compression footer: code-review/v1.1 | sections: protocol, architecture, workflow, rules, pitfalls, comparisons, performance, ecosystem.
