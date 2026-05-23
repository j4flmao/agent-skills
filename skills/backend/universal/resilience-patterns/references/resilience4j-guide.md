# Resilience4j Implementation Guide

## Overview
Resilience4j is a lightweight fault-tolerance library for Java, inspired by Hystrix. It provides modules for CircuitBreaker, Retry, Bulkhead, RateLimiter, TimeLimiter, and Cache.

## Setup

### Maven Dependencies
```xml
<dependency>
  <groupId>io.github.resilience4j</groupId>
  <artifactId>resilience4j-spring-boot3</artifactId>
  <version>2.2.0</version>
</dependency>
```

### Gradle
```groovy
implementation 'io.github.resilience4j:resilience4j-spring-boot3:2.2.0'
```

## CircuitBreaker

### Configuration
```yaml
resilience4j.circuitbreaker:
  configs:
    default:
      sliding-window-size: 10
      minimum-number-of-calls: 5
      permitted-number-of-calls-in-half-open-state: 3
      automatic-transition-from-open-to-half-open-enabled: true
      wait-duration-in-open-state: 30s
      failure-rate-threshold: 50
      event-consumer-buffer-size: 10
      register-health-indicator: true
  instances:
    paymentGateway:
      base-config: default
      wait-duration-in-open-state: 60s
```

### Usage
```java
@CircuitBreaker(name = "paymentGateway", fallbackMethod = "paymentFallback")
public PaymentResponse processPayment(PaymentRequest request) {
  return paymentClient.charge(request);
}

public PaymentResponse paymentFallback(PaymentRequest request, CircuitBreakerException ex) {
  log.warn("Payment gateway unavailable, using fallback", ex);
  return PaymentResponse.degraded(request.getOrderId());
}
```

### State Transitions
```
CLOSED (normal) ── failure >= threshold ──► OPEN
OPEN ── wait duration expires ──► HALF_OPEN
HALF_OPEN ── success >= threshold ──► CLOSED
HALF_OPEN ── failure >= threshold ──► OPEN
```

## Retry

### Configuration
```yaml
resilience4j.retry:
  configs:
    default:
      max-attempts: 3
      wait-duration: 500ms
      exponential-backoff-multiplier: 2
      retry-exceptions:
        - java.net.ConnectException
        - java.net.SocketTimeoutException
      ignore-exceptions:
        - com.example.ValidationException
```

### Usage
```java
@Retry(name = "paymentClient", fallbackMethod = "retryFallback")
public PaymentResponse charge(PaymentRequest request) {
  return httpClient.post(url, request);
}
```

## Bulkhead

### Configuration (Semaphore-based)
```yaml
resilience4j.bulkhead:
  configs:
    default:
      max-concurrent-calls: 25
      max-wait-duration: 500ms
  instances:
    databasePool:
      max-concurrent-calls: 10
      max-wait-duration: 5s
```

### Configuration (Thread-pool based)
```yaml
resilience4j.thread-pool-bulkhead:
  configs:
    default:
      max-thread-pool-size: 10
      core-thread-pool-size: 5
      queue-capacity: 20
      keep-alive-duration: 10s
```

## TimeLimiter

### Configuration
```yaml
resilience4j.timelimiter:
  configs:
    default:
      timeout-duration: 5s
      cancel-running-future: true
```

### Usage
```java
@TimeLimiter(name = "externalService")
public CompletableFuture<Response> callService() {
  return CompletableFuture.supplyAsync(() -> client.call());
}
```

## Combining Patterns
```java
@CircuitBreaker(name = "backend", fallbackMethod = "fallback")
@Retry(name = "backend")
@TimeLimiter(name = "backend")
@Bulkhead(name = "backend")
public CompletableFuture<Response> callBackend(Request request) {
  return CompletableFuture.supplyAsync(() -> backendClient.call(request));
}
```

## Metrics and Monitoring
Resilience4j exposes Micrometer metrics:
- `resilience4j.circuitbreaker.state`
- `resilience4j.circuitbreaker.calls`
- `resilience4j.retry.calls`
- `resilience4j.bulkhead.max.allowed.concurrent.calls`
- `resilience4j.bulkhead.available.concurrent.calls`

## Actuator Endpoints
- `/actuator/health` — circuit breaker health indicators.
- `/actuator/circuitbreakers` — list circuit breaker states.
- `/actuator/circuitbreakers/{name}` — detailed state.

## Equivalent Libraries by Language
- Java: Resilience4j, Failsafe
- .NET: Polly
- Node.js: Opossum, Cockatiel
- Python: pybreaker, tenacity
- Go: gobreaker, hystrix-go
