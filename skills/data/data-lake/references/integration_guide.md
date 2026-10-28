# Query Engine Integration: Reading and Writing Lake Tables from Multiple Engines

How to connect Spark, Trino, Flink, DuckDB and cloud warehouses to the same lake tables through a shared catalog, and what each engine supports. Catalog choice drives interoperability more than file format.

## Catalog First

| Catalog | Formats | Notes |
|---|---|---|
| Iceberg REST catalog (Apache Polaris, Lakekeeper, Gravitino, Nessie's REST API, AWS Glue/S3 Tables REST endpoints, Unity Catalog Iceberg REST) | Iceberg | Engine-neutral HTTP spec; supports credential vending |
| AWS Glue Data Catalog | Iceberg, Delta, Hudi | Native for Athena/EMR/Redshift |
| Hive Metastore | Iceberg, Delta, Hudi | Legacy but widely supported |
| Unity Catalog | Delta, Iceberg (via UniForm / managed Iceberg) | Databricks; OSS Unity Catalog also exists |
| Nessie | Iceberg | Git-like branches across tables (see `nessie-catalog.md`) |

One table should have exactly one authoritative catalog; registering the same Iceberg table in two catalogs that both commit leads to lost updates.

## Spark

Covered in `configuration_guide.md`. Spark supports full DML (MERGE/UPDATE/DELETE) and all maintenance procedures for Iceberg, Delta and Hudi.

## Trino

```properties
# etc/catalog/lake.properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=https://catalog.internal/api/catalog
iceberg.rest-catalog.warehouse=prod
iceberg.rest-catalog.security=OAUTH2
iceberg.rest-catalog.oauth2.credential=${ENV:LAKE_CLIENT_ID}:${ENV:LAKE_CLIENT_SECRET}
iceberg.rest-catalog.vended-credentials-enabled=true
fs.native-s3.enabled=true
```

Delta: `connector.name=delta_lake` with `hive.metastore.uri` or Glue. Hudi: `connector.name=hudi` (read-only).

Trino Iceberg features: reads/writes, MERGE, `ALTER TABLE ... EXECUTE optimize`, `expire_snapshots`, `remove_orphan_files`, time travel (`FOR VERSION AS OF`, `FOR TIMESTAMP AS OF`), metadata tables (`"orders$snapshots"`).

```sql
ALTER TABLE lake.silver.orders EXECUTE optimize(file_size_threshold => '128MB');
ALTER TABLE lake.silver.orders EXECUTE expire_snapshots(retention_threshold => '7d');
SELECT * FROM lake.silver."orders$files" LIMIT 10;
```

## Flink

```sql
CREATE CATALOG lake WITH (
  'type' = 'iceberg',
  'catalog-type' = 'rest',
  'uri' = 'https://catalog.internal/api/catalog',
  'warehouse' = 'prod'
);
```

Flink is the usual streaming writer (append/upsert); batch maintenance typically stays in Spark. See `flink_state_management_6.md`.

## DuckDB

```sql
INSTALL iceberg; LOAD iceberg;
INSTALL httpfs; LOAD httpfs;
CREATE SECRET (TYPE s3, PROVIDER credential_chain);

-- Direct metadata read
SELECT count(*) FROM iceberg_scan('s3://lake/warehouse/silver/orders');

-- Iceberg REST catalog (recent DuckDB versions)
ATTACH 'prod' AS lake (TYPE iceberg, ENDPOINT 'https://catalog.internal/api/catalog');

-- Delta
INSTALL delta; LOAD delta;
SELECT * FROM delta_scan('s3://lake/silver/orders_delta') LIMIT 10;
```

DuckDB is ideal for local analysis, tests and small services; write support depends on the extension version.

## Python Without JVM

- PyIceberg (Iceberg read/write, REST/Glue/Hive/SQL catalogs).
- `deltalake` (delta-rs) for Delta read/write.
- Polars: `pl.scan_iceberg(table)` and `pl.scan_delta(path)` for lazy reads.

## Cloud Warehouses

| Warehouse | Lake access |
|---|---|
| Snowflake | Iceberg tables (Snowflake-managed or external catalog via catalog integration, including REST) |
| BigQuery | BigLake Iceberg tables; BigLake metastore |
| Redshift / Athena | Iceberg via Glue; Athena supports Iceberg DML and `OPTIMIZE`/`VACUUM` |
| Databricks SQL | Delta native; Iceberg reads via UniForm or managed Iceberg |
| Microsoft Fabric / Synapse | Delta (OneLake); Iceberg via shortcuts/virtualization |

## Feature Compatibility Matrix (verify per version)

Before enabling a feature, check every engine that reads the table:

| Feature | Risk |
|---|---|
| Iceberg format v3 | Older engines cannot read |
| Delta deletion vectors / column mapping / liquid clustering | Readers must support the table feature |
| Iceberg equality deletes | Some engines read slowly or not at all |
| Iceberg views | Dialect-specific SQL representations |

## Pitfalls
- Two catalogs committing to the same table.
- Engines on mismatched format library versions silently ignoring new metadata (e.g. a reader that does not apply delete files).
- Static S3 keys distributed to every engine instead of vended, scoped credentials.
- Assuming a BI tool's lake connector supports writes or MoR reads.

## Checklist
- [ ] Single authoritative catalog per table
- [ ] Engine inventory with versions and supported features
- [ ] Credential vending or role-based access per engine
- [ ] Maintenance runs in one engine with full procedure support
- [ ] Compatibility check before any table feature upgrade
