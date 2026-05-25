---
name: data-schema-registry
description: >
  Use this skill when asked about Schema Registry, Avro, Protobuf, schema evolution, compatibility, Confluent Schema Registry, Apicurio, serialization, deserialization, or schema validation. This skill enforces: Schema Registry architecture and deployment, Avro/Protobuf/JSON Schema definition, compatibility modes (BACKWARD, FORWARD, FULL, NONE), schema evolution best practices, SerDe (serialization/deserialization) patterns, and CI/CD integration for schema governance. Do NOT use for: data contract enforcement, data catalog management, or database schema design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, schema, streaming, phase-11]
---

# Data Schema Registry

## Purpose
Design and deploy a schema registry with Avro/Protobuf/JSON Schema, compatibility enforcement, SerDe patterns, CI/CD integration, and governance for streaming and batch data.

## Agent Protocol

### Trigger
Exact user phrases: "Schema Registry", "Avro", "Protobuf", "schema evolution", "compatibility", "Confluent Schema Registry", "Apicurio", "serialization", "deserialization", "schema validation", "subject", "SerDe".

### Input Context
- Streaming platform (Kafka, Pulsar, Kinesis)
- Serialization format preference (Avro, Protobuf, JSON Schema)
- Producers and consumers count and languages
- Schema governance maturity level
- CI/CD pipeline structure
- Existing schema management approach

### Output Artifact
Schema registry architecture with format selection, compatibility strategy, SerDe configuration, deployment plan, and CI/CD governance integration.

### Response Format
```yaml
# Schema registry deployment
# Avro/Protobuf/JSON schema examples
# Compatibility rules per subject
# SerDe configuration (Kafka + batch)
# CI/CD schema enforcement pipeline
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Schema format selected with rationale
- [ ] Schema registry deployed and configured
- [ ] Schemas defined for all streaming topics
- [ ] Compatibility mode set per subject
- [ ] SerDe configured for producers and consumers
- [ ] CI/CD pipeline validates schema changes
- [ ] Schema governance documented with owner and review process

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Select Schema Format

| Format | Strengths | Weaknesses | Best For |
|---|---|---|---|
| **Avro** | Native Kafka/Confluent support, schema evolution, compact binary | Java-centric, limited JSON-like readability | Kafka streaming, Confluent ecosystem |
| **Protobuf** | Language-agnostic, fastest serialization, gRPC native | Schema evolution more strict, larger schemas | Cross-language, gRPC services |
| **JSON Schema** | Readable, widely understood, web-native | Larger payload, slower parsing | REST APIs, web frontends |

Default: Avro for Kafka/Confluent stacks. Protobuf for gRPC + streaming. JSON Schema for REST APIs only.

### Step 2: Define Avro Schema

```avro
{
  "type": "record",
  "name": "Order",
  "namespace": "com.org.data.orders",
  "doc": "Order event schema",
  "fields": [
    {"name": "order_id", "type": "string", "doc": "Unique order identifier"},
    {"name": "customer_id", "type": "string", "doc": "Customer identifier"},
    {"name": "total_amount", "type": "double", "doc": "Order total in USD"},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "status", "type": {"type": "enum", "name": "OrderStatus",
      "symbols": ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]}},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record", "name": "LineItem",
      "fields": [
        {"name": "product_id", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "unit_price", "type": "double"}
      ]
    }}},
    {"name": "created_at", "type": {"type": "long", "logicalType": "timestamp-millis"}}
  ]
}
```

### Step 3: Set Compatibility Modes

| Mode | Producer Change | Consumer Impact | Use Case |
|---|---|---|---|
| **BACKWARD** | Can delete fields, add optional | Old consumers read new data | Default for most |
| **FORWARD** | Can add fields, delete optional | New consumers read old data | Long-lived consumers |
| **FULL** | Add optional fields only | Both directions compatible | Strict governance |
| **NONE** | Any change allowed | Consumers must sync | Dev/test only |

```yaml
subjects:
  orders-value:
    compatibility: BACKWARD
    owner: orders-team
    description: "Order event value schema"
  orders-key:
    compatibility: FULL
    owner: orders-team
    description: "Order key (order_id string)"
  customer-value:
    compatibility: FORWARD
    owner: customer-team
    description: "Customer event value schema"
```

Default rule: production topics = BACKWARD. Key subjects = FULL (keys are critical). Dev topics = NONE.

### Step 4: Deploy Schema Registry

```yaml
# docker-compose.schema-registry.yaml
services:
  schema-registry:
    image: confluentinc/cp-schema-registry:7.6.0
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: PLAINTEXT://kafka:9092
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_TOPIC: _schemas
      SCHEMA_REGISTRY_COMPATIBILITY_LEVEL: BACKWARD
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
      SCHEMA_REGISTRY_ACCESS_CONTROL_ALLOW_METHODS: GET,POST,PUT,DELETE
      SCHEMA_REGISTRY_KAFKASTORE_SECURITY_PROTOCOL: SASL_SSL
      SCHEMA_REGISTRY_KAFKASTORE_SASL_MECHANISM: SCRAM-SHA-512
    depends_on:
      - kafka
```

### Step 5: Configure SerDe

```java
// Kafka Producer (Java) — Avro Serde with Schema Registry
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class.getName());
props.put(KafkaAvroSerializerConfig.SCHEMA_REGISTRY_URL_CONFIG, "http://schema-registry:8081");
props.put(KafkaAvroSerializerConfig.AUTO_REGISTER_SCHEMAS, "false");
props.put(KafkaAvroSerializerConfig.USE_LATEST_VERSION, "true");

// Kafka Consumer — Avro Deserializer with Schema Registry
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class.getName());
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class.getName());
props.put(KafkaAvroDeserializerConfig.SCHEMA_REGISTRY_URL_CONFIG, "http://schema-registry:8081");
props.put(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG, "true");
```

### Step 6: CI/CD Schema Validation

```yaml
# .github/workflows/schema-check.yml
jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Avro Schema
        run: |
          for schema in schemas/**/*.avsc; do
            python scripts/validate_avro.py "$schema"
          done
      - name: Check Compatibility
        run: |
          for schema in schemas/**/*.avsc; do
            subject=$(basename "$schema" .avsc)-value
            python scripts/check_compatibility.py \
              --subject "$subject" \
              --schema "$schema" \
              --mode BACKWARD \
              --registry http://schema-registry:8081
          done
      - name: Register Schema
        if: success() && github.ref == 'refs/heads/main'
        run: |
          for schema in schemas/**/*.avsc; do
            subject=$(basename "$schema" .avsc)-value
            python scripts/register_schema.py \
              --subject "$subject" \
              --schema "$schema" \
              --registry http://schema-registry:8081
          done
```

### Step 7: Schema Evolution Best Practices

| Rule | Rationale |
|---|---|
| Always provide `default` for new fields | Ensures backward compatibility |
| Never remove a field without deprecation period | Avoids breaking consumers |
| Use enum types with care — adding symbols is backward-safe, removing is not | Enum evolution is restrictive |
| Key subjects use FULL compatibility | Keys are referenced across topics |
| Production schemas require `auto.register.schemas = false` | Prevents accidental schema registration |
| Schema changes reviewed by schema governance | Catches breaking changes before deploy |

### Step 8: AsyncAPI and JSON Schema
AsyncAPI is the specification for event-driven API documentation (analogous to OpenAPI for REST). Describes channels (Kafka topics, Pulsar topics, MQTT), messages with payloads (Avro/Protobuf/JSON Schema), and protocol bindings. AsyncAPI pairs with Schema Registry by documenting message flow: topic names, publish/subscribe patterns, payload schemas, correlation IDs. Generates client code, mock servers, and validation tools. Use AsyncAPI as the contract layer above Schema Registry for event-driven architecture governance.

JSON Schema provides conditional validation for JSON payloads. Deep usage: `$defs` for reusable components, `if/then/else` for conditional validation, `oneOf/anyOf/allOf` for composition, `format` (email, date-time, uri) for semantic validation. Use JSON Schema with Schema Registry via Confluent's JsonSchemaSerde or Apicurio. JSON Schema payloads are larger than Avro/Protobuf but offer easier debugging and broader tooling support.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "order_id": {"type": "string"},
    "customer": {"$ref": "#/$defs/customer"},
    "items": {"type": "array", "items": {"$ref": "#/$defs/line_item"}},
    "status": {"type": "string", "enum": ["pending", "confirmed", "shipped"]}
  },
  "required": ["order_id", "items"],
  "if": {"properties": {"status": {"const": "shipped"}}},
  "then": {"required": ["tracking_number"]}
}
```

### Step 9: Buf for Schema Management
Buf is a schema management tool for Protobuf enforcing lint rules (naming, field ordering, package structure) and breaking change detection (wire vs source compatibility) in CI/CD. Buf Schema Registry (BSR) manages Protobuf schemas across teams as a hosted registry for gRPC/Protobuf. Generates client/server code for multiple languages from a single schema source. Key commands: `buf breaking --against .git` checks breaking changes against previous commit; `buf lint` enforces 100+ rules. Use Buf for gRPC microservices needing rigorous Protobuf governance and breaking change detection in CI.

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
```

## Rules
- Every Kafka topic has a registered schema (key + value)
- Production topics enforce BACKWARD or FULL compatibility
- `auto.register.schemas = false` in all production producers
- Schema changes reviewed via PR before registration
- Deprecated fields documented with removal version
- Enum symbols never removed once data exists in topics
- Schema registry replicated across regions for HA
- No schema change without compatibility check in CI/CD

## References
- `references/registry-setup.md` — Confluent Schema Registry, Apicurio, SerDe, deployment, security, CI/CD integration, governance
- `references/schema-evolution.md` — Compatibility modes, Avro schema definition, Protobuf vs Avro, evolution best practices
- `references/schema-registry-operations.md` — Schema registry operations, Confluent SR API, Apicurio rules, serialization patterns, CI/CD pipeline integration
- `references/schema-registry-tools.md` — AsyncAPI event docs, JSON Schema conditional validation, Buf Protobuf governance, CI/CD

## Handoff
`data-data-platform` for registry deployment. `data-data-catalog` for schema metadata. `data-data-contracts` for data contract schema integration. `data-data-observability` for schema drift monitoring.
