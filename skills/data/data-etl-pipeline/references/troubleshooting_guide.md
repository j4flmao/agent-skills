# ETL Pipeline Troubleshooting Guide

A symptom-driven guide for diagnosing failing, slow or wrong pipelines: orchestration problems, source and connectivity failures, data correctness issues, Spark and warehouse failures, and CDC/streaming lag. Ends with an incident runbook.

## First Five Minutes
1. **Scope**: which pipeline, which run/partition, since when, which consumers are affected?
2. **What changed**: recent deploys (code, image, dependencies), config, source schema, credentials, infrastructure.
3. **Logs**: task log of the first failing task (not the downstream cascade).
4. **Freshness**: are dashboards or models serving stale data? Communicate early.
5. **Stop the bleeding**: pause downstream publishing if bad data might propagate.

## Orchestration Problems (Airflow)

| Symptom | Likely cause | Check / fix |
|---|---|---|
| Tasks stuck in `queued` | No free executor slots, pool exhausted, worker down | Pools and `parallelism`; worker/pod status; KubernetesExecutor pod events |
| Tasks stuck in `scheduled` | Scheduler unhealthy or DAG concurrency limit | Scheduler logs and heartbeat; `max_active_tasks_per_dag` |
| DAG missing in UI | Import error, slow parse | DAG import errors view; `airflow dags list-import-errors`; heavy top-level code |
| Task killed with no error | OOM or pod eviction | `kubectl describe pod`, exit code 137; raise memory or reduce batch |
| Zombie / heartbeat timeouts | Worker died mid-task | Infra stability; make tasks idempotent so retries are safe |
| Runs duplicated | Manual triggers + schedule, catchup on | `catchup=False`, `max_active_runs=1` for sequential pipelines |

```bash
airflow dags list-import-errors
airflow tasks states-for-dag-run orders_daily <run_id>
kubectl -n airflow get pods --field-selector=status.phase=Failed
kubectl -n airflow describe pod <pod>      # OOMKilled, image pull errors, scheduling failures
```

## Source and Connectivity Failures

| Error pattern | Cause | Action |
|---|---|---|
| Connection timeout / refused | Network path, firewall, DNS, source down | Test from worker network (`nc -vz host port`), check security groups/private endpoints |
| Authentication failed | Rotated or expired credentials | Secret version in manager; connection ID mapping |
| HTTP 429 | API rate limit | Backoff honoring `Retry-After`, reduce concurrency, bulk endpoints |
| HTTP 5xx bursts | Provider incident | Retries with cap; delay schedule; check status page |
| SSL errors | Certificate rotation or CA bundle | Update CA bundle; verify hostname |
| `canceling statement due to conflict with recovery` | Long query on PostgreSQL replica | Smaller windows, `hot_standby_feedback`, dedicated replica |

## Data Correctness Issues

### Row counts off
```sql
-- Compare source and target per day
select date_trunc('day', updated_at) d, count(*) from source_snapshot.orders group by 1
except
select date_trunc('day', updated_at) d, count(*) from silver.orders group by 1;
```
Common causes:
| Cause | Signature | Fix |
|---|---|---|
| Watermark skipped late rows | Missing rows near window boundaries | Lookback window; reprocess affected windows |
| Duplicates from retries | Same key multiple times | MERGE/upsert on keys; dedup with `QUALIFY ROW_NUMBER()` |
| Join fan-out | Counts inflate after join | Test key uniqueness on dimension side |
| Timezone mismatch | Off-by-hours daily totals | Store UTC; convert only in presentation |
| Deletes not propagated | Target has rows source lacks | CDC deletes or periodic reconciliation |
| Filter drift | Counts drop after code change | Diff model SQL; data-diff old vs new |

### Nulls or wrong types appearing
- Source schema drift (column renamed, type changed): compare current source schema with the last known; check connector logs.
- Casting failures silently producing nulls (`TRY_CAST`): count nulls before/after cast.

### Stale data
- Source freshness checks (`dbt source freshness`) fail?
- Upstream asset not updated: trace lineage to the first stale node.
- Run succeeded but wrote to wrong target/environment: check target config in run logs.

## Spark Failures

| Symptom | Cause | Fix |
|---|---|---|
| `OutOfMemoryError` on executor | Large partitions, skew, wide rows, collect-like ops | More partitions, skew handling, avoid `collect()`, increase executor memory overhead |
| Driver OOM | `collect()`, huge broadcast, too many files listed | Write results instead of collecting; lower broadcast threshold; compact small files |
| One task runs much longer | Data skew | AQE skew join, salting, filter hot keys separately |
| `FileNotFoundException` mid-job | Concurrent overwrite/vacuum of input | Use table formats with snapshots; coordinate VACUUM/expiry |
| `AnalysisException` column not found | Schema change | Schema evolution settings; explicit select lists |
| Job slow after data growth | Shuffle partitions too few, no pruning | AQE, partition filters, compaction |

## Warehouse Failures

| Symptom | Cause | Fix |
|---|---|---|
| Query timeout | Large scan, poor pruning, queueing | Query profile; filters on partition/cluster keys; bigger or multi-cluster warehouse |
| Spill to remote storage | Not enough memory for joins/sorts | Larger warehouse for that model; pre-aggregate |
| Lock/concurrent update conflict | Parallel MERGEs to same table | Serialize writers; partitioned writes |
| Budget/quota exceeded | Runaway query or backfill | `maximum_bytes_billed`, resource monitors, cancel offending jobs |

## CDC and Streaming Lag

| Symptom | Check |
|---|---|
| Growing consumer lag | Consumer throughput vs. produce rate; partition count; slow sink |
| PostgreSQL disk filling | Inactive/lagging replication slot (`pg_replication_slots`, `pg_wal_lsn_diff`) |
| Connector restarting | Connect worker logs; schema history topic; snapshot errors |
| Out-of-order updates in target | Apply ordering by source LSN/offset per key |

```sql
SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
```

## Reprocessing Safely
1. Fix the root cause and deploy.
2. Identify affected partitions/windows from lineage and run logs.
3. Backfill through the orchestrator with limited concurrency into staging; validate; publish.
4. Notify consumers of restated data.

## Incident Runbook Template
```
Detection: <alert/user report, time>
Impact: <datasets, dashboards, consumers, data windows>
Mitigation: <paused publish, rolled back table to snapshot, disabled DAG>
Root cause: <one sentence + evidence>
Fix: <PR, deploy time>
Backfill: <partitions, validation results>
Prevention: <new test/alert/contract>
```

## Preventive Monitoring
- Freshness SLAs per critical dataset with alerts.
- Volume and null-rate anomaly checks on key tables.
- Task duration anomaly alerts (sudden slowdowns precede failures).
- CDC lag and slot size alerts.
- Failed-run alerts routed to the owning team with runbook links.

## Checklist
- [ ] First failing task identified, not just the cascade
- [ ] Recent changes reviewed
- [ ] Bad data stopped from propagating
- [ ] Root cause fixed before backfill
- [ ] Backfill validated and consumers informed
- [ ] New test or alert added to prevent recurrence
