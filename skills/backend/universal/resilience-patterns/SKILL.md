---
name: backend-resilience-patterns
description: >
  Use this skill when the user says 'resilience', 'circuit breaker', 'retry', 'bulkhead', 'timeout', 'fallback', 'resilience4j', 'fault tolerance', 'rate limiter', 'backoff', 'retry strategy', 'bulkhead pattern'. This skill applies production fault-tolerance patterns: circuit breaker, retry with backoff, bulkhead isolation, timeouts, and fallback handlers. Applies to any backend stack. Do NOT use for: infrastructure-level resiliency (K8s liveness probes), database replication, or frontend error handling.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, resilience, fault-tolerance, circuit-breaker]
---

# Backend Resilience Patterns

## Purpose
Protect backend services from cascading failures by applying circuit breakers, retries with backoff, bulkheads, timeouts, and fallbacks.

## Agent Protocol

### Trigger
Exact user phrases: "resilience", "circuit breaker", "retry", "bulkhead", "timeout", "fallback", "resilience4j", "fault tolerance", "retry strategy", "backoff", "rate limiter".

### Input Context
- Type of external calls (HTTP, database, message queue).
- Existing retry or timeout configuration.
- SLAs and latency requirements.

### Output Artifact
Configuration snippets or code. No file unless requested.

### Response Format
```
Pattern: {circuit-breaker|retry|bulkhead|timeout|fallback}
Config: {key parameters and values}
```

### Completion Criteria
- [ ] At least timeout configured for every external call.
- [ ] Retry with exponential backoff and jitter configured.
- [ ] Circuit breaker defined per dependency (not one for all).
- [ ] Fallback handler defined for every circuit breaker.
- [ ] Bulkhead isolation applied to thread pools where needed.

### Max Response Length
4 lines per pattern. 20 lines for full configuration.

## Workflow

### Step 1: Configure Timeouts
Every external call needs a timeout. No exceptions.
- HTTP: 2-10 seconds depending on SLA.
- Database: 5-30 seconds depending on query complexity.
- Message queue publish: 5 seconds.

### Step 2: Configure Retries
```
Retry: maxAttempts=3, backoff=exponential, jitter=true, initialDelay=100ms
```
Retry on: 5xx, network errors, timeouts.
Do NOT retry on: 4xx (client errors), idempotency violations.

### Step 3: Configure Circuit Breaker
```
CircuitBreaker: failureThreshold=5, successThreshold=3, waitDuration=30s
perDependency=true, halfOpenMaxCalls=3
```
State transitions: CLOSED -> OPEN (failure threshold) -> HALF_OPEN (after wait duration) -> CLOSED (success threshold).

### Step 4: Configure Bulkhead
Separate thread pools or semaphores for each dependency:
```
Bulkhead: type=semaphore, maxConcurrentCalls=10, maxWaitDuration=500ms
```

### Step 5: Define Fallbacks
Every circuit breaker must have a fallback:
```
Fallback: returnStaleData=true, degradedResponse={status: "degraded"}, logWarning=true
```

### Step 6: Wire Together
Use a resilience framework (Resilience4j, Polly, Opossum, Failsafe). Decorate the call:
```java
Decorators.builder()
  .withCircuitBreaker(circuitBreaker)
  .withRetry(retry)
  .withBulkhead(bulkhead)
  .withTimeLimiter(timeLimiter)
  .withFallback(fallback)
  .build()
  .execute(this::callExternalService);
```

## Rules
- Timeout is mandatory. Always lower than the upstream timeout.
- Retries must be idempotent-safe. Never retry non-idempotent operations without idempotency keys.
- Circuit breaker per dependency, not per service.
- Bulkhead shared thread pools only within the same dependency class (e.g. all DB calls, all HTTP calls).
- Fallbacks must degrade gracefully, never crash.
- Log every circuit breaker state change.
- Monitor circuit breaker metrics (state, call count, failure ratio).

## References
- `references/resilience4j-guide.md` — Resilience4j implementation guide
- `references/retry-backoff-strategies.md` — Retry and backoff strategy reference

## Handoff
No artifact produced unless requested.
Next skill: openapi-documentation — document the resilient API endpoints.
Carry forward: timeout values, retry configuration, circuit breaker thresholds.
