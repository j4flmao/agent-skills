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
