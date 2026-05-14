# Spring WebFlux Patterns

## Reactive Controller
```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final PlaceOrderUseCase placeOrderUseCase;

    @PostMapping
    public Mono<OrderResponse> placeOrder(@Valid @RequestBody PlaceOrderRequest request) {
        return placeOrderUseCase.execute(request.toCommand())
            .map(OrderResponse::from);
    }

    @GetMapping("/{id}")
    public Mono<OrderResponse> getOrder(@PathVariable String id) {
        return orderRepository.findById(new OrderId(id))
            .map(OrderResponse::from)
            .switchIfEmpty(Mono.error(new OrderNotFoundException(id)));
    }
}
```

## Reactive Repository
```java
public interface OrderRepository {
    Mono<Order> findById(OrderId id);
    Mono<Void> save(Order order);
    Flux<Order> findByUserId(String userId);
}
```

## R2DBC Implementation
```java
@Repository
public class R2dbcOrderRepository implements OrderRepository {
    private final R2dbcEntityTemplate template;

    public Mono<Order> findById(OrderId id) {
        return template.selectOne(query(where("id").is(id.value())), OrderEntity.class)
            .map(this::toDomain);
    }

    public Mono<Void> save(Order order) {
        return template.insert(toEntity(order)).then();
    }
}
```

## Error Handling
```java
@ExceptionHandler(DomainError.class)
public ProblemDetail handleDomainError(DomainError e) {
    return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
}
```
