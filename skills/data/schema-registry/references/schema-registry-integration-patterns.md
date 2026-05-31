# Schema Registry Integration Patterns

## Overview

Schema registries integrate with multiple systems across the data pipeline: streaming platforms, batch processing, ETL tools, catalogs, and CI/CD. This reference covers integration patterns, configuration examples, and operational practices for connecting schema registries to the broader data ecosystem.

## Kafka Integration

### Producer Configuration

```java
// Full producer setup with Avro + Schema Registry
import io.confluent.kafka.serializers.KafkaAvroSerializer;
import io.confluent.kafka.serializers.KafkaAvroSerializerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;

Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka-1:9092,kafka-2:9092,kafka-3:9092");

// Serializer config
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class.getName());

// Schema Registry connection
props.put(KafkaAvroSerializerConfig.SCHEMA_REGISTRY_URL_CONFIG,
    "http://sr-1:8081,http://sr-2:8081,http://sr-3:8081");

// Best practices
props.put(KafkaAvroSerializerConfig.AUTO_REGISTER_SCHEMAS, "false");
props.put(KafkaAvroSerializerConfig.USE_LATEST_VERSION, "true");
props.put(KafkaAvroSerializerConfig.LATEST_CACHE_TTL_SEC, "300");

// Schema validation
props.put(KafkaAvroSerializerConfig.SCHEMA_VALIDATION_ENABLED, "true");

// Kerberos/SSL
props.put("sasl.jaas.config", "org.apache.kafka.common.security.plain.PlainLoginModule required ...");
props.put("security.protocol", "SASL_SSL");
```

### Consumer Configuration

```java
properties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class.getName());
properties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class.getName());
properties.put(KafkaAvroDeserializerConfig.SCHEMA_REGISTRY_URL_CONFIG,
    "http://sr-1:8081,http://sr-2:8081,http://sr-3:8081");
properties.put(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG, "true");
properties.put(KafkaAvroDeserializerConfig.FAIL_ON_DESERIALIZATION_ERROR_CONFIG, "false");

// Error handling: dead letter topic
properties.put("default.deserialization.exception.handler",
    "io.confluent.kafka.serializers.deserialization.FailOnUnknownTypeFallbackHandler");
```

### Kafka Streams Integration

```java
import io.confluent.kafka.streams.serdes.avro.SpecificAvroSerde;

Properties streamsProps = new Properties();
streamsProps.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-enricher");
streamsProps.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
streamsProps.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, SpecificAvroSerde.class.getName());
streamsProps.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, SpecificAvroSerde.class.getName());
streamsProps.put(AbstractKafkaSchemaSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG,
    "http://schema-registry:8081");

// Register schemas for intermediate topics
streamsProps.put(StreamsConfig.DEFAULT_DSL_STORE_CONFIG, "org.apache.kafka.streams.state.inmemory.InMemoryKeyValueStore");

KStreamBuilder builder = new KStreamBuilder();
KStream<String, Order> orders = builder.stream("orders");
KStream<String, EnrichedOrder> enriched = orders.mapValues(order ->
    EnrichedOrder.newBuilder()
        .setOrderId(order.getOrderId())
        .setTotal(order.getTotal())
        .setProcessedTimestamp(System.currentTimeMillis())
        .build()
);
enriched.to("enriched-orders");
```

## KSQL / ksqlDB Integration

```sql
-- ksqlDB with Schema Registry
SET 'ksql.schema.registry.url' = 'http://schema-registry:8081';

-- Create stream from existing topic with Avro schema
CREATE STREAM orders_stream (
    order_id STRING,
    customer_id STRING,
    total DOUBLE
) WITH (
    KAFKA_TOPIC = 'orders',
    VALUE_FORMAT = 'AVRO',
    KEY_FORMAT = 'AVRO'
);

-- Auto-register result schema
CREATE STREAM high_value_orders AS
    SELECT order_id, customer_id, total
    FROM orders_stream
    WHERE total > 1000;
-- New schema registered: "HIGH_VALUE_ORDERS-value" with schema inferred

-- Explicit schema control
CREATE STREAM enriched_orders WITH (
    KAFKA_TOPIC = 'enriched-orders',
    VALUE_FORMAT = 'AVRO',
    VALUE_SCHEMA_ID = 42  -- use existing schema ID
) AS
SELECT ... FROM ...
```

## Kafka Connect Integration

### Sink Connector

```json
{
  "name": "s3-sink-orders",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "4",
    "topics": "orders",
    "s3.bucket.name": "data-lake",
    "s3.region": "us-east-1",
    "flush.size": "10000",
    "format.class": "io.confluent.connect.s3.format.avro.AvroFormat",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "schema.compatibility": "BACKWARD"
  }
}
```

### Source Connector (JDBC)

```json
{
  "name": "jdbc-source-orders",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "connection.url": "jdbc:postgresql://pg-primary:5432/proddb",
    "connection.user": "connect_user",
    "mode": "incrementing",
    "incrementing.column.name": "order_id",
    "topic.prefix": "pg-orders-",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "transforms": "createKey,extractKey",
    "transforms.createKey.type": "org.apache.kafka.connect.transforms.ValueToKey",
    "transforms.createKey.fields": "order_id",
    "transforms.extractKey.type": "org.apache.kafka.connect.transforms.ExtractField$Key",
    "transforms.extractKey.field": "order_id"
  }
}
```

### Schema Registry for Connect

```java
// Custom converter with schema registry fallback
public class ResilientAvroConverter extends AvroConverter {
    @Override
    public SchemaAndValue toConnectData(byte[] bytes, Schema schema) {
        try {
            return super.toConnectData(bytes, schema);
        } catch (Exception e) {
            log.warn("Failed to deserialize with schema registry, trying fallback", e);
            return tryFallbackDeserialization(bytes);
        }
    }
}
```

## Flink Integration

### Flink with Avro + Schema Registry

```java
import org.apache.flink.formats.avro.registry.confluent.ConfluentRegistryAvroDeserializationSchema;
import org.apache.flink.formats.avro.registry.confluent.ConfluentRegistryAvroSerializationSchema;

// Source: read from Kafka with schema registry
DataStream<Order> orders = env.addSource(
    new FlinkKafkaConsumer<>("orders",
        ConfluentRegistryAvroDeserializationSchema.forSpecific(Order.class,
            "http://schema-registry:8081"),
        properties
    )
);

// Sink: write to Kafka with schema registry
DataStream<EnrichedOrder> enriched = orders.map(...);
enriched.addSink(
    new FlinkKafkaProducer<>("enriched-orders",
        ConfluentRegistryAvroSerializationSchema.forSpecific(EnrichedOrder.class,
            EnrichedOrder.class,
            "http://schema-registry:8081"),
        properties
    )
);
```

### Flink SQL with Schema Registry

```sql
CREATE TABLE orders (
    order_id STRING,
    customer_id STRING,
    total DOUBLE,
    proc_time AS PROCTIME()
) WITH (
    'connector' = 'kafka',
    'topic' = 'orders',
    'properties.bootstrap.servers' = 'kafka:9092',
    'properties.group.id' = 'flink-orders',
    'format' = 'avro-confluent',
    'avro-confluent.schema-registry.url' = 'http://schema-registry:8081',
    'scan.startup.mode' = 'earliest-offset'
);

CREATE TABLE high_value_orders (
    order_id STRING,
    customer_id STRING,
    total DOUBLE
) WITH (
    'connector' = 'kafka',
    'topic' = 'high-value-orders',
    'properties.bootstrap.servers' = 'kafka:9092',
    'format' = 'avro-confluent',
    'avro-confluent.schema-registry.url' = 'http://schema-registry:8081'
);

INSERT INTO high_value_orders
SELECT order_id, customer_id, total
FROM orders
WHERE total > 1000;
```

## Spark Integration

### Spark Structured Streaming

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("orders-stream") \
    .config("spark.sql.streaming.schemaInference", "true") \
    .config("spark.sql.avro.schema.registry.url", "http://schema-registry:8081") \
    .getOrCreate()

# Read streaming with schema registry
orders = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:9092") \
    .option("subscribe", "orders") \
    .load()

# Deserialize Avro from schema registry
from pyspark.sql.avro.functions import from_avro, to_avro

# Get schema from registry
schema_registry_url = "http://schema-registry:8081"
subject = "orders-value"

# Get latest schema
import requests
resp = requests.get(f"{schema_registry_url}/subjects/{subject}/versions/latest")
schema = resp.json()["schema"]

orders_parsed = orders.select(
    from_avro(orders.value, schema, {"schema.registry.url": schema_registry_url}).alias("data")
).select("data.*")

# Write with schema registry
high_value = orders_parsed.filter("total > 1000")
query = high_value \
    .select(to_avro("data", {"schema.registry.url": schema_registry_url}).alias("value")) \
    .writeStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:9092") \
    .option("topic", "high-value-orders") \
    .option("checkpointLocation", "/checkpoints/high-value") \
    .start()
```

## Schema Registry with Data Contracts

### Integration Pattern

```
Schema Registry (technical schema)
    └── Defines: field names, types, compatibility rules
    └── Used for: serialization, deserialization

Data Contract (business schema)
    └── Defines: semantics, SLA, ownership, quality rules
    └── References: schema registry schema IDs

Integration:
    Contract.schema_id → Schema Registry.getSchema(id)
    Contract.compatibility → SR compatible check
    Contract.fields → SR field definitions
```

```yaml
# Data contract referencing schema registry
contract:
  dataset: analytics.fct_orders
  schema_registry:
    subject: orders-value
    latest_version: 5
    compatibility_mode: BACKWARD

  fields:  # subset of registry schema, with added business info
    - name: order_id
      semantic_type: ORDER_ID
      pii_classification: restricted
    - name: total_amount
      semantic_type: MONETARY_VALUE
      constraints:
        minimum: 0
```

## Apicurio Integration

### Kafka with Apicurio

```java
// Apicurio Avro Serde
import io.apicurio.registry.serde.avro.AvroKafkaSerializer;
import io.apicurio.registry.serde.avro.AvroKafkaDeserializer;

props.put(CommonClientConfigs.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, AvroKafkaSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, AvroKafkaSerializer.class.getName());
props.put("apicurio.registry.url", "http://apicurio:8080/api");
props.put("apicurio.auth.service.url", "http://keycloak:8080/auth");
props.put("apicurio.auth.service.token.endpoint", "/realms/apicurio/protocol/openid-connect/token");
props.put("apicurio.auth.client.id", "sr-client");
props.put("apicurio.auth.client.secret", "xxx");
props.put("apicurio.registry.auto-register", "false");
props.put("apicurio.registry.find-latest", "true");
```

### Apicurio Multi-Format

```java
// Apicurio supports multiple formats with same API
// Avro
props.put("apicurio.registry.serializer.encoding", "AVRO");

// Protobuf
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
    "io.apicurio.registry.serde.protobuf.ProtobufKafkaSerializer.class");

// JSON Schema
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
    "io.apicurio.registry.serde.jsonschema.JsonSchemaKafkaSerializer.class");
```

## Buf Schema Registry Integration

### Protobuf + Buf

```yaml
# buf.yaml
version: v2
lint:
  use:
    - STANDARD
    - COMMENTS
breaking:
  use:
    - FILE
deps:
  - buf.build/googleapis/googleapis

# buf.gen.yaml
version: v2
managed:
  enabled: true
plugins:
  - plugin: buf.build/protocolbuffers/java:v25.3
    out: gen/java
  - plugin: buf.build/protocolbuffers/python:v25.3
    out: gen/python
  - plugin: buf.build/connectrpc/es:v1.3.0
    out: gen/web
```

### BSR CI/CD Integration

```yaml
# .github/workflows/proto-check.yml
jobs:
  proto:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for breaking change check

      - uses: bufbuild/buf-setup-action@v1
        with:
          version: 1.28.0

      - name: Lint
        run: buf lint

      - name: Check breaking changes
        run: buf breaking --against .git#branch=main

      - name: Push to BSR
        if: github.ref == 'refs/heads/main'
        run: |
          buf push --tag "$(git rev-parse --short HEAD)"
          buf push --tag "v1.0.0"  # when tagging releases
```

## Schema Registry and AsyncAPI

### AsyncAPI Document with Schema Registry References

```yaml
asyncapi: "3.0.0"
info:
  title: Order Events API
  version: "1.0.0"

channels:
  orders:
    address: orders
    messages:
      orderCreated:
        $ref: '#/components/messages/OrderCreated'
      orderUpdated:
        $ref: '#/components/messages/OrderUpdated'

components:
  messages:
    OrderCreated:
      payload:
        schemaFormat: "application/vnd.apache.avro;version=1.9.0"
        schema:
          $ref: "http://schema-registry:8081/subjects/orders-value/versions/latest"
```

## Schema Registry Monitoring

### Health Checks

```bash
# Liveness
curl http://schema-registry:8081/

# Readiness
curl http://schema-registry:8081/ready

# Cluster status
curl http://schema-registry:8081/cluster
```

### Metrics

```yaml
# Available JMX metrics
kafka.schema.registry:type=jetty-metrics:
  - request-error-rate
  - request-latency-avg

kafka.schema.registry:type=schema-registry-metrics:
  - schema-registry-avg-fetch-request-rate
  - schema-registry-avg-register-request-rate
  - schema-registry-schema-id-cache-size
  - schema-registry-schema-id-cache-hit-ratio
  - schema-registry-schema-cache-size
```

### Prometheus Integration

```yaml
# Prometheus config for Confluent Schema Registry
scrape_configs:
  - job_name: 'schema-registry'
    static_configs:
      - targets:
        - 'sr-1:8081'
        - 'sr-2:8081'
        - 'sr-3:8081'
    metrics_path: '/metrics'

# Grafana dashboard panels:
# - Schema registration rate (per subject)
# - Compatibility check failure rate
# - Fetch latency p95/p99
# - Cache hit ratio
# - Request error rate
# - Active schema count per subject
```

## Schema Registry Security

### RBAC Configuration

```yaml
# Confluent Schema Registry RBAC
SCHEMA_REGISTRY_AUTH_METHOD: BASIC
SCHEMA_REGISTRY_AUTHENTICATION_REALM: schema-registry

# User roles:
# - SystemAdmin: full access
# - User: read + register
# - Developer: read only

# Subject-level authorization
# pattern: <subject-name>:<operation>
# operations: READ, WRITE, DELETE, ALLOW_EVOLUTION

# Example:
schema.registry.authorizer.properties:
  # Finance team can write to finance subjects
  pattern_matcher: FinanceTeam:WRITE:finance.*
  # Operations can delete any schema
  pattern_matcher: OpsTeam:DELETE:*
  # Default: read-only for all
  pattern_matcher: AnonymousUser:READ:*
```

## Schema Evolution in CI/CD

### GitHub Actions Workflow

```yaml
name: Schema Governance
on:
  pull_request:
    paths:
      - 'schemas/**/*.avsc'
      - 'schemas/**/*.proto'
      - 'schemas/**/*.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Validate syntax
        run: |
          # Avro validation
          for f in schemas/**/*.avsc; do
            python -c "import avro.schema; avro.schema.parse(open('$f').read())"
          done

      - name: Check breaking changes
        run: |
          python scripts/check_schema_diff.py \
            --base refs/heads/main \
            --head HEAD \
            --mode BACKWARD \
            --registry ${{ secrets.SCHEMA_REGISTRY_URL }}

      - name: Register schemas
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          python scripts/register_schemas.py \
            --registry ${{ secrets.SCHEMA_REGISTRY_URL }} \
            --dir schemas/avro

  notify:
    needs: validate
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        run: |
          curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"Schema compatibility check failed in ${{ github.repository }} PR #${{ github.event.number }}"}' \
            ${{ secrets.SLACK_WEBHOOK }}
```

## References

- Schema Registry operations reference
- Schema evolution patterns
- Schema governance framework
- Schema registry ecosystem tools
- Data contract integration
- Buf schema management
- AsyncAPI specification
