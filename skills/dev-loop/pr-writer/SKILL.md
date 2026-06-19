---
name: dev-loop-pr-writer
description: >
  Use when the user asks about writing pull requests, PR descriptions, PR templates, effective code reviews, or pull request best practices. Do NOT use for: code review content (dev-loop-code-review), or git workflow branching (dev-loop-git-workflow).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, pr-writer, pull-request, code-review]
---

# PR Writer

## Purpose
Write effective pull request descriptions — clear, structured, and reviewable — that communicate what changed, why it changed, and how it was validated. Good PR descriptions reduce review time, catch bugs earlier, and create an auditable project history.

## Agent Protocol

### Trigger
Exact user phrases: "write PR", "pull request", "PR description", "PR template", "create PR", "open a PR", "draft PR", "PR summary", "PR title", "write a pull request".

### Input Context
- PR type (feature, bugfix, refactor, chore, docs, hotfix)
- Code changes (files changed, additions/deletions, key modifications)
- Issue or ticket reference (GitHub issue, JIRA, Linear)
- Testing done (unit, integration, manual, E2E)
- Dependencies or breaking changes
- Reviewer notes (areas of concern, decisions made)

### Output Artifact
Pull request with title following convention, structured description, and review guidance.

### Completion Criteria
- [ ] PR title follows Conventional Commits format
- [ ] Description includes what, why, and how
- [ ] Related issues linked
- [ ] Screenshots or screen recordings included (UI changes)
- [ ] Testing methodology described
- [ ] Breaking changes highlighted
- [ ] Deployment considerations noted
- [ ] Reviewers added with specific focus areas
- [ ] CI status checked and passing

### Max Response Length
150 lines.

## Framework/Methodology

### PR Size Decision Tree
```
How large is the change?
├── Small (< 100 lines, single concern)
│   → Direct review, one reviewer
│   → Merge after single approval
├── Medium (100-500 lines, 1-3 files)
│   → Standard review, 1-2 reviewers
│   → Focus on logic and edge cases
├── Large (500-2000 lines, multiple files)
│   → Consider splitting into smaller PRs
│   → Request specific reviewers for specific areas
└── Huge (> 2000 lines)
    → MUST split into multiple PRs
    → Each PR must be independently reviewable
```

### PR Title Conventions
```
<type>(<scope>): <description>

Examples:
feat(api): add user avatar upload endpoint
fix(auth): handle expired token refresh race condition
refactor(state): extract state management into dedicated module
docs(readme): update API documentation links
chore(deps): upgrade TypeScript to v5.4
```

## Workflow

### Step 1: Set Up PR Template

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->
## Description
<!-- Briefly describe what this PR does and why -->

Fixes #ISSUE_NUMBER

## Type of Change
- [ ] 🚀 New feature
- [ ] 🐛 Bug fix
- [ ] ♻️ Refactoring (no functional changes)
- [ ] 📚 Documentation
- [ ] 🔧 Chore (deps, build, CI)
- [ ] ⚡ Performance improvement

## How Has This Been Tested?
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing (describe scenarios)
- [ ] Tested in production/staging environment

## Screenshots (if applicable)
<!-- Before/after for UI changes -->

## Key Decisions
<!-- Explain WHY you made specific choices -->

## Breaking Changes
<!-- List any breaking changes and migration steps -->

## Deployment Notes
<!-- Database migrations, env vars, feature flags, rollback plan -->

## Reviewer Focus Areas
<!-- What specific parts should the reviewer pay attention to? -->

## Checklist
- [ ] My code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No new warnings introduced
- [ ] Tests pass locally
```

### Step 2: Write the PR Body

```markdown
## Description
Adds user avatar upload functionality. Users can now upload a profile
photo from their settings page. Images are resized to 256x256, stored
in S3, and served via CDN.

Fixes #142

## Type of Change
- [x] 🚀 New feature

## How Has This Been Tested?
- [x] Unit tests for AvatarService (image validation, resize, upload)
- [x] Integration test for S3 upload mock
- [x] Manual: uploaded images in various formats (PNG, JPG, GIF, WEBP)
- [x] Manual: tested with files >5MB (correctly rejected)
- [x] Manual: verified avatar displays in header, settings, profile pages

## Screenshots
| Before | After |
|--------|-------|
| ![before](https://i.imgur.com/old.png) | ![after](https://i.imgur.com/new.png) |

## Key Decisions
- **ImageMagick for resizing**: Sharp was faster but has native dependency
  issues in our CI. ImageMagick via shell is more portable.
- **256x256 max size**: Based on UI analysis — avatar displays at max 48px
  in most places. 256px provides retina-ready quality.
- **CDN cache TTL: 7 days**: Avatars rarely change, long cache improves
  load times. Etag-based invalidation for immediate updates.

## Breaking Changes
None. This is additive only.

## Deployment Notes
- Requires: `AVATAR_S3_BUCKET` and `CDN_URL` env vars (added to Terraform)
- New migration: `add_avatar_url_to_users` (automated, zero-downtime)
- S3 bucket and CDN distribution via Terraform PR #138

## Reviewer Focus Areas
- @alice: Image validation logic in `src/services/avatar.ts` (security)
- @bob: S3 integration and error handling (reliability)

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Documentation updated (README API section)
- [x] No new warnings
- [x] All tests passing
```

### Step 3: PR Description Generator Script

```bash
#!/bin/bash
# scripts/generate-pr-body.sh
# Generate PR body from conventional commit + git diff summary

COMMIT_MSG=$(git log --format="%s" HEAD~1..HEAD)
COMMIT_BODY=$(git log --format="%b" HEAD~1..HEAD | sed '/^$/d')
CHANGED_FILES=$(git diff HEAD~1..HEAD --stat -- ':!package-lock.json')
DIFF_STATS=$(echo "$CHANGED_FILES" | tail -1)

cat << PRBODY
## Description

$COMMIT_BODY

## Changes

$CHANGED_FILES

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally

PRBODY
```

### Step 4: PR Best Practices

```yaml
pr_writing_rules:
  - "PR title must follow Conventional Commits format"
  - "PR must reference at least one issue (or explain why not)"
  - "PR description must explain WHY, not WHAT (code shows WHAT)"
  - "UI changes must include screenshots or recordings"
  - "Breaking changes must be clearly marked with migration steps"
  - "Keep PRs under 400 lines for reviewability"
  - "Multiple PRs for features spanning more than 3 days of work"
  - "Draft PRs for incomplete work (WIP prefix or Draft mode)"
  - "Self-review before requesting external review"

pr_do_dont:
  - DO: "Explain the problem being solved"
  - DO: "Link to related issues, discussions, or decisions"
  - DO: "Call out areas needing special attention"
  - DO: "Include test evidence (coverage, manual scenarios)"
  - DONT: "Write 'See commits for details'"
  - DONT: "Leave PR body empty"
  - DONT: "Include unrelated changes"
  - DONT: "Skip screenshots for UI changes"

reviewer_etiquette:
  - "Request specific reviewer with context why"
  - "Respect reviewer time: make PRs easy to review"
  - "Respond to comments within 24 hours"
  - "Thank reviewers for thorough feedback"
  - "Don't merge without all comments resolved"
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Empty or minimal description | Reviewer has no context | Always fill in what/why/how |
| GIANT PR (2000+ lines) | Impossible to review properly | Split into logical, reviewable chunks |
| No screenshots for UI | Reviewer must run code to see changes | Always include before/after screenshots |
| Forgetting issue links | PR has no context reference | Template enforces issue link |
| Vague testing description | "Tested locally" without details | List specific test scenarios |
| Mixed concerns | Bug fix + refactor + feature in one PR | One concern per PR |
| No decision rationale | Questions like "why this approach?" unanswered | Document key decisions |
| Missing migration steps | DB changes applied without coordination | Always note deployment steps |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Fill out the template | Consistent structure speeds review |
| Keep PR under 400 lines | Research shows review effectiveness drops sharply after 400 lines |
| One PR = one concern | Easier to review, revert, and understand |
| Screenshots for UI | Visual context that code cannot convey |
| Link issues | Traceability from code to requirement |
| Call out risky changes | Focus reviewer attention where it matters |
| Self-review before submitting | Catches 50%+ of issues before review |
| Respond to feedback with changes, not excuses | Address the concern in code |
| Use Draft PR for early feedback | Get architecture review before implementation detail |
| Write PR description BEFORE the last commit | Describes intent, not just summary |

## Templates & Tools

### Quick PR (Small Change)
```markdown
## Description
Fixes #142 — null pointer when user has no profile

## Type
- [x] 🐛 Bug fix

## Testing
- Added test for null profile edge case
- Manual: verified login with new user (no profile)

## Checklist
- [x] Code follows style
- [x] Self-reviewed
- [x] Tests pass
```

### Hotfix PR
```markdown
## Description
Hotfix for production incident #INC-2026-05-01:
NullPointerException when calculating user score for inactive accounts.

Root cause: ScoreService.GetUserScore() doesn't check user.IsActive flag.

Fix: Added active user check before score calculation.

## Testing
- [x] Unit test for inactive user score = 0
- [x] Manual: reproduced incident scenario → verified fix
- [x] E2E: full user lifecycle test

## Deployment
Critical fix — deploy ASAP. Already merged to release/v2.0 branch.
Hotfix tag: v2.0.1
```

## References
  - references/pr-writer-advanced.md — PR Writer Advanced Topics
  - references/pr-writer-fundamentals.md — PR Writer Fundamentals
  - references/pr-writer-templates.md — PR Templates Reference
  - references/pr-writer-workflow.md — PR Workflow Reference
## Handoff
Hand off to `dev-loop-code-review` for PR review. Hand off to `dev-loop-changelog-generator` for release note generation from PR.

## Implementation Patterns

### PR Description Generator

```python
from typing import List, Dict, Optional
import subprocess
import re
from datetime import datetime

class PRDescriptionGenerator:
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path

    def generate_from_diff(self, branch: str = "HEAD", base: str = "main") -> Dict:
        diff_stat = self._get_diff_stat(branch, base)
        commit_log = self._get_commit_log(branch, base)
        changed_files = self._parse_changed_files(diff_stat)
        return {
            "title": self._generate_title(commit_log),
            "description": self._generate_description(commit_log, changed_files),
            "type": self._detect_pr_type(commit_log),
            "changed_files": changed_files,
            "stats": diff_stat,
        }

    def _get_diff_stat(self, branch: str, base: str) -> str:
        try:
            result = subprocess.run(
                ["git", "diff", f"{base}..{branch}", "--stat"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            return result.stdout
        except subprocess.CalledProcessError:
            return ""

    def _get_commit_log(self, branch: str, base: str) -> List[str]:
        try:
            result = subprocess.run(
                ["git", "log", f"{base}..{branch}", "--oneline", "--format=%s%n%b---"],
                capture_output=True, text=True, cwd=self.repo_path
            )
            return [c.strip() for c in result.stdout.split("---") if c.strip()]
        except subprocess.CalledProcessError:
            return []

    def _parse_changed_files(self, stat: str) -> List[Dict]:
        files = []
        for line in stat.split("\n"):
            match = re.match(r"\s*(.+?)\s*\|\s*(\d+)\s*[+-]+", line)
            if match:
                files.append({"path": match.group(1), "changes": int(match.group(2))})
        return files

    def _generate_title(self, commits: List[str]) -> str:
        if not commits:
            return "feat: update"
        first_commit = commits[0]
        match = re.match(r"^(feat|fix|docs|refactor|perf|test|chore|ci)(\(.+?\))?(!)?: (.+)", first_commit)
        if match:
            return first_commit.split("\n")[0]
        return f"fix: {first_commit[:60].lower()}"

    def _detect_pr_type(self, commits: List[str]) -> str:
        types = {"feat": 0, "fix": 0, "refactor": 0, "docs": 0}
        for commit in commits:
            for t in types:
                if commit.startswith(t):
                    types[t] += 1
        return max(types, key=types.get)

    def _generate_description(self, commits: List[str], files: List[Dict]) -> str:
        lines = []
        if commits:
            lines.append("## Changes")
            for commit in commits[:5]:
                lines.append(f"- {commit.split(chr(10))[0][:100]}")
        lines.append("")
        if files:
            lines.append(f"## Files Modified: {len(files)}")
            for f in files[:10]:
                lines.append(f"- `{f['path']}` ({f['changes']} changes)")
        return "\n".join(lines)

class PRReviewChecklist:
    def __init__(self):
        self.checks = []

    def add_check(self, category: str, description: str, automated: bool = False):
        self.checks.append({
            "category": category,
            "description": description,
            "automated": automated,
        })

    def generate_for_pr(self, pr_data: Dict) -> str:
        automated_checks = [c for c in self.checks if c["automated"]]
        manual_checks = [c for c in self.checks if not c["automated"]]
        lines = ["## Review Checklist\n"]
        if automated_checks:
            lines.append("### Automated Checks")
            for c in automated_checks:
                lines.append(f"- [ ] {c['description']} ({c['category']})")
        if manual_checks:
            lines.append("\n### Manual Review")
            for c in manual_checks:
                lines.append(f"- [ ] {c['description']} ({c['category']})")
        return "\n".join(lines)
```

## Architecture Decision Trees

### PR Merge Strategy

```
What's the PR size and context?
├── Single commit / clean history
│   └── Rebase merge → Preserves individual commits
│
├── Multiple commits, single concern
│   └── Squash merge → Clean single commit on main
│
├── Multiple commits, multiple concerns
│   └── Split into separate PRs first
│
├── Co-authored by multiple developers
│   └── Merge commit → Preserves all authors
│
└── Hotfix for production
    └── Fast-track: squash merge with hotfix label
```

### PR Review Depth Selection

```
What's the risk level?
├── Low (docs, config, tests, formatting)
│   └── Shallow review: correctness, consistency
│
├── Medium (feature, refactor, dependency update)
│   ├── Standard review: logic, edge cases, tests
│   └── At least 1 reviewer from the affected domain
│
├── High (architecture change, data migration, API change)
│   ├── Deep review: design, security, performance, backward compat
│   └── 2+ reviewers including senior/principal
│
└── Critical (auth, payments, PII, breaking change)
    ├── Full audit: security review + architecture review
    └── Mandatory: 2+ reviewers, load test results, rollback plan
```

## Production Considerations

- **PR size enforcement in CI**: Add a CI check that flags PRs exceeding 400 lines changed. Recommend splitting into smaller PRs with a comment template.
- **Auto-labeling based on commit types**: Parse Conventional Commits in the PR title to auto-apply labels (feat → feature, fix → bug).
- **Changelog generation from PRs**: Use PR labels and titles to auto-generate changelog entries on merge. Reduces release overhead by 80%.
- **PR template validation**: Validate PR description against template requirements before allowing submission. Reduce incomplete PRs by 50%.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Leaving PR body empty | Reviewer has zero context about the change | Always use template with what/why/how sections |
| Combining refactor + feature in one PR | Hard to review, risky to revert | Separate PRs: refactor first, feature second |
| Requesting review from everyone | No one feels responsible | Request 1-2 specific reviewers with context |
| Merging without resolving comments | Discussion items remain open | Require all conversations resolved before merge |
| Title doesn't match content | Confusing in changelog and git log | Title must match Conventional Commits format |
| No screenshots for UI changes | Reviewer must run code to see visual impact | Always include before/after screenshots |
| PR that "also fixes" unrelated bugs | Scope creep complicates review | File separate issues, separate PRs |

## Performance Optimization

- **Pre-populate PR description from commits**: Extract commit messages, file list, and diff stats automatically. Saves developer 5-10 minutes per PR.
- **CI-integrated PR size analysis**: Automatically suggest file splits when PR exceeds 400 lines. Flag files with disproportionate change ratio.
- **Template auto-fill**: Use HEAD commit message to pre-fill PR title and type. Use git diff to list all changed files. Developer only writes description.
