# Capacity Planning Advanced: Validation, Failure-Mode Capacity, and Stateful Systems

Advanced capacity work for large or critical estates: validating capacity with load tests, planning for zone and region failures, capacity of stateful systems (databases, queues, storage), cold-start and scaling-speed limits, and balancing capacity against cost commitments. Fundamentals are in `capacity-planning-fundamentals.md`; statistical models in `capacity-planning-models.md`.

## Validating Capacity with Load Tests

Goal: find the maximum throughput per capacity unit that still meets the SLO, and the system's failure behaviour beyond it.

| Test | Shape | Answers |
|------|-------|---------|
| Step / ramp test | Increase arrival rate in steps, hold each step | Knee of the latency curve; capacity per unit |
| Soak test | Expected peak for hours | Leaks, GC, connection exhaustion, storage growth |
| Spike test | Sudden jump (e.g. 3–10x) | Autoscaling reaction, queue buffering, shedding |
| Failover test | Peak load while removing a zone/node | Whether N+1 really holds |

Use open-model load generation (constant arrival rate) so the generator does not slow down when the system does:

```javascript
// k6: step to find the knee
export const options = {
  scenarios: {
    steps: {
      executor: 'ramping-arrival-rate',
      startRate: 500, timeUnit: '1s', preAllocatedVUs: 2000,
      stages: [
        { target: 1000, duration: '5m' }, { target: 1000, duration: '10m' },
        { target: 2000, duration: '5m' }, { target: 2000, duration: '10m' },
        { target: 3000, duration: '5m' }, { target: 3000, duration: '10m' },
      ],
    },
  },
  thresholds: { http_req_duration: ['p(99)<300'], http_req_failed: ['rate<0.001'] },
};
```

Record throughput, p99 latency, and saturation signals at each step; capacity is the last step where SLOs hold, minus a margin for production variance.

Production-like conditions matter: realistic data volumes, cache hit ratios, payload mix, and dependency latencies. Testing against empty databases overstates capacity.

## Universal Scalability Law (Scaling Limits)

Adding nodes rarely scales linearly because of contention (serialization) and coherency (crosstalk) costs. The USL models throughput as `X(N) = λN / (1 + α(N−1) + βN(N−1))`. Fit α and β from measurements at several cluster sizes to predict where adding nodes stops helping — or makes things worse when β > 0. Use it to decide when to shard instead of scaling out a shared component.

## Failure-Mode Capacity

| Failure domain | Capacity rule |
|----------------|---------------|
| Node | Survive loss of one node (N+1) at peak |
| Availability zone | With 3 zones, each zone runs ≤ ~67% of required peak capacity so two zones can absorb the third's traffic |
| Region (active-active) | Each region must absorb the failed region's traffic, or a defined degraded mode must apply |
| Dependency outage | Retry storms and queue backlogs after recovery need burst capacity |

Zone math: required per-zone capacity = peak / (zones − tolerated zone failures). For 3 zones tolerating 1 failure: peak / 2 per zone, so total provisioned = 1.5 × peak.

Validate with game days: drain a zone at peak-like load and watch SLOs.

## Scaling Speed as a Capacity Constraint

Autoscaling capacity at time t is limited by how fast new units become ready:

| Component | Typical delay source |
|-----------|---------------------|
| Metrics pipeline | Scrape and evaluation intervals |
| HPA / scaling policy | Stabilization windows, step limits |
| Node provisioning | Cloud instance launch, image pull, node join |
| Application warm-up | JVM JIT, cache warming, connection pools |
| Load balancer registration | Health check intervals |

If demand can rise faster than this chain reacts, keep warm headroom (low-priority overprovisioning pods that real workloads preempt, minimum replicas, scheduled scaling before known peaks). Quantify: `required_warm_headroom ≈ max demand increase during total_scale_up_time`.

## Stateful Systems

### Databases

- Vertical ceiling: largest instance class available; plan sharding or read scaling before reaching ~70% of it.
- Track: CPU, buffer cache hit ratio, IOPS and throughput vs provisioned limits, connections, replication lag, lock waits, storage growth, autovacuum/compaction backlog.
- Read replicas add read capacity, not write capacity; replica lag limits what can be offloaded.
- Storage growth: forecast table and index growth separately; account for bloat and maintenance space.

### Queues and Streams

- Capacity = sustained consumer throughput > producer peak, plus drain capacity for backlogs after incidents.
- Kafka: partitions bound consumer parallelism; broker disk and network bound throughput, with replication multiplying write traffic.
- Measure backlog drain time after a simulated consumer outage of N minutes.

### Storage

- Track growth rate by tier; plan migrations to cheaper tiers via lifecycle policies.
- Watch non-capacity limits: object count limits, request rate per prefix (mostly mitigated in S3), filesystem inode exhaustion, IOPS limits on volumes.

## Capacity vs Cost Commitments

| Lever | Fits |
|-------|------|
| On-demand | Spiky, uncertain demand |
| Savings plans / committed use discounts | Stable baseline compute |
| Reserved instances / capacity reservations | Specific instance types and zones where capacity availability itself is a risk |
| Spot / preemptible | Fault-tolerant batch and stateless workers |

Commit to the baseline you are confident in (e.g. the lower bound of the forecast interval), not to the forecast peak. Capacity reservations guarantee availability during regional shortages but cost money even when unused.

## Quotas and Hidden Limits

Inventory and monitor:
- Cloud service quotas (vCPUs per family, IPs, load balancers, Lambda concurrency, API rate limits).
- Kubernetes limits (pods per node, IPs per subnet with VPC CNI, etcd object counts).
- Third-party SaaS rate limits and license seats.

Request quota increases ahead of forecasted needs; they can take days.

## Communicating Capacity Risk

| Status | Meaning |
|--------|---------|
| Green | Forecast peak + failure-mode capacity covered beyond lead time |
| Amber | Covered for now; action required within lead time |
| Red | Forecast exceeds capacity within lead time; escalation needed |

Report per service: current peak, capacity, headroom, days until exhaustion (forecast), lead time to add capacity, and planned actions.

## Pitfalls

- Load testing with closed models that hide queueing.
- N+1 at node level but not at zone level.
- Ignoring scaling reaction time in "elastic" systems.
- Committing spend to the optimistic forecast.
- Forgetting backlog drain capacity after outages.

## Checklist

- [ ] Step, soak, spike, and failover tests with production-like data
- [ ] Zone/region failure capacity calculated and game-day validated
- [ ] Warm headroom sized from scale-up time
- [ ] Stateful systems have vertical ceilings and sharding triggers documented
- [ ] Queue drain capacity tested
- [ ] Commitments based on conservative baseline
- [ ] Quotas inventoried and monitored
