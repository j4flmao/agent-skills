# Advanced Java Patterns

## Spring Boot Production Patterns

### Externalized Configuration
```java
@ConfigurationProperties(prefix = "app.datasource")
public record DataSourceProperties(
    String url,
    String username,
    String password,
    int poolSize,
    Duration connectionTimeout
) {}

// application.yml
app:
  datasource:
    url: ${DATABASE_URL}
    username: ${DB_USER}
    password: ${DB_PASS}
    pool-size: 10
    connection-timeout: 30s
```

### Conditionals & Auto-Configuration
```java
@Configuration
@ConditionalOnProperty(name = "feature.new-checkout", havingValue = "true")
public class NewCheckoutConfig {
    @Bean
    public CheckoutService newCheckoutService() {
        return new NewCheckoutServiceImpl();
    }
}

@Configuration
@ConditionalOnMissingBean(CheckoutService.class)
public class DefaultCheckoutConfig {
    @Bean
    public CheckoutService defaultCheckoutService() {
        return new LegacyCheckoutServiceImpl();
    }
}
```

### Retry with Spring Retry
```java
@Service
public class PaymentService {
    @Retryable(
        retryFor = {TimeoutException.class, NetworkException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 100, multiplier = 2, maxDelay = 1000)
    )
    public PaymentResult processPayment(Order order) {
        return paymentGateway.charge(order);
    }

    @Recover
    public PaymentResult recover(TimeoutException e, Order order) {
        log.error("Payment failed after retries for order {}", order.id());
        return PaymentResult.failed("Payment service unavailable");
    }
}
```

## Testing With Testcontainers

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderRepository repository;

    @Test
    void saveAndFindById() {
        var order = new Order(null, 1L, BigDecimal.TEN, OrderStatus.PENDING);
        var saved = repository.save(order);
        var found = repository.findById(saved.id());
        assertThat(found).isPresent();
        assertThat(found.get().total()).isEqualByComparingTo(BigDecimal.TEN);
    }
}
```

## Concurrency & Threading

### CompletableFuture Composition
```java
public CompletableFuture<OrderDashboard> buildDashboard(Long userId) {
    var userFuture = CompletableFuture.supplyAsync(() -> userService.findById(userId));
    var ordersFuture = CompletableFuture.supplyAsync(() -> orderService.findByUserId(userId));
    var recommendationsFuture = CompletableFuture.supplyAsync(
        () -> recommendationService.getForUser(userId)
    );

    return CompletableFuture.allOf(userFuture, ordersFuture, recommendationsFuture)
        .thenApply(v -> new OrderDashboard(
            userFuture.join(),
            ordersFuture.join(),
            recommendationsFuture.join()
        ))
        .orTimeout(5, TimeUnit.SECONDS)
        .exceptionally(throwable -> {
            log.error("Dashboard build failed", throwable);
            return new OrderDashboard.empty(userId);
        });
}
```

### Virtual Threads (Java 21+)
```java
// Application config for Spring Boot
@Bean
public TomcatProtocolHandlerCustomizer<?> protocolHandlerCustomizer() {
    return handler -> {
        handler.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    };
}

// Manual usage
public void processOrders(List<Order> orders) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        List<Future<OrderResult>> futures = orders.stream()
            .map(order -> scope.fork(() -> processOrder(order)))
            .toList();
        scope.join();
        scope.throwIfFailed();
        futures.forEach(future -> {
            var result = future.resultNow();
            log.info("Order {} processed: {}", result.orderId(), result.status());
        });
    }
}
```

## Reactive Programming (WebFlux)

```java
@RestController
@RequestMapping("/api/orders")
public class ReactiveOrderController {
    private final ReactiveOrderService service;

    @GetMapping
    public Flux<Order> listOrders(@RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        return service.findAll(page, size);
    }

    @PostMapping
    public Mono<Order> createOrder(@RequestBody Mono<CreateOrderRequest> request) {
        return request.flatMap(service::create);
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<Order>> getOrder(@PathVariable String id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}

@Service
class ReactiveOrderService {
    private final ReactiveOrderRepository repository;

    public Mono<Order> create(CreateOrderRequest request) {
        return Mono.just(request)
            .map(this::toEntity)
            .flatMap(repository::save)
            .doOnSuccess(order -> log.info("Created order {}", order.id()))
            .doOnError(error -> log.error("Failed to create order", error));
    }
}
```

## Observability

### Micrometer Metrics
```java
@Configuration
public class MetricsConfig {
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config().commonTags(
            "application", "order-service",
            "environment", System.getenv("ENV")
        );
    }
}

@Service
class OrderMetrics {
    private final Counter orderCreated;
    private final Timer orderProcessingTime;

    public OrderMetrics(MeterRegistry registry) {
        orderCreated = Counter.builder("orders.created")
            .description("Total orders created")
            .register(registry);
        orderProcessingTime = Timer.builder("orders.processing.time")
            .description("Time to process order")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
    }

    public void recordOrder(Order order) {
        orderCreated.increment();
    }

    public <T> T measureProcessing(Supplier<T> fn) {
        return orderProcessingTime.record(fn);
    }
}
```

### Structured Logging with Logstash
```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdc>true</includeMdc>
            <customFields>{"service":"order-service","version":"1.0.0"}</customFields>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON"/>
    </root>
</configuration>
```

## Security Patterns

### JWT Authentication Filter
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtDecoder jwtDecoder;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain chain) throws IOException, ServletException {
        var token = extractToken(request);
        if (token != null) {
            try {
                var jwt = jwtDecoder.decode(token);
                var authentication = new JwtAuthenticationToken(jwt);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException e) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        var header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
```
