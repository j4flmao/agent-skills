# Alert Rules Catalog

## Infrastructure Alerts

```yaml
# CPU
- alert: HighCpuUsage
  expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
  for: 10m
  severity: P2

- alert: CriticalCpuUsage
  expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
  for: 5m
  severity: P1

# Memory
- alert: HighMemoryUsage
  expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 80
  for: 10m
  severity: P2

# Disk
- alert: DiskSpaceLow
  expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
  for: 5m
  severity: P1

# Network
- alert: NodeDown
  expr: up{job="node-exporter"} == 0
  for: 1m
  severity: P0
```

## Kubernetes Alerts

```yaml
- alert: PodCrashLooping
  expr: rate(kube_pod_container_status_restarts_total[15m]) > 2
  for: 5m
  severity: P1

- alert: PodsPending
  expr: kube_pod_status_phase{phase="Pending"} > 0
  for: 15m
  severity: P2

- alert: PersistentVolumeUsage
  expr: (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) * 100 > 85
  for: 5m
  severity: P1
```

## Application Alerts

```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 5m
  severity: P1

- alert: HighLatency
  expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  severity: P1

- alert: BusinessTransactionFailed
  expr: rate(order_failed_total[30m]) > 0
  for: 5m
  severity: P2
```
