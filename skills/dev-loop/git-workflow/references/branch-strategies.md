# Branch Strategies

## Strategy Comparison

| Strategy | When to Use | Complexity | Release Cadence | CI Requirements |
|----------|-------------|------------|-----------------|-----------------|
| Trunk-Based | CI/CD, small teams, daily deploys | Low | Continuous | Strong CI, feature flags |
| GitHub Flow | Simple projects, web apps | Low | On-demand | Good CI |
| Git Flow | Large teams, scheduled releases | High | Scheduled | Moderate CI |
| GitLab Flow | Environment-based deployments | Medium | Varies | Good CI |
| Release Flow | Mobile apps, regulated industries | Medium | Scheduled | Strong CI |

## Trunk-Based Development

The simplest and most recommended strategy. All developers work on short-lived feature branches off `main`.

```
main ──── M1 ──── M2 ──── M3 ──── M4 ──── M5
            \          /          /
             F1 ──────┘    F2 ──┘
```

### Rules

- Branches live < 2 days, ideally < 1 day
- Feature flags hide incomplete features
- No long-lived feature branches
- Direct commits to main only for hotfixes
- CI must pass before merge

### Workflow

```bash
# Start feature
git checkout -b feat/user-profile main
# Make small commits, push daily
git push -u origin feat/user-profile
# Create PR, get review, squash-merge
git checkout main
git pull
# Delete branch locally
git branch -d feat/user-profile
```

### Feature Flags

```typescript
// Hide incomplete work behind flags
if (await featureFlags.isEnabled('new-profile-page')) {
  return <NewProfilePage />
}
return <LegacyProfilePage />
```

## GitHub Flow

A lightweight, PR-based workflow.

```
main ── M1 ── M2 ── M3 ── M4
         \          /
          feat ────┘
```

### Rules

- Branch from `main`, PR back to `main`
- Deploy from `main` after merge
- One branch per feature or fix
- Deploy immediately after merge

### Workflow

```bash
# Create branch
git checkout -b fix/stripe-timeout main

# Make changes
git add -A && git commit -m "fix(payments): handle stripe timeout"

# Push and create PR
git push -u origin fix/stripe-timeout
gh pr create --fill

# After review and merge, deploy
git checkout main && git pull
```

## Git Flow

For projects with scheduled releases and hotfixes.

```
develop ── D1 ── D2 ── D3 ── D4 ── D5 ── D6
            \               /               \
             feature ──────┘   release/v2 ──┘
                                          \
main ── M1 ─────────────────────────────── M2 ── M3
                                              /
                                        hotfix ┘
```

### Branch Types

| Branch | From | Merge To | Purpose |
|--------|------|----------|---------|
| `main` | — | — | Production releases, tagged |
| `develop` | `main` | `main` | Integration branch |
| `feature/*` | `develop` | `develop` | New features |
| `release/*` | `develop` | `main`, `develop` | Release preparation |
| `hotfix/*` | `main` | `main`, `develop` | Production bug fixes |

### Workflow

```bash
# Feature
git checkout -b feature/user-auth develop
# ... work, commits, PR to develop
git checkout develop && git merge --no-ff feature/user-auth

# Release
git checkout -b release/v1.2.0 develop
# ... version bumps, final fixes
git checkout main && git merge --no-ff release/v1.2.0
git tag v1.2.0
git checkout develop && git merge --no-ff release/v1.2.0

# Hotfix
git checkout -b hotfix/1.2.1 main
# ... fix, test
git checkout main && git merge --no-ff hotfix/1.2.1
git tag v1.2.1
git checkout develop && git merge --no-ff hotfix/1.2.1
```

## GitLab Flow

Environment-based branching with staging and production branches.

```
main ── M1 ── M2 ── M3 ── M4
         \          /       \
          feature ──┘        staging ── S1 ── S2
                                              \
                                               production ── P1
```

### Rules

- Feature branches off `main`, merged via PR
- `main` deploys to staging
- `production` branch deploys to production
- Cherry-pick from `main` to `production` for releases

## Branch Naming Conventions

### Standard Format

```
<type>/<ticket-id>-<short-description>
```

### Types

| Prefix | Usage |
|--------|-------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Code restructuring |
| `chore/` | Tooling, CI, dependencies |
| `docs/` | Documentation |
| `test/` | Test additions |
| `perf/` | Performance improvement |
| `hotfix/` | Production hotfix |
| `release/` | Release preparation |
| `experiment/` | Experimental work (delete after) |

### Examples

```
feat/AUTH-42-password-reset
fix/ORD-17-price-calculation
refactor/PAY-03-extract-payment-service
chore/ci-pin-ubuntu-2404
hotfix/1.2.1-null-pointer-metrics
release/v2.0.0
```

### Bad Patterns

```
my-branch          # No type or ticket
alice-fix          # Person name, not descriptive
fix/the-bug        # Too vague
FEATURE-LOGIN      # Uppercase
feature/user_login  # Underscore
a-very-long-branch-name-that-goes-on-forever-and-ever  # Too long
```

## Protection Rules

```yaml
# .github/github-settings.yml
branches:
  - name: main
    protection:
      required_status_checks:
        strict: true
        contexts:
          - "CI / test"
          - "CI / lint"
          - "code-review/approved"
      enforce_admins: true
      required_pull_request_reviews:
        required_approving_review_count: 1
        dismiss_stale_reviews: true
      restrictions: null
```

## Strategy Selection Guide

| Factor | Recommended Strategy |
|--------|---------------------|
| Deploy multiple times per day | Trunk-Based |
| Weekly releases | GitHub Flow |
| Monthly releases with hotfixes | Git Flow |
| Multiple environment stages | GitLab Flow |
| Single developer / small project | GitHub Flow |
| 10+ developers | Trunk-Based + feature flags |
| Mobile app (app store releases) | Release Flow / Git Flow |
| Regulated industry (audit trail) | Git Flow |
| Open source project | GitHub Flow |
