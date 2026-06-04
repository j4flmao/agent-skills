# Evaluation and Benchmarking

## Recall Metrics

### Recall@K
Fraction of true nearest neighbors captured by ANN search.
```
Recall@K = |ANN_results ∩ Exact_results| / K
```
- K=10 for most search applications
- K=100 for retrieval-heavy systems (RAG, recommendations)
- Target: 0.90-0.99 depending on use case

### Mean Average Precision (MAP@K)
Precision averaged across recall levels. Considers ranking quality, not just presence.
```
MAP@K = (1/|Q|) × Σ_{q∈Q} (1/K) × Σ_{k=1}^{K} Precision@k × rel(k)
```
- rel(k) = 1 if result at rank k is relevant
- Better for ordered results where top ranks matter more

### Normalized Discounted Cumulative Gain (NDCG@K)
Accounts for graded relevance (not just binary relevant/not).
```
NDCG@K = DCG@K / IDCG@K
DCG@K = Σ_{k=1}^{K} (2^{rel(k)} - 1) / log₂(k + 1)
```
- Use when relevance is non-binary (e.g., 0-5 star rating)
- Standard for recommendation systems

### Mean Reciprocal Rank (MRR)
Position of first relevant result.
```
MRR = (1/|Q|) × Σ_{q∈Q} 1 / rank(first_relevant)
```
- Use when there's one "correct" answer per query (FAQ, lookup)

## Latency Metrics

### Key Percentiles

| Percentile | Purpose | Typical Target |
|------------|---------|---------------|
| P50 (median) | Typical user experience | <20ms |
| P95 | Slow tail, 1 in 20 queries | <50ms |
| P99 | Worst case, 1 in 100 queries | <100ms |
| P99.9 | Outliers, 1 in 1000 queries | <500ms |

### Measuring Latency Correctly

```python
import time
import statistics
import numpy as np

def measure_latency(search_fn, queries, warmup=10, iterations=100):
    # Warmup (JIT compilation, cache fill)
    for q in queries[:warmup]:
        search_fn(q)

    # Measurement (cold start excluded)
    latencies = []
    for i in range(iterations):
        q = queries[i % len(queries)]
        start = time.perf_counter_ns()
        search_fn(q)
        elapsed = (time.perf_counter_ns() - start) / 1_000_000  # ms
        latencies.append(elapsed)

    latencies.sort()
    return {
        "p50": statistics.median(latencies),
        "p95": latencies[int(len(latencies) * 0.95)],
        "p99": latencies[int(len(latencies) * 0.99)],
        "p999": latencies[int(len(latencies) * 0.999)],
        "mean": statistics.mean(latencies),
        "min": min(latencies),
        "max": max(latencies),
        "std": statistics.stdev(latencies),
    }
```

### Common Pitfalls in Latency Measurement

- **Not warming up**: First queries include connection setup, JIT compilation, cache misses
- **Single-query measurement**: Run at least 100 queries for stable percentiles
- **Client-side network not isolated**: Network jitter adds noise, measure server-side too
- **Co-located load**: Benchmark when other load is present OR isolated, document which
- **Cold start vs steady state**: Both matter, measure separately

## Throughput Metrics

### Queries Per Second (QPS)

```
QPS = N_queries / total_time_seconds
```

### Maximum QPS at Target Latency
The correct metric. Not just max QPS, but max QPS while staying under P99 latency budget.
```
Max sustainable QPS = highest QPS where P99 < threshold
```

### Throughput Under Different Load Patterns

| Load Pattern | Measurement |
|-------------|-------------|
| Constant low | P50/P99 latency at steady QPS |
| Burst | P99 latency at 10× steady QPS for 10s |
| Ramp-up | QPS at which latency exceeds target |
| Background build | Latency during concurrent index build |

### Benchmarking Throughput

```python
import asyncio
import time

async def throughput_test(client, queries, target_qps=100, duration_s=60):
    interval = 1.0 / target_qps
    latencies = []
    completed = 0
    errors = 0

    start = time.perf_counter()
    while time.perf_counter() - start < duration_s:
        q_start = time.perf_counter()
        try:
            await client.search(queries[completed % len(queries)])
            latencies.append((time.perf_counter() - q_start) * 1000)
        except Exception:
            errors += 1
        completed += 1

        # Rate limiting
        elapsed = time.perf_counter() - start
        expected = completed * interval - 1  # ~1ms tolerance
        if elapsed < expected:
            await asyncio.sleep(expected - elapsed)

    return {
        "actual_qps": completed / duration_s,
        "p50_latency": statistics.median(latencies),
        "p99_latency": sorted(latencies)[int(len(latencies) * 0.99)],
        "error_rate": errors / completed,
    }
```

## Benchmarking Methodology

### Standard Benchmark Config

```yaml
benchmark:
  dataset:
    size: 1_000_000
    dimensions: 768
    distribution: "real_embeddings"  # or "synthetic_gaussian"
    source: "sample_of_production_data"

  queries:
    count: 1000
    type: "real_user_queries"  # or "sample_from_dataset"

  filters:
    - none
    - single_field_equality
    - multi_field_range

  index_types:
    - flat  # baseline (ground truth)
    - hnsw  (M=16, efConstruction=200, efSearch=256)
    - hnsw  (M=32, efConstruction=400, efSearch=512)
    - ivf   (nlist=4096, nprobe=64)
    - ivf   (nlist=1000, nprobe=100)
    - ivf+pq (nlist=4096, M=96, nbits=8)

  measurements:
    warmup_iterations: 10
    measure_iterations: 100
    concurrent_clients: [1, 10, 50, 100]
```

### Comparing Benchmarks

When comparing results across databases, ensure:
1. **Same hardware**: CPU generation, RAM, SSD vs HDD, network latency
2. **Same data**: Same vectors, same filters, same query distribution
3. **Same index parameters**: M, efConstruction, efSearch identical
4. **Same measurement methodology**: Warmup, iteration count, percentile calculation
5. **Same client configuration**: Connection pooling, gRPC vs HTTP, batch sizes

### Regression Testing

```python
class RegressionDetector:
    def __init__(self, recall_baseline, latency_baseline):
        self.recall_baseline = recall_baseline
        self.latency_baseline = latency_baseline

    def check(self, current_recall, current_latency):
        issues = []
        for k, v in current_recall.items():
            degradation = (self.recall_baseline[k] - v) / self.recall_baseline[k]
            if degradation > 0.05:  # 5% recall drop
                issues.append(f"Recall@{k} dropped by {degradation:.1%}")

        for p, v in current_latency.items():
            slowdown = (v - self.latency_baseline[p]) / self.latency_baseline[p]
            if slowdown > 0.20:  # 20% latency increase
                issues.append(f"{p} latency increased by {slowdown:.1%}")

        return {"regression_detected": len(issues) > 0, "issues": issues}
```

## Production Monitoring

### Golden Query Set
Maintain a fixed set of 100-1000 queries with known ground truth. Run nightly against production.

```python
GOLDEN_QUERIES = [
    {"query": [0.1, 0.2, ...], "expected_ids": {"doc_1", "doc_5", "doc_12"}, "k": 10},
    {"query": [0.3, 0.4, ...], "expected_ids": {"doc_3", "doc_8"}, "k": 10},
]
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Recall@10 | <0.93 | <0.90 |
| P99 Latency | >target×1.5 | >target×2 |
| P50 Latency | >target×2 | >target×3 |
| Error rate | >0.1% | >1% |
| Index build queue | >100 | >1000 |

### Dashboard Template

```
Row 1: Recall@10 + Recall@100 (guage + timeseries)
Row 2: P50/P95/P99 latency (heatmap, last 24h)
Row 3: QPS + Error rate (timeseries, last 24h)
Row 4: Index build queue + Memory/Disk per node
Row 5: Golden query set pass/fail rate
```

## Evaluation Tools by Database

| DB | Built-in Eval | Recommended Approach |
|----|--------------|---------------------|
| Pinecone | No | Export vectors, evaluate with FAISS exact search |
| Qdrant | Search with `with_payload=true` | Ground truth via brute-force on subset |
| Weaviate | No custom eval API | Export via GraphQL batch query + FAISS |
| Milvus | `milvus_backup` + Python SDK | Full control: query, ground truth, compare |
| pgvector | SQL `ORDER BY distance` | Exact search is SQL-native (easy ground truth) |
| Chroma | `collection.query()` | FAISS on exported data for ground truth |
| FAISS | N/A | Built-in `range_search` for exact neighbors |

## Statistical Significance

### Sample Size
```python
import math

def min_sample_size(effect_size=0.01, power=0.8, alpha=0.05):
    # For detecting 1% recall difference
    z_alpha = 1.96  # for alpha=0.05
    z_beta = 0.84   # for power=0.8
    n = ((z_alpha + z_beta) * 2 / effect_size) ** 2
    return int(math.ceil(n))
```

For recall difference of 0.01 (1%), need ~315K queries for statistical significance. For practical purposes, 1000 queries gives ~3% detectable difference.

### Confidence Intervals
```python
import numpy as np
from scipy import stats

def confidence_interval(recalls, confidence=0.95):
    mean = np.mean(recalls)
    se = stats.sem(recalls)
    ci = se * stats.t.ppf((1 + confidence) / 2, len(recalls) - 1)
    return mean - ci, mean + ci
```

## Common Benchmark Results

### Recall vs Latency Trade-off (1M vectors, 768-dim, cosine)

| Index | Recall@10 | P50 Latency | P99 Latency | Memory |
|-------|-----------|-------------|-------------|--------|
| Flat (brute) | 1.0 | 50ms | 80ms | 3 GB |
| HNSW (M=8, efSearch=64) | 0.93 | 2ms | 5ms | 4.5 GB |
| HNSW (M=16, efSearch=128) | 0.97 | 4ms | 10ms | 6 GB |
| HNSW (M=16, efSearch=256) | 0.99 | 8ms | 18ms | 6 GB |
| HNSW (M=32, efSearch=512) | 0.995 | 15ms | 35ms | 9 GB |
| IVF (nlist=4096, nprobe=64) | 0.94 | 5ms | 12ms | 3.2 GB |
| IVF (nlist=1000, nprobe=100) | 0.96 | 8ms | 20ms | 3.2 GB |
| IVF+PQ (M=96, nbits=8) | 0.89 | 3ms | 8ms | 0.4 GB |

### Scale Impact (HNSW, M=16, efSearch=256)

| Vectors | P50 Latency | P99 Latency | Memory | Build Time |
|---------|-------------|-------------|--------|------------|
| 10K | 1ms | 3ms | 60 MB | 1s |
| 100K | 2ms | 6ms | 600 MB | 10s |
| 1M | 8ms | 18ms | 6 GB | 2min |
| 10M | 35ms | 80ms | 60 GB | 30min |
| 100M | 250ms | 600ms | 600 GB | N/A (needs sharding) |

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
