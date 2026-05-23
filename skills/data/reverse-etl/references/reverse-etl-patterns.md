# Reverse ETL Patterns

## Sync Model Architecture

Reverse ETL follows a three-stage pipeline:

```
Warehouse SQL -> Identity Resolution -> Destination API Sync
```

### Stage 1: Source Query

The source query extracts data from the warehouse. Two primary modes:

**Incremental Sync** — uses a watermark column (`updated_at`, `modified_at`) to fetch only changed rows since the last sync. Requires a monotonically increasing timestamp column on the source table.

```sql
-- Incremental pattern with watermark table
SELECT
    id,
    email,
    name,
    properties,
    updated_at
FROM analytics.customers
WHERE updated_at > (
    SELECT COALESCE(MAX(completed_at), '1970-01-01')
    FROM sync_watermarks
    WHERE sync_name = 'customers_to_hubspot'
)
```

**Full Refresh** — truncates and reloads the entire result set. Used only for reference data under 10,000 rows.

```sql
-- Full refresh for small reference tables
SELECT
    product_id,
    sku,
    title,
    price,
    category
FROM catalog.products
WHERE is_active = TRUE
```

### Stage 2: Identity Resolution

Mapping warehouse rows to destination objects requires a stable identity key. Strategies:

1. **External ID field** — a custom field on the destination object that stores the warehouse primary key. The most reliable method.
2. **Email matching** — natural for contact/user objects but fails when emails change.
3. **Custom ID mapping table** — a warehouse table mapping source IDs to destination IDs:

```sql
CREATE TABLE sync.id_mappings (
    sync_name STRING,
    source_id STRING,
    destination_id STRING,
    matched_at TIMESTAMP,
    PRIMARY KEY (sync_name, source_id)
);
```

### Stage 3: Destination Sync

Destinations accept data via their REST APIs. Key considerations:

- **Batch size**: Most APIs accept 100-1000 records per batch
- **Rate limits**: API-specific limits require throttling
- **Idempotency key**: Use an idempotency header to prevent duplicate processing

```json
{
    "idempotency_key": "sync_customers_20260515T143000_sha256hash",
    "records": [
        {"external_id": "123", "email": "alice@example.com", "name": "Alice"}
    ]
}
```

## Rate Limiting Strategies

```python
import time
import requests
from functools import wraps

def api_rate_limiter(max_per_minute: int):
    """Decorator to enforce per-minute API rate limits."""
    window = 60.0
    quota = max_per_minute
    tokens = quota
    last_refill = time.time()

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal tokens, last_refill
            now = time.time()
            elapsed = now - last_refill
            tokens = min(quota, tokens + elapsed * (quota / window))
            last_refill = now

            if tokens < 1:
                sleep_time = (1 - tokens) * (window / quota)
                time.sleep(sleep_time)
                tokens = 0

            tokens -= 1
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

## Error Handling and Retry

| Error Code | Meaning | Action | Retry Strategy |
|---|---|---|---|
| 429 | Rate limited | Exponential backoff | Retry up to 5x |
| 500 | Server error | Exponential backoff | Retry up to 3x |
| 400 | Bad request | Skip record, log error | Do not retry |
| 404 | Object not found | Attempt create instead of update | Retry once |
| 409 | Conflict | Re-read and retry | Retry with fresh data |

## Monitoring

```sql
CREATE TABLE sync_monitoring (
    sync_name STRING,
    sync_start TIMESTAMP,
    sync_end TIMESTAMP,
    rows_attempted INT,
    rows_succeeded INT,
    rows_failed INT,
    status STRING,  -- success, partial, failed
    error_details ARRAY<STRING>,
    batch_signature STRING
);

-- Daily sync health check
SELECT
    DATE(sync_start) AS day,
    sync_name,
    COUNT(*) AS runs,
    AVG(rows_succeeded) AS avg_rows,
    AVG(rows_failed) / NULLIF(AVG(rows_attempted), 0) AS failure_rate,
    MAX(rows_failed) AS max_failures
FROM sync_monitoring
WHERE sync_start >= DATEADD('day', -30, CURRENT_DATE)
GROUP BY 1, 2
HAVING failure_rate > 0.05;
```

## Data Freshness SLA

| Sync | Frequency | Max Age at Destination | Acceptable Delay |
|---|---|---|---|
| Customer profiles | Every 30 min | 30 min | 5 min |
| Audience segments | Daily | 24 hours | 2 hours |
| Product catalog | Hourly | 1 hour | 15 min |
| Inventory levels | Every 5 min | 5 min | 1 min |

## Security Considerations

- Hash PII before sending to ad platforms (SHA-256 required by Google Ads, Facebook)
- Never log raw API request/response bodies that contain PII
- Use OAuth 2.0 or API keys with restricted permissions for each destination
- Rotate API keys automatically every 90 days
- Mask sensitive fields in query results during development

## Performance Optimization

- Materialize sync queries as warehouse tables for complex transformations
- Use incremental sync over full refresh for tables > 10K rows
- Batch API requests to the maximum batch size supported by the destination
- Partition large syncs by a key (e.g., `customer_tier`) and run in parallel
- Set query timeouts to avoid warehouse resource exhaustion
- Use CTEs instead of subqueries for readability and the warehouse optimizer
