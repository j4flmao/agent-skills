---
name: micronaut-backend
description: >
  Use this skill when building Micronaut backend applications — compile-time DI, GraalVM native images, reactive HTTP, declarative HTTP clients. This skill enforces: annotation-driven configuration, compile-time AOT processing, proper bean scoping, reactive streams. Do NOT use for: Spring Boot projects, Quarkus applications, Jakarta EE.
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

# Micronaut Backend

## Purpose
Define Micronaut backend application architecture: compile-time DI, reactive endpoints, GraalVM native compilation, and declarative HTTP clients.

## Agent Protocol

### Trigger
User request includes: `micronaut`, `micronaut backend`, `compile-time di`, `micronaut reactive`, `graalvm micronaut`, `micronaut client`, `micronaut kafka`.

### Input Context
- JDK version (17+)
- Language (Java, Kotlin, Groovy)
- Build tool (Gradle, Maven)
- Runtime (JIT, GraalVM native)
- Features (HTTP server, HTTP client, Kafka, AWS Lambda)

### Output Artifact
A markdown document containing:
- Project structure
- Bean definition and scoping
- Controller and endpoint conventions
- Declarative HTTP client setup
- Reactive stream integration (Project Reactor, RxJava)
- GraalVM native-image configuration
- Testing (Spock, JUnit 5)
- Configuration (application.yml, bootstrap.yml)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Compile-time DI configured correctly with @Singleton, @Prototype scopes
- Controllers use proper HTTP annotations
- Declarative HTTP clients defined for service communication
- Native-image reflection hints configured
- Tests use @MicronautTest with proper contexts

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup

| Tool | Command |
|---|---|
| Gradle | `mn create-app example --build gradle --lang java` |
| Maven | `mn create-app example --build maven --lang java` |
| Micronaut Launch | https://micronaut.io/launch |

### Step 2: Define Application Structure
```
src/main/java/com/example/
├── Application.java
├── controller/
│   ├── OrderController.java
│   └── HealthController.java
├── service/
│   └── OrderService.java
├── repository/
│   └── OrderRepository.java
├── model/
│   ├── Order.java
│   └── OrderStatus.java
├── client/
│   └── InventoryClient.java
├── config/
│   ├── AppConfig.java
│   └── DataSourceConfig.java
└── dto/
    ├── CreateOrderRequest.java
    └── OrderResponse.java
```

### Step 3: Bean Scoping
```java
@Singleton
public class OrderService { }

@Prototype
public class RequestScopedBean { }

@Context
public class AppBootstrap { }

@Bean
@Requires(property = "datasource.enabled", value = "true")
public DataSource dataSource() { }
```

### Step 4: Controller Pattern
```java
@Controller("/api/orders")
public class OrderController {
  private final OrderService service;

  public OrderController(OrderService service) {
    this.service = service;
  }

  @Get("/{id}")
  public HttpResponse<OrderResponse> get(@PathVariable UUID id) {
    return HttpResponse.ok(service.findById(id));
  }

  @Post
  public HttpResponse<OrderResponse> create(@Body @Valid CreateOrderRequest req) {
    return HttpResponse.created(service.create(req));
  }

  @Error(exception = OrderNotFoundException.class)
  public HttpResponse<ErrorResponse> handleNotFound(OrderNotFoundException ex) {
    return HttpResponse.notFound(new ErrorResponse(ex.getMessage()));
  }
}
```

### Step 5: Declarative HTTP Client
```java
@Client("http://inventory-service")
public interface InventoryClient {
  @Get("/api/inventory/{sku}")
  Mono<InventoryResponse> checkAvailability(@PathVariable String sku);

  @Post("/api/inventory/reserve")
  Single<ReservationResponse> reserve(@Body ReserveRequest request);
}
```

### Step 6: GraalVM Native
```xml
<!-- pom.xml plugin -->
<plugin>
  <groupId>org.graalvm.buildtools</groupId>
  <artifactId>native-maven-plugin</artifactId>
</plugin>
```
```yaml
# application.yml
micronaut:
  server:
    port: 8080
  netty:
    log-level: DEBUG
datasources:
  default:
    url: ${JDBC_URL:`jdbc:h2:mem:default`}
```

## Rules
- Bean scoped correctly — @Singleton for stateless services, @Prototype for stateful.
- Constructor injection always — no field injection.
- Declarative clients over manual HTTP calls.
- Global error handler via @Error annotation on controller or global handler.
- Validation via @Valid and custom annotation constraints.
- Native-image builds require explicit reflection hints.

## References

### Reference Files
- `references/micronaut-setup.md` — Micronaut project setup, configuration, CLI
- `references/micronaut-testing.md` — Testing strategies, @MicronautTest, mocking
- `references/micronaut-data.md` — Micronaut Data, repositories, DTO projections, transactions
- `references/micronaut-deployment.md` — GraalVM native, Docker, CI/CD, AWS Lambda

### Related Skills
- `backend/universal/api-response/SKILL.md` — API response envelope
- `backend/universal/oop-principles/SKILL.md` — SOLID for Java

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
