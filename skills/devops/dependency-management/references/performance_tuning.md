# Dependency Performance Tuning: Install Speed, CI Caching and Bot Throughput

Two kinds of performance matter in dependency management: how fast dependencies install and build (developer and CI time), and how efficiently the update process runs (bot PR volume, CI minutes spent on update PRs). This reference covers both.

## Measure First

| What | How |
|------|-----|
| Install time | Time `npm ci` / `pnpm install --frozen-lockfile` / `uv sync` cold vs warm cache in CI logs |
| Cache hit rate | Cache step logs (`Cache restored from key`) |
| Dependency count | `npm ls --all | wc -l`, `pnpm list -r --depth Infinity`, `uv tree` |
| Install size | `du -sh node_modules`, `.venv` |
| CI minutes on bot PRs | CI usage report filtered by author (dependabot/renovate) |

## JavaScript Install Speed

### Package Manager Choice

- pnpm uses a content-addressable store with hard links: fast installs and small disk usage in monorepos.
- Bun installs are fast and use a global cache; check compatibility with your tooling.
- npm `ci` is reliable; enable caching of `~/.npm`.

### CI Caching (GitHub Actions)

```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm               # caches the pnpm store keyed on pnpm-lock.yaml
- run: pnpm install --frozen-lockfile
```

- Cache the **package manager store**, not `node_modules`, for npm and pnpm; restoring `node_modules` across Node versions or OSes causes subtle breakage.
- Key caches on the lockfile hash plus OS and runtime version.

### Reduce Work

- `--prefer-offline` uses cached metadata when possible.
- Skip unnecessary lifecycle scripts; pnpm 10 runs dependency install scripts only for packages in `onlyBuiltDependencies`.
- Avoid downloading large binaries in CI when unused (e.g. Playwright browsers only in E2E jobs; `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` elsewhere, Cypress `CYPRESS_INSTALL_BINARY=0`).
- In monorepos, install only what a job needs: `pnpm install --filter ./apps/web...` or Turborepo `turbo prune` for Docker builds.

## Python

```yaml
- uses: astral-sh/setup-uv@v6
  with:
    enable-cache: true          # caches uv's cache keyed on uv.lock
- run: uv sync --locked
```

- uv resolves and installs much faster than pip; prefer wheels and avoid source builds (`--only-binary` style constraints when possible).
- Prune the cache in CI (`uv cache prune --ci`) to keep only what cannot be re-downloaded cheaply.

## JVM

- Gradle: `gradle/actions/setup-gradle` caches dependencies and build outputs; enable configuration cache and build cache.
- Maven: `actions/setup-java` with `cache: maven`; use a repository manager (Nexus/Artifactory) close to CI runners.

## Go and Rust

- Go: cache `~/go/pkg/mod` and build cache (`actions/setup-go` caches by default using `go.sum`).
- Rust: `Swatinem/rust-cache` caches `~/.cargo` and `target/` keyed by `Cargo.lock`.

## Docker Builds

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    corepack enable && pnpm install --frozen-lockfile
```

- Copy manifests and lockfiles before source code so dependency layers stay cached.
- BuildKit cache mounts keep package caches between builds; registry cache (`--cache-to type=registry`) shares them across CI runners.

## Registry Proxies

An internal proxy (Artifactory, Nexus, Verdaccio for npm, devpi for Python, Athens/GOPROXY for Go) cuts latency, protects against upstream outages and provides an audit point. Configure CI and developer machines to use it by default.

## Update Bot Throughput

| Problem | Tuning |
|---------|--------|
| Too many PRs | Group related packages; weekly schedule; `prConcurrentLimit` / `open-pull-requests-limit` |
| Rebase storms after each merge | Renovate `rebaseWhen: "conflicted"`; Dependabot rebases automatically, so merge in batches |
| CI cost per update PR | Run a reduced pipeline for dev-dependency-only changes (path filters) while keeping full CI for runtime deps |
| Lockfile churn | Monthly `lockFileMaintenance` instead of constant transitive updates |
| Slow Renovate runs on large monorepos | Self-hosted Renovate with repository cache, limit `ignorePaths`, use `onboarding` presets |

Renovate rate limits:

```json5
{
  prHourlyLimit: 4,
  prConcurrentLimit: 10,
  branchConcurrentLimit: 15,
  rebaseWhen: "conflicted",
}
```

## Reducing Dependency Weight

- Remove unused packages (`knip`, `depcheck`, `deptry`, `cargo machete`).
- Replace heavy libraries with lighter alternatives or platform APIs (e.g. native `fetch`, `structuredClone`, `Intl`).
- Deduplicate: `npm dedupe`, `pnpm dedupe`; multiple major versions of the same library inflate install and bundle size.
- Check new dependencies' install size and transitive count before adding them.

## Checklist

- [ ] Caches keyed on lockfile + OS + runtime; store caches rather than `node_modules`
- [ ] Docker layers ordered for dependency caching; BuildKit cache mounts
- [ ] Registry proxy close to CI runners
- [ ] Bot PR volume controlled by grouping, schedules and limits
- [ ] Lockfile maintenance batched
- [ ] Unused and duplicate dependencies removed regularly
