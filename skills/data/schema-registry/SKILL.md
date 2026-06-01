---
name: data-schema-registry
description: >
  Use this skill when asked about Schema Registry, Avro, Protobuf, schema evolution, compatibility, Confluent Schema Registry, Apicurio, serialization, deserialization, or schema validation. This skill enforces: Schema Registry architecture and deployment, Avro/Protobuf/JSON Schema definition, compatibility modes (BACKWARD, FORWARD, FULL, NONE), schema evolution best practices, SerDe (serialization/deserialization) patterns, and CI/CD integration for schema governance. Do NOT use for: data contract enforcement, data catalog management, or database schema design.
version: "1.1.0"
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
  "type": "record", "name": "Order", "namespace": "com.org.data.orders",
  "doc": "Order event schema",
  "fields": [
    {"name": "order_id", "type": "string", "doc": "Unique order identifier"},
    {"name": "customer_id", "type": "string"},
    {"name": "total_amount", "type": "double"},
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

### Step 4: Deploy Schema Registry

```yaml
services:
  schema-registry:
    image: confluentinc/cp-schema-registry:7.6.0
    ports: ["8081:8081"]
    environment:
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: PLAINTEXT://kafka:9092
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_COMPATIBILITY_LEVEL: BACKWARD
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
      SCHEMA_REGISTRY_KAFKASTORE_TOPIC: _schemas
```

### Step 5: Configure SerDe

```java
// Kafka Producer — Avro Serde with Schema Registry
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class.getName());
props.put(KafkaAvroSerializerConfig.SCHEMA_REGISTRY_URL_CONFIG, "http://schema-registry:8081");
props.put(KafkaAvroSerializerConfig.AUTO_REGISTER_SCHEMAS, "false");
props.put(KafkaAvroSerializerConfig.USE_LATEST_VERSION, "true");
```

### Step 6: CI/CD Schema Validation

```yaml
jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate and Check Compatibility
        run: |
          for schema in schemas/**/*.avsc; do
            python scripts/validate_and_register.py \
              --subject "$(basename $schema .avsc)-value" \
              --schema "$schema" --mode BACKWARD
          done
      - name: Register Schema
        if: success() && github.ref == 'refs/heads/main'
        run: |
          for schema in schemas/**/*.avsc; do
            subject=$(basename "$schema" .avsc)-value
            python scripts/register_schema.py --subject "$subject" --schema "$schema"
          done
```

### Step 7: Schema Evolution Best Practices

| Rule | Rationale |
|---|---|
| Always provide `default` for new fields | Ensures backward compatibility |
| Never remove a field without deprecation period | Avoids breaking consumers |
| Use enum types with care | Adding symbols is backward-safe, removing is not |
| Key subjects use FULL compatibility | Keys are referenced across topics |
| Auto-register schemas disabled in production | Prevents accidental schema registration |

### Step 8: AsyncAPI and JSON Schema
AsyncAPI pairs with Schema Registry by documenting event-driven API message flow with topic names, publish/subscribe patterns, and payload schemas.

### Step 9: Buf for Schema Management
Buf enforces Protobuf lint rules and breaking change detection in CI/CD. `buf breaking --against .git` checks breaking changes against previous commit. Use for gRPC microservices requiring rigorous Protobuf governance.

### Step 10: Schema Registry as Source of Truth
The schema registry is the authoritative source for all streaming schemas. Producers must register schemas before writing data. Consumers fetch schemas from registry to deserialize. No schema should be hardcoded in application code — always reference the registry.

### Step 11: Multi-Tenant Schema Registry
For organizations with multiple business units, use subject prefix isolation (`commerce.orders-value`, `finance.invoices-value`). Each tenant manages its own schemas within its prefix. The platform team manages registry infrastructure. Use Confluent Schema Registry's authorization mechanism with RBAC to isolate tenant access.

### Step 12: Schema Migration Strategies
For breaking schema changes that cannot be avoided, follow a multi-step migration:
1. Add new fields with defaults (compatible change) — deploy
2. Allow old and new schemas to coexist (dual-schema period) — 30 days
3. Deprecate old fields (mark as deprecated in schema doc) — notify consumers
4. Remove old fields (breaking change, MAJOR version) — deploy
5. Clean up old schema versions that are no longer referenced

## Architecture / Decision Trees

### Format Selection

```
New schema needed
  ├── Kafka/Confluent ecosystem? → Avro
  ├── gRPC services / multi-language? → Protobuf
  ├── REST APIs / web frontends? → JSON Schema
  └── Need both streaming + REST? → Avro for streaming, JSON Schema for REST
```

### Compatibility Mode Selection

```
Subject type:
  ├── Key → FULL (keys are critical, must never break)
  ├── Value, production → BACKWARD (safe default)
  ├── Value, strict governance → FULL
  ├── Value, CDC/stream consumers → FORWARD
  └── Dev/test → NONE
```

### Registry Deployment Topology

```
Deployment scale:
  ├── Single team, < 100 subjects → Single instance
  ├── Multi-team, < 1000 subjects → HA cluster (3 nodes)
  ├── Multi-region, < 10000 subjects → Per-registry + replication
  └── Enterprise, global → Multi-registry federation
```

## Common Pitfalls

1. **Auto-register schemas in production**: a single misconfigured producer can register an incorrect schema. Always set `auto.register.schemas = false`.
2. **Enum removal**: removing symbols from an enum is a breaking change. Once data exists with a symbol, it cannot be removed.
3. **No default on new fields**: adding a required field (no default) breaks backward compatibility. Always provide a default.
4. **Schema registry single point of failure**: without HA, schema registry downtime blocks producers and consumers. Deploy with replication.
5. **Subject naming inconsistency**: different teams use different naming conventions. Enforce a standard: `<topic_name>-key` and `<topic_name>-value`.
6. **Ignoring deleted schema versions**: schemas can be deleted but referenced data persists. Use soft-delete or version archiving.
7. **Protobuf field number reuse**: reusing field numbers breaks wire compatibility. Never reuse old field numbers.
8. **No validation before registration**: registering invalid schemas pollutes the registry. Validate locally before submitting.
9. **Key schema treated same as value**: key schemas need stricter compatibility (FULL) because keys are referenced across topics.
10. **Not using transitive compatibility**: non-transitive only checks against latest version. Transitive checks against all versions.
11. **Missing schema evolution documentation**: consumers don't know what changed. Maintain a schema changelog with migration notes.

## Best Practices

- Enforce schema compatibility checks in CI/CD before merging to main.
- Every schema change requires a review by the schema governance team.
- Schema registry is the source of truth for all streaming schemas.
- Monitor compatibility check failures and broken producers/consumers.
- Use subject prefixes for multi-tenant registries (e.g., `commerce.orders-value`).
- Archive schemas older than 2 years to reduce registry size.
- Automate schema evolution: add-only for minor versions, deprecation for major.
- Test schema changes with shadow consumers before deploying.
- Maintain a schema changelog for consumer awareness.
- Use transitive compatibility enforcement for critical subjects.
- Pin producer/consumer schema versions for canary deployments.
- Document field semantics with `doc` attribute in schema definition.
- Use schema references ($ref) for shared types across schemas.
- Set up monitoring for schema registration failures and compatibility check latency.

## Compared With

| Feature | Confluent SR | Apicurio | Buf Schema Registry |
|---|---|---|---|
| Formats | Avro, Protobuf, JSON | Avro, Protobuf, JSON, GraphQL, OpenAPI | Protobuf only |
| Compatibility | BACKWARD, FORWARD, FULL, NONE, TRANSITIVE | Same + CUSTOM | Wire + Source compatibility |
| Deployment | Standalone, Confluent Cloud | Standalone, Red Hat | SaaS, self-hosted |
| Integrations | Kafka, KSQL, Connect | Kafka, Quarkus, Camel | gRPC, Connect |
| Governance | Client-side enforcement | Server-side rules | Lint + breaking change rules |
| Ecosystem | Largest Kafka ecosystem | Cloud-native Java | Protobuf-centric |

Schema registry vs data catalog: schema registry focuses on schema storage, compatibility checking, and providing schemas at serialization/deserialization time. Data catalog focuses on metadata management, discovery, and lineage. They are complementary: the schema registry feeds schemas to the catalog, and the catalog provides business context around schemas.

## Performance

- Schema registry adds ~5-15ms latency per serialization/deserialization call (cached on client after first fetch).
- Avro binary serialization: 50-200MB/s throughput per core, payload 60-80% smaller than JSON.
- Protobuf serialization: 100-400MB/s throughput per core, payload 70-85% smaller than JSON.
- JSON Schema: 20-50MB/s throughput, payload same size as JSON (or larger with $ref expansion).
- Schema fetch: first request fetches schema from registry (~10ms), subsequent requests use local cache.
- Avro schema resolution: compatible reader/writer schema resolution happens on deserialization, adding ~1-5us per record.
- Registry caching: client-side schema cache with LRU eviction. Configure cache size based on number of subjects.
- Registry throughput: Confluent SR handles 1000+ schema registrations/second on modest hardware.
- Network overhead: schema registry communication adds ~1-2ms per request in the same region, 10-50ms cross-region.
- Global cache invalidation: when schema changes, existing cached schemas remain valid. Only new versions trigger fresh fetch.

## Tooling

| Tool | Purpose |
|---|---|
| Confluent Schema Registry | Primary schema registry for Kafka |
| Apicurio | Alternative registry, multi-format support |
| Buf | Protobuf linting, breaking change detection, BSR |
| Avro Tools CLI | Schema validation, code generation |
| protoc | Protobuf compilation, code generation |
| AsyncAPI | Event-driven API documentation |
| Karapace | Open-source schema registry (Kafka-compatible API) |
| kcat | Kafka command-line tool with schema support |
| SchemaCrawler | Schema visualization and documentation |

### Protobuf Schema Definition

```protobuf
syntax = "proto3";
package com.org.data.orders;
import "google/protobuf/timestamp.proto";

message Order {
  string order_id = 1;
  string customer_id = 2;
  repeated LineItem line_items = 3;
  double total_amount = 4;
  Currency currency = 5;
  OrderStatus status = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
  map<string, string> metadata = 9;
  
  message LineItem {
    string product_id = 1;
    int32 quantity = 2;
    double unit_price = 3;
  }
  
  enum Currency {
    CURRENCY_UNSPECIFIED = 0;
    USD = 1;
    EUR = 2;
    GBP = 3;
  }
  
  enum OrderStatus {
    STATUS_UNSPECIFIED = 0;
    PENDING = 1;
    CONFIRMED = 2;
    SHIPPED = 3;
    DELIVERED = 4;
    CANCELLED = 5;
  }
}
```

### JSON Schema Definition

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Order",
  "type": "object",
  "properties": {
    "order_id": { "type": "string", "description": "Unique order identifier" },
    "customer_id": { "type": "string" },
    "line_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "product_id": { "type": "string" },
          "quantity": { "type": "integer", "minimum": 1 },
          "unit_price": { "type": "number", "minimum": 0 }
        },
        "required": ["product_id", "quantity", "unit_price"]
      }
    },
    "total_amount": { "type": "number", "minimum": 0 },
    "status": { "type": "string", "enum": ["pending", "confirmed", "shipped", "delivered", "cancelled"] },
    "created_at": { "type": "string", "format": "date-time" }
  },
  "required": ["order_id", "customer_id", "total_amount"]
}
```

### Registry Deployment Patterns

```yaml
# Confluent Schema Registry HA deployment
registry_cluster:
  nodes: 3  # Minimum 3 for quorum-based HA
  storage: "kafka"  # Uses internal Kafka topic _schemas
  replication_factor: 3
  kafka_bootstrap_servers: "broker1:9092,broker2:9092,broker3:9092"
  
  # Multi-datacenter setup
  primary_region: "us-east-1"
  secondary_region: "us-west-2"
  replication:
    type: "active-standby"  # Primary handles writes, standby serves reads
    sync_interval: "5s"     # Schema replication delay
  
  # Security
  ssl:
    enabled: true
    mutual_auth: true  # mTLS for producer/consumer auth
  rbac:
    enabled: true      # Role-based access control
    admin_principal: "schema-admin"

# Apicurio Registry deployment (alternative, multi-format)
apicurio_registry:
  storage: "sql"  # PostgreSQL, SQL Server, or Kafka
  formats: ["AVRO", "PROTOBUF", "JSON_SCHEMA", "ASYNCAPI", "OPENAPI"]
  rules:
    global: ["VALIDITY", "COMPATIBILITY"]
    per_artifact: true
  auth: "keycloak"  # OIDC integration
  ui: true
```

### SerDe Configuration

```yaml
# Kafka Avro SerDe (Confluent)
kafka_producer_config:
  key.serializer: "org.apache.kafka.common.serialization.StringSerializer"
  value.serializer: "io.confluent.kafka.serializers.KafkaAvroSerializer"
  schema.registry.url: "https://schema-registry:8081"
  auto.register.schemas: false
  use.latest.version: true  # Use latest compatible schema version

kafka_consumer_config:
  key.deserializer: "org.apache.kafka.common.serialization.StringDeserializer"
  value.deserializer: "io.confluent.kafka.serializers.KafkaAvroDeserializer"
  schema.registry.url: "https://schema-registry:8081"
  specific.avro.reader: true

# Kafka Protobuf SerDe
kafka_protobuf_producer:
  key.serializer: "org.apache.kafka.common.serialization.StringSerializer"
  value.serializer: "io.confluent.kafka.serializers.protobuf.KafkaProtobufSerializer"
  schema.registry.url: "https://schema-registry:8081"

# Batch processing with Avro (Spark)
spark_avro_config:
  spark.sql.avro.compression.codec: "snappy"
  spark.sql.avro.schema.literal: "{\"type\":\"record\",\"name\":\"Order\",...}"  # Or use schema registry
```

### CI/CD Schema Governance

```yaml
# GitHub Action: validate schema compatibility on PR
schema_validation:
  name: "Validate Schema Change"
  steps:
    - "Extract new schema version from PR diff"
    - "Register in schema registry with compatibility check only (dry-run)"
    - "Validate: compatibility_mode = BACKWARD"
    - "If compatible: merge PR, register new schema version"
    - "If breaking: reject PR, notify producer + consumer owners"
  
  compatibility_rules:
    BACKWARD:
      - "New schema can read data written with old schema"
      - "Allowed: adding optional fields, removing default fields"
      - "Breaking: removing required fields, changing field types"
    FORWARD:
      - "Old schema can read data written with new schema"
      - "Allowed: removing fields, adding default fields"
      - "Breaking: adding required fields"
    FULL:
      - "Both backward and forward compatible"
      - "Most restrictive — use for shared datasets"

  # Example: CI check script
  check_schema_compatibility:
    cli: "curl -X POST https://registry:8081/compatibility/subjects/orders-value/versions \
      -H 'Content-Type: application/vnd.schemaregistry.v1+json' \
      -d '{\"schema\": \"$(cat new_schema.avsc | jq -Rs .)\"}'"
```

### Subject Naming Strategy

```yaml
subject_naming:
  pattern: "<domain>.<dataset-name>-<key|value>"
  examples:
    - "orders.order-events-value"
    - "inventory.stock-updates-key"
    - "analytics.user-sessions-value"
  
  record_name_strategy:
    # Confluent default: topic-name-value
    # RecordNameStrategy: uses schema record name
    # TopicRecordNameStrategy: topic-name + record name
    use: "TopicRecordNameStrategy"
    rationale: "Allows multiple record types per topic, better for union types"
```

### Schema Migration Workflow

```yaml
migration_workflow:
  phase_1_propose:
    - "Create new schema version in development branch"
    - "Run compatibility check against latest production version"
    - "Document: what changed, why, expected impact"
    - "Tag with semver change type (MAJOR/MINOR/PATCH)"
  
  phase_2_review:
    - "Notify all topic consumers of upcoming change"
    - "Check consumer compatibility reports"
    - "If BACKWARD compatible: standard review"
    - "If breaking: consumer acceptance required, migration plan needed"
  
  phase_3_deploy:
    - "Register new schema version (not yet default)"
    - "Stage deployment: producers and consumers upgrade gradually"
    - "Phase A: all consumers upgraded to handle new schema (read-compatible)"
    - "Phase B: producers switch to new schema version"
    - "Phase C: old schema deprecated, retention period starts"
  
  phase_4_cleanup:
    - "Archive old schema versions after retention (typically 6 months)"
    - "Remove deprecated field documentation from registry"
    - "Update consumer documentation with new schema details"
```

### Decision Trees

#### Compatibility Mode Selection
```
Consumer deployment flexibility?
├── Consumers can upgrade at any time (same team/org)
│   └── BACKWARD compatibility (default, practical)
├── Consumers on fixed release cycles (out of sync)
│   └── FULL compatibility (both directions)
├── Producers need flexibility to iterate quickly
│   └── FORWARD compatibility (producers can remove fields)
├── Protobuf with wire compatibility
│   └── Use Protobuf built-in compatibility (field numbers never reused)
└── Experimental / dev topics
    └── NONE (no compatibility enforcement, dev only)
```

#### Schema Format Selection
```
Primary use case?
├── Kafka streaming, Confluent ecosystem
│   └── Avro (best tooling, native Confluent support)
├── Cross-language services, gRPC
│   └── Protobuf (fastest, most language bindings)
├── REST APIs, web frontends, NoSQL
│   └── JSON Schema (readable, web-native)
├── Event-driven APIs, AsyncAPI
│   └── JSON Schema with AsyncAPI wrapper
└── Mixed ecosystem
    └── Apicurio (multi-format registry)
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
- Subject naming follows `<domain>.<topic-name>-<key/value>` convention
- Key subjects use FULL compatibility mode
- Use transitive compatibility for critical subjects
- Archive unused schema versions after 2 years
- Document field semantics in schema `doc` attribute
- Test schema changes with shadow consumers before production rollout
- Maintain a schema changelog visible to all consumers
- Use latest schema version in consumers for forward compatibility
- Never reuse field numbers in Protobuf schemas
- Validate schemas in CI/CD before merging PRs

## References
  - references/registry-setup.md — Schema Registry Setup
  - references/schema-evolution.md — Schema Evolution
  - references/schema-governance.md — Schema Governance
  - references/schema-migration-strategies.md — Schema Migration Strategies
  - references/schema-registry-operations.md — Schema Registry Operations Reference
  - references/schema-registry-tools.md — Schema Registry Ecosystem Tools
  - references/schema-registry-evolution.md — Schema Registry Evolution Deep Dive
  - references/schema-registry-integration-patterns.md — Integration Patterns Reference
## Handoff
`data-data-platform` for registry deployment. `data-data-catalog` for schema metadata. `data-data-contracts` for data contract schema integration. `data-data-observability` for schema drift monitoring.
