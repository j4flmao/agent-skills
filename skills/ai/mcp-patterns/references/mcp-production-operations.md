# MCP Production Operations & Scaling

## Overview
Running MCP servers in production requires health monitoring, scaling strategies, observability, error budgets, and operational tooling. This reference covers everything needed to operate MCP servers reliably at scale.

## Health Check Patterns

### Liveness vs Readiness
- **Liveness**: Is the server process alive and responding? (`/health`)
- **Readiness**: Is the server ready to accept requests? (`/health/ready` — verifies dependencies)

### stdio Health Check
```python
@server.tool()
def health() -> str:
    """Liveness check — returns server status.

    Call this periodically to verify the server is operational.
    """
    return json.dumps({
        "status": "ok",
        "uptime": time.time() - START_TIME,
        "version": __version__,
        "tools_loaded": len(tool_registry),
        "pid": os.getpid(),
    })

@server.tool()
def readiness() -> str:
    """Readiness check — verifies all dependencies are reachable."""
    deps = {
        "database": _check_db(),
        "vector_store": _check_vectorstore(),
        "cache": _check_cache(),
    }
    all_ready = all(deps.values())
    return json.dumps({
        "status": "ready" if all_ready else "not_ready",
        "dependencies": deps,
    })

def _check_db() -> bool:
    try:
        db.execute("SELECT 1")
        return True
    except Exception:
        return False

def _check_vectorstore() -> bool:
    try:
        vectorstore.similarity_search("healthcheck", k=1)
        return True
    except Exception:
        return False
```

### SSE HTTP Health Endpoints
```python
from fastapi import FastAPI, Response
import time

app = FastAPI()
START_TIME = time.time()
REQUEST_COUNT = 0

@app.middleware("http")
async def count_requests(request, call_next):
    global REQUEST_COUNT
    REQUEST_COUNT += 1
    return await call_next(request)

@app.get("/health")
async def liveness():
    return {
        "status": "healthy",
        "uptime_seconds": time.time() - START_TIME,
        "version": __version__,
        "total_requests": REQUEST_COUNT,
        "active_sessions": len(active_connections),
    }

@app.get("/health/ready")
async def readiness():
    deps = await check_all_dependencies()
    all_ok = all(d.status == "ok" for d in deps.values())
    status_code = 200 if all_ok else 503
    return Response(
        content=json.dumps({
            "status": "ready" if all_ok else "not_ready",
            "dependencies": {k: v.status for k, v in deps.items()},
        }),
        status_code=status_code,
        media_type="application/json",
    )

@app.get("/health/startup")
async def startup():
    """Startup check — called by orchestrator before routing traffic."""
    return {"status": "started", "tools_loaded": len(tool_registry)}
```

### Kubernetes Probes
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mcp-server
spec:
  containers:
  - name: mcp-server
    image: mcp-server:latest
    ports:
    - containerPort: 8000
    livenessProbe:
      httpGet:
        path: /health
        port: 8000
      initialDelaySeconds: 5
      periodSeconds: 15
      timeoutSeconds: 3
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8000
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 2
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8000
      initialDelaySeconds: 2
      periodSeconds: 5
      failureThreshold: 30
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

## Monitoring & Observability

### Metrics Collection

**Prometheus Metrics:**
```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server

tool_calls = Counter(
    "mcp_tool_calls_total",
    "Total number of tool calls",
    ["tool", "status"]  # status: success, error, rate_limited
)

tool_duration = Histogram(
    "mcp_tool_duration_seconds",
    "Tool call duration in seconds",
    ["tool"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
)

resource_reads = Counter(
    "mcp_resource_reads_total",
    "Total resource reads",
    ["resource"]
)

active_connections = Gauge(
    "mcp_active_connections",
    "Current number of active client connections"
)

errors_total = Counter(
    "mcp_errors_total",
    "Total errors by type",
    ["error_type"]  # validation, auth, execution, internal
)
```

**Middleware to auto-record metrics:**
```python
from functools import wraps
import time

def monitor_tool(tool_name: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                tool_calls.labels(tool=tool_name, status="success").inc()
                return result
            except Exception as e:
                tool_calls.labels(tool=tool_name, status="error").inc()
                errors_total.labels(error_type="execution").inc()
                raise
            finally:
                tool_duration.labels(tool=tool_name).observe(time.time() - start)
        return wrapper
    return decorator
```

### Structured Logging

**JSON Log Format:**
```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)
        return json.dumps(log_entry)

logger = logging.getLogger("mcp-server")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage
logger.info("Tool call started", extra={"extra_fields": {
    "tool": "search",
    "client_id": "client-123",
    "request_id": "req-abc",
}})
```

**Logging Middleware:**
```python
import uuid

@app.middleware("http")
async def logging_middleware(request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.time()

    logger.info("Request started", extra={"extra_fields": {
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "client": request.client.host,
    }})

    try:
        response = await call_next(request)
        duration = time.time() - start
        logger.info("Request completed", extra={"extra_fields": {
            "request_id": request_id,
            "duration_ms": round(duration * 1000, 2),
            "status_code": response.status_code,
        }})
        return response
    except Exception as e:
        duration = time.time() - start
        logger.error("Request failed", extra={"extra_fields": {
            "request_id": request_id,
            "duration_ms": round(duration * 1000, 2),
            "error": str(e),
        }})
        raise
```

### Key Metrics to Monitor

| Metric | What It Tells You | Alert Threshold |
|--------|-------------------|-----------------|
| `mcp_tool_calls_total` | Request volume and error rate | Error rate > 5% |
| `mcp_tool_duration_seconds` | Latency per tool | p99 > 5s |
| `mcp_active_connections` | Current load | > 80% of max |
| `mcp_errors_total` | Error breakdown | Any auth/validation spike |
| `mcp_resource_reads_total` | Resource access patterns | N/A (trending) |
| Process memory | Memory leaks | > 80% of limit |
| Process CPU | CPU saturation | > 70% sustained |

### Grafana Dashboard (JSON snippet)
```json
{
  "panels": [
    {
      "title": "Tool Call Rate",
      "type": "graph",
      "targets": [{
        "expr": "rate(mcp_tool_calls_total[1m])",
        "legendFormat": "{{tool}} - {{status}}"
      }]
    },
    {
      "title": "Tool Latency (p95)",
      "type": "heatmap",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(mcp_tool_duration_seconds_bucket[5m]))",
        "legendFormat": "{{tool}}"
      }]
    },
    {
      "title": "Active Connections",
      "type": "graph",
      "targets": [{"expr": "mcp_active_connections"}]
    },
    {
      "title": "Error Rate by Type",
      "type": "graph",
      "targets": [{
        "expr": "rate(mcp_errors_total[5m])",
        "legendFormat": "{{error_type}}"
      }]
    }
  ]
}
```

## Scaling Strategies

### stdio Scaling

**Constraints:**
- One process per client
- No shared state between processes
- OS resource limits (file descriptors, memory)

**Scaling approach:**
```
Many clients → Spawn many server processes
```

```python
class StdioScaleManager:
    def __init__(self, server_command: str, max_instances: int = 50):
        self.command = server_command
        self.max_instances = max_instances
        self.processes = {}

    async def spawn_for_client(self, client_id: str) -> int:
        if len(self.processes) >= self.max_instances:
            raise RuntimeError("Max server instances reached")

        process = await asyncio.create_subprocess_exec(
            *self.command.split(),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self.processes[client_id] = process
        return process.pid

    async def terminate(self, client_id: str):
        process = self.processes.pop(client_id, None)
        if process:
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=5)
            except asyncio.TimeoutError:
                process.kill()

    @property
    def instance_count(self) -> int:
        return len(self.processes)
```

### SSE Scaling

**Stateless pattern (recommended):**
```
                     ┌──────────────┐
Client ──→ LB ──→ MCP Server 1
              │    ├── Shared DB
              │    ├── Shared Cache (Redis)
              │    └── Stateless tools
              │
              └──→ MCP Server 2 (identical)
```

**Stateless server requirements:**
- No in-memory session state tied to a specific instance
- Shared database for persistent data
- Shared cache (Redis) for computed resources
- Tools are pure functions (same input → same output)
- Resource caching uses distributed cache, not local memory

```python
class DistributedCache:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.default_ttl = 300

    async def get(self, key: str) -> str | None:
        return await self.redis.get(f"mcp_cache:{key}")

    async def set(self, key: str, value: str, ttl: int | None = None):
        await self.redis.set(
            f"mcp_cache:{key}",
            value,
            ex=ttl or self.default_ttl
        )

    async def invalidate(self, pattern: str):
        keys = await self.redis.keys(f"mcp_cache:{pattern}")
        if keys:
            await self.redis.delete(*keys)
```

**Sticky sessions (alternative):**
```
Client ──→ LB (sticky) ──→ MCP Server 1 (stateful)
Client ──→ LB (sticky) ──→ MCP Server 2 (stateful)
```

Only use when servers maintain in-memory session state. Downside: uneven load distribution, harder to scale down.

### WebSocket Scaling

```
                     ┌──────────────┐
Client ──→ LB ──→ WS Server 1
              │    ├── Redis Pub/Sub (broadcast)
              │    └── State: Redis
              │
              └──→ WS Server 2
```

**Redis Pub/Sub for cross-server communication:**
```python
class WSStateManager:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.pubsub = redis_client.pubsub()
        self.local_connections = {}

    async def broadcast(self, channel: str, message: dict):
        await self.redis.publish(channel, json.dumps(message))

    async def subscribe(self, channel: str, handler):
        await self.pubsub.subscribe(channel)
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                await handler(json.loads(message["data"]))
```

### Auto-Scaling Configuration

```yaml
# docker-compose scaling
services:
  mcp-server:
    image: mcp-server:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
      restart_policy:
        condition: on-failure
        max_attempts: 3
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgres://user:pass@db:5432/mcp
    depends_on:
      - redis
      - db
```

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
```

## Rate Limiting

### Token Bucket Algorithm
```python
import time
import asyncio

class TokenBucket:
    def __init__(self, rate: float, burst: int):
        self.rate = rate  # tokens per second
        self.burst = burst  # max tokens
        self.tokens = burst
        self.last_refill = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self) -> bool:
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
            self.last_refill = now

            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False

# Per-client rate limiter
class PerClientRateLimiter:
    def __init__(self, default_rpm: int = 60, default_burst: int = 10):
        self.limiters = {}
        self.default_rpm = default_rpm
        self.default_burst = default_burst

    def get_limiter(self, client_id: str) -> TokenBucket:
        if client_id not in self.limiters:
            self.limiters[client_id] = TokenBucket(
                rate=self.default_rpm / 60,
                burst=self.default_burst,
            )
        return self.limiters[client_id]

    async def check(self, client_id: str) -> bool:
        return await self.get_limiter(client_id).acquire()
```

### Rate Limiting Middleware (SSE)
```python
from fastapi import Request, HTTPException

rate_limiter = PerClientRateLimiter(default_rpm=60)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_id = request.headers.get("X-Client-Id", request.client.host)
    allowed = await rate_limiter.check(client_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "code": "RATE_LIMITED",
                "retry_after": 60,
            }
        )
    return await call_next(request)
```

## Graceful Shutdown

### Python Server
```python
import signal
import sys

class GracefulShutdown:
    def __init__(self, server):
        self.server = server
        self.shutdown_requested = False

    def __enter__(self):
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)
        return self

    def _handle_signal(self, signum, frame):
        print(f"Received signal {signum}, shutting down...", file=sys.stderr)
        self.shutdown_requested = True

    async def shutdown_sequence(self):
        """Orderly shutdown: stop accepting → drain in-flight → cleanup."""
        print("Stopping request acceptor...", file=sys.stderr)
        self.server.should_exit = True

        print(f"Draining {len(active_connections)} active connections...", file=sys.stderr)
        for conn in list(active_connections):
            try:
                await conn.close()
            except Exception:
                pass

        print("Closing database connections...", file=sys.stderr)
        await db_pool.close()

        print("Flushing metrics...", file=sys.stderr)
        await push_metrics()

        print("Shutdown complete.", file=sys.stderr)
```

### Docker Entrypoint with Graceful Shutdown
```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY server.py .
COPY requirements.txt .

RUN pip install -r requirements.txt

EXPOSE 8000

# Use exec form for proper signal handling
CMD ["python", "server.py"]
```

```python
# startup/shutdown events for FastAPI
@app.on_event("startup")
async def startup():
    print("Server starting up...", file=sys.stderr)
    await connect_database()
    await warm_caches()
    print("Server ready.", file=sys.stderr)

@app.on_event("shutdown")
async def shutdown():
    print("Server shutting down...", file=sys.stderr)
    await close_database()
    await flush_metrics()
    print("Server stopped.", file=sys.stderr)
```

## Disaster Recovery

### Backup Strategy for MCP State
```python
class MCPStateBackup:
    def __init__(self, storage_backend):
        self.storage = storage_backend

    async def backup_state(self):
        """Backup MCP server state for recovery."""
        state = {
            "timestamp": datetime.utcnow().isoformat(),
            "version": __version__,
            "tool_registry": self.export_tool_registry(),
            "api_keys": self.export_api_keys(),
            "audit_log_since": self.last_audit_export,
        }
        key = f"backups/mcp-state-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
        await self.storage.upload(key, json.dumps(state))
        return key

    async def restore_state(self, backup_key: str):
        state = json.loads(await self.storage.download(backup_key))
        self.import_tool_registry(state["tool_registry"])
        self.import_api_keys(state["api_keys"])
```

### Circuit Breaker for Downstream Dependencies
```python
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = 0
        self.state = "closed"  # closed, open, half-open

    async def call(self, fn, *args, **kwargs):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
            else:
                raise CircuitBreakerOpenError("Circuit breaker is open")

        try:
            result = await fn(*args, **kwargs)
            if self.state == "half-open":
                self.state = "closed"
                self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.failure_threshold:
                self.state = "open"
            raise
```

## Deployment Configurations

### Docker Multi-Stage Build
```dockerfile
# Build stage
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Runtime stage
FROM python:3.12-slim
WORKDIR /app

# Create non-root user
RUN groupadd -r mcp && useradd -r -g mcp mcp

COPY --from=builder /root/.local /home/mcp/.local
COPY server.py .
COPY tools/ ./tools/
COPY resources/ ./resources/

USER mcp
ENV PATH=/home/mcp/.local/bin:$PATH

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["python", "server.py"]
```

### Nginx Reverse Proxy
```nginx
upstream mcp_servers {
    least_conn;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
}

server {
    listen 443 ssl;
    server_name mcp.example.com;

    ssl_certificate /etc/ssl/certs/mcp.crt;
    ssl_certificate_key /etc/ssl/private/mcp.key;

    # SSE endpoint — long-lived connection
    location /sse {
        proxy_pass http://mcp_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        chunked_transfer_encoding on;
    }

    # Message endpoint — standard POST
    location /messages {
        proxy_pass http://mcp_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection keep-alive;
        proxy_read_timeout 30s;
    }

    # Health check
    location /health {
        proxy_pass http://mcp_servers;
        proxy_http_version 1.1;
        proxy_read_timeout 5s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=mcp:10m rate=100r/s;
    location /messages {
        limit_req zone=mcp burst=20 nodelay;
        proxy_pass http://mcp_servers;
    }
}
```

## Incident Response

### Common Failure Modes

| Symptom | Likely Cause | Action |
|---------|-------------|--------|
| All tool calls timeout | Downstream dependency down | Check DB/cache health, circuit breaker |
| Sporadic timeouts | Resource exhaustion (CPU/memory) | Scale up/out, check for leaks |
| Auth failures spike | API key rotation or expiration | Check key management, audit logs |
| High error rate on one tool | Bug in tool handler | Rollback, check recent deploys |
| Connection drops | Network issue or proxy timeout | Check nginx config, TCP keepalive |
| Memory grows steadily | Memory leak in tool handler | Heap dump, profile, fix leak |

### Runbook: MCP Server Unreachable

1. **Check liveness**: `curl https://mcp.example.com/health`
2. **Check readiness**: `curl https://mcp.example.com/health/ready`
3. **Check logs**: `kubectl logs -l app=mcp-server --tail=100`
4. **Check resources**: `kubectl top pods -l app=mcp-server`
5. **Check downstream**: Verify database, cache, and external API health
6. **Restart**: `kubectl rollout restart deployment/mcp-server`
7. **Escalate**: If down for > 5min, page on-call with logs snapshot

## Key Points
- Implement both liveness and readiness health checks
- Export Prometheus metrics for all tool calls, latency, and errors
- Use structured JSON logging with correlation IDs
- Scale SSE servers horizontally (stateless) behind a load balancer
- Scale stdio servers by spawning more processes
- Implement per-client rate limiting with token bucket algorithm
- Graceful shutdown: stop accepting → drain connections → cleanup
- Add circuit breakers for downstream dependency failures
- Configure Kubernetes HPA based on CPU/memory utilization
- Document runbooks for common failure modes
