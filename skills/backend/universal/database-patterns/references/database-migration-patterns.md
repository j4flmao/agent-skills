# Database Migration Patterns

## Migration Best Practices

```yaml
principles:
  backward_compatible: "Every migration must work with both old and new code"
  forward_only: "Never rewrite history — migrations are append-only"
  reversible: "Every up migration must have a corresponding down migration"
  small_batch: "Each migration should be small and focused on one change"
  tested: "Migrations must be tested against production-like data"
  reviewed: "Every migration requires code review"
```

## Migration Types

| Type | Description | Backward Compatible | Downtime |
|------|-------------|-------------------|----------|
| Add column (nullable) | `ALTER TABLE ADD COLUMN ... NULL` | Yes | None |
| Add column (default) | `ALTER TABLE ADD COLUMN ... DEFAULT value` | Yes (PostgreSQL) | None |
| Add index | `CREATE INDEX CONCURRENTLY` | Yes | None (CONCURRENTLY) |
| Drop index | `DROP INDEX CONCURRENTLY` | Yes | None (CONCURRENTLY) |
| Add table | `CREATE TABLE` | Yes | None |
| New enum value | `ALTER TYPE ... ADD VALUE` | Yes | None |
| Rename column | Two-phase: add new, dual-write, drop old | Yes | None |
| Change column type | Two-phase: add new column, backfill, migrate | Yes | None |
| Drop column | Two-phase: stop reading, then drop | Yes | None |
| Drop table | Two-phase: stop using, then drop | Yes | None |

## Two-Phase Destructive Changes

### Phase 1: Add and Dual-Write

```sql
-- Phase 1: Add new column, dual-write
ALTER TABLE users ADD COLUMN email_normalized VARCHAR(255);

-- Application writes to both columns simultaneously
-- Old code reads from `email`, new code reads from `email_normalized`
```

### Phase 2: Backfill and Verify

```sql
-- Phase 2: Backfill existing rows (batched)
DO $$
DECLARE
  batch_size INTEGER := 1000;
  updated INTEGER;
BEGIN
  LOOP
    UPDATE users
    SET email_normalized = LOWER(email)
    WHERE email_normalized IS NULL
    LIMIT batch_size;

    GET DIAGNOSTICS updated = ROW_COUNT;
    EXIT WHEN updated = 0;
    COMMIT;
    PERFORM pg_sleep(0.1); -- Throttle
  END LOOP;
END $$;

-- Verify consistency
SELECT COUNT(*) FROM users WHERE email IS DISTINCT FROM email_normalized;
-- Should return 0
```

### Phase 3: Switch Reads and Drop Old

```sql
-- Phase 3: Deploy code that reads from new column only
-- After monitoring period, drop old column
ALTER TABLE users DROP COLUMN email;
```

## Zero-Downtime Indexing

```sql
-- Create index without blocking writes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Drop index without blocking writes
DROP INDEX CONCURRENTLY idx_users_email_old;

-- Reindex without blocking
REINDEX INDEX CONCURRENTLY idx_users_email;
```

## Large Table Migrations

```sql
-- For very large tables, use batched approach
-- Step 1: Create new table with desired schema
CREATE TABLE orders_new (LIKE orders INCLUDING ALL);
ALTER TABLE orders_new ADD COLUMN region VARCHAR(50);

-- Step 2: Copy data in batches
DO $$
DECLARE
  batch_size INTEGER := 10000;
  last_id BIGINT := 0;
  max_id BIGINT;
BEGIN
  SELECT MAX(id) INTO max_id FROM orders;

  WHILE last_id < max_id LOOP
    INSERT INTO orders_new
    SELECT *, CASE WHEN customer_id LIKE 'EU-%' THEN 'EMEA' ELSE 'AMER' END
    FROM orders
    WHERE id > last_id AND id <= last_id + batch_size
    ORDER BY id;

    GET DIAGNOSTICS last_id = ROW_COUNT;
    last_id := last_id + batch_size;
    COMMIT;
  END LOOP;
END $$;

-- Step 3: Swap tables
ALTER TABLE orders RENAME TO orders_old;
ALTER TABLE orders_new RENAME TO orders;
```

## Migration Tool Comparison

| Tool | Language | Versioning | Rollback | Async | Best For |
|------|----------|-----------|----------|-------|----------|
| Flyway | Java (CLI) | Numeric | Yes | No | Java ecosystem, simple |
| Liquibase | Java (CLI) | Changelog | Yes | No | Complex workflows |
| Alembic | Python | Auto-generated | Yes | No | SQLAlchemy projects |
| golang-migrate | Go | Numeric | Yes | No | Go projects |
| dbmate | Go (CLI) | Timestamp | Yes | No | Simple, language-agnostic |
| Prisma Migrate | TypeScript | Migration files | No | No | Prisma ORM |
| TypeORM | TypeScript | Auto-generated | Yes | No | TypeORM projects |
| sqitch | Perl (CLI) | Tags | Yes | No | Language-agnostic, complex |

## Migration File Structure

```yaml
migrations:
  naming: "{version}_{description}.sql"
  example: "20260525_add_email_normalized_to_users.sql"
  location: "db/migrations/"
  contents:
    up: "ALTER TABLE users ADD COLUMN email_normalized VARCHAR(255);"
    down: "ALTER TABLE users DROP COLUMN email_normalized;"
```

## Migration Testing

```typescript
describe('Database Migrations', () => {
  let container: StartedPostgresContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgresContainer('postgres:16')
      .withDatabase('test_migrations')
      .start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
  }, 60000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it('migrates from v1 to latest without data loss', async () => {
    // Apply initial schema
    await runMigration(pool, 'v1_initial.sql');
    await pool.query(`INSERT INTO users (id, email) VALUES ('1', 'old@example.com')`);

    // Apply new migration
    await runMigration(pool, 'v2_add_email_normalized.sql');

    // Verify data preserved
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', ['1']);
    expect(rows[0].email).toBe('old@example.com');
    expect(rows[0].email_normalized).toBe('old@example.com');
  });

  it('rollback restores previous state', async () => {
    await runMigration(pool, 'v1_initial.sql');
    await pool.query(`INSERT INTO users (id, email) VALUES ('2', 'test@example.com')`);

    // Apply new migration
    await runMigration(pool, 'v2_add_email_normalized.sql');
    // Rollback
    await runRollback(pool, 'v2_add_email_normalized.sql');

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', ['2']);
    expect(rows[0].email).toBe('test@example.com');
    // Column should not exist after rollback
    await expect(
      pool.query('SELECT email_normalized FROM users')
    ).rejects.toThrow();
  });
});
```

## Safety Checks

```sql
-- Pre-migration checks
DO $$
BEGIN
  -- Check table size
  IF (SELECT pg_size_pretty(pg_total_relation_size('orders'))) > '100 GB' THEN
    RAISE WARNING 'Large table migration — consider batched approach';
  END IF;

  -- Check for long-running transactions
  IF EXISTS (
    SELECT 1 FROM pg_stat_activity
    WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes'
    AND query NOT LIKE '%pg_stat_activity%'
  ) THEN
    RAISE WARNING 'Long-running transactions detected — migration may be blocked';
  END IF;
END $$;
```
