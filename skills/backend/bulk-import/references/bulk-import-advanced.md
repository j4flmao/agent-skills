# Bulk Import Advanced: High-Throughput Loading and Hard Cases

Techniques for imports that are large (millions of rows), concurrent, or must be atomic: database bulk-load paths, staging tables with set-based merges, index and constraint handling, parallelism, Excel streaming, and multi-tenant fairness. Basics are in `bulk-import-fundamentals.md`.

## 1. Load Path Options

| Technique | Throughput | Notes |
|---|---|---|
| Row-by-row `INSERT` via ORM | Lowest | Fine for hundreds of rows |
| Multi-row `INSERT ... VALUES (...), (...)` | Medium | Batch 500–5,000 rows; mind parameter limits (PostgreSQL wire protocol: 65,535 bind parameters per statement) |
| `executemany` / driver batch APIs | Medium–high | psycopg 3 `executemany` pipelines; JDBC `addBatch` with `reWriteBatchedInserts=true` (PgJDBC) or `rewriteBatchedStatements=true` (MySQL Connector/J) |
| PostgreSQL `COPY FROM STDIN` | Highest | Streams rows; no per-row SQL parsing |
| MySQL `LOAD DATA [LOCAL] INFILE` | Highest | `LOCAL` must be enabled on client and server (`local_infile`) |
| SQL Server `BULK INSERT` / `SqlBulkCopy` | Highest | Table lock hint (`TABLOCK`) enables minimal logging in some recovery models |

## 2. Staging Table + Set-Based Merge (PostgreSQL)

Gives atomic, fast imports and lets validation run in SQL.

```python
import psycopg

def load_contacts(conn: psycopg.Connection, job_id: int, tenant_id: int, rows) -> int:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TEMP TABLE stage_contacts (
                  row_number INT, email TEXT, name TEXT, phone TEXT
                ) ON COMMIT DROP""")
            with cur.copy("COPY stage_contacts (row_number, email, name, phone) FROM STDIN") as cp:
                for r in rows:                              # streamed, already parsed
                    cp.write_row((r.row_number, r.email, r.name, r.phone))

            # set-based validation: duplicates inside the file
            cur.execute("""
                INSERT INTO import_errors (job_id, row_number, column_name, code, message)
                SELECT %s, row_number, 'email', 'duplicate_in_file', 'email appears more than once'
                FROM (SELECT row_number, count(*) OVER (PARTITION BY lower(email)) c
                      FROM stage_contacts) d
                WHERE c > 1""", (job_id,))
            if cur.rowcount:
                raise ImportValidationError(f"job {job_id}: {cur.rowcount} duplicate rows")

            cur.execute("""
                INSERT INTO contacts (tenant_id, email, name, phone)
                SELECT %s, lower(email), name, phone FROM stage_contacts
                ON CONFLICT (tenant_id, email)
                DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, updated_at = now()
                WHERE (contacts.name, contacts.phone) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.phone)
                """, (tenant_id,))
            return cur.rowcount
```

- `ON COMMIT DROP` temp tables vanish with the transaction; for multi-transaction jobs use a permanent staging table keyed by `job_id` (optionally `UNLOGGED` for speed, accepting loss on crash since it can be rebuilt from the file).
- The `WHERE ... IS DISTINCT FROM` clause skips no-op updates, reducing write amplification and triggers.
- PostgreSQL 15+ `MERGE` is an alternative to `ON CONFLICT` when you need insert/update/delete in one statement; `ON CONFLICT` remains the race-safe choice for concurrent upserts.

## 3. Indexes, Constraints, Triggers

| Situation | Approach |
|---|---|
| Initial load into an empty table | Create secondary indexes and FKs after loading; load in primary-key order |
| Incremental import into a live table | Keep indexes; batch size moderate; avoid long locks |
| Expensive triggers per row | Replace with set-based post-processing for imports, if business rules allow |
| FK checks against large parents | Validate references in staging with a join, report missing ones, then insert |

Dropping indexes on a live table affects all other queries; only do it in maintenance windows or for new tables.

## 4. Parallelism

- Split by independent key ranges or file chunks; each worker writes its own batches.
- Concurrent upserts on the same keys deadlock or serialize; partition work by key hash so a key is owned by one worker.
- Limit concurrency per tenant and globally (database connection pool size is the real ceiling).
- Order batches consistently (sort by key) to reduce deadlock risk.

```python
from concurrent.futures import ThreadPoolExecutor

def parallel_import(chunks_by_key_hash: dict[int, list], worker, max_workers: int = 4) -> None:
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = [pool.submit(worker, shard, rows) for shard, rows in chunks_by_key_hash.items()]
        for f in futures:
            f.result()            # propagate the first failure
```

## 5. Large Excel Files

- `openpyxl.load_workbook(path, read_only=True, data_only=True)` streams rows with low memory; `data_only=True` returns cached formula results instead of formulas (cached values may be missing if the file was produced by a tool that does not compute them).
- Dates may arrive as `datetime` or as numbers depending on cell formatting; normalize explicitly.
- Reject macro-enabled formats (`.xlsm`) unless required; never execute macros.
- Guard against decompression bombs: check total uncompressed size of the ZIP entries before parsing.

```python
import zipfile

MAX_UNCOMPRESSED = 500 * 1024 * 1024

def check_xlsx(path: str) -> None:
    with zipfile.ZipFile(path) as z:
        total = sum(i.file_size for i in z.infolist())
        if total > MAX_UNCOMPRESSED:
            raise ImportRejected(f"{path}: uncompressed size {total} exceeds limit")
        if "xl/workbook.xml" not in z.namelist():
            raise ImportRejected(f"{path}: not an XLSX workbook")
```

## 6. Multi-Tenant Fairness

- Queue per tenant or weighted fair scheduling so one tenant's 10M-row import does not block others.
- Rate-limit rows/second per tenant in the commit stage.
- Run heavy imports on a separate worker pool and, if needed, a read replica for validation lookups.

## 7. Resumability

- Persist the last committed batch number/byte offset on the job.
- On restart, skip committed batches; upsert semantics make reprocessing the in-flight batch safe.
- For staging-table imports, resuming means re-running the final merge, which is idempotent with upserts.

## 8. Keeping the System Responsive

- Use `statement_timeout`/`lock_timeout` on import sessions so they fail rather than block OLTP traffic.
- Throttle commits when replication lag or database CPU crosses thresholds.
- Schedule very large imports off-peak or move them to a bulk-load window.

## Pitfalls

- ORM row-by-row inserts for millions of rows.
- Parallel workers upserting overlapping keys: deadlocks.
- One giant transaction for a multi-hour import: lock retention, bloat, replication lag.
- Trusting `data_only=True` Excel values without checking for missing cached results.

## Checklist

- [ ] Bulk path chosen (COPY / LOAD DATA / bulk copy) for large imports.
- [ ] Staging table with set-based validation and merge.
- [ ] Index/constraint strategy matches table state (empty vs live).
- [ ] Parallelism partitioned by key; concurrency capped.
- [ ] Excel parsed in streaming mode with size guards.
- [ ] Per-tenant fairness, timeouts, and resumable progress.
