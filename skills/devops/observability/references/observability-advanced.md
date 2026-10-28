# Advanced Observability: Sampling, Pipelines, High Cardinality, Continuous Profiling, eBPF

Techniques for operating observability at scale: trace sampling strategies, Collector pipeline design, handling high-cardinality data, continuous profiling, eBPF-based telemetry, multi-tenant backends, and using observability in incident response. Cost-focused guidance is in `observability-cost.md`.

## Trace Sampling

| Strategy | Where | Pros | Cons |
|----------|-------|------|------|
| Head sampling (`parentbased_traceidratio`) | SDK at trace start | Cheap, consistent across services | Drops rare errors/slow traces at the same rate as normal ones |
| Tail sampling | Collector after trace completes | Keep all errors, slow traces, specific tenants | Needs all spans of a trace on the same Collector instance; memory |
| Rate-limiting / probabilistic in Collector | Collector | Simple volume control | Not outcome-aware |

Tail sampling policy example (Collector contrib `tail_sampling` processor):

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow
        type: latency
        latency: { threshold_ms: 1000 }
      - name: baseline
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
```

Tail sampling at scale needs a two-tier Collector: a load-balancing layer using the `loadbalancing` exporter keyed by `traceID`, then sampling Collectors. Record sampling probability so backends can extrapolate counts, or derive RED metrics from all spans before sampling (`spanmetrics` connector).

## Collector Pipeline Architecture

```
apps ──OTLP──► agent Collector (DaemonSet/sidecar)
                 - k8sattributes, resourcedetection, memory_limiter, batch
               ──► gateway Collector (Deployment, autoscaled)
                 - tail sampling, redaction, routing, transform
               ──► backends (metrics / logs / traces)
```

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, resourcedetection, transform/redact, batch]
      exporters: [otlp/traces-backend]
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp, filelog]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/logs-backend]
```

Practices:
- `memory_limiter` first in each pipeline; `batch` near the end.
- Persistent sending queues (`file_storage` extension) for durability across restarts.
- Redact sensitive attributes centrally (`transform`/`attributes`/`redaction` processors).
- Monitor the Collector itself (its internal metrics: accepted, refused, dropped, queue size).
- Use the OpenTelemetry Operator on Kubernetes for Collector deployment and auto-instrumentation injection.

## High Cardinality

Metrics backends degrade with unbounded label combinations. Strategies:
- Keep high-cardinality dimensions (user, tenant, request ID) in traces and wide structured events, queried by column-oriented stores (ClickHouse-based, Honeycomb-style backends).
- Use metric relabeling/`drop` rules and Collector `filter`/`transform` processors to remove offending labels.
- Monitor active series per metric and per team; enforce limits in Mimir/VictoriaMetrics/Thanos.
- Aggregate at the edge (Prometheus recording rules, streaming aggregation) for dashboards needing only rollups.

## Wide Events

Instead of many narrow logs, emit one rich structured event per unit of work (request, job) with dozens of attributes (customer tier, feature flags, cache hit, DB time, build ID). Queryable stores let you slice by any attribute to find the outlier dimension. OTel spans with rich attributes serve this role.

## Continuous Profiling

- Always-on, low-overhead sampling profilers attribute CPU, allocations, locks to code paths in production.
- Tools: Grafana Pyroscope, Parca, Datadog/Elastic profilers, Go `pprof` endpoints, async-profiler for JVM.
- OpenTelemetry has a profiling signal under development, and an eBPF-based profiler donated to the project; check maturity before standardizing on it.
- Link profiles to traces (span-to-profile) to see why a specific slow span was slow.

## eBPF-Based Telemetry

| Use | Examples |
|-----|----------|
| Zero-code HTTP/gRPC RED metrics and traces | Grafana Beyla, OpenTelemetry eBPF instrumentation (OBI), Pixie |
| Network flow visibility | Cilium Hubble, Retina |
| Profiling | Parca agent, Pyroscope eBPF |
| Security runtime events | Tetragon, Falco |

eBPF instruments without code changes but sees less application context (business attributes) than SDKs; combine both. Requires kernel support and privileges; validate in your environment.

## Multi-Tenancy and Scale

- Tenant headers (e.g. `X-Scope-OrgID` in Mimir/Loki/Tempo) isolate teams with per-tenant limits.
- Object-storage-backed backends (Mimir, Loki, Tempo, Thanos) scale horizontally and retain data cheaply.
- Tiered retention: high-resolution short-term, downsampled long-term metrics; logs to cold storage.

## Observability-Driven Incident Response

1. Start from the SLO alert (user impact).
2. Compare failing vs healthy requests across dimensions (version, region, tenant, endpoint) to find the discriminating attribute.
3. Jump from metrics exemplars to traces, from traces to logs and profiles.
4. Check change events (deploys, flags, config) near the onset.
5. Capture what telemetry was missing and add it as a follow-up action.

## Testing Instrumentation

- Assert spans and attributes in integration tests using in-memory exporters.
- Validate semantic convention compliance (e.g. Weaver tooling for OTel conventions).
- Load-test the telemetry pipeline at expected peak plus headroom.

## Checklist

- [ ] Head plus tail sampling with RED metrics computed pre-sampling
- [ ] Agent and gateway Collector tiers with memory limits and persistent queues
- [ ] Central redaction of sensitive attributes
- [ ] Cardinality budgets enforced per metric/team
- [ ] Wide, attribute-rich spans for high-dimensional analysis
- [ ] Continuous profiling linked to traces
- [ ] eBPF coverage for uninstrumented services
- [ ] Per-tenant limits and tiered retention
