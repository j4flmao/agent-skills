# Kafka Connect Reference

## Source Connector Configuration

### Debezium MySQL Source
```json
{
  "name": "mysql-connector-orders",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "tasks.max": "1",
    "database.hostname": "mysql.primary.internal",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "${DB_PASSWORD}",
    "database.server.id": "184054",
    "database.server.name": "orders_mysql",
    "database.include.list": "orders_db",
    "table.include.list": "orders_db.orders,orders_db.customers",
    "database.history.kafka.bootstrap.servers": "kafka:9092",
    "database.history.kafka.topic": "schema-changes.orders_mysql",
    "include.schema.changes": "true",
    "snapshot.mode": "initial",
    "snapshot.locking.mode": "minimal",
    "tombstones.on.delete": "false",
    "decimal.handling.mode": "precise",
    "time.precision.mode": "connect",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "key.converter.schemas.enable": "false",
    "value.converter.schemas.enable": "false",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "true",
    "transforms.unwrap.operation.header": "true",
    "topic.creation.default.replication.factor": 3,
    "topic.creation.default.partitions": 6
  }
}
```

### Debezium PostgreSQL Source
```json
{
  "name": "pg-connector-orders",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "pg.primary.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${DB_PASSWORD}",
    "database.dbname": "orders_db",
    "database.server.name": "orders_pg",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_orders",
    "publication.autocreate.mode": "filtered",
    "publication.name": "debezium_pub",
    "schema.include.list": "public",
    "table.include.list": "public.orders,public.customers",
    "snapshot.mode": "initial",
    "heartbeat.interval.ms": "5000",
    "tombstones.on.delete": "false",
    "topic.creation.default.replication.factor": 3,
    "topic.creation.default.partitions": 6
  }
}
```

## Sink Connector Configuration

### JDBC Sink
```json
{
  "name": "jdbc-sink-orders",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
    "tasks.max": "4",
    "topics": "orders_mysql.orders_db.orders,orders_mysql.orders_db.customers",
    "connection.url": "jdbc:postgresql://warehouse.internal:5432/data_warehouse",
    "connection.user": "writer",
    "connection.password": "${DB_PASSWORD}",
    "insert.mode": "upsert",
    "pk.fields": "id",
    "pk.mode": "record_key",
    "auto.create": "true",
    "auto.evolve": "true",
    "batch.size": "1000",
    "table.name.format": "${topic}_sink",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "true"
  }
}
```

### S3 Sink
```json
{
  "name": "s3-sink-orders",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "4",
    "topics": "orders_mysql.orders_db.orders",
    "s3.bucket.name": "data-lake-bronze",
    "s3.region": "us-east-1",
    "s3.part.size": "67108864",
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "partition.duration.ms": "3600000",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
    "locale": "UTC",
    "timezone": "UTC",
    "timestamp.extractor": "RecordField",
    "timestamp.field": "order_date",
    "flush.size": "100000",
    "rotate.interval.ms": "3600000",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState"
  }
}
```

## Single Message Transforms (SMTs)

```json
{
  "transforms": "unwrap,dropfields,router",
  "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
  "transforms.unwrap.drop.tombstones": "true",
  "transforms.dropfields.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",
  "transforms.dropfields.blacklist": "ssn,credit_card",
  "transforms.router.type": "org.apache.kafka.connect.transforms.RegexRouter",
  "transforms.router.regex": "(.*)\\.(.*)\\.(.*)",
  "transforms.router.replacement": "cdc.$1_$3"
}
```

## Error Handling

```json
{
  "errors.tolerance": "all",
  "errors.deadletterqueue.topic.name": "dlq-orders-connector",
  "errors.deadletterqueue.topic.replication.factor": "3",
  "errors.deadletterqueue.context.headers.enable": "true",
  "errors.log.enable": "true",
  "errors.log.include.messages": "true"
}
```

DLQ records include headers: `__connect.errors.connector.name`, `__connect.errors.task.id`, `__connect.errors.exception.message`, and the original record in the message value.

## Parallel Loading

```json
{
  "tasks.max": "4",
  "max.poll.records": "500",
  "consumer.max.poll.interval.ms": "300000",
  "consumer.session.timeout.ms": "10000",
  "consumer.heartbeat.interval.ms": "3000"
}
```

- Increase `tasks.max` for more parallelism (each task processes a subset of partitions)
- Sink tasks partition work by Kafka topic partition
- Source connectors: most use single task (log reads are serial). For parallelism, run multiple connectors sharded by table

## Monitoring

```properties
# Kafka Connect JMX metrics
kafka.connect:type=connector-metrics
  connector-name, status (running/failed/paused), type (source/sink)

kafka.connect:type=task-metrics
  connector-name, task-id, status

kafka.connect:type=sink-task-metrics
  sink-record-send-rate, sink-record-lag-max, last-offset-committed

kafka.consumer:type=consumer-fetch-manager-metrics,client-id=*
  records-lag-max (critical: lag > 10000 is alertable)

# Prometheus/Grafana dashboards for Kafka Connect
# Connector status, task status, DLQ size, consumer lag
```

## Configuration Best Practices

```
1. Always use topic.creation for auto-creating topics with proper partitions/RF
2. Set errors.tolerance = all for production with DLQ
3. Use ExtractNewRecordState SMT to flatten Debezium envelope
4. Sink batching: batch.size = 1000-5000 (balance throughput vs latency)
5. Sink table auto-creation for dev, manual DDL for prod
6. Monitor DLQ: alert on any messages in DLQ topic
7. Schema Registry in BACKWARD compatibility mode for CDC topics
8. Heartbeat interval 5s for detecting connector health
9. Set tombstone.on.delete=false (cleaner, avoid unnecessary tombstones)
10. Use variable substitution for secrets (${SECRET_NAME})
```
