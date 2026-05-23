# PR Review Workflow

## Review Lifecycle

```
Author Creates PR → CI Runs → Reviewers Assigned → Code Review → Revisions → Approval → Merge
                         ↑                          |                              |
                         └── Failed CI ──────────────┘                              |
                                    └── Changes Requested ──────────────────────────┘
```

## Reviewer Responsibilities

### Primary Reviewer
- First to review — within 4 business hours
- Focus: correctness, architecture, security
- Approve or request changes
- Responsible for merge if approved

### Secondary Reviewer
- Reviews after primary approves (or in parallel)
- Focus: clarity, tests, edge cases
- Non-blocking suggestions OK

### Author Responsibilities
- Respond to all comments within 1 business day
- Mark resolved conversations as resolved
- Re-request review after addressing changes
- Self-review before assigning reviewers

## Review Depth Levels

### Level 1: Light Review (15 min)
- **When:** Trivial change, urgent fix, auto-generated code
- **Check:** Correctness, no security issues, test pass
- **Output:** Quick LGTM with specific +1

### Level 2: Standard Review (30-60 min)
- **When:** Feature work, refactors, configuration changes
- **Check:** Full checklist — correctness, architecture, clarity, performance, security, tests
- **Output:** Structured feedback with severity labels

### Level 3: Deep Review (60-120 min)
- **When:** Core infrastructure, security-critical, large refactors, API design
- **Check:** Everything in Level 2 plus threat modeling, performance profiling, API contracts
- **Output:** Written review document, sync meeting recommended

## Comment Severity Labels

| Label | Meaning | Action |
|-------|---------|--------|
| **MUST** | Blocks merge | Must be addressed before merge |
| **SHOULD** | Best practice | Address if feasible, document if deferred |
| **CONSIDER** | Suggestion | Consider for future improvement |
| **QUESTION** | Clarification | Author explains, no code change needed |
| **NIT** | Minor style | Trivial, can be ignored |
| **PRAISE** | Positive | Acknowledges good design/code |

## Review Etiquette

### For Reviewers

```
DO:
- Be specific: "line 42: this variable shadows outer scope"
- Be kind: "This approach works. Consider extracting for testability."
- Reference code: include file:line numbers
- Focus on the code, not the author
- Explain the "why" behind suggestions
- Acknowledge good solutions

DON'T:
- "This is wrong" without explanation
- Subjective feedback without justification ("I don't like this")
- Nitpick style (leave to formatters)
- Request changes on optional suggestions
- Review when tired or distracted
- Gatekeep on personal preferences
```

### For Authors

```
DO:
- Respond to every comment
- Accept feedback gracefully
- Explain design decisions
- Make requested changes promptly
- Re-request review after changes

DON'T:
- Take feedback personally
- Argue every point
- Push without addressing MUST items
- Squash review commits (leave them for reviewer context)
- Merge without approval
```

## Review Velocity

### Targets

| Metric | Target |
|--------|--------|
| Initial response time | < 4 business hours |
| First review complete | < 24 hours |
| Re-review after changes | < 8 hours |
| PR merge time (from open) | < 48 hours |
| Open PRs per developer | < 3 |

### Blockers

- Missing tests
- Failing CI
- Security vulnerabilities
- Unaddressed MUST comments
- Large PR (>400 lines) without justification
- Missing issue reference

## CI Integration

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run lint
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
  
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run typecheck
  
  required-checks:
    needs: [lint, test, typecheck]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All checks passed"
```

### GitHub Branch Protection

```json
{
  "protection": {
    "required_status_checks": {
      "strict": true,
      "contexts": ["lint", "test", "typecheck"]
    },
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true
    },
    "enforce_admins": true
  }
}
```

## Large PR Strategy

For PRs exceeding 400 lines of diff:

1. **Ask to split** — suggest logical decomposition
2. **If cannot split** — focus review on:
   - Public API surface and interfaces
   - Security-critical paths
   - Data model changes
   - Error handling
3. **Skip in deep review**:
   - Auto-generated code
   - Test fixtures
   - Configuration files
   - Formatting-only changes

```bash
# Get diff size
git diff main...HEAD --stat | tail -1
# > 40 files changed, 1200 insertions, 300 deletions

# Consider: can this be 3 PRs of 400 lines each?
```

## Post-Merge Review

For hotfixes or urgent PRs that merged without review:

```markdown
## Post-Merge Review

- **PR**: #123
- **Reason for skipping pre-merge review**: Production outage
- **Reviewer**: @alice
- **Reviewed at**: 2026-05-14
- **Findings**:
  - [ ] Code quality acceptable
  - [ ] Tests adequate
  - [ ] No security concerns
  - [ ] Follow-up items created as issues
```

## Review Automation

### GitHub Actions for auto-assignment

```yaml
name: Auto Assign Reviewers
on: [pull_request]
jobs:
  assign:
    runs-on: ubuntu-latest
    steps:
      - uses: kentaro-m/auto-assign-action@v2
        with:
          configuration-path: .github/auto-assign.yml
```

### CODEOWNERS

```yaml
# .github/CODEOWNERS
# Global owners
* @alice @bob

# Backend ownership
src/api/ @backend-team
src/db/ @data-team

# Frontend ownership
frontend/ @frontend-team

# Infrastructure
Dockerfile @devops-team
.github/workflows/ @devops-team
```

### Auto-merge for trivial PRs

```yaml
name: Auto Merge
on:
  pull_request:
    types: [labeled]
jobs:
  automerge:
    if: contains(github.event.pull_request.labels.*.name, 'auto-merge')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ahmadnassri/action-auto-merge@v2
```
