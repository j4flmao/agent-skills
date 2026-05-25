# Kotlin Deployment

## Gradle Shadow Jar

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.0.0"
    id("com.github.johnrengelman.shadow") version "8.1.1"
    application
}

application {
    mainClass.set("com.project.ApplicationKt")
}

tasks.shadowJar {
    archiveBaseName.set("app")
    archiveClassifier.set("")
    archiveVersion.set("")
    minimize()
}
```

## Docker Image

```dockerfile
# Multi-stage build
FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src
RUN gradle shadowJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/app.jar .
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      APP_ENV: production
      DB_URL: jdbc:postgresql://db:5432/orders
  db:
    image: postgres:16
```

## Ktor Application Configuration

```kotlin
// src/main/resources/application.conf
ktor {
    deployment {
        port = 8080
        host = "0.0.0.0"
        environment = ${APP_ENV}
    }
    application {
        modules = [com.project.ApplicationKt.module]
    }
}

// production.conf
ktor {
    deployment {
        port = ${PORT}
        shutdownGracefulTimeout = 30 seconds
        watch = []
    }
}
```

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: "temurin"
      - run: ./gradlew test shadowJar
      - run: docker build -t app:${{ github.sha }} .
      - run: docker push app:${{ github.sha }}
```

## Health Endpoint (Ktor)

```kotlin
fun Application.healthModule() {
    routing {
        get("/health") {
            call.respond(HealthResponse("UP"))
        }
    }
}

@Serializable
data class HealthResponse(val status: String)
```

## Graceful Shutdown (Ktor)

```kotlin
fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0") {
        module()
    }.start(wait = true)
}

// With custom shutdown
val server = embeddedServer(Netty, port = 8080) { module() }
server.start(wait = false)

Runtime.getRuntime().addShutdownHook(Thread {
    server.stop(gracePeriodMillis = 30_000, timeoutMillis = 10_000)
})
```
