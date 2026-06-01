# Java Testing Guide

## Testing Pyramid

```
    /\          E2E (Cypress, Selenium)        — Few
   /  \
  /    \        Integration (Testcontainers)   — Some
 /      \
/________\      Unit (JUnit + Mockito)         — Many
```

## JUnit 5 Features

### Annotations
| Annotation | Purpose |
|------------|---------|
| `@Test` | Mark test method |
| `@BeforeEach` | Run before each test |
| `@AfterEach` | Run after each test |
| `@BeforeAll` | Run once before all tests (static) |
| `@AfterAll` | Run once after all tests (static) |
| `@DisplayName` | Human-readable test name |
| `@Disabled` | Skip test |
| `@Tag` | Filter tests by tag |
| `@Nested` | Inner test class for grouping |
| `@ParameterizedTest` | Test with multiple inputs |
| `@RepeatedTest` | Repeat test N times |

### Assertions
```java
import static org.junit.jupiter.api.Assertions.*;

assertEquals(expected, actual);
assertNotEquals(unexpected, actual);
assertTrue(condition);
assertFalse(condition);
assertNull(object);
assertNotNull(object);
assertThrows(IOException.class, () -> readFile("bad.txt"));
assertAll("group",
    () -> assertEquals(1, result.id()),
    () -> assertEquals("Alice", result.name())
);
```

### Parameterized Tests
```java
@ParameterizedTest
@ValueSource(strings = {"a@b.com", "test@example.com", "user@domain.co.uk"})
void validEmailsAreAccepted(String email) {
    assertTrue(validator.isValid(email));
}

@CsvSource({
    "1, 10.0, 10.0",
    "2, 10.0, 20.0",
    "5, 10.0, 50.0"
})
void calculateTotal(int qty, double price, double expected) {
    assertEquals(BigDecimal.valueOf(expected), service.calculate(qty, price));
}

@MethodSource("provideOrders")
void testOrderProcessing(Order order) {
    assertDoesNotThrow(() -> service.process(order));
}

static Stream<Order> provideOrders() {
    return Stream.of(
        new Order(1L, List.of(new Item("book", 2))),
        new Order(2L, List.of(new Item("phone", 1)))
    );
}
```

## Mockito

### Basic Mocking
```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock
    private OrderRepository repository;

    @Mock
    private PaymentGateway paymentGateway;

    @InjectMocks
    private OrderService service;

    @Test
    void createOrder_savesToRepository() {
        var request = new CreateOrderRequest(1L, List.of("item1"));
        var expectedOrder = new Order(1L, 1L, BigDecimal.TEN, OrderStatus.PENDING);

        when(repository.save(any(Order.class))).thenReturn(expectedOrder);

        var result = service.create(request);

        assertThat(result.id()).isEqualTo(1L);
        verify(repository).save(any(Order.class));
        verify(paymentGateway, never()).charge(any());
    }
}
```

### Argument Captor
```java
@Test
void createOrder_callsPaymentGatewayWithCorrectAmount() {
    service.create(request);

    var captor = ArgumentCaptor.forClass(PaymentRequest.class);
    verify(paymentGateway).charge(captor.capture());

    var captured = captor.getValue();
    assertThat(captured.amount()).isEqualByComparingTo(BigDecimal.valueOf(29.99));
}
```

## AssertJ (Fluent Assertions)

```java
import static org.assertj.core.api.Assertions.*;

// Basic
assertThat(actual).isEqualTo(expected);
assertThat(name).isNotBlank().startsWith("A").hasSize(5);

// Collections
assertThat(orders)
    .hasSize(3)
    .extracting(Order::status)
    .containsExactly(OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.SHIPPED);

// Exception
assertThatThrownBy(() -> service.create(null))
    .isInstanceOf(IllegalArgumentException.class)
    .hasMessageContaining("request must not be null");

// Soft assertions (multiple checks, all reported)
SoftAssertions softly = new SoftAssertions();
softly.assertThat(result.id()).isPositive();
softly.assertThat(result.status()).isEqualTo(OrderStatus.PENDING);
softly.assertAll();
```

## Integration Testing with Testcontainers

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderApiIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.data.redis.host", redis::getHost);
        r.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @Autowired
    private TestRestTemplate rest;

    @Test
    void createAndRetrieveOrder() {
        var request = new CreateOrderRequest(1L, List.of(new Item("book", 2)));
        var createResponse = rest.postForEntity("/api/orders", request, Order.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var orderId = createResponse.getBody().id();

        var getResponse = rest.getForEntity("/api/orders/{id}", Order.class, orderId);
        assertThat(getResponse.getBody().status()).isEqualTo(OrderStatus.PENDING);
    }
}
```

## Controller Testing

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService service;

    @Test
    void getOrder_returnsOrder() throws Exception {
        var order = new Order(1L, 1L, BigDecimal.TEN, OrderStatus.PAID);
        when(service.findById(1L)).thenReturn(Optional.of(order));

        mockMvc.perform(get("/api/orders/{id}", 1L))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.status").value("PAID"));
    }

    @Test
    void getOrder_notFound() throws Exception {
        when(service.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/orders/{id}", 999L))
            .andExpect(status().isNotFound());
    }
}
```

## Test Configuration

```java
@TestConfiguration
public class TestConfig {
    @Bean
    @Primary
    public PaymentGateway mockPaymentGateway() {
        return mock(PaymentGateway.class);
    }
}

// Usage
@SpringBootTest
@Import(TestConfig.class)
class OrderServiceIntegrationTest {
    // ...
}
```

## CI Integration

```yaml
# .github/workflows/test.yml
name: Java Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - uses: gradle/gradle-build-action@v2
      - run: ./gradlew test --tests "*UnitTest*"
      - run: ./gradlew test --tests "*IntegrationTest*"
      - uses: codecov/codecov-action@v3
```
