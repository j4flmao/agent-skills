# Code Review Workflow and Automation

## Overview

This reference covers the end-to-end code review workflow: from pre-commit checks through post-merge monitoring. It includes automation scripts, CI configuration, review routing, SLAs, metrics, and integration with development tools. The goal is to make code review a predictable, efficient, and measurable part of the development lifecycle.

---

## The Code Review Lifecycle

```
[Author]                                   [Reviewer]                            [CI]
    |                                          |                                    |
    |-- Commit code                            |                                    |
    |-- Run pre-commit hooks ---------->----->|                                    |
    |                                          |                                    |
    |-- Push to remote branch                  |                                    |
    |                                          |                                    |-- Trigger CI
    |                                          |                                    |-- Lint, typecheck, test
    |                                          |                                    |-- Build, security scan
    |                                          |                                    |-- Report results
    |                                          |                                    |
    |-- Create PR ------------------------->|  |                                    |
    |                                          |-- Assign reviewer                   |
    |                                          |-- Automated checks gate             |
    |                                          |-- Manual review begins              |
    |                                          |   |-- Correctness pass              |
    |                                          |   |-- Architecture pass             |
    |                                          |   |-- Clarity pass                  |
    |                                          |   |-- Performance pass              |
    |                                          |   |-- Security pass                 |
    |                                          |   |-- Test pass                     |
    |                                          |   |-- Document findings             |
    |                                          |-- Post comments                     |
    |                                          |-- Approve / Request changes          |
    |                                          |                                    |
    |-- Address feedback -->----------------->|                                    |
    |   (iterate)                              |-- Re-review changes                |
    |                                          |-- Re-approve                       |
    |                                          |                                    |
    |-- Merge --------------->---------------->|-- Post-merge:                     |
    |                                          |   |-- Clean up branch              |
    |                                          |   |-- Monitor deployment           |
    |                                          |   |-- Track metrics                |
```

---

## Phase 1: Pre-Commit

### Local Quality Gates

Before a commit is pushed, the author runs pre-commit checks. These catch issues before they reach the reviewer.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
      - id: detect-private-key

  - repo: local
    hooks:
      - id: lint
        name: Lint
        entry: npm run lint
        language: system
        types: [javascript, typescript]
        pass_filenames: false

      - id: typecheck
        name: Type Check
        entry: npm run typecheck
        language: system
        types: [javascript, typescript]
        pass_filenames: false

      - id: test
        name: Quick Tests
        entry: npm run test:related
        language: system
        types: [javascript, typescript]
        pass_filenames: true
```

### Git Hooks Configuration

```bash
#!/bin/sh
# .git/hooks/pre-push
# Runs full validation before push

set -e

echo "Running pre-push checks..."

# Lint
npm run lint || { echo "Lint failed. Fix before pushing."; exit 1; }

# Type check
npm run typecheck || { echo "Type check failed. Fix before pushing."; exit 1; }

# Test
npm test -- --changedSince=main || { echo "Tests failed. Fix before pushing."; exit 1; }

# Security scan
npm audit --audit-level=high || { echo "High-severity vulnerabilities found. Fix before pushing."; exit 1; }

echo "All pre-push checks passed."
```

### Pre-Commit Script (Cross-Platform)

```pwsh
# scripts/pre-commit.ps1
# Source this in git hooks or run manually

$ErrorActionPreference = "Stop"

Write-Host "Running pre-commit checks..." -ForegroundColor Cyan

# Lint
Write-Host "[1/4] Linting..." -NoNewline
$lintResult = & npx eslint . --max-warnings 0 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host $lintResult
    exit 1
}
Write-Host " PASS" -ForegroundColor Green

# Type check
Write-Host "[2/4] Type checking..." -NoNewline
$typeResult = & npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host $typeResult
    exit 1
}
Write-Host " PASS" -ForegroundColor Green

# Tests for changed files
Write-Host "[3/4] Running tests..." -NoNewline
$testResult = & npx jest --findRelatedTests --passWithNoTests 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host $testResult
    exit 1
}
Write-Host " PASS" -ForegroundColor Green

# Security scan
Write-Host "[4/4] Security scan..." -NoNewline
$auditResult = & npm audit --audit-level=high 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "High-severity vulnerabilities found. Fix before pushing."
    exit 1
}
Write-Host " PASS" -ForegroundColor Green

Write-Host "All pre-commit checks passed." -ForegroundColor Green
```

---

## Phase 2: CI Pipeline (Pre-Review)

### Automated Gates

Before a human reviews the code, automated checks must pass. Configure the CI pipeline to block review if any gate fails.

```yaml
# .github/workflows/review-gates.yml
name: Code Review Gates
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
        env:
          ESLINT_MAX_WARNINGS: 0

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage --ci --maxWorkers=2
      - name: Check coverage
        run: |
          $summary = Get-Content coverage/coverage-summary.json | ConvertFrom-Json
          $pct = $summary.total.lines.pct
          if ($pct -lt 80) {
            Write-Host "Coverage: $pct% is below 80% threshold"
            exit 1
          }

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: npm audit
        run: npm audit --audit-level=high
        continue-on-error: true
      - name: Secret scan
        uses: gitleaks/gitleaks-action@v2
        continue-on-error: true

  # Block PR merge if any gate fails
  required-checks-pass:
    needs: [lint, typecheck, test, build, security]
    runs-on: ubuntu-latest
    if: failure()
    steps:
      - run: exit 1
```

### Automated Review Comments via Reviewdog

```yaml
# .github/workflows/reviewdog.yml
name: Reviewdog
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  eslint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - uses: reviewdog/action-eslint@v1
        with:
          reporter: github-pr-review
          level: warning

  misspell:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: reviewdog/action-misspell@v1
        with:
          reporter: github-pr-review
          level: warning
```

### Branch Protection Rules

Configure branch protection to enforce review gates:

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "lint",
      "typecheck",
      "test",
      "build",
      "security"
    ]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true
  },
  "enforce_admins": true,
  "restrictions": {
    "users": [],
    "teams": ["engineering-leads"]
  }
}
```

---

## Phase 3: Reviewer Assignment

### Automatic Reviewer Routing

```yaml
# .github/CODEOWNERS
# Default reviewer
* @team/engineering

# Critical paths
/src/auth/** @team/security-reviewers
/src/payments/** @team/senior-engineers
/src/db/** @team/data-engineers
/src/api/** @team/api-reviewers

# Frontend
/src/components/** @team/frontend-leads
/src/styles/** @team/frontend-leads

# Infrastructure
/deploy/** @team/devops
/terraform/** @team/devops

# Documentation
/docs/** @team/tech-writers
```

### Reviewer Assignment Algorithm

For projects without CODEOWNERS, use a rotation-based assignment:

```python
def assign_reviewer(pr_author, changed_files, team_members, review_history):
    """
    Assign reviewer based on:
    1. File expertise (who has reviewed these files before)
    2. Workload balance (who has fewest open reviews)
    3. Exclude author and recent reviewers of the same author
    """
    eligible = [
        m for m in team_members
        if m != pr_author
        and not has_recently_reviewed(m, pr_author, days=3)
    ]

    if not eligible:
        eligible = [m for m in team_members if m != pr_author]

    # Score by expertise match
    scored = []
    for member in eligible:
        score = 0
        for file in changed_files:
            if has_reviewed(member, file):
                score += 2
            if has_edited(member, file):
                score += 1
        # Penalize high workload
        score -= open_reviews_count(member) * 0.5
        scored.append((score, member))

    # Highest score wins
    scored.sort(reverse=True, key=lambda x: x[0])
    return scored[0][1] if scored else None
```

### Review SLAs

| PR Size | Target SLA | Escalation |
|---------|-----------|------------|
| < 100 lines | 4 hours | Ping reviewer after 6 hours |
| 100-300 lines | 8 hours | Ping reviewer after 12 hours |
| 300-500 lines | 24 hours | Ping reviewer after 36 hours |
| > 500 lines | 48 hours | Ping reviewer after 72 hours |

**Escalation flow**:
1. Ping reviewer directly in the PR (tag @reviewer)
2. Ping reviewer in team chat (Slack, Discord)
3. Escalate to engineering lead
4. If urgent, reassign to available reviewer

---

## Phase 4: Manual Review Process

### Review Session Setup

1. **Check the PR description**: Understand the context, motivation, and testing instructions.
2. **Check the diff**: Understand what changed and why.
3. **Check the tests**: Look at the test file before the implementation to understand expected behavior.
4. **Set a timer**: Aim for 30-60 minute review sessions. Stop and take a break after 60 minutes.
5. **Open relevant files**: Open the changed files + any referenced files (types, interfaces, utilities).

### Review Pass Structure

```
Pass 1: Scan (2-5 minutes)
  - Read PR title and description
  - Scan diff structure (which files changed, how many lines)
  - Identify high-risk files (auth, payments, data layer)
  - Note any files to skip (generated, config, formatting-only)

Pass 2: Deep Read (15-45 minutes depending on diff size)
  - Read each changed file in context of the full function/class
  - Follow data flow: input -> transformation -> output
  - Check error paths, edge cases, and state transitions
  - Verify each dimension: correctness, architecture, clarity, performance, security

Pass 3: Test Review (5-10 minutes)
  - Read test files
  - Verify test coverage matches code changes
  - Check edge cases, not just happy path
  - Ensure tests are deterministic

Pass 4: Documentation (2-5 minutes)
  - Write findings using [MUST]/[SHOULD]/[CONSIDER] format
  - Include at least one positive observation
  - Submit review
```

### Finding Formatting Conventions

Each finding should be independently actionable. A reviewer should be able to fix each issue without reading other findings.

**Good finding**:
```
[MUST] Missing input validation on user email
- File: `src/services/user-service.ts:42`
- Issue: Email is not validated before database insertion
- Why: Invalid or malicious email values can cause DB constraint violations or injection
- Fix: Add email format validation before calling repository.save()
```

**Bad finding**:
```
[MUST] Fix validation (not specific, no file/line, no fix suggestion)
```

### Handling Review Round Trips

After submitting feedback, the author addresses findings:

1. Author pushes new commits addressing feedback.
2. Reviewer is notified of new changes.
3. Reviewer re-checks only the changed areas.
4. If all [MUST] and [SHOULD] items are resolved: approve.
5. If new issues introduced in fix commits: flag them.
6. If author disagrees with a finding: discuss in comments, escalate if needed.

**Limit review rounds**: Maximum 3 round trips. After 3 rounds, the reviewer should either approve or escalate to a third reviewer. Infinite review cycles are counterproductive.

---

## Phase 5: Approval and Merge

### Merge Criteria

```
A PR can merge when ALL of:
  - [ ] All required CI checks pass
  - [ ] All [MUST] findings are resolved
  - [ ] [SHOULD] findings are either resolved or acknowledged with a follow-up ticket
  - [ ] At least one approving review from a qualified reviewer
  - [ ] No unresolved merge conflicts
  - [ ] Branch is up to date with target branch
```

### Merge Strategies

| Strategy | When to Use | Notes |
|----------|-------------|-------|
| Squash merge | Feature branches, single-commit PRs | Cleans up commit history, single commit per PR |
| Rebase merge | Linear history requirement | Preserves individual commits, no merge commits |
| Merge commit | Collaborative branches, multiple authors | Preserves full history, shows merge point |

**Recommendation**: Use squash merge by default. It keeps the main branch history clean while allowing detailed commit history in the feature branch during development.

### Post-Merge Automation

```yaml
# .github/workflows/post-merge.yml
name: Post-Merge Tasks
on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  cleanup:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Delete merged branch
        uses: actions/github-script@v7
        with:
          script: |
            const branch = context.payload.pull_request.head.ref
            if (branch !== 'main') {
              await github.rest.git.deleteRef({
                owner: context.repo.owner,
                repo: context.repo.repo,
                ref: `heads/${branch}`
              })
            }

  deploy-staging:
    needs: cleanup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment..."
          # Trigger deployment pipeline

  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "PR merged: ${{ github.event.pull_request.title }} by ${{ github.event.pull_request.user.login }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Phase 6: Metrics and Improvement

### Review Metrics to Track

| Metric | Definition | Target | Why It Matters |
|--------|------------|--------|----------------|
| Time to first review | Time from PR creation to first reviewer comment | < 4 hours | Blocked time costs productivity |
| Time to merge | Time from PR creation to merge | < 24 hours | Stale PRs cause conflicts and context loss |
| Review depth | Average findings per review | 3-8 findings | Too few = superficial, too many = nitpicking |
| Positive-to-negative ratio | Positive vs. negative comments | > 1:3 | Negative-only reviews demoralize |
| Re-review rate | % of PRs needing > 1 review round | < 30% | High rate indicates unclear standards or poor PRs |
| Must-fix rate | % of PRs with [MUST] findings | < 20% | High rate indicates poor pre-review quality |
| PR size | Average lines changed per PR | < 250 lines | Large PRs are harder to review and have more defects |

### Metrics Collection Script

```pwsh
# scripts/collect-review-metrics.ps1
# Collects code review metrics from GitHub API

param(
    [string]$Repo = "owner/repo",
    [string]$Token = $env:GITHUB_TOKEN,
    [int]$DaysBack = 30
)

$headers = @{
    Authorization = "Bearer $Token"
    Accept = "application/vnd.github.v3+json"
}

$since = (Get-Date).AddDays(-$DaysBack).ToString("yyyy-MM-ddTHH:mm:ssZ")

# Get merged PRs in the time window
$prs = Invoke-RestMethod `
    -Uri "https://api.github.com/repos/$Repo/pulls?state=closed&sort=updated&direction=desc&per_page=100" `
    -Headers $headers

$metrics = @()

foreach ($pr in $prs) {
    if ($pr.merged_at -lt $since) { continue }

    $reviews = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/$Repo/pulls/$($pr.number)/reviews" `
        -Headers $headers

    $comments = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/$Repo/pulls/$($pr.number)/comments" `
        -Headers $headers

    # Calculate metrics
    $firstReview = $reviews | Sort-Object submitted_at | Select-Object -First 1
    $timeToFirstReview = if ($firstReview) {
        [math]::Round(([DateTime]$firstReview.submitted_at - [DateTime]$pr.created_at).TotalHours, 1)
    } else { $null }

    $positiveComments = $comments | Where-Object { $_.body -match "(nice|great|good|excellent|clean)" }
    $negativeComments = $comments | Where-Object { $_.body -match "(must|should|issue|problem|wrong|fix)" }
    $ratio = if ($negativeComments.Count -gt 0) {
        [math]::Round($positiveComments.Count / $negativeComments.Count, 2)
    } else { 1.0 }

    $metrics += [PSCustomObject]@{
        PRNumber = $pr.number
        Title = $pr.title
        Author = $pr.user.login
        LinesChanged = $pr.additions + $pr.deletions
        TimeToFirstReviewHours = $timeToFirstReview
        TimeToMergeHours = [math]::Round(([DateTime]$pr.merged_at - [DateTime]$pr.created_at).TotalHours, 1)
        ReviewCount = $reviews.Count
        CommentCount = $comments.Count
        PositiveNegativeRatio = $ratio
    }
}

# Export to CSV
$metrics | Export-Csv -Path "review-metrics-$((Get-Date).ToString('yyyy-MM')).csv" -NoTypeInformation

# Summary
$summary = @"
## Review Metrics Summary ($(Get-Date).ToString('MMMM yyyy'))
- Total PRs merged: $($metrics.Count)
- Avg time to first review: $(($metrics | Measure-Object TimeToFirstReviewHours -Average).Average) hours
- Avg time to merge: $(($metrics | Measure-Object TimeToMergeHours -Average).Average) hours
- Avg PR size: $(($metrics | Measure-Object LinesChanged -Average).Average) lines
- Avg positive/negative ratio: $(($metrics | Measure-Object PositiveNegativeRatio -Average).Average)
"@

Write-Host $summary
$summary | Out-File -FilePath "review-metrics-summary-$((Get-Date).ToString('yyyy-MM')).md"
```

### Continuous Improvement Cycle

```
1. Collect metrics (monthly)
2. Review metrics in team retro
3. Identify top 1-2 bottlenecks
   - Slow first review? -> Improve reviewer rotation
   - Too many MUST findings? -> Improve pre-commit checks
   - Large PRs? -> Set size limits, teach splitting
4. Implement one change
5. Measure impact next month
6. Repeat
```

---

## Automation Configuration Reference

### ESLint Configuration for PR Review

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "import"],
  "rules": {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "warn",
    "no-debugger": "error",
    "no-duplicate-imports": "error",
    "import/order": ["warn", {
      "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
      "newlines-between": "always",
      "alphabetize": { "order": "asc" }
    }],
    "complexity": ["warn", { "max": 10 }],
    "max-depth": ["warn", { "max": 4 }],
    "max-lines-per-function": ["warn", { "max": 50 }],
    "max-params": ["warn", { "max": 4 }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/strict-boolean-expressions": "error"
  }
}
```

### Danger.js for Automated Review Feedback

```js
// dangerfile.js
// Runs in CI to provide automated review comments

import { danger, warn, fail, message } from "danger";

const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const allFiles = [...modifiedFiles, ...createdFiles];

// 1. Check PR size
const totalLines = danger.github.pr.additions + danger.github.pr.deletions;
if (totalLines > 400) {
  fail(`Large PR detected: ${totalLines} lines changed. Please split into smaller PRs (max 400 lines).`);
} else if (totalLines > 200) {
  warn(`PR is ${totalLines} lines. Consider splitting if possible.`);
}

// 2. Check for missing tests
const hasTestChanges = allFiles.some(f => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__"));
const hasSourceChanges = allFiles.some(f => f.startsWith("src/") && !f.includes(".test.") && !f.includes(".spec."));

if (hasSourceChanges && !hasTestChanges) {
  warn("Source code changes without test changes. Add tests for the new functionality.");
}

// 3. Check for console.log
const consoleLogFiles = allFiles.filter(f => {
  const content = danger.git.diffForFile(f);
  return content && content.includes("console.log");
});
if (consoleLogFiles.length > 0) {
  warn(`console.log found in: ${consoleLogFiles.join(", ")}. Remove before merging.`);
}

// 4. Check for TODO without ticket
allFiles.forEach(file => {
  const content = danger.git.diffForFile(file);
  const todos = (content.match(/TODO/gi) || []).length;
  const withTicket = (content.match(/TODO\([A-Z]+-\d+\)/gi) || []).length;
  if (todos > 0 && withTicket < todos) {
    warn(`"${file}" has TODOs without ticket references. Add ticket numbers to TODOs.`);
  }
});

// 5. Check for large files
allFiles.forEach(file => {
  if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js")) {
    const stats = danger.git.fileMatch(file);
    if (stats && stats.getKeyedPaths().modified.length > 0) {
      // File-level size check handled by linter
    }
  }
});

// 6. Check for package.json changes
if (modifiedFiles.includes("package.json")) {
  const hasLockfileChange = modifiedFiles.includes("package-lock.json");
  if (!hasLockfileChange) {
    fail("package.json modified but package-lock.json is not. Run npm install and commit the lockfile.");
  }
}

// 7. Positive message
message("Thanks for the contribution! The team will review shortly.");
```

### Automated Changelog Generation

```yaml
# .github/workflows/changelog.yml
name: Generate Changelog
on:
  release:
    types: [published]

jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Generate changelog
        uses: conventional-changelog/action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          output-file: CHANGELOG.md
```

---

## Special Review Scenarios

### Security-Critical PRs

Security PRs get additional review steps:

1. Must have at least 2 reviewers (one security specialist).
2. Automated security scan must pass before manual review.
3. Review must cover: CVE fix is correct, no regression in existing security controls, attack surface is documented.
4. Must have regression test that proves the vulnerability was fixed.
5. Merge only after 24-hour review window (even if approved early).

### Hotfix / Emergency PRs

Hotfixes bypass normal review process but have a post-hoc review:

```yaml
hotfix-review:
  after: deployment
  checks:
    - Emergency reviewer approval (can be one person)
    - Automated security scan
    - CI must pass
    - Post-hoc review within 24 hours
    - Root cause analysis added to the incident report
```

### Refactoring PRs

Refactoring PRs should have:
- Zero behavior change (prove with tests)
- Focus on architecture and clarity (not correctness, since behavior is unchanged)
- May skip security review if no security-sensitive code is touched
- Should have before/after metrics (coverage, complexity, coupling)

### Dependency Update PRs

Dependency PRs (Dependabot, Renovate):
- Automated checks: scan changelog, check breaking changes, run full test suite
- Manual review only if: major version bump, breaking changes detected, or high-severity vulnerability
- Group minor/patch updates into weekly batch PRs
- Major updates get individual PRs with change notes

---

## Code Review Etiquette

### For Authors

1. Keep PRs small: < 400 lines, ideally < 250.
2. Write a good PR description: what, why, how to test.
3. Self-review before requesting review. Check your own diff first.
4. Respond to all feedback: acknowledge, fix, or explain why not.
5. Do not merge your own PR without a review (hotfix excluded).
6. If a reviewer does not respond in SLA time, politely ping them in the PR, not in DMs.
7. When addressing feedback, mark conversations as resolved only after the fix is pushed.

### For Reviewers

1. Review within SLA. Blocked authors are wasted productivity.
2. Be respectful. Code reviews are about the code, not the person.
3. Be specific. Always include file, line, and a fix suggestion.
4. Be humble. "I think", "What do you think about", "Consider" go a long way.
5. Focus on what matters. Every finding should be worth the author's time to read and fix.
6. Give positive feedback. Find things done well and say so.
7. If you cannot complete the review in a single session, say so: "Reviewed through line 100, will continue later."
8. Do not leave unresolved comments for trivial matters. If it is not worth fixing, do not mention it.

---

## Tools and Integrations

### GitHub Apps and Bots

| Tool | Purpose | Configuration |
|------|---------|---------------|
| Renovate / Dependabot | Automated dependency updates | Configured in renovate.json / .github/dependabot.yml |
| Mergify | Automated merge queue | Configured in .mergify.yml |
| Danger JS | Automated review comments | dangerfile.js in repo root |
| Reviewdog | Automated linter comments | .github/workflows/reviewdog.yml |
| Codecov / Coveralls | Coverage reporting | CI integration with threshold checks |
| Stale bot | Close stale PRs | .github/stale.yml |

### VS Code Extensions for Reviewing

- **GitLens**: Inline git blame, code lens for PR review
- **GitHub Pull Requests**: Browse and review PRs from VS Code
- **Error Lens**: Inline error display
- **Code Spell Checker**: Catch typos in reviews
- **Better Comments**: Highlight TODO, FIXME, HACK in code

### Local Review Environment Setup

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "git.enableCommitSigning": true,
  "githubPullRequests.ignoredPullRequestBranches": ["main"],
  "gitlens.codeLens.enabled": true,
  "gitlens.hovers.currentLine.enabled": true
}
```

---

## Review Workflow Templates

### PR Description Template

```markdown
## Description
{1-2 sentences on what changed and why}

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Dependency update
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] No console.log/debugger statements
- [ ] Backward compatible (or migration plan documented)

## Related Issues
Closes #{issue-number}
```

### Review Response Template for Authors

When addressing a finding:
```
Addressed in commit abc123:
- Validated email format before DB write
- Added test case for invalid email
- Existing tests still pass
```

### Review Summary Template for Reviewers

After completing a review pass:
```
## Review Summary

Reviewed: {files / scope}
Time spent: {minutes}

### Summary
- [MUST]: {count} -- blocking, must fix before merge
- [SHOULD]: {count} -- best practice, fix before next release
- [CONSIDER]: {count} -- suggestions for future improvement

### Positive
- {what's done well}

Status: {Approved / Changes Requested}
```

---

## References

- `code-review-advanced.md` -- Code Review Advanced Topics
- `code-review-fundamentals.md` -- Code Review Fundamentals
- `code-review-checklist.md` -- Comprehensive Code Review Checklist
- `review-workflow.md` -- Review Workflow
- `security-review-checklist.md` -- Security Review Checklist
- Google Engineering Practices: Code Review
- SmartBear Code Review Best Practices
- Microsoft Code Review Insights
- GitHub Code Review Documentation
- GitLab Merge Request Best Practices
