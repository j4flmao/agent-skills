# Datadog Setup

## Overview

Datadog is a SaaS-based monitoring and analytics platform. This reference covers agent installation, integrations, APM configuration, log management, dashboards, monitors, and SLOs.

## Agent Installation

### Linux
```bash
# One-line install
DD_API_KEY=<your_api_key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install.sh)"

# Verify
datadog-agent status

# Configuration file
vim /etc/datadog-agent/datadog.yaml
```

### Docker
```bash
docker run -d --name dd-agent \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /proc/:/host/proc/:ro \
  -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
  -e DD_API_KEY=<key> \
  -e DD_SITE="datadoghq.com" \
  -e DD_DOGSTATSD_NON_LOCAL_TRAFFIC=true \
  -e DD_APM_ENABLED=true \
  -e DD_LOGS_ENABLED=true \
  -e DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true \
  gcr.io/datadoghq/agent:7
```

### Kubernetes (Helm)
```bash
helm repo add datadog https://helm.datadoghq.com
helm repo update

helm upgrade --install datadog datadog/datadog \
  --set datadog.apiKey=<key> \
  --set datadog.apm.enabled=true \
  --set datadog.logs.enabled=true \
  --set datadog.processAgent.enabled=true \
  --set datadog.kubeStateMetricsEnabled=true \
  --set datadog.site=datadoghq.com \
  --set agents.tolerations[0].key=CriticalAddonsOnly \
  --set agents.tolerations[0].operator=Exists
```

### AWS ECS
```json
{
  "containerDefinitions": [
    {
      "name": "datadog-agent",
      "image": "gcr.io/datadoghq/agent:7",
      "environment": [
        {"name": "DD_API_KEY", "value": "<key>"},
        {"name": "DD_SITE", "value": "datadoghq.com"},
        {"name": "DD_APM_ENABLED", "value": "true"},
        {"name": "DD_LOGS_ENABLED", "value": "true"},
        {"name": "DD_ECS_TASK_COLLECTION_ENABLED", "value": "true"}
      ],
      "dockerLabels": {
        "com.datadoghq.ad.logs": "[{\"source\": \"nginx\", \"service\": \"nginx\"}]"
      }
    }
  ]
}
```

## Datadog Agent Config

### datadog.yaml
```yaml
# /etc/datadog-agent/datadog.yaml
api_key: <your_api_key>
site: datadoghq.com
tags:
  - env:production
  - team:platform
  - region:us-east-1

# APM
apm_config:
  enabled: true
  env: production
  apm_non_local_traffic: true
  max_traces_per_second: 10
  analyzed_spans:
    web: 1.0
  log_enabled: true

# Logs
logs_enabled: true
logs_config:
  container_collect_all: true
  processing_rules:
  - type: mask_sequences
    name: mask_credit_cards
    pattern: \d{4}-\d{4}-\d{4}-\d{4}
    replace: "****-****-****-****"

# DogStatsD
use_dogstatsd: true
dogstatsd_non_local_traffic: true
dogstatsd_stats_enable: true
dogstatsd_port: 8125

# Process
process_config:
  enabled: "true"
  process_collection:
    enabled: true

# SysProbe
system_probe_config:
  enabled: true
  conntrack_enabled: true
  network_config:
    enabled: true
```

## Integrations

### AWS Integration
```bash
# Via Terraform
resource "datadog_integration_aws" "account" {
  account_id = "123456789012"
  role_name  = "DatadogAWSIntegrationRole"
}

# Permissions needed:
# - Describe* (EC2, ELB, RDS, Lambda, S3, etc.)
# - GetMetricStatistics (CloudWatch)
# - ListMetrics (CloudWatch)
```

### Kubernetes Integration
```yaml
# Helm values
datadog:
  clusterName: my-cluster
  kubeStateMetricsEnabled: true
  kubeStateMetricsCore:
    enabled: true
  orchestratorExplorer:
    enabled: true
  prometheusScrape:
    enabled: true
    serviceEndpoints: true
```

## APM Configuration

### Node.js
```javascript
const tracer = require('dd-trace').init({
  service: 'api-gateway',
  env: process.env.NODE_ENV,
  logInjection: true,
  runtimeMetrics: true,
  samplingRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profiling: true,
});

// Custom instrumentation
const express = require('express');
const app = express();
app.use(tracer.connect());
```

### Python
```python
from ddtrace import patch_all, config
from ddtrace.contrib.flask import TraceMiddleware

config.env = "production"
config.service = "my-app"
config.version = "1.0.0"

patch_all()

# Auto-instrumentation (DD_TRACE_DEBUG=true)
```

### Java
```bash
# JVM arguments
java -javaagent:/path/to/dd-java-agent.jar \
     -Ddd.service=my-app \
     -Ddd.env=production \
     -Ddd.version=1.0.0 \
     -Ddd.profiling.enabled=true \
     -Ddd.trace.sample.rate=0.1 \
     -jar my-app.jar
```

## Log Management

### Log Collection Config
```yaml
# /etc/datadog-agent/conf.d/nginx.d/conf.yaml
logs:
  - type: file
    path: /var/log/nginx/access.log
    service: nginx
    source: nginx
    sourcecategory: http_web_access
    tags:
      - env:production

  - type: file
    path: /var/log/nginx/error.log
    service: nginx
    source: nginx
    sourcecategory: http_web_error
```

### Log Processing Rules
```yaml
logs_config:
  processing_rules:
  - type: mask_sequences
    name: mask_email
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    replace: "[REDACTED_EMAIL]"
  - type: exclude_at_match
    name: exclude_healthcheck
    pattern: /health
```

## Dashboards

### Terraform Dashboard
```hcl
resource "datadog_dashboard" "api_performance" {
  title       = "API Performance Dashboard"
  description = "Production API metrics"
  layout_type = "free"

  widget {
    timeseries_definition {
      title = "Request Latency P99"
      request {
        q = "p99:trace.api.request.duration{env:production,service:api-gateway}"
        display_type = "line"
      }
    }
    widget_layout {
      x = 0
      y = 0
      width = 8
      height = 4
    }
  }

  widget {
    query_value_definition {
      title = "Active Users"
      request {
        q = "count:api.active_users{env:production}"
      }
    }
    widget_layout {
      x = 8
      y = 0
      width = 4
      height = 4
    }
  }
}
```

## Monitors

### Metric Monitor
```hcl
resource "datadog_monitor" "cpu_high" {
  name    = "CPU Usage > 80%"
  type    = "metric alert"
  message = "CPU is high on {{host.name}}. @slack-platform"
  query   = "avg(last_10m):avg:system.cpu.user{env:production} by {host} > 80"

  monitor_thresholds {
    critical = 80
    warning  = 60
  }

  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 60

  tags = ["env:production", "team:platform"]
}
```

### Anomaly Monitor
```hcl
resource "datadog_monitor" "error_anomaly" {
  name    = "Error Rate Anomaly"
  type    = "query alert"
  message = "Error rate deviating from baseline. @pagerduty"
  query   = "avg(last_15m):anomalies(avg:trace.api.request.errors{env:production}.as_count(), 'basic', 2) >= 1"
}
```

### Composite Monitor
```hcl
resource "datadog_monitor" "composite" {
  name    = "High Latency AND High Error Rate"
  type    = "composite"
  message = "Performance degradation detected."
  query   = "'latency_monitor_id' || 'error_monitor_id'"
}
```

## SLOs

```hcl
resource "datadog_service_level_objective" "api_slo" {
  name        = "API Latency SLO"
  type        = "metric"
  description = "99.9% of API requests under 300ms"

  query {
    numerator   = "sum:trace.api.request.duration{env:production,service:api-gateway}.as_count()"
    denominator = "sum:trace.api.request.hits{env:production,service:api-gateway}.as_count()"
  }

  thresholds {
    target = 99.9
    timeframe = "30d"
    warning = 99.95
  }

  tags = ["env:production", "service:api-gateway"]
}
```

## Best Practices

1. **Tag everything** — use unified service tagging (`env`, `service`, `version`).
2. **Set sampling rates** — 100% in dev, 5-10% in production for high-throughput services.
3. **Enable profiling** on critical services for continuous CPU/memory optimization.
4. **Use log processing rules** to mask PII before ingestion.
5. **Configure monitors with proper notification** — use @mentions, Slack, PagerDuty.
6. **Set SLO targets realistically** — 99.9% is achievable, 99.99% requires significant investment.
7. **Use Terraform** for dashboards, monitors, and SLOs as code.
8. **Monitor agent health** — set up a watchdog for the agent itself.
9. **Use APM trace retention** — keep error traces for 15-30 days, all traces for 3-7 days.
10. **Enable RUM** (Real User Monitoring) for frontend performance insight.
