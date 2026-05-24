# Debezium Deep Dive Reference

## Architecture Overview

Debezium is a distributed CDC platform built on Kafka Connect. Each connector reads the database transaction log and emits change events to Kafka topics.

```
Source DB → Debezium Connector → Kafka Connect → Kafka Topic → Sink Connectors
             (reads log)          (manages tasks)  (events)     (to targets)
```

### Core Concepts

- **Connector:** A Kafka Connect job that reads change events from a source database
- **Task:** A parallel worker within a connector (one task per partition for some databases)
- **Offset:** A position in the database log, stored in Kafka Connect offset storage
- **Topic:** Each source table maps to one Kafka topic
- **Heartbeat:** Periodic events to track connector health when no data changes

## MySQL Connector Configuration

### Requirements

```ini
# MySQL server config (my.cnf)
[mysqld]
server_id = 1
log_bin = mysql-bin
binlog_format = ROW
binlog_row_image = FULL
expire_logs_days = 7
gtid_mode = ON
enforce_gtid_consistency = ON
```

### Connector Config

```json
{
  "name": "inventory-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql.inventory.internal",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "${MYSQL_DEBEZIUM_PASSWORD}",
    "database.server.id": "184054",
    "database.server.name": "inventory",
    "database.include.list": "inventory",
    "table.include.list": "inventory.customers,inventory.orders,inventory.products",
    "database.history.kafka.bootstrap.servers": "kafka-cluster:9092",
    "database.history.kafka.topic": "schema-changes.inventory",
    "include.schema.changes": "false",
    "snapshot.mode": "initial",
    "snapshot.locking.mode": "minimal",
    "tombstones.on.delete": "false",
    "column.propagate.source.type": ".*",
    "decimal.handling.mode": "precise",
    "time.precision.mode": "connect",
    "binlog.buffer.size": "20000",
    "event.deserialization.failure.handling.mode": "warn",
    "max.batch.size": "8192",
    "max.queue.size": "8192",
    "poll.interval.ms": "1000",
    "heartbeat.interval.ms": "5000",
    "snapshot.fetch.size": "2000"
  }
}
```

### Key Config Parameters

| Parameter | Description | Recommended |
|-----------|-------------|-------------|
| `snapshot.mode` | When to take initial snapshot | `initial` (default) |
| `snapshot.locking.mode` | How to lock tables during snapshot | `minimal` |
| `tombstones.on.delete` | Emit tombstone for compaction | `false` |
| `decimal.handling.mode` | Decimal representation | `precise` (string) |
| `time.precision.mode` | Timestamp precision | `connect` (milliseconds) |
| `max.batch.size` | Max events per batch | 8192 |
| `heartbeat.interval.ms` | Heartbeat frequency | 5000 |
| `snapshot.fetch.size` | Rows per page in snapshot | 2000 |

## PostgreSQL Connector Configuration

### Requirements

```ini
# postgresql.conf
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
shared_preload_libraries = 'pgoutput'
```

### Connector Config

```json
{
  "name": "postgres-orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "pg.orders.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${PG_DEBEZIUM_PASSWORD}",
    "database.dbname": "orders",
    "database.server.name": "orders_pg",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_orders",
    "slot.drop.on.stop": "false",
    "publication.autocreate.mode": "filtered",
    "publication.name": "debezium_pub_orders",
    "schema.include.list": "public",
    "table.include.list": "public.customers,public.orders",
    "snapshot.mode": "initial",
    "snapshot.mode.custom.name": "",
    "heartbeat.interval.ms": "5000",
    "heartbeat.action.query": "UPDATE public.debezium_heartbeat SET last_updated=NOW() WHERE id=1",
    "interval.handling.mode": "numeric",
    "hstore.handling.mode": "json",
    "decimal.handling.mode": "precise",
    "tombstones.on.delete": "false",
    "max.batch.size": "1024",
    "max.queue.size": "4096"
  }
}
```

### WAL Plugin Comparison

| Plugin | Format | Performance | Notes |
|--------|--------|-------------|-------|
| pgoutput | Native PG logical replication | Best | Recommended for PG14+ |
| decoderbufs | Protocol Buffers | Good | Requires protobuf extension |
| wal2json | JSON text | Good | Debuggable, human-readable |

## MongoDB Connector Configuration

### Requirements
- MongoDB replica set (change streams require replica set)
- User with `read` and `changeStream` privileges

### Connector Config

```json
{
  "name": "mongodb-users-connector",
  "config": {
    "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
    "mongodb.hosts": "rs0/mongo1:27017,mongo2:27017,mongo3:27017",
    "mongodb.user": "debezium",
    "mongodb.password": "${MONGO_DEBEZIUM_PASSWORD}",
    "mongodb.name": "users_mongo",
    "database.include.list": "users",
    "collection.include.list": "users.profiles,users.sessions",
    "snapshot.mode": "initial",
    "capture.mode": "change_streams_update_full_lookup",
    "tombstones.on.delete": "false",
    "heartbeat.interval.ms": "5000",
    "max.batch.size": "2048",
    "poll.interval.ms": "1000",
    "connect.timeout.ms": "30000",
    "server.selection.timeout.ms": "30000",
    "socket.timeout.ms": "30000"
  }
}
```

## Snapshot Modes

### Detailed Snapshot Strategies

| Mode | Behavior | Use Case |
|------|----------|----------|
| `initial` | Snapshot all tables, then stream changes | Default, general purpose |
| `initial_only` | Snapshot only, no streaming | One-time migration |
| `when_needed` | Snapshot only if no offset exists | Restart without data loss |
| `never` | No snapshot, stream only | Existing target already populated |
| `schema_only` | Capture schema, no data | Schema registry initialization |
| `schema_only_recovery` | Schema capture for offset recovery | Recover from corrupted history |

### Snapshot Performance Tuning

```json
{
  "snapshot.fetch.size": "10000",
  "snapshot.max.threads": "4",
  "snapshot.delay.ms": "100",
  "snapshot.split.size": "100000",
  "snapshot.locking.mode": "minimal",
  "signal.data.collection": "inventory.debezium_signal"
}
```

### Incremental Snapshots (Debezium 2.x)

```json
{
  "snapshot.mode": "incremental",
  "signal.data.collection": "inventory.debezium_signal",
  "incremental.snapshot.chunk.size": "1024",
  "incremental.snapshot.allow.schema.changes": "true"
}
```

## Schema Change Handling

### Event Schema for DDL Changes

```json
{
  "source": {
    "version": "2.5.0",
    "connector": "mysql",
    "name": "inventory",
    "ts_ms": 1712345678000,
    "snapshot": "false",
    "db": "inventory",
    "table": "customers"
  },
  "op": "c",
  "ts_ms": 1712345679000,
  "before": null,
  "after": {
    "id": 42,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "created_at": 1712345678000
  }
}
```

### Handling DDL Changes

```json
{
  "source": {
    "version": "2.5.0",
    "connector": "mysql",
    "name": "inventory",
    "ts_ms": 1712345680000,
    "database": "inventory"
  },
  "op": "c",
  "ts_ms": 1712345680000,
  "ddl": "ALTER TABLE customers ADD COLUMN phone VARCHAR(20)",
  "tableChanges": [
    {
      "type": "ALTER",
      "id": "\"inventory\".\"customers\"",
      "table": {
        "defaultCharsetName": "utf8mb4",
        "columns": [
          {"name": "id", "type": "INT", "nullable": false},
          {"name": "name", "type": "VARCHAR(255)", "nullable": false},
          {"name": "email", "type": "VARCHAR(255)", "nullable": false},
          {"name": "phone", "type": "VARCHAR(20)", "nullable": true},
          {"name": "created_at", "type": "TIMESTAMP", "nullable": false}
        ]
      }
    }
  ]
}
```

## Exactly-Once Semantics

### Kafka Connect Exactly-Once

```properties
# worker.properties
exactly.once.source.enabled=true
exactly.once.source.producer.properties.enable.idempotence=true
exactly.once.source.producer.properties.transaction.timeout.ms=60000

# Connector level
connector.class=io.debezium.connector.mysql.MySqlConnector
transactional.id=debezium-mysql-connector-1
```

### Exactly-Once Sink

```json
{
  "name": "jdbc-sink-exactly-once",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
    "tasks.max": "4",
    "topics": "inventory.inventory.customers",
    "connection.url": "jdbc:postgresql://target:5432/warehouse",
    "connection.user": "writer",
    "connection.password": "${TARGET_DB_PASSWORD}",
    "insert.mode": "upsert",
    "pk.fields": "id",
    "pk.mode": "record_key",
    "auto.create": "false",
    "auto.evolve": "false",
    "batch.size": "1000",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "true",
    "exactly.once.support": "requested"
  }
}
```

## Heartbeat Mechanism

### Why Heartbeats?

When a source database has no changes for extended periods, Debezium may not detect connector health. Heartbeats create periodic empty events to:
- Track connector liveness
- Maintain offset position in the log
- Prevent log expiration from removing unreferenced positions

### Configuration

```json
{
  "heartbeat.interval.ms": "5000",
  "heartbeat.action.query": "UPDATE inventory.debezium_heartbeat SET ts=NOW() WHERE id=1",
  "heartbeat.topics.prefix": "__debezium_heartbeat"
}
```

### Heartbeat Consumer

```python
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    "__debezium_heartbeat.inventory",
    bootstrap_servers="kafka-cluster:9092",
    group_id="heartbeat-monitor"
)

def monitor_heartbeats():
    """Alert if heartbeat not received within 3x interval."""
    while True:
        msg = consumer.poll(timeout_ms=30000)
        if not msg:
            alert("No heartbeat for 30 seconds — connector may be down")
```

## Rules
- MySQL requires ROW binlog format with FULL row images
- PostgreSQL requires logical replication with pgoutput plugin (PG14+)
- MongoDB requires replica set for change streams
- Snapshot mode `initial` is the default; use `initial_only` for one-off migrations
- Enable heartbeats (every 5 seconds) for idle database detection
- Use ExtractNewRecordState SMT for clean event structure
- Configure dead-letter queue for failed event handling
- Set `max.batch.size` and `max.queue.size` based on event volume and memory
- Use Avro + Schema Registry for production schema management
- Monitor connector offsets and replay lag
