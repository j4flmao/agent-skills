# Multi-Format Interoperability: Apache XTable and Delta UniForm

Exposing one physical copy of table data to engines that speak different formats. Two main approaches: Apache XTable (incubating), which translates metadata between Iceberg, Delta and Hudi, and Delta Lake UniForm, which makes Delta write Iceberg (and Hudi) metadata alongside its own log.

## When You Need It

| Situation | Approach |
|---|---|
| Databricks writes Delta; Snowflake/Trino/BigQuery want Iceberg | Delta UniForm (Iceberg) |
| Hudi tables must be readable as Iceberg or Delta | XTable |
| Iceberg tables must be readable by a Delta-only consumer | XTable (Iceberg → Delta) |
| Migration between formats with a coexistence period | XTable during transition, then rewrite/cut over |

Rule: one format is the source of truth and the only one written to. Translated metadata is read-only for consumers.

## How Translation Works

Data files (Parquet) are shared. XTable reads the source format's commits and writes equivalent target metadata (Delta log entries, Iceberg snapshots/manifests, Hudi timeline) that reference the same files. Incremental sync translates only new commits since the last sync.

Limits to check:
- Features without equivalents (Delta deletion vectors, Iceberg equality deletes, Hudi MoR log files) may not translate; MoR tables generally need compaction or are unsupported for some directions.
- Partition transforms: Iceberg hidden partitioning maps to generated columns or is limited in Delta targets.
- Column stats and schema evolution are translated, but verify types (timestamps, decimals) per direction.

## XTable Configuration

```yaml
# xtable-config.yaml
sourceFormat: DELTA
targetFormats:
  - ICEBERG
  - HUDI
datasets:
  - tableBasePath: s3://acme-lake/warehouse/silver/orders
    tableName: orders
    partitionSpec: order_date:VALUE      # needed when source is Hudi; optional for others
```

Run the bundled utility:

```bash
java -jar xtable-utilities-<version>-bundled.jar --datasetConfig xtable-config.yaml
```

Options include a catalog configuration file to register targets in Glue/HMS/other catalogs (`--icebergCatalogConfig` for Iceberg target catalogs). Schedule the sync after each source commit (orchestrator task) or on an interval; readers see changes only after sync.

## Delta UniForm

```sql
CREATE TABLE lake.silver.orders (order_id BIGINT, amount DECIMAL(18,2), order_date DATE)
USING delta
TBLPROPERTIES (
  'delta.enableIcebergCompatV2' = 'true',
  'delta.universalFormat.enabledFormats' = 'iceberg'
);

-- enable on an existing table (may require a rewrite/REORG for compatibility)
ALTER TABLE lake.silver.orders SET TBLPROPERTIES (
  'delta.enableIcebergCompatV2' = 'true',
  'delta.universalFormat.enabledFormats' = 'iceberg');
```

Behavior:
- Iceberg metadata is generated asynchronously after Delta commits; Iceberg readers can lag slightly.
- Requires column mapping; deletion vectors must be disabled for IcebergCompatV2 in many versions (check current docs; newer IcebergCompat versions relax this).
- Iceberg clients access the table through a catalog that exposes it (Unity Catalog's Iceberg REST endpoint, HMS/Glue registration).

## Verification

After enabling translation, compare from both sides:

```sql
-- Source (Delta) in Spark
SELECT count(*), sum(amount) FROM lake.silver.orders;
-- Target (Iceberg) in Trino
SELECT count(*), sum(amount) FROM iceberg_cat.silver.orders;
```

Also compare schemas, partition pruning behavior and time-travel availability (target history starts at first sync).

## Operations

| Concern | Practice |
|---|---|
| Sync lag | Monitor the difference between source latest commit time and target latest snapshot time |
| Maintenance | Run vacuum/expire on the source; target metadata must not reference removed files — re-sync after maintenance |
| Writes to target | Forbid by permissions (consumers get read-only roles) |
| Upgrades | XTable/UniForm versions must support source table features; test before enabling new features |

## Alternatives

- Native multi-format reading in engines (many engines read Delta and Iceberg directly).
- Catalog-level federation (Unity Catalog serving Iceberg reads, Snowflake catalog integrations).
- Full rewrite into the target format when interoperability needs are permanent and write ownership moves.

## Pitfalls
- Writing to both the source and translated format: metadata diverges and data is corrupted from one side's view.
- Expecting MoR/delete-vector tables to translate cleanly.
- Running source VACUUM with short retention while the target still references removed files.
- No monitoring of sync lag; consumers read stale data silently.

## Checklist
- [ ] Single writable source format per table
- [ ] Feature compatibility verified for the translation direction
- [ ] Sync scheduled after commits and lag monitored
- [ ] Consumers on translated formats have read-only access
- [ ] Counts/aggregates reconciled across formats after enabling
