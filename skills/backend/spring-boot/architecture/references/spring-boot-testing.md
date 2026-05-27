# Spring Boot Testing

## Overview
Test Spring Boot applications with slice tests, integration tests using Testcontainers, and contract tests. Follow the testing pyramid: unit > slice > integration > e2e.

## Slice Tests with @WebMvcTest

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlaceOrderUseCase placeOrderUseCase;

    @Test
    void shouldCreateOrder() throws Exception {
        PlaceOrderCommand command = new PlaceOrderCommand("cust-1", List.of("item-1"), "ADDR-123");

        when(placeOrderUseCase.execute(any(PlaceOrderCommand.class)))
            .thenReturn(new OrderId("ord-456"));

        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "customerId": "cust-1",
                        "items": ["item-1"],
                        "shippingAddressId": "ADDR-123"
                    }
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("ord-456"));

        verify(placeOrderUseCase).execute(any(PlaceOrderCommand.class));
    }

    @Test
    void shouldReturn400ForInvalidInput() throws Exception {
        mockMvc.perform(post("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "customerId": "", "items": [] }
                """))
            .andExpect(status().isBadRequest());
    }
}
```

## Slice Tests with @DataJpaTest

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderJpaRepositoryTest {

    @Autowired
    private SpringDataOrderRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void shouldSaveAndFindOrder() {
        OrderJpaEntity entity = new OrderJpaEntity();
        entity.setCustomerId("cust-1");
        entity.setStatus("PENDING");
        entity.setTotalAmount(new BigDecimal("99.99"));

        OrderJpaEntity saved = repository.save(entity);
        Optional<OrderJpaEntity> found = repository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getCustomerId()).isEqualTo("cust-1");
    }

    @Test
    void shouldFindOrdersByCustomer() {
        OrderJpaEntity order1 = new OrderJpaEntity();
        order1.setCustomerId("cust-1");
        entityManager.persist(order1);

        OrderJpaEntity order2 = new OrderJpaEntity();
        order2.setCustomerId("cust-1");
        entityManager.persist(order2);

        List<OrderJpaEntity> orders = repository.findByCustomerId("cust-1");
        assertThat(orders).hasSize(2);
    }
}
```

## Integration Tests with Testcontainers

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.0")
    );

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrderJpaRepository orderRepository;

    @Test
    void shouldPlaceOrderEndToEnd() {
        PlaceOrderCommand command = new PlaceOrderCommand(
            "cust-1",
            List.of(new OrderItem("SKU-001", 2, new BigDecimal("49.99"))),
            "ADDR-123"
        );

        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            PostRequest("/v1/orders").body(command).build(),
            OrderResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();

        // Verify persistence
        Optional<OrderJpaEntity> saved = orderRepository
            .findById(UUID.fromString(response.getBody().getId()));
        assertThat(saved).isPresent();
        assertThat(saved.get().getCustomerId()).isEqualTo("cust-1");
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        TestRestTemplate testRestTemplate() {
            return new TestRestTemplate();
        }
    }
}
```

## Testing Domain Logic (Pure Unit Tests)

```java
class OrderTest {

    @Test
    void shouldCreateOrderWithCorrectState() {
        Order order = Order.create(
            new CustomerId("cust-1"),
            List.of(new OrderItem("SKU-001", 2, Money.of(49.99)))
        );

        assertThat(order.getId()).isNotNull();
        assertThat(order.getCustomerId().getValue()).isEqualTo("cust-1");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getTotal()).isEqualTo(Money.of(99.98));
    }

    @Test
    void shouldTransitionToConfirmedState() {
        Order order = Order.create(
            new CustomerId("cust-1"),
            List.of(new OrderItem("SKU-001", 1, Money.of(49.99)))
        );

        order.confirm();

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(order.getConfirmedAt()).isNotNull();
    }

    @Test
    void shouldNotTransitionInvalidState() {
        Order order = Order.create(
            new CustomerId("cust-1"),
            List.of(new OrderItem("SKU-001", 1, Money.of(49.99)))
        );

        order.confirm();
        assertThatThrownBy(order::confirm)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("already confirmed");
    }
}
```

## Testing @Service with Mocks

```java
@ExtendWith(MockitoExtension.class)
class PlaceOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderEventPublisher eventPublisher;

    @InjectMocks
    private PlaceOrderService service;

    @Test
    void shouldPlaceOrderSuccessfully() {
        PlaceOrderCommand command = new PlaceOrderCommand(
            "cust-1",
            List.of(new OrderItem("SKU-001", 1, Money.of(29.99))),
            "ADDR-123"
        );

        Order savedOrder = Order.create(command.customerId(), command.items());
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);

        OrderId result = service.execute(command);

        assertThat(result).isNotNull();
        verify(orderRepository).save(any(Order.class));
        verify(eventPublisher).publish(any(OrderPlacedEvent.class));
    }

    @Test
    void shouldFailWhenRepositoryThrows() {
        when(orderRepository.save(any())).thenThrow(new DataAccessException("DB down"));

        assertThatThrownBy(() -> service.execute(command))
            .isInstanceOf(DataAccessException.class);
    }
}
```

## Test Configuration with @TestConfiguration

```java
@SpringBootTest
class ApplicationTest {

    @TestConfiguration
    static class TestMailConfig {
        @Bean
        @Primary
        EmailService testEmailService() {
            return new EmailService() {
                @Override
                public void send(Email email) {
                    // no-op for tests
                }
            };
        }
    }

    @Autowired
    private EmailService emailService;

    @Test
    void shouldUseTestMailConfig() {
        assertThat(emailService).isNotNull();
        // verify it's the stub
    }
}
```

## Key Points
- Use `@WebMvcTest` for controller slice tests, `@DataJpaTest` for repository tests
- Use `@SpringBootTest` with `Testcontainers` for integration tests
- Keep domain logic tests pure (no Spring dependencies)
- Use `@MockBean` and `@InjectMocks` consistently for service tests
- Use `@DynamicPropertySource` to configure Testcontainers connection details
- Follow the testing pyramid: many unit tests, fewer integration tests, minimal e2e
