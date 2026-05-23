# Conventional Commits Guide

## Specification

The Conventional Commits specification is a lightweight convention built on top of commit messages. It provides an easy set of rules for creating an explicit commit history.

```
<type>(<scope>): <description>

<body>

<footer>
```

## Types Reference

| Type | Description | Changelog Section | SemVer |
|------|-------------|-------------------|--------|
| `feat` | A new feature | Added | MINOR |
| `fix` | A bug fix | Fixed | PATCH |
| `feat!` or `fix!` | Breaking change | ⚠️ BREAKING | MAJOR |
| `refactor` | Code restructuring with no behavior change | Changed | — |
| `perf` | Performance improvement | Changed | PATCH |
| `docs` | Documentation only | — | — |
| `style` | Formatting, whitespace (no behavior change) | — | — |
| `test` | Adding or fixing tests | — | — |
| `chore` | Build process, tooling, dependencies | — | — |
| `ci` | CI/CD configuration | — | — |
| `build` | Build system or external dependency changes | — | — |
| `revert` | Revert a previous commit | Fixed | — |

## Scope Best Practices

Scope represents the module or component affected. Choose meaningful, consistent scopes:

```
# Good
feat(auth): add refresh token rotation
fix(payments): handle stripe declined card error
refactor(api): extract pagination middleware

# Avoid — too vague
feat(core): update logic
fix(misc): fix bug
```

### Scope naming conventions

- **Singular** — `feat(auth)` not `feat(auth-service)`
- **Kebab-case** — `feat(user-auth)` not `feat(UserAuth)`
- **Component/module name** — matches folder or package name
- **Consistent across commits** — same scope for same module

## Body Guidelines

The body provides additional context. Explain WHY, not WHAT:

```
feat(api): add pagination to user list endpoint

The user list endpoint returns all users at once, causing timeouts
for organizations with over 10,000 users. Added cursor-based
pagination with configurable page size (default 25, max 100).

Closes #342
```

### Body rules
- Blank line between subject and body
- Wrap at 72 characters
- Explain motivation, not implementation
- Reference issues: `Closes #123`, `Relates to #456`

## Breaking Changes

Two equivalent formats:

```
# Format 1: ! after type/scope
feat(api)!: change response envelope format

BREAKING CHANGE: Response now uses { data, meta } instead of flat fields

# Format 2: BREAKING CHANGE in footer
feat(api): change response envelope format

BREAKING CHANGE: Response now uses { data, meta } instead of flat fields
```

Breaking changes always go in the ⚠️ BREAKING section of the changelog with migration notes.

## Footer Formats

### Issue references
```
Closes #123
Fixes #456
Relates to #789
```

### Co-authored-by
```
Co-authored-by: Alice <alice@example.com>
Co-authored-by: Bob <bob@example.com>
```

### Reviewed-by
```
Reviewed-by: Carol <carol@example.com>
```

## Commit Message Anti-patterns

| Bad | Good |
|-----|------|
| `fixed a bug` | `fix(api): handle null user in /me endpoint` |
| `update stuff` | `refactor(cart): extract discount calculation` |
| `wip` | (squash before merge) |
| `fix(api): fix the bug where the users list was broken` | `fix(api): handle null user in /me endpoint` |
| `feat(auth): add login (WIP, not done)` | (one commit per complete change) |

## Tools for Conventional Commits

### commitlint

```bash
# Install
npm install -D @commitlint/config-conventional @commitlint/cli

# Configure
echo "module.exports = { extends: ['@commitlint/config-conventional'] }" > commitlint.config.js
```

### commitizen

```bash
# Install
npm install -D commitizen cz-conventional-changelog

# Configure package.json
echo '{ "config": { "commitizen": { "path": "cz-conventional-changelog" } } }' > .czrc

# Use
npx cz
```

### husky + lint-staged

```bash
npm install -D husky lint-staged
npx husky init
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

### git-cliff changelog

```toml
# cliff.toml
[changelog]
header = "# Changelog\n"
body = "{% for group, commits in commits | group_by(attribute=\"group\") %}\n### {{ group | upper_first }}\n{% for commit in commits %}\n- {{ commit.message }}\n{% endfor %}\n{% endfor %}"
```

## Parsing Conventional Commits

### Bash one-liner

```bash
# Group commits by type
git log --format="%s" {from}..{to} | grep -E '^(feat|fix|refactor|perf)' | sort
```

### Node.js

```typescript
function parseConventionalCommit(message: string) {
  const pattern = /^(?<type>\w+)(?:\((?<scope>.+?)\))?(?<breaking>!)?:\s*(?<description>.+)$/
  const match = message.match(pattern)
  if (!match) return null

  return {
    type: match.groups!.type,
    scope: match.groups!.scope || null,
    breaking: !!match.groups!.breaking,
    description: match.groups!.description,
  }
}
```

### Python

```python
import re

PATTERN = re.compile(r'^(?P<type>\w+)(?:\((?P<scope>.+?)\))?(?P<breaking>!)?:\s*(?P<description>.+)$')

def parse_commit(message: str) -> dict | None:
    match = PATTERN.match(message)
    if not match:
        return None
    return {
        'type': match.group('type'),
        'scope': match.group('scope'),
        'breaking': bool(match.group('breaking')),
        'description': match.group('description'),
    }
```
