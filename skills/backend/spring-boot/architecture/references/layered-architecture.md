# Spring Boot Layered Architecture

```
src/main/java/com/example/orders/
├── OrderApplication.java
├── domain/
│   ├── model/
│   │   ├── Order.java
│   │   └── OrderStatus.java
│   ├── repository/
│   │   └── OrderRepository.java  (interface)
│   └── service/
│       └── OrderDomainService.java
├── application/
│   ├── port/in/
│   │   └── PlaceOrderUseCase.java
│   ├── port/out/
│   │   └── LoadOrderPort.java
│   └── service/
│       └── PlaceOrderService.java
├── adapter/
│   ├── inbound/
│   │   ├── web/
│   │   │   └── OrderController.java
│   │   └── messaging/
│   │       └── OrderEventConsumer.java
│   └── outbound/
│       ├── persistence/
│       │   ├── OrderJpaRepository.java
│       │   └── OrderEntity.java
│       └── messaging/
│           └── OrderEventPublisher.java
└── config/
    └── BeanConfig.java
```

## Hexagonal Architecture Ports
```java
// Port In
public interface PlaceOrderUseCase {
    Order execute(PlaceOrderCommand command);
}

// Port Out
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    void save(Order order);
}
```

## Constructor Injection
```java
@Service
public class PlaceOrderService implements PlaceOrderUseCase {
    private final OrderRepository orderRepository;
    private final EventPublisher eventPublisher;

    public PlaceOrderService(OrderRepository orderRepository, EventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public Order execute(PlaceOrderCommand command) {
        Order order = Order.create(command.userId(), command.items());
        orderRepository.save(order);
        eventPublisher.publish(new OrderPlacedEvent(order.id()));
        return order;
    }
}
```

## Dependency Rule
- Domain: pure Java, no Spring annotations, no framework imports
- Application: Spring @Service only, depends on domain interfaces
- Adapter: Spring @Controller, @Repository, @Component — depends on application ports
