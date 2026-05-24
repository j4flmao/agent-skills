# Contract-Driven Integration Testing

## Overview
Contract-driven integration testing validates that services interact correctly based on agreed contracts. Unlike end-to-end tests, contract tests verify individual service-to-service interactions in isolation, providing fast feedback with high confidence.

## Provider Contracts

### What is a Provider Contract
A provider contract defines what a service (provider) guarantees to its consumers: API endpoints, request/response schemas, headers, status codes, error responses, and rate limits.

### Contract Structure
```yaml
# provider-contract.yaml
service: order-service
version: "1.0.0"
contracts:
  - name: get-order
    request:
      method: GET
      path: /api/orders/{orderId}
      headers:
        Authorization: Bearer {token}
    responses:
      200:
        description: Order found
        body:
          type: object
          properties:
            orderId:
              type: string
            status:
              type: string
              enum: [CREATED, CONFIRMED, SHIPPED, DELIVERED]
            total:
              type: number
      404:
        description: Order not found
        body:
          type: object
          properties:
            error:
              type: string
      401:
        description: Unauthorized
```

### Provider-Driven Contract Test (Spring Cloud Contract)

```groovy
// contracts/shouldReturnOrder.groovy
Contract.make {
    description "should return order by ID"
    request {
        method GET()
        url "/api/orders/ORD-001"
        headers {
            header("Authorization": "Bearer test-token")
        }
    }
    response {
        status OK()
        headers {
            header("Content-Type": "application/json")
        }
        body([
            orderId: "ORD-001",
            status : "CONFIRMED",
            total  : 150.00
        ])
    }
}
```

```java
// Provider-side test (auto-generated from contract)
@SpringBootTest(webEnvironment = WebEnvironment.MOCK)
@AutoConfigureMockMvc
@AutoConfigureStubRunner(stubsMode = StubRunnerProperties.StubsMode.LOCAL)
class OrderServiceContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnOrder() throws Exception {
        mockMvc.perform(get("/api/orders/ORD-001")
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orderId").value("ORD-001"))
            .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }
}
```

## Consumer-Driven Contracts (CDC)

### What is CDC
Consumer-driven contracts invert ownership: the consumer defines what it needs from the provider. The provider tests that it satisfies all consumer contracts before deploying.

### Pact CDC

```java
// Consumer-side test (defines the contract)
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "order-service", port = "8080")
class OrderServiceConsumerTest {

    @Pact(consumer = "inventory-service")
    public V4Pact createOrderPact(PactDslWithProvider builder) {
        return builder
            .given("order ORD-001 exists")
            .uponReceiving("a request for order details")
                .path("/api/orders/ORD-001")
                .method("GET")
                .headers("Authorization", "Bearer test-token")
            .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                    .stringType("orderId", "ORD-001")
                    .stringType("status", "CONFIRMED")
                    .numberType("total", 150.00))
            .toPact(V4Pact.class);
    }

    @Test
    @PactTestFor(pactMethod = "createOrderPact")
    void shouldFetchOrderDetails() {
        Order order = orderClient.getOrder("ORD-001");
        assertThat(order.getOrderId()).isEqualTo("ORD-001");
        assertThat(order.getStatus()).isEqualTo("CONFIRMED");
    }
}
```

```java
// Provider-side verification
@Provider("order-service")
@PactBroker(url = "http://pact-broker:9292")
@SpringBootTest(webEnvironment = WebEnvironment.MOCK)
@AutoConfigureMockMvc
class OrderServiceProviderTest {

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verifyPact(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("order ORD-001 exists")
    void orderExists() {
        // Set up test data
        orderRepository.save(new Order("ORD-001", "CONFIRMED", 150.00));
    }
}
```

### Pact Flow
```
1. Consumer writes Pact test → generates pact file
2. Pact file published to Pact Broker
3. Provider verifies against pact file
4. CI pipeline blocks provider deploy if verification fails
5. Consumer can verify latest pacts before deploying
```

### Pact Python Example

```python
# consumer_test.py
from pact import Consumer, Provider

pact = Consumer('inventory-service').has_pact_with(
    Provider('order-service'),
    host_name='localhost',
    port=8080
)

pact.given('order ORD-001 exists') \
    .upon_receiving('a request for order details') \
    .with_request('GET', '/api/orders/ORD-001',
                  headers={'Authorization': 'Bearer test-token'}) \
    .will_respond_with(200, body={
        'orderId': 'ORD-001',
        'status': 'CONFIRMED',
        'total': 150.00
    })

with pact:
    result = order_client.get_order('ORD-001')
    assert result['orderId'] == 'ORD-001'
```

## Integration Test with Contracts

### Combining Contract Tests with Integration Tests

```java
@SpringBootTest
@Testcontainers
class OrderIntegrationWithContractTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Container
    static WireMockContainer wiremock = new WireMockContainer("wiremock/wiremock:3.3.1");

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderService orderService;

    @BeforeEach
    void setupWiremock() {
        // Stub payment service using WireMock (based on its contract)
        WireMock.stubFor(post(urlEqualTo("/api/payments"))
            .withRequestBody(matchingJsonPath("$.orderId"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {"paymentId": "PAY-001", "status": "COMPLETED"}
                """)));
    }

    @Test
    void shouldProcessOrderWithPayment() {
        Order order = new Order("ORD-010", "PENDING", 200.00);
        orderRepository.save(order);

        Order processed = orderService.processOrder("ORD-010");

        assertThat(processed.getStatus()).isEqualTo("CONFIRMED");
    }
}
```

## Compatibility Testing

### Breaking Change Detection

```java
@Test
void providerChangeShouldNotBreakConsumers() {
    // Simulate provider API change
    String oldContract = loadContract("order-service-v1.json");
    String newContract = loadContract("order-service-v2.json");

    // Verify all consumers can still work with new contract
    for (ConsumerContract consumerContract : consumerContracts) {
        boolean compatible = ContractCompatibilityChecker
            .check(oldContract, newContract, consumerContract);

        assertThat(compatible)
            .as("Consumer " + consumerContract.getName() + " is broken")
            .isTrue();
    }
}
```

### Backward Compatibility Rules
```
REST API Compatibility Rules:
✅ Adding optional fields is safe
✅ Adding new endpoints is safe
✅ Relaxing validation constraints is safe
❌ Removing fields breaks consumers
❌ Making optional fields required breaks consumers
❌ Changing field types breaks consumers
❌ Removing endpoints breaks consumers
❌ Adding required auth to unauthenticated endpoints breaks consumers

Kafka Message Compatibility Rules:
✅ Adding optional fields to a message is safe
❌ Removing fields from a message breaks consumers
❌ Changing field types breaks consumers
❌ Changing topic partitioning strategy can break ordering
❌ Changing serialization format (JSON → Avro) must be coordinated
```

## Pact Broker Integration

### CI Pipeline Integration

```yaml
# .github/workflows/contract-testing.yml
name: Contract Testing

on:
  pull_request:
    paths:
      - 'services/**'

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run consumer tests
        run: ./gradlew :consumer:test
      - name: Publish pacts
        run: ./gradlew :consumer:pactPublish
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}

  provider-verification:
    needs: consumer-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify provider against pacts
        run: ./gradlew :provider:pactVerify
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
      - name: Tag verified version
        if: success()
        run: ./gradlew :provider:pactTagVersion
```

### Pact Broker Webhooks
```
Webhook: Notify consumer when provider verification fails
Trigger: provider_verification_failed
Action: Post to consumer's Slack channel with broken pact details
```

## Contract Testing Best Practices

| Practice | Why |
|----------|-----|
| Keep contracts focused on interactions | Don't test business logic in contract tests |
| Test at the API/message boundary | Contract tests should not depend on internal implementation |
| Version all contracts | Enables coordinated evolution of consumer and provider |
| Automate contract verification in CI | Catches breaking changes before deployment |
| Use a pact broker for sharing | Central visibility into contract status |
| Test error responses too | Consumers need to handle errors correctly |
| Limit contract scope to stable interfaces | Rapidly changing APIs cause constant contract maintenance |
| Combine with integration tests | Contract tests alone don't cover real infrastructure behavior |

## References
- Pact Documentation — https://docs.pact.io/
- Spring Cloud Contract — https://spring.io/projects/spring-cloud-contract
- Consumer-Driven Contracts: A Service Evolution Pattern — Ian Robinson (ThoughtWorks)
- Microservices Testing: Contract Tests — Martin Fowler
- Pact Broker — https://github.com/pact-foundation/pact_broker
