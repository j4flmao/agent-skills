# Distributed Storage Fundamentals for Data Workloads

Core concepts behind object stores (S3, GCS, ADLS Gen2, MinIO, Ceph RGW) and distributed file systems (HDFS) as used by analytics and ML platforms: storage models, durability, consistency, metadata, file layout, and cost drivers.

## Storage Models

| Model | Interface | Examples | Strengths | Limits |
|-------|-----------|----------|-----------|--------|
| Object | HTTP API (PUT/GET/LIST/DELETE whole objects) | S3, GCS, Azure Blob, MinIO, Ceph RGW | Near-unlimited scale, cheap, durable, decoupled from compute | No in-place updates or appends (mostly); rename = copy + delete; per-request latency |
| Distributed file system | POSIX-like or HDFS API | HDFS, CephFS, Lustre, GPFS | Directories, atomic rename, appends, data locality | Operational burden; NameNode/metadata scaling |
| Hierarchical-namespace object | Object + real directories | ADLS Gen2, GCS hierarchical namespace buckets | Atomic directory rename, ACLs | Provider-specific |
| Block | Volumes attached to hosts | EBS, Persistent Disk, Ceph RBD | Low latency for databases | Not shared across many readers |

Modern lakehouses separate compute from storage and use object storage as the system of record.

## Durability vs Availability

- Durability: probability data is not lost. Providers achieve it with replication or erasure coding across devices and failure domains (S3 Standard is designed for 11 nines across at least three Availability Zones).
- Availability: probability a request succeeds now. Expressed in SLAs (e.g. 99.9%-99.99% depending on class).
- Single-zone classes (S3 One Zone-IA, S3 Express One Zone) trade AZ-loss resilience for cost or latency.

## Replication vs Erasure Coding

| Scheme | Storage overhead | Tolerates | Repair cost | Use |
|--------|-----------------|-----------|-------------|-----|
| 3x replication | 200% extra | 2 lost copies | Copy one replica | Hot data, HDFS default |
| EC RS(6,3) | 50% extra | Any 3 of 9 fragments | Read 6 fragments to rebuild | Warm/cold data, HDFS 3 EC, Ceph, MinIO |
| EC RS(10,4) | 40% extra | Any 4 of 14 | Read 10 | Large clusters |

Erasure coding saves capacity but increases CPU, network on repair, and small-read latency.

## Consistency

- Amazon S3: strong read-after-write consistency for PUT, overwrite PUT and DELETE, and strongly consistent LIST, since December 2020. No more "eventual consistency" workarounds (S3Guard is obsolete).
- GCS and Azure Blob: strongly consistent object operations.
- Concurrent writers to the same key: last writer wins. For coordination use conditional writes: S3 supports `If-None-Match: *` (create-if-absent) and `If-Match` with ETags on PUT; GCS has generation preconditions; Azure uses ETag conditions.
- Multi-object operations are not atomic. Table formats (Delta Lake, Apache Iceberg, Apache Hudi) provide atomic commits via a metadata log plus a catalog or conditional write.

## Rename Semantics

On object stores, renaming a "directory" is a copy of every object followed by deletes: slow and non-atomic. Consequences:
- Classic Hadoop output committers (write to `_temporary` then rename) are slow and unsafe on S3. Use the S3A magic/staging committers or table formats that write files once and commit metadata.
- Prefer formats that never rename data files.

## Metadata Scaling

| System | Metadata location | Scaling issue |
|--------|-------------------|---------------|
| HDFS | NameNode memory (roughly 150 bytes per file/block object) | Hundreds of millions of files strain heap; small files hurt |
| Object store | Provider's distributed index | LIST is paginated (1,000 keys per page in S3); listing huge prefixes is slow |
| Table formats | Manifest files | Planning needs compaction of metadata too |

## The Small Files Problem

Many tiny files increase request counts, list time, task scheduling overhead and NameNode memory. Targets for analytics:
- Parquet/ORC files roughly 128 MB to 1 GB.
- Row groups around 128 MB (engine-dependent).
- Compact streaming output periodically (Delta `OPTIMIZE`, Iceberg `rewrite_data_files`, Hudi clustering).

## Request Rates and Prefixes

S3 supports at least 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second per partitioned prefix, scaling by partitioning automatically as load grows. Sudden spikes can see `503 Slow Down` until it scales; clients must retry with backoff. Spread hot workloads across prefixes when designing key layouts for very high request rates.

## Data Layout

```
s3://lake/bronze/events/ingest_date=2026-10-27/part-00000.parquet
s3://lake/silver/orders/order_date=2026-10-27/region=eu/...
```

- Partition by columns used in filters with moderate cardinality (date, region). Avoid high-cardinality partitions (user_id) which create millions of tiny directories.
- Iceberg hidden partitioning and partition evolution remove the need for users to know partition columns.

## File Formats

| Format | Type | Use |
|--------|------|-----|
| Parquet | Columnar | Default for analytics |
| ORC | Columnar | Hive-centric stacks |
| Avro | Row, schema-embedded | Streaming ingestion, Kafka |
| JSON/CSV | Row, text | Landing raw data only |

Compression: Snappy (fast), ZSTD (better ratio, widely supported, good default for Parquet), Gzip (not splittable for text files).

## Cost Drivers

| Driver | Notes |
|--------|-------|
| Capacity (GB-month) | Varies by class; lifecycle to cheaper tiers |
| Requests | PUT/LIST cost more than GET; small files multiply cost |
| Retrieval fees | Infrequent-access and archive classes charge per GB retrieved |
| Minimum durations/sizes | IA/Glacier classes bill minimum days and minimum object size |
| Egress | Cross-region and internet transfer; keep compute in the same region |

## Security Basics

- Block public access at account and bucket level.
- Encryption at rest (SSE-S3/SSE-KMS or provider equivalents) and TLS in transit.
- Least-privilege IAM per workload; bucket policies limiting access to VPC endpoints where appropriate.
- Versioning plus Object Lock for ransomware/accidental deletion protection.

## Checklist

- [ ] Storage model chosen per workload (object for lake, block for DBs)
- [ ] Durability/availability class matches data criticality
- [ ] Atomicity handled by a table format, not renames
- [ ] File sizes and partitioning designed to avoid small files
- [ ] Retries with backoff for 503/throttling
- [ ] Cost model includes requests, retrieval and egress
- [ ] Public access blocked, encryption and versioning enabled
