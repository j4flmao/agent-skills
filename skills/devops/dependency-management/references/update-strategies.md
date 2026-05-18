# Update Strategies

## Semver Strategy Comparison

| Strategy | Behavior | Risk | PR volume |
|----------|----------|------|-----------|
| Pin exact | Lock to exact version | Low | High |
| Caret (^) | Allow minor and patch | Medium | Low |
| Tilde (~) | Patch only | Low | Medium |
| Wildcard (*) | Any version | High | Very low |
| RangeStrategy=bump | Update to minimum version | Medium | Medium |

## Grouping Strategies

### Dependabot
```yaml
# Dependabot groups (GitHub native)
updates:
  - package-ecosystem: "npm"
    groups:
      production-deps:
        dependency-type: "production"
        update-types:
          - "minor"
          - "patch"
      dev-deps:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
```

### Renovate
```json
{
  "packageRules": [
    {
      "groupName": "All non-major npm",
      "matchManagers": ["npm"],
      "matchUpdateTypes": ["minor", "patch"],
      "groupSlug": "npm-non-major"
    },
    {
      "groupName": "React ecosystem",
      "matchPackageNames": ["react", "react-dom", "@types/react"],
      "groupSlug": "react"
    },
    {
      "groupName": "Linting tools",
      "matchPackagePatterns": ["eslint", "prettier", "@typescript-eslint/*"],
      "groupSlug": "linting"
    }
  ]
}
```

## Batching Strategy

```json
{
  "schedule": ["before 9am on monday"],
  "prHourlyLimit": 2,
  "prConcurrentLimit": 5,
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "schedule": ["at any time"],
      "automerge": true,
      "prPriority": 10
    },
    {
      "matchUpdateTypes": ["minor"],
      "schedule": ["before 9am on monday"],
      "groupName": "Minor updates"
    },
    {
      "matchUpdateTypes": ["major"],
      "schedule": ["before 9am on monday"],
      "labels": ["major"]
    }
  ]
}
```

## Pinning Strategy

```json
{
  "rangeStrategy": "pin",
  "packageRules": [
    {
      "matchDepTypes": ["dependencies"],
      "rangeStrategy": "pin"
    },
    {
      "matchDepTypes": ["devDependencies"],
      "rangeStrategy": "auto"
    },
    {
      "matchDepTypes": ["peerDependencies"],
      "rangeStrategy": "widen"
    }
  ]
}
```

## Pin vs Range

| Approach | package.json | Pros | Cons |
|----------|-------------|------|------|
| Pin | `"react": "18.2.0"` | Reproducible builds | Manual updates, many PRs |
| Caret | `"react": "^18.2.0"` | Automatic minor/patch | Inconsistent installs without lockfile |
| Lockfile | `package.json` loose, `lockfile` exact | Best of both | Must commit lockfile |

## Best Practices

- **Apps**: Pin exact versions for production deps, caret for dev deps
- **Libraries**: Widen ranges for deps, pin for dev deps
- **Monorepo**: Use `workspace:*` for internal deps (always latest)
- **Security**: Enable automated patch updates with immediate merge
- **Major versions**: Always manual review, staged rollout
- **Lockfile**: Always commit, always validate with `--frozen-lockfile` in CI
- **Docker**: Pin digests for base images, update with Renovate
- **GitHub Actions**: Pin to SHA256 digest, not version tags

## Update Flow Decision

```
New version available
├── Major (1.x → 2.x)
│   └── Manual PR, team review, changelog check
├── Minor (1.0.x → 1.1.x)
│   └── Automated PR, CI check, auto-merge if green
└── Patch (1.0.0 → 1.0.1)
    └── Auto-merge after CI + brief stability window
```

## Renovate Schedule Examples

```json
{
  "schedule": ["before 9am on monday"],
  "schedule": ["every weekend"],
  "schedule": ["after 10pm and before 5am every day"],
  "schedule": ["every 2 weeks on friday"],
  "schedule": ["at any time"]
}
```

## Stability Window

```json
{
  "minimumReleaseAge": "3 days",
  "stabilityDays": 3,
  "internalChecksFilter": "strict",
  "vulnerabilityAlerts": {
    "minimumReleaseAge": null,
    "stabilityDays": 0
  }
}
```
