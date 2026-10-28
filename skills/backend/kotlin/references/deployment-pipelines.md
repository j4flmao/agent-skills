# Kotlin Service Build and Deployment Pipelines

Building, packaging, and shipping Kotlin/JVM services (Ktor or Spring Boot) through CI to containers and Kubernetes.

## Packaging Options

| Option | Command | Notes |
|--------|---------|-------|
| Fat JAR (Ktor plugin) | `./gradlew buildFatJar` | Shadow-based; simple Dockerfile |
| Spring Boot layered JAR | `./gradlew bootJar` | Extract layers for better image caching |
| Jib | `./gradlew jib` | No Dockerfile or Docker daemon; layered by deps/resources/classes |
| Cloud Native Buildpacks | `./gradlew bootBuildImage` | Spring Boot; reproducible images, SBOM included |
| GraalVM native image | `./gradlew nativeCompile` | Fast startup, low memory; reflection config needed; longer builds |

## Multi-Stage Dockerfile (Fat JAR)

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradle gradle
COPY gradlew settings.gradle.kts build.gradle.kts gradle.properties ./
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY . .
RUN ./gradlew --no-daemon buildFatJar

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 app
WORKDIR /app
COPY --from=build /src/build/libs/*-all.jar app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
```

- Use a JRE (or distroless Java) runtime image, not a JDK.
- `MaxRAMPercentage` makes the heap respect the container memory limit.
- Run as non-root with a fixed UID.

## Jib Configuration

```kotlin
plugins { id("com.google.cloud.tools.jib") version "3.4.5" }

jib {
    from { image = "eclipse-temurin:21-jre" }
    to {
        image = "ghcr.io/acme/billing"
        tags = setOf(System.getenv("GIT_SHA") ?: "dev")
    }
    container {
        ports = listOf("8080")
        user = "10001"
        jvmFlags = listOf("-XX:MaxRAMPercentage=75")
    }
}
```

## GitHub Actions Pipeline

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
      - uses: gradle/actions/setup-gradle@v4
      - run: ./gradlew check --scan=false
      - name: Publish image
        if: github.ref == 'refs/heads/main'
        env:
          GIT_SHA: ${{ github.sha }}
        run: ./gradlew jib -Djib.to.auth.username=${{ github.actor }} -Djib.to.auth.password=${{ secrets.GITHUB_TOKEN }}
```

- `gradle/actions/setup-gradle` handles Gradle caching; do not also cache `~/.gradle` manually.
- `check` runs tests, ktlint, detekt if wired to `check`.
- Tag images with the commit SHA; never deploy `latest`.

## Kubernetes Deployment Essentials

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: billing }
spec:
  replicas: 3
  strategy:
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  selector: { matchLabels: { app: billing } }
  template:
    metadata: { labels: { app: billing } }
    spec:
      terminationGracePeriodSeconds: 40
      containers:
        - name: app
          image: ghcr.io/acme/billing:3f2c1ab
          ports: [{ containerPort: 8080 }]
          resources:
            requests: { cpu: 500m, memory: 768Mi }
            limits: { memory: 768Mi }
          startupProbe:
            httpGet: { path: /healthz, port: 8080 }
            failureThreshold: 30
            periodSeconds: 2
          readinessProbe:
            httpGet: { path: /ready, port: 8080 }
          livenessProbe:
            httpGet: { path: /healthz, port: 8080 }
```

- JVM startup is slow: use a `startupProbe` instead of a long `initialDelaySeconds` on liveness.
- `/ready` checks dependencies (DB pool); `/healthz` checks only the process.
- Set memory request = limit for predictable heap sizing.

## Graceful Shutdown

Ktor: `embeddedServer(...).start(wait = true)` registers a shutdown hook; configure grace periods:

```kotlin
val server = embeddedServer(Netty, port = 8080, module = Application::module)
Runtime.getRuntime().addShutdownHook(Thread {
    server.stop(gracePeriodMillis = 5_000, timeoutMillis = 30_000)
})
server.start(wait = true)
```

Spring Boot: `server.shutdown=graceful` and `spring.lifecycle.timeout-per-shutdown-phase=30s`. Keep the Kubernetes `terminationGracePeriodSeconds` larger than the app timeout.

## Database Migrations

- Run Flyway/Liquibase as a separate Job or init step before the rollout, not concurrently from every replica.
- Use expand/contract migrations so old and new versions run against the same schema during a rolling update.

## Pitfalls

- Building inside the runtime image (ships Gradle and sources).
- No memory limit awareness → OOMKilled while heap still thinks it has room.
- Liveness probe hitting the database → cascading restarts during a DB blip.
- Native image without testing reflection/serialization paths in CI.

## Checklist

- [ ] Reproducible build with pinned toolchain (`java.toolchain.languageVersion`)
- [ ] Non-root JRE runtime image, SHA tags
- [ ] Startup, readiness, liveness probes distinct
- [ ] Graceful shutdown within pod grace period
- [ ] Migrations run once, backward compatible
- [ ] SBOM and image scan in CI
