# Micronaut Setup Guide

## CLI Installation
```bash
# SDKMan
sdk install micronaut 4.3.0

# Create project
mn create-app com.example.order-service \
  --build gradle \
  --lang java \
  --features postgres,data-jdbc,validation,graalvm

# Run in dev mode
mn run
```

## build.gradle.kts
```kotlin
plugins {
  id("io.micronaut.application") version "4.2.1"
  id("io.micronaut.aot") version "4.2.1"
}

micronaut {
  runtime("netty")
  testRuntime("junit5")
  processing {
    incremental(true)
    annotations("com.example.*")
  }
  aot {
    optimizeServiceLoading = true
    convertYamlToJava = true
    precomputeOperations = true
  }
}

dependencies {
  annotationProcessor("io.micronaut:micronaut-http-validation")
  implementation("io.micronaut:micronaut-http-client")
  implementation("io.micronaut:micronaut-jackson-databind")
  implementation("io.micronaut.data:micronaut-data-jdbc")
  implementation("io.micronaut.sql:micronaut-jdbc-hikari")
  runtimeOnly("ch.qos.logback:logback-classic")
  runtimeOnly("org.postgresql:postgresql")
}
```

## application.yml
```yaml
micronaut:
  application:
    name: orderService
  server:
    port: 8080
    netty:
      max-chunk-size: 8MB
  http:
    client:
      read-timeout: 30s

datasources:
  default:
    url: ${JDBC_URL:`jdbc:postgresql://localhost:5432/orders`}
    driverClassName: org.postgresql.Driver
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:}
    schema-generate: NONE
    dialect: POSTGRES

jackson:
  serialization:
    writeDatesAsTimestamps: false
    writeEnumsUsingToString: true
```

## Application Entry Point
```java
import io.micronaut.runtime.Micronaut;

public class Application {
  public static void main(String[] args) {
    Micronaut.run(Application.class, args);
  }
}
```

## Configuration Properties
```java
@ConfigurationProperties("app")
public class AppConfig {
  private String environment;
  private int maxPageSize = 100;

  public String getEnvironment() { return environment; }
  public void setEnvironment(String environment) { this.environment = environment; }
  public int getMaxPageSize() { return maxPageSize; }
  public void setMaxPageSize(int maxPageSize) { this.maxPageSize = maxPageSize; }
}
```

## Environment-Specific Config
```yaml
# application-dev.yml
micronaut:
  server:
    port: 8081

# application-prod.yml
micronaut:
  server:
    port: 80
```

## Key Annotations

| Annotation | Scope |
|---|---|
| `@Singleton` | Single instance per JVM |
| `@Prototype` | New instance per injection |
| `@Context` | Eager singleton |
| `@Requires` | Conditional bean |
| `@Bean` | Factory method |
| `@Factory` | Bean factory class |
| `@EachProperty` | Dynamic configuration |
| `@EachBean` | Per-configuration bean |

## Declarative HTTP Client Config
```yaml
micronaut:
  http:
    services:
      inventory:
        urls:
          - "http://inventory:8081"
        read-timeout: 5s
```
