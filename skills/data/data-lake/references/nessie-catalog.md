# Project Nessie: Git-Like Catalog for Iceberg

Nessie is a transactional catalog that versions the state of all tables together, with branches, tags, commits and merges. Use it for multi-table atomic publishes, isolated experimentation and reproducible snapshots of the whole lake.

## Concepts

| Concept | Meaning |
|---|---|
| Reference | Branch or tag; `main` is the default branch |
| Commit | Atomic change to one or more table pointers (metadata locations) |
| Branch | Mutable reference; jobs write to it in isolation |
| Tag | Immutable named point (e.g. month-end close) |
| Merge / transplant | Apply commits from one branch to another |

Nessie stores only catalog pointers and metadata; data and Iceberg metadata files stay in object storage. Cross-branch isolation does not copy data.

## Deployment

- Server: container image `ghcr.io/projectnessie/nessie` (Quarkus); version store backends include PostgreSQL/JDBC, MongoDB, Cassandra, DynamoDB, Bigtable, RocksDB (single node), in-memory (tests).
- Nessie also serves the Iceberg REST catalog API (under `/iceberg`), so engines can use the standard REST client; branch selection is part of the warehouse/prefix configuration.
- Authentication: OpenID Connect; authorization rules on references and content.

## Spark Configuration (Nessie catalog client)

```properties
spark.sql.extensions=org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions,org.projectnessie.spark.extensions.NessieSparkSessionExtensions
spark.sql.catalog.nessie=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.nessie.catalog-impl=org.apache.iceberg.nessie.NessieCatalog
spark.sql.catalog.nessie.uri=https://nessie.internal/api/v2
spark.sql.catalog.nessie.ref=main
spark.sql.catalog.nessie.warehouse=s3://acme-lake/warehouse
spark.sql.catalog.nessie.io-impl=org.apache.iceberg.aws.s3.S3FileIO
spark.sql.catalog.nessie.authentication.type=OAUTH2
```

Packages: `iceberg-spark-runtime`, `nessie-spark-extensions` matching the Spark version. Alternatively configure `type=rest` against Nessie's Iceberg REST endpoint and omit the Nessie-specific client.

## Branch Workflow (Spark SQL with Nessie extensions)

```sql
CREATE BRANCH IF NOT EXISTS etl_20261027 IN nessie FROM main;
USE REFERENCE etl_20261027 IN nessie;

-- all writes in this session now land on the branch
MERGE INTO nessie.silver.orders t USING staged_orders s ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET * WHEN NOT MATCHED THEN INSERT *;
INSERT OVERWRITE nessie.gold.daily_revenue SELECT ...;

-- validate on the branch, then publish both tables atomically
MERGE BRANCH etl_20261027 INTO main IN nessie;
DROP BRANCH etl_20261027 IN nessie;
```

Also available: `CREATE TAG`, `SHOW REFERENCES`, `SHOW LOG <ref>`, `ASSIGN BRANCH`, and reading a specific ref with `table@ref` (e.g. `SELECT * FROM nessie.\`silver.orders@etl_20261027\``).

## CLI and Python

```bash
nessie --endpoint https://nessie.internal/api/v2 branch etl_20261027 main
nessie log etl_20261027
nessie merge etl_20261027 -b main
nessie tag eom_2026_09 main
```

PyIceberg can use Nessie through its Iceberg REST API.

## Use Cases

| Use case | Pattern |
|---|---|
| Multi-table write-audit-publish | One branch per pipeline run, merge after checks |
| Experimentation / dev | Branch from `main`, run changed jobs, compare, discard |
| Reproducible ML training | Tag the lake state used to train each model |
| Disaster recovery of a bad publish | Reassign `main` to a previous commit hash |

## Garbage Collection

Iceberg `expire_snapshots` per table is not branch-aware. With Nessie, use the Nessie GC tool, which computes files that are unreferenced across all live references (with a cutoff policy), then deletes them. Running per-table expiration alone can delete files still referenced by another branch.

## Merge Semantics and Conflicts

- Merges apply content changes per table key; if the same table was changed on both sides since the common ancestor, the merge fails by default (no automatic data-level merge).
- Keep branches short-lived; rebase-like recovery means re-running jobs on a fresh branch.

## Pitfalls
- Long-lived branches diverging from `main`: merges conflict and data is duplicated in storage.
- Mixing Nessie-managed tables with per-table maintenance that deletes files.
- Writers using different references unintentionally because the session default ref changed.
- Treating Nessie as a substitute for access control on storage.

## Checklist
- [ ] Nessie version store on a durable backend with backups
- [ ] Branch-per-run convention and automatic cleanup of merged branches
- [ ] Nessie GC used instead of independent per-table file deletion
- [ ] Tags for audit-relevant states
- [ ] OIDC authentication and reference-level authorization configured
