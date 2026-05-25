# Spring Boot Observability

## Dependencies

```gradle
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'io.micrometer:micrometer-tracing-bridge-brave'
implementation 'io.micrometer:micrometer-registry-prometheus'
```

## Actuator Configuration

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus,info,env,loggers
      base-path: /actuator
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
  metrics:
    tags:
      application: ${spring.application.name}
```

## Custom Metrics

```java
@Service
public class OrderMetricsService {
    private final Counter orderCreatedCounter;
    private final Timer orderProcessingTime;
    private final DistributionSummary orderValue;

    public OrderMetricsService(MeterRegistry registry) {
        this.orderCreatedCounter = Counter.builder("orders.created")
            .description("Total orders created")
            .register(registry);

        this.orderProcessingTime = Timer.builder("orders.processing.time")
            .description("Time to process an order")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        this.orderValue = DistributionSummary.builder("orders.value")
            .description("Order value distribution")
            .baseUnit("dollars")
            .register(registry);
    }

    public void recordOrderCreated(String status) {
        orderCreatedCounter.increment();
        Metrics.counter("orders.by.status", "status", status).increment();
    }

    public <T> T measureProcessingTime(Supplier<T> fn) {
        return orderProcessingTime.record(fn);
    }
}
```

## Distributed Tracing

```yaml
management:
  tracing:
    sampling:
      probability: 0.1
    propagation:
      type: w3c
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

## Custom Tags & Spans

```java
@RestController
public class OrderController {
    private final Tracer tracer;

    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable String id) {
        Span span = tracer.nextSpan().name("find-order").start();
        try (var ignored = span.makeCurrent()) {
            span.tag("order.id", id);
            return orderService.findById(id);
        } finally {
            span.end();
        }
    }
}

// Or with @SpanTag
@NewSpan(name = "process-payment")
public PaymentResult process(@SpanTag("payment.id") String paymentId) { ... }
```

## Logging Correlation

```yaml
logging:
  pattern:
    level: "%5p [%X{traceId:-},%X{spanId:-}]"
```

## Health Indicators

```java
@Component
public class DownstreamHealthIndicator implements HealthIndicator {
    private final RestClient restClient;

    @Override
    public Health health() {
        try {
            var response = restClient.get()
                .uri("https://api.external.com/health")
                .retrieve()
                .toBodilessEntity();
            return response.getStatusCode().is2xxSuccessful()
                ? Health.up().build()
                : Health.down().build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```
