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

Design and execute database schema migrations with zero-downtime using
Flyway, Liquibase, or Alembic — backward-compatible changes, expand-contract
pattern, and CI/CD integration.

## Agent Protocol

### Trigger

Any user message referencing database migration, schema change, Flyway,
Liquibase, Alembic, zero-downtime migration, expand-contract, or rollback.

### Input Context

Database type, current schema version, desired change, tool preference,
zero-downtime requirement, CI/CD pipeline details.

### Output Artifact

Migration scripts (SQL or changeset XML/YAML), rollback scripts, CI/CD
pipeline config for migration steps, expand-contract execution plan.

### Response Format

SQL scripts, tool-specific config (Flyway V-style, Liquibase changeset).
Pipeline YAML with migration stage.

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria

Migration applied, rollback verified, CI/CD integration passing,
zero-downtime validated with dual-write consistency check.

### Max Response Length

8000 tokens.

## Workflow

### 1. Migration Tools

Flyway — SQL-first, version-ordered migrations (V1__description.sql),
baseline existing schema, undo migrations in Pro/Enterprise. Liquibase —
XML/YAML/JSON/SQL changesets with rollback support, contexts for
environment-specific execution. Alembic — Python ecosystem, SQLAlchemy
integration, auto-generation from model changes. Prisma Migrate —
TypeScript/Node.js, schema-first, shadow database for diff generation.

### 2. Migration Design

One logical change per migration file — makes rollback and review easier.
Only backward-compatible changes in online migrations: add column (nullable
with default), add table, add index, add foreign key (validate NOCHECK then
enable). Never in online: remove column, rename column, change column type
without transition, add NOT NULL constraint without default.

### 3. Zero-Downtime Expand-Contract

Phase 1 — Expand: add new column/table, application begins dual-write to
both old and new schema. Phase 2 — Migrate: backfill existing data into new
schema with batch processing, verify consistency between old and new fields.
Phase 3 — Contract: remove old column/table after verifying all reads use
new schema. Each phase is a separate deployment.

### 4. Rollback Strategy

Every up migration has a corresponding down migration: Flyway undo (Pro),
Liquibase rollback `<changeSet>`, Alembic `downgrade()`. Two rollback
approaches: in-place (revert state using down migration, safe for
additive changes) vs forward fix (new migration to correct the issue,
required for destructive changes). Never rollback destructive changes —
always forward-fix.

### 5. CI/CD Integration

Migration runs in CI pipeline against ephemeral database (clone of prod).
Migration order enforced by versioning — Flyway fails on out-of-order.
Manual approval gate for production migrations. Migration validation —
lint changes for backward compatibility (detect DROP, RENAME, type change).
Smoke tests after migration execution to verify application compatibility.

## Rules

1. Every migration has a corresponding rollback — no exceptions.
2. Backward-compatible changes only for online migrations.
3. Add nullable columns with defaults — never add NOT NULL without default.
4. Expand-contract pattern for zero-downtime schema changes — 3 phases, 3 deploys.
5. Migration order is critical — never reorder existing migration files.
6. Never rollback destructive changes — forward-fix instead.
7. Test migration against production-sized data in staging.
8. One logical change per migration file — reviewable and revertible.

## References

- [Migration Tools](./references/migration-tools.md) — Flyway, Liquibase,
  Alembic — setup, commands, workflow
- [Zero Downtime](./references/zero-downtime.md) — expand-contract,
  backward-compatible changes, rollback, CI/CD integration

## Handoff

Hand off to database-migration for schema changes and migration tooling.
Hand off to cicd-pipeline for migration pipeline integration.
Hand off to docker-patterns for ephemeral DB containers for testing.
Hand off to terraform for DB instance provisioning.
