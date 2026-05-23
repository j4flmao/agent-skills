# Pact Setup

## Installation

```bash
# Consumer and provider
npm install --save-dev @pact-foundation/pact-core @pact-foundation/pact
# or
pip install pact-python

# Pact CLI (for verification against local broker)
npm install --save-dev @pact-foundation/pact-cli
```

## Project Structure

```
contracts/
├── consumer/
│   ├── pact/
│   │   └── consumer-provider-pact.json  # Generated pacts
│   └── tests/
│       └── api.pact.test.ts
└── provider/
    └── tests/
        └── verify.pact.test.ts
```

## Consumer-Side Tests (Pact)

```typescript
// contracts/consumer/tests/api.pact.test.ts
import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { API } from "../src/api";

const provider = new PactV3({
  consumer: "MyApp",
  provider: "UserService",
  port: 4000,
  logLevel: "info",
});

describe("UserService API", () => {
  it("returns user by ID", async () => {
    provider
      .given("user exists with ID 1")
      .uponReceiving("a request for user 1")
      .withRequest({
        method: "GET",
        path: "/api/users/1",
        headers: { Authorization: "Bearer token" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: MatchersV3.like({
          id: MatchersV3.integer(1),
          name: MatchersV3.string("Alice"),
          email: MatchersV3.string("alice@example.com"),
          role: MatchersV3.string("admin"),
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const api = new API(mockServer.url);
      const user = await api.getUser(1);
      expect(user).toEqual({
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        role: "admin",
      });
    });
  });

  it("returns 404 for nonexistent user", async () => {
    provider
      .given("user does not exist")
      .uponReceiving("a request for nonexistent user")
      .withRequest({
        method: "GET",
        path: "/api/users/999",
        headers: { Authorization: "Bearer token" },
      })
      .willRespondWith({ status: 404 });

    await provider.executeTest(async (mockServer) => {
      const api = new API(mockServer.url);
      await expect(api.getUser(999)).rejects.toThrow("Not found");
    });
  });
});
```

## Pact Matchers

```typescript
import { MatchersV3 } from "@pact-foundation/pact";
const { like, term, eachLike, boolean, integer, decimal, string } = MatchersV3;

// Type-based matchers (recommended)
const userMatcher = like({
  id: integer(1),
  name: string("Alice"),
  email: string("alice@example.com"),
  isActive: boolean(true),
  score: decimal(4.5),
  createdAt: term({
    matcher: "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z",
    generate: "2026-01-15T10:30:00Z",
  }),
});

// Array matchers
const usersList = eachLike(userMatcher, { min: 1 });

// Optional fields
const optionalField = term({
  matcher: ".*",
  generate: "optional string",
});
```

## Pact File Output

```json
// contracts/consumer/pact/myapp-userservice-pact.json
{
  "consumer": { "name": "MyApp" },
  "provider": { "name": "UserService" },
  "interactions": [
    {
      "description": "a request for user 1",
      "providerStates": [
        { "name": "user exists with ID 1" }
      ],
      "request": {
        "method": "GET",
        "path": "/api/users/1",
        "headers": { "Authorization": "Bearer token" }
      },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": {
          "id": 1,
          "name": "Alice",
          "email": "alice@example.com",
          "role": "admin"
        }
      }
    }
  ],
  "metadata": {
    "pactSpecification": { "version": "3.0.0" }
  }
}
```

## Provider-Side Verification

```typescript
// contracts/provider/tests/verify.pact.test.ts
import { Verifier } from "@pact-foundation/pact";

describe("UserService Pact Verification", () => {
  it("verifies consumer pacts", async () => {
    const opts = {
      provider: "UserService",
      providerBaseUrl: "http://localhost:3000",
      pactUrls: [
        // From local pact file
        path.resolve(__dirname, "../pacts/myapp-userservice-pact.json"),
      ],
      // Or from PactFlow broker
      // pactBrokerUrl: "https://your-org.pactflow.io",
      // pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      // Provider states
      stateHandlers: {
        "user exists with ID 1": async () => {
          await seedUser({ id: 1, name: "Alice" });
        },
        "user does not exist": async () => {
          await clearUsers();
        },
      },

      // Verification options
      publishVerificationResult: true,
      providerVersion: "1.0.0",
      providerVersionBranch: "main",
    };

    const output = await new Verifier(opts).verifyProvider();
    console.log("Pact Verification Complete!");
    console.log(output);
  });
});
```

## PactFlow/Broker Setup

```yaml
# docker-compose.yml for local Pact broker
services:
  pact-broker:
    image: pactfoundation/pact-broker
    ports: ["9292:9292"]
    environment:
      PACT_BROKER_DATABASE_URL: postgres://postgres:password@db/postgres
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: password
```

```bash
# Publish pact to broker
npx pact-broker publish contracts/consumer/pact/ \
  --consumer-app-version 1.0.0 \
  --branch main \
  --broker-base-url http://localhost:9292

# Can I deploy? (check if consumer and provider are compatible)
npx pact-broker can-i-deploy \
  --pacticipant MyApp \
  --version 1.0.0 \
  --to-environment production
```

## CI Integration

```yaml
# .github/workflows/contract-testing.yml
name: Contract Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      pact-broker:
        image: pactfoundation/pact-broker
        env:
          PACT_BROKER_DATABASE_URL: postgres://postgres:password@localhost:5432/postgres
        ports: ["9292:9292"]
        options: >-
          --health-cmd "curl -f http://localhost:9292"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      db:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd "pg_isready"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    strategy:
      matrix:
        role: [consumer, provider]

    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:pact:${{ matrix.role }}
        env:
          PACT_BROKER_BASE_URL: http://localhost:9292

  can-i-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: |
          npx pact-broker can-i-deploy \
            --pacticipant MyApp --version $GITHUB_SHA \
            --pacticipant UserService --version $GITHUB_SHA
```

## Common Pact Patterns

| Pattern | Consumer Side | Provider Side |
|---------|--------------|---------------|
| Query params | `withQuery({ page: "1", limit: "10" })` | Match query in handler |
| Request body | `withBody(like({...}))` in POST | Match request body schema |
| Headers | `withHeaders({ Authorization: "Bearer token" })` | Verify auth header exists |
| Provider states | `given("user exists")` | Implement `stateHandlers` |
| Error responses | `willRespondWith({ status: 422, body: like({...}) })` | Produce matching errors |
| Pagination | `body: eachLike(...)` for data, `like(...)` for meta | Implement paginated endpoint |
