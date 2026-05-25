# Spring Boot Data Access

## JPA vs JDBC vs R2DBC

| Approach | Sync/Async | When |
|----------|-----------|------|
| **Spring Data JPA** | Blocking (JDBC) | ORM mapping, CRUD heavy, team knows JPA |
| **Spring JDBC** | Blocking | Simple queries, no ORM overhead |
| **R2DBC** | Reactive (WebFlux) | High concurrency, streaming |
| **JOOQ** | Blocking | Type-safe SQL, complex queries |

## Spring Data JPA

```java
// Entity
@Entity
@Table(name = "orders")
public class OrderEntity {
    @Id
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private String customerId;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = ALL, orphanRemoval = true)
    private List<OrderItemEntity> items;

    @Version
    private Long version; // optimistic locking
}

// Repository
public interface OrderJpaRepository extends JpaRepository<OrderEntity, UUID> {
    Page<OrderEntity> findByCustomerId(String customerId, Pageable pageable);
    List<OrderEntity> findByStatusAndCreatedAtBefore(OrderStatus status, LocalDateTime before);

    @Query("SELECT o FROM OrderEntity o WHERE o.total > :minTotal")
    List<OrderEntity> findHighValueOrders(@Param("minTotal") BigDecimal minTotal);
}
```

## R2DBC (Reactive)

```java
// Entity (immutable)
@Table("orders")
public record OrderEntity(
    @Id UUID id,
    String customerId,
    OrderStatus status,
    BigDecimal total,
    LocalDateTime createdAt
) {}

// Repository
public interface OrderR2dbcRepository extends ReactiveCrudRepository<OrderEntity, UUID> {
    Flux<OrderEntity> findByCustomerId(String customerId);
    Mono<Long> countByStatus(OrderStatus status);
}

// Usage in service
@Service
public class OrderService {
    private final OrderR2dbcRepository repo;

    public Flux<OrderResponse> findByCustomer(String customerId) {
        return repo.findByCustomerId(customerId)
            .map(entity -> new OrderResponse(entity.id(), entity.customerId(), entity.status()));
    }
}
```

## Transaction Management

```java
// Read-only optimization
@Transactional(readOnly = true)
public Optional<Order> findById(UUID id) {
    return repo.findById(id).map(OrderEntity::toDomain);
}

// Custom isolation
@Transactional(isolation = Isolation.REPEATABLE_READ)
public Order createOrder(CreateOrderCommand cmd) {
    return repo.save(OrderEntity.fromCommand(cmd)).toDomain();
}

// Manual transaction
@Transactional
public void transfer(String fromId, String toId, BigDecimal amount) {
    Account from = accountRepo.findById(fromId).orElseThrow();
    Account to = accountRepo.findById(toId).orElseThrow();
    from.withdraw(amount);
    to.deposit(amount);
}
```

## Connection Pooling (HikariCP)

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000
      max-lifetime: 1200000
```

## Batch Operations

```java
// Batch insert
@Transactional
public void bulkCreate(List<Order> orders) {
    for (int i = 0; i < orders.size(); i++) {
        entityManager.persist(OrderEntity.fromDomain(orders.get(i)));
        if (i % 50 == 0) {
            entityManager.flush();
            entityManager.clear();
        }
    }
}
```

## Locking

```java
// Optimistic — @Version field
// Pessimistic
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT o FROM OrderEntity o WHERE o.id = :id")
Optional<OrderEntity> findByIdForUpdate(@Param("id") UUID id);
```
