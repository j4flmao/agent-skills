# Quarkus Reactive

## Reactive vs Imperative

| Aspect | Imperative (JAX-RS) | Reactive (RESTEasy Reactive) |
|--------|--------------------|------------------------------|
| Thread model | Blocking per request | Event loop, non-blocking |
| Concurrency | Thread pool (limited) | Event loop (high) |
| Return types | Plain objects | Uni, Multi, CompletionStage |
| Database access | Hibernate (blocking) | Hibernate Reactive, pg-client |
| Best for | Standard CRUD | Streaming, high throughput |

## RESTEasy Reactive Endpoints

```java
import io.smallrye.mutiny.Uni;
import io.smallrye.mutiny.Multi;

@Path("/api/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrderResource {

    @Inject OrderService service;

    @GET
    @Path("/{id}")
    public Uni<OrderResponse> get(@PathParam("id") Long id) {
        return service.findById(id).map(Order::toResponse);
    }

    @POST
    public Uni<RestResponse<OrderResponse>> create(@Valid CreateOrderRequest req) {
        return service.create(req)
            .map(r -> RestResponse.status(Created, r.toResponse()));
    }

    @GET
    public Uni<List<OrderResponse>> list(@QueryParam("page") @DefaultValue("0") int page,
                                         @QueryParam("size") @DefaultValue("20") int size) {
        return service.list(page, size)
            .map(list -> list.stream().map(Order::toResponse).toList());
    }

    // Server-Sent Events
    @GET
    @Path("/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public Multi<OrderEvent> stream() {
        return service.orderEventStream();
    }
}
```

## Reactive Database with Hibernate Reactive

```java
// application.properties
quarkus.datasource.db-kind=postgresql
quarkus.datasource.reactive.url=postgresql://localhost:5432/orders
quarkus.hibernate-orm.database.generation=update

// Panache with reactive
@ReactiveEntity
@Table(name = "orders")
public class Order extends ReactivePanacheEntity {
    public String customerId;
    public String status;
    public BigDecimal totalAmount;
    public Instant createdAt;

    public static Uni<Order> findByCustomer(String customerId) {
        return find("customerId", customerId).firstResult();
    }

    public static Uni<List<Order>> findRecent(int limit) {
        return find("ORDER BY createdAt DESC")
            .page(Page.ofSize(limit)).list();
    }
}

// Reactive Repository
@ApplicationScoped
public class OrderRepository implements PanacheRepositoryBase<Order, Long> {
    public Uni<List<Order>> findByStatus(String status) {
        return find("status", status).list();
    }

    public Uni<Long> countByCustomer(String customerId) {
        return count("customerId", customerId);
    }
}
```

## Reactive Mutiny API

```java
// Uni — single result (0 or 1 item)
Uni<Order> order = service.findById(1L);
order
    .onItem().transform(Order::toResponse)
    .onFailure().recoverWithItem(fallbackResponse())
    .onItem().delayIt().by(Duration.ofMillis(100));

// Multi — stream of items (0..N items)
Multi<Order> orders = service.streamAll();
orders
    .filter(o -> "PENDING".equals(o.status))
    .map(Order::toResponse)
    .select().first(10)
    .collect().asList()
    .await().atMost(Duration.ofSeconds(5));

// Combining
Uni.combine().all()
    .unis(service.count(), service.list(0, 20))
    .asTuple()
    .map(tuple -> new PageResponse(tuple.getItem2(), tuple.getItem1()));
```

## Reactive Messaging

```java
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.eclipse.microprofile.reactive.messaging.Incoming;

// Producer
@ApplicationScoped
public class OrderEventProducer {
    @Channel("order-events")
    Emitter<OrderEvent> emitter;

    public void publish(OrderEvent event) {
        emitter.send(event).whenComplete((ack, err) -> {
            if (err != null) log.error("Failed to send", err);
        });
    }
}

// Consumer
@ApplicationScoped
public class OrderEventConsumer {
    @Incoming("order-events")
    public Uni<Void> consume(OrderEvent event) {
        return processPayment(event)
            .onFailure().retry().atMost(3);
    }
}
```

## Reactive HTTP Client

```java
@Path("/api/inventory")
@RestClient
public interface InventoryClient {
    @GET
    @Path("/stock/{sku}")
    Uni<StockResponse> checkStock(@PathParam("sku") String sku);

    @POST
    @Path("/reserve")
    Uni<ReserveResponse> reserve(@Body ReserveRequest request);
}

// Usage
@ApplicationScoped
public class InventoryService {
    @RestClient InventoryClient client;

    public Uni<Boolean> isAvailable(String sku, int qty) {
        return client.checkStock(sku)
            .map(r -> r.available() >= qty);
    }
}
```

## Error Handling

```java
@Provider
public class ReactiveExceptionMapper implements ExceptionMapper<Throwable> {
    @Override
    public Response toResponse(Throwable exception) {
        return Response.status(500)
            .entity(new ErrorResponse("INTERNAL", "Unexpected error"))
            .type(MediaType.APPLICATION_JSON)
            .build();
    }
}
```
