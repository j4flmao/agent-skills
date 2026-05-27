# Event Schema Management

## Purpose

Event schema management governs the structure, evolution, and compatibility of event messages in event-driven systems. A schema registry stores and validates event schemas, enforces backward/forward compatibility, and prevents breaking changes from propagating to consumers. This covers schema registry setup, Avro/Protobuf/JSON Schema patterns, schema evolution rules, and governance processes.

## Schema Registry

### Why a Schema Registry

- **Contract enforcement**: Producers and consumers agree on event structure
- **Compatibility validation**: Breaking changes are rejected before they reach production
- **Schema discovery**: Consumers can look up schemas by subject and version
- **Serialization optimization**: Binary formats (Avro, Protobuf) use schema IDs in messages, not full schemas
- **Governance**: Schema changes go through compatibility checks and approval workflows

### Architecture

```
Producer → Serialize with Schema ID → Message Broker → Deserialize with Schema ID → Consumer
              ↓                                                                    ↑
          Schema Registry ←─── Register/Validate Schema ───→ Schema Registry
              ↓
         Schema Storage (Kafka, DB, Git)
```

### Schema Registry Setup (Confluent Schema Registry)

```yaml
# docker-compose.yml
services:
  schema-registry:
    image: confluentinc/cp-schema-registry:latest
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: PLAINTEXT://kafka:9092
      SCHEMA_REGISTRY_KAFKASTORE_TOPIC: _schemas
      SCHEMA_REGISTRY_COMPATIBILITY_LEVEL: backward
    ports:
      - "8081:8081"
```

### Schema Subjects

Each event type has a subject in the registry. Subjects follow a naming convention:

```
<topic-name>-value       # For the event value schema
<topic-name>-key         # For the event key schema (optional)
```

Example: `order-events-value`, `user-events-key`

### Client-Side Integration

```typescript
// Avro producer with schema registry
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry'

const registry = new SchemaRegistry({ host: 'http://schema-registry:8081' })
const schema = await registry.register({
  type: 'AVRO',
  schema: JSON.stringify(orderPlacedAvroSchema),
})

await producer.send({
  topic: 'order-events',
  messages: [{
    key: orderId,
    value: await registry.encode(schema.id, orderEvent),
  }],
})
```

## Avro Schema

### Schema Definition

Apache Avro uses JSON to define schemas with rich type support, documentation, and default values.

```json
{
  "type": "record",
  "name": "OrderPlaced",
  "namespace": "com.example.events.order",
  "doc": "Emitted when a customer places an order",
  "fields": [
    { "name": "eventId", "type": "string", "doc": "Unique event identifier (UUID)" },
    { "name": "eventVersion", "type": "int", "doc": "Schema version number" },
    { "name": "occurredAt", "type": "string", "doc": "ISO 8601 timestamp" },
    { "name": "orderId", "type": "string" },
    { "name": "customerId", "type": "string" },
    { "name": "items", "type": {
      "type": "array",
      "items": {
        "type": "record",
        "name": "OrderItem",
        "fields": [
          { "name": "productId", "type": "string" },
          { "name": "productName", "type": "string" },
          { "name": "quantity", "type": "int" },
          { "name": "unitPrice", "type": "double" }
        ]
      }
    }},
    { "name": "totalAmount", "type": "double" },
    { "name": "currency", "type": "string", "default": "USD" },
    { "name": "discountCode", "type": ["null", "string"], "default": null }
  ]
}
```

### Type Mapping

| Avro Type | Logical Type | Language Mapping |
|-----------|-------------|------------------|
| `null` | — | `null` |
| `boolean` | — | `boolean` |
| `int` | — | `int32` |
| `long` | — | `int64` |
| `float` | — | `float32` |
| `double` | — | `float64` |
| `string` | — | `string` |
| `bytes` | — | `byte[]` |
| `int` | `date` | `LocalDate` |
| `long` | `timestamp-millis` | `Instant` |
| `string` | `uuid` | `UUID` |
| Union (`["null", "type"]`) | — | `Optional<T>` |
| `array` | — | `List<T>` |
| `map` | — | `Map<String, V>` |

## Protobuf Schema

### Proto Definition

Protocol Buffers provide schema definition with field numbering, oneof, and strict typing.

```protobuf
syntax = "proto3";
package com.example.events.order;
import "google/protobuf/timestamp.proto";

message OrderPlaced {
  string event_id = 1;
  int32 event_version = 2;
  google.protobuf.Timestamp occurred_at = 3;
  string order_id = 4;
  string customer_id = 5;
  repeated OrderItem items = 6;
  double total_amount = 7;
  string currency = 8;
  optional string discount_code = 9;

  message OrderItem {
    string product_id = 1;
    string product_name = 2;
    int32 quantity = 3;
    double unit_price = 4;
  }
}

message OrderShipped {
  string event_id = 1;
  int32 event_version = 2;
  google.protobuf.Timestamp occurred_at = 3;
  string order_id = 4;
  string tracking_number = 5;
  string carrier = 6;
}
```

### Field Numbering Rules

- Field numbers 1-15 use 1 byte in the wire format — use for frequently occurring fields
- Field numbers 16-2047 use 2 bytes — use for less frequent fields
- Field numbers 19000-19999 are reserved for proto internals
- Never reuse a field number — mark removed fields as `reserved`

```protobuf
message UserCreated {
  reserved 3, 5;            // Removed fields that MUST NOT be reused
  reserved "old_field";     // Removed field name that MUST NOT be reused

  string event_id = 1;
  int32  event_version = 2;
  string user_id = 4;       // Note: 3 is skipped (was old_field)
  string email = 6;
  string name = 7;
}
```

## JSON Schema

### Schema Definition

JSON Schema is the most human-readable format and works without code generation.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OrderPlaced",
  "type": "object",
  "properties": {
    "eventId": { "type": "string", "format": "uuid" },
    "eventVersion": { "type": "integer", "minimum": 1 },
    "occurredAt": { "type": "string", "format": "date-time" },
    "orderId": { "type": "string", "format": "uuid" },
    "customerId": { "type": "string", "format": "uuid" },
    "items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "properties": {
          "productId": { "type": "string", "format": "uuid" },
          "productName": { "type": "string" },
          "quantity": { "type": "integer", "minimum": 1 },
          "unitPrice": { "type": "number", "exclusiveMinimum": 0 }
        },
        "required": ["productId", "productName", "quantity", "unitPrice"]
      }
    },
    "totalAmount": { "type": "number" },
    "currency": { "type": "string", "default": "USD" },
    "discountCode": { "type": "string" }
  },
  "required": ["eventId", "eventVersion", "occurredAt", "orderId", "customerId", "items", "totalAmount"]
}
```

### When to Use Each Format

| Format | Best For | Strengths | Weaknesses |
|--------|----------|-----------|------------|
| Avro | Kafka, big data ecosystems | Schema registry integration, compact binary, evolution features | Not human-readable, Java-centric |
| Protobuf | gRPC, high-throughput microservices | Fast, small wire format, polyglot code gen | Schema in .proto files, not self-describing |
| JSON Schema | REST APIs, serverless, webhooks | Human-readable, no code gen, native to JS/TS | Verbose, slower parsing, larger payload |

## Schema Evolution

### Backward Compatibility

A new schema is backward-compatible if data written with the new schema can be read by consumers using the old schema. This means the new schema can only add optional fields or remove constraints.

**Rules for backward compatibility:**
- New fields must have defaults (Avro) or be optional (Proto `optional` / JSON Schema not in `required`)
- Existing fields cannot be removed — mark as deprecated
- Existing field types cannot change in incompatible ways
- Default values for new fields must satisfy existing consumers

```avro
// V1 (existing)
{ "name": "email", "type": "string" }

// V2 (backward-compatible) — adds optional phone field
{ "name": "email", "type": "string" },
{ "name": "phone", "type": ["null", "string"], "default": null }
```

### Forward Compatibility

A new schema is forward-compatible if data written with the old schema can be read by consumers using the new schema. This protects old producers from new consumers.

**Rules for forward compatibility:**
- New fields in the new schema must have defaults
- Old fields cannot be removed from the new schema
- Old field types cannot change

### Full Compatibility

Both backward and forward compatible. This is the strictest mode and is recommended for production systems.

### Transitive Compatibility

Schemas must be compatible with ALL previous versions, not just the immediate predecessor. This prevents chain-break scenarios.

### Compatibility Level Comparison

| Level | Old Reader, New Writer | New Reader, Old Writer | Use Case |
|-------|----------------------|----------------------|----------|
| `NONE` | May break | May break | Prototypes |
| `BACKWARD` | Safe | May break | Default for most systems |
| `FORWARD` | May break | Safe | Rolling consumer upgrades |
| `FULL` | Safe | Safe | Multi-version consumers |
| `BACKWARD_TRANSITIVE` | Safe with all versions | May break | Long-lived streams |
| `FORWARD_TRANSITIVE` | May break | Safe with all versions | Long-lived streams |
| `FULL_TRANSITIVE` | Safe with all versions | Safe with all versions | Regulated industries |

### Breaking Change Examples

```typescript
// BREAKING: Removing a required field
// V1
{ "name": "email", "type": "string" }
// V2 (removed)
// BREAKS: old consumers accessing event.email will fail

// BREAKING: Adding a required field without default
// V1: { "name": "email", "type": "string" }
// V2: { "name": "email", "type": "string" }, { "name": "phone", "type": "string" }
// BREAKS: old consumers can't provide phone; new consumers require it

// BREAKING: Changing field type incompatibly
// V1: { "name": "price", "type": "double" }
// V2: { "name": "price", "type": "string" }
// BREAKS: different wire format, readers expect double

// SAFE: Adding optional field with default
// V1: { "name": "email", "type": "string" }
// V2: { "name": "email", "type": "string" }, { "name": "phone", "type": ["null", "string"], "default": null }

// SAFE: Renaming a field (add new, deprecate old)
// V1: { "name": "userEmail", "type": "string" }
// V2: { "name": "userEmail", "type": "string" }, { "name": "email", "type": "string", "default": "" }
// Old consumers still see userEmail; new ones use email
```

## Schema Versioning

### Versioning Strategies

#### Independent Event Versioning

Each event type has its own version counter. This is the most common approach.

```json
{
  "eventType": "OrderPlaced",
  "eventVersion": 3,
  "schemaId": 42
}
```

#### Global Schema Version

All events share a single version. Simple but coarse — any event change bumps all versions.

#### Semantic Versioning

Schemas have MAJOR.MINOR.PATCH versions:
- MAJOR: Breaking change (requires coordination)
- MINOR: Backward-compatible addition
- PATCH: Fix or clarification with no wire format change

### Schema Lifecycle

```yaml
stages:
  - draft:      "Development, not yet in production"
  - preview:    "Available for testing, may change"
  - stable:     "Production, versioned, immutable"
  - deprecated: "Still valid but should not be used for new consumers"
  - sunset:     "No longer accepted by registry"
```

### Breaking Change Detection

```typescript
// Automated compatibility check in CI
async function checkCompatibility(subject: string, newSchema: object): Promise<boolean> {
  const response = await fetch(`http://schema-registry:8081/compatibility/subjects/${subject}/versions/latest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.schemaregistry.v1+json' },
    body: JSON.stringify({ schema: JSON.stringify(newSchema) }),
  })
  const { is_compatible } = await response.json()
  return is_compatible
}

// CI pipeline step
async function validateSchemaChange() {
  const isCompatible = await checkCompatibility('order-events-value', newOrderPlacedSchema)
  if (!isCompatible) {
    console.error('Schema change is NOT backward-compatible. Rejecting.')
    process.exit(1)
  }
  console.log('Schema change is compatible. Proceeding.')
}
```

## Schema Governance

### Approval Workflow

```
Author edits schema → PR created → Automated compatibility check → Team review → Merge → Register in schema registry
                                      ↓ fail
                                Fix schema → re-PR
```

### Schema Review Checklist

- [ ] Is the new field optional or has a default value?
- [ ] Are existing field types unchanged?
- [ ] Are removed fields marked as `reserved` or `deprecated`?
- [ ] Does the event name follow the past-tense convention?
- [ ] Are sensitive fields (PII, secrets) excluded from the schema?
- [ ] Are enum values only appended, never removed or reordered?
- [ ] Are field documentation/descriptions updated?
- [ ] Has compatibility been verified against ALL previous versions?

### Enum Evolution Rules

```avro
// Safe enum evolution: only append new values
{ "type": "enum", "name": "OrderStatus", "symbols": ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"] }

// Adding a new value is safe:
{ "type": "enum", "name": "OrderStatus", "symbols": ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] }

// Removing or reordering values BREAKS backward compatibility
```

### Multi-Team Governance

```yaml
# schema-registry-config.yaml
subjects:
  order-events-value:
    owner: order-team
    compatibility: FULL_TRANSITIVE
    approval: required
    notification: slack://#order-events
  payment-events-value:
    owner: payment-team
    compatibility: BACKWARD
    approval: optional
  user-events-value:
    owner: identity-team
    compatibility: BACKWARD_TRANSITIVE
    approval: required
    reviewers: [security-team, identity-team]
```

## Key Points

- Schema registry is the single source of truth for event schemas — producers register, consumers download.
- Use Avro for Kafka ecosystems, Protobuf for gRPC/high-throughput, JSON Schema for REST/webhooks.
- Backward compatibility: new schema writes must be readable by old consumers.
- Forward compatibility: old schema writes must be readable by new consumers.
- Full/transitive compatibility is the safest but strictest mode.
- Never remove required fields — make them optional with defaults first, then deprecate.
- Never change field types incompatibly — add new fields with different names instead.
- Automated compatibility checks in CI prevent breaking changes from reaching production.
- Enum values can only be appended, never removed or reordered.
- Each team owns their event schemas with team-specific governance rules.
