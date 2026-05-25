# Contract Testing Strategies

## Consumer-Driven Contracts

### Workflow
```
Consumer writes test → Pact generates contract → Publish to Broker
                                                      ↓
Provider runs verification ← Fetch contracts from Broker
       ↓
Publish results → can-i-deploy check → Deploy gate
```

### Consumer Test Patterns

#### HTTP Interaction
```typescript
const orderApi = new Pact({ consumer: 'OrderApp', provider: 'PaymentService' })

beforeEach(() => {
  orderApi.addInteraction({
    state: 'payment exists',
    uponReceiving: 'a request for payment details',
    withRequest: {
      method: 'GET',
      path: '/payments/123',
      headers: { Accept: 'application/json' },
    },
    willRespondWith: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { id: '123', status: 'confirmed', amount: 49.99 },
    },
  })
})
```

#### Message Pact
```typescript
orderApi.addInteraction({
  state: 'order placed',
  uponReceiving: 'an order confirmation event',
  withRequest: {
    method: 'POST',
    path: '/events/order-confirmed',
  },
  willRespondWith: {
    body: {
      orderId: 'ord_456',
      status: 'confirmed',
      items: [{ sku: 'SKU001', qty: 2 }],
    },
  },
})
```

## Provider Verification

### Setup
```typescript
@PactVerification(feature = "PaymentService")
@Test
void verifyOrderPaymentContract() {
  // Provider test data setup
  paymentRepository.save(new Payment("123", "confirmed", 49.99))
  // Pact verifier runs automatically against provider API
}
```

### Provider States
- Define state handlers for each consumer interaction
- Set up test data before verification
- Clean up after verification
- Document state setup for other teams

## Deployment Gating

### can-i-deploy
```bash
pact-broker can-i-deploy \
  --pacticipant PaymentService \
  --version 2.3.0 \
  --to-environment production
```

### Webhook Notifications
```yaml
# pact-broker webhook config
events: ['contract_content_changed', 'verification_failed']
request:
  method: POST
  url: https://hooks.slack.com/services/T...
  body: |
    {
      "text": "Contract verification failed for {{pacticipant.name}}"
    }
```

## Broker Configuration

### Version Tags
```yaml
tags:
  - main      # Latest from main branch
  - feat/xxx  # Feature branch contracts
  - prod      # Currently in production
```

### Environment Mapping
- Map Git branches to environments
- Use tags for deployment traceability
- Record deployment in Pact Broker
- Track which versions are in each environment
