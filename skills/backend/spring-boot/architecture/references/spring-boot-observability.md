# Spring Boot Observability

## Overview
Implement observability in Spring Boot with structured logging, Micrometer metrics, distributed tracing (Micrometer Tracing), and health indicators. Export to Prometheus, Grafana, and OpenTelemetry.

## Structured Logging with Logback

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdc>true</includeMdc>
            <fieldNames>
                <timestamp>timestamp</timestamp>
                <level>level</level>
                <logger>logger</logger>
                <message>message</message>
                <mdc>context</mdc>
            </fieldNames>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON" />
    </root>
</configuration>
```

```java
// Usage with MDC for request context
@Component
public class LoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        try {
            MDC.put("requestId", UUID.randomUUID().toString());
            MDC.put("userId", extractUserId(request));
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

## Metrics with Micrometer

```java
@Configuration
public class MetricsConfig {

    @Bean
    public MeterRegistryCustomizer<MeterRegistry> commonTags() {
        return registry -> registry.config().commonTags(
            "application", "order-service",
            "environment", "${spring.profiles.active:unknown}"
        );
    }
}
```

```java
// Custom business metrics
@Component
public class OrderMetrics {

    private final Counter orderCreatedCounter;
    private final Timer orderProcessingTimer;
    private final DistributionSummary orderValueSummary;
    private final Gauge pendingOrdersGauge;

    public OrderMetrics(MeterRegistry registry) {
        this.orderCreatedCounter = Counter.builder("orders.created")
            .description("Total number of orders created")
            .tag("type", "all")
            .register(registry);

        this.orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("Time taken to process an order")
            .publishPercentiles(0.5, 0.95, 0.99)
            .sla(Duration.ofMillis(100), Duration.ofMillis(500))
            .register(registry);

        this.orderValueSummary = DistributionSummary.builder("orders.value")
            .description("Distribution of order values")
            .baseUnit("dollars")
            .publishPercentiles(0.5, 0.75, 0.9)
            .register(registry);

        this.pendingOrdersGauge = Gauge.builder("orders.pending", this,
                OrderMetrics::getPendingOrderCount)
            .description("Current number of pending orders")
            .register(registry);
    }

    public void recordOrderCreation(Order order) {
        orderCreatedCounter.increment();

        orderProcessingTimer.record(() -> processOrder(order));

        orderValueSummary.record(order.getTotal().getAmount().doubleValue());
    }
}
```

## Actuator Health Endpoints

```java
// Custom health indicator
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try (Connection conn = dataSource.getConnection()) {
            boolean valid = conn.isValid(1000);
            if (valid) {
                return Health.up()
                    .withDetail("database", conn.getMetaData().getDatabaseProductName())
                    .withDetail("validationQuery", "SELECT 1")
                    .build();
            }
            return Health.down()
                .withDetail("error", "Connection validation failed")
                .build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}

// Health endpoint configuration
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
```

## Distributed Tracing with Micrometer Tracing

```java
@Configuration
public class TracingConfig {

    @Bean
    public ObservationRegistry observationRegistry() {
        return ObservationRegistry.create();
    }

    @Bean
    public BraveTracing braveTracing() {
        return BraveTracing.builder()
            .traceId128Bit(true)
            .build();
    }
}
```

```java
// Custom observations
@Component
public class OrderTracing {

    private final ObservationRegistry registry;

    public OrderTracing(ObservationRegistry registry) {
        this.registry = registry;
    }

    public void traceOrderProcessing(Order order, Runnable process) {
        Observation.createNotStarted("order.process", registry)
            .lowCardinalityKeyValue("orderId", order.getId().getValue())
            .lowCardinalityKeyValue("customerId", order.getCustomerId().getValue())
            .observe(process);
    }
}

// Or use @Observed annotation
@Service
@Observed(name = "order.service")
public class OrderService {
    @Observed(name = "order.place", contextualName = "placing-order")
    public OrderId placeOrder(PlaceOrderCommand command) {
        // tracing automatically applied
    }
}
```

## Prometheus & Grafana Integration

```yaml
# docker-compose.observability.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true

  # application must expose /actuator/prometheus
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spring-boot-app'
    metrics_path: '/actuator/prometheus'
    scrape_interval: 15s
    static_configs:
      - targets: ['host.docker.internal:8080']
```

## Key Points
- Use structured JSON logging with Logstash encoder for log aggregation
- Expose custom business metrics via Micrometer (counters, timers, gauges, distribution summaries)
- Implement custom health indicators for dependencies
- Enable distributed tracing with Micrometer Tracing (Brave or OpenTelemetry)
- Expose `/actuator/prometheus` for Prometheus scraping; visualize in Grafana
- Use `@Observed` annotation for automatic trace instrumentation on service methods
