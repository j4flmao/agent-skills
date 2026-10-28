# Advanced Monitoring: Scaling, SLO Burn-Rate Alerting, OpenTelemetry Pipelines and Cost Control

Techniques for monitoring at scale: long-term and highly available metrics storage (Thanos, Grafana Mimir, VictoriaMetrics), multi-window burn-rate alerts, OpenTelemetry Collector pipelines, exemplars and signal correlation, cardinality management, synthetic and RUM monitoring, and monitoring the monitoring system itself.

## Scaling Prometheus

A single Prometheus server is limited by memory (active series) and local disk retention, and is a single point of failure.

| Approach | How it works | Use when |
|---|---|---|
| Functional sharding | Separate Prometheus per team/domain | Simple growth |
| HA pairs | Two identical Prometheus scraping the same targets; dedupe at query time | Need availability |
| Thanos | Sidecar uploads blocks to object storage; Querier fans out and deduplicates; Store Gateway serves history; Compactor downsamples | Keep existing Prometheus, add global view and long retention |
| Grafana Mimir | Horizontally scalable, multi-tenant remote-write backend on object storage | Central metrics platform for many teams |
| VictoriaMetrics (single or cluster) | Remote-write backend with efficient compression | Cost-efficient large-scale storage |
| Agent mode / Grafana Alloy / OTel Collector | Scrape and remote-write without local storage | Edge clusters feeding a central backend |

```yaml
# prometheus.yml remote write to a central backend
remote_write:
  - url: https://mimir.example.com/api/v1/push
    headers:
      X-Scope-OrgID: team-payments
    queue_config:
      max_samples_per_send: 5000
      capacity: 20000
    write_relabel_configs:
      - source_labels: [__name__]
        regex: "go_gc_.*|process_.*"
        action: drop                      # do not ship low-value series
```

Prometheus 3.x supports native histograms, OTLP ingestion (`--web.enable-otlp-receiver`) and UTF-8 metric names; plan label conventions accordingly.

## Multi-Window, Multi-Burn-Rate SLO Alerts

Burn rate = observed error rate / allowed error rate (1 - SLO). A burn rate of 1 uses the budget exactly over the SLO window.

Recommended pattern for a 30-day SLO (from the Google SRE workbook):
| Severity | Long window | Short window | Burn rate | Budget consumed when it fires |
|---|---|---|---|---|
| Page | 1 h | 5 min | 14.4 | 2% |
| Page | 6 h | 30 min | 6 | 5% |
| Ticket | 3 d | 6 h | 1 | 10% |

```yaml
groups:
  - name: checkout-slo
    rules:
      - record: slo:checkout_errors:ratio_rate5m
        expr: |
          sum(rate(http_requests_total{job="checkout",code=~"5.."}[5m]))
          / sum(rate(http_requests_total{job="checkout"}[5m]))
      - record: slo:checkout_errors:ratio_rate1h
        expr: |
          sum(rate(http_requests_total{job="checkout",code=~"5.."}[1h]))
          / sum(rate(http_requests_total{job="checkout"}[1h]))
      - alert: CheckoutErrorBudgetFastBurn
        expr: |
          slo:checkout_errors:ratio_rate1h > (14.4 * 0.001)
          and
          slo:checkout_errors:ratio_rate5m > (14.4 * 0.001)
        labels:
          severity: page
          team: payments
        annotations:
          summary: "Checkout is burning its 99.9% error budget fast"
          runbook_url: https://runbooks.example.com/checkout/slo-burn
```
The short window makes the alert resolve quickly after recovery. Tools such as Sloth, Pyrra or OpenSLO-based generators produce these rules from SLO definitions.

## OpenTelemetry Collector Pipelines

```yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }
  prometheus:
    config:
      scrape_configs:
        - job_name: node
          static_configs: [{ targets: ["node-exporter:9100"] }]

processors:
  memory_limiter: { check_interval: 1s, limit_percentage: 80, spike_limit_percentage: 20 }
  k8sattributes: {}
  resource:
    attributes:
      - { key: deployment.environment.name, value: production, action: upsert }
  attributes/redact:
    actions:
      - { key: http.request.header.authorization, action: delete }
  tail_sampling:
    decision_wait: 10s
    policies:
      - { name: errors, type: status_code, status_code: { status_codes: [ERROR] } }
      - { name: slow, type: latency, latency: { threshold_ms: 1000 } }
      - { name: baseline, type: probabilistic, probabilistic: { sampling_percentage: 5 } }
  batch: {}

exporters:
  otlphttp/metrics: { endpoint: https://mimir.example.com/otlp }
  otlphttp/traces: { endpoint: https://tempo.example.com }
  otlphttp/logs: { endpoint: https://loki.example.com/otlp }

service:
  pipelines:
    metrics: { receivers: [otlp, prometheus], processors: [memory_limiter, k8sattributes, resource, batch], exporters: [otlphttp/metrics] }
    traces:  { receivers: [otlp], processors: [memory_limiter, k8sattributes, attributes/redact, tail_sampling, batch], exporters: [otlphttp/traces] }
    logs:    { receivers: [otlp], processors: [memory_limiter, k8sattributes, attributes/redact, batch], exporters: [otlphttp/logs] }
```
- Agent collectors (DaemonSet) near workloads, gateway collectors for sampling, redaction and export.
- Tail sampling needs all spans of a trace on the same gateway: use the load-balancing exporter keyed by trace ID.
- `memory_limiter` first in every pipeline; persistent sending queues for backend outages.

## Correlating Signals
- **Exemplars**: attach trace IDs to histogram samples so a latency spike links to example traces (Prometheus exemplar storage, Grafana).
- **Trace-to-logs**: inject `trace_id`/`span_id` into structured logs.
- **Deploy annotations** on dashboards from CI/CD events.
- Consistent resource attributes (`service.name`, `service.version`, `k8s.namespace.name`) across all signals.

## Cardinality Management
| Technique | Example |
|---|---|
| Find top series | `topk(20, count by (__name__) ({__name__=~".+"}))`, Prometheus TSDB status page, Mimir cardinality API |
| Drop or aggregate at ingestion | `metric_relabel_configs` drop labels; recording rules then drop raw |
| Per-tenant limits | Mimir/VictoriaMetrics series and ingestion limits |
| Bucket design | Fewer histogram buckets or native histograms |
| Route templating | Use route templates, not raw paths |

## Synthetic and Real-User Monitoring
- Synthetic checks from multiple regions for critical journeys (login, checkout) with browser automation; alert on multi-location failures to avoid single-probe noise.
- RUM: Core Web Vitals (LCP, INP, CLS) and JS errors by page and release; FID was replaced by INP as a Core Web Vital in March 2024.

## Monitoring the Monitoring
- Alert on: scrape failures (`up == 0`), rule evaluation failures, remote-write queue backlog/dropped samples, collector refused/dropped data, Alertmanager notification failures.
- **Dead man's switch**: an always-firing alert routed to an external heartbeat service; silence of the heartbeat pages someone.
- Run the alerting path (Alertmanager/on-call) in a separate failure domain from the systems it monitors.

## Cost Control
- Budget per team: series, log GB/day, trace spans/day.
- Sample traces (head + tail); keep 100% of errors.
- Log levels and sampling for noisy debug logs; drop health-check logs.
- Downsample old metrics; tier logs to object storage.

## Checklist
- [ ] HA and long-term storage strategy chosen (Thanos/Mimir/VictoriaMetrics)
- [ ] SLO alerts use multi-window burn rates
- [ ] OTel Collector agent + gateway tiers with memory limits, redaction and sampling
- [ ] Exemplars and trace IDs in logs for correlation
- [ ] Cardinality monitored with enforced limits
- [ ] Synthetic checks for critical journeys; RUM with INP
- [ ] Meta-monitoring and dead man's switch in place
