# Data Catalog & Virtualization

## Data Catalog Platforms

### Datahub
Open-source metadata platform with column-level lineage, search, and governance.

```
Datahub Architecture:
Frontend (React) → GMS (GraphQL API) → Storage (MySQL/Elasticsearch)
← Ingestion from: dbt, Airflow, Spark, Snowflake, BigQuery
```

**Key features**: Column-level lineage, schema violation detection, data contract enforcement, ownership tracking.

### Amundsen
Metadata discovery platform by Lyft. Search-first design. Best for data discovery.

```
Amundsen Architecture:
Frontend → Search (Elasticsearch) → Metadata (Neo4j) → Databuilder (ETL)
```

**Key features**: Table/column search, popularity ranking, badges, owner tracking.

### OpenMetadata
Open-source with built-in data quality, lineage, and collaboration.

```
OpenMetadata Architecture:
UI → API Server → Database (MySQL/Postgres) → Elasticsearch
→ Ingestion Framework (Python based)
```

**Key features**: Data quality test runner, glossary, team hierarchy, webhook notifications.

### Marquez
Open-source metadata for data lineage and dataops. Focused on lineage tracking.

## Data Versioning

### LakeFS
Git-like operations on data lakes. Branch, commit, merge, revert.

```bash
# LakeFS CLI
lakectl branch create feature-branch \
  --source main \
  --repo my-repo

lakectl commit \
  --repo my-repo \
  --branch feature-branch \
  --message "Added new feature columns"

# Zero-copy branching: branches share underlying data
```

### DVC (Data Version Control)
Version control for ML datasets and models. Integrates with Git.

```bash
dvc add data/training.parquet
git add data/training.parquet.dvc .gitignore
git commit -m "Add training data v2"

# Version datasets alongside code
dvc push  # Upload to remote storage
```

### Delta Lake Time Travel

```python
# Read previous version
df = spark.read.format("delta") \
  .option("versionAsOf", 42) \
  .load("/path/to/table")

# Read by timestamp
df = spark.read.format("delta") \
  .option("timestampAsOf", "2024-01-15") \
  .load("/path/to/table")
```

### Nessie
Git-like semantics for data lakes. Works with Iceberg tables. Catalog-level versioning.

## Data Mesh Concepts

### Domain Ownership
Each domain (marketing, sales, finance) owns its data products. Domain defines schema, quality, SLA.

### Data as a Product
Each data product has: schema documentation, ownership, quality metrics, SLA, versioning, discovery metadata.

### Federated Governance
Global standards: catalog platform, security, identity. Local autonomy: schema, transformations, quality thresholds.

### Self-Serve Infrastructure
Platform team provides: object store, compute engine, catalog, orchestration. Domains consume without managing infrastructure.

## Data Virtualization

### Dremio
SQL query engine with data virtualization. Query across S3, ADLS, GCS, RDBMS, NoSQL, Elasticsearch.

```sql
-- Query across sources
SELECT o.customer_id, o.total, c.name
FROM s3."sales".orders o
JOIN postgres."prod".customers c
  ON o.customer_id = c.id
```

### Starburst (Trino-based)
Starburst Enterprise adds: security, performance (caching, leaderboard), data products, connectors.

### When to Virtualize
- **Use**: Federated queries, prototyping, data lake exploration, cross-source joins
- **Don't use**: High-throughput production, sub-second latency, complex ETL

## Metadata Ingestion Patterns

```yaml
# Datahub ingestion recipe
source:
  type: dbt
  config:
    manifest_path: ./target/manifest.json
    catalog_path: ./target/catalog.json
sink:
  type: datahub-rest
  config:
    server: http://datahub-gms:8080
```

Schedule: full sync daily, incremental on schema change. Validate: column types match, lineage complete.
