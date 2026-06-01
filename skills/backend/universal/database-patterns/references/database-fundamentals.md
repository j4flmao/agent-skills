# Database Patterns Fundamentals

## Schema Design Principles

### Normalization (3NF by Default)
Apply Third Normal Form (3NF) as the default. Denormalize only when profiling proves it necessary.

| Normal Form | Rule |
|---|---|
| 1NF | Each column contains atomic values, no repeating groups |
| 2NF | 1NF + every non-key column depends on the whole primary key |
| 3NF | 2NF + every non-key column depends only on the primary key |

```sql
-- VIOLATES 2NF: order_id + product_id composite PK, but product_name depends only on product_id
CREATE TABLE order_items (
  order_id UUID,
  product_id UUID,
  product_name VARCHAR(255),  -- depends only on product_id, not on order_id
  quantity INT,
  PRIMARY KEY (order_id, product_id)
);

-- FIXES 2NF: separate products table
CREATE TABLE order_items (
  order_id UUID,
  product_id UUID REFERENCES products(id),
  quantity INT,
  PRIMARY KEY (order_id, product_id)
);
```

### Primary Key Design

| PK Type | Size | Ordering | Distributed-Safe | Use Case |
|---------|------|----------|-----------------|----------|
| BIGSERIAL | 8 bytes | Monotonic | No | Single-node |
| UUID v4 | 16 bytes | Random | Yes | Distributed, no ordering need |
| UUID v7 | 16 bytes | Time-ordered | Yes | Distributed, time-sortable |
| ULID | 26 chars | Time-ordered | Yes | Human-readable IDs |

### Timestamp Columns
Every table should have `created_at` and `updated_at`:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## ENUM vs Reference Table

### Decision Rule
| Criterion | ENUM | Reference Table |
|-----------|------|-----------------|
| Values count | < 20 | Any count |
| Changes frequency | Rarely | Often |
| Has attributes | No | Yes |
| Multi-language | No | Yes |
| Admin-managed | No | Yes |

```sql
-- ENUM for stable, small value sets
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

-- Reference table for dynamic/attribute-rich value sets
CREATE TABLE product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id INT REFERENCES product_categories(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);
```

## Indexing Fundamentals

### B-Tree Index (Default)
Works for: equality, range, prefix of composite index, ORDER BY, JOIN columns.

```sql
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
```

### Composite Index Column Order
Place highest selectivity columns first:

```sql
-- Good: customer_id filters more rows than status
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);

-- Better: If status is always filtered, partial index is even better
CREATE INDEX idx_orders_active ON orders(customer_id) WHERE status = 'active';
```

### Partial Index
Index only a subset of rows — smaller, faster:
```sql
-- Only index active orders (assuming 80% are completed)
CREATE INDEX idx_active_orders ON orders(customer_id) WHERE status IN ('pending', 'confirmed');
```

### Covering Index
Include all columns needed by a query to avoid heap lookups:
```sql
CREATE INDEX idx_orders_summary ON orders(customer_id, status) INCLUDE (total_amount, created_at);
-- Query can be satisfied entirely from the index
SELECT total_amount, created_at FROM orders WHERE customer_id = '123' AND status = 'pending';
```

## Transaction Isolation Levels

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Use Case |
|-------|-----------|---------------------|-------------|----------|
| READ UNCOMMITTED | Possible | Possible | Possible | Rarely used |
| READ COMMITTED | Safe | Possible | Possible | Default (PostgreSQL) |
| REPEATABLE READ | Safe | Safe | Possible | Financial reports |
| SERIALIZABLE | Safe | Safe | Safe | Critical accounting |

```sql
-- Default: READ COMMITTED (PostgreSQL)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- SERIALIZABLE for critical operations
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT balance FROM accounts WHERE id = 1;
-- If balance >= amount, proceed
UPDATE accounts SET balance = balance - amount WHERE id = 1;
COMMIT;
```

## Migration Best Practices

### Migration File Structure
```sql
-- 20260101_create_users.sql
-- UP
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DOWN
DROP TABLE users;
```

### Zero-Downtime Migration Patterns

| Change Type | Safe Procedure | Downtime Risk |
|---|---|---|
| Add column with NULL default | `ALTER TABLE ADD COLUMN` | None |
| Add column with NOT NULL | Phase: add nullable, backfill, add NOT NULL | Low |
| Rename column | Add new, dual-write, migrate, remove old | Medium |
| Drop column | Mark deprecated, remove after monitoring | Low |
| Add index | `CREATE INDEX CONCURRENTLY` | None |
| Drop index | `DROP INDEX CONCURRENTLY` | None |
| Change column type | Add new, dual-write, backfill, swap | High |
| Split table | Create new, dual-write, backfill, migrate | Medium |

## Connection Pooling

### Pool Size Formula
```
pool_size = (cpu_cores * 2) + effective_disk_count
```

### Configuration Per Stack
```yaml
# PostgreSQL default pool settings
pgbouncer:
  pool_mode: transaction  # Best for web applications
  default_pool_size: 25
  max_client_conn: 100
  reserve_pool_size: 5
  reserve_pool_timeout: 3  # seconds
```

## Repository Pattern

### Interface Design
```typescript
// Aggregate-specific repository (one per aggregate root)
interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: CustomerId, options?: PaginationOptions): Promise<Order[]>;
  save(order: Order): Promise<void>;
  delete(id: OrderId): Promise<void>;
}
```

### Implementation Rules
- Methods accept domain entities, return domain entities
- Repository maps between ORM models and domain entities
- Save = UPSERT (insert or update)
- Repository never opens or commits transactions — that's Application concern
