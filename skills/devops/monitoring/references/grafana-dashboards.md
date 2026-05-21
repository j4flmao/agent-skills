# Grafana Dashboard Design

## Folder Structure

```
dashboards/
├── Infrastructure/
│   ├── Node Exporter Full.json          # CPU, Memory, Disk, Network, Load
│   ├── Kubernetes Cluster.json          # Cluster-wide resources
│   ├── Kubernetes Nodes.json            # Per-node breakdown
│   └── Prometheus Overview.json         # TSDB stats, scrape targets
├── Applications/
│   ├── Service RED Metrics.json         # Rate, Errors, Duration per service
│   ├── Database Overview.json           # Connections, query latency, cache
│   └── Message Queue.json               # Queue depth, consumer lag
├── Business/
│   ├── Orders Overview.json             # Volume, value, funnel conversion
│   └── User Activity.json               # Active users, signups, churn
└── SLOs/
    ├── Error Budget.json                # Remaining budget, burn rate
    └── Latency SLO.json                 # P50/P95/P99 vs target
```

## Dashboard Provisioning

```yaml
# provisioning/dashboards/dashboard.yml
apiVersion: 1
providers:
  - name: Infrastructure
    type: file
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards/infrastructure
      foldersFromFilesStructure: true
  - name: Applications
    type: file
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards/applications
      foldersFromFilesStructure: true
  - name: SLOs
    type: file
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards/slos
      foldersFromFilesStructure: true
```

## Data Source Provisioning

```yaml
# provisioning/datasources/datasources.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true
    editable: false
    jsonData:
      timeout: 60
      prometheusType: Prometheus
      prometheusVersion: 2.50.0
      httpMethod: POST
      manageAlerts: true
      alertmanagerUid: alertmanager

  - name: Loki
    type: loki
    url: http://loki:3100
    access: proxy
    jsonData:
      timeout: 60
      maxLines: 1000
      derivedFields:
        - name: traceID
          type: regex
          matcherRegex: "trace_id=(\\w+)"
          url: "$${__value.raw}"
          datasourceUid: tempo

  - name: Tempo
    type: tempo
    url: http://tempo:3200
    access: proxy
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags:
          - key: service.name
            value: job
        mappedTags:
          - key: service.name
            value: job
      serviceMap:
        datasourceUid: prometheus
      nodeGraph:
        enabled: true

  - name: Elasticsearch
    type: elasticsearch
    url: http://elasticsearch:9200
    database: "[logs-]YYYY.MM.DD"
    jsonData:
      esVersion: 8.0.0
      interval: Daily
      timeField: "@timestamp"
      maxConcurrentShardRequests: 5
      logMessageField: message
      logLevelField: fields.level

  - name: Alertmanager
    uid: alertmanager
    type: alertmanager
    url: http://alertmanager:9093
    access: proxy
    jsonData:
      implementation: prometheus
      handleAlertManagerAlerts: true
```

## Dashboard Design Patterns

### RED Metrics Panel (Rate, Errors, Duration)

```
Row: {service} RED
  Panel 1: Request Rate (graph)
    Query: rate(http_requests_total{service="$service"}[5m])
    Unit: req/s
  Panel 2: Error Rate (graph)
    Query: rate(http_requests_total{service="$service", status=~"5.."}[5m]) / rate(http_requests_total{service="$service"}[5m])
    Unit: percent (0-1)
  Panel 3: Latency (graph)
    Query: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="$service"}[5m]))
    Series: p50, p95, p99
    Unit: seconds
```

### Service Overview - Stat Panels

```
Row: {service} Status
  Stat 1: Uptime
    Query: avg(up{job="$service"})
    Threshold: 1 → green, 0 → red
  Stat 2: Error Budget
    Query: (1 - (sum(rate(http_requests_total{status=~"5..", service="$service"}[30d])) / sum(rate(http_requests_total{service="$service"}[30d])))) - 0.999
    Unit: percent
    Threshold: >0 → green, <0 → red
  Stat 3: Current p99
    Query: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="$service"}[5m]))
    Unit: seconds
```

### Template Variables

```json
{
  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "query": "label_values(up, job)",
        "refresh": 1,
        "includeAll": true,
        "multi": true,
        "allValue": ".*"
      },
      {
        "name": "namespace",
        "type": "query",
        "query": "label_values(kube_pod_info, namespace)",
        "refresh": 1,
        "includeAll": true
      },
      {
        "name": "datasource",
        "type": "datasource",
        "query": "prometheus",
        "refresh": 1
      }
    ]
  }
}
```

## Annotations

```json
{
  "annotations": {
    "list": [
      {
        "name": "Deployments",
        "datasource": "Prometheus",
        "expr": "changes(service_version{job=\"$service\"}[1m]) > 0",
        "iconColor": "#FFA500",
        "titleFormat": "Deploy: {{ $labels.version }}",
        "tagFormat": "deploy"
      },
      {
        "name": "Alerts",
        "datasource": "Alertmanager",
        "expr": "ALERTS{alertstate=\"firing\"}",
        "iconColor": "#FF0000",
        "titleFormat": "{{ alertname }}",
        "tagFormat": "alert"
      }
    ]
  }
}
```

## Linked Grafana Alerts

```json
{
  "alert": {
    "conditions": [
      {
        "evaluator": {
          "params": [0.05],
          "type": "gt"
        },
        "operator": {
          "type": "and"
        },
        "query": {
          "params": ["A", "5m", "now"]
        },
        "reducer": {
          "params": [],
          "type": "avg"
        },
        "type": "query"
      }
    ],
    "executionErrorState": "alerting",
    "for": "5m",
    "frequency": "60s",
    "handler": 1,
    "name": "High Error Rate",
    "noDataState": "no_data",
    "notifications": [
      {
        "uid": "alertmanager"
      }
    ]
  }
}
```

## Best Practices

- Every dashboard includes a time picker and template variables.
- Panels use consistent color schemes: green=good, yellow=warning, red=critical.
- Minimum refresh interval: 15s for infra, 30s for apps, 60s for business.
- Annotations for deployments and incidents across all dashboards.
- Every dashboard links to related dashboards (top-right link icon).
- Row repeat for multi-service dashboards (repeat by $service variable).
- First row is always critical status panels (Uptime, Error Budget, Current p99).
- Graph panels show min/avg/max bands for quick visual assessment.
- Set `"auto"` unit scaling for consistent axis across services.
- Export dashboard JSON to provisioning directory, not manual create.
