---
name: advanced-workflows
description: >
  Use this skill when the user says 'branching strategy', 'trunk-based development', 'GitFlow', 'GitHub Flow', 'release branches', 'feature flags vs branches', 'squash vs rebase vs merge', 'conventional commits', 'semantic versioning', 'git worktree', 'monorepo git', 'stacked PRs', 'force-with-lease', 'signed commits', 'protected branches'. Defines team Git workflows: branching models, merge strategies, commit conventions and automated versioning, release/hotfix flow, branch protection, signing, and power-user commands (worktrees, rebase --update-refs, sparse checkout). Do NOT use for: resolving a specific conflict or recovering lost work (use conflict-resolution), hook tooling setup (use husky-and-hooks), CI pipeline authoring (use devops/github-actions or devops/gitlab-ci).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [tools, git, branching, trunk-based, conventional-commits, semver]
---

# Advanced Git Workflows

## Purpose
A Git workflow is a contract between developers, CI and release tooling. The right one keeps `main` releasable, makes history useful for debugging and changelogs, and fits how often you ship. This skill picks the branching model and merge strategy, sets conventions that tooling can automate, and documents the commands that make the workflow efficient.

## Agent Protocol

### Trigger
"branching strategy", "trunk-based", "GitFlow", "GitHub Flow", "release branches", "squash vs rebase", "conventional commits", "semantic versioning", "git worktree", "stacked PRs", "force-with-lease", "signed commits", "protected branches".

### Input Context
- Release cadence (continuous deploy, weekly, versioned/mobile releases), number of supported versions
- Team size, repository layout (monorepo/polyrepo), hosting (GitHub, GitLab, Bitbucket, Azure DevOps)
- Compliance needs (signed commits, required reviews)

### Output Artifact
Workflow definition (branches, merge rules, conventions), branch-protection settings, command cheat sheet. No file unless requested.

### Response Format
```
Model: {trunk-based | GitHub Flow | release branches | GitFlow}
Branches: {name -> purpose, lifetime}
Merge: {squash | rebase | merge commit} + rationale
Conventions: {commit format, versioning, changelog tool}
Protection: {required checks, reviews, signing, linear history}
Commands: {key commands}
```

## 1. Choosing a Branching Model
| Model | Shape | Fits | Costs |
|-------|-------|------|-------|
| Trunk-based | everyone merges small changes to `main` at least daily; short-lived branches (hours–2 days); unfinished work behind feature flags | continuous delivery, strong CI | needs feature flags and fast reliable tests |
| GitHub Flow | feature branch → PR → `main` → deploy | web services, small/medium teams | similar to trunk-based with longer branches |
| Release branches | `main` + `release/x.y` cut for stabilisation; fixes land on `main` and are cherry-picked back | versioned products, mobile apps, multiple supported versions | backport discipline |
| GitFlow | `develop`, `feature/*`, `release/*`, `hotfix/*`, `main` | rarely needed today; very long release cycles | merge overhead, long-lived divergence |

Default: trunk-based or GitHub Flow; add release branches only when you must support or stabilise versions in parallel.

## 2. Merge Strategies
| Strategy | History | Use when |
|----------|---------|----------|
| Squash merge | one commit per PR on `main` | PR = one logical change; noisy WIP commits |
| Rebase merge | linear history, keeps individual commits | authors curate clean commits |
| Merge commit | preserves branch topology | long-running integration branches, release merges |
Pick one default per repo and enforce it in the hosting settings; require linear history if you squash/rebase.

## 3. Commit Conventions and Versioning
- Conventional Commits 1.0.0: `<type>[optional scope][!]: <description>`; types `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Breaking changes: `!` after type/scope or a `BREAKING CHANGE:` footer.
- SemVer mapping: `fix` → PATCH, `feat` → MINOR, breaking → MAJOR (before 1.0.0, breaking changes may bump MINOR by convention).
- Automate: semantic-release, release-please, or Changesets (monorepos) generate versions, tags and changelogs from commits/PR metadata. With squash merges, the **PR title** becomes the commit message — lint PR titles.
- Write messages in imperative mood, ≤ 72-char subject, body explaining why.

## 4. Release and Hotfix Flow (release branches)
```bash
git switch -c release/2.4 main            # cut
# stabilise: fixes go to main first, then cherry-pick
git cherry-pick -x <sha>                  # -x records the source commit
git tag -s v2.4.0 -m "v2.4.0"             # signed annotated tag
git push origin release/2.4 v2.4.0
```
Hotfix: branch from the release tag/branch, fix, tag `v2.4.1`, and make sure the fix is also on `main`.

## 5. Branch Protection
- Require PRs, at least one review (CODEOWNERS for sensitive paths), passing status checks, up-to-date branches or a merge queue (GitHub merge queue / GitLab merge trains) for busy repos.
- Disallow force pushes and deletions on `main` and release branches.
- Signed commits: SSH signing is simplest (`git config gpg.format ssh`, `user.signingkey ~/.ssh/id_ed25519.pub`, `commit.gpgsign true`); require "verified" commits if compliance demands it.

## 6. Power Commands
```bash
git switch -c feat/x / git restore <file>        # modern replacements for checkout's two roles
git push --force-with-lease                        # refuse if remote moved since your last fetch
git rebase -i --autosquash origin/main             # with `git commit --fixup <sha>` commits
git rebase --update-refs origin/main               # also moves stacked branches (Git 2.38+)
git range-diff origin/main feat@{1} feat           # compare old vs rebased version of a series
git worktree add ../hotfix release/2.4             # second checkout without stashing
git sparse-checkout set apps/web libs/ui           # monorepo partial checkout (cone mode)
git clone --filter=blob:none <url>                 # partial clone for huge repos
git maintenance start                              # background gc/prefetch/commit-graph
git log --oneline --graph --decorate --all
git bisect start; git bisect bad; git bisect good v2.3.0; git bisect run ./test.sh
```
- Stacked PRs: keep each branch small, rebase the stack with `--update-refs`, or use tools (Graphite, ghstack, git-branchless).
- Rewrite only unpublished/your own branches; never rewrite shared history on `main`.

## 7. Monorepos
- CODEOWNERS per directory, path-filtered CI, sparse checkout/partial clone for size, a single versioning tool (Changesets, Nx release, Lerna-lite) for packages.
- Avoid Git submodules for code that changes together; prefer a monorepo or published packages.

## 8. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Long-lived feature branches | painful merges, late integration | small PRs + feature flags |
| `git push --force` on shared branches | overwrites teammates' work | `--force-with-lease`, protection rules |
| Mixed merge strategies per PR | unreadable history | one enforced default |
| Commit messages like "fix" / "wip" on `main` | useless history, broken changelogs | squash with conventional PR titles |
| Fixing on release branch only | regression in next release | fix on `main`, cherry-pick back |
| Secrets committed then "deleted" | still in history | rotate secret; history rewrite (git filter-repo) only after rotation |

## 9. Checklist
- [ ] Branching model and merge strategy documented and enforced in settings
- [ ] Conventional commit / PR title linting; automated versioning and changelog
- [ ] Protected `main`/release branches with required checks and reviews
- [ ] Release and hotfix procedure written down, including back-merges
- [ ] Signing policy decided; CODEOWNERS present
