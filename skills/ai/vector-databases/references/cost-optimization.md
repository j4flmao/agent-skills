# Vector Database Cost Optimization

## Memory Cost Breakdown

### Raw Vector Storage
```
Memory = N × dim × bytes_per_value

float32:  4 bytes per value
float16:  2 bytes per value (not all DBs support)
int8 (SQ): 1 byte per value

Examples (10M vectors):
  768-dim float32 = 10M × 768 × 4 = 30.72 GB
  768-dim SQ8    = 10M × 768 × 1 = 7.68 GB  (4× savings)
  768-dim PQ 8:1 = 10M × 96 × 1  = 0.96 GB  (32× savings)
```

### Index Overhead
```
HNSW:  N × M × 2 × 12 bytes (graph edges)
  M=16 → N × 384 bytes
  10M vectors → ~3.84 GB overhead

IVF:  nlist × dim × 4 bytes (centroids)
  nlist=4096 → 4096 × 768 × 4 = 12.6 MB (negligible)

DiskANN: ~1-2 GB for graph metadata at 1B scale
```

### Total Memory Formula
```
HNSW: N × dim × 4 + N × M × 2 × 12
IVF:  N × dim × 4 + nlist × dim × 4
IVF+PQ: N × M_subvectors + nlist × dim × 4
PQ:   N × M_subvectors
```

## Quantization Strategies

### Scalar Quantization (SQ8)
Converts float32 to int8 per dimension.
```
Savings: 4× memory reduction
Recall impact: -1-3%
Config: built-in (Pinecone, Qdrant, Milvus, Weaviate)
Effort: None (toggle)
```

### Product Quantization (PQ)
Splits vector into M sub-vectors, quantizes each to a centroid index.
```
Savings: 8× to 32× memory reduction
Recall impact: -5-15%
Config: M sub-vectors (M = dim / compression_ratio)
Effort: None (index parameter)
```

### Binary Quantization
Each dimension → 1 bit (sign of value).
```
Savings: 32× memory reduction
Recall impact: -15-30%
Config: built-in (Qdrant, Milvus)
Effort: None (toggle)
Use case: First-pass coarse search, then refine
```

### Mixed Precision
```
High-importance vectors (recent, popular, high-value): float32
Medium-importance: float16
Low-importance (old, cold, bulk): SQ8 or PQ
```

## Compute Cost Optimization

### Index Build Cost

| Index | CPU Hours (10M vectors) | Cost (on-demand $0.10/hr) |
|-------|------------------------|---------------------------|
| HNSW (efConstruction=200) | ~2 CPU-hours | $0.20 |
| HNSW (efConstruction=400) | ~4 CPU-hours | $0.40 |
| IVF (nlist=sqrt(N)) | ~0.5 CPU-hours | $0.05 |
| IVF+PQ | ~1 CPU-hour | $0.10 |
| DiskANN (beamwidth=4) | ~10 CPU-hours | $1.00 |

Build cost is a one-time operational expense. Optimize by:
1. Using spot/preemptible instances for builds
2. Running builds in parallel across shards
3. Scheduling builds during low-demand hours (reduced cluster cost)
4. Using lower efConstruction during build, compensating with higher efSearch at query time

### Query Cost

```
Cost per query = (latency_ms / 1000) × CPU_cost_per_second
               × (1 + overhead_factor)

Example (1M vectors, HNSW):
  Latency: 8ms
  CPU cost: $0.034/hr = $0.0000094/sec
  Cost per query: 0.008 × $0.0000094 = $0.000000075
  Cost per 1M queries: $0.075 (compute only)
```

### Throughput Optimization

| Strategy | QPS Improvement | Cost Impact |
|----------|----------------|-------------|
| Batch queries (batch_size=10) | 5-8× | -80% per query |
| Connection pooling | 2-3× | -60% per query |
| gRPC over HTTP | 1.5-2× | -40% per query |
| Caching hot queries (50% hit) | 2× effective QPS | -50% per query |
| Read replicas | N × QPS | Linear cost increase |
| GPU inference | 5-10× | Higher per-node cost |

## Storage Tiering

### Tier Strategy

| Tier | Storage | Cost/GB/Month | Latency | Recommended Query % |
|------|---------|---------------|---------|-------------------|
| Hot | NVMe SSD / RAM | $0.20-0.50 | <5ms | 80% |
| Warm | SATA SSD | $0.05-0.10 | 10-50ms | 15% |
| Cold | HDD / Object storage | $0.01-0.02 | 50-200ms | 5% |
| Archive | Glacier / Deep Archive | $0.001 | >1s | <1% |

### Access-Frequency Tiering

```python
class TiredVectorDB:
    def __init__(self, hot, warm, cold):
        self.tiers = {"hot": hot, "warm": warm, "cold": cold}
        self.access_counts = defaultdict(int)

    async def search(self, query, k=10):
        # Search hot tier first
        hot_results = await self.tiers["hot"].search(query, k=k)

        if len(hot_results) < k:
            # Supplement from warm
            warm_results = await self.tiers["warm"].search(query, k=k - len(hot_results))
            hot_results.extend(warm_results)

        return hot_results[:k]

    async def on_query(self, vector_id):
        self.access_counts[vector_id] += 1

    async def optimize_tiers(self, threshold_hot=100, threshold_warm=10):
        # Move frequently accessed to hotter tier
        for vid, count in self.access_counts.items():
            if count >= threshold_hot:
                await self.promote(vid, "hot")
            elif count >= threshold_warm:
                await self.promote(vid, "warm")
            else:
                await self.demote(vid, "cold")
```

## Managed vs Self-Hosted Cost Analysis

### TCO Comparison (3-year projection)

| Scenario | Pinecone | Qdrant Cloud | Self-hosted (3 nodes) |
|----------|----------|--------------|----------------------|
| 1M vectors, 10 QPS | $5,400 | $2,880 | $1,800 + ops |
| 10M vectors, 100 QPS | $18,000 | $10,800 | $5,400 + ops |
| 100M vectors, 500 QPS | $72,000 | $43,200 | $18,000 + ops (6 nodes) |
| 1B vectors, 2000 QPS | ~$300K | ~$180K | ~$72K + ops (20 nodes) |

### Hidden Costs of Self-Hosting

| Cost Item | Monthly Estimate |
|-----------|-----------------|
| Ops engineering (0.25-1 FTE) | $5,000-20,000 |
| Backup storage (S3, 3× dataset) | $50-500 |
| Networking (cross-zone, egress) | $50-300 |
| Monitoring infra | $50-200 |
| Maintenance windows (downtime) | Variable |
| Index rebuilds (CPU cost) | $10-100 |

### When Managed Is Cheaper

- Dataset <10M vectors: managed costs are close to self-hosted
- Team has no dedicated infra/SRE: ops cost of self-hosting exceeds managed premium
- Variable/unpredictable workload: managed auto-scaling prevents over-provisioning
- Need to move fast (MVP, prototype): zero ops time = lower total cost

### When Self-Hosted Is Cheaper

- Dataset >100M vectors: managed premium scales with data
- Existing Kubernetes infrastructure: marginal cost of adding vector DB
- Predictable, stable workload: no over-provisioning needed
- Team has operations expertise: ops cost is already sunk

## Index Build Cost Optimization

### Incremental Builds
```python
class IncrementalBuilder:
    def __init__(self, db, rebuild_threshold=0.2):
        self.db = db
        self.added_since_rebuild = 0
        self.total_vectors = 0
        self.rebuild_threshold = rebuild_threshold

    async def insert(self, vector_id, vector, metadata):
        await self.db.upsert([(vector_id, vector, metadata)])
        self.added_since_rebuild += 1
        self.total_vectors += 1

        if self.added_since_rebuild / self.total_vectors > self.rebuild_threshold:
            await self.full_rebuild()

    async def full_rebuild(self):
        # Export all vectors
        # Build new index from scratch
        # Swap with production index
        # Keep old index serving during build
        pass
```

### Parallel Build Across Shards
```python
import asyncio

async def parallel_rebuild(shards, ef_construction=200):
    tasks = []
    for shard in shards:
        tasks.append(asyncio.create_task(
            shard.rebuild_index(ef_construction=ef_construction)
        ))
    # All shards rebuild in parallel
    # Complete in max(shard_time) instead of sum(shard_times)
    await asyncio.gather(*tasks)
```

### Staged Build
Build index incrementally as data arrives.
```
Day 1: 1M vectors → HNSW build (2 min)
Day 2: 2M vectors → incremental update
Day 7: 7M vectors → incremental (starting to degrade)
       → schedule full rebuild overnight (14 min)
```

## Cluster Size Optimization

### Right-Sizing Formula
```
Nodes = max(
    ceil(TotalVectors / MaxVectorsPerNode),
    ceil(RequiredQPS / QPSPerNode)
)
```

Where MaxVectorsPerNode depends on index type and memory:
```
HNSW:    MaxVectors = (RAM_GB × 0.7) / (dim × 4 + M × 24) / 1e6
IVF:     MaxVectors = (RAM_GB × 0.7) / (dim × 4) / 1e6
IVF+PQ:  MaxVectors = (RAM_GB × 0.7) / (M_subvectors) / 1e6
DiskANN: MaxVectors = 100M+ (SSD-bound, not RAM)
```

### Minimum Production Cluster

| Scale | Min Nodes | Instance Type | Monthly Cost |
|-------|-----------|---------------|--------------|
| <1M vectors | 1-3 | 8 GB RAM, 2 CPU | $50-150 |
| 1M-10M | 3 | 32 GB RAM, 4 CPU | $200-400 |
| 10M-100M | 3-6 | 64 GB RAM, 8 CPU | $500-1500 |
| 100M-1B | 6-12 | 128 GB RAM, 16 CPU | $2000-5000 |

## Cost Tracking Dashboard

### Key Metrics
```
Cost per million vectors per month
  = (compute_cost + storage_cost) / (total_vectors / 1M)

Cost per query
  = compute_cost / total_queries_per_month

Memory utilization
  = actual_memory / provisioned_memory × 100%

Index overhead ratio
  = index_memory / raw_vector_memory

Query efficiency
  = QPS / total_compute_units
```

### Cost Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Cost per M vectors | >$50/mo | >$100/mo |
| Memory utilization | <30% or >80% | <20% or >90% |
| Index overhead ratio | >2.0 | >3.0 |
| Query efficiency drop | >20% from baseline | >50% from baseline |

## Cost Reduction Checklist

- [ ] Enable SQ8 or PQ compression on all production indexes
- [ ] Right-size instance types (don't over-provision)
- [ ] Use spot instances for index builds and read replicas
- [ ] Implement hot-warm-cold tiering for >10M vectors
- [ ] Cache frequent queries (LRU with 1h TTL)
- [ ] Batch writes (100-1000 per batch)
- [ ] Delete unused collections and indexes
- [ ] Archive cold data to object storage
- [ ] Schedule index builds during off-peak hours
- [ ] Use gRPC instead of HTTP for 1.5-2× throughput
- [ ] Monitor memory utilization weekly
- [ ] Evaluate managed vs self-hosted cost quarterly
- [ ] Reduce efConstruction (build) at cost of higher efSearch (query) for infrequent rebuilds
- [ ] Implement TTL-based data expiration for time-series vectors

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
