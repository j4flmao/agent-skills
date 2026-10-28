# Monorepo Advanced Topics

Running a monorepo at scale: correct affected detection, remote caching and its security, hermetic builds with Bazel-class tools, enforcing architectural boundaries, Git performance for large repositories, migrating repositories in with history, and governance of shared code.

## Affected Detection Done Right

Affected builds compare the PR against a base commit and expand to dependents through the project graph.

```bash
# Nx
npx nx affected -t lint test build --base=origin/main --head=HEAD

# Turborepo
npx turbo run build test --affected            # compares against the default branch (GITHUB_BASE_REF in GitHub Actions PRs)
npx turbo run build --filter="...[origin/main]"

# pnpm
pnpm --filter "...[origin/main]" test
```

Correctness requirements:
- CI must fetch enough history to contain the merge base (`fetch-depth: 0` or a computed depth); a shallow clone silently marks everything (or nothing) affected.
- Global inputs (root lockfile, root tsconfig, CI config, toolchain versions) must invalidate everything that depends on them. Declare them as global dependencies (`globalDependencies` in Turborepo, `namedInputs`/`sharedGlobals` in Nx).
- Implicit dependencies (code generation from a schema, environment variables read at build time) must be declared, or the graph is wrong.
- On `main`, run against the last successful main commit (Nx `nrwl/nx-set-shas` action) rather than the previous commit.

## Remote Caching

| Option | Notes |
|--------|-------|
| Nx Cloud / Nx self-hosted caching | Integrated with Nx; distributed task execution |
| Vercel Remote Cache for Turborepo | Hosted |
| Self-hosted Turborepo cache | Implement the Remote Cache API (open-source servers exist) on S3/GCS |
| Bazel remote cache / remote execution | `--remote_cache=grpcs://...`, BuildBuddy, EngFlow, self-hosted bazel-remote |

Cache keys hash inputs (files, env vars, dependency outputs, task config). If an input is missing from the hash, different builds share a key and wrong artifacts are restored.

### Cache security
A writable shared cache is a supply-chain risk: a malicious PR could upload a poisoned artifact under a key that `main` later restores.

- Give untrusted CI jobs (forks, PRs from outside contributors) read-only cache access.
- Write to the cache only from trusted branches/runners.
- Enable artifact signing where supported (Turborepo `"remoteCache": { "signature": true }` in `turbo.json` with `TURBO_REMOTE_CACHE_SIGNATURE_KEY`).
- Never include secrets in task outputs or logs that get cached.
- Declare environment variables that affect output (`env` in `turbo.json`, `inputs` with `{env: ...}` in Nx) so builds with different env values do not collide.

## Hermetic Builds (Bazel, Buck2, Pants)

| Property | JS task runners (Nx/Turbo) | Bazel-class |
|----------|----------------------------|-------------|
| Granularity | Package-level tasks | File/target-level actions |
| Hermeticity | Best effort (host toolchains) | Sandboxed actions, declared toolchains |
| Remote execution | Distributed task execution (Nx Agents) | Native remote execution API |
| Polyglot | Mostly JS/TS ecosystem | First-class many languages |
| Adoption cost | Low | High (BUILD files, rules, toolchains) |

Choose Bazel-class tools when the repo is large and polyglot, builds must be reproducible, and a team can own the build system. Bazel's Bzlmod (`MODULE.bazel`) replaces the legacy `WORKSPACE` file for external dependencies.

```python
# BUILD.bazel (rules_go)
go_library(
    name = "payments",
    srcs = ["payments.go"],
    importpath = "github.com/acme/repo/services/payments",
    visibility = ["//services:__subpackages__"],
    deps = ["//libs/money"],
)
```

`visibility` enforces who may depend on a target at build time.

## Enforcing Boundaries

| Tool | Mechanism |
|------|-----------|
| Nx | `@nx/enforce-module-boundaries` ESLint rule with project tags (`type:app`, `scope:payments`) |
| Turborepo | `turbo boundaries` (checks undeclared/workspace boundary violations) plus tags |
| dependency-cruiser | Rule files for allowed/forbidden imports |
| Bazel | `visibility` attributes |
| Package `exports` | Prevent deep imports into package internals |

```json
// .eslintrc / eslint.config: Nx tag constraints
{
  "depConstraints": [
    { "sourceTag": "type:app", "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"] },
    { "sourceTag": "type:util", "onlyDependOnLibsWithTags": ["type:util"] },
    { "sourceTag": "scope:payments", "onlyDependOnLibsWithTags": ["scope:payments", "scope:shared"] }
  ]
}
```

Enforce in CI; boundaries that are only documented erode quickly.

## Git at Scale

| Problem | Remedy |
|---------|--------|
| Slow clone in CI | Partial clone (`git clone --filter=blob:none`), shallow clone with enough depth for affected detection |
| Slow status in large working trees | `git config core.fsmonitor true`, `core.untrackedCache true` |
| Developers need only part of the repo | Sparse checkout (`git sparse-checkout set apps/web packages/ui`), cone mode |
| Large binary files | Git LFS or store artifacts outside Git |
| Many large repos to tune | `scalar register` applies recommended settings (maintenance, fsmonitor, partial clone) |

```bash
git clone --filter=blob:none --sparse git@github.com:acme/repo.git
cd repo
git sparse-checkout set apps/web packages/ui packages/tsconfig
git maintenance start
```

## Migrating Repositories In

Preserve history when moving a repo into a subdirectory:

```bash
# in a fresh clone of the source repo
git filter-repo --to-subdirectory-filter apps/legacy-api

# in the monorepo
git remote add legacy ../legacy-api
git fetch legacy
git merge --allow-unrelated-histories legacy/main -m "chore: import legacy-api with history"
git remote remove legacy
```

Then: align tooling (lint, tsconfig, test runner), add the project to the task runner, add CODEOWNERS, and remove duplicated CI from the old repo. Migrate incrementally, one repo at a time, and keep the old repo read-only with a pointer to the new location.

## Releases from a Monorepo

- Deployable apps: build once per commit, tag images with the commit SHA, deploy affected apps only.
- Per-app release tags (`api@1.8.0`) or release branches when apps ship on different cadences.
- Published packages: changesets or semantic-release per package; generate changelogs scoped to the package's paths.

## Governance

- A platform/DevEx team owns the build system, CI templates, cache, and upgrade cadence (framework and toolchain upgrades done repo-wide).
- Shared packages have owners and deprecation policies; breaking changes require migrating all consumers in the same PR or providing codemods.
- Track repo health: CI duration (p50/p90), cache hit rate, flaky test rate, time to first green build for new contributors.

## Checklist

- [ ] Affected detection with correct base, enough Git history and declared global inputs
- [ ] Remote cache with read-only access for untrusted jobs and signed artifacts
- [ ] Environment variables and generated inputs included in cache keys
- [ ] Boundaries enforced by lint rules/visibility in CI
- [ ] Partial clone, sparse checkout and fsmonitor documented for large repos
- [ ] History-preserving import process for new repos
- [ ] Ownership and upgrade governance for shared code
