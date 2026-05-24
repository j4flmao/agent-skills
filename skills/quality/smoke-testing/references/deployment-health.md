# Deployment Health Checks

## Overview

Deployment health checks validate that a deployed application instance is functioning correctly and can serve traffic. Health checks range from simple HTTP pings to deep dependency-verification probes, and are essential for automated rollback decisions and deployment confidence.

## Health Endpoint Patterns

### Basic Health Endpoint

The simplest health check — confirms the process is running and responsive.

```javascript
// Express.js health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: process.env.APP_VERSION || 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
```

```python
# FastAPI health endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": os.getenv("APP_VERSION", "unknown"),
        "uptime": time.time() - START_TIME,
        "timestamp": datetime.utcnow().isoformat(),
    }
```

### Deep Health Endpoint

Checks critical dependencies and reports their status individually.

```javascript
// Deep health check with dependency verification
app.get('/health/deep', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    queue: await checkMessageQueue(),
    paymentGateway: await checkPaymentGateway(),
  };

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const hasCriticalFailure = ['database', 'redis'].some(
    service => checks[service]?.status === 'unhealthy'
  );

  const statusCode = hasCriticalFailure ? 503 : allHealthy ? 200 : 200;
  // 503 for critical dependency failure, 200 for degraded (non-critical)

  res.status(statusCode).json({
    status: hasCriticalFailure ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    checks,
    timestamp: new Date().toISOString(),
  });
});

async function checkDatabase() {
  try {
    const start = Date.now();
    await db.raw('SELECT 1');
    return { status: 'healthy', latency_ms: Date.now() - start };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

### Readiness Health Endpoint

Verifies the application is ready to accept traffic (useful after cache warm-up or migration).

```javascript
let isReady = false;

app.get('/health/readiness', (req, res) => {
  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready', reason: 'Warming up caches' });
  }
});

// Called after initialization is complete
async function initializeApp() {
  await connectDatabase();
  await warmCaches();
  await runMigrations();
  isReady = true;
}
```

### Liveness Health Endpoint

Verifies the application process is alive (used by orchestrators to restart dead instances).

```javascript
// Liveness — simplest possible check, no dependencies
app.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'alive' });
});
```

## Kubernetes Probe Integration

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health/liveness
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/readiness
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
```

| Probe | Purpose | Depth | Failure Action |
|-------|---------|-------|---------------|
| Liveness | Is the process alive? | Minimal (just HTTP 200) | Restart container |
| Readiness | Can it serve traffic? | Moderate (dependencies ready) | Remove from service |
| Startup | Has it finished init? | Moderate | Delay liveness checks |

## Dependency Checks

### Health Check by Dependency Type

```javascript
// health-checks.js

// Cached dependency (non-critical)
async function checkCache() {
  try {
    await cache.ping();
    return { status: 'healthy', latency_ms: 2 };
  } catch {
    return { status: 'degraded', message: 'Cache unavailable, using DB fallback' };
  }
}

// Database dependency (critical)
async function checkDatabase() {
  try {
    const pool = db.getPool();
    const { rows } = await pool.query('SELECT NOW()');
    return { status: 'healthy', latency_ms: 5, dbTime: rows[0].now };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

// External API (non-critical with circuit breaker)
async function checkPaymentGateway() {
  if (circuitBreaker.isOpen()) {
    return { status: 'degraded', message: 'Circuit breaker open' };
  }
  try {
    await paymentGateway.ping();
    return { status: 'healthy', latency_ms: 200 };
  } catch {
    circuitBreaker.recordFailure();
    return { status: 'degraded', message: 'API unavailable, retry queued' };
  }
}
```

### Dependency Criticality Matrix

| Dependency | Critical? | Impact if Down | Degraded Mode |
|-----------|-----------|----------------|---------------|
| Database | Yes | Cannot serve any requests | Complete outage |
| Cache (Redis) | No | Slower responses, DB load | Serves from DB |
| Message Queue | No | Async jobs delayed | Continue without |
| Payment Gateway | Yes | No purchases | Feature-flag pay |
| Search Index | No | Search returns no results | Use DB search |
| CDN | No | Static assets load slower | Serve from origin |

## Canary Health Checks

### Canary Rollout with Progressive Health Validation

```yaml
# Spinnaker-style canary analysis
canary:
  analysis:
    interval: 60s
    successCondition: "mean(smoke.pass) > 99.9"
    failureCondition: "mean(smoke.pass) < 95"
    strategies:
      - name: "smoke-tests"
        type: "web"
        config:
          url: "https://canary-instance.example.com/health"
          expectedStatus: 200
          expectedJSON:
            status: "healthy"
      - name: "error-rate"
        type: "datadog"
        config:
          metric: "http.errors"
          threshold: 0.01  # < 1% errors
```

### Script-Based Canary Health Check

```python
#!/usr/bin/env python3
"""canary-health-check.py — Run during canary deployment"""

import requests
import sys
import time
import os

CANARY_URL = os.environ['CANARY_URL']
EXPECTED_VERSION = os.environ['EXPECTED_VERSION']
CHECK_INTERVAL = 10  # seconds
MAX_RETRIES = 12     # 2 minutes total

def check_health():
    # 1. Basic health
    resp = requests.get(f"{CANARY_URL}/health", timeout=5)
    assert resp.status_code == 200, f"Health returned {resp.status_code}"
    data = resp.json()
    assert data['status'] == 'healthy', f"Status: {data['status']}"

    # 2. Version check
    assert data['version'] == EXPECTED_VERSION, \
        f"Version mismatch: {data['version']} != {EXPECTED_VERSION}"

    # 3. Deep health — all critical dependencies must be healthy
    deep = requests.get(f"{CANARY_URL}/health/deep", timeout=5).json()
    critical_services = ['database', 'redis']
    for service in critical_services:
        assert deep['checks'][service]['status'] == 'healthy', \
            f"Critical dependency {service} is {deep['checks'][service]['status']}"

    return True

def main():
    for attempt in range(MAX_RETRIES):
        try:
            check_health()
            print(f"✅ Canary healthy (attempt {attempt + 1})")
            sys.exit(0)
        except AssertionError as e:
            print(f"❌ Health check failed: {e}")
        except Exception as e:
            print(f"⚠️ Error checking health: {e}")

        if attempt < MAX_RETRIES - 1:
            time.sleep(CHECK_INTERVAL)

    print("❌ Canary health check failed — rolling back")
    sys.exit(1)
```

## Rollback Triggers

### Automatic Rollback Decision Logic

```javascript
// rollback-decision.js
function shouldRollback(healthCheckResults, smokeTestResults, thresholds) {
  const reasons = [];

  // Critical failure: any smoke test failed
  if (smokeTestResults.failed > 0) {
    reasons.push(`Smoke test failed: ${smokeTestResults.failed} failures`);
  }

  // Health check: critical dependency unhealthy
  const criticalHealthy = Object.entries(healthCheckResults.dependencies)
    .filter(([name]) => thresholds.criticalDependencies.includes(name))
    .every(([, status]) => status === 'healthy');

  if (!criticalHealthy) {
    reasons.push('Critical dependency unhealthy');
  }

  // Error rate: spike above threshold
  if (healthCheckResults.errorRate > thresholds.maxErrorRate) {
    reasons.push(`Error rate ${healthCheckResults.errorRate}% > ${thresholds.maxErrorRate}%`);
  }

  // Latency: p95 above threshold
  if (healthCheckResults.p95Latency > thresholds.maxLatency) {
    reasons.push(`P95 latency ${healthCheckResults.p95Latency}ms > ${thresholds.maxLatency}ms`);
  }

  return {
    rollback: reasons.length > 0,
    reasons,
    severity: reasons.length > 1 ? 'critical' : 'warning',
  };
}
```

### Rollback Decision Matrix

| Signal | Threshold | Action |
|--------|-----------|--------|
| Smoke test pass rate | < 100% | Immediate rollback |
| Health check (critical) | Any unhealthy | Immediate rollback |
| Error rate | > 1% of requests | Rollback |
| P95 latency increase | > 2x baseline | Rollback |
| Health check (non-critical) | Unhealthy > 30s | Alert, do not rollback |
| Canary test pass rate | < 95% | Stop canary, rollback |

## Smoke Monitoring

### Post-Deployment Monitoring Window

```
Deploy → Health Check (instant)
       → Smoke Tests (0-5 min)
       → Monitor Window (5-30 min)
           ├── Error rate monitoring
           ├── Latency monitoring
           ├── Business metric monitoring
           └── Automated rollback if thresholds exceeded
```

### Example: CloudWatch Synthetic Monitoring

```yaml
# CloudFormation — synthetic canary
Type: AWS::Synthetics::Canary
Properties:
  Name: smoke-test-canary
  RuntimeVersion: syn-nodejs-puppeteer-3.9
  Schedule:
    Expression: rate(5 minutes)
    DurationInSeconds: 300
  StartCanaryAfterCreation: true
  RunConfig:
    TimeoutInSeconds: 60
    EnvironmentVariables:
      - Key: BASE_URL
        Value: !Ref AppURL
  ArtifactS3Location: !Ref ArtifactsBucket
  Code:
    Script: |
      const handler = async () => {
        const response = await page.goto(process.env.BASE_URL + '/health');
        const body = await response.json();
        if (body.status !== 'healthy') {
          throw new Error(`Health check failed: ${body.status}`);
        }
      };
```

## Health Check Security

- **Rate limit** the health endpoint to prevent DoS by orchestrator
- **No PII or secrets** in health check responses
- **Separate internal vs external** health endpoints (internal can be more detailed)
- **Authenticate deep health checks** with internal API tokens
- **Log health check requests** separately from application requests to avoid log noise
