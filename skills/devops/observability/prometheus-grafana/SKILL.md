---
name: prometheus-grafana
description: >
  Use this skill when the user says 'prometheus grafana setup', 'kube-prometheus-stack', 'servicemonitor', 'expose /metrics', 'promql query', 'prometheus alert rule', 'alertmanager routing', 'grafana dashboard', 'red metrics', 'use method'. Sets up metrics monitoring with Prometheus, Alertmanager and Grafana: instrumentation, scrape discovery on Kubernetes, PromQL for RED/USE, alert rules with runbooks, and dashboards as code. Do NOT use for: TSDB internals, cardinality and horizontal scaling (sre-observability-scaling), SLO burn-rate design (sre-sli-slo-management), tracing (opentelemetry-tracing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [devops, observability, prometheus, grafana, alertmanager, promql]
---

# Prometheus and Grafana Monitoring

## Purpose
Collect numeric time series by pulling (scraping) `/metrics` endpoints, query them with PromQL, alert through Alertmanager, and visualize in Grafana. A good setup measures user-facing symptoms (rate, errors, duration) per service and resource saturation per component.

## Agent Protocol

### Trigger
"prometheus grafana", "kube-prometheus-stack", "ServiceMonitor", "expose /metrics", "promql", "alert rule", "alertmanager routing", "grafana dashboard", "RED metrics", "USE method".

### Input Context
- Platform (Kubernetes vs VMs), languages, existing exporters.
- Who gets paged and through which tool.

### Output Artifact
Instrumentation snippet, ServiceMonitor/scrape config, PromQL, rules, dashboard JSON outline. No file unless requested.

### Response Format
```
Metrics: {counter/histogram names + labels}
Discovery: {ServiceMonitor|PodMonitor|scrape_config}
Queries: {RED/USE PromQL}
Alerts: {name, expr, for, severity, runbook}
Dashboard: {panels}
```

### Completion Criteria
- [ ] Metric names follow conventions (`_total` counters, base units like `_seconds`, `_bytes`).
- [ ] Latency recorded as histograms, not averages.
- [ ] Every alert has `for:`, severity, and runbook link.

## Pull Model
Prometheus discovers targets (Kubernetes SD, file SD, cloud SD), scrapes them every `scrape_interval` (commonly 15–60 s), and stores samples locally. Push is only for short-lived batch jobs (Pushgateway) or via remote write/OTLP ingestion (Prometheus 3 can receive OTLP metrics when enabled).

## Instrumentation (Go example)
```go
var (
	requests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "http_requests_total", Help: "HTTP requests by route and status code.",
	}, []string{"route", "method", "code"})
	duration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "http_request_duration_seconds",
		Help:    "HTTP request latency.",
		Buckets: []float64{0.05, 0.1, 0.25, 0.5, 1, 2.5, 5},
	}, []string{"route", "method"})
)
// expose: http.Handle("/metrics", promhttp.Handler())
```
Labels must be bounded (route templates, not raw paths; no user IDs).

## Kubernetes: kube-prometheus-stack
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```
Installs Prometheus Operator, Prometheus, Alertmanager, Grafana, node-exporter, kube-state-metrics, and default rules/dashboards.
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: checkout
  namespace: shop
  labels:
    release: monitoring          # must match the Prometheus serviceMonitorSelector
spec:
  selector:
    matchLabels: { app: checkout }
  endpoints:
    - port: http-metrics         # named Service port
      interval: 30s
      path: /metrics
```

## PromQL Essentials
```promql
# RED — rate, errors, duration (per service)
sum by (route) (rate(http_requests_total{job="checkout"}[5m]))
sum(rate(http_requests_total{job="checkout",code=~"5.."}[5m])) / sum(rate(http_requests_total{job="checkout"}[5m]))
histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket{job="checkout"}[5m])))

# USE — utilization, saturation, errors (per node)
1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))
node_load1 / count by (instance) (node_cpu_seconds_total{mode="idle"})
rate(node_network_receive_errs_total[5m])

# Kubernetes
sum by (namespace, pod) (rate(container_cpu_cfs_throttled_periods_total[5m]))
  / sum by (namespace, pod) (rate(container_cpu_cfs_periods_total[5m]))
kube_deployment_status_replicas_available / kube_deployment_spec_replicas
```
Rules: `rate()` only on counters; aggregate *after* `rate`; `histogram_quantile` needs `le` kept in the `by` clause; range ≥ 4× scrape interval.

## Alert Rules
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: checkout-alerts
  namespace: shop
  labels: { release: monitoring }
spec:
  groups:
    - name: checkout
      rules:
        - alert: CheckoutHighErrorRate
          expr: |
            sum(rate(http_requests_total{job="checkout",code=~"5.."}[5m]))
              / sum(rate(http_requests_total{job="checkout"}[5m])) > 0.05
          for: 10m
          labels: { severity: page, team: payments }
          annotations:
            summary: "Checkout 5xx ratio above 5% for 10 minutes"
            runbook_url: https://runbooks.example.com/checkout/high-error-rate
        - alert: KubePodCrashLooping
          expr: increase(kube_pod_container_status_restarts_total{namespace="shop"}[15m]) > 3
          for: 5m
          labels: { severity: ticket }
```
Prefer SLO burn-rate alerts for paging (see sre-sli-slo-management); use threshold alerts for causes as tickets.

Alertmanager handles grouping, inhibition, silences, and routing to receivers (PagerDuty, Slack, email, webhooks).

## Grafana
- Provision data sources and dashboards as code (sidecar ConfigMaps in kube-prometheus-stack, Grafana provisioning files, or Terraform/Grafonnet); avoid UI-only dashboards.
- Dashboard per service: request rate, error ratio, p50/p95/p99 latency, saturation (CPU throttling, memory vs limit), dependency panels.
- Use template variables (`$namespace`, `$service`) and link panels to traces via exemplars.

## Anti-Patterns
- Averages for latency; summaries that can't be aggregated across instances.
- Unbounded labels (user_id, path with IDs, error messages).
- Alerts without `for:` (flapping) or without runbooks.
- `rate(sum(...))` instead of `sum(rate(...))`.
- Grafana edited by hand in prod with no export to Git.

## Checklist
- [ ] Services expose RED metrics with histograms.
- [ ] ServiceMonitors labelled to match the Prometheus selector.
- [ ] PrometheusRules with severity, `for`, runbook.
- [ ] Alertmanager routes per team; inhibition for node/cluster outages.
- [ ] Dashboards provisioned from Git.

## References
- Related skills: `skills/site-reliability-engineering/observability-scaling/SKILL.md`, `skills/site-reliability-engineering/sli-slo-management/SKILL.md`, `skills/devops/monitoring/SKILL.md`.
