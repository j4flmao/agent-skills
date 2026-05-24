# Synthetic Monitoring

## Overview

Synthetic monitoring proactively checks application health from simulated user interactions. This covers browser checks, API checks, multi-step breakpoint tests, global locations, and private locations.

## Architecture

```
                    ┌─────────────────┐
                    │ Synthetic       │
                    │ Monitoring      │
                    │ Platform        │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                   │
   ┌──────▼──────┐   ┌──────▼──────┐    ┌───────▼──────┐
   │  Public     │   │  Public     │    │   Private    │
   │  Probe #1   │   │  Probe #2   │    │   Probe #1   │
   │  US-East    │   │  EU-West    │    │   VPC        │
   └──────┬──────┘   └──────┬──────┘    └───────┬──────┘
          │                 │                    │
          └─────────────────┼────────────────────┘
                            │
                     ┌──────▼──────┐
                     │  Target     │
                     │  Endpoint   │
                     │  (API/Web)  │
                     └─────────────┘
```

## API Checks

### Datadog API Test
```yaml
# datadog_synthetics_test.tf
resource "datadog_synthetics_test" "api_health" {
  type    = "api"
  subtype = "http"
  name    = "API Health Check"
  message = "API is down! @pagerduty"
  tags    = ["env:production", "service:api-gateway"]

  request_definition {
    method = "GET"
    url    = "https://api.example.com/health"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = 2000
  }

  assertion {
    type     = "body"
    operator = "contains"
    target   = "\"status\":\"ok\""
  }

  locations = ["aws:us-east-1", "aws:eu-west-1", "aws:ap-southeast-1"]
  frequency = 300  # every 5 minutes

  options {
    tick_every = 300
    min_failure_duration = 0
    min_location_failed = 1
    monitor_name = "API Health Check Monitor"
  }

  status = "live"
}
```

### New Relic API Check
```json
{
  "name": "API Health Check",
  "type": "SIMPLE",
  "url": "https://api.example.com/health",
  "frequency": 5,
  "locations": ["AWS_US_EAST_1", "AWS_EU_WEST_1"],
  "validationString": "ok",
  "verifySsl": true,
  "script": {
    "commands": [
      {"method": "GET", "url": "https://api.example.com/health"},
      {"assertions": [
        {"type": "StatusCode", "expected": 200},
        {"type": "ResponseTime", "max": 2000}
      ]}
    ]
  }
}
```

### Grafana API Check
```json
{
  "apiVersion": "operations.grafana.app/v1alpha1",
  "kind": "Check",
  "spec": {
    "job": "api-health",
    "target": "https://api.example.com/health",
    "probes": [1, 2, 3],
    "frequency": 60000,
    "timeout": 3000,
    "alertSensitivity": "high",
    "settings": {
      "http": {
        "method": "GET",
        "validStatusCodes": [200, 204],
        "validJSON": true,
        "failIfSSL": false
      }
    }
  }
}
```

## Browser Checks

### Datadog Browser Test (Multistep)
```yaml
resource "datadog_synthetics_test" "browser_login" {
  type    = "browser"
  name    = "Login Flow"
  message = "Login flow is broken! @slack-platform"
  tags    = ["env:production", "critical-journey:login"]

  request_definition {
    method = "GET"
    url    = "https://app.example.com/login"
  }

  locations = ["aws:us-east-1", "aws:eu-west-1"]
  frequency = 900  # every 15 minutes

  browser_variable {
    type  = "text"
    name  = "USER_EMAIL"
    value = "monitoring@example.com"
  }

  browser_variable {
    type  = "text"
    name  = "USER_PASSWORD"
    value = "s3cret"
    secure = true
  }

  options_list {
    tick_every = 900
    min_failure_duration = 0
    min_location_failed = 2
    monitor_name = "Login Flow"
    monitor_priority = 1
    retry {
      count = 3
      interval = 300
    }
  }

  status = "live"
}
```

### New Relic Browser Check
```javascript
// New Relic scripted browser
const assert = require('assert');

$browser.get('https://app.example.com/login');

// Fill login form
$browser.findElement('#email').sendKeys('monitoring@example.com');
$browser.findElement('#password').sendKeys('test123');
$browser.findElement('#login-button').click();

// Wait for dashboard to load
$browser.waitForElement('#dashboard', 10000);

// Assert
assert.ok($browser.findElement('#welcome-message').isDisplayed());
assert.equal($browser.findElement('#user-name').getText(), 'Dashboard');
```

### Grafana MultiHTTP Check
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
              "url": "https://app.example.com/login",
              "headers": {
                "Accept": "text/html"
              }
            },
            "assertions": [
              {
                "type": "JSON_PATH_VALUE",
                "expression": "$.status",
                "value": "ok"
              }
            ]
          },
          {
            "request": {
              "method": "POST",
              "url": "https://app.example.com/api/login",
              "headers": {
                "Content-Type": "application/json"
              },
              "body": {
                "contentType": "application/json",
                "content": "{\"email\":\"monitoring@example.com\",\"password\":\"s3cret\"}"
              }
            },
            "assertions": [
              {
                "type": "JSON_PATH_VALUE",
                "expression": "$.token",
                "condition": "IS_NOT_EMPTY"
              }
            ]
          }
        ]
      }
    }
  }
}
```

## Breakpoint Monitoring (Catchpoint-Style)

### Step Checkpoints
```javascript
// Datadog browser test steps
// Step 1: Load homepage
$browser.get('https://app.example.com');
$browser.waitForElement('#hero', 10000);

// Step 2: Navigate to product page
$browser.findElement(By.linkText('Products')).click();
$browser.waitForElement('.product-grid', 10000);
console.log('Product page loaded in: ' + $browser.getTiming('pageLoad'));

// Step 3: Search
$browser.findElement('#search').sendKeys('laptop');
$browser.findElement('#search-button').click();
$browser.waitForElement('.search-results', 10000);

// Step 4: Add to cart
$browser.findElement('.product-card:first-child .add-to-cart').click();
$browser.waitForElement('#cart-count', 5000);
assert.equal($browser.findElement('#cart-count').getText(), '1');

// Step 5: Checkout
$browser.findElement('#checkout').click();
$browser.waitForElement('#checkout-form', 10000);
console.log('Checkout page duration: ' + $browser.getTiming('pageInteractive'));
```

## Global Locations

### Key Check Locations
```
aws:us-east-1        # US East (N. Virginia)
aws:us-west-1        # US West (Oregon)
aws:eu-west-1        # EU West (Ireland)
aws:eu-central-1     # EU Central (Frankfurt)
aws:ap-southeast-1   # Asia Pacific (Singapore)
aws:ap-northeast-1   # Asia Pacific (Tokyo)
aws:sa-east-1        # South America (São Paulo)
aws:ap-south-1       # Asia Pacific (Mumbai)
aws:me-south-1       # Middle East (Bahrain)
aws:af-south-1       # Africa (Cape Town)
```

### Multi-Region Check Strategy
```yaml
# Run from 5 global locations
locations:
  - aws:us-east-1
  - aws:eu-west-1
  - aws:ap-southeast-1
  - aws:sa-east-1
  - aws:ap-south-1

# Alert if 2+ locations fail
options {
  min_location_failed = 2
}
```

## Private Locations

### Datadog Private Location
```yaml
# docker-compose.yml
version: "3.9"
services:
  worker:
    image: gcr.io/datadoghq/synthetics-private-location-worker:latest
    environment:
      DATADOG_API_KEY: <key>
      DATADOG_SUBDOMAIN: synthetics
      DD_ACCESS_KEY: <private_location_key>
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

### Kubernetes Private Location
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: synthetics-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: synthetics-worker
  template:
    metadata:
      labels:
        app: synthetics-worker
    spec:
      containers:
      - name: worker
        image: gcr.io/datadoghq/synthetics-private-location-worker:latest
        env:
        - name: DATADOG_API_KEY
          valueFrom:
            secretKeyRef:
              name: datadog-secrets
              key: api-key
        - name: DATADOG_SUBDOMAIN
          value: synthetics
        - name: DD_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: synthetics-secrets
              key: access-key
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: synthetics-worker
spec:
  selector:
    app: synthetics-worker
  ports:
  - port: 8080
    targetPort: 8080
```

### Private Location Network Requirements
```
Allow outbound HTTPS to:
  *.datadoghq.com       # API communication
  api.datadoghq.com     # Result reporting
  synthetics.datadoghq.com  # Check configuration

No inbound required (worker polls for work)
```

## Alert Configuration

### Datadog Synthetic Monitor
```yaml
resource "datadog_synthetics_test" "critical_check" {
  # Monitor configuration
  options_list {
    monitor_name = "Critical API Check"
    monitor_priority = 1  # P1
    monitor_include_tags = true
  }

  message = <<EOT
{{#is_alert}}
API Check Failed
- Check: {{check_name}}
- Location: {{location}}
- Failure: {{failure}}
@slack-platform @pagerduty
{{/is_alert}}
{{#is_recovery}}
API Check Recovered
- Check: {{check_name}}
@slack-platform
{{/is_recovery}}
EOT
}
```

## Best Practices

1. **Check critical user journeys** — login, search, add to cart, checkout.
2. **Run from multiple global locations** — minimum 3 for geographic diversity.
3. **Set appropriate frequency** — every 5 min for critical, 15-30 min for secondary.
4. **Include private locations** for internal API/endpoints behind VPC.
5. **Set multi-location failure thresholds** — alert when 2+ locations fail.
6. **Use breakpoints** to measure specific user interaction timings.
7. **Avoid test flakiness** — use explicit waits, retries, and idempotent operations.
8. **Secure test credentials** — use environment variables or secret stores.
9. **Set up monitors on checks** — failed synthetic = paged engineer.
10. **Integrate with APM traces** — correlate synthetic failures with backend traces.
