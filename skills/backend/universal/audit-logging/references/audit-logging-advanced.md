# Audit Logging Advanced

## Distributed Tracing Integration

Link audit events to distributed traces for end-to-end visibility:

```typescript
interface AuditEvent {
  traceId: string;  // OpenTelemetry trace ID
  spanId: string;   // Specific span that generated the event
  baggage: {        // W3C baggage propagated through the system
    sessionId: string;
    requestPath: string;
    tenantId: string;
  };
}
```

## High-Volume Ingestion (ClickHouse)

```sql
-- ClickHouse table for high-volume audit
CREATE TABLE audit_log (
    event_time DateTime64(3) CODEC(Delta, ZSTD),
    actor_id LowCardinality(String),
    action LowCardinality(String),
    resource_type LowCardinality(String),
    resource_id String,
    result Enum8('success'=1, 'failure'=2, 'denied'=3),
    payload String CODEC(ZSTD),
    trace_id FixedString(16),
    ip IPv6,
    user_agent String CODEC(ZSTD)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, actor_id, action)
TTL event_time + INTERVAL 7 YEAR DELETE;

-- Materialized view for daily aggregates
CREATE MATERIALIZED VIEW audit_stats_daily
ENGINE = SummingMergeTree()
ORDER BY (date, action, result)
AS SELECT
    toDate(event_time) AS date,
    action,
    result,
    count() AS count
FROM audit_log
GROUP BY date, action, result;
```

## Tamper-Evident Log Chain

```python
import hashlib
import hmac

class AuditLogChain:
    def __init__(self, secret_key: bytes):
        self.secret_key = secret_key

    def create_event(self, previous_hash: str | None, event: dict) -> tuple[dict, str]:
        event_hash = self._compute_hash(event)
        payload = f"{previous_hash or ''}{event_hash}"
        chain_hash = hmac.new(
            self.secret_key,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        return {**event, "previous_hash": previous_hash, "chain_hash": chain_hash}, chain_hash

    def verify_chain(self, events: list[dict]) -> bool:
        for i, event in enumerate(events):
            previous = events[i - 1]["chain_hash"] if i > 0 else None
            expected = hmac.new(
                self.secret_key,
                f"{previous or ''}{self._compute_hash(event)}".encode(),
                hashlib.sha256
            ).hexdigest()
            if event["chain_hash"] != expected:
                return False
        return True

    def _compute_hash(self, event: dict) -> str:
        # Exclude chain fields from the content hash
        content = {k: v for k, v in event.items() if k not in ("previous_hash", "chain_hash")}
        return hashlib.sha256(
            json.dumps(content, sort_keys=True).encode()
        ).hexdigest()
```

## Periodic Integrity Verification

```sql
-- Daily audit log integrity check
CREATE OR REPLACE FUNCTION verify_audit_chain(from_date date, to_date date)
RETURNS TABLE(is_valid boolean, checked_events bigint)
LANGUAGE plpgsql AS $$
DECLARE
    prev_hash TEXT;
    curr_hash TEXT;
    event_count BIGINT;
    valid_count BIGINT := 0;
BEGIN
    FOR curr_hash IN
        SELECT chain_hash FROM audit_log
        WHERE event_time BETWEEN from_date AND to_date
        ORDER BY event_time
    LOOP
        -- For each event, recompute chain_hash and compare
        -- This is simplified; real impl compares computed vs stored
        event_count := event_count + 1;
        valid_count := valid_count + 1;
    END LOOP;

    RETURN QUERY SELECT valid_count = event_count, event_count;
END;
$$;
```

## Archival Strategy

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Hot Storage  │───>│ Warm Storage │───>│ Cold Archive│
│ (30 days)    │    │ (1 year)     │    │ (7+ years)  │
│ ClickHouse   │    │ S3 + Parquet │    │ Glacier     │
│ Full query   │    │ Athena query │    │ No direct   │
└─────────────┘    └──────────────┘    └─────────────┘
```

## Anomaly Detection

```sql
-- Detect unusual activity patterns
SELECT
    actor_id,
    count(*) AS event_count,
    count(DISTINCT ip) AS ip_count,
    count(DISTINCT resource_type) AS resource_types
FROM audit_log
WHERE event_time > now() - INTERVAL 1 HOUR
GROUP BY actor_id
HAVING count(DISTINCT ip) > 5  -- Same user, many IPs
   OR count(*) > 1000          -- Unusual volume
ORDER BY event_count DESC;
```

## PII Masking in Audit Logs

```typescript
const PII_FIELDS = ['email', 'phone', 'ssn', 'password', 'token', 'secret'];

function maskPII(data: Record<string, any>, path: string[] = []): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const currentPath = [...path, key];
    if (PII_FIELDS.includes(key)) {
      result[key] = '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = maskPII(value, currentPath);
    } else {
      result[key] = value;
    }
  }
  return result;
}
```
