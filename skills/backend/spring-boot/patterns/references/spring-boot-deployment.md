# Spring Boot Deployment

Packaging and running Spring Boot 3.x applications in production: container images (Dockerfile layering or Buildpacks), runtime configuration, health probes, graceful shutdown, JVM sizing in containers, Kubernetes manifests, and native images. Observability is covered in `spring-boot-observability.md`.

## Container Image with Layered Jar

Spring Boot 3.3+ uses the `tools` jar mode for extraction (`layertools` is deprecated):

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre AS extract
WORKDIR /app
COPY --from=build /src/build/libs/*.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 spring
WORKDIR /app
COPY --from=extract /app/extracted/dependencies/ ./
COPY --from=extract /app/extracted/spring-boot-loader/ ./
COPY --from=extract /app/extracted/snapshot-dependencies/ ./
COPY --from=extract /app/extracted/application/ ./
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

Layers order from least to most frequently changing, so dependency layers stay cached between builds. For Boot 3.2 and earlier use `-Djarmode=layertools -jar app.jar extract`.

## Cloud Native Buildpacks

```bash
./gradlew bootBuildImage --imageName=registry.example.com/orders:1.4.0
# Maven
./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=registry.example.com/orders:1.4.0
```

Buildpacks produce layered, non-root images with a memory calculator that sets JVM flags from the container limit. Good default when you do not need a custom Dockerfile.

## Local Compose Stack

```yaml
# compose.yaml
services:
  app:
    image: registry.example.com/orders:1.4.0
    ports: ["8080:8080"]
    environment:
      SPRING_PROFILES_ACTIVE: prod
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/orders
      SPRING_DATASOURCE_USERNAME: orders
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
    depends_on:
      db: { condition: service_healthy }
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: orders
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orders"]
      interval: 5s
      retries: 10
```

The Compose `version:` key is obsolete and omitted. Spring Boot's `spring-boot-docker-compose` module can start a `compose.yaml` automatically during local development.

## Production Configuration

```yaml
# application-prod.yml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    hikari:
      maximum-pool-size: 20
      connection-timeout: 3000
  jpa:
    hibernate:
      ddl-auto: validate          # schema managed by Flyway/Liquibase
    open-in-view: false
  flyway:
    enabled: true
  lifecycle:
    timeout-per-shutdown-phase: 30s
server:
  shutdown: graceful
  forward-headers-strategy: framework   # behind a proxy/ingress
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      probes:
        enabled: true
      show-details: never
  server:
    port: 8081                  # actuator on a separate port, not exposed publicly
```

- Externalize configuration via environment variables, mounted config files, or Spring Cloud Config/Kubernetes ConfigMaps; secrets via a secret manager or Kubernetes Secrets synced by External Secrets Operator.
- Pool size: total connections across replicas must fit database limits.

## Health Probes

With probes enabled (automatic on Kubernetes), Actuator exposes:
- `/actuator/health/liveness`: application state is not broken (do not include DB checks).
- `/actuator/health/readiness`: ready to accept traffic.

Add a dependency to readiness only when the app cannot serve anything without it:

```yaml
management.endpoint.health.group.readiness.include: readinessState,db
```

## Graceful Shutdown

`server.shutdown: graceful` stops accepting new requests and waits up to `spring.lifecycle.timeout-per-shutdown-phase` for in-flight requests. In Kubernetes, set `terminationGracePeriodSeconds` above that timeout, and add a short `preStop` sleep so endpoints are removed from load balancers before shutdown begins.

## JVM in Containers

- Modern JDKs are container-aware; size heap with percentages rather than fixed `-Xmx`:
  `JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"`
- Leave headroom for metaspace, thread stacks, direct buffers and code cache.
- Set memory request equal to limit for predictable behavior; avoid CPU limits that throttle GC and JIT threads, or size them generously.
- Virtual threads (`spring.threads.virtual.enabled=true`, Java 21+) help I/O-bound workloads; check libraries for pinning issues (synchronized blocks around blocking I/O on Java 21-23).
- Faster startup options: Class Data Sharing archives (Boot 3.3+ supports CDS training runs), CRaC checkpoint/restore on supported JDKs, or native images.

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: orders }
spec:
  replicas: 3
  strategy: { rollingUpdate: { maxUnavailable: 0, maxSurge: 1 } }
  selector: { matchLabels: { app: orders } }
  template:
    metadata: { labels: { app: orders } }
    spec:
      terminationGracePeriodSeconds: 45
      containers:
        - name: app
          image: registry.example.com/orders:1.4.0
          ports: [{ containerPort: 8080 }, { containerPort: 8081, name: management }]
          env:
            - { name: SPRING_PROFILES_ACTIVE, value: prod }
            - { name: JAVA_TOOL_OPTIONS, value: "-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError" }
          envFrom: [{ secretRef: { name: orders-db } }]
          resources:
            requests: { cpu: 500m, memory: 1Gi }
            limits: { memory: 1Gi }
          startupProbe:
            httpGet: { path: /actuator/health/liveness, port: management }
            periodSeconds: 5
            failureThreshold: 30
          livenessProbe:
            httpGet: { path: /actuator/health/liveness, port: management }
            periodSeconds: 10
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: management }
            periodSeconds: 5
          lifecycle:
            preStop: { sleep: { seconds: 5 } }
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
          volumeMounts: [{ name: tmp, mountPath: /tmp }]
      volumes: [{ name: tmp, emptyDir: {} }]
```

The `sleep` lifecycle handler requires a recent Kubernetes version (beta and enabled by default from 1.30); on older clusters use `exec` with `sleep` if the image has a shell. A startup probe prevents liveness from killing slow-starting JVMs.

## Database Migrations

Flyway/Liquibase run on startup by default. With many replicas this works (they use a lock table), but long migrations delay readiness; for large changes run migrations as a separate Job and keep schema changes backward compatible (expand, deploy, contract).

## Native Images (GraalVM)

```bash
./gradlew nativeCompile          # requires GraalVM native-image
./gradlew bootBuildImage -PnativeImage   # or configure the native build plugin with Buildpacks
```

Benefits: fast startup, low memory. Costs: long builds, reflection/proxy hints needed for some libraries, different runtime behavior to test. Run the test suite in native mode (`nativeTest`) before adopting.

## Checklist

- [ ] Layered image (tools jar mode) or Buildpacks; non-root user
- [ ] Config and secrets externalized; `ddl-auto: validate`
- [ ] Actuator probes on a separate management port
- [ ] Graceful shutdown with matching grace period and preStop delay
- [ ] Heap sized by percentage; memory request equals limit
- [ ] Startup probe for slow starts
- [ ] Migrations backward compatible
- [ ] Image tags immutable and promoted across environments
