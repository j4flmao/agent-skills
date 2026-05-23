# Micronaut Testing Guide

## Test Dependencies (build.gradle.kts)
```kotlin
testImplementation("io.micronaut.test:micronaut-test-junit5")
testImplementation("org.junit.jupiter:junit-jupiter-api")
testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine")
testRuntimeOnly("org.junit.platform:junit-platform-launcher")
// Mocking
testImplementation("org.mockito:mockito-core:5.7.0")
```

## @MicronautTest Basics
```java
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;

@MicronautTest
public class OrderControllerTest {
  @Inject
  @Client("/")
  HttpClient client;

  @Test
  void testCreateOrder() {
    HttpRequest.POST("/api/orders", validRequest)
      .map(response -> {
        assertEquals(HttpStatus.CREATED, response.getStatus());
        return response;
      });
  }
}
```

## Property Override
```java
@MicronautTest(propertySources = @PropertySource(name = "test", value = "test.yml"))
@Property(name = "datasources.default.url", value = "jdbc:h2:mem:test")
public class OrderRepositoryTest { }
```

## Mock Beans with @Replaces
```java
@Singleton
public class MockOrderRepository implements OrderRepository {
  @Override public Order findById(UUID id) {
    return new Order(id, "test-customer", "PENDING", 100.0);
  }
}

@Replaces(OrderRepositoryImpl.class)
@Singleton
public class MockReplacement extends MockOrderRepository { }
```

## Spock Testing (Groovy)
```groovy
@MicronautTest
class OrderServiceSpec extends Specification {
  @Inject OrderService service
  @Inject @Client("/") HttpClient client

  def "create order persists to database"() {
    given:
    def request = new CreateOrderRequest("cust-1", [])

    when:
    def response = service.create(request)

    then:
    response.id != null
    response.status == OrderStatus.PENDING
  }
}
```

## Testing HTTP Clients
```java
@MicronautTest
public class InventoryClientTest {
  @Inject
  @Client(value = "http://inventory:8081", path = "/api/inventory")
  InventoryClient client;

  @Test
  void testCheckAvailability() {
    when(server.expect(once(), getRequestedFor(urlEqualTo("/api/inventory/SKU-1"))))
      .respondWith(aResponse().withBody("{\"available\": true}"));

    Mono<InventoryResponse> result = client.checkAvailability("SKU-1");
    assertTrue(result.block().isAvailable());
  }
}
```

## Embedded Server Testing
```java
@MicronautTest
public class EmbeddedServerTest {
  @Inject
  EmbeddedServer server;

  @Test
  void testServerRunning() {
    assertTrue(server.isRunning());
    assertEquals(8080, server.getPort());
  }
}
```

## Test Configuration Profiles
```yaml
# src/test/resources/application-test.yml
micronaut:
  server:
    port: -1    # random port
datasources:
  default:
    url: jdbc:h2:mem:test;DB_CLOSE_DELAY=-1
    schema-generate: CREATE_DROP
```
