# Git Workflow Advanced

## Overview
Advanced git workflow covers large monorepo management, stacked PR workflows, git hooks automation, advanced merge strategies, git LFS, and disaster recovery.

## Advanced Concepts

### Concept 1: Stacked PRs
Series of small, dependent PRs building toward a feature. Each PR is a logical unit. graphite or gh stack for tooling. CI runs on each stack level. Merge bottom-up (earliest first). Reduces merge conflicts and speeds review per change.

### Concept 2: Monorepo Scalability
Partial clone (git clone --filter=blob:none), sparse checkout (git sparse-checkout set path/), shallow clone in CI (--depth=1), and git worktree for parallel feature branches. Git LFS for binary files. Scalar for large repo performance.

### Concept 3: Git Hooks Automation
Client-side hooks: pre-commit (lint + format), prepare-commit-msg (append issue ID), post-checkout (restore env), and pre-push (run tests). Server-side hooks: pre-receive (enforce naming), post-receive (deploy notification). Use husky, lefthook, or pre-commit framework.

### Concept 4: Advanced Merge Strategies
Squash merge (clean linear history, default). Merge commit (preserves full history, works for release branches). Rebase and merge (linear, but preserves commit authors). Cherry-pick for hotfix to release branches. Semantic conflict detection for CI.

### Concept 5: Disaster Recovery
git reflog for lost commits (local only, 90-day default), git fsck for corrupted objects, git reset vs revert (revert is safe for shared branches). Recover deleted remote branches with reflog + push. Cherry-pick across forks. Signed commits for trust verification.

## Advanced Techniques

### Stacked PR Setup (graphite)
```bash
gt branch feature/login
gt commit -m "feat: add login form"
gt branch feature/session
gt commit -m "feat: add session management"
gt branch feature/dashboard
gt commit -m "feat: add user dashboard"
gt log  # shows stack
gt submit  # creates stacked PRs
```

### Recovery from Accidental Reset
```bash
git reflog show HEAD@{3}
git reset --hard HEAD@{3}
```

## Anti-Patterns

- Stacked PRs without CI on each level (broken dependencies)
- Monorepo without partial clone (10+ minute clones)
- Force-pushing to shared branches (lost colleagues' work)
- Large binary files in git (use LFS or remove)
- Manual conflict resolution on every merge (automate)
- No reflog awareness (commits lost permanently on reset)
- Skipping pre-commit hooks with --no-verify habitually
- Signed commits required but no key management
