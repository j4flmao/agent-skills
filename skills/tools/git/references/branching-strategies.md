# Git Branching Strategies

## Overview
Git branching strategies define how teams manage code changes, releases, and collaboration. Common strategies include Git Flow, GitHub Flow, Trunk-Based Development, and environment-based branching.

## Git Flow

### Main Branches
```bash
# Core branches
git branch main          # Production-ready code
git branch develop       # Integration branch for features

# Supporting branches
git branch feature/*     # New features (branch from develop)
git branch release/*     # Release preparation (branch from develop)
git branch hotfix/*      # Urgent fixes (branch from main)
```

### Git Flow Workflow
```bash
# Start a feature
git checkout develop
git checkout -b feature/user-authentication
# Work on feature...
git commit -m "feat: add login form"
git commit -m "feat: add JWT token handling"
git checkout develop
git merge --no-ff feature/user-authentication
git branch -d feature/user-authentication

# Create a release
git checkout develop
git checkout -b release/1.2.0
# Bump version, update changelog
git commit -m "chore: bump version to 1.2.0"
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
git checkout develop
git merge --no-ff release/1.2.0
git branch -d release/1.2.0

# Create a hotfix
git checkout main
git checkout -b hotfix/1.2.1
git commit -m "fix: resolve security vulnerability"
git checkout main
git merge --no-ff hotfix/1.2.1
git tag -a v1.2.1 -m "Hotfix 1.2.1"
git checkout develop
git merge --no-ff hotfix/1.2.1
git branch -d hotfix/1.2.1
```

## GitHub Flow

### Simple Feature Branch Workflow
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/add-payment-gateway

# Make changes
git add .
git commit -m "feat: integrate Stripe payment gateway"
git push -u origin feat/add-payment-gateway

# Create Pull Request on GitHub
# gh pr create --title "Add Stripe Payment Gateway" --body "..."

# After PR review and merge
git checkout main
git pull origin main
git branch -d feat/add-payment-gateway
```

### Protected Branches
```bash
# Branch protection rules (configured in GitHub)
# - Require pull request reviews (at least 1)
# - Require status checks (CI passes)
# - Require up-to-date branches
# - Include administrators
# - Require linear history (no merge commits)

# Squash merge via GitHub UI
# git rebase and merge for linear history
```

## Trunk-Based Development

### Short-Lived Feature Branches
```bash
# All developers work on main or short-lived branches
git checkout main
git pull origin main

# Create short-lived branch (max 1-2 days)
git checkout -b short-feature

# Commit frequently
git add .
git commit -m "feat: add input validation"

# Merge back to main quickly
git checkout main
git pull origin main
git rebase main short-feature  # or merge
git push origin main

# Feature toggles for incomplete work
# if (featureFlags.isEnabled('new-checkout')) {
#   renderNewCheckout();
# } else {
#   renderOldCheckout();
# }
```

## Branch Naming Conventions

### Standard Prefixes
```bash
# Feature branches
git checkout -b feature/stripe-integration
git checkout -b feat/user-profile-page

# Bug fixes
git checkout -b fix/login-error-handling
git checkout -b bugfix/null-pointer-exception

# Chores and maintenance
git checkout -b chore/update-dependencies
git checkout -b chore/upgrade-to-vite-5

# Technical debt refactoring
git checkout -b refactor/clean-up-legacy-api
git checkout -b refactor/extract-validation-module

# Documentation
git checkout -b docs/api-authentication
git checkout -b docs/update-readme

# Performance improvements
git checkout -b perf/optimize-database-queries
git checkout -b perf/image-loading

# Experimental
git checkout -b experiment/webassembly-renderer
```

## Merge Strategies

### Merge vs Rebase vs Squash
```bash
# Merge (preserves all history)
git checkout main
git merge --no-ff feature-branch
# Creates merge commit showing branch integration

# Rebase (linear history)
git checkout feature-branch
git rebase main
git checkout main
git merge feature-branch
# No merge commits, cleaner history

# Squash (single commit)
git checkout main
git merge --squash feature-branch
git commit -m "feat: complete feature summary"
# Collapses all branch commits into one
```

### Handling Conflicts
```bash
# During rebase
git checkout feature-branch
git rebase main

# Resolve conflicts
git status  # Shows conflicted files
# Edit files to resolve conflicts
git add resolved-file.ts
git rebase --continue

# If needed
git rebase --abort  # Cancel rebase
git rebase --skip   # Skip this commit

# During merge
git checkout main
git merge feature-branch
# Resolve conflicts
git add resolved-file.ts
git merge --continue
```

## Release Branching

### Semantic Versioning
```bash
# Version format: MAJOR.MINOR.PATCH
# MAJOR: breaking changes
# MINOR: new features (backward compatible)
# PATCH: bug fixes (backward compatible)

git tag -a v2.0.0 -m "Major release with breaking API changes"
git tag -a v1.5.0 -m "Minor release with new features"
git tag -a v1.4.1 -m "Patch release with bug fixes"

# Release branches for LTS
git checkout -b release/1.x v1.5.0
git checkout -b release/2.x v2.0.0
```

## Key Points
- Git Flow uses develop/release/hotfix branches for structured releases
- GitHub Flow uses feature branches with pull requests to main
- Trunk-Based Development uses short-lived branches with feature toggles
- Branch naming conventions organize work by type (feature, fix, chore)
- Merge strategies balance history preservation vs cleanliness
- Squash merging collapses feature work into single commits
- Rebasing produces linear history without merge commits
- Branch protection rules enforce code review and CI passing
- Semantic versioning communicates release impact
- Release branches support LTS version maintenance
- Hotfix branches bypass normal flow for urgent fixes
- Feature flags enable incomplete features in production
- --no-ff merge preserves branch topology
- Conflict resolution requires careful review
- Atomic commits with clear messages improve history readability
- Pull request templates standardize contribution descriptions
- Branch cleanup after merge keeps repository organized
- Signed commits verify contributor identity
- Linear history simplifies git bisect for regression finding
- Environment-specific branches (staging, production) manage deployments
