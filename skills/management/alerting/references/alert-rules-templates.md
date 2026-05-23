# Alert Rules Templates

## Template Structure

Every alert rule follows this structure:

```yaml
alert: <AlertName>
expr: <PromQL expression>
for: <duration before firing>
labels:
  severity: <P0-P3>
  team: <owning team>
annotations:
  summary: "<one-line description>"
  description: "<detailed context with template variables>"
  runbook: "<URL to runbook>"
  dashboard: "<URL to dashboard>"
```

## Service-Level Alert Templates

### High Error Rate
```yaml
alert: HighErrorRate
expr: |
  (sum(rate(http_requests_total{status=~"5.."}[5m])) 
   / sum(rate(http_requests_total[5m]))) > 0.05
for: 5m
labels: { severity: P1, team: "service-owner" }
annotations:
  summary: "{{ $labels.service }} error rate > 5%"
  runbook: "https://runbooks.example.com/high-error-rate"
```

### Latency Spike
```yaml
alert: HighLatency
expr: |
  histogram_quantile(0.99, 
    rate(http_request_duration_seconds_bucket[5m])) > 2
for: 5m
labels: { severity: P1, team: "service-owner" }
annotations:
  summary: "{{ $labels.service }} p99 latency > 2s"
```

### Traffic Drop
```yaml
alert: TrafficDrop
expr: |
  abs(rate(http_requests_total[5m]) - 
      rate(http_requests_total[5m] offset 1w)) 
  / rate(http_requests_total[5m] offset 1w) > 0.5
for: 5m
labels: { severity: P2, team: "service-owner" }
annotations:
  summary: "Traffic dropped >50% compared to same time last week"
```

## Infrastructure Alert Templates

### Node Down
```yaml
alert: NodeDown
expr: up{job="node-exporter"} == 0
for: 1m
labels: { severity: P0, team: "platform" }
annotations:
  summary: "Node {{ $labels.instance }} is down"
  runbook: "https://runbooks.example.com/node-down"
```

### Disk Space
```yaml
alert: DiskSpaceCritical
expr: |
  (node_filesystem_avail_bytes{mountpoint="/"} 
   / node_filesystem_size_bytes{mountpoint="/"}) < 0.05
for: 2m
labels: { severity: P1, team: "platform" }
annotations:
  summary: "Disk on {{ $labels.instance }} < 5% free"
```

### Certificate Expiry
```yaml
alert: TLSCertExpiry
expr: |
  probe_ssl_earliest_cert_expiry - time() < 86400 * 14
for: 1h
labels: { severity: P2, team: "platform" }
annotations:
  summary: "TLS cert for {{ $labels.instance }} expires in <14 days"
```

### OOM Killer
```yaml
alert: OOMKillDetected
expr: increase(node_vmstat_oom_kill[5m]) > 0
for: 0m
labels: { severity: P1, team: "platform" }
annotations:
  summary: "OOM killer triggered on {{ $labels.instance }}"
```

## Kubernetes Alert Templates

### Pod CrashLooping
```yaml
alert: PodCrashLooping
expr: rate(kube_pod_container_status_restarts_total[15m]) > 2
for: 5m
labels: { severity: P1, team: "platform" }
```

### Pods Pending
```yaml
alert: PodsPending
expr: kube_pod_status_phase{phase="Pending"} > 0
for: 15m
labels: { severity: P2, team: "platform" }
```

### PersistentVolume Usage
```yaml
alert: PersistentVolumeUsage
expr: (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) * 100 > 85
for: 5m
labels: { severity: P1, team: "platform" }
```

## Database Alert Templates

### Connection Pool Exhaustion
```yaml
alert: DatabaseConnectionsHigh
expr: |
  pg_stat_activity_count{datname!~"template.*|postgres"} > 80
for: 2m
labels: { severity: P1, team: "database" }
```

### Replication Lag
```yaml
alert: ReplicationLag
expr: pg_replication_lag_seconds > 60
for: 1m
labels: { severity: P1, team: "database" }
```

### Slow Queries
```yaml
alert: SlowQueries
expr: rate(pg_slow_queries_total[5m]) > 0.1
for: 10m
labels: { severity: P2, team: "database" }
```

## Business Alert Templates

### Order Failure Rate
```yaml
alert: OrderFailureRate
expr: |
  rate(order_failed_total[30m]) 
  / rate(order_created_total[30m]) > 0.1
for: 10m
labels: { severity: P1, team: "business" }
```

### Payment Processing Delay
```yaml
alert: PaymentProcessingDelay
expr: |
  histogram_quantile(0.95, 
    rate(payment_duration_seconds_bucket[5m])) > 30
for: 5m
labels: { severity: P1, team: "business" }
```

### Signup Drop
```yaml
alert: SignupDrop
expr: |
  rate(user_signups_total[1h]) 
  < rate(user_signups_total[1h] offset 1w) * 0.5
for: 30m
labels: { severity: P2, team: "business" }
```

## Meta-Alert Templates

### No Data
```yaml
alert: NoData
expr: absent(http_requests_total)
for: 5m
labels: { severity: P0, team: "platform" }
annotations:
  summary: "No metrics received from {{ $labels.job }}"
```

### Alertmanager Down
```yaml
alert: AlertmanagerDown
expr: absent(alertmanager_alerts)
for: 1m
labels: { severity: P0, team: "platform" }
annotations:
  summary: "Alertmanager is not reachable"
```

## Template Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ $labels.instance }}` | Instance name | `web-01.example.com` |
| `{{ $labels.job }}` | Job name | `node-exporter` |
| `{{ $labels.service }}` | Service name | `order-service` |
| `{{ $labels.severity }}` | Alert severity | `P1` |
| `{{ $value }}` | Current metric value | `0.95` |
| `{{ humanize $value }}` | Human-readable value | `95%` |
| `{{ humanizeDuration }}` | Duration formatting | `5m` |

## Alert Rule Review Process

- All new alert rules must be reviewed by platform team before deployment
- Each rule must have a linked runbook before it can fire in production
- Rules are tested in staging for 1 week before promoting to production
- Thresholds are reviewed monthly against historical data
- Rules with zero firings in 90 days are flagged for removal
- Rules that generate >10 alerts per day per instance are tuned
