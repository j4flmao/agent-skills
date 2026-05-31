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
version: "2.0.0"
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

## Architecture

### Changelog Generation Pipeline
```
Git History ──> Commit Parsing ──> Classification ──> Grouping ──> Formatting ──> Output
                                                                                    
git log           Parse          Conventional       Section       Keep a          Append to
--format="%s"     scope, type,   commit type        assignment     Changelog       CHANGELOG.md
                  breaking       → Added/Fixed/     Sort by        template with
                  indicator      Changed/BREAKING   importance     version header
```

### Decision Tree: Commit Classification
```
What is the conventional commit type?
├── feat → Added section
│   ├── BREAKING CHANGE footer → BREAKING CHANGES section (top)
│   └── No breaking change → Added section
├── fix → Fixed section
│   ├── BREAKING CHANGE footer → BREAKING CHANGES section (top)
│   └── No breaking change → Fixed section
├── refactor or perf → Changed section
├── docs → Changed section (only if user-facing; omit internal docs changes)
├── test or chore or style → Omit from changelog
│   └── Unless it's a notable infrastructure change → note under Changed
└── No conventional commit prefix
    → Manual summarization needed — group by theme
```

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
| `BREAKING CHANGE` | **BREAKING** (always at top) |

### Step 3: Sort by Importance Within Sections
Within each section, entries should be sorted by user impact, not chronologically:
1. User-facing changes first (features, bug fixes visible to end users)
2. API changes next (endpoint modifications, contract changes)
3. Developer experience changes last (build tooling, CI improvements)
Breaking changes at the top of the file with migration notes in a separate subsection.

### Step 4: Format per Keep a Changelog
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

### BREAKING
- feat(api): change response envelope format (#122)
  Migration: Update client parsers from `{data}` to `{results}`.
```

### Step 5: Append to CHANGELOG.md
Insert the new version section at the top of the file, under `# Changelog`. Keep the file in reverse chronological order so the latest release is always at the top. Validate the file renders correctly in the repository's markdown viewer.

### Step 6: Link to Compare URLs
For each release, add a comparison link at the bottom of the file: `[1.2.0]: https://github.com/owner/repo/compare/v1.1.0...v1.2.0`. This makes navigation between releases easy in the rendered markdown. Maintain a reference list of all version links at the bottom of the file.

### Step 7: Unreleased Section
Maintain an `[Unreleased]` section at the top of the changelog that accumulates changes between releases. When cutting a new release, rename `[Unreleased]` to the new version number and create a fresh `[Unreleased]` section. This pattern keeps the changelog always up-to-date rather than requiring a bulk generation at release time.

## Models

### Changelog Format Template
```markdown
# Changelog

## [Unreleased]

### Added
- (new features go here)

### Fixed
- (bug fixes go here)

### Changed
- (refactors, performance, dependency updates)

### BREAKING
- (breaking changes with migration notes)

## [1.2.0] - 2026-05-14

### Added
- ...

### Fixed
- ...

[Unreleased]: https://github.com/owner/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/owner/repo/compare/v1.1.0...v1.2.0
```

### Conventional Commit to Changelog Section Mapping
```
feat:        → Added         (new feature)
feat!:       → BREAKING      (breaking feature)
fix:         → Fixed         (bug fix)
fix!:        → BREAKING      (breaking fix)
refactor:    → Changed       (code restructure)
perf:        → Changed       (performance improvement)
docs:        → Changed       (documentation, if notable)
style:       → omitted       (formatting only)
test:        → omitted       (test changes)
chore:       → omitted       (tooling, CI, deps)
ci:          → Changed       (CI/CD changes, if notable)
build:       → Changed       (build system changes, if notable)
revert:      → Fixed         (reverting a previous change)
```

## Rules & Constraints
- Only include meaningful entries — skip chore, test, style commits
- Sort entries within each section by importance (not chronologically)
- Format: `- {type}({scope}): {description} (#{PR/issue number})`
- BREAKING CHANGES always at the top, with migration notes
- If the project doesn't use conventional commits, summarize changes manually
- Include PR/issue references for traceability
- Every release must have a date in ISO 8601 format (YYYY-MM-DD)
- Unreleased section must be maintained incrementally — not generated from scratch at release
- Compare URLs must be maintained at the bottom of the file for every version
- Entries should use imperative mood and present tense: "Add login endpoint" not "Added login endpoint"
- Group related entries under a common scope: multiple `feat(auth)` commits can be combined: `- feat(auth): add login, logout, and password reset`
- Security-related changes should be in their own `### Security` section for high-severity fixes

## Common Pitfalls

- **Chronological sorting within sections**: Entries sorted by commit date obscure the most important changes. Always sort by user impact and importance.
- **No migration notes for breaking changes**: Breaking changes without migration guidance leave downstream consumers stuck. Always include migration instructions.
- **Merge commits in the log**: `git log` includes merge commits by default. Use `--no-merges` flag to exclude them from the source extraction.
- **Missing compare links**: Without compare URLs, readers cannot navigate between releases. Maintain the link reference list at the bottom.
- **Inconsistent date format**: Mixing date formats (May 14 2026 vs 2026-05-14 vs 14/05/2026) breaks automated tooling. Always use ISO 8601.
- **Over-aggregating entries**: Combining too many changes into one entry loses detail. Each logical change should have its own entry.
- **Unreleased section drift**: If the unreleased section is not maintained during development, it requires a painful bulk recovery at release time.
- **Ignoring revert commits**: A revert of a previous feature is a notable change and should appear in the changelog, not be silently omitted.

## Compared With

| Tool | Input | Format | Automation Level |
|------|-------|--------|-----------------|
| git-cliff | Git log + config | Keep a Changelog, custom | Full CI automation |
| standard-version | Conventional commits | Keep a Changelog | Version bump + changelog |
| semantic-release | Conventional commits | Keep a Changelog | Full release pipeline |
| release-please | Conventional commits | Keep a Changelog | Google Cloud release automation |
| changelog-generator (manual) | Git log + manual edits | Keep a Changelog | Semi-automated |
| Auto (intuit) | Conventional commits | Keep a Changelog | CI-integrated |
| Conventional Changelog | Git log + conventional | Keep a Changelog | CLI-based generation |

## Performance

- Git log extraction: `git log --format="%s%n%b"` for 1000 commits completes in <500ms
- Commit parsing: 500 conventional commit messages parsed and classified in ~200ms
- Full changelog generation: from git log to formatted markdown, for a release with 50 commits, completes in <2 seconds
- File appending: adding a new version section to CHANGELOG.md is a constant-time operation
- CI integration: changelog generation adds <5 seconds to a CI pipeline for typical repositories
- Repository size impact: CHANGELOG.md files typically grow at 5-15KB per major release, remaining negligible compared to code size

## Tooling

| Tool | Category | Use Case |
|------|----------|----------|
| git-cliff | Changelog generation | Configurable, template-based generation |
| conventional-changelog-cli | Changelog generation | Standard conventional commit format |
| semantic-release | Release automation | Full release pipeline including changelog |
| standard-version | Version management | Version bump + changelog generation |
| release-please | PR-based releases | Automated release PRs with changelog |
| git log | History extraction | Raw commit extraction for parsing |
| jq / sed / awk | Text processing | Post-processing formatting adjustments |
| markdownlint | Format validation | Validate changelog markdown correctness |

## Output Format
Append to `CHANGELOG.md` in Keep a Changelog format.

## References
  - references/auto-changelog-tools.md — Automatic Changelog Tools
  - references/changelog-format.md — Changelog Format Reference
  - references/changelog-generator-advanced.md — Changelog Generator Advanced Topics
  - references/changelog-generator-fundamentals.md — Changelog Generator Fundamentals
  - references/conventional-commits-guide.md — Conventional Commits Guide
  - references/git-log-parsing.md — Git Log Parsing Reference
  - references/changelog-formatting-templates.md — Changelog Formatting and Templates
  - references/changelog-automation-ci.md — Changelog Automation and CI Integration
## Handoff
After completing this skill:
- Next skill: **readme-writer** — if the release needs updated project documentation
- Pass context: changelog entries, version number, release date
