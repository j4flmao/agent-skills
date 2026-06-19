---
name: java
description: >
  Use this skill when the user asks about Java build tools, Maven, Gradle,
  module system, records, streams, Optional, concurrency, testing, or
  production deployment. Focus on tooling, modern Java features, and
  ecosystem — not syntax.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [java, language, build, jvm]
---

# Java

## Purpose
Guide for Java build tools (Maven/Gradle), module system, modern language features (records, sealed classes, pattern matching), streams, concurrency, testing, and production deployment.

## Agent Protocol

### Trigger
Keywords: `java build`, `maven`, `gradle`, `java module`, `record`, `stream`, `optional`, `completablefuture`, `junit`, `spring boot`, `jakarta`.

### Input Context
- Build tool (Maven, Gradle)
- Java version
- Framework (Spring Boot, Quarkus, Micronaut, Jakarta EE)
- Deployment target

## Decision Trees

### Build Tool Selection
```
Team preference?
├── Declarative, XML, convention → Maven (stable, predictable, standard)
│   ├── pom.xml, lifecycle phases (compile, test, package)
│   └── Best for: large orgs, strict conventions, established projects
├── Flexible, programmable, fast → Gradle (Kotlin DSL, incremental builds)
│   ├── build.gradle.kts, task-based, build cache
│   └── Best for: Android, multi-module, custom build logic
└── Modern, fast, no-nonsense → Maven + mvnd (Maven Daemon, parallel builds)
```

### Framework Selection
```
What kind of application?
├── Full-stack web app → Spring Boot (most mature, vast ecosystem, auto-config)
├── Cloud-native / low-resource → Quarkus (GraalVM native, fast startup)
├── Microservices / reactive → Micronaut (compile-time DI, AOT)
├── REST API / lightweight → JAX-RS (Jakarta REST) + Helidon / Dropwizard
└── Batch processing → Spring Batch / Apache Beam
```

### Module Strategy
```
Project size?
├── Small (<10k LOC) → Single module, package-based organization
├── Medium (10-100k LOC) → Multi-module with clear boundaries (api, core, infra)
├── Large (>100k LOC) → Java Platform Module System (JPMS) with module-info.java
└── Library → Single module, minimize exports, use JPMS for strong encapsulation
```

## Build & Dependency Management

### Maven pom.xml
```xml
<project>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
    </parent>

    <properties>
        <java.version>21</java.version>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
</project>
```

### Gradle build.gradle.kts
```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.5"
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
}
```

### Version Catalog (Gradle)
```toml
# gradle/libs.versions.toml
[versions]
spring-boot = "3.3.0"
testcontainers = "1.19.0"

[libraries]
spring-boot-starter = { module = "org.springframework.boot:spring-boot-starter-web", version.ref = "spring-boot" }
testcontainers = { module = "org.testcontainers:testcontainers", version.ref = "testcontainers" }
```

## Language-Specific Patterns

### Records (Java 16+)
```java
// Immutable data carrier — replaces Lombok @Data, manual POJOs
public record Order(Long id, String customer, BigDecimal total, OrderStatus status) {
    // Compact constructor for validation
    public Order {
        if (total.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("total must be positive");
        }
        if (status == null) status = OrderStatus.PENDING;
    }

    // Static factory
    public static Order create(String customer, BigDecimal total) {
        return new Order(null, customer, total, OrderStatus.PENDING);
    }
}
```

### Sealed Classes (Java 17+)
```java
// Exhaustive hierarchy — compiler knows all subtypes
public sealed interface Payment
    permits CreditCard, PayPal, CryptoPayment {}

public record CreditCard(String lastFour, String expiry) implements Payment {}
public record PayPal(String email) implements Payment {}
public record CryptoPayment(String walletAddress, String currency) implements Payment {}

// Switch with pattern matching (Java 21+)
public String processPayment(Payment payment) {
    return switch (payment) {
        case CreditCard c -> "Processing card ending in " + c.lastFour();
        case PayPal p -> "Redirecting to PayPal for " + p.email();
        case CryptoPayment cp -> "Verifying " + cp.currency() + " transfer";
    };
}
```

### Streams & Optional
```java
// Stream pipeline
List<String> activeCustomerEmails = orders.stream()
    .filter(Order::isPaid)
    .map(Order::customer)
    .distinct()
    .sorted()
    .toList();  // Java 16+ — no need for .collect(Collectors.toList())

// Optional usage
public Customer findCustomer(Long id) {
    return repository.findById(id)
        .orElseThrow(() -> new CustomerNotFoundException(id));
}

// Optional chaining
String city = customer
    .flatMap(Customer::getAddress)
    .map(Address::getCity)
    .orElse("Unknown");
```

### CompletableFuture
```java
public CompletableFuture<OrderResult> processOrderAsync(OrderRequest request) {
    return CompletableFuture
        .supplyAsync(() -> validateOrder(request), executor)
        .thenCompose(validated ->
            CompletableFuture.supplyAsync(() -> saveOrder(validated), executor))
        .thenApplyAsync(this::enrichResult, executor)
        .exceptionally(throwable -> {
            log.error("Order processing failed", throwable);
            return OrderResult.failed(throwable.getMessage());
        });
}

// Combine multiple async results
CompletableFuture<Void> all = CompletableFuture.allOf(f1, f2, f3);
all.thenRun(() -> { /* all complete */ });
```

## Testing & Tooling

### JUnit 5
```java
import org.junit.jupiter.api.*;

class OrderServiceTest {
    @Test
    void createOrder_setsPendingStatus() {
        var order = service.createOrder(customerId, items);
        assertEquals(OrderStatus.PENDING, order.status());
    }

    @ParameterizedTest
    @CsvSource({ "1, 10.0", "2, 20.0", "5, 50.0" })
    void calculateTotal_multipliesQuantity(int qty, double expected) {
        assertEquals(BigDecimal.valueOf(expected), service.calculateTotal(item, qty));
    }

    @TestFactory
    Stream<DynamicTest> dynamicTests() {
        return testCases.stream()
            .map(tc -> DynamicTest.dynamicTest(tc.name(), () -> {
                assertEquals(tc.expected(), service.process(tc.input()));
            }));
    }
}
```

### Spring Boot Test
```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class OrderControllerTest {
    @Autowired private MockMvc mockMvc;

    @Test
    void createOrder_returns201() throws Exception {
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"customerId": 1, "items": [{"productId": 1, "qty": 2}]}
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber());
    }
}
```

### Tooling
```bash
# Build and test
./mvnw clean verify                    # Maven wrapper (no local install needed)
./gradlew build                        # Gradle wrapper

# JVM tuning
java -Xms512m -Xmx2g -XX:+UseZGC -jar app.jar  # ZGC for low-latency GC

# Profiling
jcmd <pid> VM.native_memory           # Native memory tracking
jmap -dump:live,format=b <pid>        # Heap dump
jstack <pid>                           # Thread dump
async-profiler -e cpu -d 30 -f profile.jfr
```

## Anti-Patterns
- **Raw `null` returns**: Forces callers to null-check. Use `Optional` for possibly-empty returns
- **Checked exceptions overused**: Callers forced to catch or declare. Use unchecked exceptions for non-recoverable
- **`synchronized` on hot methods**: Contention kills throughput. Use `ReentrantLock`, `StampedLock`, or `ConcurrentHashMap`
- **God class with 5000+ lines**: Impossible to test, modify, or understand. Split by responsibility
- **`System.out.println` in production code**: Use SLF4J + Logback/Log4j2 with proper levels
- **`new Date()` / `System.currentTimeMillis()` in tight loops**: Creates objects. Cache or use `Instant.now()`
- **Double-checked locking without `volatile`**: Broken without volatile on the field. Use `Thread-safe` holder pattern
- **`Vector`, `Hashtable`, `StringBuffer`**: Legacy synchronized classes — use `ArrayList`, `HashMap`, `StringBuilder`
- **`finalize()`**: Deprecated, unpredictable. Use `Cleaner` or try-with-resources
- **No explicit charset in String.getBytes()**: Platform-dependent. Always `getBytes(StandardCharsets.UTF_8)`

## Performance Patterns
- `StringBuilder` for concatenation in loops (not `+` operator)
- `record` for lightweight data carriers (no boilerplate, value-based)
- `ConcurrentHashMap` over synchronized maps for concurrent access
- `ZGC` or `Shenandoah` for sub-millisecond GC pauses (Java 17+)
- Flyweight pattern for repeated small objects (Integer cache, custom pools)
- Off-heap storage with `ByteBuffer.allocateDirect` for large caches
- `var` keyword doesn't affect performance but reduces noise
- Profile with async-profiler before optimizing — JVM is already very good
- Use `--enable-preview` in development to test upcoming features (pattern matching, string templates)

## Virtual Threads & Structured Concurrency (Java 21+)

Virtual threads (Project Loom) enable lightweight concurrency without the complexity of reactive frameworks. Create via `Thread.ofVirtual().start(task)` or `Executors.newVirtualThreadPerTaskExecutor()`. Each virtual thread is a Java object (~200 bytes), not an OS thread (~1MB). Use for I/O-bound workloads: HTTP calls, database queries, file I/O. Structured Concurrency (`StructuredTaskScope`) ensures all subtasks complete or are cancelled together. Usage: `try (var scope = new StructuredTaskScope.ShutdownOnFailure())` creates a scope, `scope.fork(callable)` submits tasks, `scope.join()` waits for all, `scope.throwIfFailed()` propagates first error, `scope.result()` returns successful results. Anti-pattern: pinning virtual threads with `synchronized` blocks. Use `ReentrantLock` when virtual threads are involved. Pin detection: JVM logs "Thread X pinned" — investigate and fix.

## Modern Bean Validation & Error Handling

Use Jakarta Bean Validation 3.0+ for input validation instead of manual if/else chains. Annotations on records/POJOs: `@NotBlank`, `@Email`, `@Positive`, `@Size(min=1, max=100)`, `@Pattern(regexp="...")`. Group validation: separate Create vs Update validation rules. Custom validators: implement `ConstraintValidator<Annotation, Type>`. Error handling with `@ControllerAdvice` (Spring) or `ExceptionMapper` (JAX-RS): return structured error responses with field-level errors. Pattern: validation exception → `MethodArgumentNotValidException` → extract field errors → `ErrorResponse` with code, message, fieldErrors list. Never return raw stack traces or Hibernate validation errors to clients.

## Testing Strategy Beyond JUnit

Modern Java testing requires multiple layers: (a) unit tests with JUnit 5 + AssertJ (fluent assertions), (b) Mockito for mock dependencies, (c) `@SpringBootTest` for integration tests with real DB (Testcontainers), (d) `@WebMvcTest` for controller slice tests, (e) `@DataJpaTest` for repository tests. Testcontainers: write integration tests against real PostgreSQL/MySQL/Redis in Docker containers, not in-memory databases that behave differently. Use `@Testcontainers` annotation and `@Container` fields. Performance: use `@SpringBootTest(webEnvironment = NONE)` to avoid starting the full server for non-HTTP tests. Test slicing: `@JsonTest` for JSON serialization, `@RestClientTest` for REST clients. Mockito best practice: verify interactions, don't just stub — `verify(repository).save(expectedOrder)`.

## JVM Garbage Collection Strategy

| GC | Java Version | Best For | Pause Time |
|----|-------------|----------|------------|
| G1GC | 9+ (default 9-21) | General purpose, balanced | <10ms |
| ZGC | 15+ (incubating 11-14) | Large heaps (>100GB), low latency | <1ms |
| Shenandoah | 15+ (incubating 12-14) | Concurrent compaction | <1ms |
| Serial | All | Small heaps, single core | Longer pauses |
| Parallel | All (default 8) | Throughput, batch processing | Longer pauses |

GC flags for modern apps: `-XX:+UseZGC -XX:MaxHeapSize=2g -XX:ParallelGCThreads=4 -XX:ConcGCThreads=2`. Monitor GC with `-Xlog:gc*:file=gc.log:time,uptime,tags` and visualize with GCeasy or GCViewer. Heap dump on OOM: `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/dump.hprof`. Memory leak detection: take 3 heap dumps at intervals, compare with Eclipse MAT for growing object graphs.

## Production Decision Trees

```
Build tool for greenfield project?
├── Spring Boot project → Gradle (Kotlin DSL) — faster incremental builds
├── Standard enterprise → Maven (stable, predictable)
└── Android → Gradle (Groovy or Kotlin DSL)
```

```
Microservices framework?
├── Full Spring ecosystem → Spring Boot + Spring Cloud
│   Service discovery: Eureka / Consul
│   Config: Spring Cloud Config / Vault
├── Low-resource, fast startup → Quarkus
│   GraalVM native: <100ms startup, <10MB RSS
│   Suitable for: serverless, high-density containers
├── Reactive, non-blocking → Micronaut
│   AOT compilation, compile-time DI
│   Suitable for: streaming, real-time
└── Minimal, no framework → JAX-RS + Helidon SE
```

```
Java version for new project?
├── Latest LTS (21) → All modern features
│   Virtual threads, records, sealed classes, pattern matching, string templates
├── Current non-LTS (22, 23) → Cutting edge
│   Statement before super, unnamed patterns, scoped values
└── Older LTS (17) → Widespread ecosystem support
    Most libraries target 17+
```

## OpenAPI & API-First Development

Springdoc: generate OpenAPI 3.0 spec from Spring Boot controllers via `springdoc-openapi-starter-webmvc-ui`. API-first: write OpenAPI spec first, generate server interfaces and client libraries with OpenAPI Generator. Annotations: `@Operation(summary, description)`, `@ApiResponse(...)`, `@Schema(description)`. Group endpoints by tags. Generate Spring Boot interfaces: `openapi-generator generate -g spring -i spec.yaml -o api/`. The generated interfaces have the request mapping annotations; your implementation classes implement these interfaces — guarantees spec compliance.

### Testing Strategy Decision Tree
```
What layer are you testing?
├── Unit (pure logic) → JUnit 5 + AssertJ
│   Fast (<100ms per test), no infrastructure
│   Test: validation, calculations, transformation, business rules
├── Service (business logic) → JUnit 5 + Mockito
│   Mock repositories, external clients, messaging
│   Verify: service methods, exception handling, transaction boundaries
├── Repository (data access) → @DataJpaTest + Testcontainers
│   Real PostgreSQL/MySQL in Docker, not H2
│   Test: queries, projections, pagination, native queries
├── Controller (HTTP) → @WebMvcTest + MockMvc
│   Slice test: only web layer, mock services
│   Test: serialization, validation, status codes, error responses
└── Integration → @SpringBootTest + Testcontainers + @RestClientTest
    Full context, real DB, real message broker
    Test: end-to-end flows, transaction rollback, async operations
```

### Error Handling Pattern Comparison
```
How to return errors to client?
├── @ControllerAdvice (Spring) → Centralized exception handler
│   @ExceptionHandler per exception type
│   Returns ErrorResponse: code, message, timestamp, path, fieldErrors
├── ExceptionMapper (JAX-RS) → Same concept for Jakarta REST
│   ExceptionMapper<WebApplicationException> implementation
├── Result type (functional, no exceptions) → sealed interface Result<T, E>
│   Match on Success/Error cases, no try/catch branches
│   Good for: domain-driven design, functional modules
└── Problem+JSON (RFC 9457) → Standard error format for HTTP APIs
    type, title, status, detail, instance, errors (custom)
    Spring 6+ / Micronaut have built-in support
```

### Error Response Schema (RFC 9457 Problem+JSON)
```json
{
  "type": "https://api.example.com/errors/order-not-found",
  "title": "Order Not Found",
  "status": 404,
  "detail": "Order with ID 12345 does not exist",
  "instance": "/api/orders/12345",
  "errors": {
    "orderId": "must be a positive integer"
  }
}
```

### Performance Optimization (Expanded)

- **`record` for DTOs**: Immutable, no boilerplate, value-based equality. 40% less bytecode than equivalent POJO.
- **Stream API overhead**: For small collections (<100), traditional for-loop is 2-3x faster. Use streams for readability at scale.
- **`StringBuilder` in loops**: `a + b + c` compiles to `new StringBuilder().append(a).append(b).append(c)` — fine for 2-3 concats. Use explicit `StringBuilder` for loops.
- **`ConcurrentHashMap.computeIfAbsent`**: Thread-safe memoization pattern. More efficient than `putIfAbsent` for expensive computations.
- **Connection pooling**: HikariCP (default Spring Boot) — set `maximumPoolSize=10-20` for most apps. Benchmark to find optimal.
- **`byte[]` vs `List<Byte>`**: Primitive arrays are 8x more memory efficient than boxed collections.
- **`ThreadLocal` for non-thread-safe resources**: `SimpleDateFormat`, `Random`, `DateTimeFormatter` — reuse instances via ThreadLocal instead of creating per-call.
- **`-XX:+UseZGC` for low latency**: Sub-millisecond GC pauses. Best for latency-sensitive services. Slightly more CPU than G1GC.
- **`-XX:+AlwaysPreTouch`**: Pre-allocate and touch all heap pages at startup. Slower startup but consistent runtime performance.
- **Record classes as DTOs**: Endorsed by Spring/Jackson — no special config needed for serialization.

### Anti-Patterns (Expanded)

- **`@Autowired` field injection**: Makes testing with Mockito difficult (final fields, no constructor). Use constructor injection.
- **`@Data` on JPA entities**: Lombok `@Data` generates `equals()`/`hashCode()` based on all fields — causes issues with lazy loading proxies and bidirectional relationships.
- **Spring `@Transactional` on private methods**: Spring applies transaction via proxy — private methods bypass the proxy. Only public methods can be `@Transactional`.
- **`Thread.sleep()` for async coordination**: Fragile, slow, flaky. Use `CountDownLatch`, `CompletableFuture`, or `Awaitility`.
- **Handling `InterruptedException` poorly**: Swallowing or `Thread.currentThread().interrupt()` incorrectly. Restore interrupt flag: `Thread.currentThread().interrupt()` and re-throw or return.
- **`instanceof` checks after pattern matching (Java 16+)**: Switch pattern matching and `if (x instanceof Foo f)` eliminate most `instanceof` chains. Use them.
- **`java.util.Date` and `java.util.Calendar`**: Legacy, mutable, confusing. Use `java.time.*` API (Java 8+): `Instant`, `LocalDate`, `ZonedDateTime`, `Duration`.
- **`@RequestMapping` on field instead of method**: Controller field-level mapping is confusing. Each method should have explicit `@GetMapping`/`@PostMapping`.
- **Reading `InputStream` without closing**: Always use try-with-resources for `InputStream`, `Connection`, `Statement`, `ResultSet`.
- **Static utility classes calling Spring beans**: Static methods can't be mocked. Make utility classes injectable beans or pass dependencies as parameters.

## Reactive Programming (Spring WebFlux)

For high-throughput, low-latency services, use WebFlux with Project Reactor. Key types: `Mono<T>` (0-1 items) and `Flux<T>` (0-N items). Operators: `.map()`, `.flatMap()`, `.filter()`, `.zipWith()`, `.retry()`, `.timeout()`. Backpressure: subscriber controls data flow rate. Database: R2DBC (reactive SQL), MongoDB Reactive Streams, Redis Reactive. Anti-patterns: (a) blocking call in reactive pipeline (`.block()` defeats the purpose), (b) not subscribing (nothing happens without subscriber), (c) shared mutable state, (d) long computations on the event loop (use `.publishOn(Schedulers.boundedElastic())`). WebClient over RestTemplate for all HTTP calls. Trace with `reactor.core.publisher.Hooks.onOperatorDebug()`.

## Code Examples — Virtual Threads
```java
// Java 21+ — Virtual thread HTTP client
var executor = Executors.newVirtualThreadPerTaskExecutor();

List<CompletableFuture<String>> futures = urls.stream()
    .map(url -> CompletableFuture.supplyAsync(() -> fetchUrl(url), executor))
    .toList();

var results = futures.stream()
    .map(CompletableFuture::join)
    .toList();

// Structured concurrency
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Future<String> user = scope.fork(() -> fetchUser(id));
    Future<List<Order>> orders = scope.fork(() -> fetchOrders(id));
    scope.join();
    scope.throwIfFailed();
    return new UserDashboard(user.resultNow(), orders.resultNow());
}
```

## References
- `references/streams-optional.md` — Stream API, Optional patterns
- `references/records-sealed-classes.md` — Records, sealed classes, pattern matching
- `references/java-fundamentals.md` — Java Fundamentals
- `references/java-advanced.md` — Advanced Java Patterns
- `references/java-testing.md` — Java Testing Guide

## Handoff
- `mobile/android` — Android-specific Java/Kotlin patterns
- `mobile/universal/testing` — JUnit, Mockito, integration testing
- `mobile/universal/performance` — JVM tuning, profiling
- `mobile/universal/networking` — HTTP clients, gRPC
