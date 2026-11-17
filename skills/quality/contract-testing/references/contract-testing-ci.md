# Contract Testing CI Pipeline

## Overview
Integrate contract testing into CI/CD: publish pacts on consumer builds, verify on provider builds, use PactFlow/broker for coordination.

## Consumer CI Pipeline

```yaml
# .github/workflows/consumer-contract.yml
name: Consumer Contract Tests
on:
  pull_request:
    paths:
      - 'services/order-web/**'
  push:
    branches: [main]

jobs:
  contract-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Run consumer contract tests
        run: npm run test:contract
        working-directory: services/order-web
      - name: Publish pacts to PactFlow
        if: ${{ github.event_name == 'push' }}
        env:
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
        run: |
          npx pact-broker publish ./pacts \
            --consumer-app-version ${{ github.sha }} \
            --branch ${{ github.ref_name }} \
            --broker-base-url https://company.pactflow.io \
            --auto-detect-version-properties
      - name: Check for breaking changes
        if: ${{ github.event_name == 'pull_request' }}
        env:
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
        run: |
          npx pact-broker can-i-deploy \
            --pacticipant OrderWeb \
            --version ${{ github.sha }} \
            --to-environment production \
            --broker-base-url https://company.pactflow.io
```

## Provider CI Pipeline

```yaml
# .github/workflows/provider-verification.yml
name: Provider Contract Verification
on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'services/order-api/**'

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Start provider
        run: npm start & npx wait-on http://localhost:3000/health
      - name: Fetch pacts from broker
        env:
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
        run: |
          npx pact-broker fetch-pacts \
            --provider OrderApi \
            --broker-base-url https://company.pactflow.io \
            --tag main \
            --output ./pacts
      - name: Verify pacts
        env:
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
        run: |
          npx pact-provider-verifier \
            --provider-base-url http://localhost:3000 \
            --pact-urls ./pacts/*.json \
            --provider-states-setup-url http://localhost:3000/test/setup \
            --pact-broker-base-url https://company.pactflow.io \
            --publish-verification-results
      - name: Tag provider version
        if: ${{ success() && github.ref == 'refs/heads/main' }}
        env:
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
        run: |
          npx pact-broker create-version-tag \
            --pacticipant OrderApi \
            --version ${{ github.sha }} \
            --tag production \
            --broker-base-url https://company.pactflow.io
```

## Provider State Management

```typescript
// Provider states setup endpoint for verification
import express from 'express';

const app = express();

// Provider states — set up database state before verifying each interaction
const providerStates: Record<string, () => Promise<void>> = {
  'order exists': async () => {
    await seedOrder({
      id: '0194fdc2-fa2f-7cc0-81d3-ff120745b99c',
      customerId: 'cust_123',
      status: 'pending',
      items: [{ productId: 'prod_1', quantity: 2 }],
    });
  },
  'order list has multiple orders': async () => {
    await seedOrder({ id: 'order_1', customerId: 'cust_123', status: 'pending' });
    await seedOrder({ id: 'order_2', customerId: 'cust_123', status: 'shipped' });
    await seedOrder({ id: 'order_3', customerId: 'cust_456', status: 'delivered' });
  },
  'no orders exist': async () => {
    await clearOrders();
  },
  'order has been cancelled': async () => {
    await seedOrder({
      id: '0194fdc2-fa2f-7cc0-81d3-ff120745b99c',
      customerId: 'cust_123',
      status: 'cancelled',
    });
  },
};

app.post('/test/setup', express.json(), async (req, res) => {
  const { consumer, provider, states } = req.body;

  // Clear previous test data
  await clearAllTestData();

  // Set up requested states
  for (const state of states) {
    const setup = providerStates[state];
    if (setup) {
      await setup();
    }
  }

  res.status(200).send('States setup complete');
});
```

## Breaking Change Detection

```typescript
// Automated breaking change detection in CI
class BreakingChangeDetector {
  async detectBreakingChanges(): Promise<BreakingChange[]> {
    const changes: BreakingChange[] = [];

    // 1. Get all pacts for this provider
    const pacts = await this.fetchPactsForProvider('OrderApi');

    for (const pact of pacts) {
      // 2. Verify against current provider
      const result = await this.verifyPact(pact);

      if (!result.success) {
        // Check if it's a new interaction or changed existing one
        const previousResult = await this.getPreviousVerification(pact);

        if (previousResult?.success) {
          // Was working before, now broken — breaking change
          changes.push({
            type: 'breaking',
            consumer: pact.consumer.name,
            interaction: pact.interaction.description,
            previousPassed: true,
            currentFailed: true,
            error: result.error,
          });
        }
      }
    }

    return changes;
  }
}
```

## Pact Broker Webhook Integration

```yaml
# PactFlow webhook — notify provider when consumer publishes new pact
webhook:
  events:
    - contract_content_changed
    - provider_verification_failed
  request:
    method: POST
    url: https://api.github.com/repos/company/backend/dispatches
    headers:
      Authorization: Bearer ${GITHUB_TOKEN}
      Content-Type: application/json
    body: |
      {
        "event_type": "pact_changed",
        "client_payload": {
          "consumer": "${pact.consumer.name}",
          "provider": "${pact.provider.name}",
          "pact_url": "${pact.url}"
        }
      }
```

## Monitoring Contract Test Health

```typescript
class ContractHealthDashboard {
  async getHealthReport(): Promise<ContractHealthReport> {
    const pacts = await this.pactBroker.getAllPacts();

    const totalPacts = pacts.length;
    const verifiedPacts = pacts.filter(p => p.verifiedAt !== null).length;
    const failedPacts = pacts.filter(p => p.lastVerificationFailed).length;

    return {
      totalPacts,
      verifiedPacts,
      failedPacts,
      verificationRate: totalPacts > 0 ? (verifiedPacts / totalPacts) * 100 : 0,
      failingConsumers: pacts
        .filter(p => p.lastVerificationFailed)
        .map(p => ({
          consumer: p.consumer,
          provider: p.provider,
          lastFailedAt: p.lastVerificationTimestamp,
          interactions: p.failedInteractions,
        })),
    };
  }
}
```

## Key Points
- Consumer CI: run contract tests, publish pacts, check can-i-deploy
- Provider CI: start service, fetch pacts, verify, publish verification results
- Maintain provider state setup endpoints for deterministic testing
- Tag versions for environment tracking (production, staging)
- Monitor contract test health: verification rate, failing consumers
