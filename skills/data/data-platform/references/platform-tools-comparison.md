# Platform Tools Comparison

## Storage Engines

| Feature | S3 | ADLS Gen2 | GCS | MinIO |
|---|---|---|---|---|
| API | S3 REST | REST + Hadoop ABFS | JSON/XML + gRPC | S3-compatible |
| Consistency | Read-after-write | Strong | Strong | Strong |
| Auth | IAM, Bucket Policy, Presigned URL | RBAC, SAS, AAD | IAM, Service Account, Signed URL | JWT, OIDC, LDAP, IAM |
| Encryption | SSE-S3/KMS/CSE | SSE-AES/KMS/CMK | Google/CMEK/CSE | KMS + auto |
| Object Lock | Yes (compliance/legal hold) | Yes (WORM policy) | Yes (retention policy) | Yes (bucket config) |
| Lifecycle | Transition → Glacier → Expire | Hot → Cool → Archive | Standard → Nearline → Cold → Archive | Bucket policy expire |
| Multi-region | CRR, SRR | GRS, RA-GRS | Dual-region, multi-region | External replication |
| Max object | 5 TB | 4.75 TB | 5 TB | 100 TB (config) |
| Cost/TB/mo | ~$23 | ~$20 | ~$20 | Hardware + overhead |

## Table Format Features

| Capability | Delta Lake | Apache Iceberg | Apache Hudi |
|---|---|---|---|
| ACID | Yes | Yes | Yes |
| Time travel | Yes (7-30 day default) | Yes (snapshot isolation) | Yes (instant-based) |
| Schema evolution | Add/drop/rename/type change | Add/drop/rename/reorder | Add/drop/rename/type change |
| Partition evolution | Rewrite required | Yes (hidden partitioning) | Yes (partition transforms) |
| Engine support | Spark, Trino, Flink, Presto | Spark, Trino, Flink, Presto, Dremio, Hive | Spark, Flink, Presto, Hive |
| Merge/upsert | MERGE INTO | MERGE INTO (v2) | Full upsert (MOR/COW) |
| Incremental queries | Yes (change data feed) | Yes (incremental read) | Yes (incremental pull) |
| Optimized writes | Auto-compaction | Compaction + bin-packing | Clustering + compaction |
| Catalog types | Hive, Unity, custom | Hive, REST, Glue, Nessie, JDBC | Hive, Glue |

## Compute Comparison

| Feature | Apache Spark | Trino | Apache Flink |
|---|---|---|---|
| Primary use | ETL, ML, batch | Interactive SQL, federation | Stream processing |
| API | DataFrame, SQL, RDD, MLlib | SQL only | DataStream, SQL, Table |
| State mgmt | RDD lineage | Stateless | RocksDB, FsState |
| Exactly-once | Yes (sink-dependent) | Yes | Yes (checkpoints) |
| SQL standard | Spark SQL (subset) | ANSI SQL (full) | Flink SQL |
| Federation | JDBC, Spark sources | Connectors: 40+ sources | Connectors: JDBC, Kafka, S3 |
| Autoscaling | Dynamic executors | Worker auto-scale | TaskManager rebalance |
| Cost efficiency | Spot with executors | Spot, coordinator dedicated | Spot with stateful rebalance |

## Storage Pricing Comparison (Per TB/Month, us-east)

| Provider | Hot | Cool/Cold | Archive | Retrieval (hot→cold) |
|---|---|---|---|---|
| S3 Standard | $23 | S3 IA: $12.50 | Glacier: $4, Deep Archive: $1 | $0.01/1K req |
| ADLS Gen2 | $20 | Cool: $10 | Cold: $4.50, Archive: $2 | $0.01/1K req |
| GCS Standard | $20 | Nearline: $10 | Coldline: $4.50, Archive: $1.50 | $0.01/1K req |
| MinIO (NVMe) | $8-12 | HDD: $4-6 | Tape: $1-2 | Free (internal) |
| MinIO (NVMe + ECC) | $15-20 | HDD + EC: $8-12 | — | Free (internal) |

Note: Cloud pricing includes SLA (99.99%), MinIO requires operational overhead for HA, DR, monitoring.

## Performance Benchmarks

### Read Throughput (1 TB scan, 100 concurrent)

| Engine | S3 (100Gb) | ADLS (100Gb) | GCS (100Gb) | MinIO (25Gb NVMe) |
|---|---|---|---|---|
| Spark (1k cores) | 8.2 GB/s | 7.8 GB/s | 8.5 GB/s | 2.1 GB/s |
| Trino (200 workers) | 6.5 GB/s | 6.1 GB/s | 6.8 GB/s | 1.8 GB/s |
| Flink (500 TMs) | 5.8 GB/s | 5.5 GB/s | 6.0 GB/s | 1.5 GB/s |

### Write Throughput (100 GB sort-merge)

| Engine | S3 | ADLS | GCS | MinIO |
|---|---|---|---|---|
| Spark | 2.1 GB/s | 2.0 GB/s | 2.3 GB/s | 0.8 GB/s |
| Trino INSERT | 1.5 GB/s | 1.4 GB/s | 1.6 GB/s | 0.5 GB/s |
| Flink checkpoint | 3.0 GB/s | 2.8 GB/s | 3.1 GB/s | 1.0 GB/s |

### Query Latency (Trino, 1 TB TPCH, 10 concurrent)

| Format | Cold Cache | Warm Cache |
|---|---|---|
| Iceberg (Parquet ZSTD) | 8.2s | 1.1s |
| Delta Lake (Parquet Snappy) | 9.5s | 1.4s |
| Hudi (Parquet ZSTD) | 10.1s | 1.5s |
| Raw Parquet (no table format) | 11.3s | 2.0s |

## Integration Compatibility Matrix

| Tool | S3 | ADLS | GCS | MinIO |
|---|---|---|---|---|
| Apache Spark | Native (Hadoop AWS) | Native (ABFS) | Native (GCS Connector) | Native (S3A) |
| Apache Flink | S3A FileSystem | ABFS | GCS Connector | S3A |
| Trino | Hive/Iceberg connector | ABFS connector | Hive/GCS connector | Hive connector |
| Apache Kafka | S3 Sink Connector | ADLS Sink | GCS Sink | S3-compat Sink |
| Airflow | S3Hook | WasbHook | GCSHook | S3Hook |
| dbt | dbt-snowflake/postgres | Synapse/BigQuery | BigQuery | Postgres/Trino |
| LakeFS | Native | Gateway | Gateway | Native |
| MinIO | — | Gateway | Gateway | Native |

## Storage Tier Strategy

```yaml
tier_strategy:
  bronze:
    storage: S3 Standard
    retention: 30 days
    lifecycle: → IA after 30d, → Glacier after 90d
    use_case: "Raw ingested data, reprocessing capability"
  silver:
    storage: S3 Standard
    retention: 90 days
    lifecycle: → IA after 90d, → Glacier after 365d
    use_case: "Cleaned data, active ML feature engineering"
  gold:
    storage: S3 Standard (no lifecycle)
    retention: 730 days
    use_case: "Business-ready aggregates, BI consumption"
  archive:
    storage: S3 Glacier Deep Archive
    retention: 7 years
    use_case: "Compliance, audit, historical analysis"
```

## Deployment Patterns

| Pattern | Storage | Compute | Provisioning | Best For |
|---|---|---|---|---|
| All-in-cloud | S3 | EMR + Trino ECS | Terraform | AWS native |
| Kubernetes native | MinIO | Spark on K8s Operator | Helm + Karpenter | Multi-cloud |
| Serverless | S3/GCS | AWS Athena, BigQuery | Cloud SDK | Ad-hoc analytics |
| Hybrid | S3 + on-prem HDFS | Dataproc + local Spark | Terraform + Ansible | Migration phase |
| Edge | MinIO | Spark on ARM | Docker Compose | IoT, remote sites |
