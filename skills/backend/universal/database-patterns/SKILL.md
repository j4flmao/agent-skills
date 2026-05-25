---
name: backend-database-patterns
description: >
  Use this skill when the user says 'database design', 'schema design', 'query optimization', 'slow query', 'migration', 'index', 'ORM', 'repository pattern', 'N+1 problem', 'transaction', or when designing or troubleshooting the data layer. This skill enforces schema design principles, indexing strategy, N+1 detection and fixing, transaction boundaries, migration best practices, and the repository pattern. Applies to PostgreSQL, MySQL, MongoDB, and ORMs (TypeORM, Prisma, SQLAlchemy, Diesel, GORM, Spring Data). Do NOT use for: API design, caching, or frontend state management.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, database, phase-2, universal]
---

# Backend Database Patterns

## Purpose
Design efficient, maintainable database schemas and queries. Every schema change must be backward-compatible. Every query must be verifiable with EXPLAIN ANALYZE.

## Agent Protocol

### Trigger
Exact user phrases: "database design", "schema design", "query optimization", "slow query", "migration", "index", "ORM pattern", "repository pattern", "N+1 problem", "transaction", "table design", "data model".

### Input Context
Before activating, verify:
- The database type is known (PostgreSQL, MySQL, MongoDB, SQLite).
- The ORM or query framework is known (TypeORM, Prisma, SQLAlchemy, Diesel, GORM, Spring Data JDBC/JPA).
- The specific schema, query, or problem is described.

### Output Artifact
No file output unless requested. Produces text guidance.

### Response Format
Schema design:
```
## {entity}
| Field | Type | Constraints | Index |
|-------|------|-------------|-------|
| {field} | {type} | {constraints} | {yes/no/type} |
```

Query fix:
```
## Problem: {description}
Root cause: {specific cause}
Fix: {specific change}
Verification: EXPLAIN ANALYZE {query}
```

Migration:
```
## Migration: {description}
Up: {SQL}
Down: {SQL}
Backward-compatible: {yes/no — if no, explain risk}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Schema design follows normalization principles (3NF by default).
- [ ] Indexes are specified for every foreign key and filtered column.
- [ ] N+1 queries are identified and fixed.
- [ ] Migration includes up AND down scripts.
- [ ] Migration is verified to be backward-compatible.
- [ ] Transaction boundaries are documented.

### Max Response Length
Schema: unlimited (table format). Query fix: 6 lines. Migration: 10 lines.

## Workflow

### Step 1: Schema Design
- Normalize to 3NF by default. Denormalize only when a performance measurement proves it necessary.
- UUID v7 for primary keys (time-sortable, no collisions in distributed systems).
- Every table has: id (UUID PK), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ).
- Soft deletes: use deleted_at TIMESTAMPTZ or is_active boolean. Hard deletes are a privileged operation.
- Use native database enum types, not string columns with app-level validation.

### Step 2: Indexing Strategy
| Index Type | When | Example |
|------------|------|---------|
| B-tree | Equality and range lookups | `WHERE status = 'active'` |
| Composite B-tree | Multi-column filters | `WHERE status = 'active' AND created_at > '2026-01-01'` |
| Partial | Filtered subset | `WHERE status = 'active'` on 10M rows, 90% inactive |
| Covering | All columns in query covered | Include selected columns to avoid heap lookups |
| GIN | JSON, arrays, full-text | `WHERE tags @> ['urgent']` |
| Unique | Uniqueness enforcement | `WHERE email IS NOT NULL` |

Rules:
- Index every foreign key column.
- Index columns used in WHERE, JOIN, ORDER BY clauses.
- Do not index low-cardinality columns (boolean, single-digit enums) alone.
- Use `EXPLAIN ANALYZE` to verify index usage before and after.
- Composite index column order: highest selectivity first.

### Step 3: N+1 Detection and Fix
Detection pattern: the same query appears N times in logs, where N = number of parent rows.

```
NOT N+1 (eager):
  users = db.user.findMany({ include: { posts: true } })
  -> 1 query with JOIN

N+1 (lazy):
  users = db.user.findMany()
  for user in users:
    user.posts
    -> 1 query for users + N queries for posts
```

Fix strategies:
- Eager loading / JOIN / INCLUDE
- DataLoader pattern for batch loading
- Query batching

### Step 4: Migration Best Practices
1. Every migration must have BOTH up and down scripts.
2. All migrations must be backward-compatible: old application code must work with the new schema.
3. Three-phase destructive changes:
   - Phase 1: Add new column/table. Dual-write to old and new.
   - Phase 2: Backfill data. Switch reads to new. Verify consistency.
   - Phase 3 (after monitoring period): Remove old column/table.
4. Never drop a column in the same deployment that stops writing to it.
5. Test migrations against a copy of production data before running in production.

### Step 5: Transaction Boundaries
- Transactions belong in Application use cases, NOT in controllers or repositories.
- Keep transactions as short as possible. Never hold a transaction open during external API calls or file I/O.
- Use Unit of Work pattern for coordinating multiple repository operations in a single transaction.
- For distributed transactions spanning multiple services: use Saga pattern. Never use two-phase commit (2PC) across service boundaries.

### Step 6: Repository Pattern
```
Interface (Domain):
  interface UserRepository {
    findById(id: UserId): Promise<User | null>
    findByEmail(email: Email): Promise<User | null>
    save(user: User): Promise<void>
    delete(id: UserId): Promise<void>
  }

Implementation (Infrastructure):
  class PostgresUserRepository implements UserRepository {
    constructor(private db: Database) {}
    // ORM-specific implementation, mapped to Domain entity
  }
```

## PK/FK Decision Rules

### PK Rules
- **Use UUID v7** as default PK. Never natural keys (email, SSN, username).
- **Use BIGSERIAL** only when single-node, no sharding, no merge.
- **Composite PK** only for junction/join tables: `PRIMARY KEY (order_id, product_id)`.

### FK Rules
- **Index EVERY FK column**. Missing FK index = full table scan on DELETE + deadlock risk.
- **Prefer ENUM over tiny table+FK** when values <20 rows, static, no attributes.
- **ON DELETE RESTRICT** by default. CASCADE only for aggregate roots (Order → Items).
- **DEFERRABLE** for circular references (manager_id → employees).
- **NOT VALID + VALIDATE** for zero-downtime FK addition on large tables.
- **Polymorphic FK** = anti-pattern. Use separate join tables instead.

### ENUM vs Table Decision

```
ENUM: <20 static values, no attributes, rarely changes
      Example: order_status, payment_type, user_role

TABLE + FK: >20 values, has attributes, admin-managed, multi-language
            Example: product_categories, countries, tax_rates
```

## Rules
- Never expose raw database entities (ORM models) outside the Infrastructure layer.
- Always use parameterized queries. Never string interpolation in SQL.
- Every SELECT explicitly lists columns. No SELECT *.
- Migrations must be reviewed and tested. Never run untested migrations on production.
- Before optimizing, run EXPLAIN ANALYZE. Assumptions about slow queries are often wrong.
- Transactions are Application-layer concerns. Domain entities have no transaction logic.

## References
- `references/query-optimization.md` — index strategy, N+1 prevention, pagination, EXPLAIN PLAN
- `references/migration-guide.md` — backward-compatible migration rules
- `references/table-design-rules.md` — table structure, soft delete, indexing & partitioning, PK/FK rules
- `references/database-migration-patterns.md` — Database migration patterns, two-phase changes, zero-downtime

## Handoff
No artifact produced.
Next skill: backend-auth-patterns — secure the data layer.
Carry forward: schema design, repository interfaces, database type, ORM framework.
