---
name: monitoring
description: Monitoring stack configuration — Prometheus, Grafana, Loki, ELK Stack. Metrics, logs, traces, dashboards.
---

# Monitoring Stack

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

## Stack Selection

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

## Prometheus Configuration

### Scrape Configs

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

### Recording Rules

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

### Retention and Sizing

| Metric | Rule |
|---|---|
| **Local storage retention** | 15 days default, 30 days for SSD |
| **Remote write retention** | As long as remote storage allows |
| **Sample rate** | 1 sample / 15s per time series default |
| **Cardinality limit** | <500,000 active series per Prometheus |
| **Storage calculation** | ~1KB per sample → 8M samples/day = ~8GB/day |

## Grafana Configuration

### Folder Structure

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

### Data Source Configuration

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

## Loki Configuration

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

### Log Label Strategy

| Label | Source | Cardinality | Search |
|---|---|---|---|
| `job` | Scrape config | Low | All queries |
| `namespace` | K8s metadata | Low | Filter by namespace |
| `pod` | K8s metadata | High | Debug specific pod |
| `container` | K8s metadata | Low | Filter by container |
| `level` | Log line | Very low | Error filtering |
| `service` | Application | Low | Service-specific logs |

## ELK Stack Configuration

### Filebeat Config

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

### Index Lifecycle Policy

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

## Monitoring SLOs

| Signal | Target | Measurement |
|---|---|---|
| **Availability** | 99.9% | (total requests - 5xx) / total requests |
| **Latency p99** | <500ms | histogram_quantile(0.99, ...) |
| **Log ingestion** | <1 min delay | Current time - max log timestamp |
| **Metrics freshness** | <30s | Time since last scrape per target |
| **Alert delivery** | <1 min | Alert fired → notification received |

## References

### Reference Files
- `references/prometheus-setup.md` — Full Prometheus configuration, exporters, service discovery
- `references/grafana-dashboards.md` — Dashboard design patterns, JSON model, provisioning
- `references/loki-setup.md` — Loki configuration, logQL queries, multi-tenancy
- `references/elk-setup.md` — ELK stack setup, index templates, pipeline configurations

### Related Skills
- `devops/observability/SKILL.md` — Observability fundamentals and tracing
- `management/alerting/SKILL.md` — Alert rules and notification routing
- `devops/helm-patterns/SKILL.md` — Helm deploy of monitoring stack
- `devops/terraform/SKILL.md` — Infrastructure provisioning for monitoring

## Handoff

Hand off to `management/alerting/SKILL.md` for alert rule configuration. Hand off to `devops/helm-patterns/SKILL.md` for deploying monitoring stack on Kubernetes. Hand off to `devops/terraform/SKILL.md` for provisioning monitoring infrastructure.
