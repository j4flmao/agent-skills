# Schema Evolution

## Compatibility Modes

### BACKWARD (Default)

New schema can read data written with old schema. Old consumers can process new data (if old fields preserved).

```
V1: { "name": "order_id", "type": "string" }
V2: { "name": "order_id", "type": "string" },
    { "name": "currency", "type": "string", "default": "USD" }
→ Allows: V1 consumer reads V2 data (currency has default)
→ Allows: V2 producer writes, V1 consumer reads
→ V1 data readable by V2 (order_id present in both)
```

**Allowed changes:**
- Add optional field (with default)
- Remove field (backward: deletes are safe, old consumers see new data)
- Widen type (int → long, float → double)
- Add enum symbol (at end)

### FORWARD

Old schema can read data written with new schema.

```
V1: { "name": "order_id", "type": "string" }
V2: { "name": "order_id", "type": "string" }
    { "name": "order_id_old", "type": ["string", "null"], "default": null }
→ Forward: V1 consumer reads V2 data (order_id_old can be ignored)
→ Use: when V2 wants to rename order_id → order_id_old, forward ensures V1 still reads
```

**Allowed changes:**
- Add field (forward: new producer writes extra field, old consumer ignores)
- Remove optional field
- Narrow type (double → float)

### FULL

Both backward and forward compatible simultaneously.

```
V1: { "name": "order_id", "type": "string" }
V2: { "name": "order_id", "type": "string" },
    { "name": "currency", "type": ["string", "null"], "default": null }
→ V1 → V2: backward (currency has default)
→ V2 → V1: forward (currency can be dropped as optional)
→ Most restrictive: only add/remove optional fields
```

### NONE

Any change allowed. No compatibility guarantee. Dev/test only.

## Avro Schema Evolution

### Adding a Field (Backward-Safe)

```avro
// V1
{"name": "email", "type": "string"}

// V2 (backward-safe)
{"name": "email", "type": "string", "default": "unknown@org.com"}
// V1 data → V2 reads: email = "unknown@org.com" (default applied)
```

### Removing a Field

```avro
// V1
{"name": "legacy_field", "type": "string"}

// V2 (removed — backward safe with BACKWARD mode)
// Field just deleted from schema
// V2 data → V1 reads: V1 will fail if field is required
// Solution: use BACKWARD mode (old consumer reads new data = field no longer present)
```

### Type Widening

```avro
// V1
{"name": "count", "type": "int"}

// V2 (compatible widening)
{"name": "count", "type": "long"}
// int → long: allowed (all int values fit in long)
// long → int: NOT allowed
```

### Enum Evolution

```avro
// V1
{"type": "enum", "name": "Status", "symbols": ["PENDING", "CONFIRMED"]}

// V2 (backward-safe: append)
{"type": "enum", "name": "Status", "symbols": ["PENDING", "CONFIRMED", "SHIPPED"]}

// V3 (breaking: remove or reorder)
{"type": "enum", "name": "Status", "symbols": ["PENDING", "SHIPPED"]}
// REMOVED CONFIRMED → existing data with CONFIRMED fails to deserialize
```

## Protobuf vs Avro

| Aspect | Avro | Protobuf |
|---|---|---|
| **Schema evolution** | Field-level defaults, type widening/deletion | Field numbers, reserved keywords, explicit defaults |
| **Forward/backward** | Native with `default` | Via field numbers and `optional` |
| **Performance** | Faster write, slower read with schema resolution | Faster read, less CPU overhead |
| **Tooling** | Confluent Schema Registry, Java-centric | Protoc, grpc-gateway, multi-language |
| **Binary format** | Self-describing (schema + data) | Schema required (field numbers only) |

### Protobuf Evolution

```protobuf
// V1
message Order {
  string order_id = 1;
  double total_amount = 2;
}

// V2 (backward + forward compatible)
message Order {
  string order_id = 1;
  double total_amount = 2;
  string currency = 3;           // new field
  reserved 4;                     // reserved field number
  reserved "legacy_code";         // reserved field name
}

// Rules:
// - Never change field number
// - Use reserved for deleted fields
// - New fields use new numbers
// - optional/oneof for optional data
```

## Evolution Best Practices

| Practice | Rationale |
|---|---|
| **Default for every new field** | Ensures backward compatibility |
| **Never delete required fields** | Breaking change — use optional with deprecation |
| **Reserve deleted field numbers (Protobuf)** | Prevents accidental reuse |
| **Append enum symbols at end only** | Removing or reordering is breaking |
| **Prefer union/optional for optional fields** | Clear semantics vs null/default |
| **Publish schema evolution policy** | All teams follow same rules |
| **Test compatibility in CI** | Catch breaking changes before production |
