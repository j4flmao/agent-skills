# Contract Testing Tools

## Tool Comparison

| Tool | Protocol | Language Support | Broker | CI Integration | Best For |
|------|----------|-----------------|--------|---------------|----------|
| Pact | HTTP, GraphQL, gRPC, async | JS, Java, Go, Python, .NET, Rust, Ruby | PactFlow / Self-hosted | Native CLI, GH Action, Jenkins | Consumer-driven contracts |
| Spring Cloud Contract | HTTP, messaging | Java, Kotlin (JVM) | Stub Runner / Git | Maven/Gradle plugin | Spring Boot ecosystems |
| OpenAPI (spec) | HTTP/REST | Language-agnostic | Any registry | Spectral, Redocly CLI | Provider-contract alignment |
| Hoverfly | HTTP | Language-agnostic | None (local) | Docker, CLI | API simulation and verification |
| Mountebank | HTTP, TCP, SMTP | Language-agnostic | None (local) | Docker, CLI | Multi-protocol imposters |

## Pact Language Support Matrix

```yaml
pact:
  javascript:
    library: "@pact-foundation/pact"
    version: "v3"
    features: [consumer, provider, message, graphql, grpc]
  java:
    library: "au.com.dius.pact"
    version: "4.x"
    features: [consumer, provider, message, graphql]
  python:
    library: "pact-python"
    version: "3.x"
    features: [consumer, provider, message]
  go:
    library: "pact-go"
    version: "2.x"
    features: [consumer, provider]
  dotnet:
    library: "PactNet"
    version: "5.x"
    features: [consumer, provider, message]
  rust:
    library: "pact-rust"
    version: "1.x"
    features: [consumer, provider]
  ruby:
    library: "pact-ruby"
    version: "1.x"
    features: [consumer, provider, message]
```

## Pact Broker Setup

```yaml
# docker-compose.yml for self-hosted Pact Broker
version: '3'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: pactbroker
      POSTGRES_USER: pactbroker
      POSTGRES_PASSWORD: pactbroker
    volumes:
      - postgres_data:/var/lib/postgresql/data

  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgres://pactbroker:pactbroker@postgres/pactbroker
      PACT_BROKER_BASIC_AUTH_USERNAME: pactbroker
      PACT_BROKER_BASIC_AUTH_PASSWORD: pactbroker
      PACT_BROKER_WEBHOOK_HOST: pact-broker
    depends_on:
      - postgres
```

## PactFlow Features

```yaml
pactflow:
  features:
    - "Contract verification badges"
    - "Webhook notifications (Slack, Teams, email)"
    - "Bi-directional contract validation"
    - "Provider tags and environment tracking"
    - "API diff and breaking change detection"
    - "RBAC and SSO integration"
  pricing: per-contract-per-month
  alternative: "Self-hosted Pact Broker (open-source, no webhooks)"
```

## Spring Cloud Contract

```groovy
// build.gradle — Spring Cloud Contract
contracts {
  packageWithBaseClasses = 'com.example.contracts'
  baseClassMappings {
    baseClassMapping('.*user.*', 'com.example.UserBase')
    baseClassMapping('.*order.*', 'com.example.OrderBase')
  }
}

// Contract definition (Groovy DSL)
Contract.make {
  description "should return user by ID"
  request {
    method GET()
    url '/users/1'
    headers { accept(applicationJson()) }
  }
  response {
    status OK()
    headers { contentType(applicationJson()) }
    body([id: 1, name: 'John', email: 'john@example.com'])
  }
}
```

## Tool Selection Decision Flow

```
Need contract testing?
├── HTTP API?
│   ├── Java/Spring Boot? → Spring Cloud Contract
│   ├── Multi-language/CDC? → Pact
│   └── Simple provider spec? → OpenAPI + Spectral
├── GraphQL API?
│   └── Pact (supports GraphQL)
├── gRPC?
│   └── Pact (v4+ supports gRPC)
└── Async/message-based?
    └── Pact (message pact)
```

## CI Integration Patterns

```yaml
# GitHub Actions — Consumer publishes pact
consumer-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm test  # runs pact consumer tests
    - name: Publish pacts
      run: |
        npx pact-broker publish ./pacts \
          --consumer-app-version ${{ github.sha }} \
          --branch ${{ github.ref_name }} \
          --broker-base-url ${{ secrets.PACT_BROKER_URL }} \
          --broker-token ${{ secrets.PACT_BROKER_TOKEN }}

# GitHub Actions — Provider verifies pacts
provider-verification:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm run start:test  # start provider in test mode
    - name: Verify pacts
      run: |
        npx pact-provider-verifier \
          --provider-base-url http://localhost:8080 \
          --pact-broker-url ${{ secrets.PACT_BROKER_URL }} \
          --broker-token ${{ secrets.PACT_BROKER_TOKEN }} \
          --provider-app-version ${{ github.sha }} \
          --publish-verification-results
```

## Best Practices

- Use Pact matchers (`like()`, `eachLike()`, `term()`) instead of exact values
- Set meaningful provider states for each interaction
- Run consumer tests on every PR, publish pacts on merge to main
- Run provider verification against the latest main branch pacts
- Use can-i-deploy to check if a version is safe to deploy
- Tag pacts with environment names (prod, staging) for matrix testing
- Keep pact files under version control for local development
- Use webhooks to notify providers when consumer pacts change
