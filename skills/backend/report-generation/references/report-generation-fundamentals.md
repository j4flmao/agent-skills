# Report Generation Fundamentals: Request Model, Sync vs Async and Format Choice

The basic architecture of a report feature: how clients request reports, when to generate synchronously vs in a background job, how to pick output formats, and the data-consistency rules every report needs. Format-specific details are in `pdf-generation.md` and `excel-csv-export.md`; templates, scheduling and delivery have their own references.

## Sync vs Async

| Criterion | Synchronous (in request) | Asynchronous (job) |
|---|---|---|
| Typical generation time | < 2–5 s | anything longer or unpredictable |
| Data volume | small (bounded rows) | large or user-defined ranges |
| Rendering | CSV streaming, small JSON | PDF via headless browser, large XLSX |
| Failure handling | client retries | job retries, status tracking |
| Gateway timeouts | must fit (often 30–60 s) | not affected |

Default to async for anything rendered by a headless browser or with user-chosen date ranges.

## Async Job API

```
POST /v1/reports
  Idempotency-Key: 6f1c...
  {"type": "sales_summary", "format": "pdf", "params": {"from": "2026-10-01", "to": "2026-10-26"}}
→ 202 Accepted
  Location: /v1/reports/rpt_01HF...
  {"id": "rpt_01HF...", "status": "queued"}

GET /v1/reports/rpt_01HF...
→ 200 {"id": "...", "status": "running", "progress": 0.4}
→ 200 {"id": "...", "status": "succeeded", "download_url": "https://...signed...", "expires_at": "..."}
→ 200 {"id": "...", "status": "failed", "error": {"code": "DATA_TOO_LARGE", "message": "..."}}
```

Status values: `queued`, `running`, `succeeded`, `failed`, `canceled`, `expired`. Notify by webhook, email or websocket when done instead of forcing clients to poll aggressively; if polling, return `Retry-After`.

## Job Record

```sql
CREATE TABLE report_jobs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id       TEXT NOT NULL UNIQUE,              -- random, exposed in API
  tenant_id       BIGINT NOT NULL,
  requested_by    BIGINT NOT NULL,
  report_type     TEXT NOT NULL,
  format          TEXT NOT NULL CHECK (format IN ('pdf','csv','xlsx','json')),
  params          JSONB NOT NULL,
  params_hash     TEXT NOT NULL,                     -- dedupe identical requests
  idempotency_key TEXT,
  status          TEXT NOT NULL DEFAULT 'queued',
  attempts        INT NOT NULL DEFAULT 0,
  storage_key     TEXT,
  error_code      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX ON report_jobs (tenant_id, created_at DESC);
```

## Worker Flow

```
dequeue job → mark running (attempts+1) → authorize (requester still allowed?) →
query data (read replica / snapshot) → render → upload to object storage →
mark succeeded with storage_key + expires_at → notify
on error: classify (retryable vs not) → retry with backoff or mark failed
```

Workers must be idempotent: a retried job overwrites the same storage key.

## Format Choice

| Format | Best for | Watch out |
|---|---|---|
| CSV | Data exchange, large exports, spreadsheet import | Formula injection, encoding (UTF-8 with BOM for Excel), locale separators |
| XLSX | Business users needing formatting, multiple sheets | Memory for large files; use streaming writers |
| PDF | Fixed layout, sharing, printing, archiving | Rendering cost; fonts; pagination |
| JSON | API consumers | Not human-friendly |
| HTML | In-app viewing, email bodies | Email client CSS limits |

## Data Consistency

- Generate from a consistent snapshot: single transaction with `REPEATABLE READ`, a read replica at a recorded position, or warehouse tables with an as-of date.
- State the data cut-off ("data as of 2026-10-26 23:59 UTC") in the report.
- Use the requester's timezone and locale explicitly; store them in job params.
- Use decimal types for money; never floats.

## Security Basics

- Authorize at request time and again at generation time (permissions may change in between).
- Tenant ID in every query; never trust IDs from params alone.
- Downloads via short-lived signed URLs; no public buckets.
- CSV/XLSX: neutralize cells starting with `=`, `+`, `-`, `@`, tab or carriage return to prevent formula injection.
- Retain generated files only as long as needed; apply lifecycle deletion.

## Limits

| Limit | Example |
|---|---|
| Max date range / rows per report type | 1 year / 1,000,000 rows |
| Concurrent jobs per tenant | 5 |
| Generation timeout | 10 min |
| File retention | 7 days |

Reject oversize requests early with an actionable error instead of failing after minutes of work.

## Checklist
- [ ] Sync only for small, bounded reports; async job API otherwise
- [ ] Idempotency key and params-hash dedupe
- [ ] Consistent snapshot and stated data cut-off
- [ ] Authorization rechecked in the worker; tenant scoping everywhere
- [ ] Signed, expiring download URLs and file retention policy
- [ ] Per-type limits and clear errors
