# Changelog Generator Fundamentals

## Overview
Changelog generators create structured release notes from conventional commit history, enabling automated, consistent communication about what changed between releases.

## Core Concepts

### Concept 1: Conventional Commits
Structured commit format: `<type>(<scope>): <description>`. Types: feat (minor), fix (patch), docs, refactor, perf, test, chore. Breaking changes: append ! or add BREAKING CHANGE footer (major). This structure enables automated parsing.

### Concept 2: Tool Selection
git-cliff (Rust, configurable TOML), standard-version (npm, simple), release-please (monorepo, GitHub), semantic-release (full CI/CD), or conventional-changelog (customizable). Match tool to project complexity and workflow.

### Concept 3: Changelog Structure
Keep a Changelog format: version header with date, categorized sections (Added, Changed, Fixed, Removed, Deprecated, Security), breaking changes highlighted, and comparison links to previous versions. Include Unreleased section.

### Concept 4: Version Bumping
Semantic versioning from commits: fix → patch, feat → minor, BREAKING CHANGE → major. Tools automate version bump in package.json, crate, or project file. Tags created with v-prefixed version.

### Concept 5: CI Automation
Changelog generation should run in CI on release: analyze commits since last tag, group by type, generate markdown, and create GitHub/GitLab release. For monorepos, generate per-package changelogs.

## Best Practices

- Conventional Commits for all commits (tool-enabled)
- Keep a Changelog format (industry standard)
- Always include Unreleased section
- Highlight breaking changes prominently
- Link to PRs/issues for traceability
- Group entries by type
- Generate at release time (not per-commit)
- Pin changelog tool version
- Include migration notes for breaking changes

## Anti-Patterns

- Non-conventional commits (not parsed by tools)
- Missing version tags (no diff baseline)
- Monorepo tag collision (use package-scoped tags)
- Breaking changes buried in feature list
- Changelog format changes per release (inconsistent)
- Stale generated changelog (manual generation skipped)
- No Unreleased section (changes invisible until release)
- Ignoring dependency updates (need visibility)
