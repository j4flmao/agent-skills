# Zero-Downtime Migrations

## Expand-Contract Pattern

### Phase 1: Expand (Deploy 1)

```sql
-- Add new column as nullable (backward-compatible)
ALTER TABLE orders ADD COLUMN status_v2 VARCHAR(20);

-- Add new table (no impact on existing queries)
CREATE TABLE order_items_v2 (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id),
    sku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);
```

```python
# Application begins dual-write
class OrderService:
    def create_order(self, data):
        # Old path
        order = Order.create(**data)
        # New path (dual-write)
        order_v2 = OrderV2.create(**data)
        return order
```

### Phase 2: Migrate (Deploy 2)

```sql
-- Backfill data in batches
DO $$
DECLARE
    batch_size INT := 1000;
    processed INT;
BEGIN
    LOOP
        UPDATE orders SET status_v2 = status
        WHERE status_v2 IS NULL
        LIMIT batch_size;

        GET DIAGNOSTICS processed = ROW_COUNT;
        EXIT WHEN processed = 0;
        COMMIT;
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

-- Verify consistency
SELECT COUNT(*) FROM orders WHERE status_v2 IS NULL;
```

```python
# Application reads from new schema first, falls back to old
class OrderService:
    def get_order(self, order_id):
        # Try new path first
        result = OrderV2.get_by_id(order_id)
        if not result:
            # Fall back to old
            result = Order.get_by_id(order_id)
        return result
```

### Phase 3: Contract (Deploy 3)

```sql
-- Remove old column after verifying all reads use new schema
ALTER TABLE orders DROP COLUMN status;

-- Drop old table after migration complete
DROP TABLE IF EXISTS order_items CASCADE;
```

```python
# Clean up dual-write code
class OrderService:
    def create_order(self, data):
        order = OrderV2.create(**data)
        return order
```

## Backward-Compatible Change Rules

| Change | Safe? | Notes |
|--------|-------|-------|
| Add NULLABLE column | Yes | New column must have no NOT NULL |
| Add column with DEFAULT | Yes | Only for nullable or NOT NULL with default |
| Add table | Yes | No existing code references it |
| Add index | Yes | Use CONCURRENTLY to avoid table lock |
| Add FK with NOCHECK | Yes | Validate offline |
| DROP column | No | Use expand-contract |
| RENAME column | No | Add new, dual-write, drop old |
| Change column type | No | Add new column with new type, migrate data |
| Add NOT NULL | No | Add nullable, backfill, add NOT NULL constraint |
| DROP table | No | Use expand-contract or deprecate first |

## Rollback Strategies

### In-Place Rollback (Safe for additive changes)

```sql
-- Flyway undo
-- U2__remove_orders_v2_table.sql
ALTER TABLE orders DROP COLUMN IF EXISTS status_v2;
DROP TABLE IF EXISTS order_items_v2;

-- Liquibase rollback
-- <rollback> defined in changeset
liquibase rollbackCount 1
```

### Forward Fix (For destructive changes)

```sql
-- Instead of reverting, add a new migration to fix the issue
-- V4__fix_user_email_length.sql
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(512);
```

## CI/CD Integration

```yaml
# GitHub Actions migration stage
jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production
    steps:
    - uses: actions/checkout@v4
    - name: Validate migrations
      run: |
        flyway -configFiles=flyway.conf \
          -url=jdbc:postgresql://staging-db:5432/myapp \
          validate
    - name: Apply migrations
      run: |
        flyway -configFiles=flyway.conf \
          -url=jdbc:postgresql://${{ secrets.DB_URL }} \
          -user=${{ secrets.DB_USER }} \
          -password=${{ secrets.DB_PASSWORD }} \
          migrate
    - name: Smoke test
      run: |
        curl -f http://myapp/health/database
    - name: Rollback on failure
      if: failure()
      run: |
        flyway -configFiles=flyway.conf \
          -url=jdbc:postgresql://${{ secrets.DB_URL }} \
          -user=${{ secrets.DB_USER }} \
          -password=${{ secrets.DB_PASSWORD }} \
          undo
```

## Migration Linting

```bash
# Check for breaking changes (custom lint script)
migration-lint check V4__drop_users.sql
# Output: ERROR: DROP TABLE detected in V4__drop_users.sql — breaking change!
# Output: WARNING: ALTER COLUMN TYPE detected — potential data loss

# Recommended tools
# - sqllint: generic SQL linting
# - sqlcheck: detect anti-patterns in migrations
# - schemahero: declarative schema management
```
