# Ktor Setup Guide

## CLI Initialization
```bash
# Create Ktor project via IntelliJ IDEA or CLI
curl -o ktor-project.zip "https://start.ktor.io/#/settings?name=OrderService&website=example.com&kotlinVersion=1.9.22&ktorVersion=2.3.7&buildSystem=GRADLE_KTS&engine=NETTY&configurationIns=YAML"
```

## build.gradle.kts Dependencies
```kotlin
plugins {
  kotlin("jvm") version "1.9.22"
  kotlin("plugin.serialization") version "1.9.22"
  id("io.ktor.plugin") version "2.3.7"
}

dependencies {
  implementation("io.ktor:ktor-server-core")
  implementation("io.ktor:ktor-server-netty")
  implementation("io.ktor:ktor-server-content-negotiation")
  implementation("io.ktor:ktor-serialization-kotlinx-json")
  implementation("io.ktor:ktor-server-call-logging")
  implementation("io.ktor:ktor-server-status-pages")
  implementation("ch.qos.logback:logback-classic:1.4.14")

  testImplementation("io.ktor:ktor-server-test-host")
  testImplementation("org.jetbrains.kotlin:kotlin-test")
  testImplementation("io.mockk:mockk:1.13.9")
}
```

## Application Configuration
```yaml
# src/main/resources/application.conf
ktor {
  application {
    modules = [ com.example.ApplicationKt.module ]
  }
  deployment {
    port = 8080
    host = "0.0.0.0"
  }
}
```

## Main Entry Point
```kotlin
fun main(args: Array<String>): Unit = io.ktor.server.netty.EngineMain.main(args)
```

## Module Function
```kotlin
fun Application.module() {
  install(ContentNegotiation) {
    json(Json {
      ignoreUnknownKeys = true
      prettyPrint = false
      isLenient = true
    })
  }
  install(CallLogging) {
    level = Level.INFO
    filter { call -> call.request.path().startsWith("/api") }
  }
  install(StatusPages) { /* error handling */ }
  routing { /* routes */ }
}
```

## Plug-ins Reference

| Plug-in | Usage |
|---|---|
| ContentNegotiation | JSON/XML serialization |
| CallLogging | Request logging |
| StatusPages | Error handling |
| Authentication | JWT, Basic, Digest, OAuth |
| CORS | Cross-origin requests |
| Sessions | Cookie/client session |
| WebSockets | WS protocol support |
| Compression | Response compression |
| HSTS | Security headers |
| RateLimit | Request throttling |

## Route Organization
```kotlin
fun Routing.orderRoutes() {
  route("/api/orders") {
    get("/{id}") { /* ... */ }
    post { /* ... */ }
    put("/{id}") { /* ... */ }
    delete("/{id}") { /* ... */ }
  }
}
```

## Testing Ktor
```kotlin
fun Application.testModule() {
  routing { orderRoutes() }
}

class OrderRoutesTest {
  @Test
  fun `test create order`() = testApplication {
    application { testModule() }
    val response = client.post("/api/orders") {
      contentType(ContentType.Application.Json)
      body = """{"customerId": "cust-1", "items": []}"""
    }
    assertEquals(HttpStatusCode.Created, response.status)
  }
}
```

## Ktor Client
```kotlin
val client = HttpClient(CIO) {
  install(ContentNegotiation) { json() }
}

suspend fun fetchOrder(id: String): Order {
  return client.get("http://localhost:8080/api/orders/$id").body()
}
```
