# CDC Ingestion into the Lake with Flink

Capturing database changes (MySQL, PostgreSQL, others) with Flink CDC and landing them in lake tables (Iceberg, Paimon, Hudi): snapshot + incremental phases, state involved, schema changes and operational concerns. Part 7 of the Flink series (index in `flink_state_management_1.md`).

## Architecture Options

| Option | Path | When |
|---|---|---|
| Debezium → Kafka → Flink → lake | Kafka decouples capture from writing | Multiple consumers of the change stream, Kafka already in place |
| Flink CDC source → lake | Flink reads the binlog/WAL directly | Fewer moving parts, single consumer |
| Flink CDC pipeline (YAML) | Declarative source→sink with schema evolution | Whole-database sync to supported sinks |

## Flink CDC SQL Source (MySQL)

```sql
CREATE TEMPORARY TABLE orders_cdc (
  id BIGINT,
  customer_id BIGINT,
  amount DECIMAL(18,2),
  updated_at TIMESTAMP(3),
  PRIMARY KEY (id) NOT ENFORCED
) WITH (
  'connector' = 'mysql-cdc',
  'hostname' = 'mysql.internal',
  'port' = '3306',
  'username' = '${MYSQL_CDC_USER}',
  'password' = '${MYSQL_CDC_PASSWORD}',
  'database-name' = 'shop',
  'table-name' = 'orders',
  'server-id' = '5400-5408',                 -- range >= source parallelism
  'scan.incremental.snapshot.enabled' = 'true',
  'scan.startup.mode' = 'initial'           -- snapshot then binlog
);

INSERT INTO lake.silver.orders SELECT * FROM orders_cdc;   -- upsert-enabled Iceberg v2 table
```

Credentials come from the deployment's secret mechanism (the `${...}` variables above are substituted at submit time), never committed SQL.

PostgreSQL uses `'connector' = 'postgres-cdc'` with `slot.name`, `decoding.plugin.name = 'pgoutput'` and a publication; the replication slot retains WAL until consumed, so a stopped job grows WAL on the source.

## Phases and State

1. Snapshot phase: table split into chunks by primary key; chunks read in parallel; progress kept in Flink state (incremental snapshot algorithm, lock-free).
2. Binlog/WAL phase: single reader continues from the position recorded at snapshot end.

The binlog position lives in checkpoint state. Restoring from a checkpoint resumes exactly; starting without state re-snapshots.

Source database prerequisites:
- MySQL: `binlog_format=ROW`, `binlog_row_image=FULL`, GTID recommended, binlog retention longer than any expected job outage.
- PostgreSQL: `wal_level=logical`, user with replication privilege, publication on captured tables.

## Sink Choices

| Sink | Upsert mechanism | Notes |
|---|---|---|
| Iceberg v2 | Equality deletes (upsert mode) | Needs compaction; broad engine support |
| Apache Paimon | LSM tree with primary-key tables, built for Flink streaming upserts | Good for high-frequency updates; changelog producer for downstream streaming |
| Hudi MoR | Log files + compaction | Record-level index options |

## Schema Changes

- SQL jobs with a fixed DDL do not follow source schema changes; a new column is ignored, a dropped column fails or produces nulls depending on the connector.
- Flink CDC pipeline connectors propagate schema change events to sinks that support them (behavior configurable, e.g. `schema.change.behavior`); confirm sink support for your version.
- Debezium + Kafka: use a schema registry (Avro/Protobuf) and evolve lake tables via controlled migrations.

## Operational Concerns

| Concern | Practice |
|---|---|
| Source load during snapshot | Limit parallelism and chunk size; run off-peak or from a replica |
| Long outages | Binlog/WAL retention must exceed outage; else re-snapshot |
| Deletes | Ensure delete events produce lake deletes (upsert mode) or soft-delete columns |
| Ordering | Preserved per primary key; do not repartition by another key before the sink |
| Hard deletes for compliance | Lake deletes still need snapshot expiration to physically remove data |
| Monitoring | Source lag (`currentFetchEventTimeLag`/`currentEmitEventTimeLag` metrics), replication slot size, checkpoint health |

## Backfill and Re-sync

- Re-snapshot a single table: start a new job (new state) for that table into a staging table, then swap or MERGE.
- Avoid re-running `initial` against a live table without dedup guards; snapshot rows interleave with ongoing changes.

## Pitfalls
- Shared `server-id` across MySQL CDC jobs: connections kick each other.
- Postgres replication slot left behind after decommissioning a job: source disk fills with WAL.
- Repartitioning CDC stream by a non-key column: per-key ordering lost, older values overwrite newer.
- Ignoring schema drift: lake table silently misses new columns.

## Checklist
- [ ] Source DB configured for logical capture with adequate retention
- [ ] Unique server IDs / slot names per job
- [ ] Sink table keyed and upsert-capable
- [ ] Schema-change policy defined and tested
- [ ] Source lag, slot size and checkpoint metrics alerted
