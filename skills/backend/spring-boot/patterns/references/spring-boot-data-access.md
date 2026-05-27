# Spring Boot Data Access Reference

## Repository Patterns

```java
@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    
    @Query("SELECT o FROM Order o WHERE o.customerId = :customerId ORDER BY o.createdAt DESC")
    List<Order> findByCustomerId(@Param("customerId") String customerId, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.status = :status")
    Page<Order> findByStatus(@Param("status") OrderStatus status, Pageable pageable);
    
    @Modifying
    @Query("UPDATE Order o SET o.status = :status WHERE o.id = :id")
    int updateStatus(@Param("id") UUID id, @Param("status") OrderStatus status);
    
    long countByStatus(OrderStatus status);
}
```

## Custom Repository Implementation

```java
public interface OrderRepositoryCustom {
    List<Order> searchOrders(String query, Pageable pageable);
}

@Repository
public class OrderRepositoryImpl implements OrderRepositoryCustom {
    
    @PersistenceContext
    private EntityManager em;

    @Override
    public List<Order> searchOrders(String query, Pageable pageable) {
        var cb = em.getCriteriaBuilder();
        var cq = cb.createQuery(Order.class);
        var root = cq.from(Order.class);
        
        var predicate = cb.or(
            cb.like(root.get("customerId"), "%" + query + "%"),
            cb.like(root.get("notes"), "%" + query + "%")
        );
        
        cq.where(predicate);
        cq.orderBy(cb.desc(root.get("createdAt")));
        
        return em.createQuery(cq)
            .setFirstResult((int) pageable.getOffset())
            .setMaxResults(pageable.getPageSize())
            .getResultList();
    }
}
```

## Service Layer with Transactions

```java
@Service
@Transactional(readOnly = true)
public class OrderService {
    
    private final OrderRepository repository;
    private final InventoryClient inventoryClient;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        Order order = new Order();
        order.setCustomerId(request.customerId());
        order.setStatus(OrderStatus.PENDING);
        
        List<OrderItem> items = request.items().stream()
            .map(this::toOrderItem)
            .toList();
        order.setItems(items);
        
        // Validate inventory before saving
        for (OrderItem item : items) {
            if (!inventoryClient.checkAvailability(item.getSku(), item.getQuantity())) {
                throw new InsufficientInventoryException(item.getSku());
            }
        }
        
        Order saved = repository.save(order);
        
        // Publish event after successful save
        eventPublisher.publishEvent(new OrderCreatedEvent(saved));
        
        return saved;
    }
    
    @Transactional
    public void cancelOrder(UUID id) {
        Order order = repository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
        order.setStatus(OrderStatus.CANCELLED);
        eventPublisher.publishEvent(new OrderCancelledEvent(order));
    }
}
```

## Read-Only Transactions

```java
@Transactional(readOnly = true)
public OrderDto getOrderSummary(UUID id) {
    Order order = repository.findById(id)
        .orElseThrow(() -> new OrderNotFoundException(id));
    return OrderDto.from(order);
}

@Transactional(readOnly = true)
public Page<OrderDto> listOrders(Pageable pageable) {
    return repository.findAll(pageable).map(OrderDto::from);
}
```

## Entity Design

```java
@Entity
@Table(name = "orders")
@EntityListeners(AuditingEntityListener.class)
public class Order {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private String customerId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "order_id")
    private List<OrderItem> items = new ArrayList<>();
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    @Version
    private Long version;
}
```

## Specification Pattern for Queries

```java
public class OrderSpecifications {
    
    public static Specification<Order> byCustomerId(String customerId) {
        return (root, query, cb) -> 
            cb.equal(root.get("customerId"), customerId);
    }
    
    public static Specification<Order> byStatus(OrderStatus status) {
        return (root, query, cb) -> 
            cb.equal(root.get("status"), status);
    }
    
    public static Specification<Order> createdAfter(LocalDateTime date) {
        return (root, query, cb) -> 
            cb.greaterThan(root.get("createdAt"), date);
    }
}

// Usage
repository.findAll(
    Specification
        .where(OrderSpecifications.byCustomerId("cust-1"))
        .and(OrderSpecifications.byStatus(OrderStatus.PENDING))
        .and(OrderSpecifications.createdAfter(LocalDate.now().minusDays(7).atStartOfDay())),
    PageRequest.of(0, 20)
);
```

## Key Points

- JpaRepository provides CRUD operations with pagination support
- @Query methods define custom JPQL or native SQL queries
- @Modifying + @Query for update/delete operations
- @Transactional(readOnly = true) optimizes read performance
- EntityManager for complex criteria-based queries
- Specification pattern enables dynamic query composition
- @CreatedDate and @LastModifiedDate for audit timestamps
- @Version enables optimistic locking
- CascadeType.ALL manages related entity persistence
- Event publishing after transaction completion for eventual consistency
