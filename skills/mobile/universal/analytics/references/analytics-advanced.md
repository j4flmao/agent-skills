# Advanced Analytics Patterns

## Custom Analytics Provider

When third-party providers don't meet requirements (air-gapped environments, full data sovereignty, cost), implement a custom analytics server.

### Architecture
```
Mobile App -> Event Queue -> HTTP POST /events -> Validation Proxy -> Kafka/Stream -> ClickHouse/BigQuery -> Dashboard (Grafana/Metabase)
```

### Server Endpoint Design
```
POST /api/v1/events
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "events": [
    {
      "event": "cart_add_item",
      "timestamp": "2026-06-01T12:00:00Z",
      "user_id": "user_123",
      "session_id": "sess_456",
      "properties": {
        "product_id": "prod_789",
        "price": 29.99,
        "currency": "USD"
      },
      "context": {
        "app_version": "1.2.3",
        "os": "android",
        "os_version": "14",
        "device": "Pixel 8",
        "locale": "en-US"
      }
    }
  ]
}
```

### Schema Validation
```json
{
  "cart_add_item": {
    "required_properties": ["product_id", "price", "currency"],
    "property_types": {
      "product_id": "string",
      "price": "number",
      "currency": "string"
    },
    "max_properties": 25,
    "max_property_value_length": 100
  }
}
```

## Real-Time Analytics Pipeline

For use cases requiring sub-second event visibility (live dashboards, fraud detection, personalization):

1. **Ingestion** — Mobile app sends events to CDN edge (Cloudflare Workers, Fastly)
2. **Stream processing** — Apache Kafka / AWS Kinesis / GCP PubSub
3. **Real-time aggregation** — Apache Flink / Kafka Streams (windowed counts, sessionization)
4. **Storage** — ClickHouse (real-time OLAP) + S3 (cold storage)
5. **Query** — Materialized views for common dashboards, raw SQL for ad-hoc

### Retention vs. Real-Time
| Need | Approach |
|------|----------|
| Historical analysis (7+ days) | Batch export to warehouse |
| Real-time dashboards (<10s delay) | Stream processing + OLAP |
| Per-user personalization | Stream + KV store (Redis) |
| Funnel analysis | Windowed aggregation (30min-24h slots) |

## Data Warehouse Export

Export analytics data to a warehouse for cross-referencing with business data:

**Firebase to BigQuery**: automatic streaming export (enable in Firebase console). Schema: `events_YYYYMMDD` tables with nested `event_params` column.

**Mixplain to Snowflake**: warehouse sync connector. Syncs user profiles, events, and cohorts.

**Amplitude to Redshift/Snowflake**: Amplitude Data with reverse ETL or direct warehouse sync.

**Custom pipeline**: mobile -> Kafka -> Flink transform -> Parquet on S3 -> Athena/Trino query.

## Event Schema Management

### Tracking Plan Definition
```yaml
# tracking_plan.yaml
version: "2.0"
events:
  cart_add_item:
    description: "User adds item to shopping cart"
    owner: "checkout-team"
    properties:
      product_id: { type: string, required: true }
      price: { type: number, required: true, min: 0 }
      currency: { type: string, required: true, pattern: "^[A-Z]{3}$" }
      quantity: { type: integer, required: false, default: 1 }
    privacy: { pii: false }
    groups: [ecommerce, funnel]
```

### Schema Drift Prevention
- CI step validates event payload against tracking plan
- Breaking changes require tracking plan version bump
- Deprecated events get `deprecated: true` in tracking plan
- Automated PR review checks analytics changes
- Quarterly tracking plan audit reviewing all fired events

## A/B Test & Experiment Integration

### Feature Flag Abstraction
```typescript
interface ExperimentService {
  getVariant(experimentKey: string): string;
  trackExposure(experimentKey: string, variant: string): void;
}

class MixpanelExperimentService implements ExperimentService {
  getVariant(key: string): string {
    return mixpanel.getGroup("experiment", key);
  }
  trackExposure(key: string, variant: string): void {
    mixpanel.track("experiment_exposure", { experiment_id: key, variant });
  }
}
```

### Statistical Rigor
- Minimum sample size calculator before launch
- Run tests to 95% statistical significance
- Monitor across segments (iOS vs Android, new vs returning)
- Guardrail metrics to detect negative side effects
- Sequential testing (Peeking) rather than fixed-horizon

## Data Quality Automation

### Daily Data Quality Checks
```sql
-- Check event count anomalies
SELECT event_name, count, avg_7day
FROM (
  SELECT
    event_name,
    COUNT(*) as count,
    AVG(COUNT(*)) OVER (PARTITION BY event_name ORDER BY date ROWS 7 PRECEDING) as avg_7day
  FROM events
  WHERE date = CURRENT_DATE
  GROUP BY event_name, date
) WHERE count < avg_7day * 0.5 OR count > avg_7day * 2.0
```

### Alert Thresholds
| Check | Threshold | Action |
|-------|-----------|--------|
| Missing expected events | 0 events for >1h | PagerDuty alert |
| Event volume spike | >5x 7-day average | Slack notification |
| Property null ratio | >10% null for required prop | Fix tracking code |
| Event latency p95 | >5min to dashboard | Investigate pipeline |
| Schema violation rate | >1% rejected | Fix validation or code |
