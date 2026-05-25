# Quarkus Deployment

## Native Image Build

```bash
# Maven
mvn package -Pnative -Dquarkus.native.container-build=true

# Gradle
./gradlew build -Dquarkus.native.container-build=true

# Build for specific platform
mvn package -Pnative \
  -Dquarkus.native.container-build=true \
  -Dquarkus.container-image.build=true

# Build result
# ./target/order-service-1.0.0-runner  (Linux binary)
```

## Docker Deployment

```dockerfile
# Stage 1: Build
FROM maven:3-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -Pnative -Dquarkus.native.container-build=true

# Stage 2: Run
FROM registry.access.redhat.com/ubi8/ubi-minimal:8.9
WORKDIR /work/
COPY --from=build /app/target/*-runner /work/application
RUN chmod 775 /work/application
EXPOSE 8080
CMD ["./application", "-Dquarkus.http.host=0.0.0.0"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - QUARKUS_PROFILE=prod
      - QUARKUS_DATASOURCE_REACTIVE_URL=postgresql://db:5432/orders
      - QUARKUS_DATASOURCE_USERNAME=postgres
      - QUARKUS_DATASOURCE_PASSWORD=${DB_PASS}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/q/health"]
      interval: 30s
      timeout: 3s
```

## CI/CD Pipeline

```yaml
name: Build and Deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: graalvm/setup-graalvm@v1
        with:
          java-version: '21'
          distribution: 'graalvm'
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - name: Build native
        run: mvn package -Pnative -Dquarkus.native.container-build=true
      - name: Docker build and push
        run: |
          docker build -f src/main/docker/Dockerfile.native -t app .
          docker tag app registry.example.com/app:${{ github.sha }}
          docker push registry.example.com/app:${{ github.sha }}
```

## Platform Deployments

| Platform | Method | Notes |
|----------|--------|-------|
| **AWS Lambda** | Custom runtime | quarkus-amazon-lambda extension |
| **Google Cloud Run** | Docker deploy | Native binary, fast cold start |
| **Azure Functions** | Custom handler | quarkus-azure-functions |
| **Kubernetes** | Helm chart | quarkus-kubernetes extension |
| **OpenShift** | S2I builder | Native OpenShift integration |
| **Heroku** | JAR deploy | Use heroku.yml with native |
| **Vercel** | Edge functions | Limited Quarkus support |

## Production Configuration

```properties
# application-prod.properties
quarkus.http.port=8080
quarkus.http.host=0.0.0.0
quarkus.log.level=WARN
quarkus.log.min-level=INFO
quarkus.http.limits.max-body-size=10M
quarkus.native.additional-build-args=--enable-url-protocols=http,https

# Metrics
quarkus.micrometer.enabled=true
quarkus.micrometer.export.prometheus.enabled=true
quarkus.micrometer.export.prometheus.path=/metrics

# Health
quarkus.health.extensions.enabled=true
quarkus.smallrye-health.root-path=/q/health
```

## Health Checks

```java
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.Readiness;

@Readiness
@ApplicationScoped
public class DatabaseHealthCheck implements HealthCheck {
    @Inject
    io.vertx.mutiny.pgclient.PgPool pool;

    @Override
    public HealthCheckResponse call() {
        boolean up = pool.query("SELECT 1").execute()
            .await().indefinitely().size() == 1;
        return HealthCheckResponse.named("database")
            .status(up)
            .build();
    }
}
```

## Startup Performance

| Mode | Startup | First Response | Memory | Image |
|------|---------|---------------|--------|-------|
| JVM (JIT) | 3-6s | 100-200ms | 150-300MB | 50MB |
| Native (GraalVM) | 20-50ms | 1-5ms | 15-40MB | 20-50MB |
| Native (optimized) | 10-30ms | 1-3ms | 10-25MB | 15-30MB |

## Scale-to-Zero with Knative

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
        - image: registry.example.com/order-service:latest
          env:
            - name: QUARKUS_PROFILE
              value: prod
```

## Continuous Testing (Dev Mode)

```bash
mvn quarkus:dev
# Tests re-run automatically on code changes
# Dev UI available at http://localhost:8080/q/dev
```
