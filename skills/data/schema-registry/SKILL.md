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
