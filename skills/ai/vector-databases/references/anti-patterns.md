# Vector Database Anti-Patterns

## Index Selection Anti-Patterns

### Using HNSW When Memory Is Constrained
HNSW stores full-precision vectors plus a dense graph (1.5× vector size in adjacency data). For 10M vectors at 768 dims, that's ~60 GB of RAM.

**Wrong**: HNSW for 50M vectors on 32 GB RAM node
**Right**: IVF+PQ for 8:1 compression → ~7 GB, or DiskANN for near-zero RAM

### Using Flat Index for Anything Over 10K Vectors
Flat (brute-force) is O(N) — latency grows linearly with dataset size. At 1M vectors, even optimized SIMD brute-force takes 20-50ms.

**Wrong**: Flat index for 100K product embeddings
**Right**: HNSW with M=16, efSearch=256 → ~5ms at same recall

### Never Rebuilding the Index
Index quality degrades as data changes. HNSW inserts can create suboptimal edge connections over time.

**Wrong**: Insert 2M vectors over 6 months into original HNSW index, never rebuild
**Right**: Full rebuild at 20% data change threshold, or incremental optimization

## Filtering Anti-Patterns

### Post-Filtering High-Selectivity Filters
When a metadata filter discards >50% of candidates, post-filtering is wasteful — most ANN results will be discarded and top-K will be sparsely populated.

**Wrong**: Search 1M vectors with `year=2024` filter (1% of data) using post-filter
**Right**: Pre-filter with metadata index on `year` field

### No Metadata Index on Frequently Filtered Fields
Every filter query without an index degrades to a full metadata scan.

**Wrong**: `category` field used in 60% of queries, no index on `category`
**Right**: Add inverted/bitmap index on `category` — 10-100× faster filtered queries

### Over-Filtering (Too Many Conditions)
Applying 5+ filter conditions, especially on unindexed fields, forces the DB into a full scan or cross-product join of filter results.

**Wrong**: `status=active AND source=web AND language=en AND author!=null AND score>0.5` with no indexes
**Right**: Index 2-3 most selective filter fields, apply remaining filters in application layer

## Performance Anti-Patterns

### Ignoring Index Build Parameters
Default index parameters are conservative. Using out-of-the-box HNSW or IVF config without tuning for your data.

**Wrong**: `efConstruction=40, M=8` for 10M vector index (low quality)
**Right**: `efConstruction=200, M=16` as minimum baseline. Tune up for higher recall.

### Single Connection for High-Throughput
Opening one HTTP connection and sending 1000 QPS through it.

**Wrong**: Single client connection for 500 QPS workload
**Right**: Connection pool with 10-20 connections, or use gRPC client for multiplexing

### Not Batching Writes
Inserting vectors one at a time instead of batching.

**Wrong**: Loop over 100K vectors, insert one by one
**Right**: Batch inserts in groups of 100-1000. 50-100× throughput improvement.

## Architecture Anti-Patterns

### Single Node in Production
Production vector DB on one node = single point of failure.

**Wrong**: Single Qdrant node for production customer-facing search
**Right**: Minimum 3-node cluster with replication factor 3, or managed service with HA

### No Backup Strategy
Self-hosted vector DB without backups = data loss waiting to happen.

**Wrong**: `We'll rebuild the index if we lose data` (takes 10+ hours for 50M vectors)
**Right**: Daily full snapshots, hourly incremental/WAL backups, tested monthly

### Ignoring Data Skew in Sharding
Hash-based sharding without checking distribution. All tenants are not created equal.

**Wrong**: 50 shards, hash partitioned. Tenant A has 20M vectors, others have <100K.
**Right**: Monitor shard sizes, rebalance when ratio >2:1, or use tenant-aware sharding

### Mixing Hot and Cold Data in One Index
All vectors treated equally regardless of query frequency.

**Wrong**: 100M vectors in one HNSW index, 80% never queried
**Right**: Hot-warm-cold tiering with different index types per tier

## Cost Anti-Patterns

### Oversized HNSW M Parameter
M=64 for 10M vectors: unnecessary memory for marginal recall gain.

**Wrong**: M=64 for all collections "to be safe"
**Right**: M=16 default, M=32 only for recall >0.99 requirements

### Using Full-Precision When Compression Is Fine
Running full float32 HNSW when SQ8 would lose only 1-2% recall at 4× memory reduction.

**Wrong**: 10M vectors × 768 dim = 30 GB full precision, needs expensive cluster
**Right**: Enable SQ8 → 7.5 GB, fits on standard instance. Or PQ → 3.75 GB.

### No Data Lifecycle Management
Vectors accumulate forever, driving up storage costs linearly.

**Wrong**: 3 years of vectors, never archived or deleted old data
**Right**: TTL-based eviction, tiered storage, periodic archival of cold data

## Evaluation Anti-Patterns

### Using Synthetic Data for Recall Tests
Synthetic uniform random vectors do not represent real embedding distributions. Real embeddings have cluster structure, varying density, and anisotropy.

**Wrong**: `We tested on random Gaussian vectors, recall was 0.98`
**Right**: Evaluate on sample of actual production queries and vectors

### No Golden Query Set
Deploy to production without a repeatable quality benchmark.

**Wrong**: "Search seems good" after deployment
**Right**: Curated set of 100-1000 queries with known expected results, run after every change

### Only Measuring Recall on Simple Queries
Complex queries with filters, multi-word, or rare terms have different quality characteristics.

**Wrong**: Recall evaluated only on single-token queries
**Right**: Multi-word queries, filtered queries, rare terms — all part of evaluation

## Operational Anti-Patterns

### Production Relying on Namespaces for Hard Multi-Tenancy
Pinecone namespaces are soft isolation — a misconfigured query can leak data across namespaces.

**Wrong**: Namespaces as sole tenant isolation mechanism in production
**Right**: Separate collections or indexes per tenant for hard isolation

### Not Monitoring Recall in Production
Index degradation, data drift, or configuration changes silently reduce search quality.

**Wrong**: "It worked yesterday, must be fine today"
**Right**: Nightly recall evaluation against golden query set, alert on regression

### Indexing Every Field
Creating indexes on all metadata fields without selectivity analysis.

**Wrong**: Index on `description`, `summary`, `notes`, `tags`, `source`, `author`, `created_by`
**Right**: Only index fields used in >10% of queries, or fields with high selectivity

## Summary Table

| Anti-Pattern | Impact | Detection | Fix |
|-------------|--------|-----------|-----|
| Wrong index for scale | Crippling | OOM, high latency | Right-size index type |
| Post-filter with selective filter | Empty results | Recall=0 for filtered queries | Pre-filter |
| No backup | Catastrophic | Data loss event | Backup strategy |
| Single node | Availability | Node failure = outage | Replication |
| No compression | Cost blowup | Memory > budget | Enable SQ or PQ |
| Synthetic eval | Misleading | Production recall failure | Real data eval |
| Oversized M parameter | Memory waste | 4× budget for 1% gain | Tune M |
| No golden queries | Unknown quality | Regression unnoticed | Curate + automate |

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
