# Health Check Patterns

## Health Check Types

### Liveness Probe
Indicates the application is running (not crashed). Simple check: is the process alive?
```yaml
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3
```

### Readiness Probe
Indicates the application is ready to handle requests. Checks: database connected, caches warm, migrations complete.
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 2
```

### Startup Probe
For slow-starting applications. Gives extra time before liveness/readiness take over.
```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30  # Up to 150 seconds to start
```

## Implementation
```python
# health checks implementation
from fastapi import FastAPI, Response
from enum import Enum

app = FastAPI()

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@app.get("/health/live")
async def liveness():
    """Process is alive and running."""
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness(db_connected: bool, cache_connected: bool):
    """Application is ready to handle requests."""
    if not db_connected:
        return Response(
            content='{"status":"not ready","reason":"database disconnected"}',
            status_code=503,
        )
    return {"status": "ready", "db": "connected", "cache": "connected"}

@app.get("/health")
async def comprehensive_health():
    """Full health check with detailed status."""
    checks = {
        "database": check_database(),
        "cache": check_cache(),
        "queue": check_message_queue(),
        "external_services": check_dependencies(),
    }
    overall = all(v["healthy"] for v in checks.values())
    status = HealthStatus.HEALTHY if overall else HealthStatus.DEGRADED
    return {"status": status, "checks": checks}
```

## Key Points
- Separate liveness (process alive) from readiness (can handle requests)
- Liveness should be lightweight — no dependency checks
- Readiness should check critical dependencies
- Startup probes handle slow start without killing the container
- Comprehensive health endpoint provides detailed status for operators
