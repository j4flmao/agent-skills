# Spring Boot Testing Strategies Reference

## Overview

Comprehensive reference for testing Spring Boot applications: unit tests, integration tests, test slices, mocking, database testing, and end-to-end testing strategies.

## Table of Contents

1. Testing Pyramid
2. Test Slices
3. Unit Testing
4. Integration Testing
5. Database Testing
6. Web Layer Testing
7. Security Testing
8. Messaging Testing
9. Configuration Testing
10. End-to-End Testing
11. Testcontainers
12. Performance Testing
13. Common Patterns

---

## 1. Testing Pyramid

### Traditional Test Pyramid

```
         /\
        /  \        E2E Tests (few)
       /    \
      /------\
     /        \     Integration Tests (some)
    /----------\
   /            \
  /--------------\  Unit Tests (many)
 /________________\
```

### Spring Boot Test Levels

```java
// Level 1: Unit Tests (no Spring context)
// Fast, no Spring startup, pure JUnit
class OrderServiceUnitTest { }

// Level 2: Slice Tests (partial Spring context)
// Medium, focused auto-configuration
@WebMvcTest(OrderController.class)
class OrderControllerTest { }

// Level 3: Integration Tests (full Spring context)
// Slowest, full application startup
@SpringBootTest
class ApplicationIntegrationTest { }

// Level 4: End-to-End Tests (with external systems)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderE2ETest { }
```

### Test Double Taxonomy

```java
// Dummy: passed but never used
OrderService service = new OrderService(null, null);

// Stub: returns predefined answers
when(repo.findById(any())).thenReturn(Optional.of(order));

// Spy: records interactions
verify(repo, times(1)).save(any());

// Mock: stub + spy combination
@MockitoBean OrderRepository repo;

// Fake: simplified working implementation
class FakeOrderRepository extends OrderRepository {
    private List<Order> orders = new ArrayList<>();

    @Override
    public Order save(Order order) {
        orders.add(order);
        return order;
    }
}
```

---

## 2. Test Slices

### @WebMvcTest

```java
@WebMvcTest(OrderController.class)
class OrderControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @Test
    void shouldReturn200() throws Exception {
        when(orderService.findAll(any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(new Order())));

        mockMvc.perform(get("/api/orders")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void shouldValidateInput() throws Exception {
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors").exists());
    }
}
```

### @DataJpaTest

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryJpaTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void shouldSaveAndFindOrder() {
        Order order = new Order("cust-1", OrderStatus.PENDING);
        Order saved = entityManager.persistFlushFind(order);

        Optional<Order> found = orderRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getCustomerId()).isEqualTo("cust-1");
    }

    @Test
    void shouldFindByStatus() {
        entityManager.persist(new Order("cust-1", OrderStatus.PENDING));
        entityManager.persist(new Order("cust-2", OrderStatus.CONFIRMED));

        List<Order> pending = orderRepository.findByStatus(OrderStatus.PENDING);

        assertThat(pending).hasSize(1);
    }
}
```

### @JsonTest

```java
@JsonTest
class OrderJsonTest {

    @Autowired
    private JacksonTester<OrderResponse> json;

    @Test
    void shouldSerialize() throws Exception {
        OrderResponse response = new OrderResponse(
            UUID.randomUUID(), "cust-1", "PENDING", BigDecimal.TEN, Instant.now()
        );

        assertThat(json.write(response))
            .hasJsonPathStringValue("$.id")
            .hasJsonPathStringValue("$.customerId")
            .hasJsonPathStringValue("$.status");
    }

    @Test
    void shouldDeserialize() throws Exception {
        String content = """
            {
                "customerId": "cust-1",
                "items": [
                    {"productId": "prod-1", "quantity": 2, "unitPrice": 19.99}
                ]
            }
            """;

        CreateOrderRequest request = json.parseObject(content).getObject();

        assertThat(request.customerId()).isEqualTo("cust-1");
        assertThat(request.items()).hasSize(1);
    }
}
```

### @RestClientTest

```java
@RestClientTest(OrderServiceClient.class)
class OrderServiceClientTest {

    @Autowired
    private OrderServiceClient client;

    @Autowired
    private MockRestServiceServer server;

    @Test
    void shouldFetchOrder() {
        UUID orderId = UUID.randomUUID();
        server.expect(requestTo("/api/orders/" + orderId))
            .andRespond(withSuccess("""
                {"id": "%s", "customerId": "cust-1"}
                """.formatted(orderId), MediaType.APPLICATION_JSON));

        OrderResponse response = client.getOrder(orderId);

        assertThat(response.id()).isEqualTo(orderId);
    }
}
```

### @WebFluxTest

```java
@WebFluxTest(OrderReactiveController.class)
class OrderControllerWebFluxTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockitoBean
    private ReactiveOrderService orderService;

    @Test
    void shouldListOrders() {
        when(orderService.findAll()).thenReturn(Flux.just(
            new OrderResponse(UUID.randomUUID(), "cust-1", "PENDING", BigDecimal.TEN, Instant.now())
        ));

        webTestClient.get().uri("/api/orders")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(OrderResponse.class).hasSize(1);
    }
}
```

---

## 3. Unit Testing

### Service Layer Testing

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentGateway paymentGateway;

    @Mock
    private EventPublisher eventPublisher;

    @InjectMocks
    private OrderService orderService;

    private Order order;

    @BeforeEach
    void setUp() {
        order = Order.create("cust-1", List.of(
            new OrderItem("prod-1", 2, new BigDecimal("19.99"))
        ));
    }

    @Test
    void shouldCreateOrder() {
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(paymentGateway.charge(any(), any())).thenReturn(new PaymentResult(true, "txn-1"));

        Order result = orderService.placeOrder(new PlaceOrderCommand("cust-1", List.of()));

        assertThat(result.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verify(orderRepository).save(any(Order.class));
        verify(paymentGateway).charge(any(), any());
        verify(eventPublisher).publish(any(OrderPlacedEvent.class));
    }

    @Test
    void shouldThrowWhenPaymentFails() {
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(paymentGateway.charge(any(), any())).thenReturn(new PaymentResult(false, null));

        assertThatThrownBy(() -> orderService.placeOrder(new PlaceOrderCommand("cust-1", List.of())))
            .isInstanceOf(PaymentFailedException.class);

        verify(orderRepository, times(2)).save(any()); // Saved then cancelled
    }

    @Test
    void shouldFindOrderById() {
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));

        Order found = orderService.findById(order.getId());

        assertThat(found).isNotNull();
        assertThat(found.getCustomerId()).isEqualTo("cust-1");
    }

    @Test
    void shouldThrowWhenOrderNotFound() {
        UUID id = UUID.randomUUID();
        when(orderRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(id))
            .isInstanceOf(OrderNotFoundException.class);
    }
}
```

### Domain Object Testing

```java
class OrderTest {

    @Test
    void shouldCreateOrderWithPendingStatus() {
        Order order = Order.create("cust-1", List.of(
            new OrderItem("prod-1", 2, new BigDecimal("19.99"))
        ));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getCustomerId()).isEqualTo("cust-1");
        assertThat(order.getTotalAmount()).isEqualByComparingTo("39.98");
    }

    @Test
    void shouldCancelPendingOrder() {
        Order order = Order.create("cust-1", List.of());
        order.cancel("Customer request");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getCancellationReason()).isEqualTo("Customer request");
    }

    @Test
    void shouldNotCancelDeliveredOrder() {
        Order order = Order.create("cust-1", List.of());
        order.confirm();
        order.ship();
        order.deliver();

        assertThatThrownBy(() -> order.cancel("Test"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cannot be cancelled");
    }

    @Test
    void shouldCalculateTotalFromItems() {
        Order order = Order.create("cust-1", List.of(
            new OrderItem("prod-1", 2, new BigDecimal("19.99")),
            new OrderItem("prod-2", 1, new BigDecimal("49.99"))
        ));

        assertThat(order.getTotalAmount())
            .isEqualByComparingTo(new BigDecimal("89.97"));
    }
}
```

---

## 4. Integration Testing

### @SpringBootTest

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
    }

    @Test
    void shouldCreateAndRetrieveOrder() {
        CreateOrderRequest request = new CreateOrderRequest(
            "cust-1",
            List.of(new OrderItemDto("prod-1", 2, new BigDecimal("19.99")))
        );

        ResponseEntity<OrderResponse> createResponse = restTemplate.postForEntity(
            "/api/orders", request, OrderResponse.class
        );

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID orderId = createResponse.getBody().id();

        ResponseEntity<OrderResponse> getResponse = restTemplate.getForEntity(
            "/api/orders/{id}", OrderResponse.class, orderId
        );

        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody().customerId()).isEqualTo("cust-1");
    }

    @Test
    void shouldReturn404ForMissingOrder() {
        ResponseEntity<ErrorResponse> response = restTemplate.getForEntity(
            "/api/orders/{id}", ErrorResponse.class, UUID.randomUUID()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
```

### @SpringBootTest with @TestConfiguration

```java
@SpringBootTest
class PaymentServiceIntegrationTest {

    @Autowired
    private OrderService orderService;

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        public PaymentGateway testPaymentGateway() {
            return (amount, customerId) -> new PaymentResult(true, "test-txn");
        }

        @Bean
        @Primary
        public EventPublisher testEventPublisher() {
            return event -> {
                // No-op in tests
            };
        }
    }

    @Test
    void shouldUseTestPaymentGateway() {
        Order order = orderService.placeOrder(new PlaceOrderCommand("cust-1", List.of()));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(order.getTransactionId()).isEqualTo("test-txn");
    }
}
```

### @ActiveProfiles

```java
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "app.order.max-items=25"
})
class OrderServiceIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Test
    void shouldRespectTestProfile() {
        // Uses test profile with maxItems=25
    }
}

// application-test.yml
// spring:
//   datasource:
//     url: jdbc:h2:mem:testdb
//   jpa:
//     hibernate:
//       ddl-auto: create-drop
```

---

## 5. Database Testing

### Testcontainers

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
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
        Order order = new Order("cust-1", OrderStatus.PENDING);
        orderRepository.save(order);

        List<Order> found = orderRepository.findByStatus(OrderStatus.PENDING);

        assertThat(found).hasSize(1);
        assertThat(found.get(0).getCustomerId()).isEqualTo("cust-1");
    }
}
```

### Flyway Test Migrations

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
    "spring.flyway.enabled=true",
    "spring.flyway.locations=classpath:db/migration,classpath:db/testdata"
})
class OrderRepositoryMigrationTest {

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldWorkWithTestData() {
        List<Order> orders = orderRepository.findByStatus(OrderStatus.PENDING);

        assertThat(orders).isNotEmpty();
    }
}
```

### DatabaseCleaner Utility

```java
@Component
public class DatabaseCleaner {

    @PersistenceContext
    private EntityManager entityManager;

    private final List<String> tableNames = List.of(
        "order_items", "orders", "users"
    );

    @Transactional
    public void clean() {
        entityManager.flush();
        for (String tableName : tableNames) {
            entityManager.createNativeQuery(
                "TRUNCATE TABLE " + tableName + " CASCADE"
            ).executeUpdate();
        }
    }
}

// Usage in test
@SpringBootTest
class OrderServiceTest {

    @Autowired
    private DatabaseCleaner databaseCleaner;

    @BeforeEach
    void clean() {
        databaseCleaner.clean();
    }
}
```

---

## 6. Web Layer Testing

### MockMvc Customization

```java
@WebMvcTest(OrderController.class)
class MockMvcCustomizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldTestSortingAndPagination() throws Exception {
        when(orderService.findAll(any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(
                new Order("cust-3", OrderStatus.CONFIRMED),
                new Order("cust-1", OrderStatus.PENDING)
            )));

        mockMvc.perform(get("/api/orders")
                .param("page", "0")
                .param("size", "20")
                .param("sort", "createdAt,desc"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void shouldReturn401WithoutAuth() throws Exception {
        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturn403ForWrongRole() throws Exception {
        mockMvc.perform(get("/api/admin/orders")
                .with(jwt().roles("USER")))
            .andExpect(status().isForbidden());
    }
}
```

### WebTestClient (WebFlux)

```java
@WebFluxTest(OrderReactiveController.class)
class WebTestClientTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockitoBean
    private ReactiveOrderService orderService;

    @Test
    void shouldStreamOrders() {
        when(orderService.streamAll()).thenReturn(Flux.just(
            new OrderResponse(UUID.randomUUID(), "cust-1", "PENDING", BigDecimal.TEN, Instant.now()),
            new OrderResponse(UUID.randomUUID(), "cust-2", "CONFIRMED", BigDecimal.ONE, Instant.now())
        ));

        webTestClient.get().uri("/api/orders/stream")
            .accept(MediaType.TEXT_EVENT_STREAM)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(OrderResponse.class)
            .hasSize(2);
    }
}
```

---

## 7. Security Testing

### @WithMockUser

```java
@WebMvcTest(OrderController.class)
class SecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "USER")
    void shouldAllowAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldAllowAdminAccessToAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/orders"))
            .andExpect(status().isOk());
    }

    @Test
    @WithAnonymousUser
    void shouldRejectAnonymousUser() throws Exception {
        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void shouldRejectUserFromAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/orders"))
            .andExpect(status().isForbidden());
    }
}
```

### Custom Security Test Annotation

```java
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithCustomUserSecurityContextFactory.class)
public @interface WithCustomUser {
    String username() default "testuser";
    String[] roles() default {"USER"};
    boolean enabled() default true;
}

public class WithCustomUserSecurityContextFactory
        implements WithSecurityContextFactory<WithCustomUser> {

    @Override
    public SecurityContext createSecurityContext(WithCustomUser annotation) {
        CustomUserPrincipal principal = new CustomUserPrincipal(
            annotation.username(),
            annotation.enabled(),
            List.of(annotation.roles())
        );
        UsernamePasswordAuthenticationToken token =
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(token);
        return context;
    }
}

// Usage
@WebMvcTest(OrderController.class)
class OrderSecurityTest {
    @Test
    @WithCustomUser(username = "admin", roles = {"ADMIN"})
    void shouldUseCustomAnnotation() throws Exception {
        // Test with admin user
    }
}
```

---

## 8. Messaging Testing

### Kafka Test

```java
@SpringBootTest
@Testcontainers
class KafkaIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.4.0")
    );

    @DynamicPropertySource
    static void configureKafka(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private OrderEventConsumer consumer;

    @Test
    void shouldProduceAndConsumeEvent() throws Exception {
        OrderEvent event = new OrderEvent(UUID.randomUUID().toString(), "ORDER_CREATED");

        kafkaTemplate.send("orders", event).get(5, TimeUnit.SECONDS);

        // Wait for consumer
        Thread.sleep(2000);
        assertThat(consumer.getLastEvent()).isEqualTo(event);
    }
}
```

### @EmbeddedKafka

```java
@SpringBootTest
@EmbeddedKafka(partitions = 1, topics = { "orders", "payments" })
class KafkaEmbeddedTest {

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    @Test
    void shouldUseEmbeddedKafka() {
        Map<String, Object> props = KafkaTestUtils.consumerProps("test-group", "true", embeddedKafka);
        Consumer<String, String> consumer = new DefaultKafkaConsumerFactory<>(props)
            .createConsumer();
        consumer.subscribe(List.of("orders"));
        // Test logic
    }
}
```

---

## 9. Configuration Testing

### Testing @ConfigurationProperties

```java
@SpringBootTest
@TestPropertySource(properties = {
    "app.order.max-items=100",
    "app.order.payment-timeout=10m",
    "app.order.supported-currencies=USD,EUR",
    "app.order.shipping.base-rate=4.99",
    "app.order.shipping.free-threshold=75.0"
})
class OrderPropertiesTest {

    @Autowired
    private OrderProperties properties;

    @Test
    void shouldBindAllProperties() {
        assertThat(properties.getMaxItems()).isEqualTo(100);
        assertThat(properties.getPaymentTimeout()).isEqualTo(Duration.ofMinutes(10));
        assertThat(properties.getSupportedCurrencies()).containsExactly("USD", "EUR");
        assertThat(properties.getShipping().getBaseRate()).isEqualTo(4.99);
        assertThat(properties.getShipping().getFreeThreshold()).isEqualTo(75.0);
    }

    @Test
    void shouldUseDefaults() {
        // Properties not specified get defaults
        assertThat(properties.getNotification().isEmailEnabled()).isTrue();
        assertThat(properties.getNotification().getEmailTemplate()).isEqualTo("order-confirmation");
    }
}
```

### Testing Conditional Beans

```java
@SpringBootTest
@TestPropertySource(properties = "feature.advanced-mode=true")
class ConditionalConfigurationTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void shouldEnableAdvancedMode() {
        assertThat(context.containsBean("advancedService")).isTrue();
    }

    @Test
    void shouldHaveCorrectBeans() {
        assertThat(context.getBeanNamesForType(OrderService.class)).hasSize(1);
        assertThat(context.getBeanNamesForType(PaymentGateway.class)).hasSize(1);
    }
}
```

---

## 10. End-to-End Testing

### Full E2E Test

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderE2ETest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.4.0")
    );

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void fullOrderLifecycle() {
        // Create order
        CreateOrderRequest request = new CreateOrderRequest("cust-1",
            List.of(new OrderItemDto("prod-1", 2, new BigDecimal("19.99")))
        );
        ResponseEntity<OrderResponse> createResponse = restTemplate.postForEntity(
            "/api/orders", request, OrderResponse.class
        );
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID orderId = createResponse.getBody().id();

        // Verify in database
        assertThat(orderRepository.findById(orderId)).isPresent();

        // Cancel order
        restTemplate.postForEntity("/api/orders/{id}/cancel", null, Void.class, orderId);
        Order cancelled = orderRepository.findById(orderId).get();
        assertThat(cancelled.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }
}
```

---

## 11. Testcontainers

### Module Usage

```java
@SpringBootTest
@Testcontainers
class TestcontainersExampleTest {

    // PostgreSQL
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    // MySQL
    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");

    // MongoDB
    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:6.0");

    // Redis
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7.0")
        .withExposedPorts(6379);

    // Custom container with wait strategy
    @Container
    static GenericContainer<?> rabbit = new GenericContainer<>("rabbitmq:3.12")
        .withExposedPorts(5672, 15672)
        .waitingFor(Wait.forLogMessage(".*Server startup complete.*", 1));

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", () -> redis.getMappedPort(6379));
    }
}
```

### Reusable Containers

```java
// Abstract test class with shared containers
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15");

    static final KafkaContainer KAFKA = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.4.0")
    );

    static {
        POSTGRES.start();
        KAFKA.start();
    }

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
    }
}

// Test classes extend the abstract base
class OrderServiceIntegrationTest extends AbstractIntegrationTest {
    // Inherits container configuration
}
```

---

## 12. Performance Testing

### @Timed Unit Test

```java
@ExtendWith(MockitoExtension.class)
class OrderServicePerformanceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderService orderService;

    @Test
    @Timeout(value = 1, unit = TimeUnit.SECONDS)
    void shouldCreateOrderWithinTimeLimit() {
        when(orderRepository.save(any())).thenReturn(new Order());

        Order result = orderService.placeOrder(new PlaceOrderCommand("cust-1", List.of()));

        assertThat(result).isNotNull();
    }
}
```

### Load Test with Instancio

```java
@Test
void shouldHandleBulkOperations() {
    List<Order> orders = Instancio.ofList(Order.class)
        .size(1000)
        .create();

    when(orderRepository.saveAll(any())).thenReturn(orders);

    List<Order> saved = orderService.createOrders(orders);

    assertThat(saved).hasSize(1000);
    verify(orderRepository, times(1)).saveAll(orders);
}
```

---

## 13. Common Patterns

### Fluent Test Builder

```java
public class OrderTestBuilder {
    private String customerId = "default-customer";
    private OrderStatus status = OrderStatus.PENDING;
    private List<OrderItem> items = List.of();
    private BigDecimal totalAmount = BigDecimal.ZERO;

    public static OrderTestBuilder anOrder() {
        return new OrderTestBuilder();
    }

    public OrderTestBuilder withCustomerId(String customerId) {
        this.customerId = customerId;
        return this;
    }

    public OrderTestBuilder withStatus(OrderStatus status) {
        this.status = status;
        return this;
    }

    public OrderTestBuilder withItems(List<OrderItem> items) {
        this.items = items;
        this.totalAmount = items.stream()
            .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return this;
    }

    public Order build() {
        Order order = Order.create(customerId, items);
        order.setStatus(status);
        return order;
    }
}

// Usage in test
Order order = OrderTestBuilder.anOrder()
    .withCustomerId("cust-1")
    .withStatus(OrderStatus.CONFIRMED)
    .withItems(List.of(new OrderItem("prod-1", 2, new BigDecimal("19.99"))))
    .build();
```

### Test Data Factory

```java
public class TestDataFactory {

    public static CreateOrderRequest aCreateOrderRequest() {
        return new CreateOrderRequest(
            "cust-1",
            List.of(new OrderItemDto("prod-1", 2, new BigDecimal("19.99")))
        );
    }

    public static Order anOrder() {
        return Order.create("cust-1", List.of(
            new OrderItem("prod-1", 2, new BigDecimal("19.99"))
        ));
    }

    public static List<Order> orderList(int size) {
        return IntStream.range(0, size)
            .mapToObj(i -> Order.create("cust-" + i, List.of()))
            .toList();
    }
}
```

---

## References

- Spring Boot Testing: https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing
- MockMvc: https://docs.spring.io/spring-framework/docs/current/reference/html/testing.html#spring-mvc-test-framework
- Testcontainers: https://www.testcontainers.org/
- JUnit 5: https://junit.org/junit5/docs/current/user-guide/
- Mockito: https://site.mockito.org/
- AssertJ: https://assertj.github.io/doc/
