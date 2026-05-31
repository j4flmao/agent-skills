# Schema Registry Evolution

## Overview

Schema evolution is the practice of managing changes to data schemas over time without breaking existing producers and consumers. This reference covers compatibility rules, evolution patterns, migration strategies, and operational practices for schema registries using Avro, Protobuf, and JSON Schema.

## Compatibility Rules Deep Dive

### Avro Compatibility

Avro compatibility is checked between the new schema and the latest schema registered under the same subject. The schema registry stores a versioned history of schemas per subject.

#### BACKWARD Compatible

New schema can read data written with the old schema. Consumers using the old schema can process data produced with the new schema.

```avro
// Version 1 (BASE)
{"name": "Order", "fields": [
  {"name": "id", "type": "string"},
  {"name": "total", "type": "double"}
]}

// Version 2 (BACKWARD compatible — added field with default)
{"name": "Order", "fields": [
  {"name": "id", "type": "string"},
  {"name": "total", "type": "double"},
  {"name": "status", "type": "string", "default": "pending"}
]}

// Applies: add field with default, remove field, change default
// Breaks: add field without default, narrow type (double -> int)
```

BACKWARD means old consumer can read new data. New producer writes data with new schema (has `status`). Old consumer reads with old schema — `status` is missing, Avro fills in the default `"pending"`.

#### FORWARD Compatible

New schema can read data written with the old schema. Old consumers using the old schema can process data produced with the new producer.

```avro
// Version 2 (FORWARD compatible — added field, but old schema can ignore it)
// Old consumer (version 1 schema) reads new data
// The new 'tax' field is simply ignored by Avro resolution

// Version 3 (FORWARD breaking — removed field with no default removal)
// FORWARD would break if a consumer using v3 tries to read v2 data
// that had a field v3 no longer knows about
```

FORWARD is useful when consumers upgrade more slowly than producers. A new producer adds fields, old consumers ignore unknown fields with the right configuration.

#### FULL Compatible

Both backward and forward compatible simultaneously.

```avro
// Version 2 (FULL compatible — only additive, optional changes)
{"name": "Order", "fields": [
  {"name": "id", "type": "string"},
  {"name": "total", "type": "double"},
  {"name": "status", "type": "string", "default": "pending"},  // new, has default
  {"name": "notes", "type": ["null", "string"], "default": null}  // new, nullable
]}

// FULL allows: add optional fields, add default to existing
// Breaks: everything else
```

#### NONE (No Compatibility)

Any change is allowed. Use only for development and testing.

### Transitive Compatibility

By default, Confluent Schema Registry checks compatibility against the latest schema version only. Transitive modes check against all previous versions.

| Mode | Checked Against | Use Case |
|---|---|---|
| BACKWARD | Latest | Default, fast check |
| BACKWARD_TRANSITIVE | All previous | Safety for critical schemas |
| FORWARD | Latest | Default forward |
| FORWARD_TRANSITIVE | All previous | Long-lived schemas |
| FULL | Latest | Balanced |
| FULL_TRANSITIVE | All previous | Maximum safety |

```yaml
# Enforce transitive for regulated schemas
subjects:
  orders-value:
    compatibility: BACKWARD_TRANSITIVE
    owner: orders-team
```

### Protobuf Compatibility

Protobuf compatibility is based on wire format rules, checked by tools like Buf.

```protobuf
// Version 1
message Order {
  string order_id = 1;
  double total = 2;
}

// Wire-compatible changes:
// - Add field with new number (old code ignores unknown)
// - Remove field (old number becomes reserved/unknown)
// - Add enum values
// - Add optional field (proto3)

// Wire-incompatible (BREAKING):
// - Rename field (wire format uses numbers, not names — actually wire-compatible but source-breaking)
// - Change field type (double -> int breaks wire format)
// - Reuse field number for different type
// - Remove reserved field

// NOTE: Buf distinguishes between:
// - WIRE_COMPATIBLE: message can be parsed
// - SOURCE_COMPATIBLE: code can compile

// Best practice: use reserved for deleted fields
message Order {
  reserved 3, 4, 10 to 20;
  reserved "legacy_flag", "old_field";
  string order_id = 1;
  double total = 2;
  string status = 5;  // new field
}
```

### JSON Schema Compatibility

JSON Schema compatibility is typically application-level rather than registry-checked. Confluent SR supports JSON Schema with limited compatibility checks.

```json
// Version 1
{"type": "object", "properties": {
  "order_id": {"type": "string"},
  "total": {"type": "number"}
}, "required": ["order_id"]}

// BACKWARD compatible: add optional property
{"type": "object", "properties": {
  "order_id": {"type": "string"},
  "total": {"type": "number"},
  "status": {"type": "string"}  // new, optional (not in required array)
}, "required": ["order_id"]}

// Breaking: add to required
// Breaking: narrow type (number -> integer)
// Breaking: add enum constraint to existing field
```

## Schema Evolution Patterns

### Additive Evolution (Minor Version)

```yaml
version: "1.1.0"
changes:
  - type: add_field
    field: discount
    type: ["null", "double"]
    default: null
    justification: "New promotion feature needs discount field"
```

#### Steps:
1. Define new field with default value
2. Register schema with compatibility check
3. Deploy producers (start writing new field)
4. Deploy consumers (start reading new field)
5. Monitor for compatibility errors

### Deprecation then Removal (Major Version)

```yaml
version: "2.0.0"
changes:
  - type: deprecate
    field: legacy_payment_type
    replacement: payment_method
    deprecation_notice: "Removed in v2.0.0"
  - type: remove_field
    field: legacy_payment_type
```

#### Timeline:
1. Add new field (`payment_method`) alongside old field
2. Migrate all producers to write both fields
3. Mark old field as deprecated with `@deprecated` doc
4. Notify all consumers of upcoming removal
5. Migrate consumers to read new field
6. After migration confirmed, remove old field
7. Register new schema version (MAJOR bump)

### Type Widening (Minor/Major Depending)

```yaml
changes:
  - type: widen_type
    field: total
    from: FLOAT
    to: DOUBLE
    compatibility: SAFE  # float fits in double
```

Safe widenings: INT → LONG, FLOAT → DOUBLE, INT → DOUBLE, STRING with format change for descriptions.
Unsafe: DOUBLE → FLOAT, LONG → INT, STRING → INT.

## Schema Migration Strategies

### Blue-Green Schema Deployment

```yaml
# Phase 1: Green schema deployed alongside Blue
# Producers write both formats (dual write)
# Consumers read either format

# Phase 2: All consumers migrated to Green
# Blue schema deprecated

# Phase 3: Blue schema removed
# Only Green schema remains
```

Implementation with Avro:

```java
// Dual-write producer
public void produceOrder(OrderV1 v1, OrderV2 v2) {
    // Write with old schema (existing consumers)
    kafkaTemplate.send("orders", key, serializeAvro(schemaV1, v1));
    // Write with new schema (migrated consumers)
    kafkaTemplate.send("orders", key, serializeAvro(schemaV2, v2));
}
```

### Schema Registry Subject Strategies

Confluent Schema Registry offers subject name strategies:

| Strategy | Subject Name | Use Case |
|---|---|---|
| TopicNameStrategy | `<topic>-key`, `<topic>-value` | Default, one schema per topic part |
| RecordNameStrategy | `<full-record-name>` | Multiple schemas per topic |
| TopicRecordNameStrategy | `<topic>-<record-name>` | Multiple schemas, scoped to topic |

```java
// RecordNameStrategy: use when a topic has multiple event types
props.put(KafkaAvroSerializerConfig.VALUE_SUBJECT_NAME_STRATEGY,
    "io.confluent.kafka.serializers.subject.RecordNameStrategy");

// Schemas registered as:
// - com.org.data.orders.OrderCreatedEvent
// - com.org.data.orders.OrderCancelledEvent
// Both can be in the same topic with different subjects
```

## Schema Registry REST API

### Key API Endpoints

```bash
# Register schema
curl -X POST http://schema-registry:8081/subjects/orders-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"}]}"}'

# Check compatibility
curl -X POST http://schema-registry:8081/compatibility/subjects/orders-value/versions/latest \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"total\",\"type\":\"double\",\"default\":0}]}"}'

# Get schema versions
curl http://schema-registry:8081/subjects/orders-value/versions

# Get specific version
curl http://schema-registry:8081/subjects/orders-value/versions/2

# Delete subject (soft delete)
curl -X DELETE http://schema-registry:8081/subjects/orders-value

# Hard delete (permanent)
curl -X DELETE http://schema-registry:8081/subjects/orders-value?permanent=true
```

### Schema Evolution Check Script

```python
import requests
import json

def check_schema_compatibility(registry_url, subject, new_schema, mode="BACKWARD"):
    """Check if a new schema is compatible with registered schemas."""
    url = f"{registry_url}/compatibility/subjects/{subject}/versions/latest"
    payload = {"schema": json.dumps(new_schema)}
    headers = {"Content-Type": "application/vnd.schemaregistry.v1+json"}

    resp = requests.post(url, json=payload, headers=headers)
    resp.raise_for_status()
    result = resp.json()

    if not result.get("is_compatible", False):
        print(f"COMPATIBILITY BREAKING: {subject} ({mode})")
        print(f"Reasons: {result.get('messages', 'Unknown')}")
        return False

    print(f"Compatible: {subject} ({mode})")
    return True


def register_schema(registry_url, subject, schema):
    """Register a new schema version."""
    url = f"{registry_url}/subjects/{subject}/versions"
    payload = {"schema": json.dumps(schema)}
    headers = {"Content-Type": "application/vnd.schemaregistry.v1+json"}

    resp = requests.post(url, json=payload, headers=headers)
    resp.raise_for_status()
    result = resp.json()
    return result["id"], result["version"]
```

## Multi-Region Schema Registry

### Active-Active Registry Setup

```yaml
# Schema Registry in region 1
SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: PLAINTEXT://regional-kafka-1:9092
SCHEMA_REGISTRY_MODE: read_write

# Schema Registry in region 2
SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: PLAINTEXT://regional-kafka-2:9092
SCHEMA_REGISTRY_MODE: read_write

# Schema replication via Confluent Multi-Region Cluster
# Schema topic "_schemas" replicated across regions with MirrorMaker 2.0
```

### Schema Registry HA with Load Balancer

```yaml
# Deploy 3 schema registry instances behind a load balancer
deployment:
  replicas: 3
  strategy: rolling-update

  config:
    KAFKASTORE_TOPIC_REPLICATION_FACTOR: 3
    KAFKASTORE_TOPIC_MIN_IN_SYNC_REPLICAS: 2
```

## Schema Governance Automation

### Policy-as-Code

```python
# Custom schema governance policies
def validate_schema_change(subject, old_schema, new_schema, compatibility_mode):
    violations = []

    # Policy 1: Critical fields must never be removed
    critical_fields = get_critical_fields(subject)
    for field in critical_fields:
        if field in old_schema.fields and field not in new_schema.fields:
            violations.append(f"CRITICAL: Field '{field}' is protected and cannot be removed")

    # Policy 2: PII fields must have classification
    for field in new_schema.fields:
        if is_likely_pii(field.name) and not field.metadata.get("pii_classification"):
            violations.append(f"PII: Field '{field.name}' appears to contain PII but has no classification")

    # Policy 3: MAJOR changes require consumer acknowledgment
    if is_breaking_change(old_schema, new_schema):
        consumers = get_subject_consumers(subject)
        acknowledged = all(c.get("acknowledged_major") for c in consumers)
        if not acknowledged:
            violations.append("GOVERNANCE: Breaking change requires acknowledgment from all consumers")

    return violations
```

### Breaking Change Notification

```python
def notify_breaking_change(subject, old_version, new_version, affected_consumers):
    message = {
        "subject": subject,
        "old_version": old_version,
        "new_version": new_version,
        "type": "BREAKING_CHANGE",
        "summary": get_schema_diff_summary(old_version, new_version),
        "affected_consumers": affected_consumers,
        "acknowledgment_deadline": (datetime.utcnow() + timedelta(days=14)).isoformat(),
    }

    for consumer in affected_consumers:
        send_slack_notification(
            consumer.slack_channel,
            f"Breaking schema change for {subject}. "
            f"Acknowledge by {message['acknowledgment_deadline']}: "
            f"{consumer.ack_url}"
        )

    store_governance_event(message)
```

## Performance Optimization

### Client-Side Caching

```java
// Schema registry client caches schemas by default
// Configuration for cache behavior:
props.put(KafkaAvroDeserializerConfig.SCHEMA_REGISTRY_URL_CONFIG, "http://schema-registry:8081");
props.put(AbstractKafkaAvroSerDeConfig.MAX_SCHEMAS_PER_SUBJECT, 1000);
props.put(AbstractKafkaAvroSerDeConfig.ID_CACHE_CAPACITY, 10000);
props.put(AbstractKafkaAvroSerDeConfig.LATEST_CACHE_TTL_SEC, 60);  // how often to check for latest
```

### Reducing Schema Registry Calls

```java
// Use USE_LATEST_VERSION to avoid fetching schema for every message
// Producer caches schema ID after first serialize
props.put(KafkaAvroSerializerConfig.USE_LATEST_VERSION, "true");

// Batch schema fetch for high-throughput topics
props.put(KafkaAvroSerializerConfig.AUTO_REGISTER_SCHEMAS, "false");
// Ensure schema is pre-registered before producer starts
```

## Common Evolution Scenarios

| Scenario | Schema Change | Compatibility Mode | Action |
|---|---|---|---|
| Add optional field | Add field with default | BACKWARD | Register new version, deploy consumers |
| Remove unused field | Delete field | BACKWARD (backward only) | Check no consumer reads it, then remove |
| Rename field | Add new, deprecate old, remove old | BACKWARD | Multi-step migration |
| Split field | Add two new fields, deprecate original | BACKWARD | Multi-step migration |
| Merge fields | Add merged field, deprecate originals | BACKWARD | Multi-step migration |
| Change type (safe) | INT to LONG | BACKWARD | Direct change |
| Change type (unsafe) | DOUBLE to INT | BREAKING | New field name, migrate |
| Add enum symbol | New symbol | BACKWARD | Direct addition |
| Remove enum symbol | Delete symbol | BREAKING | New field name approach |

## References

- Schema Registry Setup
- Schema Governance framework
- Schema Migration Strategies
- Schema Registry Operations Reference
- Schema Registry Ecosystem Tools
- Avro specification and best practices
- Protobuf wire format and evolution rules
- Buf breaking change detection
