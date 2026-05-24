# Schema Migration Management

## Schema Versioning

| Tool | Language | Platform | File Format | Version Strategy |
|------|----------|----------|-------------|-----------------|
| Flyway | Java | Any | SQL | Numeric (V1, V2...) |
| Liquibase | Java | Any | SQL, XML, YAML, JSON | ID-based |
| Alembic | Python | SQLAlchemy | Python | Revision hash |
| Goose | Go | SQL | SQL, Go | Numeric |
| Prisma Migrate | TypeScript | Prisma | SQL | Timestamp |
| EF Core | C# | .NET | C#, SQL | Timestamp |

## Backward Compatibility

```sql
-- BAD: Renaming column (breaks older code)
ALTER TABLE users RENAME COLUMN name TO full_name;

-- GOOD: Add new column, keep old one
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
-- Deploy code that reads full_name
-- Backfill data
UPDATE users SET full_name = name;
-- Deploy code that writes to full_name
-- After stabilization, drop old column
ALTER TABLE users DROP COLUMN name;
```

## Expand-Contract Pattern

```
Phase 1 — Expand:
  Add new schema alongside old
  Deploy application code supporting both

Phase 2 — Migrate:
  Backfill new schema data
  Monitor for issues

Phase 3 — Contract:
  Remove old schema
  Clean up dead code
```

```sql
-- Phase 1: Expand
ALTER TABLE orders ADD COLUMN customer_uuid UUID;
ALTER TABLE orders ADD COLUMN customer_id INTEGER; -- Keep old for rollback

-- Phase 2: Migrate
UPDATE orders SET customer_uuid = (SELECT uuid FROM customers WHERE id = orders.customer_id);

-- Phase 3: Contract (after deployment)
ALTER TABLE orders DROP COLUMN customer_id;
```

## Rollback Strategy

| Scenario | Rollback Action | Data Loss | Downtime |
|----------|----------------|-----------|----------|
| Migration failed early | No schema change applied | None | None |
| Migration failed mid-way | Revert transaction (BEGIN/ROLLBACK) | None | None |
| Migration succeeded, bad data | Apply reverse migration | Possible | None |
| Migration caused performance | Feature flag off, revert schema | None | None |

## Zero-Downtime Schema Changes

```sql
-- Safe operations (most DBs)
ALTER TABLE ... ADD COLUMN ... DEFAULT NULL;
CREATE INDEX CONCURRENTLY ...;
DROP INDEX CONCURRENTLY ...;
CREATE TABLE ...;
DROP TABLE ... (if not referenced);

-- Risky operations
ALTER TABLE ... ADD COLUMN ... DEFAULT NOT NULL;  -- Table lock
ALTER TABLE ... ALTER COLUMN ... TYPE ...;        -- Table rewrite
ALTER TABLE ... DROP COLUMN ...;                   -- Safe, but app may reference
ALTER TABLE ... RENAME COLUMN ...;                 -- App breakage
CREATE INDEX ...;                                  -- Table lock (without CONCURRENTLY)
```

## CI/CD Integration

```yaml
# Database migration in CI/CD pipeline
stages:
  - migrate
  - test
  - deploy

migrate:
  stage: migrate
  script:
    - flyway migrate -url=$DB_URL -user=$DB_USER -password=$DB_PASSWORD
  environment:
    name: production
    action: prepare
  only:
    - main

test:
  stage: test
  script:
    - flyway info -url=$DB_URL  # Verify migration applied

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Conventions

| Rule | Rationale |
|------|-----------|
| One file per migration | Clear ordering, easy debugging |
| Never modify existing migration files | Immutable history |
| Idempotent migrations | `IF NOT EXISTS`, `IF EXISTS` |
| Test migrations on staging first | Catch issues early |
| Monitor migration duration | Detect performance regressions |
| Document rollback migration | Always have a way out |
