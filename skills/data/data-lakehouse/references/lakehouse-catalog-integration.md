# Lakehouse Catalog Integration

The catalog maps table names to current metadata, performs atomic commits (for Iceberg), and increasingly owns governance and credential vending. This reference compares catalogs and shows how engines connect to them.

## 1. Catalog Options

| Catalog | Formats | Interface | Governance | Notes |
|---|---|---|---|---|
| Unity Catalog (Databricks) | Delta, Iceberg (managed + foreign), volumes, models | Databricks APIs, Iceberg REST endpoint, Delta Sharing | Grants, row filters, column masks, lineage, ABAC (platform-dependent) | Open-source Unity Catalog project exists with a smaller feature set |
| Apache Polaris (incubating) / Snowflake Open Catalog | Iceberg | Iceberg REST | Catalog roles, principal roles, credential vending | Snowflake Open Catalog is the managed service |
| AWS Glue Data Catalog | Iceberg, Delta, Hudi, Hive | Glue API, Iceberg REST endpoint | Lake Formation permissions | Native to Athena, EMR, Redshift Spectrum |
| Amazon S3 Tables | Iceberg | Iceberg REST, Glue integration | IAM + Lake Formation | Table buckets with managed compaction and snapshot expiry |
| Project Nessie | Iceberg | Iceberg REST, Nessie API | Basic authz | Git-like branches/tags across tables |
| Lakekeeper | Iceberg | Iceberg REST | OpenFGA-based authz | Rust, self-hosted |
| Hive Metastore | Hive, Iceberg, Delta (limited) | Thrift | Ranger/Sentry if added | Legacy; no credential vending |
| Apache Gravitino | Multiple (federation) | REST, Iceberg REST | Unified metadata across sources | Metadata federation layer |

## 2. The Iceberg REST Catalog Protocol

An OpenAPI spec defining endpoints such as `GET /v1/config`, `GET /v1/{prefix}/namespaces`, `POST /v1/{prefix}/namespaces/{ns}/tables`, `GET .../tables/{table}` (load), `POST .../tables/{table}` (commit), plus OAuth2 token exchange. Benefits:
- Engines need one client implementation for any server.
- The server performs commits, so it can enforce policies and conflict checks centrally.
- Credential vending: on table load the server returns short-lived, table-scoped storage credentials (`X-Iceberg-Access-Delegation: vended-credentials`) so engines need no broad bucket access.
- Remote signing is the alternative delegation mode for S3.

## 3. Engine Configuration Examples

Spark (REST):

```properties
spark.sql.catalog.lake=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.lake.type=rest
spark.sql.catalog.lake.uri=https://polaris.example.com/api/catalog
spark.sql.catalog.lake.warehouse=analytics
spark.sql.catalog.lake.credential=${POLARIS_CLIENT_ID}:${POLARIS_CLIENT_SECRET}
spark.sql.catalog.lake.scope=PRINCIPAL_ROLE:ALL
spark.sql.catalog.lake.header.X-Iceberg-Access-Delegation=vended-credentials
```

Trino (`etc/catalog/lake.properties`):

```properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=https://polaris.example.com/api/catalog
iceberg.rest-catalog.warehouse=analytics
iceberg.rest-catalog.security=OAUTH2
iceberg.rest-catalog.oauth2.credential=${ENV:POLARIS_CREDENTIAL}
iceberg.rest-catalog.vended-credentials-enabled=true
```

Flink SQL:

```sql
CREATE CATALOG lake WITH (
  'type' = 'iceberg', 'catalog-type' = 'rest',
  'uri' = 'https://polaris.example.com/api/catalog',
  'warehouse' = 'analytics',
  'credential' = '${POLARIS_CREDENTIAL}'
);
```

PyIceberg (`~/.pyiceberg.yaml` or env vars `PYICEBERG_CATALOG__LAKE__URI`):

```yaml
catalog:
  lake:
    type: rest
    uri: https://polaris.example.com/api/catalog
    warehouse: analytics
    credential: ${POLARIS_CREDENTIAL}
```

DuckDB:

```sql
INSTALL iceberg; LOAD iceberg;
CREATE SECRET lake_secret (TYPE iceberg, CLIENT_ID '...', CLIENT_SECRET '...',
                           OAUTH2_SERVER_URI 'https://polaris.example.com/api/catalog/v1/oauth/tokens');
ATTACH 'analytics' AS lake (TYPE iceberg, SECRET lake_secret,
                            ENDPOINT 'https://polaris.example.com/api/catalog');
```

Check each engine's documentation for the exact option names in the deployed version; REST-catalog options have changed across releases.

## 4. Unity Catalog Model

Three-level namespace `catalog.schema.object`, with a metastore per region.

```sql
CREATE CATALOG prod MANAGED LOCATION 's3://prod-uc-managed/';
CREATE SCHEMA prod.gold;
GRANT USE CATALOG ON CATALOG prod TO `analysts`;
GRANT USE SCHEMA, SELECT ON SCHEMA prod.gold TO `analysts`;
GRANT MODIFY ON TABLE prod.gold.daily_revenue TO `etl-service-principal`;
```

- Storage is accessed through storage credentials and external locations, not user-held cloud keys.
- External engines read Unity Catalog tables via its Iceberg REST endpoint (UniForm or managed Iceberg) or Delta Sharing.

## 5. Glue + Lake Formation

```python
spark.conf.set("spark.sql.catalog.glue", "org.apache.iceberg.spark.SparkCatalog")
spark.conf.set("spark.sql.catalog.glue.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog")
spark.conf.set("spark.sql.catalog.glue.warehouse", "s3://lake-warehouse/")
```

Lake Formation grants (database/table/column, LF-tags) apply to Athena, EMR, Redshift Spectrum, and Glue jobs when the S3 location is registered with Lake Formation. Engines outside AWS integrations bypass it unless they use credential vending.

## 6. Migrating Between Catalogs

- Iceberg `register_table` adds an existing table (by metadata file location) to another catalog: `CALL new.system.register_table('db.t', 's3://.../metadata/00042-....metadata.json')`.
- After registering, stop writes through the old catalog; two catalogs committing to one table fork its history.
- Hive tables convert in place with `CALL cat.system.migrate('db.hive_table')` or are trialled with `snapshot`.

## Pitfalls

- Engines configured with static cloud keys that bypass catalog permissions.
- Mixing catalogs for writes to the same table.
- Assuming governance features (masks, row filters) are enforced by every engine; they are enforced only by engines integrated with that catalog's policy layer.
- Ignoring catalog availability: it is on the critical path of every query plan and commit.

## Checklist

- [ ] One authoritative catalog per table; documented in an ADR.
- [ ] Engines authenticate with OAuth2/service identities; credential vending enabled.
- [ ] Grants managed as code (Terraform or SQL in CI).
- [ ] Catalog backed up / highly available; runbook for outages.
- [ ] Policy enforcement verified for every engine that reads sensitive tables.
