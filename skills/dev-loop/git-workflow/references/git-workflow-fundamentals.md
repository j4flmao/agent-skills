# Git Workflow Fundamentals

## Overview
A git workflow defines how team members collaborate using branches, commits, and PRs. The right workflow balances velocity, quality, and release management for the team's size and deployment cadence.

## Core Concepts

### Concept 1: Trunk-Based Development
Main branch (trunk) is always releasable. Short-lived feature branches (1-2 days). Frequent merges to trunk (multiple per day). Feature flags for incomplete work. Preferred by CI/CD teams; enables multiple daily deployments.

### Concept 2: GitHub Flow
PR-based workflow: branch from main → make changes → open PR → review → merge. Simple, single main/master branch. No release branches — deploy from main directly. Works for SaaS teams with continuous deployment.

### Concept 3: Conventional Commits
Structured commit messages: `<type>(<scope>): <description>`. Types: feat (minor), fix (patch), docs, refactor, perf, test, chore, ci, build. Breaking changes use ! after type or BREAKING CHANGE footer. Enables automated changelogs and version bumps.

### Concept 4: PR Best Practices
Small focused PRs (under 400 lines changed). Descriptive title following conventional commits. Description includes motivation, approach, and testing notes. Link to issue/ticket. Draft PRs for early feedback on architecture.

### Concept 5: Code Ownership and Review
CODEOWNERS file auto-requests review from relevant team members for path patterns. Required reviews (1-2) before merge. Branch protection rules: require status checks (CI passes), require up-to-date branch, dismiss stale reviews.

## Best Practices

- Short-lived branches (1-2 day lifetime)
- Conventional commits (consistent, parseable history)
- Small focused PRs (easier to review)
- Rebase before merge (linear history)
- Squash merge for feature branches
- Protected main branch (no direct pushes)
- CI must pass before merge
- Describe WHY in commit body, WHAT in title

## Anti-Patterns

- Long-lived feature branches (merge conflicts, context lost)
- Large PRs (500+ lines, nobody reviews thoroughly)
- Merge commits in PR (polluted history)
- No PR description (difficult to review context)
- Pushing straight to main (no review)
- Rebase on shared branches (force push to published history)
- Skip passing CI (broken main)
- Circular dependencies across branches (merge hell)
