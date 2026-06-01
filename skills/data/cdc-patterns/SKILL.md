---
name: data-cdc-patterns
description: >
  Use this skill when designing change data capture pipelines with Debezium, Kafka Connect, AWS DMS, or log-based CDC. This skill enforces: CDC method selection (log-based, trigger-based, timestamp), Debezium connector configuration, Kafka Connect source/sink patterns, schema evolution handling, exactly-once semantics, initial snapshot + incremental streaming. Do NOT use for: batch-only ingestion, application-level dual-write, or message queue design without CDC.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, integration, cdc, phase-11]
---

# Data CDC Patterns

## Purpose
Design reliable change data capture pipelines that stream database changes to downstream systems with minimal latency, exactly-once semantics, and schema evolution handling. Covers Debezium, Kafka Connect, AWS DMS, and custom CDC patterns.

## Agent Protocol

### Trigger
Exact user phrases: "CDC", "change data capture", "Debezium", "Kafka Connect", "AWS DMS", "log-based CDC", "trigger-based CDC", "timestamp-based CDC", "database replication", "incremental streaming", "capture", "change stream", "binlog", "WAL", "write-ahead log", "oplog", "version 2.0", "Debezium connector".

### Input Context
Before activating, verify:
- Source database type (MySQL, Postgres, MongoDB, Oracle, SQL Server, DB2)
- Target sink (Kafka topic, data lake, warehouse, search index)
- Volume (transactions per second, rows changed per hour)
- Source database config (binlog format, WAL level, archive logs)
- Schema evolution frequency
- Consumer requirements (ordering, partitioning, exactly-once)
- Existing infrastructure (Kafka cluster, Kafka Connect, K8s)

### Output Artifact
CDC pipeline architecture with connector selection, snapshot strategy, and schema evolution handling.

### Response Format
```
CDC Method: {log-based | trigger-based | timestamp-based}
Source: {database: version}
Connector: {Debezium: connector type}
Snapshot: {initial_only | initial | never | when_needed}
Sink: {Kafka topic | S3 | JDBC | Elasticsearch}
Semantics: {exactly-once | at-least-once | at-most-once}
Schema Evolution: {AVRO schema registry | JSON envelope | manual}
```
```json
// Debezium connector config
// Sink connector config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] CDC method selected with database-specific justification
- [ ] Debezium connector configured (source, snapshot mode, transforms)
- [ ] Kafka Connect sink configured (topic routing, schema, error handling)
- [ ] Initial snapshot + incremental streaming plan defined
- [ ] Schema evolution strategy selected and tested
- [ ] Exactly-once semantics configured
- [ ] Monitoring and alerting for lag/failures
- [ ] Recovery plan for connector failures/resumes

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Choose CDC Method
```
Log-based (binlog/WAL):
  - Reads database transaction log directly — no impact on source
  - Captures all changes including schema changes
  - Debezium: MySQL binlog (row-based), PostgreSQL WAL (pgoutput/decoderbufs)
  - MongoDB oplog / change streams
  - Oracle LogMiner / XStream
  - Best for: production, minimal overhead, complete change history

Trigger-based:
  - Database triggers copy changes to audit/changelog table
  - Application reads from changelog table
  - Best for: databases without log access (some SaaS, legacy)
  - Best for: custom filtering or enrichment at capture time
  - Downside: performance impact, triggers not suitable for high TPS

Timestamp-based:
  - Query source with WHERE modified_at > last_run
  - Simple, no extra infrastructure
  - Requires: modified_at column, correct clock, soft-delete handling
  - Downside: misses deletes (unless soft), no ordering guarantee across restarts
  - Best for: low-volume tables, batch incremental ETL, no CDC infra available
```

### Step 2: Debezium Architecture
Debezium is a Kafka Connect source connector. Engine: Kafka Connect runtime runs Debezium connector. Connector: reads database log, emits change events to Kafka. Offset: stored in Kafka Connect offsets topic or external storage. Schema: evolves with Avro or JSON Schema via Schema Registry.

```
Source DB                    Kafka Connect + Debezium              Kafka
+--------+                   +------------------------+       +-----------+
| MySQL   | --binlog-->      | Debezium MySqlConnector | ---> | topic:    |
| Postgres| --WAL---->      | transforms, SMTs       | ---> | db.table  |
| MongoDB | --oplog-->      | offset management       | ---> | (events)  |
+--------+                   | schema evolution        |       +-----------+
                             +------------------------+            |
                                                                    | sinks
                                                                    v
                                                            +-----------+
                                                            | JDBC      |
                                                            | S3        |
                                                            | ES        |
                                                            +-----------+

Change event format (JSON):
{
  "payload": {
    "op": "c",           // c=create, r=read(snapshot), u=update, d=delete
    "before": null,       // or {"id": 1, ...} for update/delete
    "after": {"id": 1, "name": "Alice", "status": "active"},
    "source": {
      "version": "2.x",
      "connector": "mysql",
      "name": "my-connector",
      "ts_ms": 1712345678000,
      "snapshot": "false",
      "db": "sales",
      "table": "customers",
      "server_id": 1,
      "file": "mysql-bin.000123",
      "pos": 45678
    }
  }
}
```

### Step 3: MySQL Connector Configuration
Requirements: binlog_format=ROW, binlog_row_image=FULL, gtid_mode=ON (for HA). Snapshot: initial (snapshot + stream), initial_only, when_needed, never.

```json
{
  "name": "mysql-connector-sales",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "db.sales.internal",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "****",
    "database.server.id": "184054",
    "database.server.name": "sales_mysql",
    "database.include.list": "sales",
    "table.include.list": "sales.customers,sales.orders,sales.products",
    "database.history.kafka.bootstrap.servers": "kafka:9092",
    "database.history.kafka.topic": "schema-changes.sales_mysql",
    "include.schema.changes": "true",
    "snapshot.mode": "initial",
    "snapshot.locking.mode": "minimal",
    "tombstones.on.delete": "false",
    "decimal.handling.mode": "precise",
    "time.precision.mode": "connect"
  }
}
```

### Step 4: PostgreSQL Connector Configuration
Requirements: wal_level=logical, replication slot created by Debezium plugin (pgoutput, decoderbufs, wal2json). Plugin: pgoutput (native, recommended for PG14+), decoderbufs (protobuf, good perf), wal2json (text, debuggable).

```json
{
  "name": "pg-connector-sales",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "pg.sales.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "****",
    "database.dbname": "sales",
    "database.server.name": "sales_pg",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_sales",
    "schema.include.list": "public",
    "table.include.list": "public.customers,public.orders",
    "publication.autocreate.mode": "filtered",
    "publication.name": "debezium_pub",
    "snapshot.mode": "initial",
    "heartbeat.interval.ms": "5000",
    "heartbeat.action.query": "UPDATE public.debezium_heartbeat SET last_updated=NOW()"
  }
}
```

### Step 5: MongoDB Connector
Sources MongoDB replica set change streams. Watches: oplog.rs collection. Snapshot: reads collection documents, then streams changes. Connection string: mongodb://user:pass@host:port/?replicaSet=rs0.

```json
{
  "name": "mongo-connector-users",
  "config": {
    "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
    "mongodb.hosts": "rs0/mongo1:27017,mongo2:27017,mongo3:27017",
    "mongodb.user": "debezium",
    "mongodb.password": "****",
    "database.include.list": "users",
    "collection.include.list": "users.profiles,users.preferences",
    "snapshot.mode": "initial",
    "tombstones.on.delete": "false",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}
```

### Step 6: Snapshot Modes
```
initial:       Snapshot all tables, then stream new changes (default, recommended)
initial_only:  Snapshot only, no streaming (one-shot migration)
when_needed:   Run snapshot on connector start only if no offset exists
never:         Only stream, no snapshot. Table must already have snapshot data.
schema_only:   Capture schema, no snapshot (Debezium 2.x+)
schema_only_recovery: schema capture for offset recovery

Snapshot isolation:
  MySQL:      SET TRANSACTION ISOLATION LEVEL REPEATABLE READ
  Postgres:   SERIALIZABLE or REPEATABLE READ
  MongoDB:    reads at snapshot time
  Oracle:     flashback query

Snapshot chunking:
  Rows per chunk (default 1024)
  Auto-sizing based on table size
  Parallel snapshot (Debezium 2.x+) for large tables
```

### Step 7: Kafka Connect Sink Configuration
JDBC sink: upsert mode (primary key mode), batch writes. S3 sink: partitioned Parquet. Elasticsearch sink: near-real-time indexing. Schema management: auto-create (dev), validate (staging), manual (prod).

```json
{
  "name": "jdbc-sink-customers",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
    "tasks.max": "4",
    "topics": "sales_mysql.sales.customers",
    "connection.url": "jdbc:postgresql://target:5432/warehouse",
    "connection.user": "writer",
    "connection.password": "****",
    "insert.mode": "upsert",
    "pk.fields": "id",
    "pk.mode": "record_key",
    "auto.create": "true",
    "auto.evolve": "true",
    "batch.size": "1000",
    "table.name.format": "customers",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "true"
  }
}
```

### Step 8: Schema Evolution
Approach 1 (AVRO + Schema Registry): register schema per topic, evolve via compatibility (BACKWARD, FORWARD, FULL). Approach 2 (JSON with envelope): schema embedded in each record, consumer decides. Approach 3 (manual): lock schemas, deploy connector + consumer together.

```
AVRO Schema Registry compatibility modes:
  BACKWARD:       new schema can read old data (add optional fields, remove with defaults)
  FORWARD:        old schema can read new data (remove fields, add with defaults)
  FULL:           both backward and forward compatible
  NONE:           no compatibility checks (dev only)

Schema changes that break CDC:
  - Dropping a column (data still in log but schema gone)
  - Renaming a column (needs schema registry evolution)
  - Changing column type (incompatible: int->string)
  - Adding NOT NULL column without default (breaks snapshot)

Mitigation:
  - Use BACKWARD compatibility for CDC topics
  - Add columns as nullable with defaults
  - Never drop columns — deprecate and remove from consumers
  - Use Schema Registry to detect and validate changes
```

### Step 9: Exactly-Once Semantics
Kafka Connect + Debezium: at-least-once by default. Exactly-once requires: idempotent producer + transactional coordinator + idempotent sink. Sink exactly-once: idempotent writes (JDBC upsert, S3 exactly-once sink). Read-process-write: consume from Kafka with transactional exactly-once semantics.

```
Delivery semantics:
  at-most-once:    risk of data loss (not for CDC)
  at-least-once:   default for Kafka Connect (duplicates possible on restart)
  exactly-once:    Kafka transactions + idempotent sink

Kafka exactly-once:
  enable.idempotence=true (producer)
  transactional.id=... (consumer offset commits)
  isolation.level=read_committed (consumer)

Debezium offset commit:
  Connector reads log at position P
  Emits event to Kafka (with Kafka transaction)
  Commits offset P only after Kafka tx commits
  On restart, resumes from committed offset
```

### Step 10: Monitoring and Operations
Lag: consumer group lag, Debezium streaming lag (source.ts_ms - event.ts_ms). Errors: dead-letter topic, connector restart count, schema registry errors. Heartbeat: Debezium heartbeat emit every 5s to track alive connectors. Alerting: lag > X seconds, connector failures, schema registry compatibility errors.

```properties
# Debezium monitoring config
heartbeat.interval.ms=5000
heartbeat.action.query=UPDATE _debezium_heartbeat SET ts=NOW()

# Metrics (JMX)
debezium-mysql:type=connector-metrics,context=streaming
  MilliSecondsBehindSource
  TotalNumberOfEventsSeen
  NumberOfCommittedTransactions
  QueueRemainingCapacity
  Connected (boolean)

# Kafka Connect monitoring
kafka.connect:type=connect-worker-metrics
kafka.connect:type=connect-metrics,client-id=...
  Connector count, task count, offset commit metrics
```

### CDC Failure Modes and Recovery

```yaml
failure_modes:
  schema_change:
    description: "Source table schema changed (column added/removed)"
    impact: "Connector fails on deserialization"
    detection: "Schema registry compatibility error in connector logs"
    recovery:
      - "Register new schema version in schema registry"
      - "Verify compatibility mode (BACKWARD)"
      - "Restart connector — resumes from committed offset"
      - "Retroactively process events through new schema"
    prevention: "Automated schema drift detection + CI/CD schema validation"
  
  source_outage:
    description: "Source database unavailable or restarted"
    impact: "Connector loses connection, fails to stream"
    detection: "Connector status = FAILED, source connectivity check"
    recovery:
      - "Connector auto-retry (configure max.retries)"
      - "Verify source database is back online"
      - "Resume connector — Debezium resumes from last committed offset"
      - "If outage > binlog retention: re-snapshot needed"
    prevention: "Source HA (replication, failover), binlog retention 24h+"
  
  binlog_expiration:
    description: "Binlog/transaction log rotated before connector consumed it"
    impact: "Cannot resume from last offset, data loss for gap"
    detection: "Connector error: 'Binlog file X not found' or offset out of range"
    recovery:
      - "Perform new snapshot (initial mode)"
      - "Snapshot will capture current state — misses transactions in gap"
      - "Cross-check with source for missed transactions if critical"
    prevention: "Set binlog retention (MySQL: expire_logs_days = 7, PostgreSQL: wal_keep_segments)"
  
  consumer_lag:
    description: "Consumers cannot keep up with CDC event rate"
    impact: "Accumulating lag, eventually OOM or source binlog retention breach"
    detection: "Consumer group lag > threshold, connector queue size growing"
    recovery:
      - "Increase consumer partitions (increase parallelism)"
      - "Add consumer instances to consumer group"
      - "Optimize consumer processing (batch operations, async writes)"
      - "If severe: pause non-critical connectors temporarily"
    prevention: "Auto-scale consumers, rate limit if needed, monitor lag trends"
  
  dead_letter:
    description: "Record fails deserialization or processing"
    impact: "One bad record blocks the connector (in fail-on-error mode)"
    detection: "Record in dead-letter topic, connector error log"
    recovery:
      - "Inspect failed record in dead-letter topic"
      - "Fix schema (if schema evolution issue) or fix consumer logic"
      - "Reprocess from dead-letter topic"
    prevention: "Always configure dead-letter topic + skip mode for transient errors"
```

### CDC Monitoring Dashboard

```yaml
monitoring_dashboard:
  sections:
    connector_health:
      - "Connector status (RUNNING/FAILED/PAUSED) per connector"
      - "Task status per connector"
      - "Restart count (last 24h)"
    
    lag_metrics:
      - "MilliSecondsBehindSource (Debezium streaming)"
      - "Consumer group lag per topic partition"
      - "Queue remaining capacity per connector"
      - "Event age (source_ts - current_ts) latency histogram"
    
    throughput:
      - "Events per second (total + per connector)"
      - "Bytes per second ingested"
      - "Batch size distribution"
      - "Peak throughput vs sustained throughput"
    
    errors:
      - "Dead-letter topic count (last 1h/24h)"
      - "Deserialization errors"
      - "Schema compatibility failures"
      - "Connector restart count"
    
    source_status:
      - "Source database connectivity"
      - "Binlog retention remaining (hours)"
      - "Source disk space"
      - "Source replication lag (if replica used)"
```

### CDC Consumer Patterns

```python
# Idempotent CDC consumer with deduplication
def process_cdc_event(event, target_table, dedup_window_days=7):
    """
    Process CDC event with idempotency.
    Each event has _hoodie_commit_time (Hudi) or debezium source fields.
    """
    # Check for deduplication
    event_id = f"{event['source']['connector']}_{event['source']['ts_ms']}_{event['after'].get('id')}"
    
    # Upsert based on primary key
    if event['op'] == 'c':  # Create
        insert_record(target_table, event['after'])
    elif event['op'] == 'u':  # Update
        update_record(target_table, event['after'], key=event['after']['id'])
    elif event['op'] == 'd':  # Delete
        soft_delete(target_table, event['before']['id'])
    elif event['op'] == 'r':  # Snapshot read
        upsert_record(target_table, event['after'])
    
    # Store event ID for dedup (prevent double processing on restart)
    store_processed_id(event_id, ttl_days=dedup_window_days)

# Batch consumer with micro-batching
def batch_consumer(events_batch, target_table):
    """Process CDC events in micro-batches for throughput."""
    creates, updates, deletes = [], [], []
    for event in events_batch:
        if event['op'] == 'c': creates.append(event['after'])
        elif event['op'] == 'u': updates.append(event['after'])
        elif event['op'] == 'd': deletes.append(event['before']['id'])
    
    # Batch insert/update/delete
    if creates:
        target_table.insert_many(creates)
    if updates:
        target_table.update_many(updates, key='id')
    if deletes:
        target_table.delete_many(ids=deletes)
```

### Decision Tree

#### CDC Method Selection
```
Source database type?
├── MySQL → Debezium MySQL connector (log-based, GTID-aware)
├── PostgreSQL → Debezium PostgreSQL (pgoutput logical replication plugin)
├── SQL Server → Debezium SQL Server (CDC enabled tables)
├── Oracle → Debezium Oracle (LogMiner or XStream)
├── MongoDB → Debezium MongoDB (oplog change stream)
├── No CDC capability
│   ├── Has timestamp/updated_at column → Timestamp-based incremental
│   ├── Has version number → Version-based incremental
│   └── Neither → Trigger-based or full table comparison
└── Need low-latency < 1s → Kafka Connect + Debezium (sub-second)
```

## Rules
- Log-based CDC preferred over trigger/timestamp for all production databases
- Use AVRO + Schema Registry for schema evolution (BACKWARD compatibility)
- Snapshot mode = initial (default), use initial_only for one-off migrations
- Enable heartbeat interval (5s) to detect idle connections
- Use SMT (Single Message Transform) ExtractNewRecordState for clean events
- Never drop columns from source — deprecate, then remove from consumers
- Dead-letter topic for failed records (schema mismatch, deserialization errors)
- Monitor lag: alert if CDC lag > 5min for latency-critical pipelines
- Set binlog retention to at least 24h to prevent connector offset loss
- Implement idempotent consumers — CDC events may be replayed
- Use micro-batching for throughput-optimized consumer processing
- Build a CDC monitoring dashboard for connector health + lag + errors
- Plan for schema evolution — automate compatibility checks in CI/CD

## References
  - references/cdc-methods.md — CDC Methods Reference
  - references/cdc-performance.md — CDC Performance Optimization
  - references/cdc-schema-evolution.md — CDC Schema Evolution
  - references/debezium-deep.md — Debezium Deep Dive Reference
  - references/kafka-connect-cdc.md — Kafka Connect CDC Reference
  - references/kafka-connect.md — Kafka Connect Reference
## Handoff
`data-etl-pipeline` for downstream ETL processing of CDC events
`data-data-lake` for CDC ingestion into Delta/Iceberg/Hudi tables
`data-data-replication` for database-to-database replication via CDC
