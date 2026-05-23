# Provider Verification

## Provider Verification Setup

### TypeScript/Jest Provider Test
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
      providerStatesSetupUrl: "http://localhost:3001/api/test/setup",
      onChange: (state) => {
        // Called when a new contract is published
        console.log(`New contract from ${state.consumerName}`);
      },
    });

    await verifier.verifyProvider();
  }, 60000); // 60s timeout
});
```

### Provider States Setup Endpoint
The provider exposes a test-only endpoint to set up provider states:
```typescript
// payment-service/src/test-setup.controller.ts
@Controller("/api/test/setup")
export class TestSetupController {
  constructor(private readonly connection: Connection) {}

  @Post()
  async setupState(@Body() body: { consumer: string; state: string }): Promise<void> {
    switch (body.state) {
      case "a payment with id 123 exists":
        await this.connection.query(
          "INSERT INTO payments (id, status, amount) VALUES ($1, $2, $3)",
          ["123", "confirmed", 49.99]
        );
        break;
      case "no payments exist":
        await this.connection.query("DELETE FROM payments");
        break;
      case "payment 123 is pending":
        await this.connection.query(
          "UPDATE payments SET status = $1 WHERE id = $2",
          ["pending", "123"]
        );
        break;
    }
  }
}
```

## CI Pipeline Flow

```
Consumer Service (e.g., OrderService)
  └─ Run tests (including Pact consumer tests)
  └─ Publish pact to broker
  └─ Tag version (e.g., feat/payment-update)

Provider Service (e.g., PaymentService)
  └─ Run unit + integration tests
  └─ Fetch latest consumer pacts from broker
  └─ Verify contracts
  └─ Publish verification results
  └─ can-i-deploy check:
       ├── Pass → deploy to staging → deploy to prod
       └── Fail → block deployment, notify team
```

## Versioning Strategy

### Publishing Contracts
```bash
# Consumer publishes contract
pact-broker publish ./pacts \
  --consumer-app-version $(git rev-parse HEAD) \
  --tag $(git rev-parse --abbrev-ref HEAD) \
  --branch $(git rev-parse --abbrev-ref HEAD)

# Provider checks deployment safety
pact-broker can-i-deploy \
  --pacticipant PaymentService \
  --version $(git rev-parse HEAD) \
  --to-environment production \
  --broker-base-url https://pact-broker.example.com

# Check specific consumer-provider compatibility
pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version $(git rev-parse HEAD) \
  --pacticipant PaymentService \
  --version $(git rev-parse HEAD) \
  --broker-base-url https://pact-broker.example.com
```

### Matrix of Compatible Versions
The Pact Broker maintains a matrix of which consumer versions are compatible with which provider versions. Each cell in the matrix shows the verification result. The matrix is used by `can-i-deploy` to answer the question: "Can this version of this service be deployed to this environment?" The answer is yes only if all consumer contracts pass verification against the provider version being checked.

## Environment Tag Conventions

| Tag | Purpose |
|---|---|
| `main` | Latest main branch contract |
| `staging` | Currently deployed to staging |
| `production` | Currently deployed to production |
| `feature/xxx` | Feature branch contract |
| `dev` | Latest development version |
| `test` | Version in test environment |

## Breaking Change Detection

### How Pact Detects Breaking Changes
Pact Broker compares the current provider version against the matrix of compatible versions. When `can-i-deploy` returns "no", the broker shows:
- Which consumer(s) would break
- Which interaction(s) failed
- The exact response diff (expected vs actual)
- The provider state that failed
- Links to the failed interaction's full description

### Handling Breaking Changes
When a provider change breaks a consumer contract, choose one of:
1. **Add new endpoint**: Keep old endpoint, add new version. Mark old as deprecated.
2. **Add optional field**: Ensure new response fields are optional with defaults.
3. **Coordinate deploy**: Deploy updated provider alongside old version, migrate consumers, remove old version.
4. **Multi-service deploy**: Deploy new provider + all updated consumers together (requires coordination).

### Webhook Configuration
```yaml
# Pact Broker webhook
webhook:
  events:
    - "contract_content_changed"
    - "provider_verification_failed"
  request:
    method: POST
    url: "https://hooks.slack.com/triggers/T00000000/B00000000/xxxxxxxx"
    body: >
      {
        "text": "⚠️ Contract verification failed: {{pactbroker.providerName}} 
                failed to verify against {{pactbroker.consumerName}}.
                Branch: {{pactbroker.providerBranch}}"
      }
```

### Webhook Notification Content
```json
{
  "text": "⚠️ Contract verification failed",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Provider:* PaymentService (feat/new-api)\n*Consumer:* OrderService (main)\n*Failed Interaction:* a request for payment status\n*Diff:* Expected status 'confirmed', got 'processing'\n*Broker URL:* https://pact-broker.example.com/..."
      }
    }
  ]
}
```

## Canary Release with Contracts

### Canary Deployment Flow
1. Deploy new provider version to canary (5% traffic)
2. Run Pact verification against canary
3. Monitor consumer traffic for real-world contract violations
4. If canary verification passes + no errors → roll out to 100%
5. If verification fails → rollback canary, fix contract
6. If real-world consumer errors are detected → rollback immediately

### CI/CD Script for Canary Check
```bash
#!/bin/bash
# canary-check.sh
CANARY_URL="https://canary.payment-service.example.com"
PRODUCTION_URL="https://payment-service.example.com"

# Verify canary against all consumer contracts
pact-broker can-i-deploy \
  --pacticipant PaymentService \
  --version $(git rev-parse HEAD) \
  --to-environment production

# Run verification against canary
npx pact-provider-verifier \
  --provider-base-url=$CANARY_URL \
  --pact-broker-url=$PACT_BROKER_URL \
  --publish-verification-results=true

if [ $? -eq 0 ]; then
  echo "Canary verification passed. Proceeding with rollout."
else
  echo "Canary verification failed. Rolling back."
  kubectl rollout undo deployment/payment-service
  exit 1
fi
```

## Contract Lifecycle

```
1. Consumer writes test → produces pact
2. Consumer CI publishes pact to broker
3. Provider CI fetches pact → verifies
4. Provider publishes verification result
5. can-i-deploy checks all consumer contracts
6. Deploy provider if all green
7. (Optional) Webhook notifies consumers of new provider version
8. Old contracts are retained for audit (never deleted)
```

## Contract Maintenance

### Contract Expiry and Cleanup
Contracts are never deleted — they serve as an audit trail. The Pact Broker can be configured to hide old contracts (tagged with old branches) from the default view. Contracts older than 90 days are archived to cold storage but remain queryable. When a consumer or provider is decommissioned, its contracts are marked as "decommissioned" rather than deleted.

### Contract Review Cadence
- Weekly: review failed verifications and new contracts
- Monthly: audit all active contracts for correctness
- Quarterly: clean up orphaned contracts (consumer or provider decommissioned)
- Per release: run full contract verification suite before production deployment

## Multi-Environment Deployment Check

```bash
# Check deployment safety for each environment
pact-broker can-i-deploy \
  --pacticipant PaymentService \
  --version v2.3.0 \
  --to-environment production

pact-broker can-i-deploy \
  --pacticipant PaymentService \
  --version v2.3.0 \
  --to-environment staging

# Check with specific consumer version
pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version v1.5.0 \
  --pacticipant PaymentService \
  --version v2.3.0 \
  --to-environment production
```

## Provider Verification Best Practices
- Run verification in CI, not locally (real provider state setup)
- Provider state setup endpoint must be fast (< 100ms per state)
- Verification timeout: 60 seconds per contract
- Publish verification results back to broker immediately
- Tag provider version with the environment it's deployed to
- Run can-i-deploy as the last CI step before deployment approval
- Set up Slack/email webhooks for verification failures
- Monitor verification duration trends to catch provider performance regression
