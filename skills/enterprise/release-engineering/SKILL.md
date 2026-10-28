---
name: enterprise-release-engineering
description: >
  Use this skill when the user says 'integration hell', 'long-lived branches', 'merge conflicts across teams', 'trunk-based development at scale', 'release train', 'branch by abstraction', 'dark launch', 'migration version collision', 'expand contract migration', 'codeowners'. It designs how many teams integrate into one mainline and release safely: trunk-based development, feature toggles, branch by abstraction, release trains, monorepo ownership and zero-downtime schema changes. Do NOT use for: single-team git commands and branching basics (use dev-loop/git-workflow), CI pipeline syntax (use devops/cicd-pipeline or github-actions), canary/blue-green traffic shifting (use devops/progressive-delivery).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [enterprise, release-engineering, trunk-based, feature-flags, release-train, migrations]
---

# Release Engineering & Multi-Team Integration

## Purpose
Keep many teams integrating continuously into a shared mainline so that integration cost stays small and releases are routine. Separate deployment (code in production) from release (users see it), and make risky changes incrementally rather than on long-lived branches.

## Agent Protocol

### Trigger
"integration hell", "merge conflicts", "long-lived branch", "trunk-based", "release train", "branch by abstraction", "feature toggle", "dark launch", "flyway version conflict", "expand/contract", "codeowners", "gitflow vs trunk".

### Input Context
- Number of teams/repos, current branching model, release cadence.
- Deployment model (continuous deploy, scheduled, versioned/on-prem).
- Database migration tool (Flyway, Liquibase, Prisma, Alembic, Rails).

### Output Artifact
Integration and release strategy with concrete repo/CI rules.

### Response Format
```
Current pain: {symptom}
Branching: {trunk-based|short-lived feature branches|release branches} (max branch age {N days})
Incomplete work hidden by: {flags|branch by abstraction|dark launch}
Release cadence: {continuous|train every N weeks}
Migrations: {expand/contract, versioning scheme}
Ownership: {CODEOWNERS paths}
```

## Branching Model Decision

| Context | Model |
|---------|-------|
| SaaS with continuous delivery | Trunk-based; short-lived branches (<1–2 days) merged via PR with required CI |
| Versioned product supporting several releases (desktop, on-prem, SDKs) | Trunk + release branches cut from main; fixes land on main first, cherry-picked back |
| Many teams, one scheduled release | Trunk-based + release train cut on a fixed calendar |
GitFlow's long-lived `develop`/feature branches delay integration; reserve it for products that genuinely need parallel maintained versions.

## Techniques for Merging Unfinished Work

| Technique | Use for |
|-----------|---------|
| Feature toggles (release toggles) | New user-facing features; default off, enabled per cohort |
| Branch by abstraction | Replacing a component (ORM, payment provider): introduce interface → move callers → build new impl behind it → switch → delete old |
| Dark launching | Run new code path on real traffic without exposing results (shadow reads, compare outputs) |
| Keystone interface | Build backend fully, add the UI entry point last |
Toggles are debt: give each an owner and removal date; delete within a few weeks of full rollout.

## Release Trains
- Fixed cadence (e.g., every 2 weeks); the train leaves on time — features that miss it take the next one.
- Cut a release branch or tag from main at a fixed time; only fixes after the cut.
- Release notes generated from conventional commits/PR labels.
- Hotfix path: fix on main, cherry-pick to the release branch, tag patch version.

## Zero-Downtime Schema Changes (Expand / Contract)
Old and new app versions run side-by-side during rolling deploys, so every schema change must be compatible with both.
1. **Expand**: add new column/table (nullable or with default); deploy.
2. **Migrate**: app writes both old and new; backfill in batches.
3. **Switch reads** to new structure; deploy.
4. **Contract**: stop writing old; drop old column in a later release.
Never rename or drop a column in the same deploy that stops using it.

### Migration version collisions
- Flyway: use timestamp versions (`V20261022143000__add_x.sql`) rather than sequential integers so parallel branches do not collide; keep `outOfOrder=false` in prod and rebase late migrations instead.
- Liquibase: one changelog file per change, included from a master changelog; unique `id`+`author`.
- CI check: fail the PR if two migrations share a version.

## Monorepo Ownership
```text
# .github/CODEOWNERS (last matching pattern wins)
/libs/auth/            @org/identity-team
/services/payments/    @org/payments-team
/db/migrations/        @org/platform-dba
```
Enable "require review from code owners" in branch protection; pair with affected-target builds (Nx, Turborepo, Bazel) so CI time scales with change size.

## Conflict Hygiene
- `git config --global merge.conflictStyle zdiff3` (Git ≥2.35; `diff3` on older) shows the common ancestor in conflicts.
- `git config --global rerere.enabled true` reuses recorded resolutions when rebasing repeatedly.
- Rebase or merge main into short-lived branches daily; split large PRs into reviewable slices.

## Metrics (DORA)
Track deployment frequency, lead time for changes, change failure rate and time to restore service; add branch age and PR size as leading indicators of integration debt.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| Months-long feature branches | Toggles / branch by abstraction, merge daily |
| "Integrate at the end" | Continuous integration to main |
| Release tied to a single big feature | Release train |
| Stale toggles | Expiry date + lint for removed flags |
| Destructive migration in same deploy | Expand/contract over ≥2 releases |

## Checklist
- [ ] Max branch age agreed and measured
- [ ] Required CI + code-owner review on main
- [ ] Toggle registry with owners/expiry
- [ ] Migration versioning prevents collisions
- [ ] Release cadence and hotfix path documented

## References
- `references/branching-strategies-at-scale.md` — scaled trunk-based development
- `references/feature-toggles.md` — dark launching and toggle management
- `references/branch-by-abstraction.md` — safe component replacement
- `references/release-trains.md` — cross-team release cadence
- `references/monorepo-collaboration.md` — CODEOWNERS and boundaries
- `references/zero-downtime-migrations.md` — expand/contract
- `references/concurrent-migration-management.md` — Flyway/Liquibase collisions
- `references/advanced-conflict-resolution.md` — diff3, rerere, history surgery
