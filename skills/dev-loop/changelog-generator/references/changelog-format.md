# Changelog Format Reference

## Keep a Changelog Structure

```markdown
# Changelog

## [Unreleased]
### Added
### Changed
### Fixed
### Removed

## [1.2.0] - 2026-05-14
### Added
### Changed
### Fixed

[Unreleased]: https://github.com/org/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/org/repo/compare/v1.1.0...v1.2.0
```

## Conventional Commit to Changelog Mapping

| Commit Type | Changelog Section |
|-------------|-------------------|
| `feat` | Added |
| `fix` | Fixed |
| `refactor` | Changed |
| `perf` | Changed |
| `docs` | omit (or Changed if significant) |
| `test` | omit |
| `chore` | omit |
| `style` | omit |
| `BREAKING CHANGE` | ⚠️ BREAKING (always at top) |

## Versioning Rules

- MAJOR (1.x.x): Breaking changes, incompatible API changes
- MINOR (x.1.x): New features, backwards-compatible
- PATCH (x.x.1): Bug fixes, backwards-compatible

Format: `[MAJOR.MINOR.PATCH] - YYYY-MM-DD`

## Entry Format

```
- {type}({scope}): {description} (#{PR/issue number})
```

Examples:
```
- feat(auth): add refresh token rotation (#123)
- fix(api): handle null user in /me endpoint (#121)
- refactor(payment): extract payment service (#118)
```

## Section Ordering

Within each section, sort by importance:
1. Security-related entries first
2. User-facing changes before internal
3. Larger scope before smaller scope

## BREAKING CHANGES Format

```
### ⚠️ BREAKING

- feat(api): change response envelope format

  Migration: Update response parsers to handle new envelope structure.
  Old: `{ data: ... }`  New: `{ result: ..., meta: {...} }`
```

## File Location

`CHANGELOG.md` at project root. Newest version at the top.

## Validation Checklist

- [ ] Version follows semver
- [ ] Date is correct ISO 8601 (YYYY-MM-DD)
- [ ] Every commit type maps to correct section
- [ ] BREAKING CHANGES at the top with migration notes
- [ ] PR/issue numbers included
- [ ] No duplicate entries
- [ ] No chore/test/style commits included
