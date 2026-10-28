# Monorepo Fundamentals

What a monorepo is, when it helps, and the baseline setup: workspace managers per language, repository layout, internal package references, task running, versioning choices, and ownership. Tool-specific depth is in `nx-guide.md`, `turborepo-guide.md` and `monorepo-tools.md`; CI in `monorepo-ci-cd.md`.

## Monorepo vs Polyrepo

| Aspect | Monorepo | Polyrepo |
|--------|----------|----------|
| Cross-project changes | One atomic commit/PR | Coordinated PRs and releases |
| Code sharing | Direct internal packages | Published packages and version bumps |
| Dependency versions | Can enforce one version per dependency | Drift between repos |
| CI | Needs affected-only builds and caching to stay fast | Naturally scoped per repo |
| Access control | Coarse (repo-level), path ownership via CODEOWNERS | Per-repo permissions |
| Tooling investment | Higher as it grows | Lower per repo, higher coordination cost |

A monorepo is not a monolith: services in it can still be deployed independently.

Good fit: shared libraries changing with their consumers, a platform team able to own tooling, a need for consistent standards. Weak fit: unrelated products, strict per-project access requirements, no capacity to maintain build tooling.

## Layout

```text
repo/
  apps/                 deployable units (web, api, workers, mobile)
    web/
    api/
  packages/             shared libraries (ui, config, domain, clients)
    ui/
    eslint-config/
    tsconfig/
  tools/                scripts, generators
  package.json          root: workspace config, dev tooling only
  pnpm-workspace.yaml
  turbo.json | nx.json
  .github/CODEOWNERS
```

Apps depend on packages; packages never depend on apps.

## Workspace Managers

### JavaScript/TypeScript (pnpm)
```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// apps/web/package.json
{
  "name": "@acme/web",
  "private": true,
  "dependencies": {
    "@acme/ui": "workspace:*"
  }
}
```

```bash
pnpm install                                # one lockfile for the repo
pnpm --filter @acme/web dev                 # run in one package
pnpm --filter "@acme/web..." build          # package and its dependencies
pnpm --filter "...[origin/main]" test       # packages changed since main, plus dependents
pnpm -r --parallel lint                     # all packages
```

`workspace:*` links the local package; on publish pnpm rewrites it to the concrete version. npm (`"workspaces"` in package.json), Yarn and Bun workspaces provide similar linking.

### Other ecosystems
| Language | Mechanism |
|----------|-----------|
| Go | Multiple modules + `go.work` for local development, or one module for the whole repo |
| Rust | Cargo workspace (`[workspace] members = [...]`), shared `Cargo.lock` and `target/` |
| Python | uv workspaces (`[tool.uv.workspace] members = [...]`), shared `uv.lock` |
| JVM | Gradle multi-project builds with included builds / version catalogs; Maven multi-module |
| Polyglot at scale | Bazel, Buck2, Pants |

## Internal Packages: Built vs Source

| Mode | How | Trade-off |
|------|-----|-----------|
| Built packages | Each package compiles to `dist/`; `main`/`exports` point to output | Clear boundaries, cacheable builds; extra build step |
| Source (just-in-time) packages | `exports` point to `.ts` source; the app's bundler compiles them | Fast iteration; every consumer must handle TS/transpilation |

Use TypeScript project references or a task runner to build packages in dependency order when using built packages.

## Task Running

A task runner understands the package graph, runs tasks in dependency order, skips unaffected work and caches results.

```json
// turbo.json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "test":  { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "lint":  {},
    "dev":   { "cache": false, "persistent": true }
  }
}
```

`^build` means "build my dependencies first". Declaring `outputs` lets the cache restore artifacts. Nx expresses the same with `targetDefaults` and `dependsOn` in `nx.json`.

## Shared Configuration

- Base configs as packages: `@acme/tsconfig` (`tsconfig.base.json`), `@acme/eslint-config`, Prettier config at root.
- One version per third-party dependency where possible (pnpm `catalog:` entries, syncpack, or Nx/Turbo lint rules).
- Root `package.json` holds only repo tooling; runtime dependencies live in the packages that use them.

## Versioning and Releases

| Strategy | Description | Fits |
|----------|-------------|------|
| Unversioned internal | Packages are private, consumed via workspace links | Apps deployed from the repo |
| Fixed/locked | All published packages share one version | Tightly coupled SDKs |
| Independent | Each package versions separately | Libraries consumed externally |

Changesets is a common tool for independent versioning and changelogs in JS monorepos:

```bash
pnpm changeset            # describe change + bump type per package
pnpm changeset version    # apply version bumps and changelogs
pnpm changeset publish    # publish changed packages
```

## Ownership

```text
# .github/CODEOWNERS
/apps/web/          @acme/web-team
/apps/api/          @acme/backend-team
/packages/ui/       @acme/design-system
/packages/          @acme/platform-team
/.github/           @acme/platform-team
```

Combine with branch protection requiring code-owner review so shared packages are not changed without their owners.

## Common Mistakes

| Mistake | Effect | Fix |
|---------|--------|-----|
| Building and testing everything on every PR | Slow CI | Affected-only tasks + caching |
| Undeclared task outputs or inputs | Stale or missing cache hits | Declare `outputs`/`inputs` precisely |
| Packages importing from apps or deep internal paths | Tangled graph | `exports` fields + boundary lint rules |
| Multiple versions of the same framework | Bundle bloat, subtle bugs | Single-version policy |
| Committing build output | Merge conflicts, stale artifacts | Ignore `dist/`, rely on cache |

## Checklist

- [ ] Workspace manager with a single lockfile
- [ ] `apps/` and `packages/` separation; packages never depend on apps
- [ ] Task runner with dependency-aware, cached tasks
- [ ] Shared configs as packages; single-version policy for key dependencies
- [ ] Versioning strategy chosen; changesets or equivalent for published packages
- [ ] CODEOWNERS with required reviews
