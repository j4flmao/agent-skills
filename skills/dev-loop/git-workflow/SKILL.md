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

## Implementation Patterns

### Automated Git Workflow Manager

```python
import subprocess
import re
from typing import List, Dict, Optional
from datetime import datetime

class GitWorkflowManager:
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path

    def create_feature_branch(self, feature_name: str, base: str = "main") -> bool:
        branch = f"feat/{feature_name.lower().replace(' ', '-')}"
        try:
            subprocess.run(["git", "checkout", base], check=True, cwd=self.repo_path)
            subprocess.run(["git", "pull", "origin", base], check=True, cwd=self.repo_path)
            subprocess.run(["git", "checkout", "-b", branch], check=True, cwd=self.repo_path)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Failed to create branch: {e}")
            return False

    def squash_commits(self, message: str) -> bool:
        try:
            log = subprocess.run(
                ["git", "log", "--oneline"], capture_output=True, text=True, cwd=self.repo_path
            )
            commits = log.stdout.strip().split("\n")
            if len(commits) <= 1:
                return True
            subprocess.run(["git", "reset", "--soft", f"HEAD~{len(commits)-1}"], check=True, cwd=self.repo_path)
            subprocess.run(["git", "commit", "-m", message], check=True, cwd=self.repo_path)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Failed to squash: {e}")
            return False

    def detect_diverged(self, branch: str, base: str = "main") -> int:
        try:
            result = subprocess.run(
                ["git", "rev-list", "--count", f"{base}..{branch}"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            ahead = int(result.stdout.strip())
            result = subprocess.run(
                ["git", "rev-list", "--count", f"{branch}..{base}"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            behind = int(result.stdout.strip())
            return ahead - behind
        except subprocess.CalledProcessError:
            return 0

    def suggest_rebase(self, branch: str, base: str = "main") -> Optional[str]:
        behind = self.detect_diverged(branch, base)
        if behind < 0:
            return f"Branch is {abs(behind)} commits behind {base}. Suggested: git rebase {base}"
        elif behind > 5:
            return f"Branch is {behind} commits ahead — consider squashing or splitting PR"
        return None

    def get_latest_tag(self) -> Optional[str]:
        try:
            result = subprocess.run(
                ["git", "describe", "--tags", "--abbrev=0"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            return result.stdout.strip() if result.returncode == 0 else None
        except subprocess.CalledProcessError:
            return None

    def changelog_between(self, from_ref: str, to_ref: str = "HEAD") -> List[Dict]:
        try:
            result = subprocess.run(
                ["git", "log", f"{from_ref}..{to_ref}", "--oneline", "--format=%H|%s|%an|%ad", "--date=short"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            entries = []
            for line in result.stdout.strip().split("\n"):
                parts = line.split("|")
                if len(parts) >= 4:
                    entries.append({
                        "hash": parts[0][:8],
                        "message": parts[1],
                        "author": parts[2],
                        "date": parts[3],
                    })
            return entries
        except subprocess.CalledProcessError:
            return []


class GitHookInstaller:
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
        self.hooks_dir = f"{repo_path}/.git/hooks"

    def install_pre_commit_hook(self):
        hook_content = """#!/bin/sh
# Pre-commit hook: validate commit message format
commit_msg_file=$1
msg=$(cat "$commit_msg_file")

# Conventional Commits regex
conventional_regex="^(feat|fix|docs|refactor|perf|test|chore|ci|build|style|revert)(\\\\(.+\\\\))?(!)?: .+"

if ! echo "$msg" | grep -qE "$conventional_regex"; then
    echo ""
    echo "ERROR: Commit message must follow Conventional Commits format."
    echo "Examples:"
    echo "  feat(api): add user endpoint"
    echo "  fix: resolve null pointer in auth"
    echo "  refactor(core): extract validation logic"
    echo ""
    exit 1
fi
"""
        hook_path = f"{self.hooks_dir}/commit-msg"
        with open(hook_path, "w") as f:
            f.write(hook_content)
        import os
        os.chmod(hook_path, 0o755)
        print(f"Installed commit-msg hook at {hook_path}")

    def install_pre_push_hook(self):
        hook_content = """#!/bin/sh
# Pre-push hook: prevent force push to protected branches
protected_branches="main master develop"

while read local_ref local_sha remote_ref remote_sha; do
    for branch in $protected_branches; do
        if echo "$remote_ref" | grep -q "refs/heads/$branch$"; then
            if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
                echo "ERROR: Deleting protected branch $branch is not allowed"
                exit 1
            fi
            # Check if force push
            zero_commit="0000000000000000000000000000000000000000"
            if [ "$remote_sha" != "$zero_commit" ]; then
                merge_base=$(git merge-base $local_sha $remote_sha 2>/dev/null)
                if [ "$merge_base" != "$remote_sha" ]; then
                    echo "ERROR: Force push to $branch is not allowed. Use --force-with-lease and create a PR instead."
                    exit 1
                fi
            fi
        fi
    done
done
exit 0
"""
        hook_path = f"{self.hooks_dir}/pre-push"
        with open(hook_path, "w") as f:
            f.write(hook_content)
        import os
        os.chmod(hook_path, 0o755)
        print(f"Installed pre-push hook at {hook_path}")
```

## Architecture Decision Trees

### Branch Strategy Selection

```
What's the team size and release cadence?
├── Small team (1-5), continuous deployment
│   └── Trunk-based development
│       ├── Short-lived feature branches (< 1 day)
│       ├── Direct commits to main (with review)
│       └── Feature flags for incomplete work
│
├── Medium team (5-20), weekly releases
│   └── GitHub Flow
│       ├── feature/* branches from main
│       ├── PR → main with squash merge
│       └── Release tags from main
│
├── Large team (20+), scheduled releases
│   └── Git Flow
│       ├── develop branch for integration
│       ├── feature/* from develop → develop
│       ├── release/* for release candidates
│       └── hotfix/* from main → main + develop
│
└── Mono repo with multiple services
    └── Trunk-based + release branches per service
        ├── service-* prefixes
        ├── Independent release cadence
        └── Per-service CI/CD pipelines
```

### Merge Conflict Resolution Flow

```
What type of conflict?
├── Same file, different sections
│   └── Auto-merge handles it — verify with build
│
├── Same file, same section
│   ├── One side is trivial (rename, whitespace)
│   │   └── Accept the meaningful change
│   └── Both sides are meaningful
│       ├── Understand both changes → combine
│       └── If incompatible → talk to the other author
│
├── Deleted file vs modified file
│   └── Usually want the deletion — confirm intent
│
└── Binary file conflict
    └── Pick one version, re-apply the other's intent
```

## Production Considerations

- **Branch protection rules**: Enable at the Git host (GitHub/GitLab): require PR review, require status checks, restrict merge types, require signed commits for main. No one pushes directly.
- **Automated cleanup**: Stale branch deletion via GitHub Actions: branches without activity for 30 days get a warning, then auto-deleted after 45 days. Reduces mental load from branch list.
- **Hooks distribution**: Use a hooks manager like `husky` or `pre-commit` to distribute hooks via git to the whole team. Ensure consistency without manual setup steps.
- **Rebase vs merge culture**: Document the team's explicit policy: feature branches get rebased onto main, but main is never rebased. Enforce via CI checks on the PR merge strategy dropdown.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Giant mega-branches | Merge hell, integration nightmare | Keep branches < 3 days, use feature flags |
| Rebased published branches | Creates divergent history for collaborators | Only rebase unpushed commits |
| Squash merging everything | Loses context of individual commits | Squash features, merge commit for releases |
| Long-lived release branches | Cherry-pick chaos, never fully synced | Short release branches or trunk-based |
| No commit message convention | Impossible to auto-generate changelog | Enforce Conventional Commits in hooks/CI |
| Force pushing to shared branches | Destroys co-authors' work | Use --force-with-lease, protect branches |
| Multiple merges from main into feature | Pollutes feature branch history | Rebase feature onto main once, before PR |
| Not pulling before rebase | Rebasing onto outdated main | Always git pull origin main before rebase |
| Stashing unfinished work for too long | Context lost, conflicts pile up | Commit WIP with fixup!, rebase later |
| .gitignore updated too late | Secrets committed, repo bloated | Setup .gitignore before first commit |

## Performance Optimization

- **Shallow clone in CI**: Use `git clone --depth 1` in CI pipelines. Reduces clone time by 80%+ for large repositories. Use `git fetch --unshallow` only when full history is needed.
- **Partial clone with blobless**: Use `git clone --filter=blob:none` for developer machines. Downloads only commit metadata initially, fetches file contents on demand.
- **Git LFS for binaries**: Track large binary files (images, videos, datasets) with Git LFS. Keeps repo clones fast. LFS pointers are tiny (< 1KB) instead of MB-sized binaries.
- **Sparse checkout for monorepos**: Use `git sparse-checkout set <path>` to only checkout relevant subdirectories. Reduces working tree size for monorepos with many packages.
- **Rebase optimization**: Use `git rebase --interactive --autosquash` with fixup! commits. Reduces manual squash effort. Use `git rebase --update-refs` to handle stacked branches.

## Handoff
Hand off to `dev-loop-code-review` for PR review process. Hand off to `dev-loop-changelog-generator` for release notes from commits.
