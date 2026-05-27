# Micronaut Configuration Reference

## Application Configuration Files

Micronaut supports layered configuration through multiple sources.

```yaml
# application.yml — default configuration
micronaut:
  application:
    name: order-service
  server:
    port: 8080
    max-request-size: 10MB
  caches:
    inventory:
      maximum-size: 1000
      expire-after-write: 10m
```

```yaml
# bootstrap.yml — loaded before application.yml
micronaut:
  config-client:
    enabled: true
  config-server:
    uri: http://localhost:8888
```

## Environment-Specific Configuration

```yaml
# application-dev.yml
micronaut:
  server:
    port: 8081
datasources:
  default:
    url: jdbc:h2:mem:dev
```

```yaml
# application-prod.yml
micronaut:
  server:
    port: 8080
datasources:
  default:
    url: jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
```

## Property Sources

```java
@Singleton
public class ConfigProperties {
    @Property(name = "app.max-connections")
    private int maxConnections;
    
    @Property(name = "app.feature-flags.new-checkout")
    private boolean newCheckoutEnabled;
}
```

### Type-Safe Configuration

```java
@ConfigurationProperties("app.datasource")
public class DataSourceConfig {
    private String url;
    private String username;
    private String password;
    private PoolConfig pool;
    
    // getters and setters
}

@ConfigurationProperties("app.datasource.pool")
public class PoolConfig {
    private int maxSize = 10;
    private int minIdle = 2;
    private long connectionTimeout = 30000;
}
```

### @EachProperty for Collections

```java
@EachProperty("app.datasources")
public class MultiDataSourceConfig {
    private String url;
    private String username;
    private String password;
}
```

```yaml
app:
  datasources:
    primary:
      url: jdbc:postgresql://localhost:5432/db1
      username: user1
      password: pass1
    reporting:
      url: jdbc:postgresql://localhost:5432/db2
      username: user2
      password: pass2
```

## Configuration Encryption

```yaml
micronaut:
  security:
    configuration:
      encrypt:
        enabled: true
        key: ${ENCRYPTION_KEY}
```

Access encrypted values with `{cipher}` prefix:

```yaml
datasources:
  default:
    password: "{cipher}AQAxN2U5Zj..."
```

## Refreshable Configuration

```java
@Singleton
@Refreshable
public class FeatureFlags {
    @Property(name = "app.features.new-ui")
    private boolean newUi;
    
    @Property(name = "app.features.beta-program")
    private boolean betaProgram;
}
```

Trigger refresh via endpoints or management bus.

## Configuration Validation

```java
@ConfigurationProperties("app.service")
@Requires(property = "app.service.url")
public class ServiceConfig {
    @NotBlank
    private String url;
    
    @Positive
    private int timeout = 5000;
    
    @Min(1)
    @Max(10)
    private int retryCount = 3;
}
```

## Custom Configuration Source

```java
@Singleton
public class VaultConfigSource implements PropertySourceLocator {
    @Override
    public PropertySource<?> locate(Environment env) {
        Map<String, Object> secrets = new HashMap<>();
        secrets.put("db.password", vaultService.fetchSecret("db/password"));
        return PropertySource.of("vault", secrets);
    }
}
```

## Configuration Factories

```java
@Factory
public class HttpClientFactory {
    @Bean
    @Requires(property = "http.client.enabled", value = "true")
    public HttpClient httpClient(
            @Value("${http.client.timeout:5000}") Duration timeout,
            @Value("${http.client.max-connections:50}") int maxConns) {
        return HttpClient.newBuilder()
            .connectTimeout(timeout)
            .executor(Executors.newFixedThreadPool(maxConns))
            .build();
    }
}
```

## Conditional Configuration

```yaml
micronaut:
  jms:
    ibmmq:
      enabled: false
```

```java
@Bean
@Requires(property = "micronaut.jms.ibmmq.enabled", value = "true")
@Requires(bean = JmsConnectionFactory.class)
public IbmMqConnector ibmMqConnector(JmsConnectionFactory factory) {
    return new IbmMqConnector(factory);
}
```

## Environment Detection

```java
@Singleton
public class EnvironmentService {
    private final Environment environment;
    
    public EnvironmentService(Environment environment) {
        this.environment = environment;
    }
    
    public boolean isDevelopment() {
        return environment.getActiveNames().contains("dev");
    }
    
    public boolean isProduction() {
        return environment.getActiveNames().contains("prod");
    }
}
```

## Externalized Configuration

```yaml
micronaut:
  config-client:
    enabled: true
    http:
      uri: http://config-server:8888
      basic-auth:
        username: ${CONFIG_USER}
        password: ${CONFIG_PASS}
```

## Configuration Metadata

Generate configuration metadata for IDE support:

```xml
<dependency>
    <groupId>io.micronaut</groupId>
    <artifactId>micronaut-inject</artifactId>
    <scope>provided</scope>
</dependency>
```

```java
@ConfigurationProperties("app.cache")
@Requires(property = "app.cache.enabled")
public class CacheConfig {
    @Positive
    private int ttlSeconds;
    
    @NotBlank
    private String provider;
}
```

## Key Points

- Layered configuration loads in order: bootstrap → application → environment-specific
- `@ConfigurationProperties` provides type-safe configuration binding
- `@EachProperty` maps collections of properties to beans
- `@Refreshable` beans can be reconfigured at runtime
- Conditional beans with `@Requires` only activate when properties are set
- Encryption protects sensitive values in configuration files
- Custom property sources integrate external systems like Vault
- Configuration factories create beans with parameterized settings
- Environment detection allows environment-specific behavior
- Config clients externalize configuration to centralized servers
