# Running the OpenTelemetry Collector at Scale on Kubernetes

Production deployment patterns for the Collector: agent vs gateway tiers, the OpenTelemetry Operator, load-balancing for tail sampling, Kubernetes metadata enrichment, durability (queues and persistent storage), self-monitoring and capacity. Pipeline component reference is in `collector-pipeline.md`; sampling policy design in `trace-sampling.md`.

## Deployment Tiers

| Tier | Kubernetes form | Responsibilities |
|---|---|---|
| Agent | DaemonSet (one per node) or sidecar | Receive OTLP from local pods, host/kubelet metrics, log file collection, k8s metadata, batching |
| Gateway | Deployment (+ HPA) | Central processing: tail sampling, redaction, routing, auth to backends |
| Cluster-level receivers | Single-replica Deployment or StatefulSet | `k8s_cluster` metrics, Kubernetes events (avoid duplicate collection from DaemonSets) |

```
pods --> agent (DaemonSet) --> loadbalancing exporter --> gateway (sampling, routing) --> backends
```

## OpenTelemetry Operator

```yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata: {name: agent, namespace: observability}
spec:
  mode: daemonset
  env:
  - name: K8S_NODE_NAME
    valueFrom: {fieldRef: {fieldPath: spec.nodeName}}
  config:
    receivers:
      otlp:
        protocols:
          grpc: {endpoint: 0.0.0.0:4317}
          http: {endpoint: 0.0.0.0:4318}
    processors:
      memory_limiter: {check_interval: 1s, limit_percentage: 80, spike_limit_percentage: 25}
      k8sattributes:
        filter: {node_from_env_var: K8S_NODE_NAME}       # only watch pods on this node
        extract:
          metadata: [k8s.namespace.name, k8s.pod.name, k8s.deployment.name, k8s.node.name]
      batch: {}
    exporters:
      loadbalancing:
        routing_key: traceID
        protocol:
          otlp: {tls: {insecure: true}}                 # in-cluster; use TLS across trust boundaries
        resolver:
          k8s: {service: gateway-collector-headless.observability}
    service:
      pipelines:
        traces: {receivers: [otlp], processors: [memory_limiter, k8sattributes, batch], exporters: [loadbalancing]}
```

The Operator also manages `Instrumentation` resources for auto-instrumentation and a Target Allocator that shards Prometheus scrape targets across Collector replicas.

RBAC: `k8sattributes` needs `get/list/watch` on pods, namespaces and replicasets (and nodes if used).

## Tail Sampling Requires Trace Affinity

Tail sampling decides after seeing all spans of a trace, so all spans of one trace must reach the same gateway replica. The `loadbalancing` exporter routes by `traceID`; gateway replicas run `tail_sampling`:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
    - name: errors
      type: status_code
      status_code: {status_codes: [ERROR]}
    - name: slow
      type: latency
      latency: {threshold_ms: 1500}
    - name: baseline
      type: probabilistic
      probabilistic: {sampling_percentage: 10}
```

Scaling the gateway changes the hash ring; traces in flight during scaling may be split. Keep gateway scaling gradual and `decision_wait` modest. Metrics and logs do not need affinity; send them to the gateway through a regular `otlp` exporter or directly to backends.

## Durability

Exporter helper settings on every network exporter:

```yaml
extensions:
  file_storage: {directory: /var/lib/otelcol/queue}
exporters:
  otlphttp/backend:
    endpoint: https://otlp.backend.example.com
    headers: {authorization: "Bearer ${env:BACKEND_TOKEN}"}
    retry_on_failure: {enabled: true, initial_interval: 5s, max_interval: 30s, max_elapsed_time: 300s}
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
      storage: file_storage            # persistent queue survives restarts
service:
  extensions: [file_storage]
```

Persistent queues need a volume (hostPath for DaemonSets, PVC for StatefulSet gateways). Without them, data in memory is lost on restart.

## Memory and Backpressure

- `memory_limiter` first in every pipeline; it refuses data when near limits, and receivers return retryable errors so SDKs back off.
- Set container memory limit and `GOMEMLIMIT` (about 80 % of the limit) so the Go runtime collects garbage before OOM.
- `batch` after `memory_limiter` and sampling, before exporters.

## Self-Monitoring

```yaml
service:
  telemetry:
    metrics:
      readers:
      - pull:
          exporter:
            prometheus: {host: 0.0.0.0, port: 8888}
```

Key metrics (names as exposed by recent Collector versions; some carry suffixes such as `_total`):

| Metric | Alert when |
|---|---|
| `otelcol_receiver_refused_spans` / `_metric_points` / `_log_records` | Non-zero sustained (memory_limiter refusing) |
| `otelcol_exporter_send_failed_*` | Rising |
| `otelcol_exporter_queue_size` vs `otelcol_exporter_queue_capacity` | Above 80 % |
| `otelcol_processor_dropped_*` | Any |
| Process memory/CPU | Near limits |

The `health_check` extension backs liveness/readiness probes; `pprof` and `zpages` aid debugging (do not expose publicly).

## Capacity and Scaling

- Agents scale with nodes automatically; size per node by pod density and log volume.
- Gateways: HPA on CPU/memory; for tail sampling, prefer fixed or slowly changing replica counts.
- Measure throughput per replica in a load test (spans/s, log records/s) with your actual processors; processors like `transform` and `tail_sampling` dominate CPU.

## Security

- TLS (and mTLS where possible) between agents, gateways and backends across trust boundaries.
- Authenticate inbound OTLP at the gateway (`bearertokenauth`, `oidc` extensions) when receiving from outside the cluster.
- Redact sensitive attributes centrally (`attributes`/`transform`/`redaction` processors).
- Restrict receiver exposure with NetworkPolicies.

## Checklist
- [ ] Agent DaemonSet + gateway Deployment, cluster receivers in a single replica
- [ ] `k8sattributes` with node filter and least-privilege RBAC
- [ ] Trace-ID load balancing in front of tail sampling
- [ ] Persistent sending queues and retries on exporters
- [ ] `memory_limiter`, `GOMEMLIMIT` and container limits aligned
- [ ] Collector self-metrics scraped and alerted
- [ ] TLS/auth and redaction at the gateway
