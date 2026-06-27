---
name: spring-boot-architecture
description: >
  Use this skill when the user says 'Spring Boot structure', 'Spring architecture', 'Spring Boot clean arch', 'Spring layered', 'Spring hexagonal', 'Spring WebFlux', 'Spring Data', 'Spring Boot folder', or when building a Spring Boot application. This skill enforces: package-by-feature (not by layer), hexagonal architecture with ports and adapters, Spring stereotypes correctly applied (@Repository in infrastructure, not domain), constructor injection (no @Autowired on fields), and MVC vs WebFlux decision guide. Requires Spring Boot (pom.xml or build.gradle). Do NOT use for: Kotlin Multiplatform, non-Spring Java, or frontend Angular.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, spring-boot, java, phase-2]
---

# Spring Boot Architecture

## Purpose
Structure Spring Boot applications with package-by-feature and hexagonal architecture. Domain has zero Spring imports. Annotations only in infrastructure and presentation.

## Agent Protocol

### Trigger
Exact user phrases: "Spring Boot structure", "Spring architecture", "Spring Boot clean arch", "Spring layered", "Spring hexagonal", "Spring WebFlux", "Spring Data", "Spring Boot folder", "Spring project layout".

### Input Context
Before activating, verify:
- pom.xml or build.gradle has spring-boot-starter dependency.
- The feature or module being created is known.

### Output Artifact
No file output. Produces folder structure and code examples as text.

### Response Format
Folder structure:
```
src/main/java/com/project/{feature}/
  domain/
  application/
  infrastructure/
  presentation/
```

Code: Java class-level only. Package declaration omitted.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Package-by-feature (com.project.orders, com.project.users), not by layer (com.project.controllers, com.project.services).
- [ ] Domain package has zero Spring imports (@Entity is the sole exception, but prefer pure POJOs).
- [ ] Interfaces (ports) in domain/, implementations (adapters) in infrastructure/.
- [ ] Constructor injection used everywhere. No @Autowired on fields.
- [ ] @Transactional at application service level, not controller level.
- [ ] @ExceptionHandler in @ControllerAdvice for error mapping.

### Max Response Length
Folder structure: unlimited. Code: 20 lines per example.

## Workflow

### Step 1: Package by Feature
```
com.project/
  Application.java                        -- @SpringBootApplication
  config/
    SecurityConfig.java
    ObjectMapperConfig.java
    OpenApiConfig.java
  shared/
    BaseEntity.java
    DomainEvent.java
    PagedResult.java
  {feature}/
    domain/
      Order.java                          -- Domain entity (POJO)
      OrderStatus.java                    -- Value object / enum
      OrderRepository.java                -- Port (interface)
      OrderService.java                   -- Domain service
    application/
      in/
        PlaceOrderUseCase.java            -- Inbound port interface
        CancelOrderUseCase.java
      out/
        OrderEventPublisher.java          -- Outbound port interface
        PaymentService.java
      dto/
        PlaceOrderCommand.java
        OrderResponse.java
        PagedOrdersQuery.java
    infrastructure/
      persistence/
        OrderJpaEntity.java               -- @Entity (JPA concern)
        OrderJpaRepository.java            -- Spring Data interface
        OrderJpaRepositoryImpl.java        -- Implements OrderRepository
      messaging/
        OrderKafkaPublisher.java
      adapters/
        PaymentGatewayAdapter.java
    presentation/
      OrderController.java                -- @RestController
      OrderControllerAdvice.java           -- @ExceptionHandler
```

### Step 2: Hexagonal with Spring
```java
// PORT (domain layer -- no Spring annotation)
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    Order save(Order order);
    Page<Order> findAll(Pageable pageable);
    void delete(OrderId id);
}

// ADAPTER (infrastructure layer -- Spring-managed)
@Component
public class OrderJpaRepositoryImpl implements OrderRepository {
    private final SpringDataOrderRepository springRepo;
    private final OrderJpaMapper mapper;

    public OrderJpaRepositoryImpl(SpringDataOrderRepository springRepo, OrderJpaMapper mapper) {
        this.springRepo = springRepo;
        this.mapper = mapper;
    }

    @Override
    public Order save(Order order) {
        OrderJpaEntity entity = mapper.toJpaEntity(order);
        OrderJpaEntity saved = springRepo.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return springRepo.findById(id.getValue())
            .map(mapper::toDomain);
    }

    @Override
    public Page<Order> findAll(Pageable pageable) {
        return springRepo.findAll(pageable)
            .map(mapper::toDomain);
    }

    @Override
    public void delete(OrderId id) {
        springRepo.deleteById(id.getValue());
    }
}

// USE CASE (application layer)
@Service
public class PlaceOrderService implements PlaceOrderUseCase {
    private final OrderRepository orderRepo;
    private final OrderEventPublisher eventPublisher;

    public PlaceOrderService(OrderRepository orderRepo, OrderEventPublisher eventPublisher) {
        this.orderRepo = orderRepo;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public OrderId execute(PlaceOrderCommand command) {
        Order order = Order.create(command.customerId(), command.items());
        order = orderRepo.save(order);
        eventPublisher.publish(new OrderPlacedEvent(order.getId()));
        return order.getId();
    }
}

// CONTROLLER (presentation layer)
@RestController
@RequestMapping("/v1/orders")
public class OrderController {
    private final PlaceOrderUseCase placeOrder;
    private final CancelOrderUseCase cancelOrder;

    public OrderController(PlaceOrderUseCase placeOrder, CancelOrderUseCase cancelOrder) {
        this.placeOrder = placeOrder;
        this.cancelOrder = cancelOrder;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@RequestBody @Valid PlaceOrderCommand command) {
        OrderId id = placeOrder.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(new OrderResponse(id.getValue()));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        cancelOrder.execute(new OrderId(id));
        return ResponseEntity.noContent().build();
    }
}
```

### Step 3: MVC vs WebFlux Decision
| Use Spring MVC when | Use WebFlux when |
|---|---|
| JDBC/JPA/ORM-based persistence | High concurrency (>10K req/s) |
| Standard REST API | Streaming / Server-Sent Events |
| Team is more familiar with blocking | Long-lived connections |
| Existing MVC infrastructure | WebSocket-heavy application |
| Transactional database operations | Reactive database (R2DBC, MongoDB) |
| Mature library support needed | Backpressure-aware processing |

### Step 4: Configuration Management
```java
@Configuration
@ConfigurationProperties(prefix = "feature.order")
public class OrderConfig {
    private int maxItemsPerOrder = 50;
    private Duration paymentTimeout = Duration.ofSeconds(300);
    private List<String> supportedCurrencies = List.of("USD", "EUR");
    private boolean autoConfirmEnabled = true;

    public int getMaxItemsPerOrder() { return maxItemsPerOrder; }
    public void setMaxItemsPerOrder(int maxItemsPerOrder) { this.maxItemsPerOrder = maxItemsPerOrder; }
    public Duration getPaymentTimeout() { return paymentTimeout; }
    public void setPaymentTimeout(Duration paymentTimeout) { this.paymentTimeout = paymentTimeout; }
    public List<String> getSupportedCurrencies() { return supportedCurrencies; }
    public void setSupportedCurrencies(List<String> supportedCurrencies) { this.supportedCurrencies = supportedCurrencies; }
    public boolean isAutoConfirmEnabled() { return autoConfirmEnabled; }
    public void setAutoConfirmEnabled(boolean autoConfirmEnabled) { this.autoConfirmEnabled = autoConfirmEnabled; }
}

// application.yml
feature:
  order:
    max-items-per-order: 50
    payment-timeout-seconds: 300
    supported-currencies: USD, EUR
    auto-confirm-enabled: true

spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASS}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
```

### Step 5: Exception Mapping with ControllerAdvice
```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(OrderNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(OrderValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(OrderValidationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("VALIDATION", ex.getMessage(), ex.getErrors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodValidation(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("VALIDATION", "Input validation failed", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}

public record ErrorResponse(String code, String message, Object details) {
    public ErrorResponse(String code, String message) {
        this(code, message, null);
    }
}
```

### Step 6: Testing with Hexagonal Architecture
```java
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private PlaceOrderUseCase placeOrderUseCase;

    @Test
    void shouldCreateOrder() throws Exception {
        OrderId orderId = new OrderId(UUID.randomUUID());
        when(placeOrderUseCase.execute(any(PlaceOrderCommand.class)))
            .thenReturn(orderId);

        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"customerId":"cust-1","items":[{"productId":"prod-1","quantity":2,"unitPrice":19.99}]}
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(orderId.getValue().toString()));
    }

    @Test
    void shouldReturn400ForInvalidInput() throws Exception {
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"customerId":""}"""))
            .andExpect(status().isBadRequest());
    }
}
```

## Architecture Decision Trees

### Packaging Strategy
```
Feature count > 20?
  +-- Yes -> Can domain boundaries change?
  |   +-- Yes -> Package by feature (recommended)
  |   +-- No  -> Package by layer (only for tiny projects)
  +-- No  -> Package by feature (always default)
```

### Hexagonal vs Layered
```
Need to swap infrastructure (DB, messaging) independently?
  +-- Yes -> Hexagonal (ports/adapters). Domain has zero framework deps.
  +-- No  -> Layered is simpler. Accept package coupling.
```

### MVC vs WebFlux
```
Primary DB is relational (JPA/JDBC)?
  +-- Yes -> Use MVC. JPA is blocking, doesn't benefit from reactive.
  +-- No  -> Need >10K concurrent connections?
      +-- Yes -> WebFlux with R2DBC or MongoDB
      +-- No  -> MVC is simpler and better-supported
```

## Common Pitfalls

1. **@Autowired field injection**: Makes testing impossible without Spring context. Always use constructor injection.

2. **@Transactional at controller level**: Too coarse. One controller method may call multiple services. Keep @Transactional at application service.

3. **Domain entities with JPA annotations**: Pure domain objects should be POJOs. JPA entities are infrastructure concerns mapped separately.

4. **Circular dependencies between services**: Usually signals missing domain concept. Extract shared logic into a third service.

5. **Service/Repository interfaces in the wrong layer**: Domain defines the interface (port), infrastructure implements it (adapter).

6. **Using @Entity for domain entities**: Creates tight coupling to JPA. Map JPA entities to domain objects via a mapper.

7. **LazyInitializationException**: Accessing lazy-loaded relations outside a transaction. Use JOIN FETCH or entity graphs.

8. **Giant application service classes**: More than 10 methods per service suggests missing domain subdivisions.

9. **@MockBean overuse in tests**: Prefer @MockitoBean (Spring Boot 3.4+) or test slices for focused tests.

10. **Missing @Validated on @ConfigurationProperties classes**: Properties binding silently fails without proper validation.

## Best Practices

1. **Domain entities validated in constructors**. Use factory methods like `Order.create()` that enforce invariants.

2. **@ExceptionHandler in @ControllerAdvice maps domain exceptions to HTTP**. Controllers never have try-catch for domain logic.

3. **@Valid on controller request bodies for input validation**. Domain entities are validated in domain constructors.

4. **@Profile for environment-specific beans**. Dev, test, staging, production configurations are explicit.

5. **Spring Data JPA specifications for dynamic queries**. Avoid creating repository methods for every query combination.

6. **Audit fields (createdAt, updatedAt) in base entity**. Use @EnableJpaAuditing and @CreatedDate/@LastModifiedDate.

7. **Fluent builder pattern for complex domain objects**. Avoid telescoping constructors.

8. **Record types for DTOs**. Java 16+ records reduce boilerplate.

## Compared With

| Feature | Spring Boot MVC | Spring Boot WebFlux | Quarkus |
|---|---|---|---|
| Startup time | 2-4s | 2-4s | <0.3s |
| Memory footprint | ~150MB | ~150MB | ~50MB |
| GraalVM support | Limited | Limited | First-class |
| Reactive support | No | Yes | Yes (via RESTEasy Reactive) |
| JPA support | Full | Via Hibernate Reactive | Via Panache |
| Testing | @SpringBootTest | @WebFluxTest | @QuarkusTest |
| OpenAPI | springdoc-openapi | springdoc-openapi | SmallRye OpenAPI |

## Performance

- Startup time: 2-4 seconds (depends on classpath scanning). Use @ComponentScan lazy initialization to reduce.
- Memory: ~150MB base. Use -Xmx and -Xms flags to control.
- Connection pool: HikariCP with 10 connections default. Tune based on DB max connections.
- Response compression: Enable `server.compression.enabled=true` for text payloads.
- Caching: Spring Cache abstraction with Redis/Caffeine for repeatable queries.
- JPA batch size: `spring.jpa.properties.hibernate.jdbc.batch_size=20` for bulk operations.
- Read-only transactions: Mark queries as `@Transactional(readOnly=true)` for DB optimizations.

## Tooling

| Tool | Purpose |
|---|---|
| **Spring Initializr** | Project scaffolding |
| **springdoc-openapi** | OpenAPI 3 documentation generation |
| **MapStruct** | Entity-DTO mapping code generation |
| **Lombok** | Boilerplate reduction |
| **Testcontainers** | Integration testing with real databases |
| **ArchUnit** | Architecture rule enforcement |
| **Checkstyle / PMD** | Code quality |
| **JaCoCo** | Code coverage |
| **Gradle Enterprise / Maven** | Build tooling |
| **Spring Boot Actuator** | Health checks, metrics |

## Rules

- Domain package has ZERO Spring framework imports.
- Controller/Service/Repository stereotypes belong in presentation/application/infrastructure respectively.
- Constructor injection always. Never @Autowired on fields.
- @Transactional at application service level only. Never in controllers.
- @ExceptionHandler in @ControllerAdvice maps domain exceptions to HTTP.
- @Valid on controller request bodies for input validation.
- Domain entities validated in constructors/factory methods.
- Package-by-feature with hexagonal ports/adapters.
- @Entity classes are infrastructure, not domain.
- DTOs are Java records or plain classes, never reused across layers.
- @ConfigurationProperties for type-safe external config.
- Tests at controller level use MockMvc or WebTestClient.
- @SpringBootTest only for integration tests. Use test slices for unit tests.
- Profile-specific application-{profile}.yml files for environment separation.

## References
  - references/spring-boot-auto-configuration.md — Spring Boot Auto-Configuration
  - references/spring-boot-testing-strategies.md — Spring Boot Testing Strategies
  - references/layered-architecture.md — Spring Boot Layered Architecture
  - references/reactive-webflux.md — Spring WebFlux Patterns
  - references/spring-boot-data-access.md — Spring Boot Data Access
  - references/spring-boot-observability.md — Spring Boot Observability
  - references/spring-boot-security.md — Spring Boot Security
  - references/spring-boot-testing.md — Spring Boot Testing

## Handoff
No artifact produced.
Next skill: backend-testing — test Spring Boot.
Carry forward: package structure, DI configuration, persistence strategy (JPA/R2DBC).
## Implementation Patterns

### Factory Pattern for Module Creation
`
function createModule<T>(config: ModuleConfig): T {
  const dependencies = initializeDependencies(config);
  const module = new Module(dependencies);
  module.hooks.onInit();
  return module as T;
}
`

### Builder Pattern for Complex Configuration
`
class ConfigBuilder {
  private config: AppConfig = new AppConfig();
  withDatabase(url: string): ConfigBuilder { ... }
  withCache(ttl: number): ConfigBuilder { ... }
  withLogging(level: string): ConfigBuilder { ... }
  build(): AppConfig { return this.config; }
}
`

## Production Considerations

### Deployment Checklist
- [ ] Production build with optimizations enabled
- [ ] Environment variables configured per environment
- [ ] Health check endpoint responds correctly
- [ ] Error tracking and monitoring integrated
- [ ] Logging level configured (not debug in production)
- [ ] Resource limits configured
- [ ] Database migrations applied
- [ ] Static assets built and served from CDN or cache
- [ ] Feature flags toggled appropriately
- [ ] Rollback plan documented and tested

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% | Critical | Rollback or fix |
| p95 latency | > 500ms | Warning | Profile and optimize |
| Uptime | < 99.9% | Critical | Investigate infrastructure |
| Memory usage | > 80% | Warning | Check for leaks |
| CPU usage | > 80% | Warning | Scale up or optimize |

## Rules
- Prefer composition over inheritance
- Favor immutable data structures
- Use dependency injection for testability
- Keep functions pure when possible — no side effects
- Fail fast with clear error messages
- Don't repeat yourself (DRY) — extract shared logic
- Keep it simple (KISS) — avoid unnecessary complexity
- You aren't gonna need it (YAGNI) — build what's required
- Separate concerns — single responsibility per module
- Code to interfaces, not implementations
- Write self-documenting code — clear names over comments
- Prefer standard library over third-party dependencies
- Handle errors explicitly — no silent failures
- Validate inputs at boundaries
- Log at appropriate levels (debug, info, warn, error)