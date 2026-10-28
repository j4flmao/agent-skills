# Dependency Architecture Patterns for Repositories and Monorepos

How to structure dependencies across many packages and services so updates stay cheap: workspace layouts, single-version policies, version catalogs and BOMs, internal package boundaries, and vendoring decisions. Update tooling configuration is covered in `renovate-config.md` and `dependabot-setup.md`.

## Pattern Overview

| Pattern | Idea | Fits |
|---------|------|------|
| Single-version policy (one version per third-party dep across the repo) | One upgrade fixes everything | Monorepos, platform teams |
| Independent versions per package | Each package moves at its own pace | Polyrepos, loosely related services |
| Central version catalog / BOM | Versions declared once, consumed by modules | Gradle, Maven, .NET |
| Internal shared packages | Common code published or linked as workspace packages | Monorepos with libraries |
| Vendoring | Copy dependency source into the repo | Air-gapped builds, Go modules when required |

## JavaScript/TypeScript Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
catalog:
  react: ^19.1.0
  typescript: ~5.9.2
  zod: ^4.1.0
```

```json
// apps/web/package.json
{
  "dependencies": {
    "react": "catalog:",
    "zod": "catalog:",
    "@acme/ui": "workspace:*"
  }
}
```

- pnpm **catalogs** give a single-version policy with one place to bump. Yarn (constraints) and Bun (catalogs) have equivalents.
- `workspace:*` links internal packages; on publish pnpm rewrites it to the real version.
- Enforce with `syncpack` (or pnpm catalog strictness settings in recent pnpm versions); fail CI on mismatched versions.
- Use `pnpm.overrides` (or npm `overrides`, Yarn `resolutions`) to force a patched transitive version; remove overrides once upstream fixes land.

## JVM: Version Catalogs and BOMs

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.2.20"
jackson = "2.20.0"

[libraries]
jackson-bom = { module = "com.fasterxml.jackson:jackson-bom", version.ref = "jackson" }
jackson-databind = { module = "com.fasterxml.jackson.core:jackson-databind" }

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
```

```kotlin
dependencies {
    implementation(platform(libs.jackson.bom))
    implementation(libs.jackson.databind)   // version from BOM
}
```

- Import vendor BOMs (Spring Boot, Jackson, Netty) instead of pinning each module.
- Gradle dependency locking (`dependencyLocking { lockAllConfigurations() }`) gives reproducible resolution; Maven uses `dependencyManagement` and enforcer rules (`dependencyConvergence`).
- Versions shown are examples; take current ones from the catalog's update PRs.

## Python

- uv workspaces: root `pyproject.toml` with `[tool.uv.workspace] members = ["packages/*"]`, one shared `uv.lock`.
- Internal packages referenced with `[tool.uv.sources] mylib = { workspace = true }`.
- Constraints for transitive pins: `[tool.uv] constraint-dependencies = ["urllib3>=2.2.2"]`.

## Go

- One `go.mod` per deployable module; a `go.work` file for local multi-module development (commonly not committed for libraries).
- `go mod tidy` keeps `go.sum` accurate; `GOFLAGS=-mod=mod` vs `vendor` decides whether `vendor/` is used.
- Minimal Version Selection: the highest minimum requirement wins; upgrades are explicit (`go get pkg@v1.2.3`).

## .NET

- Central Package Management: `Directory.Packages.props` with `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>`; projects reference packages without versions.
- `packages.lock.json` with `RestoreLockedMode` in CI.

## Layered Dependency Boundaries

```
apps/*        -> may depend on packages/*, third-party
packages/ui   -> may depend on packages/tokens, react
packages/core -> no framework dependencies
```

Enforce with tooling: Nx module boundaries (`@nx/enforce-module-boundaries`), dependency-cruiser, ArchUnit (JVM), `import-linter` (Python). Keeping heavy or risky dependencies at the edges limits the blast radius of upgrades.

## Wrapping Third-Party Dependencies

Wrap libraries that are likely to be replaced or that leak into many call sites (HTTP clients, logging, feature flags, date libraries) behind a small internal interface. Upgrades and replacements then touch one package.

## Ownership

- CODEOWNERS for manifests and lockfiles per area, so update PRs reach the right reviewers.
- A platform team owns shared catalogs/BOMs and the update bot configuration.
- Each dependency has a known owner or is removed.

## Choosing a Pattern

| Situation | Recommendation |
|-----------|----------------|
| Monorepo, many apps, same framework | Single-version policy via catalog + grouped update PRs |
| Monorepo with apps on different major versions | Catalog with named catalogs (pnpm `catalogs:`) per major |
| Polyrepo microservices | Shared presets (Renovate `extends`) + org-level policies; independent versions |
| Regulated/air-gapped | Internal proxy registry (Artifactory/Nexus), allow-list, optional vendoring |

## Anti-Patterns

- Copy-pasted versions across dozens of manifests.
- Long-lived overrides/resolutions nobody remembers.
- Internal packages depending on apps (cycles).
- Mixing package managers in one workspace.

## Checklist

- [ ] One declared source of truth for versions per ecosystem
- [ ] Lockfiles committed and enforced in CI
- [ ] Module boundary rules enforced by tooling
- [ ] Overrides documented with removal conditions
- [ ] CODEOWNERS on manifests; platform ownership of shared catalogs
