# Spring Cloud Gateway

## Dependencies

```groovy
// build.gradle
implementation 'org.springframework.cloud:spring-cloud-starter-gateway'
implementation 'org.springframework.cloud:spring-cloud-starter-circuitbreaker-reactor-resilience4j'
implementation 'org.springframework.boot:spring-boot-starter-data-redis-reactive'
implementation 'org.springframework.cloud:spring-cloud-starter-netflix-eureka-client'
```

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-circuitbreaker-reactor-resilience4j</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
</dependency>
```

## Application Configuration

```yaml
# application.yml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
            - Method=GET,POST,PUT,DELETE
          filters:
            - StripPrefix=1
            - name: RequestRateLimiter
              args:
                key-resolver: "#{@userKeyResolver}"
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200
                redis-rate-limiter.requestedTokens: 1
            - name: CircuitBreaker
              args:
                name: userServiceCB
                fallbackUri: forward:/fallback/users
            - name: Retry
              args:
                retries: 3
                statuses: BAD_GATEWAY, SERVICE_UNAVAILABLE, GATEWAY_TIMEOUT
                methods: GET
                backoff:
                  firstBackoff: 100ms
                  maxBackoff: 1s
                  factor: 2
            - name: DedupeResponseHeader
              args:
                strategy: RETAIN_FIRST
            - AddRequestHeader=X-Gateway, spring-cloud-gateway
            - AddResponseHeader=X-Gateway-Version, 1.0

        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=1
            - name: CircuitBreaker
              args:
                name: orderServiceCB

        - id: websocket-proxy
          uri: lb:ws://notification-service
          predicates:
            - Path=/ws/**
          filters:
            - StripPrefix=1

      default-filters:
        - name: RequestHeaderToRequestUriFilter
        - DedupeResponseHeader=Access-Control-Allow-Origin

  redis:
    host: redis.internal
    port: 6379

server:
  port: 8080
  compression:
    enabled: true
    mime-types: application/json,application/xml,text/plain
    min-response-size: 1024

resilience4j:
  circuitbreaker:
    configs:
      default:
        sliding-window-size: 10
        minimum-number-of-calls: 5
        failure-rate-threshold: 50
        wait-duration-in-open-state: 60s
        permitted-number-of-calls-in-half-open-state: 3
        automatic-transition-from-open-to-half-open-enabled: true
        record-exceptions:
          - org.springframework.cloud.gateway.support.TimeoutException
          - java.util.concurrent.TimeoutException
          - java.net.ConnectException
    instances:
      userServiceCB:
        base-config: default
  timelimiter:
    configs:
      default:
        timeout-duration: 10s
    instances:
      userServiceCB:
        timeout-duration: 5s
```

## Route Configuration (Java DSL)

```java
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRoutes(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("user-service", r -> r
                .path("/api/users/**")
                .and().method("GET", "POST", "PUT", "DELETE")
                .filters(f -> f
                    .stripPrefix(1)
                    .requestRateLimiter(c -> c
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver()))
                    .circuitBreaker(c -> c
                        .setName("userServiceCB")
                        .setFallbackUri(URI.create("forward:/fallback/users")))
                    .retry(config -> config
                        .setRetries(3)
                        .setStatuses(HttpStatus.BAD_GATEWAY, HttpStatus.SERVICE_UNAVAILABLE)
                        .setBackoff(Duration.ofMillis(100), Duration.ofSeconds(1), 2, true))
                    .addRequestHeader("X-Gateway", "spring-cloud"))
                .uri("lb://user-service"))
            .route("order-service", r -> r
                .path("/api/orders/**")
                .filters(f -> f
                    .stripPrefix(1)
                    .circuitBreaker(c -> c
                        .setName("orderServiceCB")))
                .uri("lb://order-service"))
            .build();
    }

    @Bean
    public RedisRateLimiter redisRateLimiter() {
        return new RedisRateLimiter(100, 200, 1);
    }

    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            String apiKey = exchange.getRequest().getHeaders()
                .getFirst("X-API-Key");
            String userId = exchange.getRequest().getHeaders()
                .getFirst("X-User-ID");
            return Mono.justOrEmpty(apiKey != null ? apiKey : userId)
                .defaultIfEmpty("anonymous");
        };
    }
}
```

## Security with Spring Cloud Gateway + OAuth2

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com
          jwk-set-uri: https://auth.example.com/.well-known/jwks.json

  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=1
            - TokenRelay=
```

```java
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityFilterChain(ServerHttpSecurity http) {
        http
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/api/public/**").permitAll()
                .pathMatchers("/api/admin/**").hasRole("ADMIN")
                .pathMatchers("/api/users/**").hasAuthority("SCOPE_read:users")
                .anyExchange().authenticated())
            .oauth2ResourceServer(OAuth2ResourceServerSpec::jwt)
            .csrf(ServerHttpSecurity.CsrfSpec::disable);
        return http.build();
    }
}
```

## Request/Response Filter Examples

```java
@Component
public class CustomGlobalFilter implements GlobalFilter, Ordered {

    private static final Set<String> TRACE_HEADERS = Set.of(
        "x-request-id", "traceparent", "tracestate");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest().mutate()
            .header("X-Request-ID", UUID.randomUUID().toString())
            .header("X-Gateway-Start", String.valueOf(System.currentTimeMillis()))
            .build();

        return chain.filter(exchange.mutate().request(request).build())
            .then(Mono.fromRunnable(() -> {
                ServerHttpResponse response = exchange.getResponse();
                long start = Long.parseLong(
                    request.getHeaders().getFirst("X-Gateway-Start"));
                response.getHeaders().set("X-Gateway-Latency",
                    String.valueOf(System.currentTimeMillis() - start));
                response.getHeaders().remove("Server");
                response.getHeaders().remove("X-Powered-By");
            }));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
```

## WebSocket Support

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: websocket-proxy
          uri: lb:ws://notification-service
          predicates:
            - Path=/ws/**
          filters:
            - StripPrefix=1
            - DedupeResponseHeader=Sec-WebSocket-Protocol
```

## Rate Limiting with Key Resolver

```java
@Bean
public KeyResolver ipKeyResolver() {
    return exchange -> Mono.just(
        exchange.getRequest().getRemoteAddress().getAddress().getHostAddress());
}

@Bean
public KeyResolver apiKeyResolver() {
    return exchange -> Mono.justOrEmpty(
        exchange.getRequest().getHeaders().getFirst("X-API-Key"))
        .defaultIfEmpty("anonymous");
}

@Bean
public KeyResolver compositeKeyResolver() {
    return exchange -> {
        String apiKey = exchange.getRequest().getHeaders().getFirst("X-API-Key");
        String ip = exchange.getRequest().getRemoteAddress()
            .getAddress().getHostAddress();
        return Mono.just(apiKey != null ? apiKey : ip);
    };
}
```

## Global CORS Configuration

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "https://app.example.com"
              - "https://admin.example.com"
            allowedMethods:
              - GET
              - POST
              - PUT
              - DELETE
              - OPTIONS
            allowedHeaders:
              - Authorization
              - Content-Type
              - X-Request-ID
              - X-API-Key
            exposedHeaders:
              - X-RateLimit-Remaining
              - X-Request-ID
            allowCredentials: true
            maxAge: 86400
```

## Metrics and Observability

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,gateway
  metrics:
    tags:
      application: api-gateway
    distribution:
      slo:
        - http.server.requests
      percentiles-histogram:
        http.server.requests: true
  tracing:
    sampling:
      probability: 1.0
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

## Graceful Shutdown

```yaml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```
