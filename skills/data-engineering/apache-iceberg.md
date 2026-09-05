# Apache Iceberg (Modern Data Lakehouse)

## 1. Skill Context
**Focus**: Open table formats that bring ACID transactions and SQL-like performance to massive object storage (AWS S3) without a traditional Data Warehouse.
**Triggers**: apache-iceberg, data-lakehouse, parquet, open-table-format.

## 2. The Hive Problem
Legacy Data Lakes (Hive) tracked data using physical folders (e.g., s3://bucket/year=2023/month=10/). To run a query, the engine had to perform an O(N) directory listing on S3, which is incredibly slow and error-prone.

## 3. Iceberg's Metadata Tree
Iceberg tracks data at the **File Level**, not the folder level.
1. **Snapshot**: Represents the state of the table at a specific point in time.
2. **Manifest List**: A list of manifest files that make up the snapshot.
3. **Manifest File**: Keeps track of individual Parquet data files, including min/max statistics for every column.
- **Result**: When querying WHERE id = 5, Iceberg reads the manifests, checks the min/max stats, and skips downloading 99% of the Parquet files from S3.

## 4. Features
- **Time Travel**: You can query the database exactly as it looked last Tuesday (FOR SYSTEM_TIME AS OF ...).
- **Hidden Partitioning**: You partition by day(timestamp) without creating a separate column. If you change the partition scheme later, older data continues to work flawlessly.
