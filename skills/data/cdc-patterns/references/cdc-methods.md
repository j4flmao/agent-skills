# CDC Methods Reference

## Log-Based CDC

### MySQL Binary Log (binlog)
```
binlog_format = ROW  (required for CDC)
  STATEMENT:      logs SQL statements (non-deterministic, not for CDC)
  ROW:            logs each row change (deterministic, complete data)
  MIXED:          statement by default, row for non-deterministic

binlog_row_image = FULL (required for before/after)
  FULL:   all columns in before/after image
  MINIMAL: only PK + changed columns
  NOBLOB:  all columns except BLOB/TEXT

binlog structure:
  mysql-bin.000001 (starting at position 4)
  mysql-bin.000002 (rotated)
  Each event: timestamp, server_id, event_type (WriteRows, UpdateRows), row data

position tracking:
  GTID: Global Transaction ID (server_uuid:transaction_id)
    - Consistent across failover
    - Example: 3E11FA47-71CA-11E1-9E33-C80AA9429562:23
  File + position: mysql-bin.000001, pos=456
    - Lost on master failover (need GTID for HA)

Row-based event (update):
  before: {id: 1, name: "Alice", email: "alice@old.com", status: "inactive"}
  after:  {id: 1, name: "Alice", email: "alice@new.com", status: "active"}
```

### PostgreSQL Write-Ahead Log (WAL)
```
wal_level = logical (required for CDC)
  minimal:   enough for crash recovery
  replica:   enough for physical streaming replication
  logical:   enough for logical decoding (CDC)

Logical decoding plugins:
  pgoutput:   built-in PG14+, native, fastest, recommended
  decoderbufs: protobuf, good performance, requires protobuf lib
  wal2json:   JSON output, easiest to debug, most overhead

Replication slot:
  - Ensures WAL is not removed until consumer processes it
  - Created by Debezium, must be monitored (can cause WAL bloat)
  - SELECT * FROM pg_replication_slots;
  - Alerts: slot lag > 1GB = consumer is too far behind

Publication:
  - Defines which tables/schemas are published
  - CREATE PUBLICATION debezium FOR TABLE public.orders, public.customers;
  - ALTER PUBLICATION debezium ADD TABLE public.products;

WAL position:
  pg_current_wal_flush_lsn() -> 0/17585C8 (log sequence number)
  Consumer tracks: confirmed_flush_lsn
```

### MongoDB Change Streams
```
Change stream via oplog.rs (replica set):
  - Requires replica set (not standalone)
  - Watches: collection, database, or entire cluster
  - Resume token for restart

Change event:
  {
    "_id": {"_data": "826..."},  // resume token
    "operationType": "insert" | "update" | "replace" | "delete",
    "ns": {"db": "sales", "coll": "orders"},
    "documentKey": {"_id": ObjectId("...")},
    "fullDocument": {...},  // only for insert/replace, or lookup
    "updateDescription": {  // only for update
      "updatedFields": {"status": "shipped"},
      "removedFields": []
    },
    "clusterTime": Timestamp(1712345678, 1)
  }
```

### Oracle Redo Log (LogMiner/XStream)
```
LogMiner:
  - Ships with Oracle, reads online redo logs + archive logs
  - Supplemental logging required: ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;
  - Performance: can be CPU-intensive on source

XStream:
  - Oracle GoldenGate-integrated, lower overhead than LogMiner
  - Requires XStream API setup in Oracle
  - Outbound server: handles change capture and streaming

Ora2PG / alternative:
  - Debezium Oracle connector uses LogMiner
  - Requires: grant LOGMINING, SELECT on V$DATABASE, EXECUTE on DBMS_LOGMNR
```

## Trigger-Based CDC

```sql
-- MySQL example: changelog table + triggers
CREATE TABLE orders_changelog (
  changelog_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(100),
  operation ENUM('INSERT', 'UPDATE', 'DELETE'),
  primary_key BIGINT,
  row_data JSON,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change_user VARCHAR(100)
);

CREATE TRIGGER orders_insert AFTER INSERT ON orders
FOR EACH ROW
INSERT INTO orders_changelog (table_name, operation, primary_key, row_data)
VALUES ('orders', 'INSERT', NEW.id, JSON_OBJECT(
  'id', NEW.id, 'customer_id', NEW.customer_id,
  'amount', NEW.amount, 'status', NEW.status
));

CREATE TRIGGER orders_update AFTER UPDATE ON orders
FOR EACH ROW
INSERT INTO orders_changelog (table_name, operation, primary_key, row_data)
VALUES ('orders', 'UPDATE', NEW.id, JSON_OBJECT(
  'id', NEW.id, 'customer_id', NEW.customer_id,
  'amount', NEW.amount, 'status', NEW.status,
  '_before_status', OLD.status  -- track old value
));

CREATE TRIGGER orders_delete AFTER DELETE ON orders
FOR EACH ROW
INSERT INTO orders_changelog (table_name, operation, primary_key, row_data)
VALUES ('orders', 'DELETE', OLD.id, JSON_OBJECT(
  'id', OLD.id, 'customer_id', OLD.customer_id,
  'amount', OLD.amount, 'status', OLD.status
));

-- Consumer: read from changelog where changelog_id > last_processed
-- Cleanup: delete changelog older than 7 days
```

## Timestamp-Based CDC

```sql
-- Requires: modified_at column with index
-- Assumes: clock is accurate (NTP)
-- Limitation: does not capture deletes (unless soft-delete)

SELECT *
FROM orders
WHERE modified_at > @last_processed
ORDER BY modified_at ASC
LIMIT 1000;

-- Handle deletes (soft delete pattern):
SELECT *
FROM orders
WHERE (modified_at > @last_processed OR deleted_at > @last_processed)
ORDER BY GREATEST(modified_at, deleted_at) ASC
LIMIT 1000;

-- Risk: clock skew between DB and CDC consumer
-- Mitigation: subtract 5s from last_processed timestamp (safe window)
-- Risk: missed rows if modified_at equals last_processed (off-by-one)
-- Mitigation: use >= with dedup on consumer side
```

## Snapshot Modes Comparison

| Mode           | Behavior                                  | Use Case                       |
|---------------|-------------------------------------------|--------------------------------|
| initial       | Snapshot all data, then stream changes     | New CDC pipeline (recommended) |
| initial_only  | Snapshot, stop (no streaming)              | One-time data migration        |
| when_needed   | Snapshot only if no offset exists          | Restart existing connector     |
| never         | No snapshot, stream only                    | Source already replicated      |
| schema_only   | Capture schema, no data                    | Schema sync only               |

## Method Selection Decision

```
Start:
  Do you have access to DB logs (binlog/WAL)?
    NO  -> Can you add triggers?
      YES -> Trigger-based CDC (lower volume, <500 TPS)
      NO  -> Timestamp-based CDC (requires modified_at column)
    YES -> Is log-based performance acceptable?
      YES -> Log-based CDC (Debezium, all databases)
      NO  -> Timestamp-based CDC (simple, less overhead)

Additional considerations:
  - Delete capture? Log-based = yes, Trigger = yes (with delete trigger), Timestamp = no (soft-delete required)
  - Schema changes? Log-based = captured, Trigger = need trigger update, Timestamp = (any schema DDL only)
  - Infrastructure? Log-based = Debezium + Kafka, Trigger = changelog table, Timestamp = no extra infra
```
