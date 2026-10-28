# Bulk Import Fundamentals: End-to-End Design

The core design of a file-based bulk import feature: the stages from upload to committed data, the API and data model that support them, and the decisions every import must make (sync vs async, all-or-nothing vs partial, insert vs upsert). Sibling references go deeper: `csv-parsing.md`, `validation-pipeline.md`, `import-workflow.md`, `rollback-recovery.md`, `import-monitoring.md`, and `bulk-import-advanced.md` for high-throughput loading.

## 1. Stages

```
1. Upload        client → object storage (pre-signed URL) or API; size/type checks
2. Register      create import job (status=uploaded), store file reference + checksum
3. Parse         stream rows; detect encoding/dialect; map columns to fields
4. Validate      per-row and cross-row checks; collect errors with row numbers
5. Preview       show counts, sample rows, errors; user confirms or fixes the file
6. Commit        batched writes in a background worker; progress updates
7. Report        final counts, downloadable error file, audit record
```

Small imports (hundreds of rows) can run stages 3–6 synchronously; anything larger runs in a background job with progress polling or push updates.

## 2. Key Decisions

| Decision | Options | Guidance |
|---|---|---|
| Processing mode | Synchronous / background job | Background above a few thousand rows or seconds of work |
| Failure semantics | All-or-nothing / skip invalid rows / stop at first error | All-or-nothing for financial or relational data; skip-invalid with error report for contact lists |
| Write semantics | Insert only / upsert by natural key / replace set | Upsert needs a stable key column (email, SKU, external ID) |
| Duplicate handling | Within file and against existing data | Decide per key: first wins, last wins, or error |
| Column mapping | Fixed template / user mapping UI / header auto-match | Template plus header auto-match with manual override |
| Limits | Max file size, max rows, rate per tenant | Enforce at upload and at parse |

## 3. Data Model

```sql
CREATE TABLE import_jobs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id       UUID NOT NULL UNIQUE,
  tenant_id       BIGINT NOT NULL,
  entity_type     TEXT NOT NULL,                     -- 'contacts', 'products'
  status          TEXT NOT NULL CHECK (status IN
                    ('uploaded','parsing','validated','failed_validation','confirmed',
                     'importing','completed','completed_with_errors','failed','cancelled')),
  mode            TEXT NOT NULL CHECK (mode IN ('insert','upsert')),
  failure_policy  TEXT NOT NULL CHECK (failure_policy IN ('all_or_nothing','skip_invalid')),
  file_key        TEXT NOT NULL,
  file_sha256     TEXT NOT NULL,
  column_mapping  JSONB,
  total_rows      INT,
  valid_rows      INT,
  processed_rows  INT NOT NULL DEFAULT 0,
  error_rows      INT NOT NULL DEFAULT 0,
  created_by      BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
CREATE INDEX ON import_jobs (tenant_id, created_at DESC);

CREATE TABLE import_errors (
  job_id      BIGINT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number  INT NOT NULL,
  column_name TEXT,
  code        TEXT NOT NULL,
  message     TEXT NOT NULL,
  raw_value   TEXT
);
CREATE INDEX ON import_errors (job_id, row_number);
```

`file_sha256` lets you detect re-uploads of the same file and warn before importing twice.

## 4. API Shape

```
POST /imports                         → {id, upload_url}   (pre-signed PUT URL)
POST /imports/{id}/parse              → 202; job status moves to parsing → validated
GET  /imports/{id}                    → status, counts, progress, column mapping
GET  /imports/{id}/preview?limit=20   → sample mapped rows
GET  /imports/{id}/errors?cursor=…    → paginated errors
GET  /imports/{id}/errors.csv         → downloadable error report
POST /imports/{id}/confirm            → 202; starts commit job (idempotent)
POST /imports/{id}/cancel             → stops before/while importing
```

`confirm` must be idempotent: calling it twice does not start two commit jobs (check status transition atomically: `UPDATE ... SET status='confirmed' WHERE id=$1 AND status='validated'`).

## 5. Upload Handling

- Direct-to-storage uploads (S3/GCS/Azure pre-signed URLs) keep large files off application servers.
- Check size limits in the pre-signed policy (S3 POST policy `content-length-range`) and again server-side.
- Validate type by content, not extension: CSV must decode as text; XLSX is a ZIP with expected entries.
- Scan for malware if files are later served to other users.

## 6. Batched Commit

```python
def commit(job, rows, repo, batch_size: int = 1000) -> None:
    batch = []
    for row in rows:                       # streamed validated rows
        batch.append(row)
        if len(batch) == batch_size:
            repo.upsert_batch(job.tenant_id, batch)    # one transaction per batch
            repo.increment_progress(job.id, len(batch))
            batch.clear()
    if batch:
        repo.upsert_batch(job.tenant_id, batch)
        repo.increment_progress(job.id, len(batch))
```

- Batches of hundreds to a few thousand rows balance round trips and transaction size.
- For all-or-nothing on large files, load into a staging table and swap/merge in one final transaction (`bulk-import-advanced.md`).
- Make batches idempotent (upsert by key, or record processed batch numbers) so a restarted worker can continue.

## 7. Error Reporting

Users need to fix and re-upload, so errors must be:
- Located: row number (as in the user's file, counting the header), column name.
- Specific: "Invalid email 'bob@'", not "validation failed".
- Exportable: original row values plus an error column, in the same format as the upload.

## 8. Security Basics

- Authorize the import per tenant and entity type; never trust tenant IDs inside the file.
- Formula injection: values starting with `=`, `+`, `-`, `@`, tab, or carriage return can execute in spreadsheet apps when error reports or exports are opened. Prefix such values with a single quote when writing CSV/XLSX output.
- Limit decompressed size for XLSX/ZIP inputs (zip bombs).

## Pitfalls

- Loading the whole file into memory.
- Running imports in the request thread; timeouts leave partial data.
- Row numbers that do not match what the user sees in Excel.
- Non-idempotent confirm or batch processing causing duplicate rows on retry.

## Checklist

- [ ] Stages and statuses defined; large imports run in background jobs.
- [ ] Failure and write semantics chosen per entity.
- [ ] Direct-to-storage upload with size/type checks.
- [ ] Preview and error report with exact row/column locations.
- [ ] Idempotent confirm and batch commits.
- [ ] Formula-injection protection on exported files.
