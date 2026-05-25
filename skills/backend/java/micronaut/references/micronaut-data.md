# Micronaut Data

## Micronaut Data vs Other ORMs

| Feature | Micronaut Data | Spring Data | Hibernate |
|---------|---------------|-------------|-----------|
| Compile-time processing | ✅ Yes | ❌ Runtime | ❌ Runtime |
| Reactive support | ✅ Native | ✅ Separate | ❌ |
| Query performance | Fast (AOT) | Reflective | Reflective |
| Repository pattern | ✅ Yes | ✅ Yes | ❌ Manual |
| DTO projections | ✅ Built-in | ⚠️ Complex | ⚠️ Complex |

## Repository Setup

```java
// build.gradle
annotationProcessor("io.micronaut.data:micronaut-data-processor")
implementation("io.micronaut.data:micronaut-data-hibernate-jpa")
implementation("io.micronaut.sql:micronaut-jdbc-hikari")
```

```yaml
# application.yml
datasources:
  default:
    url: ${JDBC_URL:`jdbc:postgresql://localhost:5432/orders`}
    driverClassName: org.postgresql.Driver
    username: ${DB_USER:postgres}
    password: ${DB_PASS:postgres}
    dialect: POSTGRES
jpa:
  default:
    properties:
      hibernate:
        hbm2ddl:
          auto: update
        show_sql: false
```

## Repository Definitions

```java
// JPA repository — compile-time implementation
@JpaRepository
public interface OrderRepository extends CrudRepository<Order, Long> {
    Optional<Order> findById(Long id);

    // Derived queries — method name analyzed at compile time
    List<Order> findByCustomerId(String customerId);

    List<Order> findByStatusAndCustomerId(String status, String customerId);

    Page<Order> findByCustomerIdOrderByCreatedAtDesc(
        String customerId, Pageable pageable);

    // Custom query
    @Query("SELECT o FROM Order o WHERE o.total > :min AND o.status = :status")
    List<Order> findHighValueOrders(@NamedParameter("min") BigDecimal min,
                                    @NamedParameter("status") String status);

    long countByCustomerId(String customerId);

    boolean existsByOrderNumber(String orderNumber);

    void deleteByCustomerId(String customerId);
}
```

## DTO Projections

```java
// Interface projection — no runtime overhead
public interface OrderSummary {
    Long getId();
    String getCustomerId();
    String getStatus();
    BigDecimal getTotalAmount();
}

// Using projection in repository
@JpaRepository
public interface OrderRepository extends CrudRepository<Order, Long> {
    List<OrderSummary> findByCustomerId(String customerId);

    @Query("SELECT o.id as id, o.customerId as customerId, o.status as status, o.totalAmount as totalAmount FROM Order o")
    List<OrderSummary> listAllSummaries();
}
```

## Entity Definition

```java
import jakarta.persistence.*;
import io.micronaut.data.annotation.DateCreated;
import io.micronaut.data.annotation.DateUpdated;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @NotBlank
    @Column(name = "customer_id")
    private String customerId;

    @NotBlank
    private String status;

    @DecimalMin("0.01")
    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @DateCreated
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @DateUpdated
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Order() {}

    public Order(String customerId, String status) {
        this.customerId = customerId;
        this.status = status;
    }

    // getters and setters
}
```

## Reactive Repository

```java
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.data.r2dbc.annotation.R2dbcRepository;
import io.micronaut.data.repository.reactive.ReactorCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@R2dbcRepository(dialect = Dialect.POSTGRES)
public interface ReactiveOrderRepository extends ReactorCrudRepository<Order, Long> {
    Flux<Order> findByCustomerId(String customerId);
    Mono<Long> countByStatus(String status);
}
```

## Batch Operations

```java
@Repository
public abstract class OrderBatchRepository implements CrudRepository<Order, Long> {
    // Batch insert — compiled to single JDBC batch
    public abstract <S extends Order> Iterable<S> saveAll(Iterable<S> entities);

    // Batch delete
    public abstract void deleteAll(Iterable<? extends Long> ids);

    // Batch update via custom query
    @Query("UPDATE Order SET status = :status WHERE id IN (:ids)")
    public abstract int updateStatusBatch(@NamedParameter("status") String status,
                                          @NamedParameter("ids") List<Long> ids);
}
```

## Transaction Management

```java
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

@Singleton
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) {
        this.repo = repo;
    }

    @Transactional(rollbackOn = InsufficientStockException.class)
    public Order createOrder(CreateOrderRequest req) {
        var order = new Order(req.customerId(), "PENDING");
        order = repo.save(order);
        inventoryService.reserveItems(order.getId(), req.items());
        return order;
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void processPayment(Long orderId) {
        // runs in separate transaction
    }
}
```
