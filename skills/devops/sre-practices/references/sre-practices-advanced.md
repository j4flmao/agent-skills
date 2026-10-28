# Advanced SRE: Overload Protection, Safe Change and Dependency Reliability

Engineering techniques SREs apply beyond SLOs and incident process: handling overload (load shedding, adaptive concurrency, retry budgets), making changes safe (canary analysis, automated rollback, config safety), managing dependency risk, and validating resilience. Related: `sli-slo-guide.md`, `error-budget-policy.md`, `capacity-planning.md`.

## Overload: Why Systems Collapse

Under overload, latency rises, clients time out and retry, retries add load, and goodput collapses (metastable failure). Defenses act at each layer:

| Layer | Defense |
|---|---|
| Client | Timeouts, retry budgets, exponential backoff with jitter, circuit breakers |
| Edge | Rate limits per client/tenant, admission control |
| Service | Load shedding, bounded queues, adaptive concurrency limits, deadline propagation |
| Dependency | Bulkheads (separate pools per dependency), fallbacks, caching |

## Retry Budgets

Limit retries to a fraction of requests instead of a per-request count:

```python
from __future__ import annotations

import time


class RetryBudget:
    """Allow retries up to `ratio` of recent requests plus a small floor per second."""

    def __init__(self, ratio: float = 0.1, min_per_sec: float = 10.0, window_s: float = 10.0) -> None:
        self.ratio, self.min_per_sec, self.window_s = ratio, min_per_sec, window_s
        self.requests: list[float] = []
        self.retries: list[float] = []

    def _trim(self, now: float) -> None:
        cutoff = now - self.window_s
        self.requests = [t for t in self.requests if t >= cutoff]
        self.retries = [t for t in self.retries if t >= cutoff]

    def record_request(self) -> None:
        self.requests.append(time.monotonic())

    def can_retry(self) -> bool:
        now = time.monotonic()
        self._trim(now)
        allowed = self.ratio * len(self.requests) + self.min_per_sec * self.window_s
        if len(self.retries) < allowed:
            self.retries.append(now)
            return True
        return False
```

Production systems get this from proxies/meshes (Envoy `retry_budget` in cluster circuit breakers, Linkerd retry budgets) or resilience libraries (Resilience4j, Polly) rather than hand-written code. Retry at one layer only.

## Load Shedding and Prioritization

- Reject early (before expensive work) with `503` + `Retry-After` or `429` when queue time or in-flight count exceeds a limit.
- Classify requests by criticality (e.g. user-interactive > batch > prefetch) and shed lowest first.
- Shed on queueing delay, not CPU alone; CoDel-style "time in queue > target for interval" works well for request queues.
- Adaptive concurrency limits (gradient/AIMD algorithms, e.g. Netflix concurrency-limits, Envoy adaptive concurrency filter) find the concurrency at which latency starts to rise and cap there.

## Deadline Propagation

Pass the remaining time budget downstream (gRPC deadlines, `context.Context`, headers like `grpc-timeout`); servers abandon work whose caller has already given up. Inner timeouts shorter than outer ones.

## Safe Change

Most incidents follow changes (deploys, config, flags, infrastructure).

| Practice | Implementation |
|---|---|
| Progressive rollout | Canary → percentage steps → full, per region/zone |
| Automated canary analysis | Compare canary vs baseline metrics (error rate, latency, saturation) with statistical tests; Argo Rollouts/Flagger/Spinnaker Kayenta |
| Automated rollback | Rollback triggered by analysis failure or SLO burn, no human in the loop for the revert |
| Config as code | Configs reviewed, validated (schema), and rolled out progressively like binaries |
| Feature flags | Decouple deploy from release; kill switches for risky features |
| Change freezes | Tied to error budget exhaustion and peak events, not arbitrary |
| Change correlation | Annotate dashboards with deploys/flag changes |

Bake time: hold each stage long enough to observe slow failures (memory leaks, daily batch interactions).

## Dependency Reliability

- Your availability is bounded by the product of hard dependencies' availability unless you degrade gracefully: three serial dependencies at 99.9 % each give roughly 99.7 % at best.
- Classify dependencies: hard (request fails without it) vs soft (degrade). Convert hard to soft where possible (cache, defaults, async).
- Track dependency SLIs from the caller's perspective; agree SLOs with providers.
- Bulkheads: separate connection pools/threads per dependency so one slow dependency cannot exhaust shared resources.
- Static stability: keep serving with last-known-good config/data when control planes are unavailable.

## Graceful Degradation Ladder

| Level | Behavior |
|---|---|
| Normal | Full features |
| Degraded 1 | Disable non-critical features (recommendations, personalization) |
| Degraded 2 | Serve cached/stale data with banner |
| Degraded 3 | Read-only mode |
| Emergency | Static maintenance page; protect data integrity |

Implement switches before you need them and test them in game days.

## Resilience Validation

- Load tests beyond peak to find the knee and failure mode (does goodput collapse or plateau?).
- Chaos experiments with hypotheses and abort conditions: kill instances, add latency to dependencies, fail a zone, exhaust connection pools.
- Game days rehearsing incident roles and degradation switches.
- DR drills: restore from backup, regional failover, measured against RTO/RPO.

## Metrics That Reveal Overload Early

| Signal | Why |
|---|---|
| Queue time / time-in-queue | Rises before errors |
| Retry rate and retry ratio | Retry storms |
| Concurrency (in-flight) | Approaching limits |
| Shed/rejected requests by priority | Defense working as intended? |
| Saturation (CPU throttling, pool utilization) | Capacity headroom |

## Checklist
- [ ] Timeouts and deadline propagation on every remote call
- [ ] Retry budgets at a single layer; circuit breakers on dependencies
- [ ] Priority-aware load shedding and adaptive concurrency where needed
- [ ] Progressive rollouts with automated analysis and rollback (code and config)
- [ ] Dependencies classified; hard dependencies minimized; bulkheads in place
- [ ] Degradation ladder implemented and exercised
- [ ] Load, chaos and DR tests on a schedule
