# Event Notification Patterns

## Event Notification vs Event Carried State Transfer

### Event Notification
```
OrderPlaced: { orderId, customerId }
→ Consumer calls order service to get details
→ More round trips, but consumer always has fresh data
```

### Event Carried State Transfer
```
OrderPlaced: { orderId, customerId, items[], total, shippingAddress }
→ Consumer has all data it needs
→ No additional round trips, but data may be stale
```

## When to Use Each

| Pattern | Use When |
|---------|----------|
| Event Notification | Data changes frequently, consumer needs latest |
| Event Carried State Transfer | Consumer needs data immediately, stale data acceptable |
| Hybrid | Include frequently-needed fields, leave rarely-needed as reference |

## Event Enrichment

Decide what data to include in events:

- Fields the consumer ALWAYS needs → include in payload.
- Fields the consumer SOMETIMES needs → reference ID, consumer fetches on demand.
- Fields that change rarely → include in payload (cache at consumer).
- Large payloads (>100KB) → store in blob storage, include URL in event.

## Fan-Out Patterns

### Topic-Based Fan-Out
```
OrderPlaced Topic
  ├── Notification Service (email receipt)
  ├── Analytics Service (record conversion)
  ├── Inventory Service (reserve stock)
  └── Shipping Service (prepare label)
```

### Selective Fan-Out (routing)
```typescript
const routing = {
  'OrderPlaced': ['notification', 'analytics', 'inventory', 'shipping'],
  'PaymentReceived': ['notification', 'order'],
  'OrderShipped': ['notification', 'analytics'],
};
```

## Content-Based Routing

Route events based on their content:

```typescript
function routeEvent(event: Event): string[] {
  if (event.type === 'OrderPlaced' && event.data.total > 10000) {
    return ['approval-queue', 'analytics-queue'];
  }
  return ['standard-processing-queue'];
}
```
