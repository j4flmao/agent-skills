# Streaming Integration: Kafka Connect, Debezium, and Schema Registry

Moving data into and out of Kafka without custom code: Kafka Connect deployment, source and sink connectors, CDC with Debezium, schema management, and error handling.

## Kafka Connect Basics

| Concept | Meaning |
|---------|---------|
| Worker | JVM process running connectors; distributed mode stores config/offsets/status in Kafka topics |
| Connector | Configuration of an integration (source or sink) |
| Task | Unit of parallelism; a connector splits work into `tasks.max` tasks |
| Converter | Serializes records (Avro, Protobuf, JSON Schema, JSON, String) |
| SMT | Single Message Transform applied per record |

Run distributed mode in production (3+ workers) so tasks rebalance on failure.

### Worker configuration

```properties
bootstrap.servers=kafka:9092
group.id=connect-cluster-a
config.storage.topic=_connect-configs
offset.storage.topic=_connect-offsets
status.storage.topic=_connect-status
config.storage.replication.factor=3
offset.storage.replication.factor=3
status.storage.replication.factor=3
key.converter=io.confluent.connect.avro.AvroConverter
key.converter.schema.registry.url=http://schema-registry:8081
value.converter=io.confluent.connect.avro.AvroConverter
value.converter.schema.registry.url=http://schema-registry:8081
plugin.path=/opt/connect/plugins
config.providers=file
config.providers.file.class=org.apache.kafka.common.config.provider.FileConfigProvider
```

Use config providers (file, directory, environment, or Vault-backed) so connector JSON references secrets rather than containing them: `"database.password": "${file:/secrets/db.properties:password}"`.

### Managing connectors (REST API)

```bash
curl -s -X PUT http://connect:8083/connectors/orders-cdc/config \
  -H 'Content-Type: application/json' -d @orders-cdc.json      # create or update, idempotent
curl -s http://connect:8083/connectors/orders-cdc/status
curl -s -X POST 'http://connect:8083/connectors/orders-cdc/restart?includeTasks=true&onlyFailed=true'
```

Keep connector configs in Git and apply via CI (or Strimzi `KafkaConnector` CRDs).

## CDC with Debezium (PostgreSQL)

Database prerequisites: `wal_level=logical`, a replication user, and a publication.

```sql
CREATE ROLE debezium WITH LOGIN REPLICATION PASSWORD '<from secret manager>';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;
CREATE PUBLICATION dbz_orders FOR TABLE public.orders, public.outbox;
```

```json
{
  "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
  "database.hostname": "orders-db",
  "database.port": "5432",
  "database.user": "debezium",
  "database.password": "${file:/secrets/db.properties:password}",
  "database.dbname": "orders",
  "topic.prefix": "orders",
  "plugin.name": "pgoutput",
  "publication.name": "dbz_orders",
  "slot.name": "dbz_orders",
  "table.include.list": "public.orders,public.outbox",
  "snapshot.mode": "initial",
  "heartbeat.interval.ms": "10000",
  "tasks.max": "1"
}
```

- Topics are named `<topic.prefix>.<schema>.<table>`.
- Monitor the replication slot: an inactive slot retains WAL and can fill the database disk. Alert on `pg_replication_slots` retained WAL size.
- Heartbeats keep the slot advancing on low-traffic tables.
- Schema changes on the source propagate as new schema versions; review compatibility rules.

### Outbox event router

```json
{
  "transforms": "outbox",
  "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
  "transforms.outbox.route.by.field": "aggregatetype",
  "transforms.outbox.table.field.event.key": "aggregateid"
}
```

The app inserts into `outbox` in the same transaction as business changes; the router emits events to `outbox.event.<aggregatetype>` topics (default naming) keyed by aggregate ID.

## Sink Connectors

| Target | Connector examples | Notes |
|--------|-------------------|-------|
| Relational DB | JDBC sink (Confluent or Debezium JDBC sink) | Use `insert.mode=upsert` with primary keys for idempotency |
| Object storage | S3/GCS sinks | Partition by time; Parquet/Avro format; rotation by size/time |
| Lakehouse | Iceberg sink (Apache Iceberg Kafka Connect), Delta/Hudi sinks | Exactly-once commits coordinated per table |
| Search | Elasticsearch/OpenSearch sinks | Document ID from record key for idempotent upserts |
| Warehouse | Snowflake (Snowpipe Streaming), BigQuery sinks | Watch per-row costs and schema evolution |

## Error Handling

```json
{
  "errors.tolerance": "all",
  "errors.deadletterqueue.topic.name": "dlq.orders-sink",
  "errors.deadletterqueue.topic.replication.factor": "3",
  "errors.deadletterqueue.context.headers.enable": "true",
  "errors.retry.timeout": "300000",
  "errors.log.enable": "true",
  "errors.log.include.messages": "false"
}
```

- `errors.tolerance=none` (default) stops the task on the first bad record — correct when silent data loss is unacceptable.
- DLQ applies to conversion and transform errors in sink connectors; failures inside the external system's write path depend on the connector implementation.
- Monitor DLQ topic growth; a DLQ nobody reads is data loss with extra steps.

## Schema Registry

| Compatibility mode | Allowed changes | Upgrade order |
|--------------------|-----------------|---------------|
| `BACKWARD` (default) | Delete fields, add optional fields | Consumers first |
| `FORWARD` | Add fields, delete optional fields | Producers first |
| `FULL` | Add/delete optional fields only | Any order |
| `*_TRANSITIVE` | Same, checked against all previous versions | |

- Subject naming: `TopicNameStrategy` (one schema per topic) by default; `RecordNameStrategy`/`TopicRecordNameStrategy` for multiple event types per topic.
- Register schemas in CI and run compatibility checks before deploy; disable auto-registration in production producers (`auto.register.schemas=false`).
- Registries: Confluent Schema Registry, Apicurio Registry, AWS Glue Schema Registry, Redpanda's built-in registry.

## Common SMTs

| SMT | Use |
|-----|-----|
| `ExtractNewRecordState` (Debezium) | Flatten change events to the "after" row for sinks |
| `ReplaceField` / `MaskField` | Drop or mask sensitive columns |
| `TimestampConverter` | Normalize timestamp types |
| `RegexRouter` | Rename destination topics |
| `Filter` + predicates | Drop tombstones or specific records |

Keep SMTs simple; complex logic belongs in a stream processor.

## Pitfalls

- Replication slot left behind after deleting a Debezium connector (drop it explicitly).
- JSON without schemas for sinks that need types → failures or stringly-typed tables.
- One connector with `tasks.max` higher than the source can parallelize (many sources use one task per table/partition).
- Secrets in connector JSON visible via the REST API.

## Checklist

- [ ] Distributed Connect cluster with RF=3 internal topics
- [ ] Connector configs in Git, secrets via config providers
- [ ] CDC slots monitored for retained WAL
- [ ] Outbox pattern for domain events
- [ ] Idempotent sinks (upsert by key)
- [ ] DLQ configured and monitored, or fail-fast where loss is unacceptable
- [ ] Schema compatibility enforced in CI
