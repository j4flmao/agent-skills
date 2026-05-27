---
name: spring-boot-patterns
description: >
  Use this skill when implementing Spring Boot patterns — dependency injection, AOP, repository patterns, security configuration, testing patterns, transaction management. This skill enforces: constructor injection (no @Autowired on fields), @Transactional at service layer, AOP for cross-cutting concerns, repository abstraction with Spring Data, slice tests with TestContainers. Do NOT use for: Spring Boot project structure (see architecture skill), non-Spring Java, frontend.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, spring-boot, patterns, phase-10]
---

# Spring Boot Patterns

## Purpose
Implement production-grade Spring Boot patterns — dependency injection, aspect-oriented programming, data access, security, transaction management, and testing.

## Agent Protocol

### Trigger
User request includes: `Spring Boot patterns`, `Spring design patterns`, `dependency injection Spring`, `AOP`, `Spring Data`, `Spring Security`, `transaction management`, `Spring Testing`, `@Transactional`, `@Autowired`, `TestContainers`, `WireMock`, `@DataJpaTest`, `@WebMvcTest`.

### Input Context
- Spring Boot version (3.x preferred)
- Data access (Spring Data JPA, JDBC, R2DBC)
- Security (Spring Security, OAuth2, JWT)
- Testing framework (JUnit 5, Mockito, TestContainers)
- Architecture (package-by-feature, hexagonal)

### Output Artifact
Pattern implementations with code examples, configuration snippets, testing strategies.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- DI pattern with constructor injection and qualifiers
- AOP aspect for logging/performance/timing
- Repository pattern with Spring Data
- Security chain with JWT or OAuth2
- Transaction propagation and isolation configured
- Test slices for unit, integration, and E2E

### Max Response Length
4096 tokens

## Workflow

### Step 1: Constructor Injection Pattern

```java
// CORRECT: Constructor injection with required dependencies
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final InventoryClient inventoryClient;
    private final EventPublisher eventPublisher;

    public OrderService(
        OrderRepository orderRepository,
        @Qualifier("cachingClient") InventoryClient inventoryClient,
        EventPublisher eventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.inventoryClient = inventoryClient;
        this.eventPublisher = eventPublisher;
    }
}

// WRONG: Field injection — never do this
@Service
public class OrderService {
    @Autowired private OrderRepository orderRepository;  // NO
    @Autowired private InventoryClient inventoryClient;  // NO
}

// WRONG: Setter injection — avoid
@Service
public class OrderService {
    private OrderRepository orderRepository;

    @Autowired  // NO — use constructor
    public void setOrderRepository(OrderRepository repo) {
        this.orderRepository = repo;
    }
}
```

### Step 2: Interface Segregation for Dependencies

```java
// Define narrow interfaces — one responsibility each
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    Page<Order> findByCustomerId(String customerId, Pageable pageable);
    Order save(Order order);
    void deleteById(OrderId id);
}

public interface InventoryClient {
    boolean checkAvailability(String sku, int quantity);
    int reserveStock(String sku, int quantity);
    void releaseStock(String sku, int quantity);
}

public interface EventPublisher {
    void publish(DomainEvent event);
}

// Implementation with qualifier
@Component
@Qualifier("cachingClient")
public class CachingInventoryClient implements InventoryClient {
    private final InventoryClient delegate;
    private final CacheManager cache;

    public CachingInventoryClient(InventoryClient delegate, CacheManager cache) {
        this.delegate = delegate;
        this.cache = cache;
    }

    @Override
    public boolean checkAvailability(String sku, int quantity) {
        return cache.get(sku, () -> delegate.checkAvailability(sku, quantity));
    }
}
```

### Step 3: AOP for Cross-Cutting Concerns

```java
@Aspect
@Component
public class LoggingAspect {
    private static final Logger log = LoggerFactory.getLogger(LoggingAspect.class);

    @Around("execution(* com.project..*(..)) && @annotation(LogExecution)")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.nanoTime();
        Object result = joinPoint.proceed();
        long duration = System.nanoTime() - start;
        log.info("{} executed in {}ms",
            joinPoint.getSignature().toShortString(),
            TimeUnit.NANOSECONDS.toMillis(duration));
        return result;
    }

    @AfterThrowing(
        pointcut = "execution(* com.project.*.application.*.*(..))",
        throwing = "ex"
    )
    public void logApplicationException(JoinPoint joinPoint, RuntimeException ex) {
        log.error("Application exception in {}: {}",
            joinPoint.getSignature().toShortString(), ex.getMessage());
    }
}

// Custom annotation
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface LogExecution {}
```

### Step 4: Repository Pattern

```java
// Domain port (in domain package — zero Spring imports)
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    Order save(Order order);
    void delete(OrderId id);
}

// Spring Data JPA adapter (in infrastructure)
@Component
public class SpringDataOrderRepository implements OrderRepository {
    private final JpaOrderRepository jpaRepo;

    public SpringDataOrderRepository(JpaOrderRepository jpaRepo) {
        this.jpaRepo = jpaRepo;
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return jpaRepo.findById(id.getValue())
            .map(OrderJpaEntity::toDomain);
    }

    @Override
    @Transactional
    public Order save(Order order) {
        OrderJpaEntity entity = OrderJpaEntity.fromDomain(order);
        return jpaRepo.save(entity).toDomain();
    }
}

// Spring Data interface (internal to infrastructure)
interface JpaOrderRepository extends JpaRepository<OrderJpaEntity, String> {
    Page<OrderJpaEntity> findByCustomerId(String customerId, Pageable pageable);
    Optional<OrderJpaEntity> findByOrderNumber(String orderNumber);
}
```

### Step 5: Transaction Management

```java
@Service
public class PaymentService {
    private final PaymentGateway gateway;
    private final PaymentRepository paymentRepo;
    private final OrderRepository orderRepo;

    public PaymentService(
        PaymentGateway gateway,
        PaymentRepository paymentRepo,
        OrderRepository orderRepo
    ) {
        this.gateway = gateway;
        this.paymentRepo = paymentRepo;
        this.orderRepo = orderRepo;
    }

    @Transactional(rollbackFor = PaymentException.class)
    public PaymentResult processPayment(ProcessPaymentCommand command) {
        // 1. Validate order
        Order order = orderRepo.findById(command.orderId())
            .orElseThrow(() -> new OrderNotFoundException(command.orderId()));

        // 2. Charge payment gateway
        PaymentCharge charge = gateway.charge(
            command.amount(),
            command.paymentToken()
        );

        // 3. Save payment record
        Payment payment = Payment.create(command.orderId(), charge.transactionId(), command.amount());
        paymentRepo.save(payment);

        // 4. Update order status
        order.markAsPaid();
        orderRepo.save(order);

        return new PaymentResult(payment.getId(), charge.transactionId());
    }
}
```

### Step 6: Security Configuration

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    public SecurityConfig(JwtTokenProvider tokenProvider, UserDetailsService userDetailsService) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/actuator/health").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(
                new JwtAuthenticationFilter(tokenProvider, userDetailsService),
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### Step 7: Event-Driven Pattern

```java
// Domain event
public record OrderSubmittedEvent(OrderId orderId, String customerId, Money total) implements DomainEvent {}

// Publisher
@Component
public class SpringEventPublisher implements EventPublisher {
    private final ApplicationEventPublisher publisher;

    public SpringEventPublisher(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    @Override
    public void publish(DomainEvent event) {
        publisher.publishEvent(event);
    }
}

// Listener
@Component
public class OrderSubmittedHandler {
    private final EmailService emailService;
    private final InventoryService inventoryService;

    public OrderSubmittedHandler(EmailService emailService, InventoryService inventoryService) {
        this.emailService = emailService;
        this.inventoryService = inventoryService;
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleOrderSubmitted(OrderSubmittedEvent event) {
        emailService.sendOrderConfirmation(event.orderId(), event.customerId());
        inventoryService.reserveItems(event.orderId());
    }
}

// Async event processing
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean
    public Executor asyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}

@Component
public class AsyncOrderHandler {
    @EventListener
    @Async
    public void handle(OrderSubmittedEvent event) {
        // Long-running task runs on thread pool
    }
}
```

## Rules
- Constructor injection always. Never @Autowired on fields.
- @Transactional at application service level. Never in controllers.
- Repository interface in domain, implementation in infrastructure.
- AOP for cross-cutting (logging, metrics, auditing) only — never for business logic.
- Security chain defined in single SecurityConfig class. No scattered config.
- Events for loose coupling between aggregates/bounded contexts.
- Slice tests for focused integration: @DataJpaTest, @WebMvcTest, @JsonTest.
- TestContainers for database integration tests, WireMock for HTTP stubs.

## References
  - references/spring-boot-data-access.md — Spring Boot Data Access Reference
  - references/spring-boot-deployment.md — Spring Boot Deployment
  - references/spring-boot-observability.md — Spring Boot Observability
  - references/spring-boot-security.md — Spring Boot Security Reference
  - references/spring-patterns.md — Spring Patterns
  - references/spring-testing.md — Spring Testing
## Handoff
Hand off to `backend/spring-boot/architecture/SKILL.md` for project structure or `backend/universal/testing/SKILL.md` for broader testing patterns.
