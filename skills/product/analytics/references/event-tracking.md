# Event Tracking Implementation

## Tracking Architecture

### Client-Side Pipeline
```
User Action → SDK → Validation → Buffer → Batch Send → API Gateway → Stream → Warehouse
                 │                                                    │
                 ▼                                                    ▼
            Local storage                                          Retry queue
```

### Server-Side Pipeline
```
Service Event → SDK → Validate → Enrich → Publish → Stream → Consumer → Warehouse
                            │         │          │
                            ▼         ▼          ▼
                       Schema check  Add context  Kafka/PubSub
```

## Implementation Patterns

### Web (JavaScript)
```javascript
// Initialization
analytics.initialize({
  writeKey: 'YOUR_KEY',
  dataPlane: 'https://api.company.com/events'
});

// Track event
analytics.track('order.completed', {
  order_id: 'ord_123',
  total: 49.99,
  currency: 'USD',
  payment_method: 'credit_card',
  items_count: 3
});

// Identify user
analytics.identify('user_456', {
  email: 'user@example.com',
  plan: 'pro',
  signup_date: '2026-01-15'
});

// Page view (automatic)
analytics.page('Pricing');
```

### Mobile (iOS/Swift)
```swift
Analytics.shared.track(
    name: "subscription.started",
    properties: [
        "plan": "monthly",
        "price": 9.99,
        "currency": "USD",
        "trial": false
    ]
)
```

### Server-Side (Python)
```python
from analytics import Client

analytics = Client(write_key='YOUR_KEY')

def on_order_created(order):
    analytics.track(
        user_id=order.user_id,
        event='order.created',
        properties={
            'order_id': order.id,
            'total': order.total,
            'items': len(order.items),
            'source': 'web'
        },
        context={
            'ip': request.remote_addr,
            'user_agent': request.user_agent
        }
    )
```

## Event Enrichment

### Server-Side Enrichment
```python
def enrich_event(event):
    enriched = event.copy()
    enriched["user_tier"] = get_user_tier(event["user_id"])
    enriched["geo"] = geo_lookup(event["ip"])
    enriched["device"] = parse_user_agent(event["user_agent"])
    enriched["session_number"] = get_session_number(event["user_id"])
    enriched["timestamp_normalized"] = normalize_timestamp(event["timestamp"])
    return enriched
```

## Data Quality

### Validation Rules
```yaml
validation:
  - rule: "required_properties"
    check: "All required properties present per event type"
    action: "Drop and alert"
  
  - rule: "data_types"
    check: "Properties match schema (string, number, boolean)"
    action: "Coerce or drop"
  
  - rule: "valid_timestamps"
    check: "Timestamp within 5 minutes of ingestion time"
    action: "Drop if >1 hour off"
  
  - rule: "unique_ids"
    check: "Event IDs are unique"
    action: "Deduplicate"
```

### Monitoring Dashboard
```python
daily_metrics = {
    "event_volume": 15000000,     # 15M events
    "unique_users": 250000,
    "error_rate": 0.002,          # 0.2% of events
    "avg_batch_size": 42,
    "p95_latency_ms": 350,
    "schema_violations": 150,
    "top_events": ["page_viewed", "button_clicked", "order.completed"],
}
```

## Privacy Compliance

### PII Handling
```yaml
rules:
  - Never send raw PII to analytics (email, phone, SSN)
  - Use hashed or anonymized identifiers
  - IP addresses: anonymize last octet
  - User properties: only product-relevant data
  - Consent: respect opt-out flags
  - Retention: auto-delete events older than 26 months (GDPR)
```

### Consent Management
```javascript
// Respect user consent
if (analytics.canTrack()) {
  analytics.track('feature.used', { feature: 'search' });
}

// GDPR right to deletion
analytics.delete(user_id, 'user_456');
```

## Event Pipeline Cost

| Volume | Monthly Events | Cost/Month | Services |
|--------|---------------|------------|----------|
| Small | 1M | ~$50 | Segment + BigQuery |
| Medium | 50M | ~$500 | Snowflake + dbt |
| Large | 500M | ~$3000 | Kafka + ClickHouse |
| Enterprise | 5B+ | ~$20000 | Custom pipeline |
