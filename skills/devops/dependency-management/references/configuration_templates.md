# Dependency Management Configuration Templates

Copy-ready configuration files for common setups. Adjust schedules, groups and reviewers to your organisation. Explanations of each option are in `dependabot-setup.md`, `renovate-config.md` and `lock-file-resolution.md`.

## Dependabot: Multi-Ecosystem Repository

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
      day: monday
      time: "06:00"
      timezone: Europe/Berlin
    open-pull-requests-limit: 10
    cooldown:
      default-days: 3
      semver-major-days: 14
    groups:
      dev-tooling:
        dependency-type: development
        update-types: [minor, patch]
      aws-sdk:
        patterns: ["@aws-sdk/*"]
    ignore:
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]
    labels: [dependencies]
    commit-message:
      prefix: "chore(deps)"
      prefix-development: "chore(dev-deps)"

  - package-ecosystem: uv
    directory: "/services/api"
    schedule: { interval: weekly }

  - package-ecosystem: docker
    directories: ["/services/*"]
    schedule: { interval: weekly }

  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: weekly }
    groups:
      actions:
        patterns: ["*"]
```

Security updates are configured in repository settings and ignore `schedule`; grouped security updates can be enabled with `applies-to: security-updates` on a group.

## Dependabot: Private Registry

```yaml
version: 2
registries:
  npm-internal:
    type: npm-registry
    url: https://npm.internal.example.com
    token: ${{ secrets.NPM_INTERNAL_TOKEN }}    # a Dependabot secret, not an Actions secret
updates:
  - package-ecosystem: npm
    directory: "/"
    registries: [npm-internal]
    schedule: { interval: daily }
```

## Renovate: Organisation Preset

```json5
// renovate-config repo: default.json (referenced as "local>acme/renovate-config")
{
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  extends: [
    "config:recommended",
    ":dependencyDashboard",
    ":semanticCommits",
    "helpers:pinGitHubActionDigests",
  ],
  timezone: "Europe/Berlin",
  schedule: ["before 6am on monday"],
  minimumReleaseAge: "3 days",
  prConcurrentLimit: 10,
  prHourlyLimit: 4,
  vulnerabilityAlerts: { labels: ["security"], schedule: ["at any time"] },
  lockFileMaintenance: { enabled: true, schedule: ["before 6am on the first day of the month"] },
  packageRules: [
    {
      description: "Auto-merge non-major dev dependencies",
      matchDepTypes: ["devDependencies"],
      matchUpdateTypes: ["minor", "patch"],
      automerge: true,
    },
    {
      description: "Group AWS SDK v3",
      matchPackageNames: ["@aws-sdk/**"],
      groupName: "aws-sdk",
    },
    {
      description: "Majors need review by platform team",
      matchUpdateTypes: ["major"],
      reviewers: ["team:platform"],
      dependencyDashboardApproval: true,
    },
  ],
}
```

Repository `renovate.json`:

```json
{ "extends": ["local>acme/renovate-config"] }
```

## Renovate: Application vs Library

```json5
{
  packageRules: [
    { matchFileNames: ["apps/**"], rangeStrategy: "pin" },
    { matchFileNames: ["packages/**"], rangeStrategy: "widen" },
  ],
}
```

## Auto-Merge Workflow for Dependabot

```yaml
# .github/workflows/dependabot-automerge.yml
name: dependabot-automerge
on: pull_request
permissions:
  contents: write
  pull-requests: write
jobs:
  automerge:
    if: github.event.pull_request.user.login == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - id: meta
        uses: dependabot/fetch-metadata@v2
      - if: steps.meta.outputs.update-type != 'version-update:semver-major'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`--auto` merges only after required status checks pass, so branch protection must require CI.

## Dependency Review Gate

```yaml
# .github/workflows/dependency-review.yml
name: dependency-review
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          deny-licenses: GPL-3.0-only, AGPL-3.0-only
          comment-summary-in-pr: on-failure
```

## npm / pnpm Hardening

```ini
# .npmrc
engine-strict=true
save-exact=true
audit-level=high
@acme:registry=https://npm.internal.example.com
```

```yaml
# pnpm-workspace.yaml (pnpm 10: dependency install scripts are blocked unless allowed)
onlyBuiltDependencies:
  - esbuild
  - sharp
```

## Python (uv)

```toml
# pyproject.toml
[project]
requires-python = ">=3.12"
dependencies = ["httpx>=0.27", "pydantic>=2.7"]

[dependency-groups]
dev = ["pytest>=8", "ruff>=0.6", "mypy>=1.11"]

[tool.uv]
constraint-dependencies = ["urllib3>=2.2.2"]   # floor for a transitive security fix
```

CI: `uv sync --locked`; update with `uv lock --upgrade-package httpx`.

## .NET Central Package Management

```xml
<!-- Directory.Packages.props -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Serilog" Version="4.0.0" />
  </ItemGroup>
</Project>
```

## CODEOWNERS for Manifests

```
# .github/CODEOWNERS
**/package.json           @acme/platform
**/pnpm-lock.yaml         @acme/platform
/.github/dependabot.yml   @acme/platform
renovate.json             @acme/platform
```

## Checklist

- [ ] One bot per repository (do not run Dependabot version updates and Renovate together)
- [ ] Groups, schedules and limits set to avoid PR floods
- [ ] Release-age delay configured
- [ ] Auto-merge limited to non-major updates behind required checks
- [ ] Dependency review and license gate on PRs
- [ ] Private registry credentials stored as Dependabot secrets / Renovate encrypted secrets
