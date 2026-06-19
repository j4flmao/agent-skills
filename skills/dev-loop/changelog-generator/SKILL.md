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

## Implementation Patterns

### Changelog Generator (Python)

```python
import subprocess
import re
from typing import List, Dict, Optional
from datetime import datetime

class ChangelogGenerator:
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
        self.commit_types = {
            "feat": "Features",
            "fix": "Bug Fixes",
            "docs": "Documentation",
            "refactor": "Refactoring",
            "perf": "Performance Improvements",
            "test": "Tests",
            "chore": "Chores",
            "ci": "CI/CD",
        }

    def generate_from_tags(self, from_tag: Optional[str] = None, to_ref: str = "HEAD") -> str:
        if not from_tag:
            tags = self._get_tags()
            if len(tags) < 1:
                tag1 = self._get_initial_commit()
                tag2 = None
                if not tag1:
                    return "No tags or commits found."
            else:
                tag1 = tags[-1] if len(tags) > 0 else None
                tag2 = tags[-2] if len(tags) > 1 else None
        else:
            tag1 = from_tag
            tag2 = None

        scope = f"{tag2}..{tag1}" if tag2 else tag1 if tag1 else to_ref
        commits = self._get_commits(scope)

        if not commits and tag1:
            commits = self._get_commits(tag1)

        return self._format_changelog(tag1 or "Unreleased", commits)

    def _get_tags(self) -> List[str]:
        try:
            result = subprocess.run(
                ["git", "tag", "--sort=-creatordate"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            tags = [t.strip() for t in result.stdout.split("\n") if t.strip()]
            return [t for t in tags if re.match(r"^v?\d+\.\d+\.\d+", t)]
        except subprocess.CalledProcessError:
            return []

    def _get_initial_commit(self) -> Optional[str]:
        try:
            result = subprocess.run(
                ["git", "rev-list", "--max-parents=0", "HEAD"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            return result.stdout.strip() or None
        except subprocess.CalledProcessError:
            return None

    def _get_commits(self, scope: str) -> List[Dict]:
        try:
            result = subprocess.run(
                ["git", "log", scope, "--oneline", "--format=%H|%s|%an|%ad", "--date=short"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            commits = []
            for line in result.stdout.strip().split("\n"):
                if not line:
                    continue
                parts = line.split("|", 3)
                if len(parts) < 2:
                    continue
                hash_val = parts[0][:7]
                msg = parts[1]
                author = parts[2] if len(parts) > 2 else ""
                date = parts[3] if len(parts) > 3 else ""

                parsed = self._parse_conventional_commit(msg)
                commits.append({
                    "hash": hash_val,
                    "message": msg,
                    "raw_message": parsed["message"],
                    "type": parsed["type"],
                    "scope": parsed["scope"],
                    "breaking": parsed["breaking"],
                    "author": author,
                    "date": date,
                })
            return commits
        except subprocess.CalledProcessError:
            return []

    def _parse_conventional_commit(self, message: str) -> Dict:
        pattern = r"^(feat|fix|docs|refactor|perf|test|chore|ci|build|style|revert)(\((.+?)\))?(!)?:\s*(.+)"
        match = re.match(pattern, message)
        if match:
            return {
                "type": match.group(1),
                "scope": match.group(3),
                "breaking": match.group(4) == "!" or "BREAKING CHANGE" in message,
                "message": match.group(5),
            }
        return {"type": "other", "scope": None, "breaking": False, "message": message}

    def _format_changelog(self, version: str, commits: List[Dict]) -> str:
        grouped = {}
        for c in commits:
            ctype = c["type"]
            section = self.commit_types.get(ctype, "Other")
            if c["breaking"]:
                section = "Breaking Changes"
            if section not in grouped:
                grouped[section] = []
            grouped[section].append(c)

        section_order = ["Breaking Changes", "Features", "Bug Fixes", "Performance Improvements",
                         "Refactoring", "Documentation", "Tests", "CI/CD", "Chores", "Other"]

        date_str = datetime.now().strftime("%Y-%m-%d")
        lines = [f"## [{version}] - {date_str}\n"]

        for section in section_order:
            if section in grouped and grouped[section]:
                lines.append(f"### {section}")
                for c in grouped[section]:
                    scope = f"**{c['scope']}:** " if c["scope"] else ""
                    lines.append(f"- {scope}{c['raw_message']} ({c['hash']})")
                lines.append("")

        if not any(c["breaking"] for c in commits):
            pass

        return "\n".join(lines)

    def generate_unreleased(self) -> str:
        try:
            result = subprocess.run(
                ["git", "describe", "--tags", "--abbrev=0"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            latest_tag = result.stdout.strip() if result.returncode == 0 else None
        except subprocess.CalledProcessError:
            latest_tag = None

        return self.generate_from_tags(from_tag=latest_tag)
```

## Architecture Decision Trees

### Version Bump Strategy

```
Given the commits since last release:
├── Has any commit with BREAKING CHANGE or feat!
│   └── MAJOR bump (1.0.0 → 2.0.0)
│       └── Update all consumers for breaking API changes
│
├── Has any commit with feat (and no breaking)
│   └── MINOR bump (1.0.0 → 1.1.0)
│       └── New features, backward compatible
│
├── Has any commit with fix, perf, refactor
│   └── PATCH bump (1.0.0 → 1.0.1)
│       └── Bug fixes, performance improvements
│
├── Has only docs, test, chore, ci
│   └── No version bump needed (or PATCH if desired)
│       └── No user-facing changes
│
└── Pre-release (before stable 1.0.0)
    └── Use 0.x.y — no automated semver, manual decision
```

### Changelog Section Selection

```
What type is the commit?
├── feat → "Features" section
├── fix → "Bug Fixes" section
├── perf → "Performance Improvements" section
├── refactor → "Refactoring" section
├── docs → "Documentation" section
├── test → "Tests" section
├── chore → "Chores" section
├── ci → "CI/CD" section
├── BREAKING CHANGE → "Breaking Changes" section
└── anything else → "Other" section
```

## Production Considerations

- **Release automation pipeline**: Generate changelog automatically as part of the release CI pipeline. Tag the release commit, generate changelog, create GitHub Release with changelog content. Never manual.
- **Changelog linting**: Validate changelog format in CI using `changelog-lint` or similar. Ensure all required sections exist. Verify links to releases are valid.
- **Monorepo changelogs**: Use package-scoped changelogs (one per package) plus an overall monorepo changelog. Tools like `lerna-changelog` or `changesets` handle this well.
- **Dependency update visibility**: Group automated dependency updates (Dependabot, Renovate) into a "Dependencies" section. Prevents noise from hiding in "Chores" or "Other".

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Manual changelog writing | Gets skipped or outdated | Auto-generate from commits |
| Only changelog at release | Users want to see what's coming | Always maintain Unreleased section |
| No version tags | Can't generate diff-based changelog | Git tag every release with semver |
| Ignoring Conventional Commits | Changelog is a mess of random messages | Enforce commit convention in CI |
| Single changelog for monorepo | Hard to see per-package changes | Per-package changelogs + summary |
| Breaking changes not highlighted | Users upgrade and things break | Breaking changes as first section |
| No migration notes | Users don't know how to migrate | Include migration guide for breaking changes |
| Stale generated file | Doesn't reflect current state | Generate on CI, not committed manually |

## Performance Optimization

- **Limit commit history depth**: When generating changelog for large repos, limit to last 1000 commits. Use `git log --max-count=1000` to avoid slow full-history traversal.
- **Cache tag-to-commit mapping**: Cache the tag-to-commit hash mapping. Avoids repeated git operations when rendering multiple changelogs (e.g., per-package in monorepo).
- **Incremental generation**: Only process commits since the last generated changelog entry. Append new entries at the top of the Unreleased section.
- **Parallel monorepo generation**: Generate per-package changelogs in parallel. Use a thread pool for repos with 10+ packages. Recombine into a summary changelog.
