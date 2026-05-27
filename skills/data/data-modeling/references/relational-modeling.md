# Relational Modeling

## Purpose

Relational data modeling defines how data is organized into tables (relations) with rows and columns, connected through keys and constraints. This covers normalization, denormalization, table inheritance patterns, temporal tables, soft delete strategies, audit columns, and key design decisions.

## Normalization

### First Normal Form (1NF)

Each column contains atomic values. No repeating groups or arrays.

```sql
-- NOT 1NF: multiple values in one column
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_name TEXT,
  product_ids TEXT  -- "p1,p2,p3" — repeating group!
);

-- 1NF: atomic columns
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_name TEXT
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL
);
```

### Second Normal Form (2NF)

In 2NF AND every non-key column depends on the FULL primary key (no partial dependencies).

```sql
-- NOT 2NF: composite PK, non-key depends on partial key
CREATE TABLE order_details (
  order_id UUID,
  product_id UUID,
  product_name TEXT,    -- Depends only on product_id, not on (order_id, product_id)
  quantity INTEGER,
  PRIMARY KEY (order_id, product_id)
);

-- 2NF: separate the partial dependency
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE order_items (
  order_id UUID,
  product_id UUID,
  quantity INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Third Normal Form (3NF)

In 2NF AND no transitive dependencies (non-key columns depend only on the primary key).

```sql
-- NOT 3NF: transitive dependency
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  customer_name TEXT,        -- Depends on customer_id, not on order_id
  customer_email TEXT        -- Depends on customer_id, not on order_id
);

-- 3NF: separate the entity
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### Normalization Decision Matrix

| Normal Form | Rule | When to Violate |
|-------------|------|-----------------|
| 1NF | Atomic columns | JSON/JSONB for flexible schema (PostgreSQL) |
| 2NF | Full key dependency | Denormalize for query performance |
| 3NF | No transitive dependency | Reporting/analytics tables |
| BCNF | Every determinant is a candidate key | Rarely violated intentionally |

## Denormalization

### When to Denormalize

Denormalization is justified only when query profiling proves a measurable performance benefit. Common cases:

```sql
-- Denormalized for performance: read-heavy reporting queries
-- Measure before and after with EXPLAIN ANALYZE

-- Normalized (slow): 3-table join for a simple report
SELECT o.id, c.name, c.email, SUM(oi.quantity * p.price) as total
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.created_at > '2026-01-01'
GROUP BY o.id, c.name, c.email;

-- Denormalized (fast): single table scan
SELECT id, customer_name, customer_email, total_amount
FROM order_summary
WHERE created_at > '2026-01-01';
```

### Denormalization Patterns

| Pattern | Description | Trade-off |
|---------|-------------|-----------|
| Pre-joined tables | Store join results in a summary table | Duplication, sync lag |
| Computed columns | `total_amount AS (SUM ...)` STORED | Storage cost |
| Materialized views | Query result cached as table | Refresh lag |
| JSON/JSONB aggregates | Related data in one column | No FK enforcement |
| Array columns | Lists of IDs/PKs | No referential integrity |

## Table Inheritance

### Single-Table Inheritance

All types in one table with nullable columns and a type discriminator.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'bank_transfer', 'crypto')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Credit card fields (nullable)
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  card_expiry DATE,

  -- Bank transfer fields (nullable)
  bank_account_last_four VARCHAR(4),
  bank_routing_number VARCHAR(9),

  -- Crypto fields (nullable)
  crypto_wallet_address TEXT,
  crypto_network TEXT,

  -- Constraint: only relevant fields based on type
  CONSTRAINT cc_fields_required CHECK (
    type != 'credit_card' OR (card_last_four IS NOT NULL AND card_brand IS NOT NULL)
  ),
  CONSTRAINT bank_fields_required CHECK (
    type != 'bank_transfer' OR (bank_account_last_four IS NOT NULL)
  )
);
```

### Class-Table Inheritance (Joined)

A base table with shared columns, and child tables with specific columns.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE credit_card_payments (
  id UUID PRIMARY KEY REFERENCES payments(id),
  card_last_four VARCHAR(4) NOT NULL,
  card_brand VARCHAR(20) NOT NULL,
  card_expiry DATE NOT NULL
);

CREATE TABLE bank_transfer_payments (
  id UUID PRIMARY KEY REFERENCES payments(id),
  bank_account_last_four VARCHAR(4) NOT NULL,
  bank_routing_number VARCHAR(9) NOT NULL
);

-- Query all with type check
SELECT p.*, cc.card_last_four, cc.card_brand
FROM payments p
LEFT JOIN credit_card_payments cc ON cc.id = p.id
LEFT JOIN bank_transfer_payments bt ON bt.id = p.id
WHERE p.id = 'some-id';
```

### Concrete-Table Inheritance

Each type has its own complete table with all columns (base + specific).

```sql
CREATE TABLE credit_card_payments (
  id UUID PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  card_last_four VARCHAR(4) NOT NULL,
  card_brand VARCHAR(20) NOT NULL,
  card_expiry DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_transfer_payments (
  id UUID PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  bank_account_last_four VARCHAR(4) NOT NULL,
  bank_routing_number VARCHAR(9) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Inheritance Strategy Comparison

| Strategy | Query Simplicity | Data Redundancy | FK Support | Schema Changes |
|----------|-----------------|-----------------|------------|----------------|
| Single-Table | Simple (one table) | High (many NULLs) | Yes | Easy (add column) |
| Class-Table | Moderate (joins) | Low | Yes | Moderate |
| Concrete-Table | Simple per-type | Medium (duplicate base cols) | No cross-type | Easy per table |

## Temporal Tables

### System-Versioned Temporal Tables (SQL:2011)

PostgreSQL 15+ native temporal tables.

```sql
-- PostgreSQL — system-versioned table
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  sys_period TSTZRANGE NOT NULL DEFAULT tstzrange(now(), null)
);

-- Query as of a point in time
SELECT * FROM employees WHERE sys_period @> '2026-03-15 12:00:00'::timestamptz;
```

### Manual Temporal Tables (Valid Time)

Track business-effective time ranges with valid_from / valid_to.

```sql
CREATE TABLE product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  price DECIMAL(10,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,  -- NULL = currently active
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: no overlapping validity periods
  EXCLUDE USING gist (
    product_id WITH =,
    daterange(valid_from, valid_to, '[]') WITH &&
  )
);

-- Query price at a specific date
SELECT price FROM product_prices
WHERE product_id = 'some-product'
  AND daterange(valid_from, valid_to, '[]') @> '2026-05-15'::date;
```

### Temporal Pattern Comparison

| Pattern | Tracks | Use Case |
|---------|--------|----------|
| System-versioned | When row changed | Audit, compliance |
| Valid-time | Business effective period | Pricing, contracts |
| Bi-temporal | Both when + effective | Insurance, financial |

## Soft Delete vs Hard Delete

### Soft Delete

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN deleted_by UUID REFERENCES users(id);

-- Index for active records only
CREATE INDEX idx_users_active ON users(email) WHERE deleted_at IS NULL;

-- Query filtering
SELECT * FROM users WHERE deleted_at IS NULL;
-- Or create a view
CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL;

-- Soft delete
UPDATE users SET deleted_at = now(), deleted_by = 'admin-user' WHERE id = 'user-123';
```

### Hard Delete

```sql
-- Permanent removal
DELETE FROM users WHERE id = 'user-123';

-- Cascade to related data
DELETE FROM users WHERE id = 'user-123' CASCADE;
```

### Deletion Strategy Decision

| Criterion | Soft Delete | Hard Delete |
|-----------|-------------|-------------|
| Recovery | Possible | Impossible (without backup) |
| FK constraints | Maintained | Must cascade or fail |
| Query performance | Must filter by deleted_at | No filter needed |
| Data volume | Grows unbounded | Managed |
| Compliance | Required for audit | OK for transient data |
| Unique constraints | Must include deleted_at | Simpler |

### Soft Delete with Unique Constraints

```sql
-- Allow reusing an email after soft delete
CREATE UNIQUE INDEX idx_users_email_active
  ON users(email) WHERE deleted_at IS NULL;

-- Allow non-deleted users to have unique emails
-- Deleted users can have duplicate emails (or include deleted_at in unique)
```

## Audit Columns

### Standard Audit Columns

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Business columns
  customer_id UUID NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',

  -- Standard audit columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1  -- Optimistic locking
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_modtime
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();
```

### Immutable Audit Log

For true audit trails, use an append-only event log instead of mutable columns:

```sql
CREATE TABLE order_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  immutable CHECK (id IS NOT NULL)  -- Prevent updates/deletes
);

-- Prevent modifications
CREATE RULE order_audit_log_no_update AS
  ON UPDATE TO order_audit_log DO INSTEAD NOTHING;
CREATE RULE order_audit_log_no_delete AS
  ON DELETE TO order_audit_log DO INSTEAD NOTHING;
```

## Composite Keys vs Surrogate Keys

### Surrogate Keys (Default)

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Surrogate key
  sku VARCHAR(50) NOT NULL UNIQUE,                 -- Business key (unique, not PK)
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Composite (Natural) Keys

```sql
-- Junction table — composite key is appropriate
CREATE TABLE order_items (
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (order_id, product_id)  -- Composite PK
);

-- Natural key — stable and unique
CREATE TABLE country_codes (
  code CHAR(2) PRIMARY KEY,  -- ISO 3166-1 alpha-2
  name TEXT NOT NULL
);
```

### Key Decision Matrix

| Criterion | Surrogate Key | Natural Key | Composite Key |
|-----------|--------------|-------------|---------------|
| Stability | Always stable | May change | May change |
| Simplicity | Single column | Single column | Multiple columns |
| FK references | Clean, single column | Single column | Multiple columns |
| Performance | Good (narrow) | Good | Wider = slower |
| Meaning | None | Meaningful | Meaningful |
| Use case | All primary tables | ISO codes, tax IDs | Junction tables |

### Migration from Natural to Surrogate Key

```sql
-- Step 1: Add surrogate key
ALTER TABLE orders ADD COLUMN id UUID DEFAULT gen_random_uuid();
-- Step 2: Backfill
UPDATE orders SET id = gen_random_uuid() WHERE id IS NULL;
-- Step 3: Add NOT NULL
ALTER TABLE orders ALTER COLUMN id SET NOT NULL;
-- Step 4: Add unique constraint on old natural key
ALTER TABLE orders ADD CONSTRAINT uq_order_number UNIQUE (order_number);
-- Step 5: Add PK on surrogate key
ALTER TABLE orders ADD PRIMARY KEY (id);
-- Step 6: Update FKs in child tables
ALTER TABLE order_items ADD COLUMN order_id UUID;
UPDATE order_items oi SET order_id = o.id FROM orders o WHERE oi.order_number = o.order_number;
ALTER TABLE order_items ALTER COLUMN order_id SET NOT NULL;
ALTER TABLE order_items ADD FOREIGN KEY (order_id) REFERENCES orders(id);
```

## Key Points

- Normalize to 3NF by default. Denormalize only when performance measurement proves it necessary.
- Single-table inheritance for simple type hierarchies with few differing columns.
- Class-table inheritance for strict type separation with shared base.
- Temporal tables (system-versioned or valid-time) for history tracking and point-in-time queries.
- Soft delete for most data. Hard delete only for transient/trivial data or when required by law.
- Every table needs audit columns: created_at, updated_at, created_by.
- Surrogate keys (UUID v7) are the default PK. Natural keys only for stable external identifiers.
- Composite keys only for junction/join tables.
- Index every foreign key column.
- Prefer soft delete with unique partial indexes for query performance.
