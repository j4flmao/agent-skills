# New Relic Setup

## Overview

New Relic is an observability platform covering APM, infrastructure, logs, and browser monitoring. This reference covers New Relic One, APM agent configuration, distributed tracing, custom instrumentation, NRQL queries, and alerting.

## New Relic One Platform

### Account Setup
```bash
# Install New Relic CLI
curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash

# Deploy New Relic
NEW_RELIC_API_KEY=<key> NEW_RELIC_ACCOUNT_ID=<id> newrelic install

# Or use guided install
newrelic init
```

### API Keys
```
# Key types:
INGEST_KEY:     Used for sending data to New Relic
USER_KEY:       Used for New Relic API access (REST)
LICENSE_KEY:    Legacy key format for agent configuration
BROWSER_KEY:    Used for browser monitoring
```

## APM Agent Configuration

### Node.js Agent
```javascript
// newrelic.js
'use strict';

exports.config = {
  app_name: ['My Application'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info',
    enabled: true,
  },
  allow_all_headers: true,
  attributes: {
    include: ['request.uri', 'request.parameters.*'],
    exclude: ['request.headers.cookie', 'request.headers.authorization'],
  },
  distributed_tracing: {
    enabled: true,
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500,
  },
  error_collector: {
    enabled: true,
    ignore_status_codes: [404, 429],
  },
  slow_sql: {
    enabled: true,
    max_samples: 10,
  },
  custom_insights_events: {
    enabled: true,
    max_samples_stored: 10000,
  },
};
```

### Python Agent
```python
# newrelic.ini
[newrelic]
app_name = My Python App
license_key = <key>
log_level = info
high_security = false

[newrelic:development]
monitor_mode = false

[newrelic:production]
monitor_mode = true
app_name = My Python App (Production)
```

```python
# app.py
import newrelic.agent
newrelic.agent.initialize('newrelic.ini')

@newrelic.agent.background_task()
def my_background_task():
    pass
```

### Java Agent
```bash
# JVM arguments
-javaagent:/path/to/newrelic-agent.jar
-Dnewrelic.config.app_name=My Java App
-Dnewrelic.config.license_key=<key>
-Dnewrelic.config.log_level=info
-Dnewrelic.config.distributed_tracing.enabled=true
-Dnewrelic.config.transaction_tracer.record_sql=obfuscated
-Dnewrelic.config.error_collector.ignore_status_codes=404,429
```

### .NET Agent
```xml
<!-- newrelic.config -->
<?xml version="1.0" encoding="utf-8"?>
<configuration xmlns="urn:newrelic-config">
  <service licenseKey="<key>" />
  <application>
    <name>My .NET Application</name>
  </application>
  <log level="info" />
  <distributedTracing enabled="true" />
  <transactionTracer>
    <explainThreshold>500</explainThreshold>
    <recordSql>obfuscated</recordSql>
  </transactionTracer>
  <errorCollector>
    <ignoreStatusCodes>
      <code>404</code>
      <code>429</code>
    </ignoreStatusCodes>
  </errorCollector>
</configuration>
```

## Distributed Tracing

### Configuration
```yaml
# All services must enable distributed tracing
common:
  distributed_tracing:
    enabled: true

# Service A (accepts W3C trace context headers)
newrelic:
  distributed_tracing:
    enabled: true
    exclude_newrelic_header: false  # Include both New Relic and W3C headers

# Service B (continues trace)
newrelic:
  distributed_tracing:
    enabled: true
```

### Trace Context Propagation
```javascript
// Incoming headers accepted:
// - newrelic: New Relic format
// - traceparent: W3C Trace Context
// - tracestate: W3C Trace State

// Custom propagation for message queues
const { API } = require('@newrelic/amqplib');

const channel = await connection.createChannel();
await API.consume(channel, 'queue-name', async (msg) => {
  // Distributed trace continues across AMQP
});
```

## Custom Instrumentation

### Custom Events
```javascript
const newrelic = require('newrelic');

// Record a custom event
newrelic.recordCustomEvent('OrderEvent', {
  orderId: '12345',
  amount: 99.99,
  currency: 'USD',
  customerId: 'cust_678',
});

// Record custom metric
newrelic.recordMetric('Custom/Order/ProcessingTime', 150);

// Custom segment
newrelic.startSegment('databaseQuery', false, async () => {
  return await db.query('SELECT * FROM orders');
});
```

### Custom Attributes
```javascript
// Add custom attributes to current transaction
newrelic.addCustomAttribute('pricing_tier', 'premium');
newrelic.addCustomAttributes({
  payment_method: 'credit_card',
  coupon_applied: true,
});

// Add attributes to specific spans
newrelic.addCustomSpanAttribute('external_service', 'payment-gateway');
```

## NRQL Queries

### Basic Queries
```sql
-- Application performance
SELECT count(*) FROM Transaction WHERE appName = 'My App' SINCE 1 hour ago

-- Error rate
SELECT count(*) FROM TransactionError WHERE appName = 'My App' 
FACET error.class SINCE 1 day ago

-- Apdex score
SELECT apdex(duration, t:0.3) FROM Transaction WHERE appName = 'My App'
TIMESERIES SINCE 1 week ago

-- Slowest transactions
SELECT transactionName, percentile(duration, 99) 
FROM Transaction WHERE appName = 'My App' 
FACET transactionName LIMIT 10
```

### Advanced Queries
```sql
-- Service map
SELECT uniques(entityGuid) FROM ServiceMap
WHERE fromEntityGuid IN (SELECT entityGuid FROM Transaction)

-- Distributed tracing
SELECT * FROM Span WHERE traceId = 'abc123'
SINCE 30 minutes ago

-- Custom events
SELECT count(*), average(amount) FROM OrderEvent
FACET currency SINCE 1 week ago

-- Logs
SELECT * FROM Log WHERE message LIKE '%error%'
AND containerName = 'api-gateway'
SINCE 1 hour ago

-- Anomaly detection
SELECT anomalyDetection(rate(count(*), 1 minute), 'low')
FROM Transaction WHERE appName = 'My App' SINCE 1 day ago
```

### NRQL for Dashboards
```sql
-- Throughput chart
SELECT rate(count(*), 1 minute) FROM Transaction 
TIMESERIES AUTO SINCE 1 hour ago

-- Latency comparison by deployment
SELECT percentile(duration, 50, 95, 99) FROM Transaction 
FACET appVersion TIMESERIES SINCE 1 week ago

-- Error breakdown
SELECT count(*) FROM TransactionError 
FACET errorClass, errorMessage SINCE 1 day ago
LIMIT 10
```

## Alerts

### NRQL Alert Condition
```hcl
resource "newrelic_nrql_alert_condition" "high_latency" {
  account_id        = var.account_id
  policy_id         = newrelic_alert_policy.api.id
  type              = "static"
  name              = "High APDEX Score"
  description       = "Alert when apdex falls below threshold"
  runbook_url       = "https://wiki.example.com/runbooks/high-latency"
  enabled           = true
  violation_time_limit_seconds = 259200

  nrql {
    query = "SELECT apdex(duration, t:0.3) FROM Transaction WHERE appName = 'My App'"
  }

  critical {
    operator              = "below"
    threshold             = 0.9
    threshold_duration    = 300
    threshold_occurrences = "ALL"
  }

  warning {
    operator              = "below"
    threshold             = 0.95
    threshold_duration    = 300
    threshold_occurrences = "ALL"
  }
}
```

### Alert Policy
```hcl
resource "newrelic_alert_policy" "api" {
  name = "API Performance Policy"
}

resource "newrelic_alert_channel" "slack" {
  name = "Slack Channel"
  type = "slack"
  config {
    url     = "https://hooks.slack.com/services/xxx"
    channel = "#alerts"
  }
}

resource "newrelic_notification_channel" "pagerduty" {
  name   = "PagerDuty"
  type   = "PAGERDUTY_ACCOUNT_INTEGRATION"
  config {
    service_api_key = "<pagerduty_key>"
  }
}

resource "newrelic_workflow" "critical" {
  name              = "Critical Alert Workflow"
  muting_rules_handling = "NOTIFY_ALL_ISSUES"

  issues_filter {
    filter_id = newrelic_notification_channel.slack.id
  }

  destination {
    channel_id = newrelic_notification_channel.pagerduty.id
  }
}
```

## Best Practices

1. **Tag all services** with `appName`, `environment`, and `service.version`.
2. **Enable distributed tracing** across all services for end-to-end visibility.
3. **Use NRQL for dashboards** — it's more flexible than the point-and-click UI.
4. **Set transaction thresholds** based on Apdex, not raw latency.
5. **Obfuscate SQL** in transaction tracer for security.
6. **Configure error collectors** to ignore expected errors (404s, rate limits).
7. **Use custom events** for business metrics (orders, signups, revenue).
8. **Set up anomaly alerts** to catch issues before static threshold breaches.
9. **Use Terraform** for alert policies and conditions as code.
10. **Monitor agent memory** — Java agent can use significant heap.
