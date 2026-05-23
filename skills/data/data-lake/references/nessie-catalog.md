# Nessie Catalog — Git for Iceberg

## Architecture

Nessie provides Git-like version control semantics for data lakes at the Iceberg catalog level. Instead of versioning entire object stores (like LakeFS), Nessie versions table metadata (schemas, partitions, snapshot references) via the Iceberg REST Catalog API.

### Components
- **Nessie Server**: REST API server (HTTP/HTTPS) managing catalog state
- **Iceberg REST Catalog**: Nessie implements the Iceberg REST Catalog spec — any Iceberg engine can use it
- **Version Store**: backend for storing commits, branches, tags (in-memory, MongoDB, DynamoDB, RocksDB)
- **GC Service**: optional garbage collection for unreferenced data files

## Operations

### Setup
```bash
# Start Nessie server (Docker)
docker run -p 19120:19120 ghcr.io/projectnessie/nessie:latest

# Configure Spark to use Nessie catalog
spark.sql.catalog.nessie = org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.nessie.catalog-impl = org.apache.iceberg.nessie.NessieCatalog
spark.sql.catalog.nessie.uri = http://nessie:19120/api/v1
spark.sql.catalog.nessie.ref = main  # default branch
spark.sql.catalog.nessie.warehouse = s3://data-lake/iceberg
```

### Branching and Merging
```sql
-- Create branch for development
CREATE BRANCH dev_etl IN nessie;

-- Switch Spark session to dev branch
-- spark.sql.catalog.nessie.ref = dev_etl

-- Write to dev branch (isolated from main)
CREATE OR REPLACE TABLE nessie.analytics.daily_metrics AS
SELECT order_date, SUM(amount) AS revenue FROM nessie.raw.orders GROUP BY 1;

-- Switch back to main and merge
-- spark.sql.catalog.nessie.ref = main
MERGE BRANCH dev_etl INTO main IN nessie;
```

### Python API
```python
from pynessie import NessieClient

client = NessieClient('http://nessie:19120/api/v2')

# List branches
branches = client.list_branches()
for branch in branches:
    print(branch.name, branch.hash)

# Create branch from main
client.create_branch('experiment-feature-x', 'main')

# Commit metadata
client.commit(
    branch='experiment-feature-x',
    message='Add revenue column to orders',
    operations=[
        Put(
            key=ContentKey.of('analytics', 'orders'),
            content=IcebergTable.of(...)
        )
    ]
)

# Merge with conflict detection
client.merge('experiment-feature-x', 'main')

# Tag a release
client.create_tag('prod-release-2024-05-01', 'main')
```

### Time Travel Across Catalog
```sql
-- Query table as of a Nessie reference
SELECT * FROM nessie.analytics.orders
  FOR SYSTEM_VERSION AS OF 'main@2024-01-15T10:00:00Z';

-- Query table on a specific branch
SELECT * FROM nessie.analytics.orders
  OPTIONS ('branch' = 'experiment-feature-x');

-- Compare across branches (via Spark)
-- Read from dev branch, compare with main
```

## Use Cases

### Multi-Table Atomic Operations
```python
# Atomic commit: update multiple tables as a single Nessie commit
client.commit(
    branch='main',
    message='ETL job 2024-05-01: update orders + customers',
    operations=[
        Put(key=ContentKey.of('analytics', 'orders'), content=orders_content),
        Put(key=ContentKey.of('analytics', 'customers'), content=customers_content),
    ]
)
# Either all tables update atomically, or none do
```

### CI/CD for Data
```
Dev branch:   data engineers transform and validate
                    ↓
Staging tag:  quality checks, data diff reviews
                    ↓
Main branch:  production data (immutable)
                    ↓
Release tag:  audit point, ML training checkpoint
```

## Performance and Limitations

| Aspect | Detail |
|--------|--------|
| Scalability | 10k+ tables per Nessie instance |
| Commit latency | < 100ms for single-table commits |
| Branch count | Thousands of branches supported |
| Storage | Only metadata — data files stay in object store |
| GC | Separate service for orphan file cleanup |
| Auth | AWS IAM, OIDC, basic auth supported |
