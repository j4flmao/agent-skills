# Dependency Management Best Practices

Condensed, opinionated practices for keeping third-party dependencies current, secure and cheap to maintain. Each practice lists the reason and how to verify it. Tool-specific setup lives in sibling references.

## 1. Lockfiles Everywhere

| Ecosystem | Lockfile | CI install command |
|-----------|----------|-------------------|
| npm | `package-lock.json` | `npm ci` |
| pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |
| Yarn (Berry) | `yarn.lock` | `yarn install --immutable` |
| Bun | `bun.lock` | `bun install --frozen-lockfile` |
| Python (uv) | `uv.lock` | `uv sync --locked` |
| Poetry | `poetry.lock` | `poetry install --sync` (check `poetry check --lock`) |
| Go | `go.sum` | `go mod download` + `go mod verify` |
| Rust | `Cargo.lock` | `cargo build --locked` |
| Ruby | `Gemfile.lock` | `bundle config set frozen true` |
| .NET | `packages.lock.json` | `dotnet restore --locked-mode` |
| Gradle | `gradle.lockfile` | dependency locking enabled |

Why: reproducible builds; supply-chain integrity (hashes). Verify: CI fails if the lockfile is out of date.

## 2. Version Ranges: Ranges in Libraries, Pins in Applications

- Applications: the lockfile pins exact versions; manifests may use ranges or exact versions (Renovate `rangeStrategy: pin` for apps is common).
- Libraries: publish with compatible ranges (`^1.4.0`) so consumers can dedupe; never pin exact transitive versions in a published library.
- Pin infrastructure references fully: GitHub Actions by commit SHA (with version comment), container images by digest for production.

## 3. Update Continuously, in Small Batches

- Automated PRs (Renovate/Dependabot) on a schedule, grouped by ecosystem or related packages (e.g. all `@aws-sdk/*`).
- Auto-merge patch and minor updates for dev dependencies and well-tested runtime deps once CI passes; review majors manually.
- Use a minimum release age (Renovate `minimumReleaseAge`, Dependabot `cooldown`) of a few days before adopting new versions, so compromised or broken releases are often caught by the ecosystem first.

## 4. Treat Security Updates Separately

- Security PRs bypass schedules and grouping rules.
- Define SLAs by severity and exploitability (e.g. critical and reachable: days; low: next regular cycle). Use EPSS/KEV signals and reachability analysis where available to prioritise.
- Dismiss alerts only with a documented reason (not used, not reachable, tolerable risk).

## 5. Minimise the Dependency Surface

- Before adding a dependency, check: maintenance activity, number of maintainers, OpenSSF Scorecard, license, install scripts, transitive footprint, and whether the standard library already does it.
- Remove unused dependencies (`depcheck`/`knip` for JS, `deptry` for Python, `cargo-udeps`, `go mod tidy`).
- Prefer one library per concern (one HTTP client, one date library).

## 6. Separate Runtime and Development Dependencies

- `devDependencies` / dependency groups / `test` scopes keep tooling out of production images.
- Production images install only runtime deps (`npm ci --omit=dev`, `uv sync --no-dev`).

## 7. Keep Runtimes and Base Images Current

- Language runtimes (Node LTS, Python, JDK LTS, Go) are dependencies with end-of-life dates; track them like packages (`.nvmrc`, `.python-version`, `go` directive, toolchain files) and let the update bot bump them.
- Rebuild container images regularly even without code changes to pick up base image patches.

## 8. Licenses

- Maintain an allow-list (e.g. MIT, Apache-2.0, BSD) and a review list (MPL, LGPL); block unknown or strong copyleft for distributed software unless legal approves.
- Enforce with `dependency-review-action` (`allow-licenses`/`deny-licenses`) or a license scanner.

## 9. SBOMs and Inventory

- Generate an SBOM (CycloneDX or SPDX) per release artifact (`syft`, `cdxgen`, ecosystem plugins) and store it with the artifact.
- Keep an org-wide inventory so you can answer "where do we use library X version Y" within minutes of a new CVE.

## 10. Test Coverage Makes Auto-Merge Safe

Auto-merge is only as safe as the test suite. Require integration and smoke tests on update PRs; for libraries with weak coverage, add contract tests around how you use them.

## 11. Document Exceptions

Every pinned-back version, override, ignored update or dismissed alert has: reason, owner, link to upstream issue, and review date. Renovate supports `description` on package rules; keep exceptions in config rather than in people's heads.

## 12. Measure

| Metric | Why |
|--------|-----|
| Median age of dependencies (libyear) | Overall freshness |
| Open security alerts by severity and age | SLA compliance |
| Update PR merge time | Process friction |
| Number of majors behind for key frameworks | Upgrade debt |
| Auto-merge failure rate | Test suite / config health |

## Anti-Patterns

| Anti-pattern | Consequence |
|--------------|-------------|
| No lockfile / `npm install` in CI | Non-reproducible builds, silent changes |
| Batching a year of updates into one PR | Impossible to bisect failures |
| Auto-merging majors | Breaking changes in production |
| Ignoring update PRs until they pile up | Bot noise, team disables the bot |
| Floating `latest` tags for images and actions | Unreviewed changes, supply-chain risk |
| Adding a dependency for a few lines of code | Larger attack surface |

## Checklist

- [ ] Lockfiles committed and enforced in CI
- [ ] Update bot with grouping, schedule, release-age delay, auto-merge policy
- [ ] Security SLA defined and tracked
- [ ] Actions pinned by SHA; images pinned by digest in production
- [ ] License policy enforced in PRs
- [ ] SBOM per release; inventory searchable
- [ ] Exceptions documented with owner and review date
