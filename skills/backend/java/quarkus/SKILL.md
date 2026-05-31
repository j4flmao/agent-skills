---
name: quarkus-backend
description: >
  Use this skill when building Quarkus backend applications — supersonic Java, Dev UI, GraalVM native, reactive messaging, Panache ORM. This skill enforces: compile-time metadata processing, live reload, continuous testing, container-first design. Do NOT use for: Spring Boot projects, Micronaut applications, standard Jakarta EE.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, java, jvm, phase-4]
---

# Quarkus Backend

## Purpose
Define Quarkus backend application architecture: supersonic startup, live reload, native executables, reactive messaging, and extension ecosystem.

## Agent Protocol

### Trigger
User request includes: `quarkus`, `quarkus backend`, `supersonic java`, `quarkus native`, `panache`, `quarkus reactive`, `quarkus extension`, `quarkus dev ui`, `container-first java`.

### Input Context
- JDK version (17+)
- Build tool (Gradle, Maven)
- Runtime (JIT, GraalVM native)
- Extensions (RESTEasy Reactive, Hibernate, Kafka, MongoDB)
- Deployment (JAR, native binary, container)

### Output Artifact
A markdown document containing:
- Project structure
- RESTEasy Reactive endpoint conventions
- Panache ORM setup
- Reactive messaging configuration
- Dev Services and Dev UI usage
- Native compilation config
- Testing with @QuarkusTest
- Extension configuration

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Application starts in dev mode with live reload
- REST endpoints use RESTEasy Reactive annotations
- Panache repository or active record configured
- Native build succeeds with application.properties tuning
- Tests pass with @QuarkusTest and Dev Services

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Initialization
```bash
# Using Maven
mvn io.quarkus.platform:quarkus-maven-plugin:3.6.0:create \
  -DprojectGroupId=com.example \
  -DprojectArtifactId=order-service \
  -Dextensions='resteasy-reactive,hibernate-validator,reactive-pg-client,panache'

# Using Gradle
quarkus create app com.example:order-service \
  --extension=resteasy-reactive,reactive-pg-client,panache,kafka

# Using Quarkus CLI
quarkus create app order-service \
  -x resteasy-reactive,reactive-pg-client,panache,kafka
```

### Step 2: Project Structure
```
src/
+-- main/
|   +-- java/com/example/
|   |   +-- OrderResource.java
|   |   +-- OrderService.java
|   |   +-- Order.java
|   |   +-- OrderRepository.java
|   |   +-- OrderMapper.java
|   |   +-- dto/
|   |   |   +-- CreateOrderRequest.java
|   |   |   +-- OrderResponse.java
|   |   +-- messaging/
|   |   |   +-- OrderEventProducer.java
|   |   |   +-- OrderEventConsumer.java
|   |   +-- exception/
|   |   |   +-- GlobalExceptionMapper.java
|   |   |   +-- OrderNotFoundException.java
|   |   +-- health/
|   |       +-- DatabaseHealthCheck.java
|   +-- resources/
|       +-- application.properties
|       +-- META-INF/
|           +-- resources-config.json  (GraalVM hints)
+-- test/
|   +-- java/com/example/
|       +-- OrderResourceTest.java
|       +-- OrderServiceTest.java
+-- docker-compose.yml
```

### Step 3: RESTEasy Reactive Resource
```java
@Path("/api/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrderResource {
    @Inject OrderService service;

    @GET
    public Uni<List<OrderResponse>> list(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return service.list(page, size)
            .map(list -> list.stream().map(o -> OrderMapper.toResponse(o)).toList());
    }

    @GET
    @Path("/{id}")
    public Uni<OrderResponse> get(@PathParam UUID id) {
        return service.findById(id)
            .map(o -> o.map(OrderMapper::toResponse)
                .orElseThrow(() -> new OrderNotFoundException(id)));
    }

    @POST
    public Uni<RestResponse<OrderResponse>> create(@Valid CreateOrderRequest req) {
        return service.create(req)
            .map(r -> RestResponse.status(CREATED, OrderMapper.toResponse(r)));
    }

    @PUT
    @Path("/{id}")
    public Uni<OrderResponse> update(@PathParam UUID id, @Valid CreateOrderRequest req) {
        return service.update(id, req)
            .map(OrderMapper::toResponse);
    }

    @DELETE
    @Path("/{id}")
    public Uni<RestResponse<Void>> delete(@PathParam UUID id) {
        return service.delete(id)
            .map(r -> RestResponse.noContent());
    }
}
```

### Step 4: Panache ORM (Active Record Pattern)
```java
@Entity
@Table(name = "orders")
public class Order extends PanacheEntityBase {
    @Id
    public UUID id;
    
    @Column(name = "customer_id", nullable = false)
    public String customerId;
    
    @Enumerated(STRING)
    @Column(nullable = false)
    public OrderStatus status;
    
    @Column(name = "total_amount", precision = 10, scale = 2)
    public BigDecimal totalAmount;
    
    @Column(name = "created_at")
    public Instant createdAt;
    
    @Column(name = "updated_at")
    public Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    public static Uni<Order> findByCustomerId(String customerId) {
        return find("customerId", customerId).firstResult();
    }

    public static Uni<List<Order>> listRecent(int limit) {
        return find("ORDER BY createdAt DESC").page(Page.ofSize(limit)).list();
    }
}

// Repository Pattern (alternative)
@ApplicationScoped
public class OrderRepository implements PanacheRepositoryBase<Order, UUID> {
    public Uni<List<Order>> findRecent(int limit) {
        return find("ORDER BY createdAt DESC").page(Page.ofSize(limit)).list();
    }
    
    public Uni<Long> countByStatus(OrderStatus status) {
        return count("status", status);
    }
}

// DTO
public record CreateOrderRequest(
    @NotBlank String customerId,
    @NotEmpty List<OrderItemDto> items
) {}

public record OrderItemDto(
    @NotBlank String productId,
    @Min(1) int quantity,
    @Positive BigDecimal unitPrice
) {}

public record OrderResponse(
    UUID id,
    String customerId,
    String status,
    BigDecimal totalAmount,
    Instant createdAt
) {}

// Mapper
public class OrderMapper {
    public static OrderResponse toResponse(Order order) {
        return new OrderResponse(
            order.id,
            order.customerId,
            order.status.name(),
            order.totalAmount,
            order.createdAt
        );
    }
}
```

### Step 5: Reactive Messaging (Kafka)
```java
// messaging/OrderEventProducer.java
@ApplicationScoped
public class OrderEventProducer {
    @Channel("orders-out")
    Emitter<OrderEvent> emitter;

    public Uni<Void> sendOrderCreated(Order order) {
        return emitter.send(new OrderEvent(
            order.id.toString(),
            "ORDER_CREATED",
            order.customerId,
            order.totalAmount
        ));
    }
}

// messaging/OrderEventConsumer.java
@ApplicationScoped
public class OrderEventConsumer {
    @Inject InventoryService inventoryService;
    @Inject NotificationService notificationService;

    @Incoming("orders-in")
    public CompletionStage<Void> onOrderCreated(OrderEvent event) {
        return Uni.combine().all()
            .unis(
                inventoryService.reserveItems(event.orderId()),
                notificationService.sendConfirmation(event.customerId(), event.orderId())
            )
            .discardItems()
            .subscribeAsCompletionStage();
    }
}

// OrderEvent.java
public record OrderEvent(
    String orderId,
    String eventType,
    String customerId,
    BigDecimal totalAmount
) {}
```

### Step 6: Configuration
```properties
# application.properties
quarkus.http.port=8080
quarkus.log.level=INFO
quarkus.log.console.enable=true

# Datasource
quarkus.datasource.db-kind=postgresql
quarkus.datasource.username=${DB_USER}
quarkus.datasource.password=${DB_PASS}
quarkus.datasource.reactive.url=${DB_URL}

# Hibernate
quarkus.hibernate-orm.database.generation=validate
quarkus.hibernate-orm.log.sql=false

# Kafka
mp.messaging.outgoing.orders-out.connector=smallrye-kafka
mp.messaging.outgoing.orders-out.topic=orders
mp.messaging.outgoing.orders-out.value.serializer=io.quarkus.kafka.client.serialization.JsonbSerializer

mp.messaging.incoming.orders-in.connector=smallrye-kafka
mp.messaging.incoming.orders-in.topic=orders
mp.messaging.incoming.orders-in.value.deserializer=io.quarkus.kafka.client.serialization.JsonbDeserializer
mp.messaging.incoming.orders-in.group.id=order-service

# Native
quarkus.native.container-build=true
quarkus.native.additional-build-args=--enable-url-protocols=http,--initialize-at-run-time=com.example.messaging
quarkus.native.builder-image=graalvm:21

# Dev Services (auto-starts containers in dev/test)
quarkus.devservices.enabled=true
quarkus.devservices.postgresql.image-name=postgres:15

# CORS
quarkus.http.cors=true
quarkus.http.cors.origins=http://localhost:3000
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS

# Health
quarkus.health.extensions.enabled=true
```

### Step 7: Testing
```java
@QuarkusTest
public class OrderResourceTest {

    @Test
    public void testCreateOrder() {
        given()
            .body("""
                {
                    "customerId": "cust-1",
                    "items": [
                        {"productId": "prod-1", "quantity": 2, "unitPrice": 19.99}
                    ]
                }
            """)
            .contentType(ContentType.JSON)
        .when()
            .post("/api/orders")
        .then()
            .statusCode(201)
            .body("customerId", equalTo("cust-1"));
    }

    @Test
    public void testGetNonExistentOrder() {
        given()
        .when()
            .get("/api/orders/" + UUID.randomUUID())
        .then()
            .statusCode(404);
    }

    @Test
    public void testUnauthenticatedRequest() {
        given()
        .when()
            .get("/api/orders")
        .then()
            .statusCode(401);
    }
}

@QuarkusTest
@QuarkusTestResource(PostgresTestResource.class)
public class OrderServiceTest {

    @Inject OrderService orderService;
    @Inject PanacheMock mockOrder;

    @Test
    public void testFindById() {
        UUID id = UUID.randomUUID();
        Order order = new Order();
        order.id = id;
        order.customerId = "cust-1";

        PanacheMock.mock(Order.class);
        when(Order.findById(id)).thenReturn(Uni.createFrom().item(order));

        orderService.findById(id)
            .subscribe().with(found -> {
                assertNotNull(found);
                assertEquals("cust-1", found.get().customerId);
            });
    }
}
```

### Step 8: Global Exception Mapping
```java
@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {
    @Override
    public Response toResponse(Throwable exception) {
        if (exception instanceof OrderNotFoundException) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new ErrorResponse("NOT_FOUND", exception.getMessage()))
                .build();
        }
        if (exception instanceof ConstraintViolationException) {
            List<String> errors = ((ConstraintViolationException) exception)
                .getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .toList();
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse("VALIDATION", "Validation failed", errors))
                .build();
        }
        if (exception instanceof WebApplicationException) {
            return ((WebApplicationException) exception).getResponse();
        }
        Log.error("Unhandled exception", exception);
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"))
            .build();
    }
}

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(UUID id) {
        super("Order with id " + id + " not found");
    }
}

public record ErrorResponse(String code, String message, Object details) {
    public ErrorResponse(String code, String message) {
        this(code, message, null);
    }
}
```

## Architecture Decision Trees

### Panache Pattern Selection
```
Need fine-grained JPA control (custom queries, entity graphs)?
  +-- Yes -> Repository pattern. Interface extends PanacheRepositoryBase.
  +-- No  -> Active Record pattern. Order extends PanacheEntityBase. Simpler.
```

### Reactive vs Imperative
```
Already using blocking JDBC driver?
  +-- Yes -> Use standard Hibernate ORM + RESTEasy (non-reactive). Same code, JIT runtime.
  +-- No  -> Use Hibernate Reactive + RESTEasy Reactive + R2DBC/Reactive PG Client.
```

### Native Compilation
```
Container deployment with cold-start requirements?
  +-- Yes -> Native binary. <0.1s startup, ~50MB memory. Add GraalVM hints for reflection.
  +-- No  -> JIT JAR. Simpler build, broader compatibility, faster builds.
```

## Common Pitfalls

1. **Reflection not configured for native**: Classes loaded dynamically (serialization, frameworks) need GraalVM reflect-config.json or @RegisterForReflection.

2. **Blocking JDBC usage in reactive context**: Calling `block()` on a Uni in a reactive chain blocks the event loop. Use Hibernate Reactive or separate blocking pool.

3. **Dev Services in production**: Dev Services auto-start containers. Disable with `quarkus.devservices.enabled=false` in production profiles.

4. **Lazy fetching across transactions**: In reactive mode, no open session for lazy loading. Use JOIN FETCH or entity graphs.

5. **Missing Panache mock setup**: PanacheMock requires explicit mock configuration. Use `PanacheMock.mock(Order.class)` before method stubs.

6. **Large native build times**: GraalVM native compilation is slow (2-5 minutes). Use CI caching for native build artifacts.

7. **Quarkus version conflicts**: Extension versions must match Quarkus platform BOM. Use `quarkus-bom` in dependency management.

8. **Reactive messaging retry not configured**: Failed messages are retried indefinitely by default unless `max-retries` is configured on the connector.

9. **Health endpoint exposed in production**: Configure `quarkus.health.extensions.enabled=false` or secure health endpoint behind authentication.

10. **Serialization issues with custom types**: Register custom JBoss Marshalling serializer for types used in cluster replication or messaging.

## Best Practices

1. **RESTEasy Reactive for all HTTP endpoints** — never Jakarta REST (deprecated in Quarkus 3.x).
2. **Panache for data access** — active record or repository per preference.
3. **application.properties for all configuration** — env vars via ${VAR_NAME} syntax.
4. **Dev Services in dev/test only** — never in production profiles.
5. **Native builds require explicit GraalVM reflection/config hints** — use @RegisterForReflection.
6. **@QuarkusIntegrationTest for full integration** with running instances.
7. **Reactive Messaging for event-driven communication** between services.
8. **Health checks with @Health annotation** for readiness and liveness probes.
9. **OpenAPI with SmallRye OpenAPI** — auto-generated OpenAPI spec from REST endpoints.
10. **Continuous testing with `mvn quarkus:test`** — tests re-run on code changes in dev mode.

## Compared With

| Feature | Quarkus | Spring Boot | Micronaut |
|---|---|---|---|
| Startup time (JIT) | ~0.3s | ~2-4s | ~0.4s |
| Startup (GraalVM native) | <0.1s | ~0.5s | <0.1s |
| Memory (JIT) | ~50MB | ~150MB | ~40MB |
| Memory (native) | ~15MB | ~50MB | ~10MB |
| Reactive support | First-class | Via WebFlux | First-class |
| Live reload | Yes (dev mode) | Via DevTools | Yes |
| GraalVM support | First-class | Limited | First-class |
| Extension ecosystem | 200+ | 2000+ | 100+ |

## Performance

- Quarkus JIT startup: ~0.3 seconds. Native: ~0.02 seconds.
- Memory: JIT ~50MB base heap. Native ~15MB RSS.
- RESTEasy Reactive handles ~100k req/s on modern hardware (same as raw Netty).
- Hibernate Reactive with connection pooling of 5-10 connections per core.
- Kafka messaging throughput: ~50k msg/s per consumer group.
- Build time: Maven/Gradle ~10s incremental, GraalVM native ~120-300s.

## Tooling

| Tool | Purpose |
|---|---|
| **Quarkus CLI** | Project creation, dev mode, build |
| **Quarkus Maven/Gradle Plugin** | Build integration |
| **Dev UI** | Web-based development dashboard |
| **SmallRye OpenAPI** | OpenAPI spec generation |
| **Panache** | Simplified Hibernate ORM |
| **RESTEasy Reactive** | Reactive REST endpoints |
| **SmallRye Reactive Messaging** | Event-driven messaging |
| **Hibernate Reactive** | Reactive database access |
| **Testcontainers** | Integration test containers |
| **GraalVM** | Native image compilation |
| **Container-first Docker** | Optimized container images |

## Rules

- RESTEasy Reactive for all HTTP endpoints — never Jakarta REST.
- Panache for data access — active record or repository per preference.
- application.properties for all configuration — env vars via ${} syntax.
- Dev Services in dev/test — never in production.
- Native builds require explicit GraalVM reflection/config hints.
- @QuarkusIntegrationTest for full integration with running instances.
- Reactive messaging connectors configure retry and dead-letter queue.
- Custom serializers registered via @RegisterForReflection annotation.
- Resource classes are POJOs with @Inject — no inheritance required.
- Exception mapper for global error handling — never raw try-catch in resources.
- Health checks for each downstream dependency (DB, Kafka, external API).

## References
  - references/quarkus-reactive-programming.md — Quarkus Reactive Programming
  - references/quarkus-native-compilation.md — Quarkus Native Compilation
  - references/quarkus-deployment.md — Quarkus Deployment
  - references/quarkus-extension-guide.md — Quarkus Extension Guide
  - references/quarkus-reactive.md — Quarkus Reactive
  - references/quarkus-security.md — Quarkus Security Reference
  - references/quarkus-setup.md — Quarkus Setup Guide
  - references/quarkus-testing.md — Quarkus Testing Reference

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response formats.
