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
  -Dextensions='resteasy-reactive,hibernate-validator,reactive-pg-client'

# Using Gradle
quarkus create app com.example:order-service --extension=resteasy-reactive,reactive-pg-client
```

### Step 2: Project Structure
```
src/
├── main/
│   ├── java/com/example/
│   │   ├── OrderResource.java
│   │   ├── OrderService.java
│   │   ├── Order.java
│   │   ├── OrderRepository.java
│   │   └── dto/
│   │       ├── CreateOrderRequest.java
│   │       └── OrderResponse.java
│   └── resources/
│       └── application.properties
└── test/
    └── java/com/example/
        └── OrderResourceTest.java
```

### Step 3: RESTEasy Reactive Resource
```java
@Path("/api/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrderResource {
  @Inject OrderService service;

  @GET
  @Path("/{id}")
  public Uni<OrderResponse> get(@PathVariable UUID id) {
    return service.findById(id).map(Order::toResponse);
  }

  @POST
  public Uni<RestResponse<OrderResponse>> create(@Valid CreateOrderRequest req) {
    return service.create(req)
      .map(r -> RestResponse.status(CREATED, r.toResponse()));
  }

  @GET
  public Uni<List<OrderResponse>> list(@QueryParam("page") @DefaultValue("0") int page) {
    return service.list(page).map(list -> list.stream().map(Order::toResponse).toList());
  }
}
```

### Step 4: Panache ORM
```java
@Entity
@Table(name = "orders")
public class Order extends PanacheEntity {
  public String customerId;
  @Enumerated(STRING) public OrderStatus status;
  public BigDecimal totalAmount;
  public Instant createdAt;

  public static Uni<Order> findByCustomer(String customerId) {
    return find("customerId", customerId).firstResult();
  }
}

@ApplicationScoped
public class OrderRepository implements PanacheRepositoryBase<Order, UUID> {
  public Uni<List<Order>> findRecent(int limit) {
    return find("ORDER BY createdAt DESC").page(Page.ofSize(limit)).list();
  }
}
```

### Step 5: Configuration
```properties
# application.properties
quarkus.http.port=8080
quarkus.log.level=INFO

# Datasource
quarkus.datasource.db-kind=postgresql
quarkus.datasource.username=${DB_USER}
quarkus.datasource.password=${DB_PASS}
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/orders

# Native
quarkus.native.container-build=true
quarkus.native.additional-build-args=--enable-url-protocols=http

# Dev Services
quarkus.devservices.enabled=true
```

### Step 6: Testing
```java
@QuarkusTest
public class OrderResourceTest {
  @Test
  public void testCreateOrder() {
    given()
      .body("{\"customerId\":\"cust-1\",\"items\":[]}")
      .contentType(ContentType.JSON)
    .when()
      .post("/api/orders")
    .then()
      .statusCode(201)
      .body("customerId", equalTo("cust-1"));
  }
}
```

## Rules
- RESTEasy Reactive for all HTTP endpoints — never Jakarta REST.
- Panache for data access — active record or repository per preference.
- application.properties for all configuration — env vars via ${} syntax.
- Dev Services in dev/test — never in production.
- Native builds require explicit GraalVM reflection/config hints.
- @QuarkusIntegrationTest for full integration with running instances.

## References

### Reference Files
- `references/quarkus-setup.md` — Quarkus project setup, extensions, Dev UI
- `references/quarkus-extension-guide.md` — Writing and configuring extensions
- `references/quarkus-reactive.md` — RESTEasy Reactive, Mutiny, Hibernate Reactive, messaging
- `references/quarkus-deployment.md` — Native image, Docker, CI/CD, platform deployment

### Related Skills
- `backend/universal/api-response/SKILL.md` — API response envelope
- `backend/universal/oop-principles/SKILL.md` — SOLID for Java

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response formats.
