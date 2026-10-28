# Lakehouse Integration Guide: Sources In, Consumers Out

How data enters a lakehouse (CDC, streams, SaaS connectors, files) and how it leaves (BI tools, sharing, reverse ETL, other engines). Catalog-specific setup lives in `lakehouse-catalog-integration.md`.

## 1. Ingestion Options

| Source | Tooling | Lands as |
|---|---|---|
| OLTP databases | Debezium (Kafka Connect), Flink CDC, AWS DMS, Fivetran, Airbyte, Databricks Lakeflow Connect | CDC events in bronze, merged to silver |
| Kafka topics | Iceberg Kafka Connect sink, Spark/Flink streaming, Confluent Tableflow | Append tables |
| SaaS APIs | Fivetran, Airbyte, dlt, custom jobs | Bronze per source object |
| Files on object storage | Databricks Auto Loader, Spark file streams, `COPY INTO`, Snowpipe | Bronze |
| Other lakehouses/warehouses | Delta Sharing, Iceberg REST catalog federation, zero-copy reads | Read in place |

## 2. Database CDC with Debezium → Kafka → Lakehouse

Debezium connector (Postgres):

```json
{
  "name": "pg-orders",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "pg.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${file:/secrets/pg.properties:password}",
    "database.dbname": "shop",
    "topic.prefix": "shop",
    "plugin.name": "pgoutput",
    "table.include.list": "public.orders,public.customers",
    "snapshot.mode": "initial"
  }
}
```

Events carry `op` (`c`, `u`, `d`, `r` for snapshot reads), `before`, `after`, and `source.lsn`. Land them raw in bronze, then apply with `MERGE` ordered by `lsn` (see `architecture-patterns.md`).

Operational notes:
- Postgres logical replication slots retain WAL until consumed; a stopped connector can fill the source disk. Alert on slot lag.
- Schema changes upstream flow through as new fields; bronze should accept them, silver changes deliberately.

## 3. Kafka → Iceberg with Kafka Connect

The Apache Iceberg project ships a Kafka Connect sink (`org.apache.iceberg.connect.IcebergSinkConnector`):

```json
{
  "name": "iceberg-orders",
  "config": {
    "connector.class": "org.apache.iceberg.connect.IcebergSinkConnector",
    "topics": "orders",
    "iceberg.tables": "bronze.orders",
    "iceberg.catalog.type": "rest",
    "iceberg.catalog.uri": "https://catalog.example.com",
    "iceberg.control.commit.interval-ms": "300000",
    "iceberg.tables.auto-create-enabled": "true",
    "iceberg.tables.evolve-schema-enabled": "true"
  }
}
```

It coordinates commits across tasks through a control topic so each interval produces one table commit with exactly-once semantics.

## 4. File Ingestion (Auto Loader example)

```python
(spark.readStream.format("cloudFiles")
   .option("cloudFiles.format", "json")
   .option("cloudFiles.schemaLocation", "s3://lake-ckpt/schemas/partner_feed")
   .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
   .load("s3://landing/partner_feed/")
   .writeStream
   .option("checkpointLocation", "s3://lake-ckpt/partner_feed")
   .trigger(availableNow=True)
   .toTable("bronze.partner_feed"))
```

`availableNow` processes everything new, then stops: incremental batch with streaming bookkeeping.

## 5. Consumers

| Consumer | Integration |
|---|---|
| BI (Power BI, Tableau, Looker, Superset) | Through a SQL engine: Databricks SQL, Trino/Starburst, Athena, Snowflake, Dremio |
| Notebooks / ad hoc | Spark, DuckDB (`iceberg`/`delta` extensions), Polars, PyIceberg |
| ML training | Read Parquet-backed tables directly; pin a snapshot/version for reproducibility |
| External partners | Delta Sharing; Iceberg REST catalog with scoped credentials |
| Operational systems | Reverse ETL (Hightouch, Census) or export jobs from gold |

## 6. Delta Sharing

Open protocol for sharing tables without copying; recipients use Spark, pandas, Power BI, or Databricks.

```sql
-- Provider (Databricks Unity Catalog)
CREATE SHARE partner_sales;
ALTER SHARE partner_sales ADD TABLE prod.gold.daily_revenue
  PARTITION (region = 'EU') AS sales.daily_revenue_eu;
CREATE RECIPIENT acme;                       -- open sharing: generates an activation link
GRANT SELECT ON SHARE partner_sales TO RECIPIENT acme;
```

```python
# Recipient (open-source connector, package: delta-sharing)
import delta_sharing
profile = "/secure/acme.share"               # credential file from the activation link
df = delta_sharing.load_as_pandas(f"{profile}#partner_sales.sales.daily_revenue_eu")
```

Share only gold tables or views, scope by partition, and rotate recipient tokens; Databricks-to-Databricks sharing uses identity instead of bearer tokens.

## 7. Multi-Engine Access

- Single catalog, many engines: Spark writes, Trino/Athena/Snowflake read through the same Iceberg REST catalog.
- Delta tables can expose Iceberg metadata through UniForm (`delta.universalFormat.enabledFormats = 'iceberg'`) for Iceberg readers.
- Apache XTable translates metadata between Delta, Iceberg, and Hudi without copying data.
- Only one engine family should write a given table unless all writers use the same catalog for commits.

## Pitfalls

- Pointing BI tools directly at object storage paths, bypassing catalog permissions.
- CDC without the snapshot phase: silver lacks rows that existed before the connector started.
- Treating shared tables as an API without versioning: schema changes break partners.
- Multiple writers committing through different catalogs to the same table location: corrupt history.

## Checklist

- [ ] Each source has a documented connector, landing table, and owner.
- [ ] CDC lag and replication-slot growth monitored.
- [ ] Consumers access data through a governed engine or catalog.
- [ ] External shares limited to gold, partition-scoped, with token rotation.
- [ ] One commit path (catalog) per table.
