---
name: git-workflow
description: >
  Use this skill when the user says 'commit message', 'branch name', 'git workflow',
  'PR template', 'conventional commits', 'git strategy', 'merge vs rebase', 'release
  workflow', or when managing git operations. Covers: conventional commits format,
  branch naming conventions, PR workflows, merge strategies, and release workflows.
  Works with any project using git. Do NOT use this for: code review, CI/CD pipeline
  design, or GitHub-specific configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, git, phase-4]
---

# Git Workflow

## Purpose
Establish consistent git conventions for commit messages, branching, and pull requests.

## Agent Protocol

### Trigger
Exact user phrases: "commit message", "branch name", "git workflow", "PR template", "conventional commits", "git strategy", "merge vs rebase", "release workflow".

### Input Context
Before activating, verify:
- The context is known (new commit, new branch, PR, or release).
- The project's git conventions or lack thereof is understood.
- The user's intent (what they want to do with git) is clear.

### Output Artifact
No file output. This skill produces git commands or templates.

### Response Format
Git command sequence or conventional commit template.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of why git conventions matter.

### Completion Criteria
This skill is complete when:
- [ ] The correct git command or commit message template is produced.
- [ ] The response follows conventional commits format if applicable.
- [ ] Branch naming follows the project convention.
- [ ] Merge strategy is specified if asked.

### Max Response Length
15 lines.

## Quick Start
Conventional commits: `<type>(<scope>): <description>`. Branch: `<type>/<ticket>-<description>`. One concern per PR.

## When to Use This Skill
- Writing commit messages
- Creating branches
- Reviewing PR conventions
- Setting up release workflow
- Onboarding team to git conventions

## Core Workflow

### Step 1: Conventional Commits
```
<type>(<scope>): <description>

<body (optional)>

<footer (optional)>
```

**Types**:
| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, missing semicolons (no behavior change) |
| `refactor` | Code restructuring (no behavior change) |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build config, tooling, CI |
| `ci` | CI configuration |

**Examples**:
```
feat(auth): add refresh token rotation

Adds automatic refresh token rotation on each token refresh.
Invalidates old refresh tokens to prevent reuse if compromised.

Closes #123
```

```
fix(api): handle null user in /me endpoint

The /me endpoint throws a NullPointerException when
the user context is missing. Now returns 401 instead.
```

### Step 2: Branch Naming
```
<type>/<ticket-id>-<short-description>
Examples:
feat/AUTH-42-user-registration
fix/ORD-17-price-calculation
refactor/PAY-03-extract-payment-service
```

### Step 3: PR Workflow
1. One concern per PR — not "added feature + refactored + fixed bug"
2. Title follows conventional commit format
3. Description includes: what, why, how (not just "what")
4. Reference the issue/story: `Closes STORY-042`
5. Request review from relevant team members

### Step 4: Merge Strategy Decision
| Strategy | When to Use |
|----------|-------------|
| **Squash & Merge** | Topic branch with multiple WIP commits → clean history on main |
| **Rebase & Merge** | Clean, well-organized branch commits → linear history |
| **Merge Commit** | Preserving full history, multi-author branches |

### Step 5: Release Workflow
```bash
# Create release branch
git checkout -b release/v1.2.0 main

# Bump version
npm version patch  # or minor, major

# Generate changelog
# (use changelog-generator skill)

# Create PR from release/v1.2.0 → main

# After merge, tag
git tag v1.2.0
git push origin v1.2.0
```

## Rules & Constraints
- Commit subject: imperative mood, no period, < 72 characters
- Commit body: wrap at 72 characters, explain WHY not WHAT
- Never commit directly to main — always use PRs
- Never force push to shared branches (main, develop, release)
- One logical change per commit — not "fix a bunch of things"
- Branch names: lowercase, kebab-case, no spaces

## Output Format
Git command sequence or conventional commit template.

## References
- `references/conventional-commits.md` — conventional commits specification

## Handoff
After completing this skill:
- Next skill: **security-auditor** — ensure git practices are secure
- Pass context: branch strategy, commit conventions, PR workflow
