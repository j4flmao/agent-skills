# Resilience4j Implementation Guide (Spring Boot 3)

Resilience4j is a lightweight fault-tolerance library for Java 17+ (2.x line) built on functional decorators. It is the de facto successor to Netflix Hystrix, which has been in maintenance mode since 2018. Modules: CircuitBreaker, Retry, Bulkhead (semaphore and thread-pool), RateLimiter, TimeLimiter, Cache (JCache).

## Setup

### Maven
```xml
<dependency>
  <groupId>io.github.resilience4j</groupId>
  <artifactId>resilience4j-spring-boot3</artifactId>
  <version>${resilience4j.version}</version> <!-- 2.x; pin the latest from Maven Central -->
</dependency>
<!-- Annotations are implemented as Spring AOP aspects -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

### Gradle
```groovy
implementation "io.github.resilience4j:resilience4j-spring-boot3:${resilience4jVersion}"
implementation 'org.springframework.boot:spring-boot-starter-aop'
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

Without `spring-boot-starter-aop` the annotations compile but silently do nothing.

## CircuitBreaker

### Configuration
```yaml
resilience4j.circuitbreaker:
  configs:
    default:
      sliding-window-type: COUNT_BASED      # or TIME_BASED (window size = seconds)
      sliding-window-size: 20
      minimum-number-of-calls: 10           # no state change before this many calls
      failure-rate-threshold: 50            # percent
      slow-call-duration-threshold: 2s
      slow-call-rate-threshold: 80          # percent of calls slower than threshold
      wait-duration-in-open-state: 30s
      permitted-number-of-calls-in-half-open-state: 3
      automatic-transition-from-open-to-half-open-enabled: true
      register-health-indicator: true
      record-exceptions:
        - java.io.IOException
        - java.util.concurrent.TimeoutException
      ignore-exceptions:
        - com.example.BusinessValidationException
  instances:
    paymentGateway:
      base-config: default
      wait-duration-in-open-state: 60s
```

### Usage and fallback signature
```java
@Service
public class PaymentService {
  private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
  private final PaymentClient paymentClient;

  public PaymentService(PaymentClient paymentClient) { this.paymentClient = paymentClient; }

  @CircuitBreaker(name = "paymentGateway", fallbackMethod = "paymentFallback")
  public PaymentResponse processPayment(PaymentRequest request) {
    return paymentClient.charge(request);
  }

  // Same parameters + one trailing exception parameter, same return type.
  // CallNotPermittedException is thrown when the breaker is OPEN.
  private PaymentResponse paymentFallback(PaymentRequest request, CallNotPermittedException ex) {
    log.warn("Circuit open for paymentGateway, orderId={}", request.orderId());
    return PaymentResponse.queuedForRetry(request.orderId());
  }

  private PaymentResponse paymentFallback(PaymentRequest request, Throwable ex) {
    log.error("Payment failed for orderId={}: {}", request.orderId(), ex.toString());
    throw new PaymentUnavailableException(request.orderId(), ex);
  }
}
```
The most specific matching fallback is chosen. Annotated methods must be called through the Spring proxy: self-invocation (`this.processPayment(...)`) bypasses the aspect.

### State machine
```
CLOSED    -- failure or slow-call rate >= threshold (after minimum calls) --> OPEN
OPEN      -- wait-duration-in-open-state elapsed -----------------------> HALF_OPEN
HALF_OPEN -- permitted calls succeed (rate below threshold) ------------> CLOSED
HALF_OPEN -- rate still >= threshold -----------------------------------> OPEN
Manual states: DISABLED, FORCED_OPEN, METRICS_ONLY
```

## Retry

```yaml
resilience4j.retry:
  configs:
    default:
      max-attempts: 3                       # includes the first call
      wait-duration: 500ms
      enable-exponential-backoff: true      # required for the multiplier to apply
      exponential-backoff-multiplier: 2
      exponential-max-wait-duration: 5s
      retry-exceptions:
        - java.net.ConnectException
        - java.net.SocketTimeoutException
      ignore-exceptions:
        - com.example.BusinessValidationException
```
Do not enable `enable-exponential-backoff` and `enable-randomized-wait` together in properties; for exponential backoff with jitter, register a `RetryConfigCustomizer` that sets `IntervalFunction.ofExponentialRandomBackoff(initial, multiplier, randomizationFactor)`.

```java
@Retry(name = "inventoryClient", fallbackMethod = "inventoryFallback")
public Stock getStock(String sku) { return inventoryClient.get(sku); }
```
Retry only idempotent operations, or requests carrying an idempotency key.

## Bulkhead

```yaml
resilience4j.bulkhead:                     # semaphore: limits concurrent calls on caller threads
  instances:
    reportingDb:
      max-concurrent-calls: 10
      max-wait-duration: 0                 # fail fast instead of queueing

resilience4j.thread-pool-bulkhead:         # dedicated pool; method must return CompletionStage
  instances:
    pdfRenderer:
      core-thread-pool-size: 4
      max-thread-pool-size: 8
      queue-capacity: 20
      keep-alive-duration: 20ms
```
```java
@Bulkhead(name = "pdfRenderer", type = Bulkhead.Type.THREADPOOL)
public CompletableFuture<byte[]> render(Report r) { return CompletableFuture.completedFuture(renderer.render(r)); }
```

## RateLimiter

```yaml
resilience4j.ratelimiter:
  instances:
    smsProvider:
      limit-for-period: 50
      limit-refresh-period: 1s
      timeout-duration: 0                  # do not block waiting for a permit
```
Throws `RequestNotPermitted` when no permit is available.

## TimeLimiter

```yaml
resilience4j.timelimiter:
  instances:
    externalService:
      timeout-duration: 3s
      cancel-running-future: true
```
```java
@TimeLimiter(name = "externalService")
public CompletableFuture<Response> callService() {
  return CompletableFuture.supplyAsync(client::call, executor);  // pass a bounded executor
}
```
TimeLimiter only works on async return types. For blocking HTTP clients, set connect/read timeouts on the client itself.

## Combining Patterns and Aspect Order

Default aspect order (outermost first):
```
Retry ( CircuitBreaker ( RateLimiter ( TimeLimiter ( Bulkhead ( method ) ) ) ) )
```
So each retry attempt passes through the breaker, and breaker failures count every attempt. Change with `resilience4j.retry.retry-aspect-order` / `circuit-breaker-aspect-order` (higher value = higher priority).

```java
@Retry(name = "backend")
@CircuitBreaker(name = "backend", fallbackMethod = "fallback")
@TimeLimiter(name = "backend")
@Bulkhead(name = "backend", type = Bulkhead.Type.THREADPOOL)
public CompletableFuture<Response> callBackend(Request request) {
  return CompletableFuture.completedFuture(backendClient.call(request));
}
```

## Functional (non-Spring) Usage

```java
CircuitBreaker cb = CircuitBreaker.of("backend", CircuitBreakerConfig.custom()
    .failureRateThreshold(50).slidingWindowSize(20).build());
Retry retry = Retry.of("backend", RetryConfig.custom().maxAttempts(3)
    .intervalFunction(IntervalFunction.ofExponentialBackoff(Duration.ofMillis(200), 2)).build());

Supplier<Response> decorated = Decorators.ofSupplier(backendClient::call)
    .withCircuitBreaker(cb)
    .withRetry(retry)
    .withFallback(List.of(CallNotPermittedException.class), ex -> Response.cached())
    .decorate();
```

## Metrics and Actuator

Micrometer meters (with `resilience4j-micrometer`, included by the starter):
- `resilience4j.circuitbreaker.state`, `resilience4j.circuitbreaker.calls`, `resilience4j.circuitbreaker.failure.rate`
- `resilience4j.retry.calls` (tagged `kind=successful_without_retry|successful_with_retry|failed_with_retry|failed_without_retry`)
- `resilience4j.bulkhead.available.concurrent.calls`
- `resilience4j.ratelimiter.available.permissions`

```yaml
management:
  endpoints.web.exposure.include: health,circuitbreakers,circuitbreakerevents,retries,metrics
  health.circuitbreakers.enabled: true
```
Endpoints: `/actuator/circuitbreakers`, `/actuator/circuitbreakerevents/{name}`, `/actuator/retries`.

## Pitfalls

| Pitfall | Effect | Fix |
|---|---|---|
| No AOP starter | Annotations ignored | Add `spring-boot-starter-aop` |
| Self-invocation | Bypasses proxy | Call through another bean |
| Fallback signature mismatch | `NoSuchMethodException` at startup/call | Same args + exception, same return type |
| Retrying 4xx / validation errors | Wasted load | `ignore-exceptions` |
| Retry at several layers | Retry storms | Retry in one layer only |
| `minimum-number-of-calls` too low | Breaker flaps on low traffic | Size to real traffic |
| TimeLimiter on blocking method | No effect | Return `CompletableFuture` or use client timeouts |

## Equivalent Libraries
- Java: Resilience4j, Failsafe
- .NET: Polly (v8 resilience pipelines), Microsoft.Extensions.Http.Resilience
- Node.js: Cockatiel, Opossum
- Python: tenacity (retry), pybreaker / aiobreaker
- Go: sony/gobreaker, failsafe-go

## Checklist
- [ ] Every remote call has a timeout
- [ ] Breaker thresholds sized from real traffic and latency
- [ ] Retries limited, jittered, idempotent-only
- [ ] Fallbacks degrade explicitly and are logged
- [ ] Health indicators and metrics exported and alerted on
- [ ] Behavior verified with fault-injection tests
