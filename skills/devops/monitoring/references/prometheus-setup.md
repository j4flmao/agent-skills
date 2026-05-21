# Prometheus Setup Reference

## Full Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 30s
  external_labels:
    cluster: production-us-east
    region: us-east-1

alerting:
  alertmanagers:
    - scheme: http
      static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "rules/recording.yml"
  - "rules/alerts.yml"

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets:
          - localhost:9090

  - job_name: kubernetes-nodes
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_pod_annotation_prometheus_io_scrape
        action: keep
        regex: true
      - source_labels:
          - __meta_kubernetes_pod_annotation_prometheus_io_path
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels:
          - __address__
          - __meta_kubernetes_pod_annotation_prometheus_io_port
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels:
          - __meta_kubernetes_namespace
        action: replace
        target_label: namespace
      - source_labels:
          - __meta_kubernetes_pod_name
        action: replace
        target_label: pod

  - job_name: kubernetes-services
    kubernetes_sd_configs:
      - role: service
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_service_annotation_prometheus_io_scrape
        action: keep
        regex: true
      - source_labels:
          - __meta_kubernetes_service_annotation_prometheus_io_path
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels:
          - __address__
          - __meta_kubernetes_service_annotation_prometheus_io_port
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  - job_name: node-exporter
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - source_labels:
          - __address__
        replacement: node-exporter:9100
        target_label: __address__

  - job_name: blackbox-http
    metrics_path: /probe
    params:
      module:
        - http_2xx
    static_configs:
      - targets:
          - https://app.example.com/health
          - https://api.example.com/health
          - https://admin.example.com/health
    relabel_configs:
      - source_labels:
          - __address__
        target_label: __param_target
      - source_labels:
          - __param_target
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: blackbox-tcp
    metrics_path: /probe
    params:
      module:
        - tcp_connect
    static_configs:
      - targets:
          - db.example.com:5432
          - redis.example.com:6379
    relabel_configs:
      - source_labels:
          - __address__
        target_label: __param_target
      - source_labels:
          - __param_target
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

## Recording Rules

```yaml
# rules/recording.yml
groups:
  - name: service_slos
    interval: 30s
    rules:
      - record: service:error_rate_5m
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
      - record: service:error_rate_30m
        expr: rate(http_requests_total{status=~"5.."}[30m]) / rate(http_requests_total[30m])
      - record: service:latency_p50_5m
        expr: histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))
      - record: service:latency_p95_5m
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
      - record: service:latency_p99_5m
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
      - record: service:request_rate_5m
        expr: rate(http_requests_total[5m])
      - record: service:request_rate_30m
        expr: rate(http_requests_total[30m])
      - record: namespace:cpu_usage
        expr: sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace)
      - record: namespace:memory_usage
        expr: sum(container_memory_working_set_bytes) by (namespace)
      - record: cluster:error_budget_30d
        expr: (1 - (sum(rate(http_requests_total{status=~"5.."}[30d])) / sum(rate(http_requests_total[30d])))) - 0.999
```

## Alerting Rules

```yaml
# rules/alerts.yml
groups:
  - name: infrastructure
    interval: 30s
    rules:
      - alert: NodeDown
        expr: up{job="node-exporter"} == 0
        for: 1m
        labels:
          severity: P0
        annotations:
          summary: "Node {{ $labels.instance }} down"
          description: "Node {{ $labels.instance }} has been unreachable for >1m"
          runbook: "https://runbook.example.com/node-down"

      - alert: HighCpuUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 10m
        labels:
          severity: P2
        annotations:
          summary: "CPU > 85% on {{ $labels.instance }}"

      - alert: CriticalCpuUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "CPU > 95% on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "Disk < 10% free on {{ $labels.instance }} ({{ $value | humanizePercentage }})"

      - alert: DiskSpaceCritical
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 5
        for: 2m
        labels:
          severity: P0
        annotations:
          summary: "Disk < 5% free on {{ $labels.instance }}"

      - alert: HighMemoryPressure
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 < 10
        for: 5m
        labels:
          severity: P2
        annotations:
          summary: "Memory < 10% available on {{ $labels.instance }}"

      - alert: OOMKillDetected
        expr: increase(node_vmstat_oom_kill[5m]) > 0
        labels:
          severity: P1
        annotations:
          summary: "OOM kill detected on {{ $labels.instance }}"

      - alert: DiskFillRate
        expr: predict_linear(node_filesystem_free_bytes{mountpoint="/"}[1h], 3600 * 4) < 0
        for: 30m
        labels:
          severity: P2
        annotations:
          summary: "Disk on {{ $labels.instance }} predicted full within 4h"
```

## Storage and Retention

| Metric | Value |
|---|---|
| Retention | 15 days local, 30 days recommended |
| Sample rate | 1 sample / 15s per series |
| Max series | 500,000 per Prometheus instance |
| Storage | ~1KB/sample → ~5.7M samples/day/series |
| Disk per series | ~5.7MB/day, ~171MB/month |
| Block duration | 2h (default) |
| WAL size | ~5% of TSDB size |

## Remote Write

```yaml
remote_write:
  - url: "https://thanos-receive.example.com/api/v1/receive"
    basic_auth:
      username: "${REMOTE_WRITE_USER}"
      password: "${REMOTE_WRITE_PASS}"
    queue_config:
      capacity: 2500
      max_samples_per_send: 500
      batch_send_deadline: 5s
      min_backoff: 30ms
      max_backoff: 100ms
    write_relabel_configs:
      - source_labels:
          - __name__
        regex: "(container_.*|node_.*|http_.*)"
        action: keep
```
