# Capacity Planning

Capacity planning translates **business demand into infrastructure capacity** with explicit headroom for failure, growth, and incident response. Load testing produces the empirical numbers; capacity planning turns them into a budget, a topology, and an autoscaling configuration that does not melt during the next launch.

A capacity plan is **wrong the day it is published** — traffic patterns, code paths, and dependencies all change. Treat it as a living document with a quarterly review cadence tied to load test re-runs.

---

## 1. The Capacity Equation

```
Required capacity = (Peak RPS × Headroom × Failure factor) / (RPS per unit)
```

| Term | Definition | Typical value |
|------|------------|---------------|
| Peak RPS | 95th percentile of forecasted peak (5-min bucket) | from analytics + forecast |
| Headroom | Buffer for traffic variance and bursts | 1.3 – 2.0× |
| Failure factor | Capacity loss tolerated during incident | 1.25 (lose 1 AZ of 3) to 2.0 (lose 1 of 2 regions) |
| RPS per unit | Sustained RPS a single pod/VM serves at p99 SLO | from load test (Step 2 below) |

### Worked example — API service

| Input | Value | Source |
|-------|-------|--------|
| Forecast peak RPS (next 12 months) | 8,000 | Product + finance |
| Headroom | 1.5 | SRE standard |
| Failure factor | 1.5 (lose 1 of 3 AZs) | Architecture |
| RPS per pod (p95 < 300 ms) | 120 | k6 saturation test |

Required pods = ceil((8000 × 1.5 × 1.5) / 120) = **150 pods** distributed across 3 AZs = 50 pods/AZ. Each AZ must host 75 (one AZ fails → remaining two carry 75 each, still under 100/AZ ceiling).

---

## 2. Deriving "RPS per unit" — the saturation test

The single most-cited capacity number. Run a **stepped load test** and inflect on the SLO, not on raw throughput.

### k6 stepped saturation script

```javascript
// scripts/saturation.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const reqLatency = new Trend("req_latency", true);

export const options = {
  stages: [
    { duration: "2m", target: 25 },   // step 1
    { duration: "2m", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "2m", target: 400 },
    { duration: "2m", target: 800 },  // until p95 breaches
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    // No abort — we WANT to see the breakage curve
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const t0 = Date.now();
  const res = http.get(`${__ENV.BASE_URL}/api/orders?limit=20`);
  reqLatency.add(Date.now() - t0);
  check(res, { "ok": (r) => r.status === 200 });
  sleep(0.3);
}
```

Run against **a single replica with no autoscaling** (`kubectl scale deploy api --replicas=1` + HPA disabled). Plot RPS vs p95 latency. The "RPS per unit" is the RPS at the last step where p95 stays below SLO and error rate < 0.1%.

### Saturation curve (typical)

```
p95 (ms)
 600 ┤                                  *   ← breakdown
 400 ┤                              *
 200 ┤              * * *  *
 100 ┤    * * *
   0 └────────────────────────────────────────  RPS/pod
       20  50  100 150 200 250 300
                              ^
                              RPS per unit = 200
```

### What to look for at the knee
| Signal | Likely cause |
|--------|--------------|
| p95 climbs linearly with RPS | Healthy — running out of CPU |
| p95 jumps step-wise | Connection pool exhaustion |
| Error rate spikes before latency | Upstream timeout (DB, cache) |
| Latency flat, throughput plateaus | Single-threaded bottleneck |
| CPU < 70% but latency high | Lock contention or I/O wait |

---

## 3. Demand Forecasting Inputs

Capacity is a function of **future** demand, not last week's chart. Collect these inputs from product, finance, and analytics:

| Input | Source | Refresh cadence |
|-------|--------|-----------------|
| MAU / DAU forecast | Product analytics + finance plan | Monthly |
| Conversion funnel rates | Mixpanel / Amplitude | Monthly |
| Seasonal multipliers | 2 years of historical traffic | Quarterly |
| Marketing campaign calendar | Marketing ops | Weekly during launches |
| API client growth (B2B) | Sales pipeline | Monthly |
| Geographic expansion | Product roadmap | Per launch |

### Forecast model (simple, defensible)

```python
# capacity/forecast.py
from dataclasses import dataclass
from datetime import date

@dataclass
class Forecast:
    base_rps: float          # current p95 peak RPS
    monthly_growth: float    # e.g. 0.07 = 7%/month
    seasonality: dict[int, float]  # month -> multiplier
    campaign_uplift: dict[date, float]  # launch date -> peak multiplier

    def rps_on(self, target: date) -> float:
        months = (target.year - date.today().year) * 12 + (target.month - date.today().month)
        organic = self.base_rps * (1 + self.monthly_growth) ** months
        seasonal = organic * self.seasonality.get(target.month, 1.0)
        campaign = max(
            (mult for d, mult in self.campaign_uplift.items() if d == target),
            default=1.0,
        )
        return seasonal * campaign

if __name__ == "__main__":
    f = Forecast(
        base_rps=3200,
        monthly_growth=0.05,
        seasonality={11: 1.4, 12: 1.6, 1: 0.8},  # BFCM, holidays
        campaign_uplift={date(2026, 11, 28): 2.5},  # Black Friday
    )
    print(f"Plan for {date(2026,11,28)}: {f.rps_on(date(2026,11,28)):,.0f} RPS")
```

### Always plan for **the worst Tuesday of the worst month** plus a campaign multiplier — not the average.

---

## 4. Multi-Tier Capacity Model

Real systems are not one component. Compute capacity for **each tier** that can become the bottleneck:

| Tier | Capacity unit | Constraint |
|------|--------------|------------|
| Edge (CDN / WAF) | Requests / sec, GB / sec | Provider quota, contract |
| Load balancer | New conns / sec, active conns | LB SKU limits |
| Application | Pods / RPS-per-pod | CPU, memory, GC |
| Cache (Redis) | Ops/sec, memory | Single-shard limit ~100k ops/s |
| Primary DB | TPS, IOPS, connections | Write contention |
| Read replicas | QPS, replica lag | Replication throughput |
| Async queue | Msgs/sec, depth | Broker IOPS, consumer rate |
| Object storage | PUT/GET req/s, bandwidth | S3 prefix limits (3.5k PUT/s) |
| Egress | Mbps | NAT GW, ISP contract |

### Bottleneck calculation

For each tier, compute `tier_max_rps = tier_capacity / requests_per_user_action`. The system's true capacity is `min(all tier_max_rps)`.

```
Component     | Capacity     | Rqs / user action | Max user RPS
--------------|--------------|-------------------|--------------
API pods      | 150 × 120/s  | 1                 | 18,000
Redis         | 100k ops/s   | 6                 | 16,667 ← bottleneck
Postgres      | 2,000 tps    | 0.2 (cached)      | 10,000 ← real bottleneck
Order queue   | 5,000 msg/s  | 0.5               | 10,000
```

If the plan target is 8,000 RPS, headroom is ~25% on Postgres. **Anything above 10,000 RPS requires DB scale-out before adding pods.**

---

## 5. Cloud Quotas — the silent ceiling

You cannot autoscale past the quotas your account holds. Audit these BEFORE the launch:

| AWS quota | Default | Often hit when |
|-----------|---------|----------------|
| EC2 vCPU per region | 384 (on-demand) | > 100 c5.4xlarge |
| EBS gp3 storage / region | 50 TiB | Large DB / log archive |
| ELB per region | 50 | Multi-service mesh |
| NAT GW bandwidth | 45 Gbps | High-egress workloads |
| Route53 queries / sec | 10,000 | Microservice mesh w/ no caching |
| S3 PUT/prefix | 3,500/s | Bulk ingest |
| Lambda concurrent | 1,000 | Spiky workloads |
| RDS connections | per-instance | App not pooling |

### Quota audit script (AWS)

```bash
# scripts/quota-audit.sh
SERVICES=(ec2 elasticloadbalancing rds dynamodb s3 lambda)
for svc in "${SERVICES[@]}"; do
  aws service-quotas list-service-quotas \
    --service-code "$svc" \
    --query 'Quotas[?Value!=null].[QuotaName,Value]' \
    --output table > "quota-${svc}.txt"
done
```

**File quota increase tickets 30 days before a known launch** — AWS support often takes 5–10 business days for non-standard increases.

---

## 6. Autoscaling Design

Autoscaling does not give you capacity; it gives you **elasticity within the capacity you already have**.

### HPA (Kubernetes) — production config

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api }
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 30         # cover baseline + 1 AZ failure
  maxReplicas: 200        # hard cap = quota / safety
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: { type: Utilization, averageUtilization: 60 }  # leave 40% for bursts
  - type: Pods
    pods:
      metric: { name: http_requests_per_second }
      target: { type: AverageValue, averageValue: "100" }    # < RPS-per-unit
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30    # react fast to spikes
      policies:
      - type: Percent
        value: 100                       # double pods per step
        periodSeconds: 30
      - type: Pods
        value: 10                        # or +10 pods
        periodSeconds: 30
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300   # slow scale-down, avoid flap
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Tuning checklist

| Symptom | Fix |
|---------|-----|
| Pods scale up after latency spike (too late) | Switch to RPS metric, drop CPU target to 50% |
| Flapping (scale up/down repeatedly) | Increase `scaleDown.stabilizationWindowSeconds` |
| Stuck at minReplicas during off-hours | Lower minReplicas + add scheduled scaling |
| Hits maxReplicas during normal peak | Quota / capacity plan is wrong, re-plan |
| Cold start adds 30s p99 | Use pre-warmed pods (KEDA scheduled) or smaller image |

### Cluster autoscaler / Karpenter coupling

HPA scales pods; Karpenter / cluster autoscaler scales nodes. Latency:

```
Spike → HPA decision (15s) → New pod pending (5s) →
Karpenter provisions node (30–90s) → Pod ready (10s)
≈ 60–120s end to end
```

For sub-minute spikes you **must** keep idle capacity (overprovisioning pods or `priorityClassName: pause-pods`).

---

## 7. Load Test → Capacity Plan Pipeline

Run this every quarter and after major release.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 1. Saturation │ →│ 2. Forecast  │ →│ 3. Plan calc │ →│ 4. Provision │
│    test       │  │    demand    │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
       │                                      │
       ▼                                      ▼
  RPS-per-unit                         Quota requests
  Bottleneck inventory                 HPA tuning
                                       Standby pre-warm
```

### CI job — quarterly capacity report

```yaml
# .github/workflows/capacity-report.yml
name: capacity-report
on:
  schedule:
    - cron: "0 6 1 */3 *"   # 06:00 UTC, 1st day of every 3rd month
  workflow_dispatch:
jobs:
  capacity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: k6 run --out json=saturation.json scripts/saturation.js
        env: { BASE_URL: ${{ secrets.PERF_URL }} }
      - run: python capacity/forecast.py > forecast.txt
      - run: python capacity/plan.py saturation.json forecast.txt > plan.md
      - uses: peter-evans/create-pull-request@v6
        with:
          title: "Capacity plan ${{ steps.date.outputs.q }}"
          branch: capacity/auto
          labels: capacity, sre
          body-path: plan.md
```

---

## 8. Cost Modeling

A capacity plan that ignores cost gets vetoed. Always pair it with a $/RPS metric.

| Component | Pricing model | Sensitivity |
|-----------|--------------|-------------|
| EC2 / GKE node | per vCPU-hour | Linear w/ load |
| RDS | per instance-hour + IOPS | Step (instance class) |
| Aurora Serverless v2 | per ACU-hour | Linear |
| Data transfer | per GB | Surprise on multi-AZ |
| S3 | per GB-month + per request | High on small-object workloads |
| Lambda | per GB-second + invocations | Spiky / bursty workloads cheaper |

### $/1000 RPS table — fill from your bill

| Tier | Monthly $ | RPS @ peak | $/1000 RPS-month |
|------|-----------|------------|------------------|
| API compute | $12,400 | 8,000 | $1,550 |
| Postgres (db.r6g.4xl × 2) | $4,200 | 8,000 | $525 |
| Redis (cache.m6g.large × 3) | $480 | 8,000 | $60 |
| ALB + NAT | $1,100 | 8,000 | $138 |
| **Total** | **$18,180** | **8,000** | **$2,273** |

A 2× growth plan must show that $/1000 RPS does **not** double — that's the test for whether scaling is efficient.

---

## 9. Failure-Aware Sizing

| Failure | Capacity loss | Sizing rule |
|---------|--------------|-------------|
| 1 pod crash | 1/N | trivial — buffered by HPA |
| 1 node failure | typical 10–20 pods | min replicas ≥ 2× per-node count |
| 1 AZ failure | 1/AZ count | reserve `1/AZcount` capacity / AZ |
| 1 region failure | 100% in region | DR plan, see backup-dr skill |
| Dependency throttle (DB read replica down) | 50% read capacity | circuit breaker + cache |
| Deployment in progress | up to surge% | use surge=25%, maxUnavailable=0 |

### PodDisruptionBudget — protects against drains

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: api }
spec:
  minAvailable: 80%            # never let drain take more than 20%
  selector: { matchLabels: { app: api } }
```

### Topology spread — prevent AZ skew

```yaml
spec:
  template:
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector: { matchLabels: { app: api } }
```

---

## 10. Observability — closing the loop

You cannot manage capacity you cannot measure. Standard dashboard panels:

| Panel | Promql / metric | Alert |
|-------|-----------------|-------|
| Headroom | `1 - (current_rps / capacity_rps)` | < 20% sustained 10 min |
| RPS per pod | `sum(rate(http_requests_total[5m])) / count(up{app=~"api"})` | > 0.9 × tested limit |
| HPA at max | `kube_hpa_status_current_replicas == kube_hpa_spec_max_replicas` | true for 5 min |
| Saturation (CPU) | `avg(rate(container_cpu_usage_seconds_total[5m]))` | > 70% 10 min |
| DB conn pool | `pg_stat_activity_count / pg_settings_max_connections` | > 80% |
| Cache hit ratio | `redis_keyspace_hits / (hits + misses)` | < 90% |
| Saturation forecast (Holt-Winters) | `predict_linear(http_requests[1h], 86400) > capacity` | breach in 24h |

### "Will I survive next Black Friday?" SLO

```promql
# Recording rule
record: capacity:headroom_at_peak:ratio
expr: |
  1 - (
    max_over_time(sum(rate(http_requests_total[5m]))[7d:1m])
    / on() vector(15000)         # planned capacity
  )
```
Alert if headroom forecast < 30% within 30 days using `predict_linear` over 14d.

---

## 11. Capacity for Async / Background Work

Synchronous capacity is RPS-centric. Async workloads are **depth and drain-rate** centric.

| Quantity | Definition | Target |
|----------|-----------|--------|
| Producer rate | Msgs enqueued/sec | from event source |
| Consumer rate | Msgs processed/sec/consumer | from load test |
| Required consumers | producer / per-consumer | rounded up |
| Worst-case backlog | producer × outage-duration | drain in < SLO |
| Drain time | backlog / (consumers × per-consumer) | < 4× peak window |

### Worked: order processing queue

- Peak producer = 1,500 msg/s, per-consumer = 60 msg/s → 25 consumers
- Plan for 30-min outage → backlog 1,500 × 1,800 = 2.7M
- Drain SLO 30 min after recovery → need 1,500 + (2.7M / 1,800) = **3,000 msg/s** for 30 min
- → 50 consumers during recovery (auto-scale on queue depth, e.g. KEDA)

### KEDA scaler example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: orders-worker }
spec:
  scaleTargetRef: { name: orders-worker }
  minReplicaCount: 5
  maxReplicaCount: 60
  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.../orders
      queueLength: "30"          # target msgs per consumer
      awsRegion: us-east-1
```

---

## 12. Multi-region Capacity Planning

| Pattern | Capacity model |
|---------|---------------|
| Active-Passive | Region A = 100% of peak, Region B = 100% (idle) — **2× cost** |
| Active-Active (DNS split) | Each region = peak / regions × failover-buffer (typ 60%) |
| Cell-based | Each cell = fixed shard of traffic; size = max-cell + 1 cell of spare |

### Active-Active sizing (2 regions, 60% each)

- Peak global RPS = 8,000
- Sized per region: 8,000 × 0.6 = **4,800 RPS per region**
- During regional outage: surviving region must absorb 8,000 — works because 4,800 × 1.66 ≈ 8,000, and we already build in 1.5× headroom so 4,800 × 1.5 = 7,200 ≈ peak. Tight; recommend 0.7 ratio.

### Quota: ensure both regions have separate quotas; AWS quotas are regional.

---

## 13. Capacity Plan Template (one-pager)

```markdown
# Capacity Plan — {service} — {quarter}

## SLO
- p95 < 300 ms, error < 0.1%, availability 99.95%

## Forecast (12 months)
| Date | Peak RPS | Source |
| 2026-Q3 | 6,500 | analytics |
| 2026-Q4 (BFCM) | 16,000 | finance + 2x multiplier |
| 2027-Q1 | 7,200 | post-launch baseline |

## Saturation
- RPS per pod: 120 (last tested 2026-04-12, k6 saturation v3.2)
- Bottleneck: Postgres write IOPS at 12,000 RPS

## Plan
- Steady state: 60 pods across 3 AZs (20/AZ)
- BFCM: pre-scale to 200 pods, RDS r6g.8xl, Aurora reader +1
- Reserved capacity purchased: 80 vCPU 1-yr, $X savings

## Risk register
- AZ outage during BFCM → switch to single-AZ mode, p99 doubles
- Quota: vCPU limit 1,000 — increase ticket filed 2026-09-01

## Cost
- Steady $18.2k/mo, BFCM week $34k, $/1000 RPS = $2.27k
```

---

## 14. Anti-patterns

| Anti-pattern | Why it bites |
|--------------|-------------|
| "We'll just autoscale" without saturation test | HPA cannot conjure capacity beyond quota or DB ceiling |
| Capacity based on averages | Bursts kill SLO; always use p95/p99 |
| Using load test results from > 6 months ago | Code paths drift; re-test every quarter |
| Ignoring async queues | Sync RPS may be fine while backlog explodes |
| Single AZ deployment | One AZ outage = 100% outage |
| HPA target CPU = 80% | No room for spike absorption |
| No staging environment of similar size | Plan is unverifiable |
| Forecast as a single number | Use min/expected/max scenarios |
| Cost not modeled | Plan vetoed at finance review |

---

## 15. Cross-references

- `references/test-design.md` — scenario shape that produces RPS-per-unit numbers
- `references/execution.md` — running saturation and stepped tests at scale
- `references/chaos-and-soak.md` — verifies failure-aware sizing assumptions
- `references/k6-scripts.md` — production-grade scripts to feed the pipeline
- `skills/devops/observability/SKILL.md` — dashboards and alerts referenced here
- `skills/devops/backup-dr/SKILL.md` — multi-region capacity overlaps with DR
