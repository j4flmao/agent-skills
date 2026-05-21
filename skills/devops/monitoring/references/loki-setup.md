# Loki Setup Reference

## Loki Configuration (Single Binary)

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

common:
  path_prefix: /data/loki
  storage:
    filesystem:
      chunks_directory: /data/loki/chunks
      rules_directory: /data/loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v12
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /data/loki/index
    cache_location: /data/loki/index_cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /data/loki/chunks

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  retention_period: 720h  # 30 days
  max_query_series: 500
  max_query_parallelism: 32
  max_entries_limit_per_query: 5000
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20

compactor:
  working_directory: /data/loki/compactor
  shared_store: filesystem
  retention_enabled: true

ruler:
  storage:
    type: local
    local:
      directory: /data/loki/rules
  rule_path: /data/loki/rules-tmp
  alertmanager_url: http://alertmanager:9093
  ring:
    kvstore:
      store: inmemory
  enable_api: true
```

## Loki Configuration (Microservices Mode)

```yaml
# Minimal per-component configs
# Distributor:
target: distributor
common:
  ring:
    kvstore:
      store: consul
```

## Promtail Configuration

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 9097

positions:
  filename: /run/promtail/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: kubernetes-pods
    pipeline_stages:
      - cri: {}  # CRI format parsing
      - regex:
          expression: "^(?P<level>\\w+)\\s+(?P<message>.*)"
      - labels:
          level:
      - timestamp:
          source: time
          format: RFC3339Nano
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - action: keep
        regex: true
        source_labels:
          - __meta_kubernetes_pod_annotation_promtail_io_scrape
      - source_labels:
          - __meta_kubernetes_pod_annotation_promtail_io_parser
        action: replace
        target_label: __path__
      - source_labels:
          - __meta_kubernetes_namespace
        target_label: namespace
      - source_labels:
          - __meta_kubernetes_pod_name
        target_label: pod
      - source_labels:
          - __meta_kubernetes_pod_container_name
        target_label: container
      - source_labels:
          - __meta_kubernetes_pod_label_app
        target_label: app
      - source_labels:
          - __meta_kubernetes_pod_label_service
        target_label: service
      - replacement: /var/log/pods/*$1*/*.log
        separator: /
        source_labels:
          - __meta_kubernetes_pod_uid
          - __meta_kubernetes_pod_container_name
        target_label: __path__
```

## LogQL Queries

```logql
# Error rate per service (last 5m)
sum(rate({app=~".+"} |= "error" [5m])) by (app)

# Error rate per namespace
sum(rate({namespace=~".+"} |= "error" [5m])) by (namespace)

# Specific trace log
{app="orders"} |= "trace_id=abc123def456"

# Recent errors for a service
{app="orders"} |= "ERROR" | json | line_format "{{.message}}"

# Count errors by level
sum by (level) (count_over_time({app="orders"} | json [5m]))

# Find slow requests (>2s)
{app="orders"} | json | duration > 2

# Top 5 error producers (last 1h)
topk(5, sum by (service) (count_over_time({app=~".+"} |= "error" [1h])))

# Log volume by namespace
sum by (namespace) (rate({namespace=~".+"}[5m]))

# Pattern matching (Loki 2.3+)
{app="orders"} | pattern "<ip> - - <_> \"<method> <path> <_>\" <status> <_>"

# Unwrap (metric queries from logs)
sum(rate({app="orders"} | json | unwrap duration [5m]))

# Average request duration from logs
avg by (path) (avg_over_time({app="orders"} | json | unwrap duration [5m]))
```

## Log Label Strategy

| Label | Source | Cardinality | Use |
|---|---|---|---|
| `app` | K8s label | Low | Primary filter |
| `service` | K8s label | Low | Service-level queries |
| `namespace` | K8s metadata | Low | Environment isolation |
| `pod` | K8s metadata | High | Debug specific instance |
| `container` | K8s metadata | Medium | Filter sidecar/multi-container |
| `level` | Log line | Very low | Error monitoring |
| `job` | Scrape config | Low | Prometheus correlation |

**Best practice**: Keep label cardinality low. Use structured metadata (JSON fields, LogQL filters) for high-cardinality dimensions.

## Retention Management

| Tier | Duration | Storage | Query Performance |
|---|---|---|---|
| Hot | 7 days | Local SSD | Fast |
| Warm | 30 days | Object store | Medium |
| Cold | 90 days | Object store | Slow, infrequent queries |

```yaml
# Multi-tier retention via schema_config
schema_config:
  configs:
    - from: 2026-01-01
      store: boltdb-shipper
      object_store: s3
      schema: v12
      index:
        prefix: index_
        period: 24h
```

## Loki Ruler / Alerting

```yaml
# rules/loki/alerts.yml
groups:
  - name: log-alerts
    rules:
      - alert: HighErrorLogRate
        expr: sum(rate({app=~".+"} |= "error" [5m])) by (app) > 10
        for: 5m
        labels:
          severity: P2
        annotations:
          summary: "Error log rate > 10/s for {{ $labels.app }}"

      - alert: NoLogsFromService
        expr: sum(rate({app="orders"}[5m])) == 0
        for: 5m
        labels:
          severity: P0
        annotations:
          summary: "No logs from orders service — possible outage"
```
