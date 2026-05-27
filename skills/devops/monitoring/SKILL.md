---
name: monitoring
description: >
  Use this skill when configuring observability and monitoring stack — Prometheus, Grafana, Loki, ELK Stack. This skill enforces: Prometheus scrape configs with relabeling, Grafana dashboard folder hierarchy, Loki log label strategy, Alertmanager routing by severity, SLO tracking with error budgets. Do NOT use for: application-level instrumentation, CI/CD pipeline monitoring, infrastructure provisioning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, monitoring, phase-5]
---

# Monitoring Stack

## Purpose
Define and enforce monitoring stack configuration with Prometheus, Grafana, Loki, and ELK for metrics, logs, traces, and alerting.

## Agent Protocol

### Trigger
User request includes: `monitoring`, `prometheus`, `grafana`, `loki`, `elk`, `elasticsearch`, `kibana`, `logstash`, `beats`, `filebeat`, `metricbeat`, `tempo`, `jaeger`, `datasource`, `dashboard`.

### Input Context
- Current monitoring setup (if any)
- Infrastructure (Kubernetes, bare metal, cloud)
- Scale (number of nodes/services)
- Budget (open-source vs enterprise)
- Required integrations (Slack, PagerDuty, Opsgenie)

### Output Artifact
A markdown document containing:
- Monitoring stack architecture diagram (text)
- Tool selection rationale (Prometheus vs Datadog, etc.)
- Prometheus configuration (scrape configs, recording rules, alerting rules)
- Grafana dashboard structure (folder hierarchy, data source setup)
- Loki configuration (log scrape, labels, retention)
- ELK configuration (index templates, pipeline, shard strategy)
- Integration with on-call (Alertmanager → PagerDuty/Slack)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Monitoring architecture defined with data flow
- Prometheus scrape configs for all service types
- Grafana dashboard folder structure defined
- Loki log pipeline with label strategy
- Retention and storage sizing calculated
- Alertmanager routing configured

### Max Response Length
4096 tokens

## Workflow

### Step 1: Select Stack Components

| Tool | Purpose | When |
|---|---|---|
| **Prometheus** | Metrics collection + alerting | Kubernetes, dynamic workloads |
| **Grafana** | Dashboards + visualization | Universal (any data source) |
| **Loki** | Log aggregation (K8s native) | Kubernetes, Prometheus ecosystem |
| **ELK (Elasticsearch + Logstash + Kibana)** | Log aggregation + search | Complex log parsing, full-text search, SIEM |
| **Tempo** | Distributed tracing | Need traces correlated with metrics/logs |
| **Promtail** | Log shipping → Loki | Kubernetes log collection |
| **Filebeat** | Log shipping → ELK | Lightweight, wide format support |
| **Metricbeat** | System metrics → ELK | Infrastructure metrics |

### Step 2: Configure Prometheus

**Scrape Configs**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  - job_name: 'node-exporter'
    kubernetes_sd_configs:
      - role: node

  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://app.example.com/health
        - https://api.example.com/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
```

**Recording Rules**

```yaml
# rules/recording.yml
groups:
  - name: service_slos
    interval: 30s
    rules:
      - record: service:error_rate_5m
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
      - record: service:latency_p99_5m
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

**Retention and Sizing**

| Metric | Rule |
|---|---|
| **Local storage retention** | 15 days default, 30 days for SSD |
| **Remote write retention** | As long as remote storage allows |
| **Sample rate** | 1 sample / 15s per time series default |
| **Cardinality limit** | <500,000 active series per Prometheus |
| **Storage calculation** | ~1KB per sample → 8M samples/day = ~8GB/day |

**Alerting Rules**

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
          runbook: "https://runbook.example.com/node-down"

      - alert: HighCpuUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 10m
        labels:
          severity: P2
        annotations:
          summary: "CPU > 90% on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "Disk < 10% free on {{ $labels.instance }}"

      - alert: HighMemoryPressure
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 < 10
        for: 5m
        labels:
          severity: P2
        annotations:
          summary: "Memory < 10% available on {{ $labels.instance }}"

  - name: kubernetes
    interval: 30s
    rules:
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 2
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "Pod {{ $labels.pod }} restarting frequently"

      - alert: PersistentVolumeFilling
        expr: (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) * 100 > 85
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "PV {{ $labels.persistentvolumeclaim }} > 85% full"

      - alert: PodsPending
        expr: kube_pod_status_phase{phase="Pending"} > 0
        for: 15m
        labels:
          severity: P2
        annotations:
          summary: "{{ $value }} pods pending > 15min"

  - name: applications
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "{{ $labels.service }} error rate > 5%"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "{{ $labels.service }} p99 latency > 2s"

      - alert: ServiceDown
        expr: probe_success{job="blackbox"} == 0
        for: 1m
        labels:
          severity: P0
        annotations:
          summary: "{{ $labels.target }} is unreachable"

      - alert: ZeroTraffic
        expr: rate(http_requests_total[5m]) == 0
        for: 5m
        labels:
          severity: P0
        annotations:
          summary: "{{ $labels.service }} zero traffic — possible outage"

      - alert: HighLogErrorRate
        expr: sum(rate({job=~".+"} |= "error" [5m])) by (job) > 10
        for: 5m
        labels:
          severity: P2
        annotations:
          summary: "Error log rate > 10/s for {{ $labels.job }}"
```

**Alertmanager Configuration**

```yaml
# alertmanager.yml
route:
  receiver: default
  group_by:
    - alertname
    - severity
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: P0
      receiver: pagerduty-critical
      repeat_interval: 5m
      group_wait: 10s
    - match:
        severity: P1
      receiver: slack-warning
      repeat_interval: 30m
    - match:
        severity: P2
      receiver: slack-info
      repeat_interval: 6h
    - match:
        severity: P3
      receiver: null
    - match_re:
        job: "(node-exporter|kube-state-metrics)"
      receiver: infra-team
      group_by:
        - alertname
        - instance

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - routing_key: "${PD_ROUTING_KEY}"
        severity: critical
        description: "{{ .GroupLabels.alertname }} — {{ .CommonAnnotations.summary }}"
        client: "Prometheus"
        client_url: "{{ .ExternalURL }}"

  - name: slack-warning
    slack_configs:
      - api_url: "${SLACK_WEBHOOK_URL}"
        channel: "#alerts-critical"
        title: "{{ .GroupLabels.alertname }}"
        text: "{{ .CommonAnnotations.summary }}"
        color: danger
        fields:
          - title: Severity
            value: "{{ .GroupLabels.severity }}"
          - title: Service
            value: "{{ .GroupLabels.job }}"
          - title: Grafana
            value: "{{ .GeneratorURL }}"

  - name: slack-info
    slack_configs:
      - api_url: "${SLACK_WEBHOOK_URL}"
        channel: "#alerts-info"
        title: "{{ .GroupLabels.alertname }}"
        text: "{{ .CommonAnnotations.summary }}"
        color: warning

  - name: infra-team
    slack_configs:
      - api_url: "${SLACK_WEBHOOK_URL}"
        channel: "#infra-alerts"
        title: "Infra: {{ .GroupLabels.alertname }}"
        text: "{{ .CommonAnnotations.summary }}"

inhibit_rules:
  - source_match:
      severity: P0
    target_match:
      severity: P2
    equal:
      - instance
  - source_match:
      alertname: NodeDown
    target_match:
      alertname: HighCpuUsage
    equal:
      - instance
```

### Step 3: Configure Grafana

**Folder Structure**

```
/
├── Infrastructure/
│   ├── Node Exporter / CPU, Memory, Disk, Network
│   └── Kubernetes / Cluster, Nodes, Pods
├── Applications/
│   ├── {service-name} / RED metrics
│   └── Databases / Query latency, connections
├── Business/
│   ├── Orders / Volume, value, funnel
│   └── Users / Registrations, churn, activity
└── SLOs/
    ├── Error Budget / Remaining budget per service
    └── Latency / P50, P95, P99 vs targets
```

**Data Source Configuration**

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true
    jsonData:
      timeout: 60
      prometheusType: Prometheus
  - name: Loki
    type: loki
    url: http://loki:3100
    access: proxy
    jsonData:
      timeout: 60
      maxLines: 1000
  - name: Tempo
    type: tempo
    url: http://tempo:3200
    access: proxy
  - name: Elasticsearch
    type: elasticsearch
    url: http://elasticsearch:9200
    database: "[logs-]YYYY.MM.DD"
    jsonData:
      esVersion: 8.0.0
      interval: Daily
      timeField: "@timestamp"
```

### Step 4: Configure Loki

```yaml
# loki-config.yaml
auth_enabled: false
server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /data/loki/index
    cache_location: /data/loki/index_cache
    shared_store: filesystem
  filesystem:
    directory: /data/loki/chunks

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  retention_period: 720h  # 30 days
  max_query_series: 500
```

**Log Label Strategy**

| Label | Source | Cardinality | Search |
|---|---|---|---|
| `job` | Scrape config | Low | All queries |
| `namespace` | K8s metadata | Low | Filter by namespace |
| `pod` | K8s metadata | High | Debug specific pod |
| `container` | K8s metadata | Low | Filter by container |
| `level` | Log line | Very low | Error filtering |
| `service` | Application | Low | Service-specific logs |

### Step 5: Configure ELK Stack

**Filebeat Config**

```yaml
# filebeat.yml
filebeat.inputs:
  - type: container
    paths:
      - /var/log/containers/*.log
    processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
            - logs_path:
                logs_path: "/var/log/containers/"

output.elasticsearch:
  hosts: ['${ELASTICSEARCH_HOST:elasticsearch}:9200']
  index: "logs-%{+yyyy.MM.dd}"
```

**Index Lifecycle Policy**

```json
{
  "policy": {
    "phases": {
      "hot": { "min_age": "0ms", "actions": { "rollover": { "max_size": "50GB", "max_age": "1d" } } },
      "warm": { "min_age": "7d", "actions": { "shrink": { "number_of_shards": 1 } } },
      "cold": { "min_age": "30d", "actions": { "freeze": {} } },
      "delete": { "min_age": "90d", "actions": { "delete": {} } }
    }
  }
}
```

### Step 6: Define Monitoring SLOs

| Signal | Target | Measurement |
|---|---|---|
| **Availability** | 99.9% | (total requests - 5xx) / total requests |
| **Latency p99** | <500ms | histogram_quantile(0.99, ...) |
| **Log ingestion** | <1 min delay | Current time - max log timestamp |
| **Metrics freshness** | <30s | Time since last scrape per target |
| **Alert delivery** | <1 min | Alert fired → notification received |

## Rules
- Prometheus scrape configs use relabeling for Kubernetes service discovery — never static targets for K8s workloads.
- Grafana dashboards organized by folder hierarchy: Infrastructure → Applications → Business → SLOs. No unorganized dashboards.
- Loki labels limited to low-cardinality values — never use `pod` or `traceID` as mandatory labels.
- Alertmanager routes segregated by severity: P0 → PagerDuty, P1 → Slack warning, P2 → Slack info, P3 → suppressed.
- Every Prometheus alert has a `runbook` annotation pointing to a recovery procedure.
- Retention period set per component: Prometheus 15d local, Loki 30d, ELK 90d with tiered lifecycle.
- Cardinality limit <500,000 active series per Prometheus instance — monitor with `prometheus_tsdb_head_series`.
- All monitoring components deployed with resource limits and persistent storage.
- SLOs defined with error budget tracking for every production service.
- Alert delivery verified with synthetic tests — never trust alerting without validation.

## References
  - references/elk-setup.md — ELK Stack Setup Reference
  - references/grafana-dashboards.md — Grafana Dashboard Design
  - references/loki-setup.md — Loki Setup Reference
  - references/monitoring-advanced.md — Monitoring Advanced Topics
  - references/monitoring-fundamentals.md — Monitoring Fundamentals
  - references/prometheus-setup.md — Prometheus Setup Reference
## Handoff

Hand off to `management/alerting/SKILL.md` for alert rule configuration. Hand off to `devops/helm-patterns/SKILL.md` for deploying monitoring stack on Kubernetes. Hand off to `devops/terraform/SKILL.md` for provisioning monitoring infrastructure.
