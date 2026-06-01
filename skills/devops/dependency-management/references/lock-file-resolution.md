# Dependency Resolution and Locking

## Lock File Strategy
Single lock file (npm, Yarn, pnpm, Bundler, Cargo): single source of truth for all dependency versions. Purpose: deterministic installs, reproducible builds, audit trail. Always commit lock files to version control. Regenerate only when dependencies intentionally change.

## Dependency Resolution Algorithm
npm: installs nested node_modules, hoists when possible. Yarn v1: flat structure, dedupes automatically. pnpm: content-addressable store, strict dependency isolation. Bundler: resolves by version, prefers latest compatible. Cargo: uses semver compatibility, maximal version selection.

## Merge Conflict Resolution
Automatic: regenerate lock file with npm install --package-lock-only. Manual: resolve package.json then delete lock file and regenerate. Override: add resolution/overrides field in package.json. git merge strategy: use ours/theirs for lock file if no meaningful changes.

## Checksum Verification
Integrity field in lock file (npm: sha512). Subresource Integrity (SRI) for CDN dependencies. Verify lock file checksums in CI pipeline. Detect tampered packages with integrity hash mismatch. Automated lock file audit in CI.

## Monorepo Dependency Management
Workspace protocol: "dep": "workspace:*" (pnpm, Yarn). Shared lock file in workspace root. Hoisted vs isolated node_modules layout. Dependency duplication detection and resolution. Transitive dependency deduplication.

## Lock File Diffing
Identify new/changed packages before merging. Security review: check for suspicious version jumps. Size impact: check new package sizes. License implications: track new dependencies. Automated PR comments on lock file changes (danger.js, danger-swift).

## References
- dependency-management-fundamentals.md -- Fundamentals
- dependabot-setup.md -- Dependabot
- renovate-config.md -- Renovate
- update-strategies.md -- Update Strategies
