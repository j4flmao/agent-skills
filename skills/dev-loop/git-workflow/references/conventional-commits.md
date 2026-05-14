# Conventional Commits Specification

## Format
```
<type>(<scope>): <description>

<body>

<footer>
```

## Types

| Type | Usage | Release Impact |
|------|-------|----------------|
| `feat` | A new feature | MINOR |
| `fix` | A bug fix | PATCH |
| `docs` | Documentation only | PATCH |
| `style` | Formatting, whitespace (no behavior change) | NONE |
| `refactor` | Code restructuring (no behavior change) | NONE |
| `perf` | Performance improvement | PATCH |
| `test` | Adding or fixing tests | NONE |
| `chore` | Build process, tooling, dependencies | NONE |
| `ci` | CI/CD configuration | NONE |
| `build` | Build system or external dependency changes | NONE |

## Scope

Optional noun describing the module affected. Use the module/component name:

```
feat(auth): add refresh token rotation
fix(payment): handle stripe timeout
refactor(cart): extract discount logic
```

## Body

Explain WHY the change was made, not WHAT. Wrap at 72 characters.

```
feat(api): add pagination to user list endpoint

The user list was returning all users at once, causing timeout
for organizations with >10k users. Added cursor-based pagination
with configurable page size (default 25, max 100).
```

## Footer

### Breaking Changes
Use `BREAKING CHANGE:` or append `!` after type/scope:

```
feat(api)!: change response envelope format

BREAKING CHANGE: Response envelope changed from { data, meta }
to { data, status, timestamp, requestId }.
```

### Issue References
```
Closes #123
Refs #456
```

## Rules
- Subject: imperative mood, no period, < 72 chars
- Body: wrap at 72 chars, explain WHY
- One logical change per commit
- Breaking change in subject line: use `!` after type/scope
