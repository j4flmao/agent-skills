# Event Versioning

## Schema Evolution

Events are immutable. Once written, they cannot be changed. Schema evolution is handled by versioning.

### Version Number Strategy

Each event type carries a version number in its schema:

```json
{
  "eventType": "OrderPlaced",
  "eventVersion": 2,
  "data": { "orderId": "...", "customerId": "...", "items": [...] }
}
```

### Backward Compatibility Rules

1. **Adding fields**: Always backward-compatible. New field gets a default value.
2. **Removing fields**: NEVER remove — creates forward-compatibility issues.
3. **Renaming fields**: Add new field, deprecate old, remove after all consumers migrated.
4. **Changing field type**: Create a new version. Old consumers ignore unknown versions.

### Example: Evolving an Event Schema

```
Version 1: { "customerName": "John" }
Version 2: { "customerName": "John", "customerEmail": "john@example.com" }
Version 3: { "customerName": "John", "customerEmail": "john@example.com", "customerId": "uuid" }
```

At version 3, consumers that still read version 1 get partial data. New fields are null/undefined.

## Upcasting

When the schema changes incompatibly, write an upcaster:

```typescript
// Converts v1 events to v2 format
function upcastV1ToV2(event: Event): Event {
  if (event.eventVersion === 1) {
    return {
      ...event,
      eventVersion: 2,
      data: { ...event.data, customerEmail: null }
    };
  }
  return event;
}
```

Upcasters are applied when loading events, before passing to the aggregate.

## Consumer Compatibility

| Consumer version | Handles events version |
|-----------------|----------------------|
| v1 | v1 only |
| v2 | v1, v2 |
| v3 | v1, v2, v3 |

Consumers should tolerate unknown fields and default null values for missing fields.

## Event Migration

When you need to restructure events fundamentally:
1. Write a migration that reads old events and writes new ones.
2. The migration is itself an event (MigrationApplied).
3. Update snapshots to use the new event format.
4. Deprecate old event types after all consumers migrate.

## Best Practices

- All events carry a version number from day one.
- Never delete old event versions from the store.
- Test upcasters with unit tests covering every version transition.
- Document every schema change with a changelog.
- Consumers log a warning when processing an event version they were not designed for.
