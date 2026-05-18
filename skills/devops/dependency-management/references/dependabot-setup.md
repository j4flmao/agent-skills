# Dependabot Setup

## Basic Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

## Supported Ecosystems

| Ecosystem | `package-ecosystem` | Package file |
|-----------|---------------------|--------------|
| npm | `npm` | `package.json`, `package-lock.json` |
| yarn | `npm` | `package.json`, `yarn.lock` |
| pnpm | `npm` | `package.json`, `pnpm-lock.yaml` |
| pip | `pip` | `requirements.txt`, `Pipfile` |
| poetry | `pip` | `pyproject.toml`, `poetry.lock` |
| Maven | `maven` | `pom.xml` |
| Gradle | `gradle` | `build.gradle`, `build.gradle.kts` |
| Go | `gomod` | `go.mod` |
| Cargo | `cargo` | `Cargo.toml` |
| NuGet | `nuget` | `*.csproj`, `*.vbproj` |
| Docker | `docker` | `Dockerfile` |
| Terraform | `terraform` | `*.tf` |
| GitHub Actions | `github-actions` | `action.yml`, workflow files |

## Full Configuration Options

```yaml
version: 2
registries:
  npm-github:
    type: npm-registry
    url: https://npm.pkg.github.com
    token: ${{ secrets.GH_PACKAGES_TOKEN }}

updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/New_York"
    versioning-strategy: "increase"
    open-pull-requests-limit: 10
    rebase-strategy: "auto"
    labels:
      - "dependencies"
      - "npm"
    reviewers:
      - "my-org/security-team"
    assignees:
      - "bot-maintainer"
    milestone: 5
    commit-message:
      prefix: "fix"
      prefix-development: "chore"
      include: "scope"

    # Target branch (default: default branch)
    target-branch: "main"

    # Allow only direct dependencies
    allow:
      - dependency-type: "direct"

    # Specific dependency rules
    ignore:
      - dependency-name: "typescript"
        versions: [">=5.6.0"]
      - dependency-name: "webpack"
        update-types: ["version-update:semver-major"]

    # Vendor dependencies (instead of downloading)
    vendor: true

    # Custom PR body
    pull-request-branch-name:
      separator: "-"
```

## Multi-Directory Setup (Monorepo)

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "npm"
    directory: "/packages/shared-ui"
    schedule:
      interval: "weekly"

  - package-ecosystem: "npm"
    directory: "/packages/shared-utils"
    schedule:
      interval: "weekly"

  - package-ecosystem: "docker"
    directory: "/apps/web"
    schedule:
      interval: "weekly"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

## Versioning Strategies

| Strategy | Effect |
|----------|--------|
| `lockfile-only` | Update lockfile only, keep manifest |
| `auto` | Update manifest within semver range |
| `widen` | Widen semver range (^1.0.0 → ^1.1.0) |
| `increase` | Update to new minimum (^1.0.0 → ^2.0.0) |
| `increase-if-necessary` | Only increase if required by new version |

## Ignoring Updates

```yaml
ignore:
  # Ignore specific package
  - dependency-name: "express"

  # Ignore major updates
  - dependency-name: "react"
    update-types: ["version-update:semver-major"]

  # Ignore by version range
  - dependency-name: "node-fetch"
    versions: [">=3.0.0"]
```

## Security Updates

```yaml
# Dependabot security updates are enabled by default
# When GitHub Advisory Database reports a vulnerability
# Dependabot automatically creates a PR with the fix
# To disable:
# Settings → Code security → Dependabot → Disable
```
