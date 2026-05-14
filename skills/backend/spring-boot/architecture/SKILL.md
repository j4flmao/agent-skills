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
  shared/
    BaseEntity.java
    DomainEvent.java
  {feature}/
    domain/
      Order.java                          -- Domain entity (POJO)
      OrderStatus.java                    -- Value object / enum
      OrderRepository.java                -- Port (interface)
      OrderService.java                   -- Domain service
    application/
      in/
        PlaceOrderUseCase.java            -- Inbound port interface
      out/
        OrderEventPublisher.java          -- Outbound port interface
      dto/
        PlaceOrderCommand.java
        OrderResponse.java
    infrastructure/
      persistence/
        OrderJpaEntity.java               -- @Entity (JPA concern)
        OrderJpaRepositoryImpl.java        -- Implements OrderRepository
      messaging/
        OrderKafkaPublisher.java
    presentation/
      OrderController.java                -- @RestController
      OrderControllerAdvice.java           -- @ExceptionHandler
```

### Step 2: Hexagonal with Spring
```java
// PORT (domain layer — no Spring annotation)
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    Order save(Order order);
}

// ADAPTER (infrastructure layer — Spring-managed)
@Component
public class OrderJpaRepositoryImpl implements OrderRepository {
    private final SpringDataOrderRepository springRepo;

    public OrderJpaRepositoryImpl(SpringDataOrderRepository springRepo) {
        this.springRepo = springRepo;
    }

    @Override
    public Order save(Order order) {
        OrderJpaEntity entity = OrderJpaEntity.fromDomain(order);
        OrderJpaEntity saved = springRepo.save(entity);
        return saved.toDomain();
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return springRepo.findById(id.getValue())
            .map(OrderJpaEntity::toDomain);
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

    public OrderController(PlaceOrderUseCase placeOrder) {
        this.placeOrder = placeOrder;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@RequestBody @Valid PlaceOrderCommand command) {
        OrderId id = placeOrder.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(new OrderResponse(id.getValue()));
    }
}
```

### Step 3: MVC vs WebFlux Decision
| Use Spring MVC when | Use WebFlux when |
|--------------------|------------------|
| JDBC/JPA/ORM-based persistence | High concurrency (>10K req/s) |
| Standard REST API | Streaming / Server-Sent Events |
| Team is more familiar with blocking | Long-lived connections |
| Existing MVC infrastructure | WebSocket-heavy application |

### Step 4: Configuration Management
```java
@Configuration
@ConfigurationProperties(prefix = "feature.order")
public class OrderConfig {
    private int maxItemsPerOrder = 50;
    private Duration paymentTimeout = Duration.ofSeconds(300);
    // getters and setters
}

// application.yml
feature:
  order:
    max-items-per-order: 50
    payment-timeout-seconds: 300
```

## Rules
- Domain package has ZERO Spring framework imports. A @Entity annotation on a JPA entity is acceptable but the pure domain entity should be annotation-free.
- Controller/Service/Repository stereotypes belong in presentation/application/infrastructure respectively. Not in domain.
- Constructor injection always. Never @Autowired on fields. Never @InjectMocks in tests.
- @Transactional at the application service level only. Never in controllers.
- @ExceptionHandler in @ControllerAdvice maps domain exceptions to HTTP. Controllers never have try-catch for domain logic.
- @Valid on controller request bodies for input validation. Domain entities are validated in domain constructors/factory methods.

## References
- `references/layered-architecture.md` — hexagonal architecture, constructor injection, dependency rule
- `references/reactive-webflux.md` — WebFlux controllers, R2DBC, reactive error handling

## Handoff
No artifact produced.
Next skill: backend-testing — test Spring Boot.
Carry forward: package structure, DI configuration, persistence strategy (JPA/R2DBC).
