# Branch Strategy Reference

## Trunk-based Development (Recommended)

### Branch Lifecycle

```
main ──── feat/order-filters ──── main ──── fix/payment-timeout ──── main ────
         (squash merge)                    (squash merge)
```

| Branch | Source | Merge To | Lifetime | Naming |
|---|---|---|---|---|
| `main` | — | — | Permanent | `main` or `master` |
| Feature | `main` | `main` | <2 days | `feat/{description}` |
| Fix | `main` | `main` | <1 day | `fix/{description}` |
| Chore | `main` | `main` | <1 day | `chore/{description}` |
| Hotfix | `main` | `main` | <4 hours | `hotfix/{description}` |

### Commit Convention

```
{type}({scope}): {imperative description}

Types: feat, fix, chore, docs, refactor, test, style, perf, ci, build
Scope: component, module, or service name (optional)

Examples:
feat(orders): add filtering by date range
fix(payment): handle Stripe timeout gracefully
chore: upgrade eslint to v9
docs(api): document rate limiting behavior
```

### Merge Strategies

| Strategy | When | What happens |
|---|---|---|
| **Squash merge** | Feature/fix → main | All commits become one commit on main |
| **Rebase + merge** | Hotfix → main | Linear history, no merge commit |
| **Merge commit** | Release branches | Preserves full history with merge commit |

**Default**: Squash merge for feature branches.

## GitFlow (Only When Required)

```
master ── hotfix ── master (tag)
  │
  └── develop ── feature/A ── develop ── release/1.2 ── master (tag)
```

| Branch | Purpose | Base |
|---|---|---|
| `master` | Production releases | — |
| `develop` | Integration branch | `master` |
| `feature/*` | Feature work | `develop` |
| `release/*` | Release preparation | `develop` |
| `hotfix/*` | Emergency production fix | `master` |

**When to use**:
- Mobile apps with app store submission cycles
- Multiple concurrent production versions
- Strict semantic versioning with backport requirements

## Branch Protection Rules

```yaml
# GitHub branch protection for main
branches:
  main:
    required_status_checks:
      contexts: ["ci/test", "ci/lint", "ci/build"]
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
    restrictions: null  # allow any team member
```

## Pre-commit Hooks

```yaml
# .husky/pre-commit or .githooks/pre-commit
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: ['--maxkb=500']
```

## Commit Message Template

```
.gitmessage file:
# {type}({scope}): {subject}
# <blank line>
# {body (optional)}
# <blank line>
# {footer (optional)}
#
# Types: feat, fix, chore, docs, refactor, test, style, perf, ci, build
# Scope: optional, e.g., orders, payment, auth
# Subject: imperative, <=72 chars
# Footer: closes #123, BREAKING CHANGE: ...
```
