# Changelog Generator Advanced

## Overview
Advanced changelog generation covers monorepo strategies, custom parsers, changelog visualization, integration with release pipelines, and multi-repo aggregation.

## Advanced Concepts

### Concept 1: Monorepo Changelog Strategies
Per-package tags: pkg-a@1.0.0, pkg-b@2.1.0. Tool configuration with workspace detection (Lerna, Nx, Turborepo). Generate per-package changelogs + aggregated root changelog. Use conventional-changelog-writer with workspace-aware plugins.

### Concept 2: Custom Conventional Commit Parsers
Extend commit parsing: custom types (i18n, a11y, deps, migration), multi-line scope (scope(component):), commit footers for issues/PRs, and Co-authored-by merge resolution. Custom parsers for non-standard commit formats.

### Concept 3: Changelog Visualization
HTML changelogs with diff view links, categorized sections with expand/collapse, version comparison timeline, and integration with GitHub Pages or documentation site. Rich rendering for external stakeholders.

### Concept 4: Pipeline Integration
Release automation: tag detection → commit aggregation → changelog generation → version bump → PR creation → automated release. GitHub Actions or GitLab CI with release drafter pattern. GPG-signed tags and checksum verification.

### Concept 5: Multi-Repo Aggregation
Aggregate changelogs from multiple repositories into a single release page: webhook trigger on release → fetch changelogs from each repo → merge by date → generate top-level summary with links. Version matrix for shared release dates.

## Advanced Techniques

### Monorepo Configuration (git-cliff)
```toml
[workspace]
members = ["packages/*"]
tag_pattern = "{member}@{version}"
```

### CI Release Pipeline
```yaml
release:
  steps:
    - git-cliff --bump --unreleased
    - npm version from-git
    - git tag v$(node -p "require('./package.json').version")
    - gh release create
```

## Anti-Patterns

- Monorepo tag collision (no package scope)
- Custom parser breaking on standard commits
- Changelog HTML not mobile-responsive
- Release artifacts not checksummed
- Multi-repo aggregation without deduplication
- Auto-release with no human approval gate
- Changelog not including security advisories
- Ignoring prefixed tags (v1.0.0 vs 1.0.0)
