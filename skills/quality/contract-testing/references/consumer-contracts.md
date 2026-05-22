# Consumer Contracts

## Pact Setup (TypeScript)

```bash
npm install @pact-foundation/pact --save-dev
```

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

## Consumer Test Example

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
});
```

## Pact Matchers

| Matcher | Description | Example |
|---------|-------------|---------|
| `Matchers.string("hello")` | Any string | `Matchers.string("123")` |
| `Matchers.integer(42)` | Any integer | `Matchers.integer(1)` |
| `Matchers.decimal(13.01)` | Any decimal | `Matchers.decimal(49.99)` |
| `Matchers.boolean(true)` | Any boolean | `Matchers.boolean(true)` |
| `Matchers.term({ generate, matcher })` | Regex match | `Matchers.term({ generate: "2024-01-15", matcher: "\\d{4}-\\d{2}-\\d{2}" })` |
| `Matchers.eachLike(obj)` | Array of objects | `Matchers.eachLike({ id: "1" })` |
| `Matchers.atLeastOneLike(obj)` | Array with min 1 | `Matchers.atLeastOneLike({ id: "1" })` |

## Provider Verification

```typescript
// payment-service/__tests__/provider.pact.test.ts
import { Verifier } from "@pact-foundation/pact";

describe("Payment Service Pact Verification", () => {
  test("verifies contracts", async () => {
    const verifier = new Verifier({
      provider: "PaymentService",
      providerBaseUrl: "http://localhost:3001",
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: true,
      providerVersion: process.env.CI_COMMIT_SHA,
    });

    await verifier.verifyProvider();
  });
});
```

## Pact Broker Configuration

```yaml
# Docker Compose
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
