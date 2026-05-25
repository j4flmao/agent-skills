# Payment Security

## PCI DSS Compliance

| Requirement | Scope | Implementation |
|-------------|-------|----------------|
| Encrypt card data at rest | Storage | AES-256 encryption |
| Encrypt card data in transit | Network | TLS 1.2+ |
| Tokenize PAN | Application | Replace PAN with token |
| Restrict access to card data | Access control | IAM + least privilege |
| Audit all access to card data | Logging | Immutable audit trail |
| Regular security testing | Security | Quarterly ASV + annual pen test |

### Tokenization Flow
```
PAN → Token Service → Token (stored)
  ↓                       ↓
Gateway process         Use for:
  ↓                     - Recurring billing
Auth/Capture            - Refunds
                        - Customer lookup
```

## 3D Secure

| Version | Authentication | Friction | Liability Shift |
|---------|---------------|----------|-----------------|
| 3DS 1.0 | Static password | High | Partial |
| 3DS 2.0 | Risk-based | Low (90% frictionless) | Full |
| 3DS 2.2 | Biometric/OTP | Very low | Full |

```python
class ThreeDSecureHandler:
    def check_3ds_required(self, transaction):
        high_risk = [
            transaction.amount > 250,
            transaction.is_new_customer,
            transaction.country != transaction.billing_country,
            transaction.is_digital_goods,
        ]
        return any(high_risk)

    async def process_3ds(self, transaction):
        if self.check_3ds_required(transaction):
            response = await self.gateway.authenticate_3ds({
                "amount": transaction.amount,
                "currency": transaction.currency,
                "card": transaction.card_token,
                "return_url": self.callback_url,
            })
            return {"requires_3ds": True, "url": response.acs_url}
        return {"requires_3ds": False}
```

## Fraud Detection

| Check | Signal | Action |
|-------|--------|--------|
| Velocity check | > 3 attempts in 10 min | Block + CAPTCHA |
| BIN country match | Card country != IP country | Manual review |
| AVS check | Address mismatch | Flag for review |
| CVV match | CVV failure | Decline |
| Known fraud | Card in blacklist | Block immediately |
| Device fingerprint | New device + high value | 3DS challenge |

### Fraud Scoring
```python
class FraudDetector:
    def score_transaction(self, transaction, customer_history):
        score = 0
        if transaction.amount > 1000:
            score += 20
        if transaction.is_international:
            score += 15
        if not customer_history.has_previous_orders:
            score += 10
        if transaction.shipping_differs_billing:
            score += 5
        if transaction.is_digital_goods:
            score += 5
        if customer_history.chargeback_count > 0:
            score += 25
        return {"score": score, "risk": self.classify(score)}

    def classify(self, score):
        if score < 20: return "low"
        if score < 40: return "medium"
        if score < 60: return "high"
        return "block"
```

## Gateway Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| Direct API | Simple payments | Stripe, Square |
| Orchestrated | Multi-gateway | Adyen, Spreedly |
| Transparent redirect | PCI scope reduction | PayPal Express |
| Tokenization proxy | Recurring billing | Braintree vault |
