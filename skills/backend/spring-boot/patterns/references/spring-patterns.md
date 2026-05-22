# Spring Patterns

## Dependency Injection

### Constructor Injection (Always)

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final InventoryClient inventoryClient;
    private final EventPublisher eventPublisher;

    // Single constructor — Spring auto-wires
    public OrderService(
        OrderRepository orderRepository,
        InventoryClient inventoryClient,
        EventPublisher eventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.inventoryClient = inventoryClient;
        this.eventPublisher = eventPublisher;
    }
}
```

### Qualifiers for Multiple Implementations

```java
// Interfaces with multiple implementations
public interface PaymentGateway {
    PaymentResult charge(ChargeRequest request);
}

@Component
@Qualifier("stripe")
public class StripePaymentGateway implements PaymentGateway { ... }

@Component
@Qualifier("paypal")
public class PaypalPaymentGateway implements PaymentGateway { ... }

// Injection with qualifier
@Service
public class CheckoutService {
    private final PaymentGateway primaryGateway;
    private final PaymentGateway fallbackGateway;

    public CheckoutService(
        @Qualifier("stripe") PaymentGateway primary,
        @Qualifier("paypal") PaymentGateway fallback
    ) {
        this.primaryGateway = primary;
        this.fallbackGateway = fallback;
    }
}
```

### @Primary for Default Bean

```java
@Component
@Primary
public class DefaultPaymentGateway implements PaymentGateway { ... }

@Component
public class BackupPaymentGateway implements PaymentGateway { ... }

// Injects DefaultPaymentGateway when no qualifier specified
@Service
public class CheckoutService {
    private final PaymentGateway gateway;  // injects @Primary

    public CheckoutService(PaymentGateway gateway) {
        this.gateway = gateway;
    }
}
```

### @ConditionalOnProperty

```java
@Configuration
public class PaymentConfig {
    @Bean
    @ConditionalOnProperty(name = "payment.gateway", havingValue = "stripe", matchIfMissing = true)
    public PaymentGateway stripeGateway() { return new StripeGateway(); }

    @Bean
    @ConditionalOnProperty(name = "payment.gateway", havingValue = "paypal")
    public PaymentGateway paypalGateway() { return new PaypalGateway(); }
}
```

### ObjectProvider for Optional/Lazy Dependencies

```java
@Service
public class OrderService {
    private final ObjectProvider<AnalyticsService> analyticsProvider;

    public OrderService(ObjectProvider<AnalyticsService> analyticsProvider) {
        this.analyticsProvider = analyticsProvider;
    }

    public void processOrder(Order order) {
        // AnalyticsService created only if called
        AnalyticsService analytics = analyticsProvider.getIfAvailable();
        if (analytics != null) {
            analytics.trackOrder(order);
        }
    }
}
```

## AOP (Aspect-Oriented Programming)

### Enable AOP

```java
@Configuration
@EnableAspectJAutoProxy
public class AopConfig {}
```

### Pointcut Expressions

```java
// Method execution
@Pointcut("execution(* com.project..*(..))")

// Within package
@Pointcut("within(com.project.order..*)")

// Annotation presence
@Pointcut("@annotation(com.project.common.LogExecution)")

// Bean name
@Pointcut("bean(*Service)")

// Combined
@Pointcut("execution(* com.project..*(..)) && @annotation(LogExecution)")
```

### Common Aspects

```java
@Aspect
@Component
public class PerformanceAspect {
    private final MeterRegistry meterRegistry;

    public PerformanceAspect(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Around("@annotation(Timed)")
    public Object measureTime(ProceedingJoinPoint pjp) throws Throwable {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            return pjp.proceed();
        } finally {
            sample.stop(Timer.builder("method.timed")
                .tag("class", pjp.getTarget().getClass().getSimpleName())
                .tag("method", pjp.getSignature().getName())
                .register(meterRegistry));
        }
    }
}

@Aspect
@Component
public class RetryAspect {
    private static final Logger log = LoggerFactory.getLogger(RetryAspect.class);

    @Around("@annotation(retryable)")
    public Object retry(ProceedingJoinPoint pjp, Retryable retryable) throws Throwable {
        int maxAttempts = retryable.maxAttempts();
        Throwable lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return pjp.proceed();
            } catch (Exception ex) {
                lastException = ex;
                log.warn("Attempt {}/{} failed: {}", attempt, maxAttempts, ex.getMessage());
                if (attempt < maxAttempts) {
                    Thread.sleep(retryable.backoffMs());
                }
            }
        }
        throw lastException;
    }
}
```

## Transaction Management

### Propagation Levels

```java
// Default — join current or create new
@Transactional(propagation = Propagation.REQUIRED)

// Always create new transaction
@Transactional(propagation = Propagation.REQUIRES_NEW)

// Execute non-transactionally
@Transactional(propagation = Propagation.NOT_SUPPORTED)

// Fail if no transaction exists
@Transactional(propagation = Propagation.MANDATORY)

// Execute nested in savepoint
@Transactional(propagation = Propagation.NESTED)
```

### Isolation Levels

```java
// Default (usually READ_COMMITTED)
@Transactional(isolation = Isolation.DEFAULT)

// Prevent dirty reads
@Transactional(isolation = Isolation.READ_COMMITTED)

// Prevent dirty + non-repeatable reads
@Transactional(isolation = Isolation.REPEATABLE_READ)

// Prevent all concurrency issues
@Transactional(isolation = Isolation.SERIALIZABLE)

// Allow dirty reads
@Transactional(isolation = Isolation.READ_UNCOMMITTED)
```

### Transaction Template (Programmatic)

```java
@Service
public class OrderService {
    private final TransactionTemplate transactionTemplate;
    private final OrderRepository orderRepository;

    public OrderService(
        TransactionTemplate transactionTemplate,
        OrderRepository orderRepository
    ) {
        this.transactionTemplate = transactionTemplate;
        this.orderRepository = orderRepository;
    }

    public Order createOrder(CreateOrderCommand command) {
        return transactionTemplate.execute(status -> {
            try {
                Order order = Order.create(command);
                orderRepository.save(order);
                return order;
            } catch (Exception e) {
                status.setRollbackOnly();
                throw new OrderCreationException("Failed to create order", e);
            }
        });
    }
}
```

### Read-Only Transactions

```java
@Service
public class ReportService {
    private final OrderRepository orderRepository;

    // Hibernate skips dirty checking — improves read performance
    @Transactional(readOnly = true)
    public Report generateDailyReport(LocalDate date) {
        List<Order> orders = orderRepository.findByDate(date);
        return Report.aggregate(orders);
    }
}
```

### Rollback Rules

```java
// Rollback on checked exception
@Transactional(rollbackFor = {BusinessException.class, DataIntegrityViolationException.class})

// No rollback for specific exceptions
@Transactional(noRollbackFor = {OptimisticLockException.class})

// Rollback on any exception (default is RuntimeException and Error)
@Transactional(rollbackFor = Exception.class)
```

## Event-Driven Patterns

### Domain Events

```java
// Event record
public record OrderSubmittedEvent(
    OrderId orderId,
    String customerId,
    Money total,
    Instant occurredAt
) implements DomainEvent {}

// Publishing
@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;

    @Transactional
    public OrderId submitOrder(SubmitOrderCommand command) {
        Order order = Order.create(command);
        orderRepository.save(order);
        publisher.publishEvent(new OrderSubmittedEvent(
            order.getId(),
            order.getCustomerId(),
            order.getTotal(),
            Instant.now()
        ));
        return order.getId();
    }
}
```

### Transaction-Bound Events

```java
@Component
public class OrderSubmittedHandler {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAfterCommit(OrderSubmittedEvent event) {
        // Only fires if transaction committed successfully
        emailService.sendConfirmation(event.orderId(), event.customerId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void handleAfterRollback(OrderSubmittedEvent event) {
        log.warn("Order {} submission rolled back", event.orderId());
    }
}
```

## Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .disableCachingNullValues();

        return RedisCacheManager.builder(redisConnectionFactory())
            .cacheDefaults(config)
            .withCacheConfiguration("products",
                RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofMinutes(5)))
            .withCacheConfiguration("users",
                RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofHours(1)))
            .build();
    }
}

@Service
public class ProductService {
    @Cacheable(value = "products", key = "#id")
    public Product getProduct(String id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    @CacheEvict(value = "products", key = "#product.id")
    public void updateProduct(Product product) {
        productRepository.save(product);
    }

    @CacheEvict(value = "products", allEntries = true)
    public void refreshCache() {}
}
```

## Validation

```java
// DTO validation
public record CreateOrderRequest(
    @NotBlank String customerId,
    @NotEmpty List<@Valid OrderItemRequest> items,
    @NotNull @Positive BigDecimal total
) {}

// Custom validator
@Component
public class OrderValidator implements ConstraintValidator<ValidOrder, CreateOrderRequest> {
    @Override
    public boolean isValid(CreateOrderRequest request, ConstraintValidatorContext context) {
        if (request.items().isEmpty()) return false;
        BigDecimal sum = request.items().stream()
            .map(i -> i.price().multiply(BigDecimal.valueOf(i.quantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.compareTo(request.total()) == 0;
    }
}

// Usage in controller
@RestController
public class OrderController {
    @PostMapping
    public ResponseEntity<OrderResponse> create(
        @Valid @RequestBody CreateOrderRequest request
    ) {
        return ResponseEntity.ok(orderService.create(request));
    }
}
```
