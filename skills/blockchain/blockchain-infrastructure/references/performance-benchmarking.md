# Performance Benchmarking for Blockchain Nodes & Infrastructure

## Overview

Performance benchmarking of blockchain infrastructure is distinct from traditional web service benchmarking. Node performance depends on chain-specific sync mechanics, hardware characteristics, network topology, and transaction throughput patterns. This reference provides methodologies for benchmarking blockchain nodes (RPC latency, sync speed, transaction ingestion), MEV infrastructure (block building latency, bid processing), and indexing infrastructure (event processing throughput, catch-up speed). It includes decision trees for bottleneck identification, benchmark harness patterns, and interpretation guidelines for results.

## Core Architecture Concepts

### Benchmarking Dimensions

| Dimension | Metric | Target (Ethereum Mainnet) | Measurement Tool |
|---|---|---|---|
| RPC Latency | p50/p95/p99 response time | < 50ms / < 150ms / < 500ms | vegeta, wrk2, custom load generator |
| RPC Throughput | Requests per second (RPS) | > 10,000 RPS (clustered) | vegeta, hey, ghz |
| Sync Speed | Blocks per second | > 50 blocks/s (full), > 2 blocks/s (archive) | Prometheus, custom metrics |
| Transaction Propagation | Time to inclusion | < 5s (p95) | eth-txpool-inspector |
| Block Building | Time to produce block | < 2s (MEV-boost), < 500ms (custom builder) | builder metrics |
| Event Log Processing | Logs per second | > 100,000 logs/s | custom benchmark |
| WebSocket Throughput | Concurrent connections | > 10,000 connections | websocket-bench |
| Disk I/O | Random read IOPS | > 50,000 IOPS (archive node) | fio, sysbench |

### Bottleneck Identification Patterns

```
High RPC Latency?
├── CPU-bound → Check geth/erigon CPU usage
│   ├── > 80% → Insufficient cores → Scale vertically or add more nodes
│   └── < 40% → Investigate other causes
├── IO-bound → Check disk latency
│   ├── > 10ms avg → Upgrade to NVMe / increase IOPS allocation
│   └── < 2ms → Not disk-constrained
├── Memory-bound → Check available RAM vs DB cache
│   ├── High page fault rate → Increase `--cache` / reduce concurrent queries
│   └── Low cache hit ratio → Increase state cache allocation
└── Network-bound → Check bandwidth + connection count
    ├── > 1 Gbps sustained (archive node) → Upgrade NIC / use dedicated sync node
    └── Connection pool exhausted → Increase max peers / tune ulimit
```

## Architecture Decision Trees

### Benchmark Type Selection

```
Benchmark needed for?
├── RPC endpoint performance → Full RPC benchmark suite
│   ├── eth_call latency-heavy? → Use batch eth_call benchmark
│   ├── eth_getLogs throughput? → Event log benchmark with large block ranges
│   └── eth_sendRawTransaction? → Transaction ingestion benchmark
├── Sync performance → Chain sync benchmark
│   ├── Initial sync (from genesis) → Cold sync benchmark
│   ├── Ongoing sync (tip following) → Warm sync benchmark
│   └── Re-sync (from snapshot) → Snapshot restore + catch-up benchmark
├── MEV infrastructure → Builder/relay benchmark
│   ├── Block building time → Simulated block template benchmark
│   ├── Bid processing → Order flow + auction benchmark
│   └── Relay latency → End-to-end bid submission + delivery benchmark
└── Indexing pipeline → Event processing benchmark
    ├── Live indexing throughput → Real-time event capture + transform benchmark
    ├── Historical backfill → Catch-up from genesis or specified block
    └── Reorg resilience → Unwind + re-index benchmark
```

## Implementation Strategies

### RPC Benchmark Harness

```python
# RPC benchmark using concurrent workers
import asyncio
import aiohttp
import time
from statistics import median, quantiles

async def benchmark_rpc(url: str, method: str, params: list,
                        concurrency: int, total_requests: int):
    async def worker():
        results = []
        async with aiohttp.ClientSession() as session:
            for _ in range(total_requests // concurrency):
                payload = {
                    "jsonrpc": "2.0",
                    "method": method,
                    "params": params,
                    "id": 1
                }
                start = time.monotonic()
                async with session.post(url, json=payload) as resp:
                    await resp.json()
                elapsed = time.monotonic() - start
                results.append(elapsed)
        return results

    tasks = [worker() for _ in range(concurrency)]
    all_results = await asyncio.gather(*tasks)
    flat = [r for batch in all_results for r in batch]
    sorted_lat = sorted(flat)

    return {
        "p50": median(sorted_lat),
        "p95": quantiles(sorted_lat, n=20)[18],
        "p99": quantiles(sorted_lat, n=100)[98],
        "avg": sum(sorted_lat) / len(sorted_lat),
        "rps": len(sorted_lat) / (sum(sorted_lat) / concurrency),
        "total_requests": len(sorted_lat)
    }
```

### Sync Performance Measurement

```bash
# Measure blocks per second during sync
# Uses Geth's metrics
geth --metrics --pprof --syncmode=snap

# Or calculate from logs
geth 2>&1 | grep -oP 'Imported new chain segment.*?blocks=\K\d+' | tail -n 100 | \
  awk '{sum+=$1} END {print "avg blocks/batch:", sum/NR}'

# For measuring time to sync specific range
echo "Measuring sync from block $FROM to $TO..."
START=$(date +%s)
geth --datadir /data/ethereum
END=$(date +%s)
echo "Synced $((FROM - TO)) blocks in $((END - START)) seconds"
echo "Blocks/sec: $(((FROM - TO) / (END - START)))"
```

### Block Building Benchmark (MEV)

```go
// Benchmark block building with simulated mempool
func BenchmarkBlockBuilding(b *testing.B) {
    builder := NewBlockBuilder(/* config */)
    mempool := SimulateMempool(10000) // 10K pending txs

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        block, err := builder.BuildBlock(mempool, time.Now().Unix())
        if err != nil {
            b.Fatal(err)
        }
        _ = block
    }
}

// Run: go test -bench=BenchmarkBlockBuilding -benchtime=30s
```

## Integration Patterns

### Continuous Benchmarking Pipeline

```yaml
# .github/workflows/benchmark-rpc.yml
name: RPC Benchmark
on:
  schedule:
    - cron: "0 */6 * * *"
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: benchmark-runner
    steps:
      - name: Run RPC benchmark suite
        run: |
          python benchmarks/rpc_benchmark.py \
            --url ${{ secrets.RPC_ENDPOINT }} \
            --concurrency 50 \
            --total-requests 10000 \
            --output results.json

      - name: Compare with baseline
        run: |
          python benchmarks/compare_baseline.py \
            --current results.json \
            --baseline baseline.json \
            --threshold 0.2  # 20% regression tolerance

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: results.json

      - name: Alert on regression
        if: failure()
        run: |
          echo "RPC performance regression detected" | \
            notify-slack --channel blockchain-infra
```

## Performance Optimization

### Geth Node Tuning

| Parameter | Default | Recommended (Archive) | Recommended (Full/RPC) |
|---|---|---|---|
| `--cache` | 1024 | 4096-8192 (if RAM available) | 2048-4096 |
| `--txlookuplimit` | 2350000 | 0 (archive) | 2350000 (full) |
| `--gcmode` | full | archive | full |
| `--syncmode` | snap | snap | snap |
| `--http.api` | eth,net | eth,net,debug,trace | eth,net,web3 |
| `--ws` | false | false | true (with --ws.api) |
| `--maxpeers` | 50 | 25-50 | 50-100 |
| `--nat` | any | extip:<public-IP> | extip:<public-IP> |
| `--db.engine` | leveldb | leveldb (or pebble for speed) | pebble |

### Erigon (Ethereum) Performance Advantages

Erigon typically outperforms Geth for archive node operation:

| Metric | Geth Archive | Erigon Archive | Improvement |
|---|---|---|---|
| Disk Usage | 10-12 TB | 2-3 TB | 75% less |
| Sync Time (full) | 48-72 hours | 12-24 hours | 2-3x faster |
| Sync Time (archive) | 7-14 days | 2-4 days | 3-4x faster |
| eth_call latency | Baseline | 20-40% faster | Moderate |
| eth_getLogs | Baseline | 2-5x faster | Significant |

### RPC Load Balancer Strategy

| Pattern | Use Case | Latency Overhead | Throughput Scaling |
|---|---|---|---|
| Round-robin | Equal-capacity nodes | < 1ms | Linear |
| Least-connected | Variable node capacity | < 2ms | Near-linear |
| Consistent hash | Cache affinity, eth_call batching | < 1ms | Linear + cache bonus |
| Geographic routing | Global user distribution | DNS-dependent | Independent per region |
| Weighted (by sync lag) | Mixed sync states | < 2ms | Sub-linear (lagging nodes) |

## Security Considerations

- **Benchmarking against production RPC**: Use a dedicated benchmark endpoint or rate-limit to avoid degrading live traffic.
- **Load test authorization**: Protect benchmark endpoints with API keys or IP whitelisting — public load testing can be mistaken for DDoS.
- **Data exfiltration via RPC**: Benchmarking eth_call with arbitrary state reads can extract on-chain data — no privacy concern here (blockchain is public), but rate-limit to prevent abuse.
- **MEV benchmark safety**: Running block building benchmarks with real mempool transactions may inadvertently leak order flow. Use anonymized or historical mempool data.
- **Snapshot benchmark integrity**: Ensure benchmark snapshots are taken from consistent (finalized) chain states to avoid measuring reorg artifacts.

## Operational Excellence

### Baseline Management

Maintain a performance baseline for each deployment:

```yaml
# baseline-config.yaml
baselines:
  rpc-mainnet:
    eth_blockNumber.p50: 5ms
    eth_blockNumber.p95: 20ms
    eth_call.p50: 15ms
    eth_call.p95: 80ms
    eth_getLogs.p50: 50ms
    eth_getLogs.p95: 500ms
    eth_sendRawTransaction.p50: 100ms
    eth_sendRawTransaction.p95: 500ms
    sync_lag_seconds: 0
    uptime: 0.9999

  mev-builder:
    block_build_time.p50: 500ms
    block_build_time.p95: 1500ms
    bid_submission_latency.p50: 200ms
    bid_submission_latency.p95: 800ms
    blocks_won_per_day: 50
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|---|---|---|---|
| RPC p95 latency > 200ms | PagerDuty low | PagerDuty high | Scale up / investigate |
| Sync lag > 10 blocks | Log | PagerDuty high | Check sync status |
| Throughput drop > 30% | Log | PagerDuty low | Check LB / node health |
| Block build time > 2s | PagerDuty low | PagerDuty high | Optimize builder |
| Cache hit ratio < 90% | Log | PagerDuty low | Increase cache size |

## Testing Strategy

### Benchmark Validation Tests

```python
def test_benchmark_reliability():
    """Benchmark results should be reproducible within 10% variance."""
    results = []
    for _ in range(5):
        r = run_rpc_benchmark(["eth_blockNumber"], concurrency=10, n=1000)
        results.append(r["p50"])
    cv = statistics.stdev(results) / statistics.mean(results)
    assert cv < 0.10, f"Coefficient of variation too high: {cv:.3f}"

def test_benchmark_linearity():
    """Throughput should scale linearly with concurrency."""
    r5 = run_rpc_benchmark(["eth_blockNumber"], concurrency=5, n=1000)
    r50 = run_rpc_benchmark(["eth_blockNumber"], concurrency=50, n=5000)
    scale_factor = r50["rps"] / r5["rps"]
    assert 8.0 < scale_factor < 12.0  # Should be ~10x for 10x concurrency
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Benchmarking against stale node | Results include sync overhead | Verify node is at chain tip before benchmark |
| Single-threaded eth_call benchmarking | Underestimates real capacity | Use concurrent load generators |
| Ignoring cache warming | First-run results 10x slower | Run warm-up requests before measurement |
| Measuring `eth_blockNumber` as latency proxy | Not representative of real usage | Benchmark the actual methods your app uses |
| Benchmarking across different block ranges | Time-of-day variance in chain activity | Use fixed block ranges for reproducible results |
| Insufficient benchmark duration | Results dominated by startup overhead | Minimum 60s sustained load per test |
| Not measuring resource saturation | Cannot identify bottleneck | Collect CPU/disk/memory during benchmark |
| Using HTTP/1.1 for high-throughput tests | Connection overhead distorts results | Use HTTP/2 or keepalive connections |

## Key Takeaways

1. **Benchmark realistic workloads** — `eth_blockNumber` latency is meaningless for an app that primarily calls `eth_call` or `eth_getLogs`.
2. **Establish baselines before optimization** — without a baseline, you cannot detect regressions from software or configuration changes.
3. **Test at multiple layers** — node software, hardware, network, and load balancer all contribute to overall RPC performance.
4. **Continuous benchmarking in CI/CD** — performance regressions are easiest to catch when every deployment triggers a benchmark comparison.
5. **Archive vs full node performance differs dramatically** — archive nodes are IO-bound; full nodes are typically CPU-bound during sync.
6. **Erigon beats Geth for archive workloads** — 3-5x less disk usage and 2-4x faster sync makes Erigon the default choice for archive node operation.
7. **RPC latency is dominated by state access** — `eth_call` performance depends heavily on cache hit ratio and database engine choice.
8. **MEV infrastructure benchmarks require production-like mempool conditions** — empty mempool benchmarks are not representative of real block building latency.