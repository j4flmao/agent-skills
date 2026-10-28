# Price-Performance Tuning

Cost optimization is not "smallest instance possible"; it is the lowest cost per unit of useful work at the required latency. This reference covers measuring price-performance, choosing compute generations and architectures, tuning autoscaling and serverless memory, and avoiding tuning that just shifts cost elsewhere.

## The Metric: Cost per Unit of Work

```text
cost_per_unit = (hourly_price x instances) / (throughput_per_instance x 3600)
```

Measure `throughput_per_instance` at your latency SLO (for example requests per second at p99 below 200 ms), not at saturation. Compare candidates with the same load test.

| Step | Tool |
|------|------|
| Generate realistic load | k6, Locust, Gatling, vegeta |
| Observe saturation | CPU, memory, run queue, GC pauses, connection pool waits |
| Find the knee | Increase load until p99 breaks the SLO; record the RPS just before |
| Price it | On-demand and committed price for each candidate type |

## Instance Generation and Architecture

- Newer generations usually deliver more work per dollar than older ones at a similar price; moving from old families is often the cheapest win.
- ARM instances (AWS Graviton, Azure Cobalt/Ampere, Google Axion/Tau T2A) are priced lower per vCPU than comparable x86 instances. Gains depend on the workload; benchmark before switching.
- On most x86 families a vCPU is a hyperthread; on Graviton a vCPU is a physical core. Compare at equal throughput, not equal vCPU count.
- Burstable types (t3/t4g, B-series, e2-shared-core) suit low average CPU with short bursts; sustained load exhausts credits (or, in unlimited mode, accrues surplus charges).

```bash
# Build multi-arch images so the scheduler can use either architecture
docker buildx build --platform linux/amd64,linux/arm64 -t registry.example.com/api:1.8.0 --push .
```

## Memory vs CPU Ratio

Pick the family by the bottleneck observed:

| Observed | Family direction (AWS / Azure / GCP examples) |
|----------|-----------------------------------------------|
| CPU-bound, low memory | Compute-optimized (c7g/c7i, Fsv2/Fasv6, c3/c4) |
| Balanced | General purpose (m7g/m7i, Dsv5/Dasv6, n2/n4) |
| Memory-bound (caches, JVM heaps, analytics) | Memory-optimized (r7g/r7i, Esv5, m3/n2-highmem) |

Kubernetes: node pool shape should match the aggregate pod request ratio, otherwise one resource strands the other (for example nodes full on memory with idle CPU).

## Runtime Tuning That Reduces Cost

| Runtime | Tuning | Effect |
|---------|--------|--------|
| JVM | Container-aware heap (`-XX:MaxRAMPercentage=75`), right GC (G1 default; ZGC for low latency) | Avoids over-requesting memory and OOM kills |
| Node.js | One process per vCPU or cluster mode; avoid blocking the event loop | Uses the CPU you pay for |
| Python | Multiple worker processes (gunicorn/uvicorn workers) per container | GIL limits a single process to one core for CPU work |
| Go | `GOMAXPROCS` aligned to CPU limit (Go 1.25+ does this automatically; older: `automaxprocs`) | Avoids CFS throttling |
| .NET | Server GC in containers, `DOTNET_GCHeapHardLimit` if needed | Predictable memory |

## Autoscaling Targets

Target utilization trades headroom (cost) against latency risk.

| Setting | Lower value | Higher value |
|---------|-------------|--------------|
| HPA CPU target | More replicas, more idle cost, safer for spikes | Fewer replicas, risk of latency at spikes |
| Scale-down stabilization | Faster savings, more flapping | Slower savings, stabler |
| Cluster autoscaler scale-down-unneeded-time | Nodes removed sooner | Nodes kept for re-use |

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: {name: api}
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: api}
  minReplicas: 2
  maxReplicas: 30
  metrics:
    - type: Resource
      resource: {name: cpu, target: {type: Utilization, averageUtilization: 65}}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies: [{type: Percent, value: 50, periodSeconds: 60}]
```

Scale on a metric that tracks demand (RPS, queue depth) when CPU is not the bottleneck; KEDA supports Prometheus and queue-based triggers.

## Serverless Memory Tuning

On AWS Lambda, CPU is allocated in proportion to memory, so more memory can finish faster and cost the same or less.

```text
cost = invocations x duration_seconds x memory_GB x price_per_GB_second + invocations x request_price
```

- Use AWS Lambda Power Tuning (Step Functions state machine) to test memory settings against a real payload and pick the cheapest setting that meets latency.
- ARM (`arm64`) Lambda functions have a lower GB-second price than x86.
- Reduce init work and package size to cut cold-start duration; provisioned concurrency removes cold starts but is billed while idle.

## Storage and Database Performance-Cost

- AWS gp3 volumes decouple IOPS/throughput from size; migrating from gp2 typically costs less for the same baseline. Provision IOPS only to measured need.
- Database: read the slow query log before scaling up. An index or query rewrite often removes the need for a larger instance class.
- Aurora: compare I/O-Optimized vs Standard storage configuration using the I/O share of the bill (AWS guidance: consider I/O-Optimized when I/O exceeds about a quarter of Aurora spend).
- Connection pooling (PgBouncer, RDS Proxy) lets smaller instances handle more clients.

## Anti-Patterns

| Anti-pattern | Why it fails |
|--------------|--------------|
| Rightsizing on average CPU | Peaks get throttled; use p95/p99 over a full cycle |
| Cutting memory limits to the bone | OOM kills cause restarts and retries that cost more |
| Comparing instance price, not price per unit of work | A cheaper instance that does half the work costs more |
| Tuning without a load test | Production becomes the benchmark |
| Ignoring licensing per core | Per-core licenses can dominate; fewer faster cores may be cheaper |

## Checklist

- [ ] Price-performance measured at the SLO, not at saturation
- [ ] Current-generation (and ARM where compatible) instances evaluated
- [ ] Node pool shapes match aggregate pod request ratios
- [ ] Runtime settings aware of container CPU and memory limits
- [ ] Autoscaling targets and scale-down behavior explicitly set
- [ ] Serverless memory chosen by measurement (power tuning)
