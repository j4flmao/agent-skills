# Batch Processing Architecture Patterns

Patterns for structuring batch pipelines so they are correct on rerun, recoverable after failure, and cheap to backfill. Engine-specific API usage is in `api_reference.md`; orchestration wiring is in `integration_guide.md`.

## Layered (Medallion) Architecture

| Layer | Content | Write pattern | Consumers |
|-------|---------|---------------|-----------|
| Raw / Bronze | Source data as received, plus ingestion metadata | Append-only, immutable | Reprocessing, audits |
| Cleaned / Silver | Typed, deduplicated, conformed entities | MERGE / partition overwrite | Analysts, data science, other pipelines |
| Curated / Gold | Aggregates, marts, features | Partition overwrite | BI, applications |

Keeping raw data immutable makes every downstream table rebuildable: a bug fix means re-running transformations, not re-extracting from sources that may no longer have the data.

## Idempotent Partition Processing

The most important batch pattern: each run processes a well-defined slice (usually a date partition) and writes it with replace semantics.

```text
run(dt) :=
  input  = read(source, partition = dt)
  output = transform(input)
  replace(target, partition = dt, output)    # overwrite only dt
```

Properties:
- Rerunning `run(dt)` yields the same result (idempotent).
- Backfills are loops over `dt`, parallelizable.
- Failed runs leave the previous partition intact if the write is atomic (table formats like Delta/Iceberg commit atomically; plain Parquet directories do not).

Avoid `now()` inside transformations; derive everything from the logical run date passed by the orchestrator (`{{ ds }}` / data interval in Airflow).

## Incremental Patterns

| Pattern | How | Fits | Risk |
|---------|-----|------|------|
| Full refresh | Rebuild entire table each run | Small tables, dimensions | Cost grows with history |
| Partition overwrite | Rebuild only affected partitions | Event/fact data partitioned by date | Late data in old partitions needs lookback |
| Watermark (high-water mark) | Read rows with `updated_at > last_watermark` | Mutable source tables | Clock skew, same-timestamp rows; store watermark transactionally |
| CDC-based MERGE | Apply inserts/updates/deletes from change logs | Replicating OLTP tables | Ordering, deletes, schema changes |
| Snapshot diff | Compare today's snapshot to yesterday's | Sources without timestamps | Expensive for large tables |

### Late-arriving data

Reprocess a lookback window (for example the last 3 days of partitions) each run, or detect which partitions received new raw data and rebuild only those.

## Slowly Changing Dimensions (Type 2) in Batch

```sql
MERGE INTO silver.customer_scd t
USING (
  SELECT s.customer_id AS merge_key, s.* FROM staged s
  UNION ALL
  -- rows that changed: insert a new version (merge_key NULL forces NOT MATCHED)
  SELECT NULL AS merge_key, s.* FROM staged s
  JOIN silver.customer_scd t ON s.customer_id = t.customer_id AND t.is_current
  WHERE s.row_hash <> t.row_hash
) u
ON t.customer_id = u.merge_key AND t.is_current
WHEN MATCHED AND t.row_hash <> u.row_hash THEN
  UPDATE SET is_current = false, valid_to = u.effective_ts
WHEN NOT MATCHED THEN
  INSERT (customer_id, name, segment, row_hash, valid_from, valid_to, is_current)
  VALUES (u.customer_id, u.name, u.segment, u.row_hash, u.effective_ts, NULL, true);
```

## Write-Audit-Publish (WAP)

Validate data before consumers see it:

```text
1. Write  -> staging table / branch (Iceberg branch, Delta clone, or staging schema)
2. Audit  -> data quality checks (row counts, null rates, uniqueness, referential checks)
3. Publish-> atomic swap / fast-forward branch / INSERT OVERWRITE into production table
```

Iceberg supports this natively with branches and `cherrypick_snapshot` / `fast_forward` procedures; on other formats, publish via an atomic table rename or view swap.

## Fan-Out / Fan-In

Split a large job into independent units (per tenant, per region, per partition) that run in parallel, then a final step combines results. Orchestrators model this with dynamic task mapping (Airflow `expand()`), Step Functions Map state, or Argo Workflows `withItems`. Bound parallelism to protect sources and cluster capacity.

## Lambda vs Kappa vs Batch-Only

| Architecture | Description | When |
|--------------|-------------|------|
| Batch only | Periodic jobs over full or incremental data | Latency of hours is acceptable |
| Lambda | Separate batch (accurate) and streaming (fast) paths merged at serving | Legacy; two code paths to maintain |
| Kappa | Single streaming path; reprocess by replaying the log | Low latency needed and the log is retained |
| Unified engines | Same code for batch and streaming (Spark Structured Streaming `trigger(availableNow=True)`, Flink batch mode) | Incremental batch over streams without separate code |

`trigger(availableNow=True)` processes all available input in micro-batches and stops: a robust way to run incremental batch with checkpointed progress.

## Small Files and Compaction

Frequent small writes create many small files that slow reads and inflate metadata. Patterns:
- Size output files (target roughly 128 MB to 1 GB for Parquet) with `repartition`/`coalesce` or table-format write options.
- Scheduled compaction: Delta `OPTIMIZE`, Iceberg `rewrite_data_files`, Hudi clustering.
- Expire old snapshots and clean orphan files (`VACUUM`, `expire_snapshots`, `remove_orphan_files`) per retention policy.

## Failure Handling

| Failure | Pattern |
|---------|---------|
| Transient (network, spot loss) | Task retries with backoff in the orchestrator |
| Bad input records | Quarantine table for rejects; fail only above a threshold |
| Upstream not ready | Sensors / data-availability checks (or dataset-triggered scheduling) instead of fixed times |
| Partial write | Atomic commits (table formats) or write-then-rename |
| Logic bug discovered later | Fix, then backfill affected partitions from raw |

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| `append` writes with reruns | Partition overwrite or MERGE |
| Transformation reads "latest" data instead of run date | Parameterize with logical date |
| One giant job doing extract, transform, load and reporting | Separate stages with persisted intermediate tables |
| Overwriting raw data | Immutable raw layer |
| No data quality gate | WAP with automated checks |

## Checklist

- [ ] Raw layer immutable and retained long enough for backfills
- [ ] Every job parameterized by logical date and idempotent
- [ ] Late data handled with lookback or change detection
- [ ] Quality checks gate publication
- [ ] File sizes managed; compaction and snapshot expiry scheduled
- [ ] Backfill procedure documented and tested
