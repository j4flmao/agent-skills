# Spring Testing

## Test Architecture

### Test Pyramid

```
    /\       E2E (Cypress, TestContainers + WebTestClient)
   /  \
  /    \     Integration (Slice tests, Repository, Controller)
 /      \
/________\   Unit (Service, Domain, utilities — no Spring context)
```

### Dependency Setup

```groovy
// build.gradle
testImplementation 'org.springframework.boot:spring-boot-starter-test'
testImplementation 'org.testcontainers:testcontainers:1.19.3'
testImplementation 'org.testcontainers:postgresql:1.19.3'
testImplementation 'org.testcontainers:junit-jupiter:1.19.3'
testImplementation 'org.wiremock:wiremock:3.3.1'
```

## Unit Tests (No Spring Context)

```java
class OrderServiceTest {
    private OrderRepository orderRepo;
    private InventoryClient inventoryClient;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderRepo = mock(OrderRepository.class);
        inventoryClient = mock(InventoryClient.class);
        orderService = new OrderService(orderRepo, inventoryClient);
    }

    @Test
    void shouldCreateOrderSuccessfully() {
        // Arrange
        var command = new CreateOrderCommand("customer-1", List.of(
            new OrderItemRequest("SKU-1", 2, new Money("29.99"))
        ));
        var order = Order.create(command);

        when(orderRepo.save(any(Order.class))).thenReturn(order);
        when(inventoryClient.checkAvailability("SKU-1", 2)).thenReturn(true);

        // Act
        Order result = orderService.createOrder(command);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getCustomerId()).isEqualTo("customer-1");
        verify(orderRepo).save(any(Order.class));
        verify(inventoryClient).checkAvailability("SKU-1", 2);
    }

    @Test
    void shouldThrowWhenInsufficientStock() {
        var command = new CreateOrderCommand("customer-1", List.of(
            new OrderItemRequest("SKU-1", 99, new Money("29.99"))
        ));

        when(inventoryClient.checkAvailability("SKU-1", 99)).thenReturn(false);

        assertThrows(InsufficientStockException.class,
            () -> orderService.createOrder(command));
    }
}
```

## Slice Tests

### @DataJpaTest — Repository Layer

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderJpaRepositoryTest {
    @Autowired
    private JpaOrderRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void shouldFindOrdersByCustomerId() {
        // Arrange
        var order = new OrderJpaEntity();
        order.setCustomerId("cust-1");
        order.setTotal(new BigDecimal("100.00"));
        entityManager.persist(order);
        entityManager.flush();

        // Act
        Page<OrderJpaEntity> result = repository
            .findByCustomerId("cust-1", PageRequest.of(0, 10));

        // Assert
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCustomerId()).isEqualTo("cust-1");
    }
}
```

### @WebMvcTest — Controller Layer

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldReturnOrderById() throws Exception {
        var orderResponse = new OrderResponse("order-1", "cust-1", new Money("50.00"));

        when(orderService.getOrder("order-1")).thenReturn(orderResponse);

        mockMvc.perform(get("/api/v1/orders/order-1")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("order-1"))
            .andExpect(jsonPath("$.customerId").value("cust-1"));
    }

    @Test
    void shouldReturn404WhenOrderNotFound() throws Exception {
        when(orderService.getOrder("nonexistent"))
            .thenThrow(new OrderNotFoundException("nonexistent"));

        mockMvc.perform(get("/api/v1/orders/nonexistent")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isNotFound());
    }
}
```

### @JsonTest — Serialization

```java
@JsonTest
class OrderResponseJsonTest {
    @Autowired
    private JacksonTester<OrderResponse> json;

    @Test
    void shouldSerializeToJson() throws Exception {
        var response = new OrderResponse("order-1", "cust-1", new Money("99.99"));

        assertThat(json.write(response)).isEqualToJson("order-response.json");
    }

    @Test
    void shouldDeserializeFromJson() throws Exception {
        var content = """
            {
                "id": "order-1",
                "customerId": "cust-1",
                "total": 99.99
            }
            """;

        assertThat(json.parse(content))
            .hasFieldOrPropertyWithValue("id", "order-1")
            .hasFieldOrPropertyWithValue("total", new Money("99.99"));
    }
}
```

### @RestClientTest — HTTP Client

```java
@RestClientTest(InventoryClient.class)
class InventoryClientTest {
    @Autowired
    private MockRestServiceServer server;

    @Autowired
    private InventoryClient client;

    @Test
    void shouldCheckAvailability() {
        server.expect(requestTo("/api/inventory/SKU-1/check?quantity=2"))
            .andRespond(withSuccess("true", MediaType.APPLICATION_JSON));

        boolean available = client.checkAvailability("SKU-1", 2);

        assertThat(available).isTrue();
        server.verify();
    }
}
```

## TestContainers — Database Integration

```java
@Testcontainers
@SpringBootTest
class OrderRepositoryIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldPersistAndRetrieveOrder() {
        var order = Order.create(new CreateOrderCommand("cust-1", List.of(
            new OrderItemRequest("SKU-1", 1, new Money("10.00"))
        )));

        Order saved = orderRepository.save(order);
        Optional<Order> found = orderRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getCustomerId()).isEqualTo("cust-1");
    }
}
```

## WireMock — HTTP Stubs

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@WireMockTest(httpPort = 8089)
class OrderE2ETest {
    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldCreateOrderWithExternalInventoryCheck() {
        // Stub external inventory service
        stubFor(get(urlEqualTo("/api/inventory/SKU-1/check?quantity=1"))
            .willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("true")
                .withStatus(200)));

        // Act
        var request = new CreateOrderRequest("cust-1", List.of(
            new OrderItemRequest("SKU-1", 1, new Money("10.00"))
        ));

        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/api/v1/orders",
            request,
            OrderResponse.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().customerId()).isEqualTo("cust-1");
    }
}
```

## @SpringBootTest — Full Integration

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderApiIntegrationTest {
    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private OrderRepository orderRepository;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
    }

    @Test
    void shouldCompleteOrderLifecycle() {
        // Create order
        var createResponse = webTestClient.post()
            .uri("/api/v1/orders")
            .bodyValue(new CreateOrderRequest("cust-1", List.of(
                new OrderItemRequest("SKU-1", 1, new Money("10.00"))
            )))
            .exchange()
            .expectStatus().isCreated()
            .expectBody(OrderResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(createResponse.id()).isNotNull();

        // Get order
        webTestClient.get()
            .uri("/api/v1/orders/{id}", createResponse.id())
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.customerId").isEqualTo("cust-1")
            .jsonPath("$.status").isEqualTo("PENDING");

        // Cancel order
        webTestClient.post()
            .uri("/api/v1/orders/{id}/cancel", createResponse.id())
            .exchange()
            .expectStatus().isOk();

        webTestClient.get()
            .uri("/api/v1/orders/{id}", createResponse.id())
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.status").isEqualTo("CANCELLED");
    }
}
```

## Test Configuration

```yaml
# src/test/resources/application-test.yml
spring:
  datasource:
    url: jdbc:tc:postgresql:16:///testdb
    driver-class-name: org.testcontainers.jdbc.ContainerDatabaseDriver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
```

```java
// Test-specific config
@TestConfiguration
public class TestConfig {
    @Bean
    @Primary
    public PaymentGateway testPaymentGateway() {
        return new TestPaymentGateway();  // returns success always
    }
}
```

## Parameterized Tests

```java
@ParameterizedTest
@CsvSource({
    "PENDING, true",
    "SHIPPED, false",
    "DELIVERED, false",
    "CANCELLED, false"
})
void shouldDetermineCancellableStatus(String status, boolean expected) {
    Order order = new Order();
    order.setStatus(OrderStatus.valueOf(status));
    assertThat(order.isCancellable()).isEqualTo(expected);
}

@ParameterizedTest
@MethodSource("provideInvalidOrders")
void shouldRejectInvalidOrders(CreateOrderRequest request, String expectedError) {
    // Test validation
}

static Stream<Arguments> provideInvalidOrders() {
    return Stream.of(
        Arguments.of(new CreateOrderRequest(null, List.of()), "customerId must not be blank"),
        Arguments.of(new CreateOrderRequest("cust-1", List.of()), "items must not be empty")
    );
}
```

## Best Practices

1. **Unit test domain logic** — no Spring context, pure Java tests with mocks
2. **Slice tests** for each layer (@DataJpaTest, @WebMvcTest, @JsonTest)
3. **TestContainers** for real database in integration tests — never H2
4. **WireMock** for external service stubs — predictable and fast
5. **@SpringBootTest** sparingly — slow, use only for critical E2E flows
6. **Clean test data** between tests — @BeforeEach or @Sql
7. **Test exceptions, edge cases, and error paths** — not just happy path
8. **Use WebTestClient** over MockMvc for full integration
9. **Parameterized tests** for data-driven scenarios
10. **Test configuration via @TestConfiguration** — never modify main config for tests
