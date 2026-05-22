# Contract Workflow

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
  --to-environment production
```

## Environment Tag Conventions

| Tag | Purpose |
|-----|---------|
| `main` | Latest main branch contract |
| `staging` | Currently deployed to staging |
| `production` | Currently deployed to production |
| `feature/xxx` | Feature branch contract |

## Breaking Change Detection

Pact Broker matrix query shows which consumer versions are compatible with which provider versions. When can-i-deploy returns "no", the broker shows:
- Which consumer(s) would break
- Which interaction(s) failed
- The exact response diff (expected vs actual)

## Webhook Notification

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

## Canary Release with Contracts

1. Deploy new provider version to canary (5% traffic)
2. Run Pact verification against canary
3. Monitor consumer traffic for real-world contract violations
4. If canary verification passes + no errors → roll out to 100%
5. If verification fails → rollback canary, fix contract

## Contract Lifecycle

```
1. Consumer writes test → produces pact
2. Consumer CI publishes pact to broker
3. Provider CI fetches pact → verifies
4. Provider publishes verification result
5. can-i-deploy checks all consumer contracts
6. Deploy provider if all green
7. (Optional) Webhook notifies consumers of new provider version
```
