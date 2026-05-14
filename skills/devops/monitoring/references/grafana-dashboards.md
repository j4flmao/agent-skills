# Grafana Dashboard Design

## Folder Structure

```
dashboards/
├── Infrastructure/
│   ├── Node Exporter Full.json      # CPU, Memory, Disk, Network, Load
│   ├── Kubernetes Cluster.json      # Cluster-wide resources
│   └── Kubernetes Nodes.json        # Per-node breakdown
├── Applications/
│   ├── Service RED Metrics.json     # Rate, Errors, Duration per service
│   └── Database Overview.json       # Connections, query latency, cache
├── Business/
│   ├── Orders Overview.json         # Volume, value, funnel conversion
│   └── User Activity.json           # Active users, signups, churn
└── SLOs/
    ├── Error Budget.json            # Remaining budget, burn rate
    └── Latency SLO.json             # P50/P95/P99 vs target
```

## Dashboard Provisioning

```yaml
apiVersion: 1
providers:
  - name: dashboards
    type: file
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

## Best Practices
- Every dashboard includes a time picker and template variables.
- Panels use consistent color schemes (green=good, yellow=warning, red=critical).
- Minimum refresh interval: 15s for infra, 30s for apps.
- Annotations for deployments and incidents.
- Linked from alert rule for quick context.
