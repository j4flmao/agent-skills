---
name: changelog-generator
description: >
  Use this skill when the user says 'generate changelog', 'CHANGELOG', 'release
  notes', 'what changed in this release', 'commit history to changelog', or wants
  to produce a changelog from git history. Covers: extracting commits via git log,
  grouping by conventional commit type, formatting per Keep a Changelog spec, and
  appending to CHANGELOG.md. Works with any project using conventional commits.
  Do NOT use this for: writing commit messages, generating PR descriptions, or
  README documentation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, documentation, phase-4]
---

# Changelog Generator

## Purpose
Generate a well-structured CHANGELOG.md from git commit history following the Keep a Changelog format.

## Agent Protocol

### Trigger
Exact user phrases: "generate changelog", "CHANGELOG", "release notes", "what changed in this release", "commit history to changelog".

### Input Context
Before activating, verify:
- The git history range is known (from tag, date, or commit range).
- The project uses conventional commits (or manual summarization is needed).

### Output Artifact
Appends to `CHANGELOG.md` in Keep a Changelog format.

### Response Format
Append to `CHANGELOG.md` in Keep a Changelog format.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of Keep a Changelog format.

### Completion Criteria
This skill is complete when:
- [ ] Commits are collected from the specified range.
- [ ] Commits are grouped by type (Added, Fixed, Changed, BREAKING).
- [ ] Entries are sorted by importance within each section.
- [ ] BREAKING CHANGES are at the top with migration notes.
- [ ] PR/issue numbers are included for traceability.

### Max Response Length
Direct append to file. No response text.

## Quick Start
Get commits since last release with `git log`. Group by conventional commit type. Format per Keep a Changelog. Append to CHANGELOG.md.

## When to Use This Skill
- Preparing a release
- User asks to generate changelog
- Creating release notes
- Updating project documentation before release

## Core Workflow

### Step 1: Get Commits
```bash
# From last tag
git log --oneline {last-tag}..HEAD

# From a specific date
git log --oneline --since="2026-01-01"

# With conventional commit parsing
git log --format="%s%n%b" {from}..{to}
```

### Step 2: Group by Type
| Type | Changelog Section |
|------|-------------------|
| `feat` | **Added** |
| `fix` | **Fixed** |
| `refactor` | **Changed** |
| `perf` | **Changed** |
| `docs` | — (omit, or include under Changed) |
| `test` | — (omit) |
| `chore` | — (omit) |
| `style` | — (omit) |
| `BREAKING CHANGE` | **⚠️ BREAKING** (always at top) |

### Step 3: Format per Keep a Changelog
```markdown
# Changelog

## [1.2.0] - 2026-05-14

### Added
- feat(auth): add refresh token rotation (#123)
- feat(api): add bulk user import endpoint (#124)

### Fixed
- fix(api): handle null user in /me endpoint (#121)
- fix(db): correct index name in migration V4 (#119)

### Changed
- refactor(payment): extract payment service from order module (#118)
- perf(api): optimize user list query with eager loading (#120)

### ⚠️ BREAKING
- feat(api): change response envelope format (#122)
```

### Step 4: Append to CHANGELOG.md
Insert the new version section at the top of the file, under `# Changelog`.

## Rules & Constraints
- Only include meaningful entries — skip chore, test, style commits
- Sort entries within each section by importance (not chronologically)
- Format: `- {type}({scope}): {description} (#{PR/issue number})`
- BREAKING CHANGES always at the top, with migration notes
- If the project doesn't use conventional commits, summarize changes manually
- Include PR/issue references for traceability

## Output Format
Append to `CHANGELOG.md` in Keep a Changelog format.

## References
  - references/auto-changelog-tools.md — Automatic Changelog Tools
  - references/changelog-format.md — Changelog Format Reference
  - references/changelog-generator-advanced.md — Changelog Generator Advanced Topics
  - references/changelog-generator-fundamentals.md — Changelog Generator Fundamentals
  - references/conventional-commits-guide.md — Conventional Commits Guide
  - references/git-log-parsing.md — Git Log Parsing Reference
## Handoff
After completing this skill:
- Next skill: **readme-writer** — if the release needs updated project documentation
- Pass context: changelog entries, version number, release date
