# Pull Request Templates

## Standard PR Template

### GitHub Pull Request Template

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->

## Description

<!-- Briefly describe what this PR does and why it's needed -->

Fixes #(issue)

## Type of Change

- [ ] feat: New feature (non-breaking)
- [ ] fix: Bug fix (non-breaking)
- [ ] refactor: Code restructuring (no behavior change)
- [ ] perf: Performance improvement
- [ ] chore: Tooling, CI, dependencies
- [ ] test: Adding or fixing tests
- [ ] docs: Documentation only
- [ ] BREAKING CHANGE: Major version change

## Testing

<!-- Describe how you tested these changes -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All tests pass locally

## Edge Cases Covered

- Empty state
- Error state
- Null/undefined inputs
- Concurrent access
- Pagination boundaries

## Checklist

- [ ] Code follows project style and conventions
- [ ] Self-review of changes completed
- [ ] No linting or type errors
- [ ] Documentation updated (if applicable)
- [ ] API changes reflected in OpenAPI spec
- [ ] Migration scripts added (if schema change)
- [ ] Performance impact assessed
- [ ] Security considerations addressed

## Screenshots

<!-- If UI changes, include before/after screenshots -->

## Additional Context

<!-- Any other information reviewers should know -->
```

### GitLab Merge Request Template

```markdown
<!-- .gitlab/merge_request_templates/default.md -->

## Summary

<!-- Summarize the changes in 1-3 sentences -->

## Related Issues

Closes #(issue)

## Changes

<!-- List the key changes grouped by type -->

### Features
- {feature}: {one-line description}

### Bug Fixes
- {fix}: {one-line description}

## How to Test

1. Checkout this branch
2. Run `npm install`
3. Run `npm test`
4. Verify {specific behavior}

## MR Checklist

- [ ] Code compiles without errors
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] Code reviewed by at least one teammate
- [ ] No merge conflicts with target branch
- [ ] No secrets or credentials committed

## Breaking Changes

<!-- If there are breaking changes, describe migration path -->

## Performance Considerations

<!-- Any performance impact notes -->
```

## Feature PR Template

```markdown
<!-- Use for new feature PRs -->

## Feature: {Feature Name}

### Problem
<!-- What problem does this feature solve? -->

### Solution
<!-- How does this implementation solve the problem? -->

### Usage
```typescript
// Example of how to use the new feature
const result = newFeature({ option: 'value' })
```

### Configuration
<!-- Any new environment variables, config options, or feature flags -->

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FEATURE_FLAG` | No | false | Enables the new feature |
| `NEW_SETTING` | Yes | — | Configures {purpose} |

### Migration
<!-- Steps to migrate if schema/data changes -->
```

## Bug Fix PR Template

```markdown
## Bug Fix: {Short Description}

### Current Behavior
<!-- What currently happens -->

### Expected Behavior  
<!-- What should happen instead -->

### Root Cause
<!-- What was causing the bug -->

### Fix
<!-- How the fix addresses the root cause -->

### Reproduction Steps
1. Go to {page/endpoint}
2. Perform {action}
3. See {error}

### Regression Risk
- [ ] Low — isolated change, well-tested
- [ ] Medium — touches shared logic
- [ ] High — core infrastructure change

### Verification
- [ ] Bug reproduction case passes
- [ ] Regression test added
- [ ] Existing tests still pass
```

## Chore / Refactor PR Template

```markdown
## Refactor: {Scope}

### Motivation
<!-- Why is this refactoring needed? -->

### Approach
<!-- How was the refactoring applied? -->

### Before/After Comparison

**Before:**
```typescript
// Old approach
```

**After:**
```typescript
// New approach
```

### Verification
- [ ] All existing tests pass (behavior preserved)
- [ ] No new behavior introduced
- [ ] Test coverage maintained

### Files Changed
<!-- List key files and what changed in each -->
- `path/to/file.ts`: Extracted helper function
- `path/to/another.ts`: Renamed method for clarity
```

## Release PR Template

```markdown
# Release v{version}

## Changelog

### Added
- {feature descriptions}

### Fixed
- {bug fix descriptions}

### Changed
- {behavior changes}

### ⚠️ BREAKING CHANGES
- {breaking changes with migration notes}

## Version Bump
<!-- Which version was bumped and why -->
- [ ] Major — breaking changes
- [ ] Minor — new features, backward compatible
- [ ] Patch — bug fixes only

## Pre-Release Checklist

- [ ] All tests pass
- [ ] Changelog generated and reviewed
- [ ] Version bumped in {package.json, Cargo.toml, etc.}
- [ ] Release notes approved by product owner
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Monitoring dashboards checked
```

## Template Variables

```markdown
<!-- Environment variables for auto-population -->
PR_TITLE=$(git log --format="%s" HEAD~1..HEAD)
PR_AUTHOR=$(git config user.name)
PR_BRANCH=$(git rev-parse --abbrev-ref HEAD)
PR_COMMITS=$(git log --format="- %s (%an)" HEAD~$(git rev-list --count HEAD~1..HEAD)..HEAD)
PR_DIFF_STATS=$(git diff --stat HEAD~1..HEAD)
```

## Automating Templates

### GitHub CLI alias

```bash
# Create PR with template
gh pr create --template feature.md

# Custom template path
gh pr create --template .github/PR_TEMPLATES/feature.md
```

### git config

```bash
# Set default PR template
git config --global github.pr.template .github/PULL_REQUEST_TEMPLATE.md
```

## Template Best Practices

- **Keep templates concise** — reviewers scan, they don't read deeply
- **Use checklists** — improves completion rate for pre-merge tasks
- **Include testing notes** — reduces back-and-forth with reviewers
- **Link to issues** — every PR should reference the story or bug
- **Match branch strategy** — template sections should reflect actual workflow
- **Review quarterly** — templates drift as process changes
- **Remove unused sections** — don't make people delete template boilerplate
