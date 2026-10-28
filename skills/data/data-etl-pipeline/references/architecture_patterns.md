# ETL/ELT Architecture Patterns

Structural choices for data pipelines: ETL vs. ELT, batch vs. micro-batch vs. streaming, layered (medallion) storage, incremental processing, change data capture, and the write-audit-publish pattern. Each pattern lists when to use it and its trade-offs.

## ETL vs. ELT

| | ETL | ELT |
|---|---|---|
| Transform location | Outside the warehouse (Spark, Python, integration tool) | Inside the warehouse/lakehouse (SQL, dbt) |
| Raw data kept | Often not | Yes, in a raw/bronze layer |
| Strengths | Heavy non-SQL processing, data reduction before load, PII removal before landing | Reprocessing from raw, SQL-friendly teams, warehouse scale |
| Risks | Lost raw history, harder replays | Warehouse cost, raw PII landing in the warehouse |
| Typical stack | Spark/Flink, Glue, custom Python | Fivetran/Airbyte + Snowflake/BigQuery/Databricks + dbt |

Most modern platforms are ELT with selective pre-load transformations (masking, format conversion).

## Processing Latency Patterns

| Pattern | Latency | Tools | Use when |
|---|---|---|---|
| Batch | Hours/daily | Airflow/Dagster + SQL/Spark | Reporting, finance, ML training sets |
| Micro-batch | Minutes | Spark Structured Streaming (trigger intervals), scheduled incremental dbt | Near-real-time dashboards |
| Streaming | Seconds or less | Kafka + Flink, Kafka Streams, Spark real-time modes | Fraud, alerting, operational features |
| Lambda | Batch + streaming paths | Two code paths | Legacy; avoid duplicate logic when possible |
| Kappa | Single streaming path, replay from log | Kafka + Flink | Everything can be expressed as stream processing and the log retains enough history |

Choose the slowest latency that meets the requirement; streaming raises operating cost and complexity.

## Layered Storage (Medallion)

```
Sources -> Bronze (raw, append-only, as received + ingestion metadata)
        -> Silver (cleaned, typed, deduplicated, conformed keys)
        -> Gold (business-level marts, aggregates, semantic models)
```
| Layer | Rules |
|---|---|
| Bronze | Immutable; schema-on-read allowed; keep `_ingested_at`, `_source_file`, `_batch_id` |
| Silver | Enforce types, constraints and dedup; SCD handling; PII tokenization |
| Gold | Modeled for consumption (star schemas, wide tables); documented metrics |

Store in open table formats (Delta Lake, Apache Iceberg, Apache Hudi) for ACID writes, time travel and schema evolution.

## Incremental Processing

```sql
-- dbt incremental model with merge
{{ config(materialized='incremental', unique_key='order_id', incremental_strategy='merge',
          on_schema_change='append_new_columns') }}

select order_id, customer_id, status, amount, updated_at
from {{ source('shop', 'orders') }}
{% if is_incremental() %}
where updated_at > (select coalesce(max(updated_at), '1900-01-01') from {{ this }})
{% endif %}
```
Watermark strategies:
| Strategy | Pitfall | Mitigation |
|---|---|---|
| `updated_at` high-water mark | Late-arriving or backdated rows | Lookback window (e.g. reprocess last N hours/days) |
| Partition overwrite by date | Partial partitions on failure | Atomic partition replace (insert overwrite) |
| CDC log offsets | Offset loss | Store offsets transactionally with output |
| Full refresh | Cost grows with data | Use only for small tables or periodic reconciliation |

## Change Data Capture (CDC)

```
OLTP DB (WAL/binlog) -> Debezium (Kafka Connect) -> Kafka topics (per table)
   -> sink: lakehouse MERGE (Flink/Spark) or warehouse connector
```
- Log-based CDC captures inserts, updates and deletes with low source impact, versus query-based polling which misses deletes and loads the source.
- Events include before/after images and source metadata (LSN/position, transaction id); apply in order per primary key.
- Initial snapshot + streaming changes; plan for re-snapshots after schema changes or connector resets.
- Use the transactional outbox pattern when you need domain events rather than table changes.

## Write-Audit-Publish (WAP)

```
write  -> new data to a staging branch/table/partition (Iceberg branch, Delta clone, staging schema)
audit  -> run data quality checks (row counts, nulls, uniqueness, referential checks, distribution drift)
publish-> atomically swap/merge into production (fast-forward branch, rename, partition exchange)
```
Consumers never see unvalidated data. Iceberg branches/tags and Nessie/lakeFS provide git-like semantics for this pattern.

## Idempotency and Reprocessing
- Each run processes a defined window/partition and overwrites or merges its output deterministically, so reruns produce the same result.
- Avoid `INSERT` append without dedup keys in retried tasks.
- Keep raw data long enough to rebuild downstream layers.
- Record lineage: run id, code version, input snapshot ids.

## Orchestration Topologies

| Topology | Description | Fit |
|---|---|---|
| Task-centric DAGs | Airflow tasks with dependencies | Heterogeneous jobs, external system calls |
| Asset-centric | Dagster assets, Airflow Assets, dbt models | Data products with lineage and freshness |
| Event-driven | Triggers on file arrival, CDC, asset events | Irregular arrivals, lower latency |
| Data contracts at boundaries | Producers publish schemas and SLAs | Many producing teams (data mesh) |

## Reference Architectures

**Small team, SaaS-heavy**: managed connectors -> cloud warehouse -> dbt -> BI. Orchestrate with dbt Cloud or a light Airflow/Dagster.

**Lakehouse**: CDC + files -> object storage in Iceberg/Delta -> Spark/SQL engines (Databricks, Trino, Snowflake external/managed Iceberg) -> dbt -> BI/ML.

**Streaming-first**: Kafka as system of record for events -> Flink for enrichment and aggregation -> sink to lakehouse and serving stores (ClickHouse, Pinot, Druid) -> dashboards and APIs.

## Anti-Patterns
| Anti-pattern | Problem |
|---|---|
| Transformations inside BI tools only | Logic duplicated, untested |
| One giant DAG for everything | Blast radius, scheduling contention |
| Pipelines reading production OLTP with heavy queries | Source outages |
| No raw layer | Cannot replay after bugs |
| Using wall-clock `now()` in transforms | Non-reproducible results |

## Checklist
- [ ] Latency requirement written down; simplest pattern chosen
- [ ] Raw layer retained with ingestion metadata
- [ ] Incremental logic handles late data and is idempotent
- [ ] CDC used for mutable sources needing deletes
- [ ] Quality gates before publishing (WAP)
- [ ] Lineage and run metadata recorded
