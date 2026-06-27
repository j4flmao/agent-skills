---
name: micronaut
description: >
  Use this skill when building Micronaut applications — compile-time DI, reactive HTTP server, AOT optimization, GraalVM native image. This skill enforces: annotation-based configuration, compile-time DI (no reflection), reactive programming with Project Reactor, declarative HTTP clients, and AOT compilation. Requires JDK 17+ and Micronaut 4+. Do NOT use for: Spring Boot, Quarkus, Jakarta EE, or non-Micronaut Java frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, java, micronaut, phase-7]
---

# Micronaut

## Purpose
Build Micronaut applications with compile-time dependency injection, reactive HTTP servers, AOT compilation, GraalVM native image support, and declarative HTTP clients.

## Agent Protocol

### Trigger
User request includes: `Micronaut`, `micronaut framework`, `micronaut DI`, `micronaut reactive`, `micronaut controller`, `micronaut client`, `micronaut native image`, `micronaut graalvm`.

### Input Context
- JDK version (17+, 21+)
- Micronaut version (4.x)
- Build tool (Gradle, Maven)
- Database (JDBC, R2DBC, MongoDB)
- Features (Reactive, Declarative Client, AOT, Security)

### Output Artifact
Project setup, controller pattern, DI configuration, client setup, native image config.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging.

### Completion Criteria
- Application class with @Singleton beans
- Controller with @Get/@Post/@Body/@QueryValue
- Declarative @Client for HTTP calls
- Configuration via @ConfigurationProperties
- Native image configuration for GraalVM
- Reactive endpoints with Mono/Flux

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Micronaut vs Spring Boot vs Quarkus

| Criterion | Micronaut | Spring Boot | Quarkus |
|-----------|-----------|-------------|---------|
| Startup time | < 100ms (AOT) | 2-5s (reflection) | < 200ms (AOT) |
| Memory footprint | ~50MB | ~200MB | ~100MB |
| Native image | GraalVM first-class | Spring Native 3+ | GraalVM first-class |
| DI approach | Compile-time (annotation processing) | Runtime (reflection) | Runtime + Quarkus Arc |
| Reactive support | Netty (built-in) | WebFlux | Vert.x |
| Gradle/Maven | Excellent | Excellent | Excellent |

Decision: Fast startup + low memory → Micronaut. Full Spring ecosystem → Spring Boot. Fast + Funqy/extension-first → Quarkus.

### Reactive vs Imperative Controllers

| Aspect | Reactive (Mono/Flux) | Imperative (POJO) |
|--------|---------------------|-------------------|
| Thread model | Event loop | Request-per-thread |
| Database | R2DBC (reactive) | JDBC (blocking) |
| Error handling | Operators (onErrorReturn) | try/catch |
| Testing | StepVerifier | JUnit assertions |
| Stack depth | Sometimes harder to debug | Predictable |

Decision: High concurrency with few DB connections → Reactive. Traditional CRUD with JDBC → Imperative.

## Workflow

### Step 1: Project Setup (Gradle)

```groovy
// build.gradle
plugins {
    id 'io.micronaut.application' version '4.3.0'
    id 'io.micronaut.aot' version '4.3.0'
}

micronaut {
    version = '4.3.0'
    runtime = 'netty'
    testRuntime = 'junit5'
    processing {
        incremental(true)
        annotations('com.example.*')
    }
    aot {
        optimizeServiceLoading = true
        convertYamlToJava = true
        precomputeOperations = true
        optimizeNetty = true
    }
}

dependencies {
    annotationProcessor 'io.micronaut:micronaut-http-validation'
    annotationProcessor 'io.micronaut.serde:micronaut-serde-processor'
    implementation 'io.micronaut:micronaut-http-server-netty'
    implementation 'io.micronaut.serde:micronaut-serde-jackson'
    implementation 'io.micronaut.data:micronaut-data-jdbc'
    implementation 'io.micronaut.sql:micronaut-jdbc-hikari'
    implementation 'io.micronaut:micronaut-validation'
    runtimeOnly 'org.postgresql:postgresql'
    testImplementation 'io.micronaut.test:micronaut-test-junit5'
}
```

### Step 2: Application and Configuration

```java
// src/main/java/com/example/Application.java
@Micronaut
public class Application {
    public static void main(String[] args) {
        Micronaut.run(Application.class, args);
    }
}

// src/main/resources/application.yml
micronaut:
  server:
    port: 8080
    netty:
      max-header-size: 8192
      worker:
        threads: 8
  http:
    client:
      read-timeout: 30s

datasources:
  default:
    url: ${JDBC_URL:`jdbc:postgresql://localhost:5432/mydb`}
    driverClassName: org.postgresql.Driver
    username: ${DB_USER:postgres}
    password: ${DB_PASS:postgres}
    schema-generate: NONE
    dialect: POSTGRES

jackson:
  serialization:
    writeDatesAsTimestamps: false
  deserialization:
    failOnUnknownProperties: false
```

### Step 3: Controller Patterns

```java
// src/main/java/com/example/controller/UserController.java
@Controller("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Get
    public HttpResponse<List<UserDTO>> list(@QueryValue(defaultValue = "1") int page,
                                              @QueryValue(defaultValue = "20") int limit) {
        return HttpResponse.ok(userService.findAll(page, limit));
    }

    @Get("/{id}")
    public HttpResponse<UserDTO> getById(@PathVariable UUID id) {
        return userService.findById(id)
            .map(HttpResponse::ok)
            .orElse(HttpResponse.notFound());
    }

    @Post
    public HttpResponse<UserDTO> create(@Body @Valid CreateUserRequest request) {
        UserDTO created = userService.create(request);
        return HttpResponse.created(created);
    }

    @Put("/{id}")
    public HttpResponse<UserDTO> update(@PathVariable UUID id, @Body @Valid UpdateUserRequest request) {
        UserDTO updated = userService.update(id, request);
        return HttpResponse.ok(updated);
    }

    @Delete("/{id}")
    public HttpResponse<?> delete(@PathVariable UUID id) {
        userService.delete(id);
        return HttpResponse.noContent();
    }
}

// Reactive controller alternative
@Controller("/api/reactive")
public class ReactiveUserController {
    private final ReactiveUserService userService;

    @Get
    public Flux<UserDTO> list() {
        return userService.findAll();
    }

    @Post
    public Mono<HttpResponse<UserDTO>> create(@Body @Valid CreateUserRequest request) {
        return userService.create(request)
            .map(HttpResponse::created);
    }
}
```

### Step 4: Service and Validation

```java
// src/main/java/com/example/service/UserService.java
@Singleton
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;

    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public UserDTO create(CreateUserRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ConflictException("Email already exists");
        }
        User user = new User(request.name(), request.email());
        user = userRepository.save(user);
        emailService.sendWelcome(user);
        return UserDTO.from(user);
    }
}

// src/main/java/com/example/dto/CreateUserRequest.java
@Introspected
public record CreateUserRequest(
    @NotBlank @Size(min = 2, max = 100) String name,
    @NotBlank @Email String email
) {}

// src/main/java/com/example/dto/UserDTO.java
@Introspected
public record UserDTO(UUID id, String name, String email, Instant createdAt) {
    public static UserDTO from(User user) {
        return new UserDTO(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }
}
```

### Step 5: Declarative HTTP Client

```java
// src/main/java/com/example/client/UserApiClient.java
@Client("http://localhost:8081/api")
public interface UserApiClient {
    @Get("/users/{id}")
    UserDTO getUser(@PathVariable UUID id);

    @Post("/users")
    UserDTO createUser(@Body CreateUserRequest request);

    @Get("/users")
    List<UserDTO> listUsers(@QueryValue int page, @QueryValue int limit);
}

// Usage in service
@Singleton
public class UserSyncService {
    private final UserApiClient client;

    public void syncUser(UUID id) {
        try {
            UserDTO remote = client.getUser(id);
            // process
        } catch (HttpClientResponseException e) {
            if (e.getStatus() == HttpStatus.NOT_FOUND) {
                // handle not found
            }
        }
    }
}
```

### Step 6: Data Repository

```java
// src/main/java/com/example/repository/UserRepository.java
@JdbcRepository(dialect = Dialect.POSTGRES)
public interface UserRepository extends CrudRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    @Query("SELECT * FROM users WHERE name ILIKE '%' || :name || '%'")
    List<User> searchByName(@NonNull String name);

    @Query(value = "SELECT COUNT(*) FROM users WHERE active = :active",
           nativeQuery = true)
    long countByActive(boolean active);
}

// src/main/java/com/example/entity/User.java
@Entity
@MappedEntity(value = "users")
public class User {
    @Id
    @GeneratedValue(GeneratedValue.Type.AUTO)
    private UUID id;
    @NonNull
    private String name;
    @NonNull
    private String email;
    private boolean active;
    private Instant createdAt;

    public User(String name, String email) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.email = email;
        this.active = true;
        this.createdAt = Instant.now();
    }
}
```

### Step 7: Global Error Handling

```java
// src/main/java/com/example/handler/GlobalErrorHandler.java
@Produces
@Singleton
@Requires(classes = Throwable.class)
public class GlobalErrorHandler implements ExceptionHandler<Throwable, HttpResponse<?>> {
    private final Logger log = LoggerFactory.getLogger(GlobalErrorHandler.class);

    @Override
    public HttpResponse<?> handle(HttpRequest request, Throwable exception) {
        log.error("Unhandled error: {}", exception.getMessage(), exception);

        return switch (exception) {
            case ConstraintViolationException ex ->
                HttpResponse.badRequest(new ErrorResponse("VALIDATION_ERROR", ex.getMessage()));
            case ConflictException ex ->
                HttpResponse.status(HttpStatus.CONFLICT, new ErrorResponse("CONFLICT", ex.getMessage()));
            case NotFoundException ex ->
                HttpResponse.notFound(new ErrorResponse("NOT_FOUND", ex.getMessage()));
            case HttpClientResponseException ex ->
                HttpResponse.status(ex.getStatus(), new ErrorResponse("UPSTREAM_ERROR", ex.getMessage()));
            default ->
                HttpResponse.serverError(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
        };
    }
}
```

## Implementation Patterns

### Pattern: Configuration Properties

```java
// src/main/java/com/example/config/AppConfig.java
@ConfigurationProperties("app")
public record AppConfig(
    @NotNull JwtConfig jwt,
    @NotNull CorsConfig cors,
    @NotNull PaginationConfig pagination
) {
    public record JwtConfig(@NotBlank String secret, int expirationMinutes) {}
    public record CorsConfig(@NotBlank String origins, boolean credentials) {}
    public record PaginationConfig(int defaultPageSize, int maxPageSize) {}
}
```

## Production Considerations

### AOT Compilation
- Gradle: `gradlew build -Dmicronaut.aot.enabled=true`
- AOT optimizes: service loading, YAML to Java config, bean pre-computation, Netty optimization
- Native image: `gradlew nativeCompile` (requires GraalVM)
- Test native: `gradlew nativeTest`

### Observability
```java
// Export metrics via Prometheus
@Factory
public class MetricsFactory {
    @Bean
    @Requires(property = "micronaut.metrics.export.prometheus.enabled", value = "true")
    public MicrometerMeterRegistry meterRegistry() {
        return new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
    }
}
```

### Health Checks
```java
@Singleton
public class DatabaseHealthIndicator implements HealthIndicator {
    private final DataSource dataSource;

    @Override
    public Publisher<HealthResult> getHealth() {
        return Mono.fromCallable(() -> {
            try (var conn = dataSource.getConnection()) {
                return conn.isValid(5) ?
                    HealthResult.builder().status(HealthStatus.UP).build() :
                    HealthResult.builder().status(HealthStatus.DOWN).build();
            }
        });
    }
}
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Field injection with @Inject | Hard to test, breaks DI in constructor | Constructor injection always |
| Blocking calls in reactive controller | Blocks event loop thread | Use reactive DB (R2DBC) or `@ExecuteOn(TaskExecutors.IO)` |
| No @Valid on request body | Internal server error on bad input | Always add `@Valid` on request body parameters |
| Micronaut Data without dialect | Wrong SQL dialect for DB | Always specify `dialect` |
| Missing @Introspected on DTOs | Serialization fails at compile time | Annotate all serializable records/classes |

## Security Considerations
- Micronaut Security: `@Secured`, `@RolesAllowed` for authorization
- JWT: `micronaut-security-jwt` with token validation at compile-time
- CORS: configure in `application.yml` with `micronaut.server.cors`
- Rate limiting: `micronaut-ratelimiter-core` or gateway-level
- Input validation: `@Valid` + Jakarta Validation annotations
- Secrets: `micronaut-config-kubernetes` or environment variables; never hardcoded

## Testing Strategies

```java
@MicronautTest
class UserControllerTest {
    @Inject
    @Client("/")
    HttpClient client;

    @Test
    void testCreateUser() {
        var request = HttpRequest.POST("/api/users", new CreateUserRequest("Test", "test@test.com"));
        var response = client.toBlocking().exchange(request, UserDTO.class);
        assertEquals(HttpStatus.CREATED, response.getStatus());
        assertNotNull(response.body().id());
    }
}
```

Use `@MockBean` for repository mocking. Use `@MicronautTest(environments = "test")` for isolated config. Test AOT with `gradlew nativeTest`.

## Rules
- All beans use constructor injection — never `@Inject` on fields.
- `@Controller` at class level, one HTTP method annotation per method.
- Reactive controllers return `Mono<T>` or `Flux<T>` for non-blocking endpoints.
- Declarative `@Client` interfaces for external HTTP calls — never manual `HttpClient`.
- `@ConfigurationProperties` for structured config — never inject `Environment` directly.
- `@Valid` on every request body parameter. Custom validators via `@Constraint`.
- Error handling via `@ExceptionHandler` or `Problem+JSON` RFC 7807 responses.
- Native image: annotate all reflection-hungry classes with `@Introspected`.

## References
  - references/micronaut-configuration.md — Micronaut Configuration
  - references/micronaut-data.md — Micronaut Data
  - references/micronaut-deployment.md — Deployment and Native Image
  - references/micronaut-security.md — Micronaut Security
  - references/micronaut-setup.md — Micronaut Setup Guide
  - references/micronaut-testing.md — Testing Micronaut Applications
## Handoff
Hand off to `backend/spring-boot/architecture/SKILL.md` for Spring Boot patterns or `backend/universal/api-response/SKILL.md` for API response formatting.
## Implementation Patterns

### Factory Pattern for Module Creation
`
function createModule<T>(config: ModuleConfig): T {
  const dependencies = initializeDependencies(config);
  const module = new Module(dependencies);
  module.hooks.onInit();
  return module as T;
}
`

### Builder Pattern for Complex Configuration
`
class ConfigBuilder {
  private config: AppConfig = new AppConfig();
  withDatabase(url: string): ConfigBuilder { ... }
  withCache(ttl: number): ConfigBuilder { ... }
  withLogging(level: string): ConfigBuilder { ... }
  build(): AppConfig { return this.config; }
}
`

## Production Considerations

### Deployment Checklist
- [ ] Production build with optimizations enabled
- [ ] Environment variables configured per environment
- [ ] Health check endpoint responds correctly
- [ ] Error tracking and monitoring integrated
- [ ] Logging level configured (not debug in production)
- [ ] Resource limits configured
- [ ] Database migrations applied
- [ ] Static assets built and served from CDN or cache
- [ ] Feature flags toggled appropriately
- [ ] Rollback plan documented and tested

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% | Critical | Rollback or fix |
| p95 latency | > 500ms | Warning | Profile and optimize |
| Uptime | < 99.9% | Critical | Investigate infrastructure |
| Memory usage | > 80% | Warning | Check for leaks |
| CPU usage | > 80% | Warning | Scale up or optimize |

## Rules
- Prefer composition over inheritance
- Favor immutable data structures
- Use dependency injection for testability
- Keep functions pure when possible — no side effects
- Fail fast with clear error messages
- Don't repeat yourself (DRY) — extract shared logic
- Keep it simple (KISS) — avoid unnecessary complexity
- You aren't gonna need it (YAGNI) — build what's required
- Separate concerns — single responsibility per module
- Code to interfaces, not implementations
- Write self-documenting code — clear names over comments
- Prefer standard library over third-party dependencies
- Handle errors explicitly — no silent failures
- Validate inputs at boundaries
- Log at appropriate levels (debug, info, warn, error)