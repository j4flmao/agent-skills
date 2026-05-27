# Quarkus Testing Reference

## Test Configuration

Quarkus provides `@QuarkusTest` for integration testing with full CDI context.

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-junit5</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>rest-assured</artifactId>
    <scope>test</scope>
</dependency>
```

### Basic HTTP Test

```java
@QuarkusTest
public class OrderResourceTest {
    @Test
    public void testCreateOrder() {
        given()
            .contentType(ContentType.JSON)
            .body("{\"customerId\":\"cust-1\",\"total\":49.99}")
        .when()
            .post("/api/orders")
        .then()
            .statusCode(201)
            .body("customerId", equalTo("cust-1"))
            .body("id", notNullValue());
    }
    
    @Test
    public void testGetOrder() {
        given()
            .pathParam("id", "550e8400-e29b-41d4-a716-446655440000")
        .when()
            .get("/api/orders/{id}")
        .then()
            .statusCode(200)
            .body("status", equalTo("CREATED"));
    }
}
```

## Dev Services

Quarkus automatically starts test containers for databases and services.

```properties
# No manual DB config needed — Dev Services auto-starts PostgreSQL
quarkus.test.integration-test-profile=test
%test.quarkus.datasource.db-kind=postgresql
%test.quarkus.datasource.devservices.enabled=true
```

## Mocking with QuarkusMock

```java
@QuarkusTest
public class OrderServiceTest {
    @InjectMock
    OrderRepository repository;
    
    @Inject
    OrderService service;
    
    @BeforeEach
    void setUp() {
        Mockito.when(repository.findById(any()))
            .thenReturn(Optional.of(new Order("cust-1", 49.99)));
    }
    
    @Test
    public void testFindOrder() {
        Order result = service.findById(UUID.randomUUID());
        assertEquals("cust-1", result.getCustomerId());
    }
}
```

## Profile-Specific Testing

```java
@QuarkusTest
@TestProfile(TestProfile.class)
public class ConfigurableTest {
    @ConfigProperty(name = "app.test-mode")
    String testMode;
    
    @Test
    public void testProfileApplied() {
        assertEquals("integration", testMode);
    }
    
    public static class TestProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("app.test-mode", "integration");
        }
        
        @Override
        public String getConfigProfile() {
            return "test";
        }
    }
}
```

## Native Image Testing

```java
@QuarkusIntegrationTest
public class OrderResourceIT {
    @Test
    public void testNativeExecution() {
        given()
            .get("/api/orders/public/health")
        .then()
            .statusCode(200);
    }
}
```

Run with: `mvn verify -Pnative` or `gradle test -Dquarkus.package.type=native`.

## Panache Repository Testing

```java
@QuarkusTest
@QuarkusTestResource(H2DatabaseTestResource.class)
public class OrderRepositoryTest {
    @Inject
    OrderRepository repository;
    
    @Test
    public void testSaveAndFind() {
        Order order = new Order("cust-1", BigDecimal.valueOf(99.99));
        repository.persist(order);
        
        Order found = repository.findById(order.id);
        assertNotNull(found);
        assertEquals("cust-1", found.customerId);
    }
    
    @Test
    public void testFindByCustomer() {
        Order order1 = new Order("cust-1", BigDecimal.TEN);
        Order order2 = new Order("cust-2", BigDecimal.ONE);
        repository.persist(order1, order2);
        
        List<Order> orders = repository.findByCustomer("cust-1");
        assertEquals(1, orders.size());
    }
}
```

## REST Client Testing

```java
@QuarkusTest
public class InventoryClientTest {
    @InjectRestClient
    InventoryClient client;
    
    @Test
    public void testCheckAvailability() {
        InventoryResponse response = client
            .checkAvailability("SKU-001")
            .await()
            .atMost(Duration.ofSeconds(5));
        
        assertTrue(response.isAvailable());
        assertEquals(42, response.getQuantity());
    }
}
```

## Kafka Testing

```java
@QuarkusTest
@QuarkusTestResource(KafkaTestResource.class)
public class OrderEventTest {
    @Inject
    @Channel("orders-out")
    Emitter<OrderEvent> emitter;
    
    @Test
    public void testKafkaEmit() {
        OrderEvent event = new OrderEvent("cust-1", 99.99);
        
        emitter.send(event).toCompletableFuture().join();
        
        assertDoesNotThrow(() -> emitter.send(event));
    }
}
```

## TestContainers Integration

```java
@QuarkusTest
@QuarkusTestResource(PostgresTestResource.class)
public class DatabaseTest {
    @Inject
    OrderRepository repository;
    
    @Test
    public void testWithRealDatabase() {
        Order order = new Order("cust-1", BigDecimal.valueOf(250));
        repository.persist(order);
        
        assertNotNull(order.id);
    }
    
    public static class PostgresTestResource implements QuarkusTestResourceLifecycleManager {
        private PostgreSQLContainer<?> container;
        
        @Override
        public Map<String, String> start() {
            container = new PostgreSQLContainer<>("postgres:15");
            container.start();
            return Map.of(
                "quarkus.datasource.jdbc.url", container.getJdbcUrl(),
                "quarkus.datasource.username", container.getUsername(),
                "quarkus.datasource.password", container.getPassword()
            );
        }
        
        @Override
        public void stop() {
            if (container != null) container.stop();
        }
    }
}
```

## Continuous Testing Mode

Quarkus provides continuous testing during development.

```bash
mvn quarkus:test
# or
./mvnw quarkus:test
```

Tests re-run automatically on code changes with live reload.

## Key Points

- `@QuarkusTest` boots full CDI container for integration testing
- REST Assured provides fluent HTTP test assertions
- Dev Services auto-provisions databases and middleware
- `@InjectMock` replaces beans with Mockito mocks
- `@QuarkusIntegrationTest` verifies native image execution
- `@TestProfile` customizes configuration per test class
- TestContainers integration for real database testing
- Continuous testing mode re-runs tests on file changes
- Kafka emitter testing validates async message flows
- Resource lifecycle managers handle external service setup/teardown
