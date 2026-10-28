# Data Quality Gate Patterns in Pipelines

Where and how to place quality checks in batch and streaming pipelines so bad data is stopped before consumers see it: write-audit-publish, quarantine, circuit breakers, and layered checks across medallion zones. Data contracts between teams are in `architecture_patterns.md`.

## Check Placement

```
Source ──► Ingest (bronze) ──► Clean/conform (silver) ──► Business marts (gold) ──► BI / ML / APIs
   │            │                     │                        │
 contract    schema, volume,     validity, uniqueness,    business rules,
 checks      freshness           referential integrity    reconciliation, anomaly detection
```

| Layer | Typical checks | Action on failure |
|-------|---------------|-------------------|
| Source / ingest | Schema matches contract, file arrived, row count plausible, freshness | Reject batch or quarantine; alert producer |
| Bronze | Duplicates on landing keys, parse errors | Quarantine bad rows; continue with good rows if allowed |
| Silver | Not null, unique keys, valid enums, FK integrity | Block publish for critical checks |
| Gold | Totals reconcile with source, KPI anomaly bounds | Block publish; notify data owners |
| Consumption | Freshness SLAs, dashboard tiles | Show stale banner, page on-call |

Shift checks left: the earlier a defect is caught, the fewer downstream tables need backfills.

## Pattern: Write-Audit-Publish (WAP)

Write new data to an isolated location, audit it, then publish atomically.

| Platform | Mechanism |
|----------|-----------|
| Apache Iceberg | Branches (`CREATE BRANCH audit_x`), write with `spark.wap.branch`, validate, `fast_forward` main; or staged snapshots with `wap.id` + `cherrypick_snapshot` |
| Delta Lake | Write to a staging table, validate, then `MERGE`/`INSERT OVERWRITE` into the target in one transaction |
| Snowflake / BigQuery | Build into a staging schema; swap (`ALTER TABLE ... SWAP WITH` in Snowflake) or `CREATE OR REPLACE` from staging |
| dbt | Build models in a staging schema/env, run `dbt test`, then promote (blue-green schemas or `dbt clone`) |
| LakeFS / Nessie | Branch the whole lake/catalog, validate, merge |

```sql
-- Iceberg branch-based WAP (Spark SQL)
ALTER TABLE prod.db.orders CREATE BRANCH audit_20261027;
SET spark.wap.branch = audit_20261027;
INSERT INTO prod.db.orders SELECT * FROM staging_orders;
-- run validations against prod.db.orders.branch_audit_20261027
CALL prod.system.fast_forward('db.orders', 'main', 'audit_20261027');
```

Consumers never read unaudited data, and a failed audit leaves the published table untouched.

## Pattern: Quarantine Table

Route failing rows (not whole batches) to a quarantine table with reasons:

```sql
INSERT INTO dq.orders_quarantine
SELECT o.*, 'amount_negative' AS dq_reason, current_timestamp AS dq_detected_at
FROM staging_orders o WHERE o.amount < 0;

INSERT INTO silver.orders
SELECT * FROM staging_orders WHERE amount >= 0;
```

- Track quarantine counts as a metric; a rising rate is an incident even if the pipeline "succeeds".
- Provide a replay path once the source fixes data.
- Decide per check whether row-level quarantine is acceptable or the whole batch must fail (e.g. financial reconciliation).

## Pattern: Circuit Breaker

Halt downstream jobs when a critical check fails, rather than propagating bad data:

```python
# Airflow: fail fast and stop downstream tasks
validate = PythonOperator(task_id="validate_orders", python_callable=run_checkpoint)
build_marts = BashOperator(task_id="build_marts", bash_command="dbt build --select marts")
validate >> build_marts          # default trigger rule all_success blocks marts on failure
```

- Severity levels: `error` blocks, `warn` alerts only. Keep the blocking set small and high-signal.
- In dbt, `dbt build` runs tests after each model and skips downstream nodes when a test with `severity: error` fails.

## Pattern: Reconciliation

Compare aggregates between source and target at each hop:

| Check | Example |
|-------|---------|
| Row counts | Source extract rows = bronze rows for the batch |
| Control totals | Sum of `amount` per day matches the source system |
| Key coverage | All source IDs present in target (anti-join) |
| Hash totals | Hash of sorted keys equal across systems |

Reconciliation catches silent drops (filters, join fan-out or loss) that column-level checks miss.

## Pattern: Anomaly Detection on Metrics

- Track volume, null rate, distinct counts, freshness per table over time.
- Alert on deviations from seasonal baselines (observability tools such as Monte Carlo, Soda anomaly checks, Elementary for dbt).
- Treat anomalies as warnings that need triage; they produce false positives during real business changes.

## Streaming Pipelines

- Validate at the producer with schema registry compatibility and serializer validation.
- In-stream checks (Flink/Kafka Streams) route invalid events to a DLQ topic with error headers.
- Windowed quality metrics (null rate per minute, late-event rate) emitted as metrics.
- Periodic batch reconciliation of the sink against the source.

## Ownership and Response

- Each check has an owner (table owner) and a runbook link.
- Alerts go to the owning team's channel with the failing check, sample failing keys (no PII), and lineage of affected downstream assets.
- Incident process for data quality in `data-quality-incident-management.md`.

## Pitfalls

- Hundreds of `warn` checks nobody reads; alert fatigue hides real issues.
- Checks only at the end of the pipeline: costly backfills.
- Validating full tables every run instead of incremental partitions.
- Publishing before validation and "fixing later".

## Checklist

- [ ] Checks defined per layer with explicit failure actions
- [ ] WAP or staging-swap for critical published tables
- [ ] Quarantine with metrics and replay path
- [ ] Circuit breakers stop downstream jobs on critical failures
- [ ] Reconciliation at system boundaries
- [ ] Owners and runbooks for every blocking check
