# PR Review Automation

## Automated Checks

### CI Pipeline Gates
```yaml
jobs:
  quality-gates:
    steps:
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - run: npm run build
      - uses: actions/dependency-review-action@v3
      - uses: sonarsource/sonarcloud-github-action@v2
```

### Automated Review Triggers
| Trigger | Action |
|---------|--------|
| PR opened | Run CI, add labels, assign reviewers |
| PR updated | Re-run CI, clear stale approvals |
| Merge conflict | Notify author via comment |
| Test failure | Comment with failure details |
| Coverage drop | Flag for review, block merge if below threshold |

## Label Management

```yaml
# .github/labels.yml
labels:
  - name: "size:XS"
    description: "< 10 lines changed"
    color: "0E8A16"
  - name: "size:S"
    description: "10-50 lines changed"
    color: "BEE96C"
  - name: "size:M"
    description: "50-200 lines changed"
    color: "FBCA04"
  - name: "size:L"
    description: "200-400 lines changed"
    color: "F37F24"
  - name: "size:XL"
    description: "> 400 lines changed"
    color: "B60205"
```

## Review Assignment

### Round-Robin Assignment
```yaml
# .github/CODEOWNERS
# Global reviewers
* @team-core

# Specific paths
src/api/* @team-api
src/database/* @team-data
docs/* @tech-writers
```

### Code Ownership Rules
- Files owned by CODEOWNERS require their approval
- Auto-request reviews from affected teams
- Fallback to team leads if primary reviewer unavailable

## PR Status Checks

### Required Checks
- CI build passes
- No merge conflicts
- At least one approval from CODEOWNER
- All conversations resolved
- Branch up to date with target

### Merge Strategies
| Strategy | When to Use |
|----------|-------------|
| Squash merge | Feature branches, cleanup history |
| Rebase merge | Linear history required |
| Merge commit | Keeping full context of collaboration |

## Changelog Automation

- Use conventional commits to auto-generate changelog
- Label-based categorization (feat, fix, chore, docs)
- Auto-assign semantic version bump based on labels
- Generate release notes from PR titles and labels
