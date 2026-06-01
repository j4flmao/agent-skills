---
name: dev-loop-changelog-generator
description: >
  Use when the user asks about generating changelogs, release notes, conventional commits to changelogs, automated release notes, or CHANGELOG.md management. Do NOT use for: git commit messages (dev-loop-git-workflow), or code review (dev-loop-code-review).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, changelog, release-notes, conventional-commits]
---

# Changelog Generator

## Purpose
Generate structured, human-readable changelogs and release notes from conventional commit history, GitHub release data, or JIRA release versions. Automated changelogs reduce manual release effort, enforce consistent formatting, and provide clear communication to users and stakeholders.

## Agent Protocol

### Trigger
Exact user phrases: "generate changelog", "release notes", "conventional changelog", "CHANGELOG.md", "auto-changelog", "git-cliff", "standard-version", "release-please", "semantic-release", "generate release notes".

### Input Context
- Commit message convention (Conventional Commits, Angular convention, custom)
- Output format (Keep a Changelog, custom Markdown, GitHub release, Slack message)
- Tool preference (git-cliff, standard-version, release-please, semantic-release, auto-changelog)
- Source of truth (git log, GitHub releases, JIRA)
- Release cadence (continuous delivery, scheduled releases, hotfixes)
- Versioning strategy (semver, calver, date-based, custom)
- Monorepo structure (single changelog vs per-package)

### Output Artifact
Generated CHANGELOG.md or release notes document with categorized, versioned entries.

### Completion Criteria
- [ ] Tool selected and configured
- [ ] Conventional commit convention established
- [ ] Parsing rules defined (commit scopes, types, breaking changes)
- [ ] Changelog generated for current version
- [ ] Unreleased section included for upcoming changes
- [ ] Breaking changes highlighted prominently
- [ ] Links to commits, issues, PRs included
- [ ] Per-package changelogs (if monorepo)
- [ ] CI automated generation configured
- [ ] Version bump integrated with changelog

### Max Response Length
200 lines.

## Framework/Methodology

### Changelog Tool Decision Tree
```
What is the project setup?
├── Single package, standard git → git-cliff
│   Configurable, TOML config, conventional commits
├── Monorepo (lerna, nx, turborepo) → release-please
│   Per-package changelogs, GitHub releases, PR-based
├── npm package, simple → standard-version
│   npm-aware, version bump + changelog + tag
├── Full CI/CD pipeline → semantic-release
│   Automated release from CI, npm/GitHub/GCR publish
└── Custom needs → custom script with conventional-changelog
    Flexible, integrate with any workflow
```

### Conventional Commit Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- **feat**: A new feature (triggers minor version bump)
- **fix**: A bug fix (triggers patch version bump)
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semicolons)
- **refactor**: Code refactoring (neither fix nor feature)
- **perf**: Performance improvement
- **test**: Adding or correcting tests
- **chore**: Maintenance, build, dependencies
- **ci**: CI/CD configuration changes
- **build**: Build system changes

Breaking changes: Append `!` after type/scope or add `BREAKING CHANGE:` in footer (triggers major version bump).

## Workflow

### Step 1: Configure git-cliff

```toml
# cliff.toml
[remote.github]
owner = "myorg"
repo = "myapp"

[changelog]
header = "# Changelog\n\nAll notable changes to this project will be documented in this file.\n"
body = """
{% for group, commits in commits | group_by(attribute="group") %}
  ### {{ group | upper_first }}
  {% for commit in commits %}
    - {% if commit.scope %}**{{ commit.scope }}:** {% endif %}{{ commit.message | upper_first }}
      {% if commit.breaking %}[**breaking**]{% endif %}
  {% endfor %}
{% endfor %}
"""
trim = true
postprocess = """
sed -i 's/- \[**breaking**\]/⚠️ **BREAKING CHANGE:**/' CHANGELOG.md
"""

[git]
conventional_commits = true
commit_preprocessors = [
  { pattern = "\\(#(\\d+)\\)", replace = "([#${1}](https://github.com/myorg/myapp/pull/${1}))" },
]

# Group definitions
[[git.parsers]]
message = "^feat"
group = "Features"

[[git.parsers]]
message = "^fix"
group = "Bug Fixes"

[[git.parsers]]
message = "^perf"
group = "Performance"

[[git.parsers]]
message = "^refactor"
group = "Refactoring"

[[git.parsers]]
message = "^docs"
group = "Documentation"

[[git.parsers]]
message = "^test"
group = "Tests"

[[git.parsers]]
message = ".*"
group = "Other"
```

### Step 2: Generate Changelog

```bash
# git-cliff: generate from last tag to HEAD
git cliff -o CHANGELOG.md

# Generate for specific tag range
git cliff --tag 1.0.0..HEAD -o CHANGELOG.md

# Preview unreleased changes
git cliff --unreleased -o CHANGELOG.md

# Unreleased with specific date
git cliff --unreleased --date-strategy "current"
```

### Step 3: Manual Changelog Structure (Keep a Changelog)

```markdown
# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature description ([#42](https://github.com/org/repo/pull/42))

### Changed
- Updated dependency from v1 to v2

### Fixed
- Bug fix description ([#41](https://github.com/org/repo/pull/41))

## [2.0.0] - 2026-05-15

### ⚠️ BREAKING CHANGES
- Removed deprecated `/old-endpoint` API. Use `/new-endpoint` instead.
- Minimum Node.js version raised to 18.

### Added
- New dashboard component with real-time updates
- Dark mode support for all pages

### Fixed
- Memory leak in websocket connection
- Incorrect sorting in data table

[2.0.0]: https://github.com/org/repo/releases/tag/v2.0.0
```

### Step 4: CI Automation

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        uses: orhun/git-cliff-action@v3
        with:
          config: cliff.toml
          args: --latest --output CHANGELOG.md

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          body_path: CHANGELOG.md
          generate_release_notes: true
```

### Step 5: Monorepo Changelogs with release-please

```yaml
# .github/workflows/release-please.yml
name: Release Please
on:
  push:
    branches: [main]

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          release-type: node
          monorepo-tags: true
          packages:
            packages/core: {}
            packages/cli: {}
            packages/ui: {}
```

### Step 6: Changelog with Custom Sections

```typescript
// scripts/generate-changelog.ts
import conventionalChangelog from 'conventional-changelog';
import { writeFileSync } from 'fs';

const config: conventionalChangelog.Options = {
  preset: {
    name: 'conventionalcommits',
    types: [
      { type: 'feat', section: '🚀 Features' },
      { type: 'fix', section: '🐛 Bug Fixes' },
      { type: 'perf', section: '⚡ Performance' },
      { type: 'refactor', section: '♻️ Refactoring' },
      { type: 'docs', section: '📚 Documentation' },
      { type: 'test', section: '✅ Tests' },
      { type: 'chore', section: '🔧 Chores' },
      { type: 'ci', section: '👷 CI/CD' },
    ],
  },
  releaseCount: 10,
  outputUnreleased: true,
  lernaPackage: null,
};

conventionalChangelog(config)
  .pipe(process.stdout)
  .on('data', (chunk: Buffer) => {
    writeFileSync('CHANGELOG.md', chunk.toString());
  });
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Non-conventional commits | Commits that don't match patterns are skipped | Enforce commitlint in CI, educate team |
| No version tags | Tool can't find previous release to diff from | Always tag releases with v-prefix semver |
| Monorepo tag collision | Multiple packages creating same tag | Use package-scoped tags: pkg@1.0.0 |
| Breaking changes buried | Users miss critical upgrade info | BREAKING CHANGE: in commit footer always |
| Changelog in wrong format | Doesn't follow Keep a Changelog | Validate with changelog-lint |
| Generated file committed stale | Outdated if generated manually | CI enforces fresh generation on release |
| Ignoring dependencies | Dependency updates need visibility | Group dep updates in "Dependencies" section |
| No unreleased section | Changes between releases are invisible | Always keep Unreleased section up to date |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Follow Conventional Commits | Automated tooling can parse reliably |
| Keep a Changelog format | Industry standard, human-parseable |
| Always include Unreleased section | Transparency, makes release prep trivial |
| Highlight breaking changes prominently | Users need to know before upgrading |
| Link to PRs/issues | Traceability from changelog to source |
| Group by type | Users scan for "Features" or "Bug Fixes" |
| Generate at release time, not per-commit | One consistent document per version |
| Pin tool version | Avoid unexpected formatting changes |
| Include migration notes for breaking changes | Reduced support burden |
| Automate in CI | Manual changelogs get skipped or stale |
| Validate commit messages with commitlint | Catch non-conventional commits before merge |

## Templates

### Keep a Changelog Template
```markdown
# Changelog

## [Unreleased]

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

## [MAJOR.MINOR.PATCH] - YYYY-MM-DD

[MAJOR.MINOR.PATCH]: https://github.com/org/repo/releases/tag/vMAJOR.MINOR.PATCH
```

### Release Notes Template (PR-based)
```markdown
## v1.2.0 (June 1, 2026)

### Highlights
- [Summary of major changes this release]

### New Features
- #143: Add dark mode support
- #142: Export data as CSV

### Bug Fixes
- #140: Fix memory leak in WebSocket connection
- #139: Correct sort order in data table

### Breaking Changes
- #141: Remove deprecated v1 API endpoints (migration guide: [link])

### Contributors
- @user1, @user2
```

## References
  - references/changelog-generator-advanced.md — Changelog Generator Advanced Topics
  - references/changelog-generator-fundamentals.md — Changelog Generator Fundamentals
  - references/conventional-commits.md — Conventional Commits Reference
  - references/release-workflow.md — Release Workflow Reference
## Handoff
Hand off to `dev-loop-git-workflow` for version tagging strategy. Hand off to `dev-loop-code-review` for PR-based changelog entries.
