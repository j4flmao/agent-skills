# Audit Log Storage Comparison

## Decision Matrix

| Requirement | PostgreSQL | ClickHouse | Elasticsearch | S3 + Athena | Kafka |
|-------------|-----------|------------|---------------|-------------|-------|
| Write throughput | 10K/sec | 100K/sec | 20K/sec | Batches | 1M/sec |
| Query latency | <10ms | <50ms (aggregation) | <100ms | Seconds | Real-time stream |
| Retention cost (1TB) | $$$ | $ | $$ | $ | $$ |
| Rolling retention | Manual | TTL built-in | ILM built-in | S3 lifecycle | Log compaction |
| Full-text search | pg_trgm | Limited | Excellent | Limited | No |
| SQL support | Full | Analytical SQL | Query DSL | SQL (Presto) | KSQL |
| ACID compliance | Yes | No | No | No | No |
| Hash chain support | Native (triggers) | UDF | Painful | Painful | Custom consumer |

## Recommendation

### Small Scale (< 10K events/day, single service)
**PostgreSQL** — Same DB as app. Table with indexes. TTL via cron. Simple.

### Medium Scale (10K-1M events/day, few services)
**PostgreSQL + partitioning** — Partition by month. Archive old partitions to S3. ClickHouse if query-heavy.

### Large Scale (1M-10M events/day, many services)
**ClickHouse** — Columnar storage, high compression, built-in TTL, analytical queries.

### Archive Only (> 1 year old, compliance only)
**S3 + Parquet + Athena** — Store compressed Parquet files. Query occasionally. Minimal cost.

### Real-Time Alerting
**Kafka + stream processor** — Audit events on Kafka topic. Stream processor writes to ClickHouse for storage and alerts on patterns.

## Storage Cost Comparison (1TB raw data, 7-year retention)

| Backend | Monthly Cost | Notes |
|---------|-------------|-------|
| PostgreSQL (SSD) | ~$500 | 10x storage overhead with indexes |
| ClickHouse (NVMe) | ~$150 | 5:1 compression ratio typical |
| Elasticsearch | ~$400 | 2:1 compression, hot+warm tiers |
| S3 (Parquet) | ~$30 | 10:1 compression, no indexing |
| Kafka + S3 | ~$200 | Kafka retention 30d + S3 archive |
