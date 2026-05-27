# Health Check Patterns

## Overview

Health checks validate that a service is running correctly and can handle requests. They are essential for deployment pipelines, container orchestration, load balancers, and monitoring systems. This reference covers health check types, implementation patterns, and integration strategies.

## Health Check Types

### Liveness vs Readiness vs Startup

| Type | Purpose | Failure Consequence | Frequency |
|------|---------|-------------------|-----------|
| **Liveness** | Is the application alive? (not crashed) | Container restart | Every 10-30 seconds |
| **Readiness** | Is the application ready to serve traffic? | Removed from load balancer | Every 5-15 seconds |
| **Startup** | Has the application finished initializing? | Delays liveness/readiness checks | Runs once during startup |

### Comparison

Pod Lifecycle:
Starting -> Ready -> Running
Startup: Delays liveness until app is initialized
Readiness: Controls traffic routing (in/out of service)
Liveness: Detects deadlocks, hangs, crashes

### Shallow vs Deep Health Checks

| Aspect | Shallow Check | Deep Check |
|--------|---------------|------------|
| **What it tests** | Process is running, port is open | Dependencies are healthy |
| **Latency** | < 10ms | 100ms - 5s |
| **Failure rate** | Almost never fails | May fail due to dependency issues |
| **Best for** | Liveness probes | Readiness probes |

## Health Check Endpoint Patterns

### Basic Health Check (Node.js/Express)

`	ypescript
import express from 'express'

const app = express()

app.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'alive' })
})

app.get('/health/ready', async (_req, res) => {
  const checks = await runHealthChecks()
  const isHealthy = checks.every((c) => c.status === 'ok')
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ready' : 'not ready',
    checks,
  })
})

app.get('/health', async (_req, res) => {
  const checks = await runHealthChecks()
  const isHealthy = checks.every((c) => c.status === 'ok')
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  })
})

async function runHealthChecks(): Promise<HealthCheck[]> {
  return Promise.all([
    checkDatabase(),
    checkRedis(),
    checkExternalApi(),
    checkDiskSpace(),
  ])
}
`

### Health Check Response Format

`	ypescript
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  version: string
  releaseId: string
  uptime: number
  timestamp: string
  checks: HealthCheck[]
}

interface HealthCheck {
  name: string
  status: 'ok' | 'degraded' | 'failed'
  metric?: number
  message?: string
  lastSuccess?: string
  duration: number
}
`

### Example Health Check Response

`json
{
  "status": "degraded",
  "version": "2.3.1",
  "releaseId": "v2.3.1-abc123",
  "uptime": 84321,
  "timestamp": "2026-05-26T14:30:00Z",
  "checks": [
    { "name": "database", "status": "ok", "metric": 5, "duration": 5 },
    { "name": "redis", "status": "ok", "metric": 2, "duration": 2 },
    { "name": "external-api", "status": "degraded", "metric": 1500, "duration": 1500 },
    { "name": "disk-space", "status": "ok", "metric": 45, "message": "45% used", "duration": 1 }
  ]
}
`

## Dependency Health Aggregation

### Dependency Health Categories

| Dependency | Check Method | Timeout | Impact if Down |
|------------|-------------|---------|----------------|
| Database | Ping query (SELECT 1) | 1s | Readiness fails |
| Cache (Redis) | PING command | 500ms | Readiness degraded |
| Message queue | Broker connection check | 2s | Readiness degraded |
| External API | HTTP HEAD /health | 2s | Readiness possible degraded |
| Disk space | Check available space | 100ms | Liveness if full |
| Memory | Check RSS usage | 10ms | Liveness if OOM risk |

### Aggregation with Circuit Breaker

`	ypescript
class HealthAggregator {
  private results: Map<string, HealthCheck> = new Map()

  async check(name: string, fn: () => Promise<HealthCheck>): Promise<HealthCheck> {
    try {
      const result = await fn()
      this.results.set(name, result)
      return result
    } catch (error) {
      const failed: HealthCheck = {
        name,
        status: 'failed',
        message: (error as Error).message,
        duration: 0,
      }
      this.results.set(name, failed)
      return failed
    }
  }

  getStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const checks = Array.from(this.results.values())
    if (checks.some((c) => c.status === 'failed')) return 'unhealthy'
    if (checks.some((c) => c.status === 'degraded')) return 'degraded'
    return 'healthy'
  }
}
`

## Health Check in Kubernetes

### Pod Probe Configuration

`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 8080
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 10
            failureThreshold: 30
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
`

### gRPC Health Check

`yaml
readinessProbe:
  grpc:
    port: 50051
    service: "myapp.Health"
  initialDelaySeconds: 10
  periodSeconds: 15

livenessProbe:
  grpc:
    port: 50051
    service: "myapp.Health"
  initialDelaySeconds: 20
  periodSeconds: 30
`

### TCP Socket Health Check

`yaml
readinessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10

livenessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 20
`

### Exec-Based Health Check

`yaml
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - pgrep myapp || exit 1
  initialDelaySeconds: 10
  periodSeconds: 30
`

## Health Check in Load Balancers

### AWS ALB Health Check

`hcl
resource "aws_lb_target_group" "myapp" {
  name     = "myapp-tg"
  port     = 8080
  protocol = "HTTP"

  health_check {
    enabled             = true
    path               = "/health"
    port               = "traffic-port"
    protocol           = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher            = "200-399"
  }
}
`

### Nginx Health Check

`
ginx
upstream backend {
    server 10.0.1.1:8080 max_fails=3 fail_timeout=30s;
    server 10.0.2.1:8080 max_fails=3 fail_timeout=30s;
}

server {
    location / {
        proxy_pass http://backend;
        health_check interval=10 fails=3 passes=2 uri=/health;
    }
}
`

### HAProxy Health Check

`haproxy
backend myapp_backend
    option httpchk GET /health
    http-check expect status 200
    server app1 10.0.1.1:8080 check inter 10s fall 3 rise 2
    server app2 10.0.2.1:8080 check inter 10s fall 3 rise 2
`

## Deep Health Checks vs Shallow

### Shallow Check (Liveness)

`	ypescript
app.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'alive' })
})
`

### Deep Check (Readiness)

`	ypescript
app.get('/health/deep', async (_req, res) => {
  const start = Date.now()

  const checks = await Promise.allSettled([
    checkPostgres().then((r) => ({ name: 'postgres', ...r })),
    checkRedis().then((r) => ({ name: 'redis', ...r })),
    checkKafka().then((r) => ({ name: 'kafka', ...r })),
    checkS3().then((r) => ({ name: 's3', ...r })),
    checkDisk().then((r) => ({ name: 'disk', ...r })),
    checkMemory().then((r) => ({ name: 'memory', ...r })),
  ])

  const results = checks.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: 'unknown', status: 'failed', message: r.reason }
  )

  const allHealthy = results.every((r) => r.status === 'ok')
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    duration: Date.now() - start,
    checks: results,
  })
})
`

### When to Use Each

| Check Type | Probe Type | Request Frequency | Timeout |
|------------|------------|-------------------|---------|
| Shallow (process only) | Liveness | Every 15-30s | 2-5s |
| Medium (core deps) | Readiness | Every 10-15s | 5-10s |
| Deep (all deps) | Readiness/Manual | On demand or every 60s | 10-30s |

### Cached Deep Health Check

`	ypescript
class CachedHealthChecker {
  private cache: Map<string, { result: HealthCheckResult; timestamp: number }> = new Map()
  private readonly ttl = 30_000

  async check(name: string, fn: () => Promise<HealthCheckResult>): Promise<HealthCheckResult> {
    const cached = this.cache.get(name)
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.result
    }
    const result = await fn()
    this.cache.set(name, { result, timestamp: Date.now() })
    return result
  }
}
`

## Health Check Cascading

### Cascade Pattern

When services depend on each other, health issues cascade:

`
Service A checks Service B checks Service C
If C is unhealthy -> B reports unhealthy -> A reports unhealthy
`

### Preventing Cascading with Circuit Breaker

`	ypescript
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failures = 0
  private readonly threshold = 5
  private readonly resetTimeout = 30_000
  private lastFailureTime = 0

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }
    try {
      const result = await fn()
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
      }
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()
      if (this.failures >= this.threshold) {
        this.state = 'open'
      }
      throw error
    }
  }

  getState(): HealthCheck {
    return {
      name: 'circuit-breaker',
      status: this.state === 'closed' ? 'ok' : 'degraded',
      message: 'Circuit breaker is ' + this.state + ' (' + this.failures + ' failures)',
      duration: 0,
    }
  }
}
`

## Synthetic Monitoring Health Checks

### Synthetic Check Configuration

`	ypescript
interface SyntheticCheck {
  name: string
  url: string
  method: 'GET' | 'POST'
  expectedStatus: number
  expectedBody?: RegExp
  timeout: number
  interval: number
  locations: string[]
}

const syntheticChecks: SyntheticCheck[] = [
  {
    name: 'homepage-load',
    url: 'https://app.example.com',
    method: 'GET',
    expectedStatus: 200,
    timeout: 10000,
    interval: 60000,
    locations: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
  },
  {
    name: 'api-health',
    url: 'https://api.example.com/health',
    method: 'GET',
    expectedStatus: 200,
    timeout: 5000,
    interval: 30000,
    locations: ['us-east-1', 'eu-west-1'],
  },
  {
    name: 'login-flow',
    url: 'https://app.example.com/api/auth/login',
    method: 'POST',
    expectedStatus: 200,
    timeout: 15000,
    interval: 300000,
    locations: ['us-east-1'],
  },
]
`

### Synthetic Monitoring with Playwright

`	ypescript
import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  const start = Date.now()
  const response = await page.goto('https://app.example.com')
  expect(response?.status()).toBe(200)
  expect(Date.now() - start).toBeLessThan(5000)
  await expect(page.locator('h1')).toContainText('Welcome')
})

test('critical API responds', async ({ request }) => {
  const response = await request.get('https://api.example.com/health')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.status).toBe('healthy')
})
`

## Implementing Health Checks by Language

### Python (FastAPI)

`python
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import time
import psutil

app = FastAPI()

@app.get("/health")
async def health_check():
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "disk": check_disk(),
        "memory": check_memory(),
    }
    all_healthy = all(c["status"] == "ok" for c in checks.values())
    return JSONResponse(
        content={
            "status": "healthy" if all_healthy else "unhealthy",
            "checks": checks,
            "uptime": time.monotonic(),
        },
        status_code=200 if all_healthy else 503,
    )

async def check_database():
    try:
        await db.execute("SELECT 1")
        return {"status": "ok"}
    except Exception as e:
        return {"status": "failed", "message": str(e)}

def check_disk():
    usage = psutil.disk_usage("/")
    return {
        "status": "ok" if usage.percent < 90 else "degraded",
        "metric": usage.percent,
    }
`

### Java (Spring Boot)

`java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return Health.up()
                .withDetail("database", "PostgreSQL")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
`

### Go

`go
package main

import (
    "encoding/json"
    "net/http"
    "time"
)

type HealthCheck struct {
    Status    string            json:"status"
    Checks    map[string]Check  json:"checks"
    Uptime    time.Duration     json:"uptime"
    Timestamp string            json:"timestamp"
    Version   string            json:"version"
}

type Check struct {
    Status   string json:"status"
    Message  string json:"message,omitempty"
    Duration int64  json:"duration"
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    checks := make(map[string]Check)
    checks["database"] = checkDatabase()
    checks["redis"] = checkRedis()

    allHealthy := true
    for _, check := range checks {
        if check.Status != "ok" {
            allHealthy = false
            break
        }
    }

    status := http.StatusOK
    if !allHealthy {
        status = http.StatusServiceUnavailable
    }

    response := HealthCheck{
        Status:  map[bool]string{true: "healthy", false: "unhealthy"}[allHealthy],
        Checks:  checks,
        Uptime:  time.Since(startTime),
        Version: version,
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(response)
}
`

## Best Practices

1. **Separate liveness from readiness**: Liveness = process alive, readiness = can serve traffic
2. **Keep liveness checks cheap**: No database calls, no complex logic
3. **Use startup probes for slow-starting apps**: Prevents premature restarts during initialization
4. **Timeout appropriately**: Health checks should timeout faster than the probe interval
5. **Use exponential backoff**: Don't hammer unhealthy services with rapid checks
6. **Cache deep checks**: Avoid overwhelming dependencies with frequent deep checks
7. **Include version info**: Health check responses should include the app version
8. **Standardize response format**: Consistent format across all services
9. **Separate public from private health endpoints**: Internal /health vs external /health/public
10. **Monitor health check failures**: Track health check pass rates as a metric

## Key Points

- Three types of probes: liveness (alive), readiness (traffic-ready), startup (initialized)
- Shallow checks are for liveness (fast, cheap); deep checks are for readiness (comprehensive)
- Kubernetes supports HTTP, TCP, gRPC, and exec-based health checks
- Load balancers use health checks to route traffic away from unhealthy instances
- Circuit breaker pattern prevents cascading failures across dependent services
- Cached health checks reduce load on dependencies
- Synthetic monitoring validates health from external locations
- Health check response should include: status, version, checks, uptime, timestamp
- Liveness failures cause restarts; readiness failures cause traffic removal
- Startup probes prevent premature restarts for slow-initializing applications
