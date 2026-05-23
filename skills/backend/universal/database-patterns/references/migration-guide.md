# Database Migration Guide

## Backward Compatibility Rules
- All migrations must be backward-compatible (old code works with new schema)
- Never rename or drop columns in a single deployment — use 3-phase:
  1. Add new column + dual-write (old + new)
  2. Migrate data + switch reads to new column
  3. Drop old column

```sql
-- Phase 1: Add new column, start dual-writing
ALTER TABLE users ADD COLUMN email_normalized VARCHAR(255);
-- Application writes to both email and email_normalized

-- Phase 2: Backfill + switch reads
UPDATE users SET email_normalized = LOWER(email) WHERE email_normalized IS NULL;
-- Application reads from email_normalized now

-- Phase 3: Remove old column
ALTER TABLE users DROP COLUMN email;
```

## Migration Naming
```
V{version}__{description}.sql
V1__create_users.sql
V2__add_orders_table.sql
V3__add_email_normalized_to_users.sql
```

## Rollback Strategy
- Prefer forward-fix over rollback (write a new migration to undo)
- Version-controlled migration files — never edit a committed migration
- Test rollbacks in staging before production
- For destructive operations (drop column, remove table), keep a down script but label clearly

## Expanding Tables Safely
| Change | Backward-compatible? | Guidance |
|--------|---------------------|----------|
| Add nullable column | Yes | Safe, deploy anytime |
| Add table | Yes | Safe, deploy anytime |
| Add NOT NULL column | No | Add as nullable, backfill, alter to NOT NULL |
| Rename column | No | 3-phase with dual-write or add + drop old |
| Change column type | No | Add new column, dual-write, backfill, drop old |
| Drop column | No | Remove all reads first, then drop |
| Split table | No | Create new table, dual-write, backfill, drop old |
| Add unique constraint | Risky | Only if data already satisfies uniqueness |

## Common Tools
| Tool | Language | Features |
|------|----------|---------|
| Flyway | Java, any via CLI | Versioned SQL, checksums, repeatable migrations |
| Liquibase | Java, any via CLI | XML/YAML/JSON/SQL formats, rollback, contexts |
| Alembic | Python | Auto-generation, branching, per-env config |
| goose | Go | Go migrations, versioned SQL, up/down |
| Prisma Migrate | TypeScript | Declarative schema diff, shadow DB, history table |
| EF Core Migrations | C# | Snapshot-based, idempotent scripts, model validation |

## Anti-Patterns
- Running migrations as part of application startup in production (use CI/CD pipeline step)
- Long-running migrations (> 5 minutes) in transaction that blocks reads
- Squashing migrations before the project is stable and predictable
- Including seed data in migration files (use separate seed scripts)
- Depending on ORDER BY without explicit ordering in batched backfills
