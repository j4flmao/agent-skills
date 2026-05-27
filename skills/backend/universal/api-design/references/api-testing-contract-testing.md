# API Testing and Contract Testing

## Testing Pyramid for APIs

```
          /\           E2E Tests (few)
         /  \          Cross-service workflows, user journeys
        /    \
       /      \        Integration Tests
      /        \       Service-level, DB, external integrations
     /          \
    /            \     Contract Tests
   /              \    Consumer-driven, provider verification
  /                \
 /__________________\  Unit Tests (many)
                        Models, middleware, serialization
```

### Unit Tests
- Test individual functions, middleware, serializers, and validators in isolation
- Mock or stub all external dependencies (DB, HTTP, message queues)
- Fast execution, deterministic, high coverage target (80%+)

```typescript
// Unit test: serialization logic
describe('OrderSerializer', () => {
  it('formats order for API response', () => {
    const order = { id: 'abc', total: 29.99, currency: 'USD' };
    const result = OrderSerializer.toResponse(order);
    expect(result).toEqual({
      id: 'abc',
      amount: 29.99,
      currency: 'USD',
      links: { self: '/orders/abc' },
    });
  });

  it('handles null order gracefully', () => {
    expect(() => OrderSerializer.toResponse(null)).toThrow('Order required');
  });
});
```

### Integration Tests
- Test service-layer logic with real databases and test containers
- Verify query logic, transaction behavior, and data integrity
- Use disposable test databases (Docker containers, in-memory DBs)

```typescript
// Integration test: database interaction
describe('OrderRepository.integration', () => {
  beforeAll(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('finds orders by customer within date range', async () => {
    const orders = await OrderRepository.findByCustomer('cust_1', {
      from: '2026-01-01',
      to: '2026-03-31',
    });
    expect(orders).toHaveLength(3);
    expect(orders[0]).toMatchObject({
      customerId: 'cust_1',
      status: 'completed',
    });
  });

  it('enforces unique order number constraint', async () => {
    const order = { orderNumber: 'ORD-001', ...validOrderPayload };
    await OrderRepository.create(order);
    await expect(OrderRepository.create(order)).rejects.toThrow(
      'duplicate key'
    );
  });
});
```

### Contract Tests
- Verify that API provider and consumer agree on interface and behavior
- Consumer writes expectations; provider verifies it meets them
- Catch breaking changes before deployment

### E2E Tests
- Test complete user journeys across multiple services
- Deployed to staging environment with real dependencies
- Slow, brittle, minimal coverage — focus on critical paths

```typescript
// E2E test: complete order flow
describe('Order lifecycle E2E', () => {
  it('creates, processes, and delivers an order', async () => {
    const token = await auth.login({ email: 'test@example.com', password: 'pass' });
    const product = await api.get('/products?inStock=true').then(r => r.data[0]);
    const order = await api.post('/orders', {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: { street: '123 Main St', city: 'Portland' },
    }, { headers: { Authorization: `Bearer ${token}` } });
    expect(order.status).toBe(201);
    expect(order.data.status).toBe('pending');

    await api.post(`/orders/${order.data.id}/pay`, { method: 'card' });
    const paidOrder = await api.get(`/orders/${order.data.id}`);
    expect(paidOrder.data.status).toBe('confirmed');
  });
});
```

## Contract Testing Fundamentals

### What Is Contract Testing
- Consumer and provider each test against a shared contract (the pact)
- Consumer defines what it expects from the provider
- Provider verifies it can satisfy all consumer expectations
- Catches breaking changes at integration points without full E2E suites

### Consumer-Driven Contracts (CDC)
- The consumer defines the contract by writing tests that record interactions
- Published contracts become executable specifications for the provider
- Provider must pass all consumer contracts before deploying

### Provider Verification
- Provider replays recorded consumer expectations against its real API
- Each consumer interaction is validated: request → actual response matches expected response
- Failure = potential breaking change → provider must fix or coordinate with consumer

### Pact Contracts
- Pact: industry-standard contract testing framework
- Contracts stored as JSON files containing consumer expectations
- Each interaction = request + expected response + metadata
- Contracts published to a Pact Broker for cross-team visibility

```json
{
  "consumer": { "name": "WebApp" },
  "provider": { "name": "OrderService" },
  "interactions": [
    {
      "description": "a request for order 123",
      "request": {
        "method": "GET",
        "path": "/orders/123",
        "headers": { "Accept": "application/json" }
      },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": {
          "id": "123",
          "status": "confirmed",
          "total": 49.99,
          "items": [{ "productId": "p1", "quantity": 2 }]
        },
        "matchingRules": {
          "$.body.id": { "match": "type" },
          "$.body.total": { "match": "decimal" }
        }
      }
    }
  ],
  "metadata": {
    "pactSpecification": { "version": "4.0" }
  }
}
```

## Pact Framework

### Setup

```bash
npm install --save-dev @pact-foundation/pact @pact-foundation/pact-node
```

```typescript
// jest.config.ts
export default {
  testMatch: ['**/*.pact.test.ts'],
  setupFiles: ['./pact.setup.ts'],
};
```

```typescript
// pact.setup.ts
import { Pact } from '@pact-foundation/pact';

export const provider = new Pact({
  consumer: 'WebApp',
  provider: 'OrderService',
  port: 1234,
  host: '127.0.0.1',
  logLevel: 'info',
  dir: './pacts', // Where pact files are written
});
```

### Writing Consumer Tests

```typescript
// webapp/src/__tests__/order-api.pact.test.ts
import { like, term, eachLike, uuid } from '@pact-foundation/pact/dsl/matchers';
import { OrderApiClient } from '../clients/order-api';

describe('OrderService API contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('GET /orders/:id', () => {
    beforeAll(async () => {
      await provider.addInteraction({
        state: 'order 123 exists',
        uponReceiving: 'a request for order 123',
        withRequest: {
          method: 'GET',
          path: '/orders/123',
          headers: { Accept: 'application/json' },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: uuid(),
            status: term({ generate: 'confirmed', matcher: '^(pending|confirmed|shipped)$' }),
            total: like(49.99),
            items: eachLike({
              productId: uuid(),
              quantity: like(2),
            }, { min: 1 }),
          },
        },
      });
    });

    it('returns the order', async () => {
      const client = new OrderApiClient(provider.mockService.baseUrl);
      const order = await client.getOrder('123');
      expect(order.id).toBeDefined();
      expect(order.status).toMatch(/^(pending|confirmed|shipped)$/);
    });
  });
});
```

### Pact Matchers
- `like(value)` — matches type and structure, ignores exact value
- `term({ generate, matcher })` — matches regex pattern, generates example
- `eachLike(value, { min })` — matches array elements by structure
- `uuid()` — matches UUID format
- `somethingLike(value)` — deprecated alias for like
- `iso8601DateTime()` — matches ISO 8601 datetime format
- `decimal()` — matches decimal numbers
- `integer()` — matches integer numbers

### Provider Verification

```typescript
// orders-service/src/__tests__/provider-verification.pact.test.ts
import { Verifier } from '@pact-foundation/pact';

describe('OrderService Pact verification', () => {
  it('verifies against all published pacts', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3000',
      provider: 'OrderService',
      pactBrokerUrl: 'https://pact-broker.company.com',
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: true,
      providerVersion: '2.1.0',
      // Provider states — callbacks to set up test data
      stateHandlers: {
        'order 123 exists': async () => {
          await seedOrder({ id: '123', status: 'confirmed', total: 49.99 });
        },
        'order list is not empty': async () => {
          await seedOrders(5);
        },
        'no orders exist': async () => {
          await clearOrders();
        },
      },
    });

    return verifier.verifyProvider();
  });
});
```

### Provider States
- Set up database state matching consumer expectations
- Called before each interaction during verification
- Can insert/delete records, set feature flags, configure mocks

```typescript
stateHandlers: {
  'user is authenticated': async () => {
    await createTestSession({ userId: 'user_1', roles: ['admin'] });
  },
  'product is out of stock': async () => {
    await setStockLevel('product_1', 0);
  },
  'rate limit has been exceeded': async () => {
    await exhaustRateLimit('test-api-key');
  },
}
```

### Pact Broker
- Central repository for pact files and verification results
- Provides matrix view showing which consumer/provider versions are compatible
- Webhook triggers for automated provider verification
- `can-i-deploy` tool gates deployments based on contract compatibility

```bash
# Publish pact file to broker
npx pact-broker publish ./pacts \
  --broker-base-url https://pact-broker.company.com \
  --broker-token $TOKEN \
  --consumer-app-version 1.2.3 \
  --tag main

# Verify and publish results
npx pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version 2.1.0 \
  --to-environment production
```

## Consumer-Driven Contract Testing Workflow

```
Consumer writes test → Consumer publishes pact → Provider fetches pact
                                                          ↓
Provider runs verification ← Provider sets up state ← Provider reads pact
         ↓ (pass)
Provider publishes verification → can-i-deploy passes → Deploy
```

### Step 1: Consumer Writes Expectations

```typescript
// Consumer team (WebApp) defines what they need
provider.addInteraction({
  state: 'order 123 exists',
  uponReceiving: 'a request for order 123',
  withRequest: {
    method: 'GET',
    path: '/orders/123',
  },
  willRespondWith: {
    status: 200,
    body: { id: '123', status: 'confirmed', total: like(49.99) },
  },
});
```

### Step 2: Consumer Publishes Contract

```bash
# CI job: consumer test + publish
npm test -- --testPathPattern="pact"
npx pact-broker publish ./pacts \
  --broker-base-url https://pact-broker.company.com \
  --consumer-app-version $CI_COMMIT_SHA \
  --tag $CI_COMMIT_BRANCH
```

### Step 3: Provider Verifies Against Published Contracts

```bash
# CI job: provider verification
npx pact-broker retrieve-pacts \
  --broker-base-url https://pact-broker.company.com \
  --provider OrderService \
  --output-dir ./pacts

npm run pact-verify
```

### Step 4: Deploy Gate with can-i-deploy

```bash
# CI: before deploying provider
npx pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version 2.1.0 \
  --to-environment staging

# CI: before deploying consumer
npx pact-broker can-i-deploy \
  --pacticipant WebApp \
  --version 1.2.3 \
  --to-environment production
```

## Provider Contract Testing

### Verifying Against Published Contracts

```typescript
// Multi-consumer verification
import { Verifier } from '@pact-foundation/pact';

const opts = {
  providerBaseUrl: 'http://localhost:3000',
  provider: 'OrderService',
  // Fetch all pacts from broker automatically
  pactBrokerUrl: 'https://pact-broker.company.com',
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  // Only verify pacts for specific consumer versions
  consumerVersionSelectors: [
    { mainBranch: true },
    { deployedOrReleased: true },
    { environment: 'staging' },
  ],
  // Publish verification results back to broker
  publishVerificationResult: true,
  providerVersion: '2.1.0',
  // Granular request filtering
  requestFilter: (req: any) => {
    req.headers['X-Request-Id'] = 'pact-verification';
    return req;
  },
};
```

### Webhook Triggers

```yaml
# .github/workflows/pact-verify.yml
name: Pact Provider Verification
on:
  workflow_dispatch: # Manual trigger
  repository_dispatch:
    types: [pact-change] # Webhook from Pact Broker

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run pact:verify
        env:
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
      - run: npx pact-broker can-i-deploy
          --pacticipant OrderService
          --version ${{ github.sha }}
          --to-environment staging
```

```bash
# Register webhook on Pact Broker to trigger provider CI
npx pact-broker create-webhook \
  "https://api.github.com/repos/company/order-service/dispatches" \
  --broker-base-url https://pact-broker.company.com \
  --request-method POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: token $GITHUB_TOKEN' \
  --body '{"event_type":"pact-change"}' \
  --consumer WebApp \
  --contract-published
```

## Pact Flow: can-i-deploy, Matrix, Tagging

### can-i-deploy

```bash
# Check if this version is safe to deploy to production
npx pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version 2.1.0 \
  --to-environment production

# Check multiple pacticipants simultaneously
npx pact-broker can-i-deploy \
  --pacticipant OrderService --version 2.1.0 \
  --pacticipant WebApp --version 1.2.3 \
  --pacticipant PaymentService --version 4.0.0 \
  --to-environment production
```

### Matrix-Based Dependency Verification

```
Pact Broker Matrix:
┌──────────────┬──────────────┬─────────────────┬──────────────┐
│ Consumer     │ Provider     │ Verified        │ Deployed     │
├──────────────┼──────────────┼─────────────────┼──────────────┤
│ WebApp 1.2.3 │ OrderSvc 2.1 │ ✅ 2026-05-27   │ prod         │
│ WebApp 1.2.2 │ OrderSvc 2.1 │ ✅ 2026-05-20   │ prod         │
│ WebApp 1.2.3 │ OrderSvc 2.0 │ ❌ (old pact)   │ —            │
│ WebApp 1.1.0 │ OrderSvc 1.5 │ ✅ 2026-04-15   │ prod         │
└──────────────┴──────────────┴─────────────────┴──────────────┘
```

```bash
# View matrix
npx pact-broker matrix \
  --pacticipant OrderService \
  --latestby '2026-05-27'

# Visual matrix output
npx pact-broker matrix \
  --pacticipant WebApp \
  --pacticipant OrderService \
  --output json
```

### Tagging

```bash
# Tag versions by branch/environment
npx pact-broker create-version-tag \
  --pacticipant WebApp \
  --version 1.2.3 \
  --tag main

npx pact-broker create-version-tag \
  --pacticipant WebApp \
  --version 1.2.3 \
  --tag production

# Verify against specific tag environments
npx pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version 2.1.0 \
  --to-environment staging
```

## Contract Testing with Message Queues

### Async Message Contracts

```typescript
// Consumer test for async message (SQS/RabbitMQ/Kafka)
import { MessageConsumerPact } from '@pact-foundation/pact';

const messagePact = new MessageConsumerPact({
  consumer: 'OrderProcessor',
  provider: 'OrderService',
  pactfileWriteMode: 'merge',
});

describe('Order confirmation message', () => {
  it('accepts a valid order confirmed event', () => {
    return messagePact
      .expectsToReceive('an order confirmed event')
      .withContent({
        id: like('ord_123'),
        customerId: like('cust_456'),
        total: decimal(99.99),
        items: eachLike({
          productId: like('prod_789'),
          quantity: integer(2),
          price: decimal(19.99),
        }),
        confirmedAt: iso8601DateTime('2026-05-27T10:30:00Z'),
      })
      .withMetadata({
        contentType: 'application/json',
        messageSource: 'order-service/orders',
      })
      .verify(async (message) => {
        // Consumer processes the message
        const handler = new OrderConfirmationHandler(db);
        await handler.handle(message);
        const order = await db.orders.findById(message.id);
        expect(order.status).toBe('confirmed');
      });
  });
});
```

```typescript
// Provider verification for messages
const verifier = new Verifier({
  provider: 'OrderService',
  providerBaseUrl: 'http://localhost:3000',
  pactBrokerUrl: 'https://pact-broker.company.com',
  consumerVersionSelectors: [{ deployedOrReleased: true }],

  // Message handlers — called when pact needs to verify message pacts
  messageHandlers: {
    'an order confirmed event': async () => {
      const event = await generateOrderConfirmedEvent({
        id: 'ord_123',
        customerId: 'cust_456',
        total: 99.99,
      });
      return JSON.stringify(event);
    },
  },
});
```

### Pact for Message-Based Systems

```typescript
// Kafka consumer contract
describe('Kafka payment events', () => {
  it('handles payment.processed event', async () => {
    const pact = new MessageConsumerPact({
      consumer: 'InvoiceService',
      provider: 'PaymentService',
    });

    return pact
      .expectsToReceive('a payment processed event')
      .withContent({
        paymentId: uuid(),
        orderId: uuid(),
        amount: decimal(199.99),
        currency: term({ generate: 'USD', matcher: '^(USD|EUR|GBP)$' }),
        status: term({ generate: 'completed', matcher: '^(completed|failed|refunded)$' }),
        processedAt: iso8601DateTime(),
      })
      .withMetadata({
        contentType: 'application/json',
        schemaVersion: '2.0',
      })
      .verify(async (messageContent) => {
        const invoiceService = new InvoiceService(db);
        await invoiceService.handlePaymentProcessed(messageContent);
        const invoice = await db.invoices.findByPayment(messageContent.paymentId);
        expect(invoice.status).toBe('paid');
      });
  });
});
```

## Contract Testing with gRPC

### Protobuf Contracts with Pact Plugin

```protobuf
// order.proto
syntax = "proto3";

service OrderService {
  rpc GetOrder (GetOrderRequest) returns (Order);
  rpc CreateOrder (CreateOrderRequest) returns (Order);
  rpc ListOrders (ListOrdersRequest) returns (ListOrdersResponse);
}

message GetOrderRequest {
  string id = 1;
}

message Order {
  string id = 1;
  string customer_id = 2;
  string status = 3;
  double total = 4;
  repeated OrderItem items = 5;
  string created_at = 6;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  double price = 3;
}
```

```typescript
// Consumer test with Pact gRPC plugin
import { PactV4 } from '@pact-foundation/pact';

describe('gRPC OrderService contract', () => {
  const pact = new PactV4({
    consumer: 'WebApp',
    provider: 'OrderService',
  });

  it('gets an order by id', async () => {
    const interaction = pact
      .addInteraction()
      .given('order 123 exists')
      .uponReceiving('a gRPC request for order 123')
      .usingPlugin({
        plugin: 'protobuf',
        version: '0.3.16',
      })
      .withRequest('grpc', request => {
        request
          .service('OrderService')
          .method('GetOrder')
          .content({
            contentType: 'application/protobuf',
            value: { id: '123' },
          });
      })
      .willRespondWith('grpc', response => {
        response
          .status(200)
          .content({
            contentType: 'application/protobuf',
            value: {
              id: '123',
              customerId: 'cust_456',
              status: 'confirmed',
              total: 49.99,
              items: [{ productId: 'p1', quantity: 2, price: 24.995 }],
            },
          });
      });

    await interaction.execute(async (mockServer) => {
      const client = new OrderGrpcClient(mockServer.url);
      const result = await client.getOrder('123');
      expect(result.id).toBe('123');
      expect(result.status).toBe('confirmed');
    });
  });
});
```

## API Testing Tools

### Postman / Newman Collections

```json
{
  "info": {
    "name": "Order Service API Tests",
    "schema": "https://schema.postman.com/json/collection/v2.1.0"
  },
  "item": [
    {
      "name": "Create Order",
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('Status code is 201', () => {",
              "  pm.response.to.have.status(201);",
              "});",
              "pm.test('Response has order id', () => {",
              "  const json = pm.response.json();",
              "  pm.expect(json.data.id).to.be.a('string');",
              "  pm.expect(json.data.status).to.eql('pending');",
              "});",
              "pm.collectionVariables.set('orderId', pm.response.json().data.id);"
            ]
          }
        }
      ],
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/orders",
        "header": [
          { "key": "Authorization", "value": "Bearer {{authToken}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{ \"customerId\": \"{{customerId}}\", \"items\": [{ \"productId\": \"{{productId}}\", \"quantity\": 1 }] }"
        }
      }
    }
  ]
}
```

```bash
# Run Postman collection in CI
npx newman run order-service.postman_collection.json \
  --env-var "baseUrl=https://staging-api.company.com" \
  --env-var "authToken=$TEST_TOKEN" \
  --reporters cli,junit \
  --reporter-junit-export test-results/api-tests.xml
```

### REST Assured (Java)

```java
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class OrderApiTest {
  @Test
  public void testCreateOrder() {
    given()
      .baseUri("https://api.company.com")
      .auth().oauth2(token)
      .contentType(ContentType.JSON)
      .body("{ \"customerId\": \"cust_1\", \"items\": [{ \"productId\": \"p1\", \"quantity\": 1 }] }")
    .when()
      .post("/v2/orders")
    .then()
      .statusCode(201)
      .body("data.id", notNullValue())
      .body("data.status", equalTo("pending"))
      .body("data.total", greaterThan(0f));
  }

  @Test
  public void testGetOrderReturns404ForUnknown() {
    given()
      .baseUri("https://api.company.com")
      .auth().oauth2(token)
    .when()
      .get("/v2/orders/nonexistent")
    .then()
      .statusCode(404)
      .body("error.code", equalTo("NOT_FOUND"));
  }
}
```

### Supertest (Node.js)

```typescript
import request from 'supertest';
import app from '../app';

describe('Order API', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await getTestToken();
  });

  it('creates an order', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: 'cust_1',
        items: [{ productId: 'p1', quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'pending',
      customerId: 'cust_1',
    });
  });

  it('rejects invalid request body', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ customerId: 'cust_1', items: [] });

    expect(res.status).toBe(401);
  });
});
```

### Bruno (OpenAPI-compatible API client)

```yaml
# bruno/collections/orders/create-order.bru
meta:
  name: Create Order
  type: http
  seq: 1

request:
  method: POST
  url: {{baseUrl}}/orders
  headers:
    Authorization: Bearer {{authToken}}
    Content-Type: application/json
  body:
    type: json
    json: |
      {
        "customerId": "{{customerId}}",
        "items": [
          { "productId": "{{productId}}", "quantity": 1 }
        ]
      }

assert:
  - name: Status is 201
    assert: res.status == 201
  - name: Has order ID
    assert: res.body.data.id != undefined
  - name: Status is pending
    assert: res.body.data.status == "pending"
```

### Insomnia

```yaml
# insomnia/order-service.yaml
_type: export
__export_format: 4
resources:
  - _type: request
    _id: req_create_order
    method: POST
    url: "{{ _.baseUrl }}/orders"
    headers:
      - name: Authorization
        value: "Bearer {{ _.authToken }}"
    body:
      mimeType: application/json
      text: '{ "customerId": "{{ _.customerId }}", "items": [{"productId": "{{ _.productId }}", "quantity": 1 }] }'
    authentication: {}
    description: Creates a new order in the system
```

## API Test Automation

### CI/CD Integration

```yaml
# .github/workflows/api-tests.yml
name: API Tests
on:
  pull_request:
    paths: ['src/**', 'api-spec/**']

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run pact:consumer
      - run: npm run pact:publish
        env:
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}

  provider-verification:
    needs: contract-tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run pact:provider:verify

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    needs: [integration-tests, provider-verification]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: docker compose -f docker-compose.e2e.yml up -d
      - run: npm run test:e2e
      - run: docker compose -f docker-compose.e2e.yml down
```

### Test Reporting

```typescript
// jest.config.ts with reporters
export default {
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'test-reports', outputName: 'junit.xml' }],
    ['jest-html-reporter', { outputPath: 'test-reports/report.html' }],
  ],
};
```

```bash
# Generate and publish test report
npm test -- --reporters=default --reporters=jest-junit
npx pact-broker publish-report \
  --provider OrderService \
  --provider-app-version $CI_COMMIT_SHA \
  --report test-reports/junit.xml
```

### Flaky Test Management

```typescript
// Retry flaky tests (Jest)
// jest.config.ts
export default {
  retryTimes: 2, // Retry failed tests up to 2 times
  testTimeout: 30000,
  // Detect flaky tests in CI
  detectFlaky: true,
};

// Mark known flaky tests
describe('GET /analytics/slow-report', () => {
  jest.retryTimes(3);
  it('returns report data within timeout', async () => {
    const res = await request(app).get('/analytics/slow-report');
    expect(res.status).toBe(200);
  });
});
```

```yaml
# .github/workflows/flaky-detector.yml
name: Flaky Test Detection
on:
  schedule:
    - cron: '0 6 * * 1' # Every Monday
  workflow_dispatch:

jobs:
  detect-flaky:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --flaky-detector --repeatEach 5
        continue-on-error: true
      - name: Report flaky tests
        run: npx flake-report --format markdown >> $GITHUB_STEP_SUMMARY
```

## Integration Testing

### Service-Level Tests

```typescript
// Full service integration test with real dependencies
import app from '../app';
import { db } from '../database';
import { messageQueue } from '../messaging';

describe('Order Service Integration', () => {
  beforeAll(async () => {
    await db.migrate.latest();
    await messageQueue.purgeAll();
  });

  afterAll(async () => {
    await db.destroy();
    await messageQueue.close();
  });

  beforeEach(async () => {
    await db.seed.run();
  });

  it('creates order and publishes event', async () => {
    const res = await request(app)
      .post('/orders')
      .send(validOrderPayload)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);

    // Verify DB state
    const order = await db.orders.findById(res.body.data.id);
    expect(order.status).toBe('pending');

    // Verify message published
    const messages = await messageQueue.receive('order.created');
    expect(messages).toHaveLength(1);
    expect(messages[0].payload.orderId).toBe(res.body.data.id);
  });
});
```

### Database Integration

```typescript
import { Client } from 'pg';
import { migrate } from '../database/migrate';

describe('Database Schema', () => {
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });

  beforeAll(async () => {
    await db.connect();
    await migrate.up(db);
  });

  afterAll(async () => {
    await migrate.down(db);
    await db.end();
  });

  it('enforces foreign key constraint on order items', async () => {
    await expect(db.query(`
      INSERT INTO order_items (order_id, product_id, quantity)
      VALUES ('nonexistent-order', 'p1', 1)
    `)).rejects.toThrow('foreign key constraint');
  });

  it('cascades delete from order to items', async () => {
    const order = await db.query(
      `INSERT INTO orders (customer_id, status) VALUES ($1, 'pending') RETURNING id`,
      ['cust_1']
    );
    await db.query(
      `INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, 'p1', 1)`,
      [order.rows[0].id]
    );
    await db.query('DELETE FROM orders WHERE id = $1', [order.rows[0].id]);
    const items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.rows[0].id]);
    expect(items.rows).toHaveLength(0);
  });
});
```

### External Service Mocking

```typescript
import nock from 'nock';

describe('Payment Gateway Integration', () => {
  afterEach(() => nock.cleanAll());

  it('handles successful payment', async () => {
    nock('https://payments.company.com')
      .post('/charges', body => body.amount === 4999)
      .reply(200, {
        id: 'ch_abc123',
        status: 'succeeded',
        amount: 4999,
        currency: 'usd',
      });

    const result = await PaymentService.charge({
      amount: 49.99,
      currency: 'USD',
      source: 'tok_visa',
    });

    expect(result.status).toBe('succeeded');
    expect(result.id).toBe('ch_abc123');
  });

  it('handles declined payment', async () => {
    nock('https://payments.company.com')
      .post('/charges')
      .reply(402, {
        error: { type: 'card_error', code: 'card_declined', message: 'Card was declined' },
      });

    await expect(PaymentService.charge({
      amount: 49.99,
      currency: 'USD',
      source: 'tok_declined',
    })).rejects.toThrow('Card was declined');
  });

  it('handles gateway timeout gracefully', async () => {
    nock('https://payments.company.com')
      .post('/charges')
      .replyWithError({ code: 'ETIMEDOUT', message: 'Operation timed out' });

    await expect(PaymentService.charge({
      amount: 49.99,
      currency: 'USD',
      source: 'tok_timeout',
    })).rejects.toThrow('Payment gateway timeout');
  });
});
```

## Mock Servers

### WireMock

```java
// Java: WireMock standalone server
import static com.github.tomakehurst.wiremock.client.WireMock.*;

public class PaymentMockServer {
  public static void main(String[] args) {
    configureFor("localhost", 8089);
    stubFor(post(urlEqualTo("/charges"))
      .withRequestBody(matchingJsonPath("$.amount"))
      .willReturn(aResponse()
        .withStatus(200)
        .withHeader("Content-Type", "application/json")
        .withBody("{ \"id\": \"ch_mock_123\", \"status\": \"succeeded\" }")));
  }
}
```

```json
// WireMock mapping file: __files/payments/charge-success.json
{
  "request": {
    "method": "POST",
    "url": "/charges",
    "bodyPatterns": [{ "matchesJsonPath": "$.amount" }]
  },
  "response": {
    "status": 200,
    "jsonBody": {
      "id": "ch_mock_{{randomValue type='UUID'}}",
      "status": "succeeded",
      "amount": "{{request.body.amount}}"
    },
    "headers": {
      "Content-Type": "application/json",
      "X-Request-Id": "{{request.headers.X-Request-Id}}"
    },
    "transformers": ["response-template"]
  }
}
```

### MockServer

```typescript
// MockServer with Node client
import { MockServerClient } from 'mockserver-client';

const client = MockServerClient.mockServerClient('localhost', 1080);

await client.mockAnyResponse({
  httpRequest: {
    method: 'POST',
    path: '/orders',
    headers: { Authorization: 'Bearer test_token' },
  },
  httpResponse: {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'ord_001',
      status: 'pending',
      total: 49.99,
    }),
    delay: { timeUnit: 'MILLISECONDS', value: 50 },
  },
  times: { unlimited: true },
});
```

### mountebank

```javascript
// mountebank impostor for HTTP API
const mb = require('mountebank');

const mbServer = mb.create({
  port: 2525, // admin port
  loglevel: 'warn',
});

mbServer.then(() => {
  return mb.post('/imposters', {
    protocol: 'http',
    port: 6566,
    stubs: [{
      predicates: [{
        equals: { method: 'POST', path: '/orders' },
        exists: { headers: { Authorization: true } },
      }],
      responses: [{
        is: {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'ord_001', status: 'pending' }),
        },
      }],
    }],
  });
});
```

### Contract-Based Mocking

```typescript
// Generate mocks from Pact contracts
import { createMockServer } from '@pact-foundation/pact';

async function startMockFromPact(pactFilePath: string) {
  const server = await createMockServer({
    pactFile: pactFilePath,
    consumer: 'WebApp',
    provider: 'OrderService',
  });
  return server;
}

// Test consumer against contract-generated mock
describe('Consumer with pact mocks', () => {
  let mockServer: any;

  beforeAll(async () => {
    mockServer = await startMockFromPact('./pacts/webapp-orderservice.json');
  });

  afterAll(() => mockServer.close());

  it('works with contract-based mock', async () => {
    const client = new OrderApiClient(mockServer.url);
    const order = await client.getOrder('123');
    expect(order.id).toBe('123');
  });
});
```

## Schema Validation Testing

### JSON Schema Validation

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

const orderResponseSchema = {
  type: 'object',
  required: ['id', 'status', 'total', 'items'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
    total: { type: 'number', exclusiveMinimum: 0 },
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
        },
      },
    },
  },
};

describe('Response schema validation', () => {
  const validate = ajv.compile(orderResponseSchema);

  it('validates a correct response', () => {
    const valid = validate({
      id: '0194fdc2-fa2f-7cc0-81d3-ff120745b99c',
      status: 'confirmed',
      total: 49.99,
      items: [{ productId: 'p1', quantity: 2 }],
    });
    expect(valid).toBe(true);
  });

  it('rejects response with invalid status', () => {
    const valid = validate({
      id: '0194fdc2-fa2f-7cc0-81d3-ff120745b99c',
      status: 'unknown_status',
      total: 49.99,
      items: [{ productId: 'p1', quantity: 2 }],
    });
    expect(valid).toBe(false);
  });
});
```

### OpenAPI Response Validation

```typescript
import { OpenAPIValidator } from 'express-openapi-validator';

// Middleware that validates responses against OpenAPI spec
app.use(
  OpenAPIValidator.middleware({
    apiSpec: './openapi.yaml',
    validateResponses: true, // Validates every outgoing response
    validateRequests: true,
  })
);
```

```typescript
// Test response against OpenAPI spec
import { OpenAPI } from 'openapi-typescript';
import { validateResponse } from 'openapi-response-validator';

describe('API responses conform to OpenAPI spec', () => {
  const spec = await OpenAPI.load('./openapi.yaml');

  it('GET /orders returns valid response', async () => {
    const res = await request(app).get('/orders');
    const result = validateResponse(spec, '/orders', 'get', 200, res.body);
    expect(result.errors).toHaveLength(0);
  });
});
```

## Performance Testing

### k6

```javascript
// k6/order-api-load.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderCreationTime = new Trend('order_creation_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 100 },  // Stay at 100
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],     // <1% failure rate
    errors: ['rate<0.05'],              // <5% application errors
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  group('order lifecycle', () => {
    // Create order
    const createRes = http.post(`${BASE_URL}/orders`, JSON.stringify({
      customerId: 'cust_1',
      items: [{ productId: 'p1', quantity: 1 }],
    }), {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    check(createRes, {
      'order created': (r) => r.status === 201,
    });
    errorRate.add(createRes.status !== 201);
    orderCreationTime.add(createRes.timings.duration);

    if (createRes.status === 201) {
      const orderId = createRes.json('data.id');

      // Get order
      const getRes = http.get(`${BASE_URL}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
      });
      check(getRes, { 'order retrieved': (r) => r.status === 200 });
    }
  });

  sleep(1);
}
```

```bash
# Run k6 test
k6 run k6/order-api-load.js \
  -e API_BASE_URL=https://staging-api.company.com \
  -e AUTH_TOKEN=$TEST_TOKEN \
  --out json=k6-results.json \
  --out dashboard
```

### Locust

```python
# locustfile.py
from locust import HttpUser, task, between, constant
import json

class OrderApiUser(HttpUser):
    wait_time = between(0.5, 2.5)

    def on_start(self):
        self.token = self.get_auth_token()
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json',
        }

    def get_auth_token(self):
        resp = self.client.post('/auth/login', json={
            'email': 'test@example.com',
            'password': 'test_password',
        })
        return resp.json()['token']

    @task(3)
    def list_orders(self):
        with self.client.get(
            '/orders?page=1&limit=20',
            headers=self.headers,
            catch_response=True,
        ) as resp:
            if resp.status_code == 429:
                resp.failure('Rate limited')
            elif resp.status_code != 200:
                resp.failure(f'Unexpected status: {resp.status_code}')

    @task(2)
    def create_order(self):
        payload = {
            'customerId': 'cust_1',
            'items': [{'productId': 'p1', 'quantity': 1}],
        }
        with self.client.post(
            '/orders',
            json=payload,
            headers=self.headers,
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                self.order_id = resp.json()['data']['id']
            elif resp.status_code == 429:
                resp.failure('Rate limited')
            else:
                resp.failure(f'Create failed: {resp.status_code}')

    @task(1)
    def get_order(self):
        if hasattr(self, 'order_id'):
            self.client.get(
                f'/orders/{self.order_id}',
                headers=self.headers,
            )
```

### Artillery

```yaml
# artillery/order-api.yml
config:
  target: "https://staging-api.company.com"
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 50
      name: "Ramp up load"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
  defaults:
    headers:
      Authorization: "Bearer {{ $processEnvironment.AUTH_TOKEN }}"
      Content-Type: "application/json"
  environments:
    production:
      target: "https://api.company.com"

scenarios:
  - name: "Order workflow"
    flow:
      - post:
          url: "/orders"
          json:
            customerId: "cust_1"
            items:
              - productId: "p1"
                quantity: 1
          capture:
            - json: "$.data.id"
              as: "orderId"
      - get:
          url: "/orders/{{ orderId }}"
      - think: 1
```

### Gatling (Scala)

```scala
// Gatling simulation
class OrderApiSimulation extends Simulation {
  val httpProtocol = http
    .baseUrl("https://staging-api.company.com")
    .header("Authorization", "Bearer ${token}")
    .header("Content-Type", "application/json")

  val createOrder = exec(
    http("Create Order")
      .post("/orders")
      .body(StringBody("""{"customerId": "cust_1", "items": [{"productId": "p1", "quantity": 1}]}"""))
      .check(status.is(201))
      .check(jsonPath("$.data.id").saveAs("orderId"))
  ).pause(1)

  val getOrder = exec(
    http("Get Order")
      .get("/orders/${orderId}")
      .check(status.is(200))
  )

  val scn = scenario("Order Workflow")
    .exec(createOrder, getOrder)

  setUp(
    scn.inject(
      rampUsers(50).during(60),
      constantUsersPerSec(20).during(120)
    )
  ).protocols(httpProtocol)
}
```

## Security Testing

### OWASP ZAP

```yaml
# .github/workflows/zap-scan.yml
name: ZAP API Scan
on:
  schedule:
    - cron: '0 6 * * 1' # Weekly
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start API and ZAP
        run: |
          docker compose -f docker-compose.yml up -d api
          docker run -d --name zap -p 8090:8090 \
            -v $PWD:/zap/wrk/:rw \
            ghcr.io/zaproxy/zaproxy:stable \
            zap.sh -daemon -port 8090 -host 0.0.0.0
      - name: Run ZAP API scan
        run: |
          docker exec zap zap-api-scan.py \
            -t https://api.company.com/v3/openapi.json \
            -f openapi \
            -r zap-report.html \
            -z "-config api.addrs.addr.name=.*"
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: zap-report
          path: zap-report.html
```

### Authentication / Authorization Testing

```typescript
describe('Authorization enforcement', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/orders');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with expired token', async () => {
    const expired = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1MTYyMzkwMjJ9.xxx';
    const res = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('rejects user without required role', async () => {
    const userToken = await getTokenForRole('customer');
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('enforces resource isolation between users', async () => {
    const tokenA = await getTokenForUser('user_a');
    const tokenB = await getTokenForUser('user_b');
    const resB = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${tokenB}`);
    // User B should not see User A's orders
    const orderIds = resB.body.data.map((o: any) => o.customerId);
    expect(orderIds.every((id: string) => id === 'user_b')).toBe(true);
  });
});
```

### Rate Limit Testing

```typescript
describe('Rate limiting', () => {
  it('blocks requests after exceeding limit', async () => {
    const endpoint = '/auth/login';
    const payload = { email: 'test@example.com', password: 'wrong' };

    // Exhaust rate limit
    for (let i = 0; i < 5; i++) {
      await request(app).post(endpoint).send(payload);
    }

    const res = await request(app).post(endpoint).send(payload);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('includes rate limit headers', async () => {
    const res = await request(app).get('/orders');
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('resets rate limit after window expires', async () => {
    const res = await request(app).get('/orders');
    const remaining = parseInt(res.headers['x-ratelimit-remaining']);
    expect(remaining).toBeGreaterThan(0);
  });
});
```

## Fuzz Testing APIs

### Payload Mutation

```typescript
describe('Fuzz testing POST /orders', () => {
  const fuzzPayloads = [
    null,
    undefined,
    'not-json',
    {},
    { customerId: null },
    { customerId: 'not-a-uuid' },
    { customerId: '123', items: 'not-array' },
    { customerId: '123', items: [{}] },
    { customerId: '123', items: [{ productId: null }] },
    { customerId: '123', items: [{ productId: 'p1', quantity: -1 }] },
    { customerId: '123', items: [{ productId: 'p1', quantity: 1001 }] }, // > max
    { customerId: '123', items: new Array(100).fill({ productId: 'p1', quantity: 1 }) }, // > max items
    { customerId: '123', items: [{ productId: 'p1', quantity: 1 }], extraField: 'should-ignore' },
    { customerId: '123', items: [{ productId: 'p1', quantity: 1 }], __proto__: { admin: true } },
  ];

  fuzzPayloads.forEach((payload, index) => {
    it(`handles fuzz payload ${index} gracefully (no 500)`, async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      // Should return 4xx, never 500
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });
});
```

### Boundary Testing

```typescript
describe('Boundary testing', () => {
  it('handles maximum pagination limit', async () => {
    const res = await request(app).get('/orders?limit=100');
    expect(res.status).toBe(200);
  });

  it('rejects excessive pagination limit', async () => {
    const res = await request(app).get('/orders?limit=1000');
    expect(res.status).toBe(422);
  });

  it('handles empty string parameters', async () => {
    const res = await request(app).get('/orders?status=');
    // Should not crash — treat as missing filter
    expect(res.status).toBe(200);
  });

  it('handles special characters in search', async () => {
    const res = await request(app).get('/orders?q=<script>alert("xss")</script>');
    expect(res.status).toBe(200);
  });

  it('handles extremely long string inputs', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: 'x'.repeat(10000),
        items: [{ productId: 'p1', quantity: 1 }],
      });
    expect(res.status).toBe(422); // Validation should catch it
  });
});
```

## API Monitoring

### Synthetic Tests

```typescript
// Checkly or Playwright synthetic monitor
import { expect } from '@playwright/test';
import { test } from './monitoring-fixture';

test('Order API health check', async ({ request }) => {
  const res = await request.get('https://api.company.com/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({
    status: 'healthy',
    uptime: expect.any(Number),
    database: 'connected',
    redis: 'connected',
  });
  // Assert response time SLA
  const duration = res.headers()['x-response-time-ms'];
  expect(Number(duration)).toBeLessThan(200);
});

test('Critical endpoint: create order', async ({ request }) => {
  const res = await request.post('https://api.company.com/orders', {
    data: { customerId: 'monitor_cust', items: [{ productId: 'p1', quantity: 1 }] },
    headers: { Authorization: `Bearer ${process.env.MONITOR_TOKEN}` },
  });
  expect(res.status()).toBe(201);
  const responseTime = res.headers()['x-response-time-ms'];
  expect(Number(responseTime)).toBeLessThan(500); // SLA for critical endpoints
});
```

### Health Check Endpoints

```typescript
app.get('/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    version: '2.1.0',
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      paymentGateway: await checkPaymentGateway(),
    },
  };

  const unhealthy = Object.entries(checks.checks)
    .filter(([_, status]) => status !== 'connected');

  if (unhealthy.length > 0) {
    checks.status = 'degraded';
    res.status(503);
  }

  res.json(checks);
});

async function checkDatabase(): Promise<string> {
  try {
    await db.raw('SELECT 1');
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
```

### SLA Monitoring

```typescript
// Prometheus metrics for API monitoring
import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpErrorTotal = new prometheus.Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors by code',
  labelNames: ['code'],
});

// Middleware to record metrics
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
    httpRequestTotal.inc({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
    if (res.statusCode >= 400) {
      httpErrorTotal.inc({ code: res.statusCode.toString() });
    }
  });
  next();
});
```

## Testing for Backward Compatibility

### Breaking Change Detection

```typescript
import { OpenAPIV3 } from 'openapi-types';
import { diffSpecs } from 'openapi-diff';

describe('Backward compatibility', () => {
  const oldSpec = require('./openapi-v2.yaml');
  const newSpec = require('./openapi-v2.1.yaml');

  it('detects breaking changes', async () => {
    const diff = await diffSpecs(oldSpec, newSpec);
    const breakingChanges = diff.filter(c => c.type === 'breaking');
    expect(breakingChanges).toHaveLength(0);
  });

  it('allows additive changes', async () => {
    const diff = await diffSpecs(oldSpec, newSpec);
    const additions = diff.filter(c =>
      c.type === 'additive' || c.type === 'info'
    );
    // Additive changes are OK
  });
});
```

```typescript
// Contract-level backward compatibility
describe('Pact backward compatibility check', () => {
  it('new provider version satisfies all consumer pacts', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3000',
      provider: 'OrderService',
      providerVersion: '2.1.0',
      pactBrokerUrl: 'https://pact-broker.company.com',
      // Verify against ALL consumer pacts, not just latest
      consumerVersionSelectors: [
        { mainBranch: true },
        { deployedOrReleased: true },
        { environment: 'production' },
        { environment: 'staging' },
      ],
      includeWipPactsSince: '2026-04-01',
    });

    await verifier.verifyProvider();
  });
});
```

### Version Compatibility Tests

```typescript
describe('Multi-version API compatibility', () => {
  it('v1 endpoints still work after v2 changes', async () => {
    const resV1 = await request(app)
      .get('/v1/orders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resV1.status).toBe(200);
    // v1 response format must be preserved
    expect(resV1.body).toHaveProperty('orders'); // v1 format
    expect(resV1.body.orders).toBeInstanceOf(Array);
  });

  it('v2 endpoints coexist with v1', async () => {
    const [v1, v2] = await Promise.all([
      request(app).get('/v1/orders').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/v2/orders').set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(v1.status).toBe(200);
    expect(v2.status).toBe(200);
  });
});
```

## Documentation Testing

### OpenAPI Spec Validation

```typescript
import { validate } from 'openapi-validator';

describe('OpenAPI specification', () => {
  it('is valid OpenAPI 3.1', async () => {
    const result = await validate('./openapi.yaml');
    expect(result.valid).toBe(true);
  });

  it('has all paths documented', async () => {
    const spec = await OpenAPI.load('./openapi.yaml');
    const registeredPaths = getRegisteredPaths(app);
    const docPaths = Object.keys(spec.paths);
    expect(registeredPaths.every(p => docPaths.includes(p))).toBe(true);
  });
});
```

### Example Accuracy

```typescript
describe('API documentation examples', () => {
  it('example request bodies are valid', async () => {
    const spec = await OpenAPI.load('./openapi.yaml');
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (operation.requestBody?.content?.['application/json']?.example) {
          const example = operation.requestBody.content['application/json'].example;
          const res = await request(app)
            [method](path)
            .send(example)
            .set('Authorization', `Bearer ${adminToken}`);
          // Example should produce a valid response (201, 200, etc.)
          expect(res.status).toBeLessThan(500);
        }
      }
    }
  });

  it('example responses match actual schemas', async () => {
    const spec = require('./openapi.yaml');
    // Walk examples and validate against schema
    for (const example of extractExamples(spec)) {
      const validator = ajv.compile(example.schema);
      expect(validator(example.value)).toBe(true);
    }
  });
});
```

### Link Checking

```typescript
describe('Documentation links are valid', () => {
  it('all external links in OpenAPI spec are reachable', async () => {
    const spec = await OpenAPI.load('./openapi.yaml');
    const links = extractExternalLinks(spec);
    for (const link of links) {
      const res = await fetch(link, { method: 'HEAD' });
      expect(res.ok).toBe(true);
    }
  });
});
```

## Best Practices

### Test Data Management

```typescript
// Factory for test data
import { createFactory } from 'test-data-bot';

export const orderFactory = createFactory<OrderInput>((fake) => ({
  customerId: fake.guid(),
  items: [
    {
      productId: fake.guid(),
      quantity: fake.integer({ min: 1, max: 10 }),
    },
  ],
  shippingAddress: {
    street: fake.streetName(),
    city: fake.city(),
    zip: fake.zipCode(),
  },
}));

// Seeded test data for provider states
export const seedData = {
  order123: {
    id: '123',
    customerId: 'cust_1',
    status: 'confirmed',
    total: 49.99,
    items: [{ productId: 'p1', quantity: 2, price: 24.995 }],
  },
  customerWithOrders: async (db: any) => {
    await db.orders.insert({ id: '1', customerId: 'cust_a', status: 'pending' });
    await db.orders.insert({ id: '2', customerId: 'cust_a', status: 'shipped' });
    return { customerId: 'cust_a' };
  },
};
```

### Environment Management

```bash
# .env.test — isolated test environment
DATABASE_URL=postgres://test:test@localhost:5433/test_db
REDIS_URL=redis://localhost:6380
PAYMENT_API_BASE_URL=http://localhost:8089
MESSAGE_QUEUE_URL=amqp://localhost:5673/test

# Run tests with isolated env
dotenv -e .env.test -- npm test
```

### Test Isolation

```typescript
// Ensure test isolation
describe('Order API', () => {
  let testDb: Database;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await testDb.migrate();
  });

  beforeEach(async () => {
    // Clean slate for each test
    await testDb.truncateAll();
    await testDb.seedBaseData();
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  it('does not leak state between tests', async () => {
    const res1 = await request(app).get('/orders');
    expect(res1.body.data).toHaveLength(3); // Seeded data

    await request(app)
      .post('/orders')
      .send(validOrderPayload)
      .set('Authorization', `Bearer ${adminToken}`);

    const res2 = await request(app).get('/orders');
    expect(res2.body.data).toHaveLength(4);
  });

  it('is not affected by previous test mutations', async () => {
    const res = await request(app).get('/orders');
    expect(res.body.data).toHaveLength(3); // Back to baseline
  });
});
```

### Key Points
- Use the testing pyramid: many unit tests, few E2E tests
- Contract tests catch breaking changes at integration boundaries without E2E brittleness
- Pact: consumer defines expectations, provider verifies, broker manages compatibility
- `can-i-deploy` gates deployments based on contract verification matrix
- Use provider states to set up test data matching consumer scenarios
- Mock external services for deterministic integration tests
- Validate all API responses against OpenAPI schema
- Include performance, security, and fuzz testing in the test suite
- Monitor production APIs with synthetic tests and SLA tracking
- Run backward compatibility checks to prevent breaking consumers
- Isolate test data with disposable databases and per-test cleanup
- Automate contract verification with Pact Broker webhooks
