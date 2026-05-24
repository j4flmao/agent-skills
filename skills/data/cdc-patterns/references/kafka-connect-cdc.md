# Kafka Connect CDC Reference

## Kafka Connect Architecture

Kafka Connect is a framework for streaming data between Kafka and other systems. It uses workers, connectors, tasks, and converters.

### Worker Types

```yaml
# Distributed worker (recommended for production)
worker:
  type: distributed
  group_id: "connect-cluster"
  bootstrap_servers: "kafka1:9092,kafka2:9092,kafka3:9092"
  key_converter: "org.apache.kafka.connect.json.JsonConverter"
  value_converter: "org.apache.kafka.connect.json.JsonConverter"
  key_converter.schemas.enable: "true"
  value_converter.schemas.enable: "true"
  offset.storage.topic: "connect-offsets"
  config.storage.topic: "connect-configs"
  status.storage.topic: "connect-status"
  offset.storage.replication.factor: 3
  config.storage.replication.factor: 3
  status.storage.replication.factor: 3
  plugin.path: "/usr/share/java,/usr/share/confluent-hub-components"

# Standalone worker (development only)
worker:
  type: standalone
  bootstrap_servers: "localhost:9092"
  key_converter: "org.apache.kafka.connect.json.JsonConverter"
  value_converter: "org.apache.kafka.connect.json.JsonConverter"
  offset.storage.file.filename: "/tmp/connect.offsets"
```

## Source Connectors

Source connectors read from external systems and produce Kafka messages.

### JDBC Source Connector

```json
{
  "name": "jdbc-source-orders",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "tasks.max": "4",
    "connection.url": "jdbc:postgresql://postgres-prod:5432/sales",
    "connection.user": "connect_user",
    "connection.password": "${JDBC_PASSWORD}",
    "table.whitelist": "orders,order_items",
    "mode": "incrementing",
    "incrementing.column.name": "order_id",
    "topic.prefix": "jdbc-sales-",
    "poll.interval.ms": "30000",
    "batch.max.rows": "10000",
    "query.suffix": "WHERE status != 'deleted'",
    "transforms": "createKey",
    "transforms.createKey.type": "org.apache.kafka.connect.transforms.ValueToKey",
    "transforms.createKey.fields": "order_id"
  }
}
```

### S3 Sink Connector

```json
{
  "name": "s3-sink-orders",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "4",
    "topics": "inventory.inventory.orders",
    "s3.bucket.name": "data-lake-raw-orders",
    "s3.region": "us-east-1",
    "s3.part.size": "5242880",
    "flush.size": "10000",
    "rotate.interval.ms": "3600000",
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "partitioner.class": "io.confluent.connect.storage.partitioner.DailyPartitioner",
    "partitioner.duration.ms": "86400000",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd",
    "locale": "en-US",
    "timezone": "UTC"
  }
}
```

## Sink Connectors

Sink connectors consume Kafka messages and write to external systems.

### Elasticsearch Sink

```json
{
  "name": "elastic-sink-customers",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "2",
    "topics": "inventory.inventory.customers",
    "connection.url": "http://elasticsearch:9200",
    "connection.username": "elastic",
    "connection.password": "${ES_PASSWORD}",
    "type.name": "_doc",
    "key.ignore": "false",
    "schema.ignore": "false",
    "transforms": "unwrap,setKey",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "true",
    "transforms.setKey.type": "org.apache.kafka.connect.transforms.ExtractField$Key",
    "transforms.setKey.field": "id",
    "behavior.on.null.values": "delete",
    "batch.size": "500"
  }
}
```

### Redis Sink

```json
{
  "name": "redis-sink-sessions",
  "config": {
    "connector.class": "com.github.jcustenborder.kafka.connect.redis.RedisSinkConnector",
    "tasks.max": "2",
    "topics": "sessions.user_sessions",
    "redis.hosts": "redis-cluster:6379",
    "redis.password": "${REDIS_PASSWORD}",
    "redis.database": "0",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "redis.command": "SETEX",
    "redis.ttl": "3600"
  }
}
```

## Single Message Transforms (SMT)

SMTs modify individual messages as they flow through Kafka Connect.

### Built-in SMTs

```json
{
  "transforms": "unwrap,route,insertField,dropPrefix,cast",
  "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
  "transforms.unwrap.drop.tombstones": "true",
  "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
  "transforms.route.regex": "(.*)\\.(.*)\\.(.*)",
  "transforms.route.replacement": "$3",
  "transforms.insertField.type": "org.apache.kafka.connect.transforms.InsertField$Value",
  "transforms.insertField.static.field": "source_system",
  "transforms.insertField.static.value": "postgres-orders",
  "transforms.dropPrefix.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",
  "transforms.dropPrefix.renamed": "{\"old_prefix_column\":\"column\"}",
  "transforms.cast.type": "org.apache.kafka.connect.transforms.Cast$Value",
  "transforms.cast.spec": "amount:float64,quantity:int32"
}
```

### Custom SMT Example

```java
public class MaskPIISMT extends Transformation<SourceRecord> {
    @Override
    public SourceRecord apply(SourceRecord record) {
        Struct value = (Struct) record.value();
        if (value != null) {
            value.put("email", maskEmail(value.getString("email")));
            value.put("phone", "***-***-****");
        }
        return record;
    }

    private String maskEmail(String email) {
        if (email == null) return null;
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) return email;
        return email.charAt(0) + "***" + email.substring(atIndex);
    }
}
```

## Offset Management

### Offset Storage

```properties
# Kafka topic-based offset storage (distributed mode)
offset.storage.topic=connect-offsets
offset.storage.replication.factor=3
offset.storage.partitions=25

# Consumer group for offset commits
offset.flush.interval.ms=60000
offset.flush.timeout.ms=5000
```

### Offset Exploration

```bash
# View connector offsets via Kafka Console Consumer
kafka-console-consumer \
  --bootstrap-server kafka:9092 \
  --topic connect-offsets \
  --from-beginning \
  --property print.key=true \
  --property print.value=true \
  --max-messages 10

# Reset connector offset (use with caution)
# Delete the connector's offset from the connect-offsets topic
```

### Manual Offset Reset

```json
// PUT /connectors/{connector}/offsets
{
  "offsets": [
    {
      "partition": {
        "server": "inventory",
        "file": "mysql-bin.000123",
        "pos": 12345
      },
      "offset": {
        "transaction_id": null,
        "ts_sec": 1712345678,
        "file": "mysql-bin.000123",
        "pos": 12345,
        "row": 1,
        "server_id": 1,
        "event": 2
      }
    }
  ]
}
```

## Rebalancing

When connectors/tasks join or leave the cluster, Kafka Connect triggers a rebalance.

### Rebalance Types

| Type | Trigger | Impact | Duration |
|------|---------|--------|----------|
| Cooperative | Graceful scale-up/down | Minimal (incremental task migration) | Seconds |
| Eager | Failure, config change | All tasks stop, redistribute | Minutes |

### Configuring Cooperative Rebalancing

```properties
# connect-distributed.properties
connect.protocol=sessioned
rebalance.timeout.ms=60000
connect.rebalance.mode=cooperative
scheduled.rebalance.max.delay.ms=300000
```

### Rebalance Monitoring

```json
// GET /connectors/{connector}/status
{
  "name": "orders-connector",
  "connector": {
    "state": "RUNNING",
    "worker_id": "10.0.1.5:8083"
  },
  "tasks": [
    {
      "id": 0,
      "state": "RUNNING",
      "worker_id": "10.0.1.5:8083"
    },
    {
      "id": 1,
      "state": "RUNNING",
      "worker_id": "10.0.1.6:8083"
    }
  ],
  "type": "source"
}
```

## Error Handling

### Dead Letter Queue (DLQ)

```properties
# connect-distributed.properties
errors.deadletterqueue.topic.name=connect-dlq
errors.deadletterqueue.topic.replication.factor=3
errors.deadletterqueue.context.headers.enable=true
errors.log.enable=true
errors.log.include.messages=true
errors.retry.timeout=600000
errors.tolerance=all
```

### Connector-Level Error Config

```json
{
  "errors.tolerance": "all",
  "errors.deadletterqueue.topic.name": "orders-dlq",
  "errors.deadletterqueue.context.headers.enable": "true",
  "errors.retry.timeout": "300000",
  "errors.retry.max.retries": "5",
  "errors.retry.backoff.ms": "5000",
  "errors.log.enable": "true",
  "errors.log.include.messages": "true"
}
```

### DLQ Consumer

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    "orders-dlq",
    bootstrap_servers="kafka:9092",
    group_id="dlq-handler",
    auto_offset_reset="earliest",
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

def handle_dlq_messages():
    for msg in consumer:
        error_info = {
            "topic": msg.headers.get("kafka.connect.dlq.topic"),
            "partition": msg.headers.get("kafka.connect.dlq.partition"),
            "offset": msg.headers.get("kafka.connect.dlq.offset"),
            "error_message": msg.headers.get("kafka.connect.dlq.exception.message"),
            "error_stacktrace": msg.headers.get("kafka.connect.dlq.exception.stacktrace"),
        }
        notify_error(error_info)
        # Manual retry or route to manual review
```

## Rules
- Use distributed workers for production (standalone for dev only)
- Set replication factor = 3 for all internal Connect topics
- Enable cooperative rebalancing for large connector clusters
- Configure DLQ for all sink connectors to prevent data loss
- Use Avro + Schema Registry for schema evolution support
- Monitor connector state, task count, and offset lag
- Set error tolerance to `all` to prevent connector failure on bad records
- Test SMT transforms before deploying to production
- Always specify explicit `tasks.max` based on topic partition count
- Use secrets management (env vars, vault) for all credentials
