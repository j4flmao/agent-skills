# Database Migration Strategies Reference

## Migration Types

```sql
-- Schema migration: adding a column
ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0;

-- Data migration: backfill new column
UPDATE orders SET discount_percent = 0 WHERE discount_percent IS NULL;

-- Index migration: new query pattern
CREATE INDEX CONCURRENTLY idx_orders_coupon ON orders(coupon_code);

-- Constraint migration: add FK with validation
ALTER TABLE orders ADD CONSTRAINT fk_orders_coupons 
  FOREIGN KEY (coupon_code) REFERENCES coupons(code);
```

## Zero-Downtime Migration Patterns

### Expand-Migrate-Contract (Parallel Change)

```sql
-- Phase 1: Expand — add new column alongside old
ALTER TABLE orders ADD COLUMN customer_uuid UUID;
CREATE INDEX CONCURRENTLY idx_orders_customer_uuid ON orders(customer_uuid);

-- Phase 2: Migrate — write to both, backfill data
-- Application writes to both customer_id and customer_uuid
UPDATE orders SET customer_uuid = uuid(customer_id) WHERE customer_uuid IS NULL;

-- Phase 3: Contract — remove old column after confirming
ALTER TABLE orders DROP COLUMN customer_id CASCADE;
ALTER TABLE orders RENAME COLUMN customer_uuid TO customer_id;
```

### Online Schema Changes (pgroll / gh-ost)

```bash
# Using pgroll for PostgreSQL
pgroll create --pgroll-url "postgres://..." \
  --migration "ALTER TABLE orders ADD COLUMN priority INTEGER DEFAULT 0"

# Migration runs without locking
pgroll migrate --pgroll-url "postgres://..."
```

## Migration Framework (Flyway)

```sql
-- V1__create_orders_table.sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- V2__add_coupon_support.sql
ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN discount DECIMAL(5,2) DEFAULT 0;

-- V3__add_customer_uuid.sql
ALTER TABLE orders ADD COLUMN customer_uuid UUID;
UPDATE orders SET customer_uuid = uuid(customer_id) WHERE customer_uuid IS NULL;
ALTER TABLE orders ALTER COLUMN customer_uuid SET NOT NULL;
```

## Rollback Strategy

```sql
-- V1__rollback.sql
DROP TABLE IF EXISTS orders;

-- V2__rollback.sql
ALTER TABLE orders DROP COLUMN IF EXISTS coupon_code;
ALTER TABLE orders DROP COLUMN IF EXISTS discount;

-- V3__rollback.sql
ALTER TABLE orders DROP COLUMN IF EXISTS customer_uuid;
```

## Safety Checks

```sql
-- Before migration: validate assumptions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM orders WHERE customer_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot add NOT NULL constraint: null values exist';
    END IF;
END $$;

ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;
```

## Migration Testing

```bash
# Test migration in CI pipeline
docker compose up -d postgres
flyway migrate -configFiles=flyway.conf
# Run integration tests against migrated schema
docker compose down
```

## Key Points

- Expand-Migrate-Contract enables zero-downtime schema changes
- ALTER TABLE ADD COLUMN is safe for nullable columns
- CREATE INDEX CONCURRENTLY prevents table locking
- Backfill data in batches to avoid transaction bloat
- Flyway tracks applied migrations in a schema history table
- Each migration must have a corresponding rollback script
- Validate data integrity before adding NOT NULL constraints
- Test migrations in CI against a fresh database
- Parallel change pattern supports rollback at each phase
- Migration frameworks enforce version ordering and idempotency
