# PR Writer Advanced

## Overview
Advanced PR writing covers multi-PR feature management, dependency handling, automated PR descriptions, changelog integration, and large-scale refactoring PR coordination.

## Advanced Concepts

### Concept 1: Feature Breakdown Strategy
Split features into logical PRs in dependency order: API schema → backend implementation → database migration → frontend → integration tests. Each PR independently merges and deploys. Use feature flags to gate incomplete work.

### Concept 2: Dependency Management
Cross-PR dependencies: label dependency chain (depends-on: #123, blocks: #124). Stacked PRs with gh stack or graphite. CI should only run on PRs whose dependencies are merged. Merge queue for ordered PR merges.

### Concept 3: Automated PR Descriptions
AI-generated PR descriptions from diff: analyze changes → categorize by type → draft summary. Include motivation (why), approach (how), and testing notes. AI should suggest but not replace human review. Train on team's prior PRs for style consistency.

### Concept 4: Changelog-Driven PRs
PR title → changelog entry automatically. Types map to changelog sections (feat → Added, fix → Fixed, perf → Changed). Breaking change emphasis. PR body supplements with migration notes. Generated changelog in release CI reads PR titles.

### Concept 5: Large Refactoring PRs
Refactoring PRs follow rename-remove-add pattern. First PR: add new code alongside old (parallel). Second PR: migrate usage. Third PR: remove old code. Provide migration scripts. Use codemods. Commit message links to companion PRs.

## Advanced Techniques

### Feature Split DAG
```
PR #1: Database schema (migration only)
    ↓
PR #2: Backend API (new endpoints, feature-flagged)
    ↓
PR #3: Frontend components (feature-flagged)
    ↓
PR #4: Enable feature (remove flag, integration tests)
```

### AI PR Description Prompt
```
Given the following diff, generate a PR description with:
1. Summary of changes
2. Motivation
3. Key implementation details
4. Testing approach
5. Migration notes (if any)
Be concise and use conventional commit format.
```

## Anti-Patterns

- Breaking dependencies across PRs (CI can't merge individually)
- AI descriptions without human review (hallucinated context)
- Refactoring and feature in same PR (can't revert independently)
- No feature flag for multi-PR features (half-deployed on merge)
- Missing migration notes in refactoring PRs
- PR title that doesn't match changelog entry (inconsistent)
- No dependency labels (reviewers don't know merge order)
- Squash merge loses atomic commits (hard to revert partial work)
