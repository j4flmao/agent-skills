# Dependency Management Troubleshooting Matrix

Symptom-to-fix tables for common dependency problems: lockfile conflicts, resolution failures, update bots not behaving, CI install errors and runtime breakage after upgrades. Use the diagnostic commands to confirm the cause before applying a fix.

## Lockfile and Install Failures

| Symptom | Likely cause | Diagnose | Fix |
|---------|--------------|----------|-----|
| `npm ci` fails: lockfile out of sync with `package.json` | Manifest edited without reinstall | `npm install --package-lock-only` locally and diff | Regenerate lockfile, commit both files |
| `pnpm install --frozen-lockfile` fails with `ERR_PNPM_OUTDATED_LOCKFILE` | Same as above, or different pnpm major | `pnpm --version` vs `packageManager` field | Pin pnpm via `packageManager` + Corepack; `pnpm install` and commit |
| `uv sync --locked` fails | `pyproject.toml` changed, `uv.lock` stale | `uv lock --check` | `uv lock`, commit |
| `cargo build --locked` fails | `Cargo.lock` needs update | `cargo update -w --dry-run` | `cargo update -p <crate>` deliberately |
| `go: updates to go.mod needed` | Missing `go mod tidy` | `go mod tidy -diff` (Go 1.23+) | `go mod tidy`, commit `go.mod` + `go.sum` |
| Merge conflict in lockfile | Two branches changed deps | | Never hand-merge: take one side, rerun install to regenerate, review the diff |

## Resolution Conflicts

| Symptom | Cause | Fix |
|---------|-------|-----|
| npm `ERESOLVE unable to resolve dependency tree` | Peer dependency conflict (npm 7+ installs peers strictly) | Upgrade the plugin that declares the old peer range; temporary `overrides`; avoid `--legacy-peer-deps` as a permanent fix |
| Two copies of React/framework singleton at runtime ("Invalid hook call") | Duplicate versions in tree | `npm ls react` / `pnpm why react`; dedupe, align versions, use peer deps in libraries |
| Python `ResolutionImpossible` / uv "no solution found" | Incompatible upper bounds | `uv tree --invert --package X`; loosen bounds or upgrade the constraining package |
| Maven picks unexpected version | Nearest-wins mediation | `mvn dependency:tree -Dverbose`; manage version in `dependencyManagement` / import BOM |
| Gradle version conflict | Highest-wins with constraints/rich versions | `./gradlew dependencyInsight --dependency X --configuration runtimeClasspath`; use platform/BOM or `strictly` |
| Go module requires newer Go | `go` directive / toolchain | Update toolchain or pin dependency version |

## Update Bot Problems

| Symptom | Cause | Fix |
|---------|-------|-----|
| Dependabot opens no PRs | Wrong `directory`, unsupported ecosystem name, PR limit reached, or config error | Check "Dependabot" tab / insights logs; validate YAML; raise `open-pull-requests-limit` |
| Dependabot cannot reach private registry | Token stored as Actions secret instead of Dependabot secret | Add Dependabot secret; reference in `registries` |
| Renovate does nothing in repo | Not onboarded, config validation error, or schedule window | Dependency Dashboard issue, Renovate logs; `npx --package renovate renovate-config-validator` |
| Too many PRs | No grouping/limits | Groups, weekly schedule, concurrency/hourly limits |
| Same broken version proposed repeatedly | No ignore rule | Ignore that version with a reason, or `allowedVersions` |
| Auto-merge never happens | Branch protection lacks required checks, or auto-merge disabled in repo settings | Enable "Allow auto-merge"; require status checks |
| Both Dependabot and Renovate opening PRs | Both enabled | Choose one for version updates; Dependabot security alerts can stay on |

## CI and Environment

| Symptom | Cause | Fix |
|---------|-------|-----|
| Works locally, fails in CI | Different runtime/package manager version, or cached `node_modules` | Pin versions (`.nvmrc`, `packageManager`, `.python-version`); cache stores, not installed trees |
| Native module build fails (`node-gyp`, wheels building from source) | Missing prebuilt binary for platform/runtime version | Use supported runtime version; install build tools; choose packages with prebuilt binaries |
| `EINTEGRITY` / hash mismatch | Corrupted cache or tampered artefact | Clear cache (`npm cache clean --force`, `uv cache clean`); if persistent, investigate registry/proxy |
| 401/403 from registry | Expired token, wrong scope mapping | Check `.npmrc` scope → registry mapping, token permissions |
| Install hangs | Network/proxy, missing timeouts | Configure registry proxy; set fetch timeouts/retries |

## Runtime Breakage After an Upgrade

| Symptom | Diagnose | Fix |
|---------|----------|-----|
| New exceptions after deploy | Compare error types between versions; read changelog | Roll back by redeploying previous artefact; pin and fix forward |
| Behaviour change without errors | Bisect: `git bisect` over update PRs, or upgrade packages one by one | Add regression test; adapt code or pin |
| Performance regression | Profile old vs new; check changelog for defaults (pool sizes, timeouts) | Tune new defaults explicitly |
| Deprecation warnings flood logs | New major deprecates APIs | Migrate; do not suppress globally |
| Transitive vulnerability with no direct fix | Direct dependency pins old version | Override/constraint to patched version; open upstream issue; remove override later |

## Diagnostic Commands

```bash
# npm / pnpm / yarn
npm ls <pkg> --all
npm explain <pkg>
pnpm why <pkg> -r
yarn why <pkg>

# Python (uv)
uv tree --invert --package <pkg>
uv pip list --outdated

# JVM
./gradlew dependencies --configuration runtimeClasspath
mvn dependency:tree -Dincludes=<groupId>:<artifactId>

# Go / Rust / .NET
go mod why -m <module>
cargo tree -i <crate>
dotnet list package --include-transitive --vulnerable
```

## Escalation Rules

- Do not delete lockfiles to "fix" conflicts; this upgrades everything at once.
- Do not use `--force` / `--legacy-peer-deps` / `--no-verify` as a permanent solution; document any temporary use with an issue link.
- When a fix requires an override, add a comment with the upstream issue and removal condition.

## Checklist

- [ ] Toolchain and package manager versions pinned in repo
- [ ] Lockfile conflicts resolved by regeneration, not hand edits
- [ ] Bot logs checked before changing config
- [ ] Rollback via previous artefact; regression test added after incidents
- [ ] Overrides tracked with removal conditions
