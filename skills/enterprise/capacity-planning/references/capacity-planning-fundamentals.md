# Capacity Planning Fundamentals

Core concepts and the basic process for ensuring systems have enough capacity to meet demand at acceptable cost: demand and supply units, utilization vs saturation, Little's Law, the planning cycle, and the data required. Forecasting methods are in `forecasting.md`; headroom calculations in `headroom-math.md`; business-driver modeling in `growth-modeling.md`.

## Vocabulary

| Term | Meaning |
|------|---------|
| Demand | Workload placed on a system (requests/s, jobs/hour, GB stored, concurrent users) |
| Supply / capacity | Maximum workload the system can serve while meeting its SLOs |
| Utilization | Fraction of time or quantity a resource is busy (CPU %, disk used %) |
| Saturation | Work queued because the resource is fully busy (run queue, connection wait, I/O queue) |
| Headroom | Capacity minus expected peak demand |
| Capacity unit | Smallest scalable block (a pod, a VM type, a DB shard, a rack) with a measured throughput |
| Lead time | Time to add a capacity unit (seconds for autoscaling, weeks for hardware, months for data centers) |

Capacity is defined relative to an SLO: "this cluster serves 12,000 req/s at p99 < 300 ms" — not "the CPU is at 100%".

## Utilization Is Not Linear

Latency rises sharply as utilization approaches 100% because queues build. For a simple single-server queue (M/M/1), mean response time is `service_time / (1 - utilization)`: at 50% utilization it is 2x service time, at 90% it is 10x. Real systems differ, but the shape holds: plan to operate well below saturation and find each system's knee with load tests.

## Little's Law

`L = λ × W` — average items in the system equals arrival rate times average time in the system.

| Use | Example |
|-----|---------|
| Size concurrency | 2,000 req/s × 0.15 s = 300 requests in flight → threads/connections needed |
| Size connection pools | 500 queries/s × 0.02 s = 10 busy connections on average; add headroom for bursts |
| Queue drain time | Backlog 1,000,000 messages / 5,000 msg/s net drain = 200 s |

It holds for any stable system regardless of distribution, which makes it the most useful capacity sanity check.

## USE Method for Resource Inventory

For each resource (CPU, memory, disk, network, connection pools, locks, quotas), track:

- **U**tilization
- **S**aturation
- **E**rrors

Bottlenecks often appear first in non-hardware resources: database connections, thread pools, API rate limits, cloud service quotas, file descriptors, or IP addresses in a subnet.

## The Planning Cycle

```
1. Inventory      → services, resources, capacity units, owners, lead times
2. Measure        → current demand, utilization, saturation, peak patterns
3. Model          → capacity per unit (load tests), demand drivers
4. Forecast       → expected demand for the planning horizon (+ scenarios)
5. Plan           → required units with headroom, N+1, failure domains
6. Act            → autoscaling limits, reservations, procurement, optimization
7. Review         → forecast vs actual, adjust models (monthly/quarterly)
```

Planning horizon should exceed the longest lead time of the resources involved.

## Measuring Demand Correctly

- Use peak, not average: plan from p95–p99 of per-minute (or finer) demand over the peak period, plus known events (launches, seasonal peaks, batch windows).
- Separate organic growth from step changes (new customers, features, migrations).
- Capture demand at the entry point (requests, jobs) and per-resource consumption, so you can relate business drivers to infrastructure.

```promql
# Peak request rate per service over the last 30 days (5m resolution)
max_over_time(sum by (service) (rate(http_requests_total[5m]))[30d:5m])
```

## Determining Capacity per Unit

- Load test a single capacity unit with production-like traffic until the SLO breaks; capacity is the highest throughput that still meets the SLO (not the throughput at failure).
- Repeat after significant code or infrastructure changes; capacity per unit drifts.
- For shared resources (databases), measure the system-level limit, not just per-pod limits.

## Planning Formula (Simplified)

```
required_units = ceil( forecast_peak_demand × (1 + safety_margin) / capacity_per_unit ) + redundancy_units
```

- `safety_margin` covers forecast error and burstiness (derive from forecast intervals, not habit).
- `redundancy_units` cover failure of the largest failure domain (N+1 node, zone, or region), detailed in `headroom-math.md`.

## Elastic vs Fixed Capacity

| Resource | Planning focus |
|----------|----------------|
| Autoscaled stateless compute | Max limits, scale-up speed, quotas, cost ceilings, warm-up time |
| Databases and stateful stores | Vertical limits, sharding plan, replica lag, storage growth |
| Reserved/committed cloud spend | Commit levels matched to steady baseline |
| Hardware / colo | Lead time, power and space, procurement cycles |
| Third-party APIs and SaaS limits | Contracted quotas and rate limits |

Autoscaling does not remove capacity planning: it moves it to limits, quotas, and dependent systems that do not scale automatically.

## Data Required

| Data | Source |
|------|--------|
| Demand time series | Metrics (Prometheus, Datadog, CloudWatch) with long retention or downsampled history |
| Resource utilization and saturation | Node/container/DB metrics |
| Business drivers | Product analytics, sales pipeline, marketing calendar |
| Cost | Cloud billing exports |
| Inventory and lead times | CMDB, IaC, vendor contracts |

Keep at least 13 months of downsampled history to see annual seasonality.

## Roles

- Service owners: capacity models and SLOs for their services.
- Platform/SRE: shared infrastructure, tooling, quotas, review process.
- Finance/FinOps: commitments and budgets.
- Product/business: demand drivers and event calendar.

## Pitfalls

- Planning from averages; peaks break systems.
- Treating 100% utilization as capacity.
- Ignoring hidden limits (quotas, connection pools, licenses).
- Forecasting only infrastructure trends without business inputs.
- No feedback loop comparing forecasts with actuals.

## Checklist

- [ ] Capacity defined against SLOs, per capacity unit
- [ ] Inventory includes non-hardware limits and lead times
- [ ] Peak demand measured and annotated with events
- [ ] Load tests establish per-unit capacity and knee
- [ ] Plan covers forecast + margin + failure-domain redundancy
- [ ] Regular forecast-vs-actual review
