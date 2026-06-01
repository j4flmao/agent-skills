# Git Skill

## Overview
Git is a distributed version control system for tracking source code changes. This skill covers branching strategies, workflow patterns, hooks, history rewriting, and advanced commands.

## Decision Tree: Workflow Selection

### Choosing a Branching Strategy
```
Team size / release cadence?
├── Solo dev / small team, continuous deploy → GitHub Flow
│   (feature branch → PR → main)
├── Team of 3-10, scheduled releases → Git Flow
│   (develop + feature + release + hotfix branches)
├── Large team, multiple versions in production → Git Flow + release branches
│   (LTS branches, hotfix branches for each version)
├── CI-heavy, short-lived features → Trunk-Based Development
│   (short branches merged within hours, feature flags)
└── Open source project → GitHub Flow or Forking Workflow
    (main + feature branches, forks for external contributors)
```

### Commit Strategy Decision
```
Should I commit now?
├── Logical unit of work complete? → Commit
├── About to try something risky? → Commit first
├── Need to switch branches? → Commit or stash
└── Code doesn't compile but want to save? → Use `git stash` or WIP commit with fixup

Writing the commit message:
├── Can I describe it in <50 chars? → Single-line subject
├── Need more context? → Subject + blank line + body (72 char wrap)
├── Fixes an issue? → "Fixes #123" in body or footer
└── Breaking change? → "BREAKING CHANGE:" in footer
```

## Branching Patterns

### Feature Branch Workflow
```bash
# Starting a feature
git checkout -b feat/payment-integration main
# Make changes...
git add src/payment/
git commit -m "feat: add Stripe payment provider"
git push -u origin feat/payment-integration
# Create PR, get review, merge
git checkout main
git pull origin main
git branch -d feat/payment-integration
```

### Git Flow Complete
```bash
# Initialize
git flow init  # Uses git-flow extensions

# Feature
git flow feature start user-auth
git flow feature finish user-auth  # Merges to develop, deletes branch

# Release
git flow release start 1.2.0
git flow release finish 1.2.0  # Merges to main + develop, tags

# Hotfix
git flow hotfix start 1.2.1
git flow hotfix finish 1.2.1  # Merges to main + develop, tags
```

### Release Branch Pattern
```bash
# Create LTS release branch
git checkout -b release/2.x v2.0.0
# Cherry-pick fixes from main
git cherry-pick <commit-hash>
# Tag patch releases
git tag -a v2.0.1 -m "Security patch"
```

## Commit Message Convention

### Conventional Commits
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `build`

```bash
# Good examples
git commit -m "feat(auth): add OAuth2 login flow"
git commit -m "fix(api): handle null response from payment gateway"
git commit -m "refactor(parser): extract tokenizer into separate module"
git commit -m "perf(db): add index on user email column"
git commit -m "docs(readme): update installation instructions"
```

```bash
# Scope includes subsystem, subject is imperative mood
git commit -m "feat: add dark mode support"  # No scope is fine
git commit -m "ci: add deployment workflow"  # CI type for pipeline changes
```

## Advanced Commands

### Interactive Rebase
```bash
# Squash last 3 commits
git rebase -i HEAD~3
# Options: pick, reword, squash, fixup, drop, edit

# Rebase feature branch onto main
git checkout feat/my-feature
git rebase -i main

# Auto-squash fixup commits
git commit --fixup=<commit-hash>
git rebase -i --autosquash main
```

### Bisect for Regression Hunting
```bash
# Start bisect
git bisect start
git bisect bad          # Current commit is broken
git bisect good v1.0.0 # This version was working

# Git checks out middle commits; mark each:
git bisect good  # This commit works
git bisect bad   # This commit is broken
# Repeat until the first bad commit is identified

# Automatic bisect with script
git bisect start HEAD v1.0.0
git bisect run npm test  # Runs test on each commit
git bisect reset
```

### Cherry-Pick
```bash
# Pick specific commits to current branch
git cherry-pick <commit-hash>

# Cherry-pick range
git cherry-pick <start>..<end>

# Cherry-pick with original date
git cherry-pick --signoff <commit>
```

### Reflog Recovery
```bash
# View all HEAD movements
git reflog

# Recover deleted branch
git reflog  # Find the commit hash
git checkout -b recovered-branch <hash>

# Recover from wrong reset
git reflog  # Find commit before reset
git reset --hard <hash>
```

## Hook Workflow Patterns

### Pre-commit Linting
```bash
#!/bin/sh
# .husky/pre-commit
npx lint-staged
```

### Commit Message Validation
```bash
#!/bin/sh
# .husky/commit-msg
npx --no-install commitlint --edit "$1"
```

### Pre-push Validation
```bash
#!/bin/sh
# .husky/pre-push
npm run typecheck && npm test
```

### Post-merge Dependency Check
```bash
#!/bin/sh
# .husky/post-merge
changed=$(git diff HEAD@{1} --name-only | grep "package.json\|package-lock.json")
if [ -n "$changed" ]; then
  echo "Dependencies changed. Running npm install..."
  npm install
fi
```

### Post-checkout Hook
```bash
#!/bin/sh
# .husky/post-checkout
# Runs after switching branches — regenerate files as needed
if [ "$3" = "1" ]; then  # Branch checkout, not file checkout
  npm run generate
fi
```

## History Rewriting

### When to Rewrite
```
Should I rewrite git history?
├── Branch not yet pushed / rebasing before PR → YES, rewrite freely
├── Fixing a typo in last commit → `git commit --amend`
├── Squashing messy WIP commits → `git rebase -i`
├── Removing accidentally committed secrets → `git filter-branch` or `git filter-repo`
├── Branch already pushed / shared → DANGER — coordinate with team
│   ├── Solo branch → Force push after rewriting
│   └── Shared branch → DO NOT rewrite; use revert instead
└── Public main branch → NEVER rewrite
```

### Amending Commits
```bash
# Fix last commit (add forgotten changes)
git add forgotten-file.ts
git commit --amend  # Edits commit message; adds staged changes

# Change last commit message only
git commit --amend -m "fix: correct error message"
```

### Squashing
```bash
# Method 1: Soft reset
git reset --soft HEAD~3
git commit -m "feat: complete payment integration"

# Method 2: Interactive rebase
git rebase -i HEAD~3
# Change 'pick' to 'squash' or 'fixup' for later commits
```

### Filter-Repo for Sensitive Data
```bash
# Remove a file from entire history
git filter-repo --path config/secrets.json --invert-paths

# Replace string across all commits
git filter-repo --replace-text <(echo "password123==>REMOVED")

# Note: Requires git-filter-repo (pip install git-filter-repo)
```

## Merge Strategy Decision Tree
```
Merge, rebase, or squash?
├── Need to preserve exact branch history? → Merge (--no-ff)
│   └── Individual commits matter for bisect
├── Want clean linear history? → Rebase + merge
│   └── Feature branch with meaningful commits
├── Feature developed as messy WIP commits? → Squash merge
│   └── Single "feat: add X" commit is sufficient
└── All three valid — agree with team convention
```

## Collaboration Patterns

### Code Review via Pull Request
```bash
# Before creating PR, ensure:
git checkout feat/my-feature
git rebase main           # Linear, up-to-date history
git push -f               # Force push after rebase
# Create PR with template
```

### Handling Review Feedback
```bash
# Make changes requested in review
git add src/updated-file.ts
git commit -m "fix: address review feedback — handle edge case"
git push origin feat/my-feature
```

### Resolve Conflicts Remotely
```bash
# On feature branch
git fetch origin
git rebase origin/main
# Resolve conflicts, then:
git add resolved-file.ts
git rebase --continue
git push -f  # Must force push after rebase
```

## Key Anti-Patterns
- **Committing secrets**: Use `.gitignore` and pre-commit hooks to block them
- **Large binary files in repo**: Use Git LFS or exclude entirely
- **Messy history on shared branches**: Use squash/rebase locally before pushing
- **Force pushing to shared branches**: Only careful after team coordination
- **Long-lived feature branches**: Keep <2 days; use feature flags for incomplete work
- **Vague commit messages**: "fixed stuff" is never acceptable
- **No .gitignore**: Causes accidental commits of build artifacts and deps
- **Mixing unrelated changes in one commit**: Violates single-responsibility per commit
- **Committing directly to main**: Always use PRs with branch protection
- **Not pulling before pushing**: Always `git pull --rebase` before push

## Distributed Workflow Patterns

### Forking Workflow (Open Source)
```bash
# Fork on GitHub, then:
git clone https://github.com/myuser/repo.git
git remote add upstream https://github.com/original/repo.git
git checkout -b feat/my-contribution
# Make changes, push
git push -u origin feat/my-contribution
# Create PR from myuser/repo to original/repo

# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main
```

### Monorepo with Multiple Teams
```bash
# Use CODEOWNERS for per-directory ownership
# .github/CODEOWNERS
packages/api/ @api-team
packages/web/ @web-team
packages/shared/ @core-team

# Use sparse checkout for large monorepos
git clone --sparse <repo-url>
git sparse-checkout init --cone
git sparse-checkout set packages/web/
```

## Submodule and Subtree Management
```bash
# Add submodule
git submodule add https://github.com/example/lib.git lib/

# Update all submodules
git submodule update --init --recursive

# Alternative: subtree (embeds history)
git subtree add --prefix lib/ https://github.com/example/lib.git main --squash
git subtree pull --prefix lib/ https://github.com/example/lib.git main --squash
```

## Git Configuration Patterns
```bash
# Recommended global config
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git config --global pull.rebase true
git config --global fetch.prune true
git config --global diff.colorMoved zebra
git config --global init.defaultBranch main

# Diff improvements
git config --global diff.algorithm histogram
git config --global rebase.autoSquash true

# Aliases
git config --global alias.lg "log --graph --oneline --all"
git config --global alias.undo "reset --soft HEAD~1"
git config --global alias.amend "commit --amend --no-edit"
```
