# Pact Contract Testing Setup

## Architecture
Pact enables consumer-driven contract tests. The consumer writes a test that defines its expectations. Pact generates a pact file. The provider verifies it.

```
Consumer Test ──► Pact file ──► Pact Broker ──► Provider Verification
                                                      │
                                                      ▼
                                               Provider passes/fails
```

## Installation

### JavaScript/TypeScript (Jest)
```bash
npm install --save-dev @pact-foundation/pact-v3 @pact-foundation/pact
```

### Java (JUnit 5)
```gradle
testImplementation 'au.com.dius.pact.provider:junit5:4.6.0'
testImplementation 'au.com.dius.pact.consumer:junit5:4.6.0'
```

### Python (pytest)
```bash
pip install pact-python
```

### Go
```bash
go get github.com/pact-foundation/pact-go/v2
```

## Consumer Test Setup

### JavaScript Example
```javascript
const { PactV3 } = require('@pact-foundation/pact-v3');

const provider = new PactV3({
  consumer: 'OrderWeb',
  provider: 'OrderApi',
  port: 4000,
});

describe('Order API consumer', () => {
  it('should return an order by ID', async () => {
    provider
      .given('an order with ID 123 exists')
      .uponReceiving('a request for order 123')
      .withRequest({ method: 'GET', path: '/orders/123' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { id: '123', status: 'pending', total: 49.99 },
      });

    await provider.executeTest(async (mockServer) => {
      const client = new ApiClient(mockServer.url);
      const order = await client.getOrder('123');
      expect(order.id).toBe('123');
      expect(order.status).toBe('pending');
    });
  });
});
```

### Matchers
Use matchers instead of exact values to make contracts flexible:
```javascript
const { MatchersV3 } = require('@pact-foundation/pact-v3');
const { like, term, eachLike, iso8601DateTime } = MatchersV3;

body: {
  id: like('123'),
  status: term({ generate: 'pending', matcher: '^(pending|fulfilled|cancelled)$' }),
  createdAt: iso8601DateTime(),
  items: eachLike({
    productId: like('abc'),
    quantity: like(1),
  }),
}
```

## Provider Test Setup

### JavaScript
```javascript
const { Verifier } = require('@pact-foundation/pact');

new Verifier({
  providerBaseUrl: 'http://localhost:8080',
  pactBrokerUrl: 'https://your-broker.pactflow.io',
  provider: 'OrderApi',
  publishVerificationResult: true,
  providerVersion: '1.0.0',
}).verifyProvider();
```

### Java (Spring Boot)
```java
@Provider("OrderApi")
@PactBroker(url = "https://your-broker.pactflow.io")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderApiProviderTest {

  @LocalServerPort
  int port;

  @BeforeEach
  void setUp() {
    System.setProperty("pact.provider.version", "1.0.0");
  }

  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void pactVerificationTestTemplate(PactVerificationContext context) {
    context.verifyInteraction();
  }

  @State("an order with ID 123 exists")
  void orderExists() {
    orderRepository.save(new Order("123", "pending", 49.99));
  }
}
```

## Provider States
Provider states set up the data the provider needs to respond correctly:
```java
@State("an order with ID 123 exists")
@State("no orders exist")
@State("the user is authenticated")
```

Each state method sets up or tears down database state. For complex state:
```java
@State("an order with ID 123 exists and has items")
void orderWithItems(@DataType Map<String, Object> params) {
  String orderId = (String) params.get("orderId");
  // ... set up data
}
```

## Workspace Matchers
For testing non-deterministic values (timestamps, UUIDs):
```javascript
const { uuid, iso8601Timestamp, decimal } = MatchersV3;
body: {
  id: uuid(),
  createdAt: iso8601Timestamp(),
  amount: decimal(49.99),
}
```

## Publishing Pacts
```bash
npx pact-broker publish ./pacts \
  --consumer-app-version 1.0.0 \
  --branch main \
  --broker-base-url https://your-broker.pactflow.io \
  --broker-token $PACT_BROKER_TOKEN
```

## CI Integration
Consumer PR → consumer tests run → pact published → webhook triggers provider build → provider verifies.
