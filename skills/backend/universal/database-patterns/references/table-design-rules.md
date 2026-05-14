# Table Design Rules

This document covers: table structure conventions, soft delete, indexing & partitioning strategy, PK/FK limitation rules (prefer enum), and mandatory PK/FK usage patterns.

---

## 1. Table Structure Conventions

### Every Table MUST Have

```sql
CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- UUID v7 preferred
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ                               -- soft delete (nullable)
);
```

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Table name | snake_case, plural | `orders`, `order_items` |
| Primary key | `id` | `id UUID PRIMARY KEY` |
| Foreign key | `{singular_table}_id` | `customer_id`, `product_id` |
| Column | snake_case | `first_name`, `created_at` |
| Index | `idx_{table}_{column}` | `idx_orders_customer_id` |
| Unique constraint | `uq_{table}_{column}` | `uq_users_email` |
| FK constraint | `fk_{child}_{parent}` | `fk_order_items_order` |

### Column Order Convention

```
1. id (PK)
2. foreign keys
3. business data columns (ordered by importance)
4. status/enum columns
5. audit timestamps (created_at, updated_at, deleted_at)
6. version/lock column (optional, for optimistic locking)
```

### Data Type Selection Rules

| Data | Type | Reason |
|---|---|---|
| Primary key | `UUID` (v7) | Distributed-safe, time-sortable |
| Auto-increment ID | `BIGSERIAL` | Only when single-node, no sharding |
| Decimal money | `DECIMAL(19,4)` or `BIGINT` (cents) | Never `FLOAT`/`DOUBLE` for money |
| Text (short) | `VARCHAR(255)` | Indexable efficiently |
| Text (long) | `TEXT` | No performance penalty vs VARCHAR(n) |
| Boolean | `BOOLEAN` | Never `CHAR(1)` or `INT` for boolean |
| Date/time | `TIMESTAMPTZ` | Always with timezone, store UTC |
| JSON | `JSONB` (PostgreSQL) / `JSON` (MySQL) | Only when schema is truly dynamic |
| Enum | Native `ENUM` type | See PK/FK rules below |

---

## 2. Soft Delete — Full Specification

### Why Soft Delete

- Data recovery after accidental deletion.
- Referential integrity maintenance (FKs don't break).
- Audit trail for compliance.
- CASCADE deletion prevention.

### Implementation

```sql
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMPTZ;

-- All queries MUST filter soft-deleted rows
SELECT * FROM orders WHERE deleted_at IS NULL;

-- Or use a view
CREATE VIEW active_orders AS
SELECT * FROM orders WHERE deleted_at IS NULL;
```

### ORM Global Filter

```typescript
// TypeORM
@Entity()
@Where('deleted_at IS NULL')
export class Order { ... }

// Prisma
model Order {
  deleted_at DateTime? @map("deleted_at")
  @@where("deleted_at IS NULL")
}
```

### Soft Delete Patterns

| Pattern | Implementation | When |
|---|---|---|
| **Nullable TIMESTAMPTZ** | `deleted_at TIMESTAMPTZ` | Default. NULL = active, timestamp = deleted |
| **IsActive boolean** | `is_active BOOLEAN DEFAULT true` | When creation/deletion time not needed |
| **DeletedBy tracking** | Add `deleted_by UUID REFERENCES users(id)` | Audit compliance requirement |
| **Hard + Soft** | Separate `_archive` table + move on delete | Performance-critical, need to purge main table |

### CRUD with Soft Delete

```sql
-- CREATE: no change needed
INSERT INTO orders (...) VALUES (...);  -- deleted_at defaults to NULL

-- READ: always filter
SELECT * FROM orders WHERE deleted_at IS NULL AND status = 'pending';

-- UPDATE: no change needed
UPDATE orders SET status = 'shipped' WHERE id = $1 AND deleted_at IS NULL;

-- DELETE: update, not destroy
UPDATE orders SET deleted_at = NOW() WHERE id = $1;

-- HARD DELETE: only for cleanup scripts, never from application code
DELETE FROM orders WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';

-- RESTORE: only for admin operations
UPDATE orders SET deleted_at = NULL WHERE id = $1;
```

### Unique Constraints with Soft Delete

Soft delete BREAKS unique constraints unless properly handled.

**Problem**:
```sql
CREATE TABLE users (
    email VARCHAR(255) UNIQUE,
    deleted_at TIMESTAMPTZ
);
-- Deleting user1@email.com, then creating new user with same email:
-- ERROR: duplicate key value violates unique constraint
```

**Solutions**:

| Solution | Pros | Cons |
|---|---|---|
| **Include deleted_at in unique constraint** | Works with NULLs | Complex index, NULL storage |
| **Use partial unique index** | Clean, handles NULL correctly | PostgreSQL only |
| **Append timestamp to deleted value** | Simple, universal | Data pollution |
| **Nullable deleted_at with NULLS NOT DISTINCT** | Perfect (PostgreSQL 15+) | Requires PG15+ |

**PostgreSQL 15+ (RECOMMENDED)**:
```sql
CREATE UNIQUE INDEX uq_users_email ON users(email) WHERE deleted_at IS NULL;
-- Or PG15+
CREATE UNIQUE INDEX uq_users_email ON users(email) NULLS NOT DISTINCT;
```

**MySQL / Older PostgreSQL**:
```sql
-- Append deleted timestamp to preserve uniqueness
UPDATE users SET email = CONCAT(email, '--deleted-', NOW()), deleted_at = NOW() WHERE id = $1;
```

---

## 3. Indexing & Partitioning

### Index Type Selection

```sql
-- B-tree (default, for equality + range)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Composite B-tree (multi-column, order by selectivity)
-- Rule: column order = highest selectivity first
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
-- Good for: WHERE status = 'pending' AND created_at > '2026-01-01'

-- Covering Index (includes extra columns, avoids heap lookup)
CREATE INDEX idx_orders_list ON orders(customer_id, status, created_at) INCLUDE (total, currency);

-- Partial Index (filters subset, smaller index)
-- Rule: 90%+ of rows filtered out? Use partial index.
CREATE INDEX idx_orders_active ON orders(created_at) WHERE status = 'pending';
-- Index size: 10% of full index if only 10% of orders are pending

-- Unique Partial Index (for soft-delete uniqueness)
CREATE UNIQUE INDEX uq_users_active_email ON users(email) WHERE deleted_at IS NULL;

-- GIN (JSONB / array / full-text)
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name));

-- BRIN (physically sorted data, huge tables)
-- Rule: data is insert-ordered (monotonically increasing) AND table is >100GB
CREATE INDEX idx_orders_created_brin ON orders USING BRIN(created_at) WITH (pages_per_range = 32);
```

### Index Decision Matrix

| Query Pattern | Index Type | Column Order |
|---|---|---|
| `WHERE fk_id = ?` | B-tree | Single column |
| `WHERE status = ? AND created_at > ?` | Composite B-tree | high-selectivity first |
| `WHERE status = ? ORDER BY created_at` | Composite B-tree | `(status, created_at)` |
| `WHERE deleted_at IS NULL AND email = ?` | Partial unique | `(email)` with WHERE |
| `WHERE tags @> ?` | GIN | — |
| `WHERE text ILIKE '%search%'` | Trigram GIN | `pg_trgm` extension |
| `WHERE ST_DWithin(geo, ?, 100)` | GiST | — |

### Index Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Indexing every column | Write slowdown, index bloat | Only index WHERE/JOIN/ORDER BY columns |
| Indexing boolean alone | Index never used (low cardinality) | Composite with higher-selectivity column |
| Indexing TEXT column | Huge index | Use full-text search or trigram |
| Indexing rarely-queried table | Wasted storage | Drop index, add when query pattern emerges |
| Redundant indexes | Multiple indexes with same leading column | Keep only the most useful composite |
| Over-indexing small tables (<1000 rows) | Index overhead > scan cost | Drop indexes, sequential scan is fine |

### Partitioning

#### When to Partition

| Condition | Partition Type |
|---|---|
| Table >100GB or >100M rows | Range partition |
| Time-series data (logs, events) | Range by month/week |
| Multi-tenant with tenant isolation | List by tenant_id |
| Archival data | Range by created_at, detach old partitions |

#### Range Partitioning (by date)

```sql
CREATE TABLE orders (
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    customer_id UUID NOT NULL,
    total DECIMAL(19,4)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_01 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE orders_2026_02 PARTITION OF orders
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Auto-create partitions with pg_partman (PostgreSQL)
SELECT partman.create_parent('public.orders', 'created_at', 'monthly', p_premake := 3);
```

#### List Partitioning (by tenant/region)

```sql
CREATE TABLE events (
    id UUID NOT NULL,
    tenant_id INT NOT NULL,
    payload JSONB
) PARTITION BY LIST (tenant_id);

CREATE TABLE events_tenant_1 PARTITION OF events FOR VALUES IN (1);
CREATE TABLE events_tenant_2 PARTITION OF events FOR VALUES IN (2);
CREATE TABLE events_default PARTITION OF events DEFAULT;
```

#### Sub-partitioning

```sql
CREATE TABLE logs (
    id UUID NOT NULL,
    level TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- First level: monthly
CREATE TABLE logs_2026_01 PARTITION OF logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01')
    PARTITION BY LIST (level);

-- Second level: by log level
CREATE TABLE logs_2026_01_error PARTITION OF logs_2026_01 FOR VALUES IN ('ERROR');
CREATE TABLE logs_2026_01_other PARTITION OF logs_2026_01 DEFAULT;
```

#### Partition Maintenance

```sql
-- Detach old partition (fast, no data copy)
ALTER TABLE orders DETACH PARTITION orders_2024;

-- Attach as separate table for archival
ALTER TABLE orders_2024 SET SCHEMA archive;

-- Attach new partition
CREATE TABLE orders_2026_05 PARTITION OF orders
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

#### Partition Index Rules

```sql
-- Index on parent applies to ALL partitions automatically
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
-- This creates indexes on each partition: orders_2026_01, orders_2026_02, ...

-- Unique constraint MUST include partition key
CREATE UNIQUE INDEX uq_orders_id ON orders(id, created_at);
```

---

## 4. PK/FK Limitation — When NOT to Use. Prefer Enum.

### Rule 1: Tiny Reference Data → Use Enum, NOT a Table

**BAD — FK to tiny lookup table**:
```sql
CREATE TABLE order_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    label VARCHAR(100)
);
INSERT INTO order_statuses VALUES (1, 'pending', 'Pending'), (2, 'shipped', 'Shipped');

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    status_id INT REFERENCES order_statuses(id)  -- BAD: FK to 3-row table
);
```

**GOOD — Native ENUM**:
```sql
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    status order_status NOT NULL DEFAULT 'pending'
);
```

**When to use ENUM**:
- Table has <20 rows
- Values are static (rarely change)
- Values have no additional attributes (no label, description, metadata)
- Values are referenced only by code, not by ID

**When to use lookup table**:
- Values have attributes (label, description, sort_order, color)
- Values change frequently (admin-managed)
- Values are referenced by ID from external systems
- Multi-language labels needed

### Rule 2: Many-to-Many with Only Two Records → Reconsider Design

**BAD**:
```sql
CREATE TABLE payment_types (id SERIAL PRIMARY KEY, code VARCHAR(20));
-- Only has: (1, 'credit_card'), (2, 'paypal')

CREATE TABLE order_payments (
    order_id UUID REFERENCES orders(id),
    payment_type_id INT REFERENCES payment_types(id)  -- BAD: over-engineered
);
```

**GOOD — Simple column**:
```sql
CREATE TYPE payment_type AS ENUM ('credit_card', 'paypal');

CREATE TABLE order_payments (
    order_id UUID REFERENCES orders(id),
    payment_type payment_type NOT NULL
);
```

### Rule 3: Polymorphic FK → Use Alternative Patterns

**BAD — Polymorphic FK**:
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    commentable_type VARCHAR(50),  -- 'order' or 'product'
    commentable_id UUID,           -- FK value, BUT NO FK CONSTRAINT
    content TEXT
);
-- NO referential integrity. Cannot declare FK because target table varies.
```

**Instead**:

**Option A — Separate join tables**:
```sql
CREATE TABLE order_comments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    content TEXT NOT NULL
);
CREATE TABLE product_comments (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id),
    content TEXT NOT NULL
);
```

**Option B — Single table with CHECK + triggers (PostgreSQL)**:
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('order', 'product')),
    target_id UUID NOT NULL,
    content TEXT NOT NULL,
    -- Cannot declare FK. Must use triggers or application enforcement.
    CONSTRAINT uq_comment_target UNIQUE (target_type, target_id, id)
);
```

### Rule 4: Circular FK Dependencies → Break the Cycle

**BAD**:
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES employees(id)
);

CREATE TABLE departments (
    id UUID PRIMARY KEY,
    head_employee_id UUID REFERENCES employees(id)  -- CIRCULAR!
);
```

**FIX — Remove one direction, enforce in application**:
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES employees(id)
);
-- Remove head_employee_id from departments
-- Application code finds department head by querying employees
```

### Rule 5: Avoid `ON DELETE CASCADE` Unless Proven Necessary

**Problem**: Cascading deletes silently remove data. Production data loss is invisible until too late.

```sql
-- BAD: silent data loss
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE
);
-- Deleting an order silently removes ALL items and ALL related data

-- GOOD: mark and archive
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMPTZ;
-- Application handles archival explicitly

-- ACCEPTABLE (with caution): soft delete pattern
-- Use RESTRICT or NO ACTION by default
-- Use CASCADE only when: the child has NO meaning without parent AND parent deletion is a privileged admin operation
```

---

## 5. Mandatory PK/FK — When Required and How to Handle Properly

### When PK/FK is MANDATORY

1. **Core business entities** (orders, invoices, customers, products)
2. **Transaction records** (payments, shipments, audit logs)
3. **Data that must be consistent** (inventory counts, account balances)
4. **Compliance-required data** (GDPR audit trail, financial records)

### Proper FK Design Rules

#### Rule 1: Always Index FKs

```sql
-- Every FK MUST have an index
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

**Without index**: Deleting from parent table scans child table FULL (deadlock risk, performance disaster).

#### Rule 2: Set Clear ON DELETE Behavior

```sql
-- ON DELETE RESTRICT (default) — prevent deletion if children exist
order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT;

-- ON DELETE SET NULL — allow deletion, set FK to NULL
order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- ON DELETE CASCADE — ONLY for closely coupled aggregates
order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE;

-- NEVER: ON DELETE SET DEFAULT (creates hard-to-find data corruption)
```

**Selection matrix**:

| Relationship | ON DELETE | Example |
|---|---|---|
| Child cannot exist without parent and must be deleted | CASCADE | Order → OrderItems |
| Child can exist without parent (optional) | SET NULL | Order → ShippedBy (employee who left) |
| Prevent deletion if children exist | RESTRICT (default) | Customer → Orders |
| Prevent deletion + notify | RESTRICT + application handling | Product → OrderItems |

#### Rule 3: Handle Circular References

```sql
-- Solution: DEFERRABLE constraints
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    manager_id UUID REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED
);

-- Insert in any order within a transaction
BEGIN;
SET CONSTRAINTS ALL DEFERRED;
INSERT INTO employees (id, manager_id) VALUES ('emp-1', 'emp-2');
INSERT INTO employees (id, manager_id) VALUES ('emp-2', 'emp-1');
COMMIT;
```

#### Rule 4: Composite FK with Ordering

```sql
-- Multi-column FK for partitioned tables
CREATE TABLE orders (
    tenant_id INT NOT NULL,
    id UUID NOT NULL,
    PRIMARY KEY (tenant_id, id)
);

CREATE TABLE order_items (
    tenant_id INT NOT NULL,
    id UUID NOT NULL,
    order_id UUID NOT NULL,
    -- Composite FK referencing the parent PK
    FOREIGN KEY (tenant_id, order_id) REFERENCES orders(tenant_id, id),
    PRIMARY KEY (tenant_id, id)
);
```

### FK Performance Optimization

```sql
-- 1. Batch insert with FK checks deferred
SET CONSTRAINTS ALL DEFERRED;
INSERT INTO order_items (...) VALUES (...), (...), (...);  -- 1000 rows
SET CONSTRAINTS ALL IMMEDIATE;  -- Check all at once

-- 2. FK check on large batch: disable + enable (maintenance only)
SET session_replication_role = replica;
-- bulk load
SET session_replication_role = origin;

-- 3. Use NOT VALID to add FK without locking (PostgreSQL)
ALTER TABLE order_items ADD CONSTRAINT fk_oi_order
    FOREIGN KEY (order_id) REFERENCES orders(id) NOT VALID;
-- Then validate in background
ALTER TABLE order_items VALIDATE CONSTRAINT fk_oi_order;
```

### Cascade Update Nightmare

```sql
-- BAD: Cascade update changes PK — breaks ALL references
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- UUID never changes
    email VARCHAR(255) UNIQUE
);

-- NATURAL PK is the nightmare:
CREATE TABLE customers (
    email VARCHAR(255) PRIMARY KEY  -- BAD: email changes!
);
-- Updating email cascades to ALL FKs referencing this table
```

**Rule**: Always use SURROGATE PK (UUID or BIGSERIAL). Never use natural keys (email, SSN, username) as PK. Natural keys change → cascade update hell.

---

## Summary Decision Flow

```
QUESTION: Should this be a table or an ENUM?
├── Data has <20 rows AND values are static AND no attributes?
│   → ENUM
├── Data has attributes, changes frequently, admin-managed?
│   → Lookup table with FK
├── Data is core business entity (>1000 rows)?
│   → Table with FK (surrogate PK)

QUESTION: Should I use FK or not?
├── Core business entity? → YES, FK is mandatory
├── Polymorphic reference? → NO, use separate table
├── Cross-database reference (microservices)? → NO, use application-level ref
├── Tiny lookup (<10 rows)? → ENUM, no FK needed
├── Circular dependency? → Break cycle or use DEFERRABLE

QUESTION: ON DELETE what?
├── Child is part of aggregate (Order → Items)? → CASCADE
├── Child can exist without parent? → SET NULL
├── Must prevent accidental deletion? → RESTRICT (default)
└── Unsure? → RESTRICT. Never regret preventing data loss.
```

---

## PS: Handling FK on Large Tables Safely

| Operation | Lock | Safe Window |
|---|---|---|
| Add FK (NOT VALID) | No lock on reads/writes | Anytime |
| Validate FK | ShareLock (brief) | Low traffic |
| Add FK with VALIDATE | AccessExclusiveLock | Maintenance window |
| Drop FK | AccessExclusiveLock | Brief, but block all |

```sql
-- Safe FK addition (zero downtime)
ALTER TABLE order_items ADD CONSTRAINT fk_oi_order
    FOREIGN KEY (order_id) REFERENCES orders(id) NOT VALID;
-- Run in application code periodically to validate:
ALTER TABLE order_items VALIDATE CONSTRAINT fk_oi_order;
```
