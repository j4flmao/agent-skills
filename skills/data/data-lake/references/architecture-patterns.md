# Lake Zone Architecture: Medallion Layers on Open Table Formats

How to structure a data lake into zones (bronze/silver/gold, or raw/curated/consumption) with ACID table formats, what each zone guarantees, and how data moves between them. Ingestion mechanics are in `architecture_patterns.md`.

## Zones

| Zone | Contents | Write pattern | Schema | Retention |
|---|---|---|---|---|
| Landing (optional) | Files exactly as delivered (JSON, CSV, Avro) | Object PUT | none | short (days), lifecycle rule |
| Bronze / raw | Source records as table, plus ingestion metadata | Append only | source schema, permissive | long; replay source of truth |
| Silver / curated | Cleaned, typed, deduplicated, conformed entities | MERGE / upsert, SCD | enforced, evolving under review | per domain policy |
| Gold / consumption | Aggregates, marts, features, wide tables | Overwrite partition or MERGE | contract with consumers | as consumers need |

Rules:
- Bronze is append-only and replayable: never update it; add `_ingested_at`, `_source_file`, `_batch_id`.
- Silver owns data quality: types, dedupe, key constraints, PII handling.
- Gold is consumer-shaped; one gold table has one owner and a published contract.
- Every layer is a table in a catalog, not loose files.

## Reference Layout

```
s3://acme-lake-prod/
  landing/<source>/<yyyy>/<mm>/<dd>/...
  warehouse/
    bronze.db/<source>_<entity>/      # Iceberg/Delta tables
    silver.db/<domain>_<entity>/
    gold.db/<mart>/
```

Separate buckets (or prefixes with separate IAM) per zone make it easy to give consumers read access to gold only.

## Data Flow

```
source DB --CDC--> Kafka --stream--> bronze (append)
SaaS API  --batch-> landing --load--> bronze (append)
bronze --dedupe/type/MERGE--> silver --aggregate/join--> gold --> BI / ML / reverse ETL
```

Incremental processing between layers:
- Delta: Change Data Feed (`delta.enableChangeDataFeed=true`) or streaming source on the table.
- Iceberg: incremental read by snapshot range (`start-snapshot-id`, `end-snapshot-id`) or `create_changelog_view`.
- Hudi: incremental query from a commit instant.

## Bronze to Silver Example (Spark SQL, Iceberg)

```sql
MERGE INTO lake.silver.customers t
USING (
  SELECT * FROM (
    SELECT *, row_number() OVER (PARTITION BY customer_id ORDER BY _source_ts DESC) AS rn
    FROM lake.bronze.crm_customers
    WHERE _ingested_at > :last_watermark
  ) WHERE rn = 1
) s
ON t.customer_id = s.customer_id
WHEN MATCHED AND s.op = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT *;
```

Store the watermark (last processed snapshot ID or ingestion timestamp) in a control table, updated in the same job after the commit succeeds.

## Silver to Gold

```sql
INSERT OVERWRITE lake.gold.daily_revenue
SELECT order_date, region, sum(amount) AS revenue, count(*) AS orders
FROM lake.silver.orders
WHERE order_date >= date_sub(current_date(), 3)
GROUP BY order_date, region;
```

With Iceberg and `spark.sql.sources.partitionOverwriteMode=dynamic`, only the partitions produced are replaced; recomputing a short trailing window absorbs late data.

## Variants

| Variant | When |
|---|---|
| Two layers (raw + curated) | Small teams, few sources |
| Medallion per domain (data mesh) | Domain teams own silver/gold, platform owns bronze ingestion |
| Lakehouse with warehouse-serving gold | Gold also exposed through Snowflake/BigQuery/Databricks SQL reading Iceberg/Delta |
| Kappa (streaming end to end) | Low latency needs; Flink/Spark streaming between layers |

## Pitfalls
- Business logic in bronze (filters, joins) makes replay impossible.
- Gold tables built directly from bronze duplicate cleansing logic per mart.
- No ownership per table: nobody fixes broken silver tables.
- Copying data into many gold tables instead of views for simple projections.
- Treating "landing" files as the source of truth after loading; keep bronze as the replay point.

## Checklist
- [ ] Each table assigned to a zone, owner and SLA
- [ ] Bronze append-only with ingestion metadata
- [ ] Silver enforces keys, types, dedupe and PII rules
- [ ] Gold contracts documented and versioned
- [ ] Incremental processing uses snapshot/CDF watermarks stored in a control table
- [ ] Zone-level access control (consumers read gold only)
