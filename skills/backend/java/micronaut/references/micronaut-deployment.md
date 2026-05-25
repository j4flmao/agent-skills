# Micronaut Deployment

## GraalVM Native Image

```bash
# Build native image with Gradle
./gradlew nativeCompile

# Build with Maven
mvn -Pnative native:compile
```

```xml
<!-- pom.xml — native image plugin -->
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <configuration>
        <buildArgs>
            <buildArg>--enable-url-protocols=http</buildArg>
            <buildArg>--initialize-at-build-time=com.example</buildArg>
        </buildArgs>
    </configuration>
</plugin>
```

## Docker Deployment

```dockerfile
# JIT Dockerfile
FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY . .
RUN ./gradlew assemble

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]

# Native Dockerfile
FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY . .
RUN ./gradlew nativeCompile

FROM alpine:3.19
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=build /app/build/native/nativeCompile/application .
EXPOSE 8080
CMD ["./application"]
```

## Docker Compose

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.native
    ports:
      - "8080:8080"
    environment:
      - MICRONAUT_ENVIRONMENTS=production
      - JDBC_URL=jdbc:postgresql://db:5432/orders
      - DB_USER=postgres
      - DB_PASS=${DB_PASS}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3
  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=orders
      - POSTGRES_PASSWORD=${DB_PASS}
```

## CI/CD Pipeline

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: graalvm/setup-graalvm@v1
        with:
          java-version: '21'
          distribution: 'graalvm'
      - run: ./gradlew check
      - run: ./gradlew nativeCompile
      - name: Build Docker image
        run: docker build -f Dockerfile.native -t app .
      - name: Push to registry
        run: docker push registry.example.com/app:latest
```

## Cloud Platform Deployment

| Platform | Method | Notes |
|----------|--------|-------|
| **AWS Lambda** | Custom runtime | Use micronaut-function-aws |
| **Google Cloud Run** | Docker deploy | Auto-scaling container |
| **Azure Container Apps** | Docker deploy | Serverless containers |
| **Kubernetes** | Helm/Docker | Min 256MB memory |
| **Oracle Cloud** | Native binary | Best GraalVM support |
| **Heroku** | JAR deploy | Use heroku.yml |

## Production Configuration

```yaml
# application-production.yml
micronaut:
  server:
    port: 8080
    max-request-size: 10485760
    netty:
      max-chunk-size: 8MB
      worker-threads: 8
  metrics:
    enabled: true
    export:
      prometheus:
        enabled: true
        step: PT30S
  health:
    enabled: true
    endpoints:
      health:
        sensitive: false
        details-visible: ANONYMOUS
```

## Startup Performance

| Mode | Startup Time | Memory | Image Size |
|------|-------------|--------|------------|
| JIT (JDK 21) | 2-4s | 150-250MB | 50MB |
| GraalVM Native | 30-80ms | 20-40MB | 15-30MB |
| CDS (Class Data Sharing) | 1-2s | 120-200MB | 55MB |

## Health Checks

```java
@Singleton
public class DatabaseHealthIndicator implements HealthIndicator {
    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Publisher<HealthResult> getHealth() {
        return Flowable.just(HealthResult.builder("database")
            .status(checkConnection() ? HealthStatus.UP : HealthStatus.DOWN)
            .build());
    }
}
```

## Serverless Deployment (AWS Lambda)

```java
// Request handler
public class OrderHandler implements FunctionInitializer {
    @Executable
    public OrderResponse createOrder(CreateOrderRequest req) {
        // process order
    }
}
```
