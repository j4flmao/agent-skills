# Message Schema Design

## Envelope Schema
Every message uses a consistent envelope. This decouples routing metadata from business data.

```json
{
  "id": "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "UserCreated",
  "version": 1,
  "timestamp": "2026-05-18T10:00:00.000Z",
  "producer": "user-service",
  "source": "user-service/v1.2.3",
  "key": "user_abc123",
  "partitionKey": "abc123",
  "correlationId": "req_xyz789",
  "data": {},
  "metadata": {}
}
```

### Field Semantics
| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique event ID (UUID v7 recommended for time-ordering) |
| `type` | Yes | PascalCase event name, past tense: `UserCreated`, `OrderShipped` |
| `version` | Yes | Integer schema version for evolution |
| `timestamp` | Yes | ISO 8601 UTC when the event occurred |
| `producer` | Yes | Service name that produced the event |
| `source` | Recommended | Service + version for debugging |
| `key` | Yes | Partition key for ordering (same entity → same partition) |
| `partitionKey` | Optional | Explicit partition routing (defaults to key) |
| `correlationId` | Recommended | Trace across services |
| `data` | Yes | Business payload |
| `metadata` | Optional | Non-business metadata (audit, trace context) |

## Schema Versioning

### Forward Compatibility Rules
- Never remove fields. Mark as `deprecated` instead.
- New fields must be optional or have sensible defaults.
- Never change the type of an existing field.
- Never change the semantic meaning of an existing field.
- Use `oneof` / `union` for mutually exclusive data shapes.

### Version Strategy
```
v1: { name, email }
v2: { name, email, phone? }         ← added optional field
v3: { name, email, phone?, address? } ← another optional field
v4: { name, email, phone?, address? } ← name removed? NO. Deprecate, don't remove.

Consumers handle multiple versions:
  if (event.version >= 2) { /* use phone */ }
  if (event.version >= 3) { /* use address */ }
```

## Common Event Types

### Entity Events (CRUD)
```
UserCreated      → { user_id, name, email, role }
UserUpdated      → { user_id, changes: { field: old_value } }
UserDeleted      → { user_id, reason? }
UserSuspended    → { user_id, reason, suspended_by }
```

### Domain Events
```
OrderPlaced      → { order_id, customer_id, items, total }
OrderShipped     → { order_id, tracking_number, carrier }
PaymentProcessed → { payment_id, order_id, amount, status }
InvoiceGenerated → { invoice_id, order_id, amount, due_date }
```

### System Events
```
ServiceStarted   → { service_name, version, instance_id }
ServiceDegraded  → { service_name, component, issue }
ConfigChanged    → { config_key, old_value, new_value }
DeploymentCompleted → { service_name, version, environment }
```

## Naming Conventions
```
Event names:    PascalCase, past tense: UserCreated, OrderShipped, PaymentFailed
Field names:    snake_case: user_id, created_at, tracking_number
Enum values:    UPPER_SNAKE_CASE: ORDER_STATUS_PENDING, ORDER_STATUS_SHIPPED
Topic/queue:    dot-separated: user.events.v1, order.commands.v1
```

## Large Message Handling
```
Problem: message > broker limits (Kafka: 1MB default, SQS: 256KB)
Solution: Claim check pattern

1. Store payload in external store (S3, GCS, DB)
2. Send message with reference
   { "id": "...", "type": "FileProcessed", "claimCheck": "s3://bucket/key" }
3. Consumer fetches payload from external store
```

## Schema Registry Integration
```
Use Confluent Schema Registry (or equivalent) for:
  - Schema storage and retrieval
  - Compatibility validation (FORWARD, BACKWARD, FULL)
  - Wire format with schema ID (avro/protobuf)
  - CI pipeline checks for breaking changes

Compatibility levels:
  BACKWARD:    new schema can read old data (default)
  FORWARD:     old schema can read new data
  FULL:        both backward and forward compatible
  NONE:        no checks (not recommended)
```
