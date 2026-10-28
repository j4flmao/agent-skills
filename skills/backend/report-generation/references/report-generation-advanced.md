# Report Generation at Scale: Streaming, Worker Pools and Reliability

Techniques for large and high-volume reporting: constant-memory streaming exports, headless-browser pools for PDF, offloading heavy exports to the warehouse, backpressure, cancellation, retries and observability. Builds on `report-generation-fundamentals.md`.

## Constant-Memory Streaming Exports

Never load all rows into memory. Stream from the database cursor to the output and directly to object storage.

Node.js (PostgreSQL cursor → CSV → S3 multipart upload):

```ts
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { stringify } from "csv-stringify";
import QueryStream from "pg-query-stream";
import { pipeline } from "node:stream/promises";
import { PassThrough } from "node:stream";
import type { PoolClient } from "pg";

const FORMULA_START = /^[=+\-@\t\r]/;
const safe = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return FORMULA_START.test(s) ? `'${s}` : s;
};

export async function exportOrdersCsv(client: PoolClient, tenantId: number, key: string) {
  const query = new QueryStream(
    "SELECT id, customer_name, total, created_at FROM orders WHERE tenant_id = $1 ORDER BY id",
    [tenantId],
    { batchSize: 1000 },
  );
  const body = new PassThrough();
  const upload = new Upload({
    client: new S3Client({}),
    params: { Bucket: process.env.REPORTS_BUCKET!, Key: key, Body: body, ContentType: "text/csv; charset=utf-8" },
  });
  const csv = stringify({ header: true, columns: ["id", "customer_name", "total", "created_at"], cast: { string: safe } });
  await Promise.all([pipeline(client.query(query), csv, body), upload.done()]);
}
```

`pipeline` propagates backpressure: the DB cursor pauses when the S3 upload is slower, and an error in either side rejects the combined promise.

Python equivalent: server-side cursor (`psycopg` named cursor with `itersize`) feeding `csv.writer` into a multipart upload; for XLSX use `openpyxl` in write-only mode or `xlsxwriter` with `constant_memory`.

## Offload Very Large Exports to the Warehouse

For tens of millions of rows, generate the file where the data lives:

| Platform | Command |
|---|---|
| PostgreSQL | `COPY (SELECT ...) TO STDOUT WITH (FORMAT csv, HEADER)` streamed by the worker |
| Snowflake | `COPY INTO @stage/... FROM (SELECT ...) FILE_FORMAT = (TYPE = CSV)` |
| BigQuery | `EXPORT DATA OPTIONS(uri='gs://bucket/path/*.csv', format='CSV') AS SELECT ...` |
| Redshift | `UNLOAD ('SELECT ...') TO 's3://...' IAM_ROLE '...' FORMAT CSV` |

Then deliver the files (or a zip/manifest) via signed URLs. Apply tenant filters in the query and grant the export role access only to the export prefix.

## PDF Rendering Pool

Launching a browser per job is slow and memory-heavy. Keep a bounded pool of browser instances and open a fresh context per job.

```ts
import { chromium, type Browser } from "playwright";

class PdfRenderer {
  private browser?: Browser;
  private active = 0;
  constructor(private readonly maxConcurrent = 4) {}

  async render(html: string): Promise<Buffer> {
    if (this.active >= this.maxConcurrent) throw new Error("renderer saturated; retry later");
    this.active++;
    try {
      this.browser ??= await chromium.launch();
      const context = await this.browser.newContext({ javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.route("**/*", (route) =>
          route.request().url().startsWith("data:") ? route.continue() : route.abort());
        await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
        return await page.pdf({ format: "A4", printBackground: true });
      } finally {
        await context.close();
      }
    } finally {
      this.active--;
    }
  }
}
```

Practices:
- One isolated context per job; disable JavaScript when templates do not need it.
- Block network requests from the page (as above; allow-list your asset host if needed) to prevent SSRF via injected HTML.
- Recycle browsers after N renders or on crash; set per-render timeouts.
- Size worker memory for the pool (headless Chromium uses hundreds of MB under load).
- Escape all user data in templates (auto-escaping template engines).

## Queue Design

| Concern | Practice |
|---|---|
| Fairness | Per-tenant concurrency limits; separate queues for heavy vs light report types |
| Priority | Interactive requests ahead of scheduled bulk runs |
| Backpressure | Reject or defer new requests when queue age exceeds a threshold; return estimated wait |
| Dedupe | Same tenant + type + params hash within N minutes returns the existing job |
| Cancellation | `DELETE /v1/reports/{id}` sets a flag the worker checks between batches |
| Timeouts | Hard job timeout; queue visibility timeout longer than the job timeout |

## Retries

| Failure | Retry? |
|---|---|
| Transient DB/network errors, S3 5xx, renderer crash | Yes, bounded (e.g. 3) with exponential backoff and jitter |
| Validation errors, permission denied, data too large | No; fail with code |
| Timeout | Retry once only if likely transient; otherwise fail |

Uploads to the same storage key make retries idempotent. Dead-letter jobs after the last attempt and alert.

## Caching and Reuse

- Cache results for identical (tenant, type, params, data version); the data version can be a max `updated_at`, a warehouse snapshot ID or a daily partition date.
- Scheduled runs: generate once, distribute to many recipients.

## Observability

Metrics per type: queue wait time, generation duration (p50/p95), rows, output bytes, failure rate by error code, renderer pool saturation, memory per worker. Trace each job across API → queue → worker → storage. Log `job_id`, `tenant_id`, `report_type`, `attempt`, never file contents.

## Security at Scale

- Per-tenant storage prefixes; signed URLs scoped to one object with short expiry (minutes to hours).
- Audit log of who generated and downloaded which file.
- Large exports of personal data may require approval or additional controls (data-export policies).
- Never embed user-uploaded files without malware scanning.

## Checklist
- [ ] Streaming end to end (cursor → encoder → multipart upload)
- [ ] Warehouse-native export for very large datasets
- [ ] Bounded browser pool with isolated contexts and network blocking
- [ ] Per-tenant fairness, dedupe, cancellation and timeouts
- [ ] Retry classification with dead-lettering
- [ ] Per-type metrics, tracing and audit logging
