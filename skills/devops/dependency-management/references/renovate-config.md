# Renovate Configuration

## Quick Start

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended"
  ]
}
```

## Presets

```json
{
  "extends": [
    "config:recommended",
    ":dependencyDashboard",
    ":semanticCommits",
    ":separateMajorMinor",
    ":combinePatchMinorUpdates",
    "group:allNonMajor",
    "group:recommended",
    "workarounds:all",
    "npm:unpublishSafe"
  ]
}
```

### Common Presets

| Preset | Effect |
|--------|--------|
| `config:recommended` | Base config, weekdays only, automerge disabled |
| `config:base` | Minimal config, no schedule |
| `config:js-app` | JS app optimized (pin devDeps, auto minor) |
| `config:js-lib` | JS library (widen ranges, peer deps) |
| `group:allNonMajor` | Group all non-major updates into one PR |
| `group:monorepos` | Group monorepo packages (React, Angular) |
| `helpers:disableTypesNodeMajor` | Don't upgrade @types/node major |
| `workarounds:all` | Enable workarounds for known issues |

## Package Rules

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["react", "react-dom", "@types/react"],
      "groupName": "React",
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchDepTypes": ["devDependencies"],
      "groupName": "Dev Dependencies",
      "schedule": ["before 9am on monday"],
      "automerge": true,
      "matchUpdateTypes": ["patch"]
    },
    {
      "matchPackagePatterns": ["^@org/"],
      "enabled": false
    },
    {
      "matchUpdateTypes": ["major"],
      "labels": ["major-update"],
      "assignees": ["tech-lead"],
      "automerge": false,
      "reviewers": ["team:core"]
    },
    {
      "matchFileNames": ["packages/**"],
      "separateMinorPatch": true
    }
  ]
}
```

## Host Rules

```json
{
  "hostRules": [
    {
      "matchHost": "https://npm.pkg.github.com",
      "token": "{{ secrets.GH_TOKEN }}"
    },
    {
      "matchHost": "https://private-registry.example.com",
      "username": "bot",
      "password": "{{ secrets.REGISTRY_PASSWORD }}"
    },
    {
      "matchHost": "docker.io",
      "matchLanguages": ["docker"],
      "concurrentRequestLimit": 2
    }
  ]
}
```

## Custom Managers

```json
{
  "customManagers": [
    {
      "customType": "regex",
      "fileMatch": ["(^|/)\\..+\\.yaml$"],
      "matchStrings": ["docker://(?<depName>.*?):(?<currentValue>.*?) "],
      "datasourceTemplate": "docker"
    },
    {
      "customType": "regex",
      "fileMatch": ["Dockerfile"],
      "matchStrings": ["ARG VERSION=(?<currentValue>.*?)\\n"],
      "datasourceTemplate": "npm"
    }
  ]
}
```

## Docker-Specific

```json
{
  "docker": {
    "pinDigests": true,
    "major": {
      "enabled": true
    },
    "minor": {
      "automerge": true
    }
  },
  "packageRules": [
    {
      "matchDatasources": ["docker"],
      "matchPackageNames": ["node"],
      "allowedVersions": "<=22"
    }
  ]
}
```

## GitHub Actions Config

```json
{
  "github-actions": {
    "enabled": true,
    "pinDigests": true
  },
  "packageRules": [
    {
      "matchManagers": ["github-actions"],
      "groupName": "GitHub Actions",
      "automerge": true
    }
  ]
}
```

## Dependency Dashboard

Renovate creates a dashboard issue in the repository showing:
- All pending updates grouped by type
- Rate-limited PRs waiting to be created
- Config validation warnings
- Manual action required items

```json
{
  "dependencyDashboard": true,
  "dependencyDashboardTitle": "Renovate Dashboard",
  "dependencyDashboardHeader": "Automated dependency updates",
  "dependencyDashboardApproval": true
}
```

## Configuration Options

| Option | Purpose |
|--------|---------|
| `prConcurrentLimit` | Max open PRs at once (default 10) |
| `prHourlyLimit` | Max PRs per hour (default 2) |
| `rangeStrategy` | How to update version ranges |
| `lockFileMaintenance` | Keep lockfile fresh |
| `separateMinorPatch` | Minor and patch in separate PRs |
| `separateMajorMinor` | Major separate from minor/patch |
| `recreateClosed` | Re-create closed PRs if updates still pending |
| `rebaseWhen` | When to rebase PRs (auto, conflict, never) |
| `stabilityDays` | Wait N days after publish before creating PR |
| `minimumReleaseAge` | Minimum days since release before updating |
