---
name: dev-loop-git-workflow
description: >
  Use when the user asks about Git workflows, branching strategies, git hooks, merge strategies, git history management, or team git conventions. Do NOT use for: code review (dev-loop-code-review), changelogs (dev-loop-changelog-generator), or CI/CD configuration.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, git, branching, version-control]
---

# Git Workflow

## Purpose
Establish and maintain effective Git workflows — branching strategy, commit conventions, merge patterns, and history management — that enable team collaboration, continuous integration, and reliable releases.

## Agent Protocol

### Trigger
Exact user phrases: "git workflow", "branching strategy", "git flow", "trunk-based", "commit convention", "merge strategy", "git hooks", "git history", "rebase vs merge", "git best practices", "commit message format".

### Input Context
- Team size (solo, small team <10, medium 10-50, large 50+)
- Release cadence (continuous, weekly, monthly, scheduled)
- Deployment model (feature flags, release branches, environment-based)
- CI/CD setup (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- Current pain points (merge conflicts, messy history, broken main, long-lived branches)
- Platform (GitHub, GitLab, Bitbucket, Azure DevOps)

### Output Artifact
Git workflow specification with branching model, commit convention, merge strategy, and hook configuration.

### Completion Criteria
- [ ] Branching strategy selected (trunk-based, git-flow, GitHub Flow)
- [ ] Branch naming convention defined
- [ ] Commit message convention specified (Conventional Commits)
- [ ] Merge strategy chosen (squash, rebase, merge commit)
- [ ] Branch protection rules configured
- [ ] Git hooks implemented (commitlint, pre-commit linting, post-merge)
- [ ] Release branching and tagging strategy defined
- [ ] Hotfix workflow documented
- [ ] Conflict resolution strategy documented

### Max Response Length
200 lines.

## Framework/Methodology

### Branching Strategy Decision Tree
```
What is the team's release model?
├── Continuous deployment (multiple deploys per day)
│   → Trunk-based development: short-lived feature branches → main
│   → Feature flags for incomplete features
│   → No release branches (main is always deployable)
├── Scheduled releases (weekly/monthly)
│   → GitHub Flow: feature → main → release branch → tag
│   → Release branches for patch backports
│   → Version tags on release commits
├── Multiple versions in support (LTS, enterprise)
│   → Git Flow: develop + main + release branches + hotfix
│   → Long-lived release branches, cherry-pick fixes
└── Open source / community
    → Forking workflow: fork → PR → maintainer review → merge
    → Maintainer has squash + rebase options
```

### Branching Strategy Comparison
```
Strategy           Complexity  Best For                    Release Model
──────────────────────────────────────────────────────────────────────────
Trunk-based        Low         Small teams, high CI        Continuous
GitHub Flow        Low-Med     Most teams, standard        On-demand
Git Flow           High        Multi-version, enterprise   Scheduled
Forking            High        Open source, external       PR-driven
```

## Workflow

### Step 1: Choose Branch Naming Convention

```yaml
convention: "scoped names with forward slashes"
patterns:
  features: "feat/<issue-number>-<short-description>"
    # e.g. feat/142-add-user-avatar
  fixes: "fix/<issue-number>-<short-description>"
    # e.g. fix/87-null-pointer-on-login
  chores: "chore/<description>"
    # e.g. chore/update-dependencies
  releases: "release/<version>"
    # e.g. release/v2.1.0
  hotfixes: "hotfix/<version>-<description>"
    # e.g. hotfix/v2.0.1-security-patch

team_rules:
  - "All branches must reference an issue number (if applicable)"
  - "Use kebab-case, no uppercase"
  - "Delete remote branch after merge"
  - "Maximum branch lifetime: 3 days (trunk-based) or 1 week"
```

### Step 2: Commit Message Convention

```yaml
format: |
  <type>(<scope>): <description>

  [optional body]

  [optional footer(s)]

types:
  feat: "New feature (bumps minor)"
  fix: "Bug fix (bumps patch)"
  docs: "Documentation"
  style: "Formatting, no logic change"
  refactor: "Code restructuring"
  perf: "Performance improvement"
  test: "Adding/fixing tests"
  chore: "Maintenance, deps, build"
  ci: "CI/CD changes"

rules:
  - "Subject line: max 72 characters, imperative mood, lowercase"
  - "Body: wrap at 72 characters, describe WHY not WHAT"
  - "Footer: BREAKING CHANGE: or references (closes #142)"
  - "Breaking change: append ! after type/scope"
```

```bash
# Good commit messages
feat(api): add user avatar upload endpoint

feat(api)!: remove deprecated v1 endpoints

BREAKING CHANGE: The `/api/v1/users` endpoint is removed.
Use `/api/v2/users` instead.

fix(auth): handle null token on session refresh

Closes #142

docs(readme): update installation instructions

# Bad commit messages
"fix stuff"
"update"
"WIP"
"asdf"
"final_final_v2_REAL"
```

### Step 3: Configure Branch Protection

```yaml
# GitHub branch protection rules (for main branch)
branch_protection:
  main:
    required_status_checks:
      - "Lint / lint (ubuntu-latest)"
      - "Test / test (ubuntu-latest)"
      - "Test / test (windows-latest)"
      - "Build / build"
      - "CodeQL / Analyze"

    required_pull_request_review:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
      require_code_owner_reviews: false
      require_last_push_approval: true

    restrictions:
      push_restrictions: []
      allow_force_pushes: false
      allow_deletions: false

    other:
      linear_history: false  # Allow merge commits, but prefer squash
      require_conversation_resolution: true
      delete_branch_on_merge: true
      required_linear_history: false
```

### Step 4: Choose Merge Strategy

```yaml
# Recommended: squash merge for feature branches
default: "squash merge"
rationale: |
  Clean history on main. Each feature or fix becomes a single
  well-described commit. Easy to revert. Simple git bisect.

strategies:
  - name: "Squash merge"
    when: "Standard feature branch or bugfix"
    what: "All commits in feature branch become one commit on main"
    commit_message: "<type>(<scope>): <description> (#PR-number)"
    pros:
      - "Clean linear history on main"
      - "Easy to revert (one commit per feature)"
      - "bisect-friendly"
    cons:
      - "Loses individual commit history of feature branch"

  - name: "Rebase and merge"
    when: "Small change with clean commits, open source PR"
    what: "Individual commits preserved, no merge commit"
    commit_message: "Original commits kept"
    pros:
      - "Preserves detailed commit history"
      - "No merge commits"
    cons:
      - "Requires clean commit history from contributor"

  - name: "Merge commit"
    when: "Complex merge, multiple collaborators on branch"
    what: "Merge commit created, all commits preserved"
    commit_message: "Merge branch 'feat/...' into main"
    pros:
      - "Preserves full history and co-author attribution"
    cons:
      - "Cluttered history, harder to bisect"
```

### Step 5: Git Hooks with Husky + commitlint

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'chore', 'ci'
    ]],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    'header-max-length': [2, 'always', 72],
    'scope-case': [2, 'always', 'lower-case'],
  }
};
```

```bash
# .husky/pre-commit - lint staged files
npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml}": ["prettier --write"]
  }
}
```

### Step 6: Release Workflow

```yaml
release_workflow:
  steps:
    - "Create release branch from main: release/v2.1.0"
    - "Bump version in package.json, changelog"
    - "Run full CI suite on release branch"
    - "Create PR from release/v2.1.0 → main"
    - "After approval, merge using merge commit (preserve release commit)"
    - "Tag the merge commit: git tag v2.1.0 && git push --tags"
    - "Deploy from tag or release branch"

  hotfix_workflow:
    - "Create branch from tag: hotfix/v2.0.1-security-fix"
    - "Apply fix, bump patch version"
    - "Create PR → main (merge via squash)"
    - "Cherry-pick to older release branches if needed"
    - "Tag: git tag v2.0.1 && git push --tags"

  rules:
    - "Never commit directly to main"
    - "Never force push to shared branches"
    - "Always squash merge feature/fix branches"
    - "Always delete branch after merge"
    - "Rebase feature branch before creating PR"
```

### Step 7: Conflict Resolution

```bash
# Resolving merge conflicts
git checkout main
git pull origin main
git checkout feature/my-feature
git rebase main
# Fix conflicts in each commit
git add <resolved-files>
git rebase --continue
# Force push (if not shared with others)
git push --force-with-lease
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Long-lived branches | Diverged from main, huge merge conflicts | Trunk-based: max 3 days per branch |
| Force push to shared branches | Losing teammates' work | Use --force-with-lease, ban force push on shared |
| Messy history with WIP commits | Unhelpful commit messages | Squash on merge, use meaningful commits locally |
| Cherry-pick duplication | Same commit cherry-picked to multiple branches | Note cherry-pick source, use git cherry |
| No hooks → inconsistent commits | Formatting, commit messages not enforced | pre-commit + commitlint in CI and hooks |
| Rebase instead of merge at wrong time | Rebasing already-pushed branch | Don't rebase public branches; use merge |
| Ignoring .gitignore patterns | Committing node_modules, .env, secrets | Audit .gitignore, use .gitattributes |
| Large binary files in repo | Repo size balloons, slow clones | Git LFS for binaries, exclude build artifacts |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| One feature = one branch = one PR | Clean separation, atomic changes |
| Squash merge feature branches | Clean linear history on main |
| Conventional Commits | Enables automated tooling (changelog, versioning) |
| Trunk-based development for CI | Short branches, frequent integration, less conflict |
| Branch protection on main | Prevents accidental pushes, enforces review |
| Git hooks for commit quality | Catches issues before CI runs |
| Delete branches after merge | Reduces clutter, no stale branches |
| Use .gitattributes for line endings | Users on any OS get correct line endings |
| Prefer --force-with-lease over --force | Won't overwrite others' pushes |
| Keep commits small and focused | Easier review, revert, bisect |

## References
  - references/git-workflow-advanced.md — Git Workflow Advanced Topics
  - references/git-workflow-branching.md — Branching Strategy Reference
  - references/git-workflow-fundamentals.md — Git Workflow Fundamentals
  - references/git-workflow-hooks.md — Git Hooks Reference
## Handoff
Hand off to `dev-loop-code-review` for PR review process. Hand off to `dev-loop-changelog-generator` for release notes from commits.
