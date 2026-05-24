---
name: devops-database-migration
description: |
  Trigger: "database migration", "schema migration", "Flyway", "Liquibase",
  "zero-downtime migration", "DB migration", "schema change",
  "migration strategy", "backward compatible migration",
  "database refactoring", "online migration"
  Exclusion: Not for general database operations or query tuning.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, database, migration, phase-7]
---

# devops-database-migration

## Purpose
Design and execute database schema migrations with zero-downtime using Flyway, Liquibase, or Alembic — backward-compatible changes, expand-contract pattern, and CI/CD integration.

## Agent Protocol

### Trigger
Any user message referencing database migration, schema change, Flyway, Liquibase, Alembic, zero-downtime migration, expand-contract, or rollback.

### Input Context
Database type, current schema version, desired change, tool preference, zero-downtime requirement, CI/CD pipeline details.

### Output Artifact
Migration scripts (SQL or changeset XML/YAML), rollback scripts, CI/CD pipeline config for migration steps, expand-contract execution plan.

### Response Format
SQL scripts, tool-specific config (Flyway V-style, Liquibase changeset). Pipeline YAML with migration stage.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Migration applied, rollback verified, CI/CD integration passing, zero-downtime validated with dual-write consistency check.

### Max Response Length
8000 tokens.

## Components

### Migration Tools Comparison
| Tool | Language | Config Format | Rollback | Auto-Generate | CI Support | Best For |
|---|---|---|---|---|---|---|
| Flyway | SQL | SQL files | Pro only | No | Native | Java/any SQL-first |
| Liquibase | XML/YAML/JSON/SQL | Changesets | Built-in | Yes (diff) | Native | Enterprise/Java |
| Alembic | Python | Python | Built-in | Yes (autogenerate) | Via script | Python/SQLAlchemy |
| Prisma Migrate | TypeScript | Prisma schema | Limited | Yes (shadow DB) | Native | Node.js/TypeScript |

### Migration File Naming and Versioning
Flyway: V{version}__{description}.sql (e.g., V1__create_users.sql), U{version}__{description}.sql for undo (Pro), R__{description}.sql for repeatable (views, functions). Liquibase: changesets with id + author, ordered by changeset order in changelog file. Alembic: timestamp-based revision IDs (e.g., 20260523_add_orders.py), head/branch tracking. Prisma: timestamp-based migration names with shadow database for diff. Version conflicts: detect via CI (validate step fails on out-of-order), resolve by renumbering or squashing.

### Zero-Downtime Rules (Detailed)
Safe operations: add nullable column (no default), add column with DEFAULT (nullable or NOT NULL with default), add table (new table, no existing references), add index (use CONCURRENTLY to avoid table lock), add FK with NOCHECK then validate, add CHECK constraint with NOT VALID then validate. Unsafe operations: DROP column (breaks existing queries), RENAME column (breaks existing queries), change column type (breaks existing queries), add NOT NULL (fails on NULL rows, lock issue), DROP table (breaks existing joins). Mitigation: use expand-contract — expand (add new), migrate (dual-write, backfill, switch reads), contract (remove old).
Flyway — SQL-first, version-ordered migrations (V1__description.sql), baseline existing schema, undo migrations in Pro/Enterprise, dry-run support, out-of-order detection. Liquibase — XML/YAML/JSON/SQL changesets with built-in rollback, contexts for environment-specific execution, diff tool for schema comparison, generateChangeLog from existing DB. Alembic — Python ecosystem, SQLAlchemy integration, auto-generation from model changes, branching support, environment-specific config. Prisma Migrate — TypeScript/Node.js, schema-first, shadow database for diff generation, push/pull workflow. Tool selection based on language ecosystem and rollback requirements.

### 2. Version Control for Schemas
Migration files stored in the application repository alongside code. Naming convention: V{version}__{description}.sql. Each migration is a single file, never modified after creation (checksum validation). Schema version tracked in database via metadata table (flyway_schema_history, DATABASECHANGELOG, alembic_version). One migration per deploy — no bundling multiple logical changes. Migration files reviewed in PRs like code changes.

### 3. Migration Strategies
Linear: sequential migrations, simplest, no branching, all environments follow same order. Squash: periodic consolidation of many small migrations into a single baseline file, reset baseline version, delete history. Repeatable: always re-applied if checksum changes (views, functions, stored procedures — R__ naming in Flyway). Strategy selection: linear for simple schemas, squash for high-velocity projects to reduce startup time, repeatable for dynamic database objects.

### 4. Rollback Patterns
Every up migration has a corresponding down migration: Flyway undo (Pro), Liquibase rollback (<rollback> in changeset), Alembic downgrade(). Two approaches: in-place (revert state using down migration — safe for additive changes) vs forward fix (new migration to correct the issue — required for destructive changes). Never rollback destructive changes (DROP, RENAME) — always forward-fix. Automated rollback in CI: if migration fails, run down migration and notify.

### 5. Zero-Downtime Migrations (Expand-Contract)
Phase 1 — Expand: add new column/table, application begins dual-write to both old and new schema. Phase 2 — Migrate: backfill existing data into new schema with batch processing, verify consistency. Phase 3 — Contract: remove old column/table after verifying all reads use new schema. Each phase is a separate deployment. Only backward-compatible changes allowed in Phase 1: add nullable column with default, add table, add index (CONCURRENTLY), add FK with NOCHECK. Never in Phase 1: DROP, RENAME, type change, NOT NULL without default.

### 6. Schema Drift Detection
Compare migration tool metadata table with filesystem: detect missing migrations, modified checksums, out-of-order executions. Run `flyway validate` or `liquibase status` in CI. Drift remediation: repair checksum, add missing migration, or baseline re-alignment. Automated drift alerts in monitoring dashboard. Periodic full schema comparison between staging and production.

### 7. CI Integration
Migration runs in CI pipeline against ephemeral database (clone of prod). Migration order enforced by versioning — tool fails on out-of-order. Manual approval gate for production migrations. Migration validation step: lint changes for backward compatibility (detect DROP, RENAME, type change without transition). Smoke tests after migration execution to verify application compatibility. Rollback automation: if smoke test fails, trigger down migration and rollback application deploy.

### 8. Branching Strategy for Migrations
Main branch migrations are linear — no conflicts. Feature branch migrations: named with high version number to avoid conflicts, renamed/squashed before merge. Post-merge cleanup: merge-conflict resolution via version renumbering. Never merge two branches with same version number. Git flow: develop branch has latest migrations, release branch freezes migration order, hotfix migrations get priority version number.

### 9. Testing Migrations
Test against production-sized data in staging (not just empty schema). Performance test: measure migration execution time on full dataset. Rollback test: verify down migration works on migrated data. Concurrent access test: verify zero-downtime with live traffic. Data integrity check: compare row counts and checksums before/after migration. Schema comparison tool: verify target schema matches expected definition.

## Operational Practices

### Pre-Migration Checklist
1. Review migration SQL for backward compatibility (lint with sqlcheck or custom rules)
2. Run migration against staging database with production-sized data — measure execution time
3. Run migration against copy of production database (restore from backup to isolated instance)
4. Verify rollback script: apply migration, run rollback, verify schema returns to previous state
5. Check for long-running locks: migration should complete in <5s for online, schedule maintenance for >5s
6. Validate application compatibility: deploy application version that supports both old and new schema
7. Communicate migration plan: notify team via Slack, schedule during low-traffic window, prepare rollback plan
8. Prepare monitoring: dashboard for error rate, latency, and lock contention during migration window
9. Set up manual approval gate: migration requires sign-off from senior engineer and DB team
10. Run migration in CI pipeline against ephemeral database to validate before production

### Migration Execution Playbook
Low-risk migration (add column, add index): deploy migration as part of standard release, monitor for 15 minutes post-migration. Medium-risk migration (add table, add FK): deploy during low-traffic window, run with CONCURRENTLY and NOCHECK, validate for 30 minutes. High-risk migration (backfill large table, data transformation): deploy in phases, batch backfill 1000 rows at a time with sleep between batches, monitor replication lag, abort if lag >10 seconds. Critical-risk migration (expand-contract): 3 separate deploys spread across 1-2 weeks, each phase deployed during low-traffic window, full rollback plan for each phase.

### Schema Drift Detection and Remediation
Detection: run flyway validate or liquibase status in CI pipeline, compare migration tool metadata table with filesystem, detect missing migrations (files exist but not applied), modified checksums (file changed after apply), out-of-order executions (wrong order applied). Remediation: missing migration — apply missing migration. Modified checksum — flyway repair to fix checksum, review if actual change is needed. Out-of-order — create new migration to align state. Automated drift alert: send Slack notification with drift details, block production deployment until drift is resolved.

### Common Pitfalls and Solutions
Running migration during peak traffic: schedule during documented low-traffic windows, use CONCURRENTLY for index creation, lock tables only with timeout. Large table migration timeout: batch processing 1000-5000 rows per transaction, sleep 100ms between batches, use batched update with LIMIT. Migration order conflicts in CI: always run flyway validate in CI before migrate, fail build on out-of-order, use squashed baseline for cleanup. Missing rollback scripts: enforce in code review — every up migration requires corresponding down migration or documented forward-fix plan. Schema drift from manual changes: alert on drift immediately, block deployments until aligned, investigate root cause (ad-hoc query, tool access, emergency fix).

## Rules
1. Every migration has a corresponding rollback — no exceptions.
2. Backward-compatible changes only for online migrations.
3. Add nullable columns with defaults — never add NOT NULL without default.
4. Expand-contract pattern for zero-downtime schema changes — 3 phases, 3 deploys.
5. Migration order is critical — never reorder existing migration files.
6. Never rollback destructive changes — forward-fix instead.
7. Test migration against production-sized data in staging.
8. One logical change per migration file — reviewable and revertible.
9. Migration files are immutable after merge to main — checksums validate integrity.
10. Schema drift detection in CI — alert on unexpected schema state.
11. Manual approval gate for production migrations — never auto-deploy to prod.
12. CI pipeline validates migrations against ephemeral database before PR merge.
13. Backfill operations batched at 1000 rows per transaction to avoid long-running locks.
14. Migration execution time must be measured in staging with production-sized data before production apply.

## Testing Strategy
Unit test: validate migration SQL syntax and logic against ephemeral database (empty schema). Integration test: apply migration to staging database with production-sized data, validate data integrity and constraints. Performance test: measure migration execution time on production-sized dataset, identify slow operations requiring batch processing or CONCURRENTLY option. Rollback test: apply migration, run rollback, verify schema returns to previous state and data is intact. Concurrent access test: run migration with simulated read/write traffic, verify zero-downtime and data consistency. Regression test: compare application query performance before and after migration, generate explain plans for key queries.

## Collaboration Workflow
Developer creates migration in feature branch: version number uses team prefix to avoid conflicts (e.g., V2_1__team_a_feature.sql). PR review: reviewer validates backward compatibility, rollback script, data migration safety, naming convention. CI validates: runs migration against ephemeral database, runs lint for breaking changes, runs rollback test, runs integration tests. Merge to main: migration version renumbered to next sequential version (squash or rebase). Release: migrations applied in order during deploy, monitored for errors, automated rollback on failure. Post-release: verify schema state matches expected version, monitor for drift.

## Migration Scenario Playbooks

### Adding a Not-Null Column (Safe Approach)
Goal: add `tenant_id VARCHAR(50) NOT NULL` to orders table without downtime. Phase 1 (Expand): add column as nullable `ALTER TABLE orders ADD COLUMN tenant_id VARCHAR(50)`, application writes tenant_id on new orders, existing orders have NULL. Phase 2 (Backfill and Change Default): batch backfill existing rows `UPDATE orders SET tenant_id = 'default' WHERE tenant_id IS NULL`, add default value and NOT NULL constraint `ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL`, add default for future rows. Phase 3 (Contract): remove application logic that handles NULL tenant_id, verify all queries include tenant_id. Rollback: drop column if still in Expand phase, forward-fix if in Contract.

### Renaming a Column (Expand-Contract Required)
Goal: rename `status` to `order_status` in orders table without downtime. Phase 1 (Expand): add new column `ALTER TABLE orders ADD COLUMN order_status VARCHAR(20)`, application dual-writes to both status and order_status. Phase 2 (Migrate): backfill existing rows `UPDATE orders SET order_status = status WHERE order_status IS NULL`, switch application reads to order_status, verify consistency. Phase 3 (Contract): drop old column `ALTER TABLE orders DROP COLUMN status`, remove dual-write logic from application. Rollback: Phase 1 — drop new column. Phase 2 — switch reads back to status. Phase 3 — add status column back and forward-fix.

### Adding an Index Without Locking
Goal: add index on orders(user_id) without blocking writes. Safe approach: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id)`. Concurrently creates index without table lock, allows reads and writes during index build, takes longer (full table scan). Cannot run in transaction — must be standalone. Monitor index build progress via `pg_stat_progress_create_index`. Rollback: `DROP INDEX CONCURRENTLY IF EXISTS idx_orders_user_id` — also non-blocking.

## References
- [Migration Tools](./references/migration-tools.md) — Flyway, Liquibase, Alembic — setup, commands, workflow
- [Zero Downtime](./references/zero-downtime.md) — expand-contract, backward-compatible changes, rollback, CI/CD integration
- [Online Migration](./references/online-migration.md) — CDC-based live migration, dual-writes, replication lag, rollback
- [Schema Migration](./references/schema-migration.md) — Schema versioning, expand-contract, backward compatibility, CI/CD integration, zero-downtime

## Handoff
Hand off to database-migration for schema changes and migration tooling. Hand off to cicd-pipeline for migration pipeline integration. Hand off to docker-patterns for ephemeral DB containers for testing. Hand off to terraform for DB instance provisioning.
