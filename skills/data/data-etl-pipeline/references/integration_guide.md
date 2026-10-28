# ETL Source Integration Guide

Patterns for getting data out of source systems reliably: relational databases (query-based and log-based CDC), REST/GraphQL APIs, SaaS connectors, files and object storage, and event streams. Focus is on correctness (no gaps, no duplicates), source safety and schema drift.

## Choosing an Extraction Method

| Source | Preferred method | Alternatives |
|---|---|---|
| OLTP database, mutable rows, deletes matter | Log-based CDC (Debezium, cloud DMS, Datastream, Fivetran/Airbyte CDC) | Incremental queries on `updated_at` + periodic full reconciliation |
| Append-only DB tables | Incremental by monotonically increasing key | CDC |
| SaaS (Salesforce, HubSpot, Stripe, Zendesk) | Managed connector | Custom API client |
| Internal REST API | Incremental API with cursor/updated-since | Export endpoints, event stream |
| Files (CSV, JSON, Parquet) from partners | Landing bucket + event-driven load (Snowpipe, Auto Loader, BigQuery Data Transfer) | Scheduled listing |
| Event streams | Kafka/Kinesis consumers or native sinks (Kafka Connect, Snowpipe Streaming, BigQuery Storage Write API) | Micro-batch reads |

## Database Sources

### Query-based incremental extraction
```sql
-- Window bounded by the run's data interval plus lookback for late commits
SELECT id, customer_id, status, amount, updated_at
FROM public.orders
WHERE updated_at >= %(window_start)s - interval '15 minutes'
  AND updated_at <  %(window_end)s
ORDER BY updated_at, id;
```
- Requires an index on `updated_at` and that every write updates it (triggers or ORM discipline).
- Misses hard deletes; reconcile with periodic key-set comparisons or use soft deletes.
- Read from a replica, never the primary, with a statement timeout.

### Log-based CDC with Debezium (PostgreSQL)
```json
{
  "name": "shop-postgres-cdc",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "shop-db.internal",
    "database.port": "5432",
    "database.user": "${secrets:shop-db/cdc-user}",
    "database.password": "${secrets:shop-db/cdc-password}",
    "database.dbname": "shop",
    "topic.prefix": "shop",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_shop",
    "publication.name": "dbz_shop",
    "table.include.list": "public.orders,public.customers",
    "snapshot.mode": "initial",
    "heartbeat.interval.ms": "10000"
  }
}
```
Notes:
- Uses PostgreSQL logical replication (`wal_level=logical`). An inactive replication slot retains WAL and can fill the source disk: monitor slot lag and set `max_slot_wal_keep_size`.
- Secrets via a Kafka Connect config provider, not inline.
- Heartbeats keep the slot advancing on low-traffic databases.
- Apply changes downstream with MERGE keyed by primary key, ordered by source LSN; treat `op = 'd'` as delete (or soft-delete flag).

```sql
MERGE INTO silver.orders t
USING (
  SELECT * FROM bronze.orders_cdc
  QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY source_lsn DESC) = 1
) s
ON t.id = s.id
WHEN MATCHED AND s.op = 'd' THEN DELETE
WHEN MATCHED THEN UPDATE SET status = s.status, amount = s.amount, updated_at = s.updated_at
WHEN NOT MATCHED AND s.op <> 'd' THEN INSERT (id, status, amount, updated_at) VALUES (s.id, s.status, s.amount, s.updated_at);
```

## API Sources

```python
from __future__ import annotations

import logging
import time
from collections.abc import Iterator

import httpx

log = logging.getLogger(__name__)
RETRYABLE = {408, 429, 500, 502, 503, 504}


def fetch_updated(base_url: str, token: str, since: str) -> Iterator[dict]:
    cursor: str | None = None
    with httpx.Client(base_url=base_url, timeout=httpx.Timeout(10.0, read=30.0),
                      headers={"Authorization": f"Bearer {token}"}) as client:
        while True:
            params = {"updated_since": since, "limit": 500, **({"cursor": cursor} if cursor else {})}
            resp = _get_with_retry(client, "/v1/orders", params)
            body = resp.json()
            yield from body["data"]
            cursor = body.get("next_cursor")
            if not cursor:
                return


def _get_with_retry(client: httpx.Client, path: str, params: dict, attempts: int = 5) -> httpx.Response:
    for attempt in range(1, attempts + 1):
        resp = client.get(path, params=params)
        if resp.status_code not in RETRYABLE:
            resp.raise_for_status()
            return resp
        wait = float(resp.headers.get("Retry-After", min(2 ** attempt, 60)))
        log.warning("GET %s returned %s (attempt %d/%d), retrying in %.0fs", path, resp.status_code, attempt, attempts, wait)
        time.sleep(wait)
    raise RuntimeError(f"GET {path} failed after {attempts} attempts with params {params}")
```
Rules:
- Cursor pagination over offset pagination (offsets skip/duplicate when data changes).
- Persist the high-water mark only after data lands successfully.
- Respect rate limits and `Retry-After`; use bulk/export endpoints for backfills.
- Land raw JSON in bronze before flattening, to survive schema changes.

## SaaS Connectors (Managed)

| Consideration | Question |
|---|---|
| Sync mode | Incremental vs. full refresh per table; deletes captured? |
| History | Soft-delete columns (`_fivetran_deleted`, `_airbyte_*` metadata) |
| Schema drift | Auto-add columns? Type changes? |
| Cost | Pricing by monthly active rows or volume; exclude unused tables/columns |
| Re-sync | Impact of a historical re-sync on cost and downstream models |

## Files and Object Storage
- Agree on a contract: naming (`source/dataset/dt=YYYY-MM-DD/part-*.parquet`), format, compression, schema, delivery time, and a completion marker (`_SUCCESS`) or manifest.
- Load idempotently: track loaded file names/etags (Snowflake `COPY` load history, Auto Loader checkpoints).
- Quarantine malformed files to an error prefix with a reason, do not drop silently.

## Event Streams
- Use a schema registry (Avro/Protobuf/JSON Schema) with compatibility rules.
- Consumers commit offsets after durable writes; sinks deduplicate on event ID.
- Retain topics long enough to replay after downstream incidents.

## Schema Drift Handling

| Drift | Strategy |
|---|---|
| New column | Auto-add in bronze; explicit add in silver |
| Removed column | Keep nullable; alert owners |
| Type change | Land as string/variant in bronze; cast in silver with validation |
| Renamed column | Treat as remove + add; map explicitly |

Data contracts with producers (schemas + SLAs + change notice) prevent most surprises.

## Checklist
- [ ] Extraction method matches mutability and delete requirements
- [ ] Source load bounded (replicas, timeouts, rate limits)
- [ ] Watermarks/offsets committed after successful load
- [ ] CDC slot/lag monitoring in place
- [ ] Raw payloads retained; drift handled explicitly
- [ ] Credentials from a secret store with read-only, scoped access
