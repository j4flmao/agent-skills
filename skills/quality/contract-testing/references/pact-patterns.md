# Pact Patterns

## Pact Setup (TypeScript)

### Installation
```bash
npm install @pact-foundation/pact --save-dev
```

### Provider Mock Setup
```typescript
// setup/pact.ts
import { Pact } from "@pact-foundation/pact";

export const provider = new Pact({
  consumer: "OrderService",
  provider: "PaymentService",
  port: 1234,
  log: "./logs/pact.log",
  dir: "./pacts",
  logLevel: "info",
});
```

### Provider State Handler
```typescript
// setup/provider-states.ts
// Maps state descriptions to setup functions
export const providerStates = {
  "a payment with id 123 exists": async () => {
    await seedDatabase({ payments: [{ id: "123", status: "confirmed", amount: 49.99 }] });
  },
  "no payments exist": async () => {
    await clearDatabase("payments");
  },
  "payment 123 is pending": async () => {
    await seedDatabase({ payments: [{ id: "123", status: "pending", amount: 49.99 }] });
  },
};
```

## Consumer Test Example

### HTTP Consumer Test
```typescript
// order-service/__tests__/payment-service.pact.test.ts
import { Matchers } from "@pact-foundation/pact";

describe("Payment Service Pact", () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  test("get payment status", async () => {
    await provider.addInteraction({
      state: "a payment with id 123 exists",
      uponReceiving: "a request for payment status",
      withRequest: {
        method: "GET",
        path: "/payments/123",
        headers: { Accept: "application/json" },
      },
      willRespondWith: {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          id: Matchers.string("123"),
          status: Matchers.term({ generate: "confirmed", matcher: "confirmed|pending|failed" }),
          amount: Matchers.decimal(49.99),
        },
      },
    });

    const response = await fetch("http://localhost:1234/payments/123");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("123");
  });

  afterEach(() => provider.verify()); // Verify all interactions were used
});
```

### Consumer Test with Query Parameters
```typescript
test("search payments by date range", async () => {
  await provider.addInteraction({
    state: "payments exist",
    uponReceiving: "a search request for payments by date range",
    withRequest: {
      method: "GET",
      path: "/payments",
      query: "startDate=2026-01-01&endDate=2026-01-31",
      headers: { Accept: "application/json" },
    },
    willRespondWith: {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: Matchers.eachLike({
        id: Matchers.string("1"),
        amount: Matchers.decimal(10.50),
        date: Matchers.string("2026-01-15"),
      }),
    },
  });
  // Make request to mock server
});
```

## Pact Matchers

| Matcher | Description | Example |
|---|---|---|
| `Matchers.string("hello")` | Any string | `Matchers.string("123")` |
| `Matchers.integer(42)` | Any integer | `Matchers.integer(1)` |
| `Matchers.decimal(13.01)` | Any decimal | `Matchers.decimal(49.99)` |
| `Matchers.boolean(true)` | Any boolean | `Matchers.boolean(true)` |
| `Matchers.term({ generate, matcher })` | Regex match | `Matchers.term({ generate: "2024-01-15", matcher: "\\d{4}-\\d{2}-\\d{2}" })` |
| `Matchers.eachLike(obj)` | Array of objects | `Matchers.eachLike({ id: "1" })` |
| `Matchers.atLeastOneLike(obj)` | Array with min 1 | `Matchers.atLeastOneLike({ id: "1" })` |
| `Matchers.arrayContaining(arr)` | Array containing items | `Matchers.arrayContaining(["a", "b"])` |
| `Matchers.regex(pattern, str)` | Regex-matched string | `Matchers.regex(/^[a-z]+$/, "hello")` |
| `Matchers.isNull()` | Expected null | `Matchers.isNull()` |
| `Matchers.isError()` | Expected error | `Matchers.isError()` |
| `Matchers.includes(str)` | String includes | `Matchers.includes("partial")` |

### Matcher Best Practices
- Use `Matchers.string()` for any string field to avoid coupling to specific values
- Use `Matchers.term()` for fields with a known format (dates, status codes)
- Use `Matchers.eachLike()` for arrays of objects with min count 1
- Use `Matchers.decimal()` and `Matchers.integer()` for numeric fields
- Avoid over-matching — match only fields the consumer actually uses
- Use `Matchers.isNull()` for optional fields that may be absent

## Message Pact (Async/MQ)

### Consumer Message Test
```typescript
import { MessageConsumerPact } from "@pact-foundation/pact";

const messagePact = new MessageConsumerPact({
  consumer: "OrderService",
  provider: "PaymentService",
});

test("handles payment confirmation message", async () => {
  await messagePact
    .expectsToReceive("a payment confirmation event")
    .withContent({
      paymentId: Matchers.string("123"),
      status: Matchers.term({ generate: "confirmed", matcher: "confirmed|failed" }),
      amount: Matchers.decimal(49.99),
      processedAt: Matchers.string("2026-01-15T10:00:00Z"),
    })
    .withMetadata({
      contentType: "application/json",
      eventType: "payment.confirmed.v1",
    });
  // Verify consumer can handle the message
});
```

## Pact Broker Configuration

### Docker Compose
```yaml
services:
  pact-broker:
    image: pactfoundation/pact-broker
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_USERNAME: pact
      PACT_BROKER_DATABASE_PASSWORD: pact
      PACT_BROKER_DATABASE_HOST: db
      PACT_BROKER_DATABASE_NAME: pact
      PACT_BROKER_WEBHOOKS_ENABLED: "true"
```

### Publishing Contracts
```bash
pact-broker publish ./pacts \
  --consumer-app-version $(git rev-parse HEAD) \
  --tag $(git rev-parse --abbrev-ref HEAD) \
  --branch $(git rev-parse --abbrev-ref HEAD) \
  --broker-base-url https://pact-broker.example.com \
  --broker-token $PACT_BROKER_TOKEN
```

## Spring Cloud Contract

### Contract Definition (Groovy DSL)
```groovy
// contracts/shouldReturnPayment.groovy
Contract.make {
  description "should return payment by ID"
  request {
    method GET()
    url "/payments/123"
    headers {
      accept(applicationJson())
    }
  }
  response {
    status OK()
    headers {
      contentType(applicationJson())
    }
    body([
      id: "123",
      status: "confirmed",
      amount: 49.99
    ])
  }
}
```

### Provider Stub Generation
```bash
# Generate WireMock stubs from contracts
./mvnw spring-cloud-contract:convert
```

### Consumer Test with Stub
```java
@AutoConfigureStubRunner(
  stubsMode = StubRunnerProperties.StubsMode.LOCAL,
  ids = "com.example:payment-service:+:stubs:8090"
)
class OrderServiceTest {
  @Test
  void shouldGetPaymentStatus() {
    ResponseEntity<Payment> response = restTemplate.getForEntity(
      "http://localhost:8090/payments/123",
      Payment.class
    );
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getBody().getStatus()).isEqualTo("confirmed");
  }
}
```

## Pact Best Practices
- One contract per consumer-provider pair
- Keep interactions focused — each test tests one API call
- Use Pact matchers to allow provider flexibility in response values
- Test all provider states the consumer depends on
- Consumer tests should match real API usage patterns
- Provider verification must pass before provider deployment
- Tag contracts by environment (dev, staging, prod)
- Monitor can-i-deploy results in CI dashboards
