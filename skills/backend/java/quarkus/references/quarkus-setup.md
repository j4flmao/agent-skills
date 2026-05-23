# Quarkus Setup Guide

## CLI Installation
```bash
# SDKMan
sdk install quarkus 3.6.0

# Create project
quarkus create app com.example:order-service \
  --extension='resteasy-reactive,reactive-pg-client,hibernate-validator,smallrye-openapi'

# Dev mode (live reload)
quarkus dev
```

## Project Structure
```
src/main/java/com/example/
├── OrderResource.java
├── OrderService.java
├── OrderRepository.java
└── model/
    ├── Order.java
    └── OrderStatus.java
```

## application.properties Reference

| Property | Purpose |
|---|---|
| `quarkus.http.port` | HTTP server port |
| `quarkus.http.cors` | CORS configuration |
| `quarkus.datasource.db-kind` | DB type (postgresql, mysql, h2) |
| `quarkus.hibernate-orm.database.generation` | Schema strategy (none, update, drop-and-create) |
| `quarkus.native.container-build` | Build native in Docker |
| `quarkus.swagger-ui.always-include` | Include Swagger UI in production |

## Jib Container Build
```xml
<plugin>
  <groupId>io.quarkus.platform</groupId>
  <artifactId>quarkus-maven-plugin</artifactId>
  <executions>
    <execution>
      <goals><goal>build</goal></goals>
      <configuration>
        <jib><from>registry.access.redhat.com/ubi8/openjdk-17</from></jib>
      </configuration>
    </execution>
  </executions>
</plugin>
```

## Native Build Commands
```bash
# JIT
mvn package -Dquarkus.package.type=uber-jar
java -jar target/order-service-runner.jar

# Native (requires GraalVM)
mvn package -Dnative
./target/order-service-runner

# Container-native
mvn package -Dnative -Dquarkus.native.container-build=true
docker build -f src/main/docker/Dockerfile.native -t order-service .
```

## Dev Services
```properties
# Automatically starts PostgreSQL via Testcontainers in dev/test
quarkus.datasource.db-kind=postgresql
quarkus.datasource.devservices.port=5432
quarkus.hibernate-orm.database.generation=drop-and-create
```

## Live Reload

| Change Type | Reload Behavior |
|---|---|
| Java source | Auto-reload on save |
| application.properties | Auto-reload on save |
| static resources | Instant |
| New dependency | Requires rerun |

## Extensions Catalog

| Extension | Usage |
|---|---|
| `resteasy-reactive` | Reactive REST endpoints |
| `hibernate-orm-panache` | Active record ORM |
| `reactive-pg-client` | Reactive PostgreSQL |
| `smallrye-reactive-messaging` | Event streaming (Kafka, AMQP) |
| `quarkus-amazon-lambda` | AWS Lambda deployment |
| `container-image-docker` | Docker image generation |

## Continuous Testing
```bash
quarkus test
# Tests re-run automatically on code changes
# Use @QuarkusTest for standard, @QuarkusIntegrationTest for full-stack
```
