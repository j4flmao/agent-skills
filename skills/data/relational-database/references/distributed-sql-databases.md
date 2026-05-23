# Distributed SQL Databases

## Common Architecture

Distributed SQL databases share a layered architecture:

```
SQL Layer:        PostgreSQL wire protocol, SQL parser, planner
                  │
Distribution:     Query routing, distributed joins, 2PC transactions
                  │
Replication:      Raft/Paxos consensus, synchronous replication
                  │
Storage:          LSM-tree or B-tree, range/hash partitioning
```

## Google Cloud Spanner

### TrueTime and External Consistency
Spanner uses TrueTime — a global clock system based on GPS and atomic clocks — to provide external consistency (linearizability) across global deployments. TrueTime exposes a time interval `[earliest, latest]` for the current time. Spanner uses commit-wait: after a write commits, it waits until `TT.after(commit_timestamp)` is true, ensuring all subsequent reads see the write.

### Interleaved Tables (Row Locality)
```sql
CREATE TABLE orders (
    id INT64 NOT NULL,
    customer_id INT64 NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP NOT NULL,
) PRIMARY KEY (id, created_at);

-- Interleave order_items inside orders (co-located storage)
CREATE TABLE order_items (
    order_id INT64 NOT NULL,
    item_id INT64 NOT NULL,
    product_id INT64 NOT NULL,
    quantity INT64 NOT NULL,
    unit_price NUMERIC NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id)
) PRIMARY KEY (order_id, item_id),
  INTERLEAVE IN PARENT orders ON DELETE CASCADE;

-- Query benefits from row locality: items stored with their order
SELECT o.id, o.total, i.product_id, i.quantity
FROM orders o JOIN order_items i ON o.id = i.order_id
WHERE o.id = @order_id;
```

### Change Streams (CDC)
```sql
CREATE CHANGE STREAM order_changes
FOR orders, order_items
OPTIONS (retention_period = '7d');
```

## CockroachDB

### Raft-Based Replication
CockroachDB uses the Raft consensus protocol for replication. Data is range-partitioned (default 512 MB per range), each range has 3-5 replicas via Raft. Reads and writes to a range go through the Raft leader for that range.

### Geo-Partitioning
```sql
-- Table with geo-partitioning for data residency
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_data JSONB,
    region STRING NOT NULL
) PARTITION BY LIST (region) (
    PARTITION us_east VALUES IN ('us-east-1', 'us-east-2'),
    PARTITION eu_west VALUES IN ('eu-west-1', 'eu-west-2'),
    PARTITION ap_southeast VALUES IN ('ap-southeast-1')
);

-- Pin partitions to specific regions
ALTER PARTITION us_east OF TABLE user_sessions
    CONFIGURE ZONE USING
        constraints = '[+region=us-east-1]',
        num_replicas = 3,
        lease_preferences = '[[+region=us-east-1]]';
```

## YugabyteDB

### DocDB Storage
YugabyteDB uses DocDB, a distributed document store based on Raft. Each row is stored as a document with column-level versioning. The PostgreSQL query layer translates SQL into DocDB operations.

### Hash and Range Sharding
```sql
-- Hash sharding (default, for even distribution)
CREATE TABLE events (
    event_id UUID DEFAULT gen_random_uuid(),
    event_type TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ
) SPLIT INTO 8 TABLETS;

-- Range sharding (for ordered scans)
CREATE TABLE time_series (
    device_id UUID,
    ts TIMESTAMPTZ,
    value DOUBLE PRECISION,
    PRIMARY KEY (device_id HASH, ts ASC)
) SPLIT AT VALUES (
    (uuid_generate_v5('00000000-0000-0000-0000-000000000001'), '-infinity'),
    ...
);
```

## Selection Matrix

| Feature | Spanner | CockroachDB | YugabyteDB |
|---------|---------|-------------|------------|
| Consistency | External (TrueTime) | Serializable | Serializable |
| SQL compatibility | GoogleSQL/PG | PostgreSQL | PostgreSQL |
| Replication | Paxos | Raft | Raft |
| Global deployment | Native | Multi-region | Geo-partitioned |
| Storage | Colossus FS | RocksDB | DocDB (LSM) |
| Sharding | Range (automatic) | Range (automatic) | Hash or range |
| Failover | Automatic (managed) | Automatic | Automatic |
| Cloud only? | GCP only | Any | Any |
