# Spring Boot Deployment

## Docker Image

```dockerfile
FROM eclipse-temurin:21-jre as builder
WORKDIR /app
COPY build/libs/app.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader/ ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DB_URL: jdbc:postgresql://db:5432/orders
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: orders
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

## Profile Configuration

```yaml
# application-prod.yml
spring:
  datasource:
    url: ${DB_URL}
    hikari:
      maximum-pool-size: 20
  jpa:
    hibernate:
      ddl-auto: validate

server:
  tomcat:
    threads:
      max: 200
    max-connections: 8192

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
```

## Health Checks

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try (var conn = dataSource.getConnection()) {
            return conn.isValid(2)
                ? Health.up().build()
                : Health.down().build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

## Graceful Shutdown

```yaml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

## Performance Tuning

```yaml
# Tomcat
server:
  tomcat:
    threads:
      max: 200           # default 200
      min-spare: 10       # default 10
    max-connections: 8192 # default 8192
    accept-count: 100     # default 100
    connection-timeout: 20000

# Thread pool for @Async
spring:
  task:
    execution:
      pool:
        core-size: 8
        max-size: 20
        queue-capacity: 100
```

## Gradle Build

```gradle
plugins {
    id 'org.springframework.boot' version '3.3.0'
    id 'io.spring.dependency-management' version '1.1.5'
}

bootBuildImage {
    imageName = "${project.name}:${version}"
    builder = "paketobuildpacks/builder-jammy-tiny"
}

bootJar {
    layered {
        enabled = true
    }
}
```
