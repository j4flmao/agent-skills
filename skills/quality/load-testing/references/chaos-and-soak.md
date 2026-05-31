# Chaos and Soak Testing

Load tests find the **knee of the curve**. Chaos and soak tests find what happens when the curve runs into walls that load alone cannot reveal: slow memory leaks, connection-pool exhaustion, file-descriptor starvation, dependency timeouts, cache stampedes, and partial failure modes.

A system that passes a 10-minute load test but melts after 6 hours of soak is **production-broken** — it just hasn't melted yet.

---

## 1. Soak Testing

### Definition
Soak = sustained load at **70–85% of tested capacity** for **2+ hours** (production-critical: 24–72 h).

### Why 70–85%?
- 100% would just be a stress test that errors immediately
- < 50% never exercises GC pressure or pool contention
- 70–85% sustains the same hot paths production does for hours, surfacing rate-of-change defects

### Defect classes only soak reveals

| Defect | Symptom | Root cause |
|--------|---------|-----------|
| Heap leak | RSS grows monotonically, GC pauses lengthen | Cached refs not evicted, listener leak |
| Off-heap leak | RSS grows but heap stable | Direct buffer / native lib leak |
| FD leak | `Too many open files` after N hours | Sockets/files not closed on error path |
| Conn pool leak | New requests time out | DB conn not released on exception |
| Disk fill | Latency cliff when disk > 90% | Logs / temp files unbounded |
| Cache key explosion | Latency creeps | Per-user keys with no TTL |
| Background job pile-up | Queue lag grows | Producer > consumer over time |
| Time-based bug | Breaks at midnight UTC | Daily-rollover code path |
| Cert / token expiry | Errors after exactly N hours | JWT TTL, mTLS cert |
| Memory fragmentation | jemalloc RSS grows w/o leak | Long-lived process, varied allocs |

### k6 soak script

```javascript
// scripts/soak.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    soak: {
      executor: "constant-arrival-rate",
      rate: 800,                    // 80% of tested 1000 RPS
      timeUnit: "1s",
      duration: "8h",               // overnight
      preAllocatedVUs: 200,
      maxVUs: 400,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<400", "p(99)<800"],
    http_req_failed: ["rate<0.005"],
    // ABSOLUTE thresholds — fail if drift detected
    "http_req_duration{stage:end}": ["p(95)<450"],     // <12% drift OK
  },
  // tag the last 30 min separately to compare to first 30 min
};

const userIds = new Array(50_000).fill(0).map((_, i) => `u_${i}`);
export default function () {
  const u = userIds[Math.floor(Math.random() * userIds.length)];
  const r = http.get(`${__ENV.BASE_URL}/api/users/${u}/orders`);
  check(r, { ok: (x) => x.status === 200 });
  sleep(0.3 + Math.random() * 0.2);
}
```

### Soak success criteria (objective)

| Metric | Threshold |
|--------|-----------|
| p95 drift (last 30 min vs first 30 min) | < 15% |
| Error rate | < 0.5% sustained |
| RSS growth (per pod) | < 5% over 4 h after warm-up |
| GC pause p99 | < 2× warm-up baseline |
| File descriptors | flat, < 80% ulimit |
| DB conns active | bounded, never reaches max |
| Restarts | 0 |

### Companion `tail` script

While k6 generates load, run this on each app pod for the duration:

```bash
# scripts/soak-monitor.sh — runs in a sidecar / kubectl exec
INTERVAL=60
END=$(date +%s -d '+8 hours')
echo "ts,rss_kb,heap_used,gc_pause_ms,fd_count,conn_count" > soak.csv
while [ "$(date +%s)" -lt "$END" ]; do
  ts=$(date +%s)
  rss=$(ps -o rss= -p 1)
  heap=$(curl -s localhost:9090/metrics | awk '/^jvm_memory_used_bytes.*heap/ {print $2}')
  gc=$(curl -s localhost:9090/metrics | awk '/^jvm_gc_pause_seconds_max/ {print $2*1000}')
  fd=$(ls /proc/1/fd | wc -l)
  conn=$(ss -tn state established | wc -l)
  echo "$ts,$rss,$heap,$gc,$fd,$conn" >> soak.csv
  sleep "$INTERVAL"
done
```

Plot post-run; require monotonic growth slope < 0.5%/hour.

---

## 2. Chaos Testing

### Definition
Chaos = deliberately injecting failures during load to validate **resilience hypotheses**. Not random; each experiment is a falsifiable prediction.

### Hypothesis template

```
Steady-state behavior:
  - p95 latency < 300 ms
  - error rate < 0.1%

Hypothesis:
  When we inject {failure} into {component} for {duration},
  the system will continue to meet steady-state behavior
  because {mitigation: retry, circuit breaker, replica, etc.}.

Blast radius:
  - Affects: {pods/region}
  - Excludes: {production-critical}
  - Abort condition: error rate > 5% for 30s
```

### Catalog of experiments

| Experiment | Tool | Frequency | Owner SLO |
|------------|------|-----------|-----------|
| Kill 1 pod | `kubectl delete pod` / Chaos Mesh PodChaos | weekly | p95 unaffected |
| Kill 1 node | Karpenter drift / `kubectl drain` | monthly | p95 < 1.5× during 2-min drain |
| Network latency +500 ms to DB | Chaos Mesh NetworkChaos | quarterly | timeouts trigger, no 5xx storm |
| Network partition (split brain) | tc / Pumba | quarterly | reads continue, writes fail closed |
| Packet loss 10% | tc / Chaos Mesh | quarterly | retries succeed, p99 stays bounded |
| CPU stress (1 pod 95%) | stress-ng / StressChaos | monthly | HPA reacts, traffic shifts |
| Memory pressure | stress-ng | monthly | OOMKilled isolated; LB removes pod |
| Disk full | `dd if=/dev/zero of=/var/log/junk` | quarterly | logs roll, alerts fire |
| DNS failure | Chaos Mesh DNSChaos | quarterly | DNS caching survives, recovery < 30s |
| AZ outage simulation | route table block | quarterly | traffic shifts < 60s |
| Dependency 500% latency | toxiproxy | monthly | circuit breaker opens, fallback used |
| Dependency 100% errors | toxiproxy | monthly | retries bounded, fallback used |
| Clock skew (+5 min) | chronyd offset | annually | JWT validation tolerates skew |
| Certificate expired | NTP jump | annually | warning fires 14d before, no incident |

### Chaos Mesh — concrete example

```yaml
# chaos/db-latency.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: db-latency-experiment
  namespace: chaos-engineering
spec:
  action: delay
  mode: one
  selector:
    namespaces: [production]
    labelSelectors:
      "app": "postgres-primary"
  delay:
    latency: "500ms"
    correlation: "100"
    jitter: "50ms"
  duration: "5m"
  direction: to
  target:
    mode: all
    selector:
      namespaces: [production]
      labelSelectors:
        "app": "api"
```

Apply during a constant-rate k6 run. Expected outcomes — written in advance:

| t | Expected |
|---|----------|
| 0 s | Inject begins |
| 0–10 s | p99 doubles, p50 unaffected (cache hits) |
| 10–60 s | Circuit breaker on slow query opens, fallback returns cached data |
| 60–300 s | Steady state with degraded reads, no 5xx |
| 300 s | Inject ends |
| 300–360 s | Breakers close, latency returns to baseline |

**If observed ≠ expected → the experiment found a bug, even if nothing crashed.**

### toxiproxy — local / staging

```bash
# Start toxiproxy in front of the DB
toxiproxy-server &
toxiproxy-cli create -l 127.0.0.1:25432 -u postgres.cluster.svc.cluster.local:5432 db

# Inject 500ms latency
toxiproxy-cli toxic add -t latency -a latency=500 db

# Run load
k6 run -e DB_URL=postgres://app@127.0.0.1:25432/app scripts/load.js

# Remove toxic
toxiproxy-cli toxic remove -n latency_downstream db
```

---

## 3. Game Days

A **game day** is a scheduled chaos exercise involving the on-call team, with no advance script.

### Format

| Phase | Duration | Activity |
|-------|----------|----------|
| Pre-brief | 30 min | Goals, scope, abort conditions, observers |
| Inject | 60–120 min | Facilitator introduces failures sequentially |
| Response | live | On-call follows runbooks; observers take notes |
| Recovery | 30 min | System restored, all chaos undone |
| Debrief | 60 min | Blameless review, write actions |

### Roles

| Role | Responsibility |
|------|---------------|
| Facilitator | Decides what to inject, when; holds abort button |
| Scribe | Records timeline, decisions, gaps |
| On-call (primary) | Detects, mitigates per runbook |
| Observer | Watches dashboards, logs anomalies |
| Customer proxy | Synthetic monitor — declares "customer impact" |
| Comms | Writes status page updates (drill mode) |

### Sample game-day scenario script

```
T+0  Inject: 50% CPU on api pods in us-east-1a
T+5  Observe: HPA reaction time, AZ balance
T+15 Inject: Postgres primary failover (RDS manual)
T+25 Observe: Application recovery, conn pool refresh
T+40 Inject: Block egress to S3 (NACL)
T+50 Observe: Async job behavior, backlog metrics
T+70 Restore all, observe steady-state return
T+90 Debrief
```

---

## 4. Combined Soak + Chaos

The most valuable test: a **multi-hour soak with periodic chaos injections**. Reveals interactions between long-term drift and acute failure.

```javascript
// scripts/soak-chaos.js — k6 driver
import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";

export const options = {
  scenarios: {
    baseline: {
      executor: "constant-arrival-rate",
      rate: 600, timeUnit: "1s", duration: "12h",
      preAllocatedVUs: 200, maxVUs: 400,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{phase:steady}": ["p(95)<400"],
    "http_req_duration{phase:chaos}": ["p(95)<800"],   // allowed degradation
    "http_req_duration{phase:recovery}": ["p(95)<450"], // must recover
  },
};

// Side-channel: a separate process runs chaos schedule:
// 02:00 — kill 1 pod
// 04:00 — db latency +200ms for 10min
// 06:00 — partition us-east-1a for 5min
// 08:00 — restart redis
// 10:00 — disk pressure on logs
```

### Tag traffic by phase so dashboards distinguish

```javascript
const tags = (() => {
  const m = exec.scenario.iterationInTest % 3600;          // per hour
  if (m < 600) return { phase: "steady" };
  if (m < 1200) return { phase: "chaos" };
  return { phase: "recovery" };
})();
http.get(url, { tags });
```

---

## 5. Observability for Chaos / Soak

Chaos is meaningless without precise observation. Required panels:

| Panel | Query |
|-------|-------|
| RED — request rate / errors / duration | `rate(http_requests_total[1m])` |
| USE — utilization / saturation / errors | per resource |
| Pod restarts | `kube_pod_container_status_restarts_total` |
| OOMKilled events | `kube_pod_container_status_terminated_reason{reason="OOMKilled"}` |
| Circuit breaker state | `resilience4j_circuitbreaker_state` |
| DB connection pool | `hikaricp_connections_active / hikaricp_connections_max` |
| Heap usage | `jvm_memory_used_bytes{area="heap"}` |
| GC pause | `rate(jvm_gc_pause_seconds_sum[5m])` |
| Cache hit ratio | `redis_keyspace_hits_total / (hits + misses)` |
| Queue depth | per consumer |

### Soak-specific: trend lines

Use Grafana **stat panel** with `Sparkline` showing 12-hour trend; compare hour 0 vs hour 11. Annotate chaos injection times so debrief reads timeline at a glance.

### Distributed tracing
Tag every request with `chaos.experiment=<id>` and `chaos.injecting=true|false`. After the run, query traces filtered to chaos windows; compare percentile latency by trace span.

---

## 6. Failure-Mode Inventory

Before designing chaos experiments, list failure modes for **every dependency**. A useful template:

| Dependency | Failure modes | Detection | Mitigation | Chaos experiment |
|------------|--------------|-----------|-----------|------------------|
| Postgres primary | down, slow, full disk, replica lag | LB health, PgBouncer errors, monitoring | failover, queue writes | kill primary, slow query |
| Redis | down, full memory, slow eviction | client timeout, OOM metric | cache-aside fallback to DB | kill, MEMORY pressure |
| S3 | rate limit, slow, 5xx | SDK errors | exponential backoff, queue | inject 503, latency |
| Stripe / payment | 5xx, latency, fraud lock | API errors | idempotent retry, queue, manual fallback | toxiproxy errors |
| DNS | failure, slow | resolver timeout | DNS caching, retry | DNSChaos |
| Cluster autoscaler | quota hit | pending pods > 5m | overprovision, multi-pool | block API |
| Auth (OIDC) | down | login error | cached tokens, grace TTL | shut idp pod |

---

## 7. Soak / Chaos in CI

### Nightly soak (CI staging)

```yaml
# .github/workflows/soak.yml
name: nightly-soak
on:
  schedule: [{ cron: "0 22 * * *" }]   # 10pm UTC
jobs:
  soak:
    runs-on: [self-hosted, performance]
    timeout-minutes: 540
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - name: 8-hour soak
        run: k6 run --out experimental-prometheus-rw scripts/soak.js
        env: { BASE_URL: ${{ secrets.STAGING_URL }}, K6_PROMETHEUS_RW_SERVER_URL: ${{ secrets.PROM_RW }} }
      - name: Drift analysis
        run: python scripts/soak-drift.py results.json --max-drift 0.15
      - name: File issue on regression
        if: failure()
        uses: peter-evans/create-issue@v3
        with: { title: "Soak regression ${{ github.run_id }}", body-file: report.md }
```

### Weekly chaos game day (manual trigger, scheduled invite)

```yaml
name: chaos-gameday
on: { workflow_dispatch: {} }
jobs:
  inject:
    runs-on: [self-hosted, chaos]
    steps:
      - uses: actions/checkout@v4
      - run: kubectl apply -f chaos/pod-kill-api.yaml
      - run: sleep 600                                  # observe
      - run: kubectl delete -f chaos/pod-kill-api.yaml
```

---

## 8. Drift Detection Script

```python
# scripts/soak-drift.py — compares first and last window
import json, sys
from statistics import mean, quantiles

data = json.load(open(sys.argv[1]))
limit = float(sys.argv[3])   # 0.15

samples = data["metrics"]["http_req_duration"]["values"]   # adjust to your dump format
n = len(samples)
first = samples[: n // 6]      # first ~16%
last  = samples[-n // 6 :]     # last  ~16%

p95_first = quantiles(first, n=20)[18]
p95_last  = quantiles(last,  n=20)[18]
drift = (p95_last - p95_first) / p95_first

print(f"p95 first={p95_first:.1f}ms last={p95_last:.1f}ms drift={drift:.2%}")
if drift > limit:
    print(f"FAIL: drift {drift:.2%} > {limit:.2%}")
    sys.exit(1)
```

---

## 9. Security & Safety

| Risk | Control |
|------|---------|
| Chaos in prod hits customers | Strict label selector + namespace allowlist; require approval for prod |
| Chaos persists past intended window | Always set `spec.duration`; kill-switch CronJob removes all `chaos-mesh.org` resources |
| Test data leaks via load script | Use synthetic data; never copy prod PII |
| Load test triggers WAF / DDoS protection | Whitelist source IPs; coordinate with CDN |
| Bandwidth costs spike | Budget alerts on egress; cap RPS in script |
| Cred leakage in test images | Pull secrets from vault, never bake in |
| Test cluster reachable from internet | Private subnets, jumpbox-only access |

### Kill switch (every chaos namespace)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: chaos-killswitch, namespace: chaos-engineering }
spec:
  schedule: "*/15 * * * *"     # safety net: nothing lives > 15 min unless renewed
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: chaos-admin
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: bitnami/kubectl:1.30
            command: ["sh", "-c"]
            args:
              - |
                kubectl get podchaos,networkchaos,stresschaos,iochaos,dnschaos -A \
                  -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.kind}{" "}{.metadata.name}{" "}{.spec.duration}{"\n"}{end}' \
                  | awk '$4 == "" {system("kubectl delete "$2" "$3" -n "$1)}'
```

---

## 10. Multi-Region Chaos

| Experiment | Method | What it validates |
|-----------|--------|-------------------|
| Single region down | Route53 health-check force-fail | DNS failover < 60s, capacity in survivor |
| Cross-region replication lag | tc delay on replication network | Read-after-write tolerance in app |
| Asymmetric partition | NACL block A→B only | Detection of one-way splits |
| Region recovery | Re-enable + measure catch-up | RPO accuracy, replication backlog drain |

### Tie to backup-dr skill: chaos that simulates regional outage **is** a DR drill. Run them jointly.

---

## 11. Anti-patterns

| Anti-pattern | Better |
|--------------|--------|
| Chaos with no hypothesis | Write the predicted outcome first |
| Chaos in prod with no kill switch | Mandatory CronJob cleanup |
| Soak < 1 hour | Won't reveal leaks; minimum 2 h |
| Same data shape every iteration | Cache becomes 100% hit, masks DB load |
| Reusing same 10 user IDs | Permission/data-skew bugs invisible |
| Running soak with debug logging | I/O dominates, masks real bottlenecks |
| Ignoring "successful" chaos results | If nothing surprises, broaden experiment |
| Game day with the architect as on-call | Real on-call must respond |
| Letting chaos run during deployment | Confounds attribution |
| Tearing down telemetry after run | Lose forensic evidence |

---

## 12. Checklist

### Before
- [ ] Hypothesis written, abort conditions agreed
- [ ] Blast radius limited (selector, namespace, % traffic)
- [ ] Kill switch tested
- [ ] Stakeholders notified (status page draft if prod)
- [ ] Baseline captured for last 1 h
- [ ] Dashboards open, annotations enabled
- [ ] On-call paged in (drill mode for non-prod)

### During
- [ ] Scribe captures timeline + decisions
- [ ] Abort at SLO breach (5xx > 5%, p99 > 5x)
- [ ] Monitor blast-radius creep (chaos hitting unintended targets)

### After
- [ ] All injections undone, confirm via `kubectl get` + dashboards
- [ ] Steady-state recovered for 15 min
- [ ] Blameless debrief within 24 h
- [ ] Actions filed with owners + deadlines
- [ ] Report archived in incident tracker

---

## 13. Cross-references

- `references/test-design.md` — soak scenario specification
- `references/execution.md` — long-running k6 distributed execution
- `references/capacity-planning.md` — chaos validates failure-aware sizing
- `skills/devops/observability/SKILL.md` — dashboards & alerts referenced
- `skills/devops/backup-dr/references/dr-runbook.md` — regional chaos = DR drill
- `skills/devops/incident-response/SKILL.md` — game day runbook + roles
