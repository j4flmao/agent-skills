# Grafana Cloud

## Overview

Grafana Cloud provides a fully managed observability stack including Grafana dashboards, Loki (logs), Tempo (traces), Mimir (metrics), k6 (load testing), synthetic monitoring, and on-call management.

## Stack Architecture

```
                    ┌─────────────────┐
                    │ Grafana Cloud   │
                    │                 │
  ┌─────────────┐   │  ┌───────────┐  │   ┌──────────────┐
  │ Metrics     │───┼─►│  Mimir    │  │   │ Dashboards   │
  │ (Prometheus)│   │  │ (storage) │  │   │ & Alerts     │
  └─────────────┘   │  └───────────┘  │   └──────────────┘
                    │                 │
  ┌─────────────┐   │  ┌───────────┐  │
  │ Logs        │───┼─►│  Loki     │  │
  │ (Promtail)  │   │  │ (storage) │  │
  └─────────────┘   │  └───────────┘  │
                    │                 │
  ┌─────────────┐   │  ┌───────────┐  │
  │ Traces      │───┼─►│  Tempo    │  │
  │ (Otel)      │   │  │ (storage) │  │
  └─────────────┘   │  └───────────┘  │
                    │                 │
  ┌─────────────┐   │  ┌───────────┐  │
  │ Synthetics  │───┼─►│  Checks   │  │
  │ & k6       │   │  │ (runner)  │  │
  └─────────────┘   │  └───────────┘  │
                    └─────────────────┘
```

## Grafana Agent

### Flow Mode Configuration
```yaml
# agent-config.river
logging {
  level = "info"
}

prometheus.scrape "default" {
  targets = [
    {"__address__" = "localhost:9090"},
  ]
  forward_to = [prometheus.remote_write.default.receiver]
}

prometheus.remote_write "default" {
  endpoint {
    url = "https://prometheus-prod-10-prod-us-central-0.grafana.net/api/prom/push"
    basic_auth {
      username = "<instance_id>"
      password = "<api_token>"
    }
  }
}

loki.process "default" {
  stage.logfmt {}
  forward_to = [loki.write.default.receiver]
}

loki.write "default" {
  endpoint {
    url = "https://logs-prod-006.grafana.net/loki/api/v1/push"
    basic_auth {
      username = "<instance_id>"
      password = "<api_token>"
    }
  }
}

otelcol.receiver.otlp "default" {
  grpc {}
  http {}
  output {
    traces = [otelcol.processor.batch.default.input]
  }
}

otelcol.processor.batch "default" {
  output {
    traces = [otelcol.exporter.otlp.default.input]
  }
}

otelcol.exporter.otlp "default" {
  client {
    url = "https://tempo-prod-10-prod-us-central-0.grafana.net:443"
    auth {
      basic {
        username = "<instance_id>"
        password = "<api_token>"
      }
    }
  }
}
```

### Static Mode Configuration
```yaml
# agent-config.yaml
server:
  log_level: info

metrics:
  global:
    remote_write:
    - url: https://prometheus-prod-10-prod-us-central-0.grafana.net/api/prom/push
      basic_auth:
        username: <instance_id>
        password: <api_token>

integrations:
  node_exporter:
    enabled: true
  agent:
    enabled: true

logs:
  configs:
  - name: default
    positions:
      filename: /tmp/positions.yaml
    scrape_configs:
    - job_name: system
      static_configs:
      - targets: [localhost]
        labels:
          job: varlogs
          __path__: /var/log/*.log
    clients:
    - url: https://logs-prod-006.grafana.net/loki/api/v1/push
      basic_auth:
        username: <instance_id>
        password: <api_token>

traces:
  configs:
  - name: default
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
    remote_write:
    - endpoint: tempo-prod-10-prod-us-central-0.grafana.net:443
      basic_auth:
        username: <instance_id>
        password: <api_token>
```

## Loki (Log Aggregation)

### LogQL Queries
```logql
// Basic log query
{job="api-gateway", env="production"} |= "error"

// Log rate
rate({job="api-gateway"}[5m])

// Error rate by service
sum by (service) (rate({job=~".+"} |= "error"[5m]))

// Filter and label extraction
{job="api-gateway"} | logfmt | status_code >= 500

// JSON parsing
{job="api-gateway"} | json | method="POST" | path="/api/orders"

// Metrics from logs
sum by (path) (rate({job="api-gateway"} | json | status_code >= 500[5m]))

// Grafana dashboard query
sum by (namespace) (rate({job=~"k8s-.*"} | json | status_code =~ "5[0-9]{2}"[5m]))
```

### Loki Alerting
```yaml
# loki-alert.yaml
groups:
- name: log-alerts
  rules:
  - alert: HighLogErrorRate
    expr: |
      sum(rate({job="api-gateway"} |= "error" [5m])) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate in API gateway logs"
```

## Tempo (Traces)

### TraceQL Queries
```traceql
// Find traces with duration > 1s
{ duration > 1s }

// Find traces by service
{ .service.name = "api-gateway" }

// Find traces with specific attributes
{ .http.status_code >= 500 } && { .http.method = "POST" }

// Root span duration
{ root:true && duration > 500ms }

// Nested query
{ .service.name = "api-gateway" }
  { .service.name = "payment-service" && .db.statement =~ "INSERT.*" }
```

### Tempo Configuration
```yaml
# tempo config
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

ingester:
  trace_idle_period: 10s
  max_block_duration: 5m

compactor:
  compaction:
    block_retention: 48h

storage:
  trace:
    backend: s3
    s3:
      bucket: grafana-tempo-data
      endpoint: s3.amazonaws.com
      region: us-east-1
```

## Mimir (Metrics)

### PromQL Queries
```promql
// Request rate by service
rate(http_requests_total{job="api"}[5m])

// Latency percentile
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

// Service health ratio
sum(up{job="api-gateway"}) / count(up{job="api-gateway"})

// CPU saturation
rate(node_cpu_seconds_total{mode="idle"}[5m]) < 0.2
```

### Recording Rules
```yaml
groups:
- name: recording_rules
  interval: 1m
  rules:
  - record: job:http_requests:rate5m
    expr: rate(http_requests_total[5m])
  - record: job:http_request_duration:p99
    expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

## k6 Load Testing

### Test Script
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latency = new Trend('api_latency');

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    errors: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
  },
  cloud: {
    projectID: 123456,
    name: 'API Load Test',
  },
};

export default function () {
  const res = http.get('https://api.example.com/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  latency.add(res.timings.duration);
  errorRate.add(res.status !== 200);
  sleep(1);
}
```

### Running Tests
```bash
# Run locally
k6 run script.js

# Run on Grafana Cloud k6
k6 cloud script.js
```

## Synthetic Monitoring

### API Check
```json
{
  "apiVersion": "operations.grafana.app/v1alpha1",
  "kind": "Check",
  "spec": {
    "job": "api-health-check",
    "target": "https://api.example.com/health",
    "probes": [1, 2, 3],
    "frequency": 60000,
    "timeout": 3000,
    "alertSensitivity": "high",
    "settings": {
      "http": {
        "method": "GET",
        "validStatusCodes": [200, 204],
        "validHTTPVersions": ["HTTP/1.1", "HTTP/2"],
        "failIfSSL": false
      }
    }
  }
}
```

### Browser Check
```json
{
  "apiVersion": "operations.grafana.app/v1alpha1",
  "kind": "Check",
  "spec": {
    "job": "login-flow",
    "target": "https://app.example.com",
    "probes": [1, 2],
    "frequency": 300000,
    "settings": {
      "multihttp": {
        "entries": [
          {
            "request": {
              "method": "GET",
              "url": "https://app.example.com/login"
            }
          },
          {
            "request": {
              "method": "POST",
              "url": "https://app.example.com/api/login",
              "body": {
                "contentType": "application/json",
                "content": "{\"username\":\"test@example.com\",\"password\":\"test123\"}"
              }
            }
          }
        ]
      }
    }
  }
}
```

## On-Call Management

### Integration
```bash
# Install Grafana On-Call
helm repo add grafana https://grafana.github.io/helm-charts
helm upgrade --install oncall grafana/oncall \
  --namespace oncall \
  --create-namespace \
  --set grafana.enabled=true \
  --set ingress.enabled=true
```

### Alert Routing
```yaml
# escalation.yaml
escalation_chain:
  name: Critical Service Chain
  escalation_rules:
  - position: 0
    type: wait
    duration: 0
  - position: 1
    type: notify_user
    user: oncall-engineer-1
  - position: 2
    type: notify_user
    user: oncall-engineer-2
    duration: 10
  - position: 3
    type: notify_multiple_users
    users: [manager-1, manager-2]
    duration: 20
```

## Best Practices

1. **Use Grafana Agent Flow mode** for simplified configuration and automatic updates.
2. **Set appropriate retention** — shorter for debug logs (7d), longer for metrics (30d+).
3. **Use TraceQL** for deep trace analysis — it's more powerful than tag-based filtering.
4. **Configure recording rules** for expensive PromQL queries to reduce costs.
5. **Use k6 Cloud** for distributed load testing from multiple regions.
6. **Set synthetic checks from multiple probes** for geographic redundancy.
7. **Use Grafana On-Call** for alert management with schedules and escalation policies.
8. **Label everything** consistently across metrics, logs, and traces.
9. **Use service graphs** in Tempo for understanding service dependencies.
10. **Monitor your agent's resource usage** to avoid noisy neighbor problems.
