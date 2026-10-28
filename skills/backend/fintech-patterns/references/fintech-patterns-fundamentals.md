# Fintech Engineering Fundamentals

Foundational patterns every system that moves or records money needs: representing money, idempotent operations, explicit state machines, auditability, consistency rules and the regulatory baseline. Deep dives live in siblings: `double-entry-ledger.md`, `transaction-processing.md`, `reconciliation.md`, `payment-orchestration.md`, `kyc-aml.md`, `fraud-detection.md`.

## 1. Representing Money

| Rule | Why |
|------|-----|
| Never use binary floating point (`float`, `double`, JS `number` for arithmetic) | 0.1 + 0.2 != 0.3; rounding drift |
| Store integer **minor units** (cents) with an ISO 4217 currency code, or a fixed-precision decimal | Exactness |
| Currency is part of the value | Prevent adding EUR to USD |
| Know each currency's exponent | JPY has 0 decimals, BHD/KWD 3, most 2 |
| Round explicitly with a named mode | Banker's rounding (half-even) vs half-up are business decisions |

```python
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_EVEN

EXPONENT = {"USD": 2, "EUR": 2, "JPY": 0, "KWD": 3}

@dataclass(frozen=True, slots=True)
class Money:
    minor: int
    currency: str

    def __add__(self, other: "Money") -> "Money":
        if other.currency != self.currency:
            raise ValueError(f"currency mismatch: {self.currency} vs {other.currency}")
        return Money(self.minor + other.minor, self.currency)

    @staticmethod
    def from_decimal(amount: Decimal, currency: str) -> "Money":
        exp = EXPONENT[currency]
        q = amount.quantize(Decimal(1).scaleb(-exp), rounding=ROUND_HALF_EVEN)
        return Money(int(q.scaleb(exp)), currency)
```

Allocation (splitting 100.00 three ways) must distribute remainders deterministically so parts sum to the whole (e.g. 33.34, 33.33, 33.33).

Databases: `BIGINT` minor units or `NUMERIC(19,4)`-style decimals; never `FLOAT`/`REAL`. JSON APIs: send amounts as integers in minor units or as decimal strings.

## 2. Idempotency

Every money-moving API must be safe to retry.

```http
POST /v1/payments
Idempotency-Key: 6f1c2e0a-7b44-4c1e-9f0d-3c7a9b2e1d55
```

Server behaviour:
1. Look up the key (scoped per client/merchant). If a completed result exists and the request fingerprint matches, return the stored response.
2. If the key exists with a different payload, reject with 422/409.
3. If in progress, return 409 or wait; never execute twice.
4. Store key, request hash, response and status **in the same transaction** as the side effect, or use a unique constraint on the operation.

Keys expire after a retention window (e.g. 24 hours to several days), longer than any client retry horizon.

## 3. Explicit State Machines

```
payment: created -> requires_action -> authorized -> captured -> settled
                         |                |              \-> refunded (partial/full)
                         v                v
                       failed          voided / expired
```

- Persist the state and allowed transitions; reject invalid transitions in code and with database checks.
- Transitions are triggered by commands (API) or events (processor webhooks) and recorded as events with timestamps and actor.
- Webhooks arrive out of order and more than once: apply transitions only if they move forward; store processed event IDs.

## 4. Double-Entry Accounting Basics

- Every movement is a balanced journal entry: sum of debits = sum of credits, per currency.
- Balances are derived from entries (or maintained with entries in the same transaction); entries are append-only, corrections are reversing entries.
- Separate accounts for customer funds, fees, pending/settling amounts, and processor receivables so reconciliation is possible.

Full patterns in `double-entry-ledger.md`.

## 5. Consistency and Concurrency

- Strong consistency for balances: use database transactions with row locks (`SELECT ... FOR UPDATE`) or optimistic concurrency (version columns) to prevent double spending.
- Enforce invariants in the database: `CHECK (available_minor >= 0)` for accounts that cannot go negative, unique constraints on external references.
- Cross-service workflows use sagas with compensations and the transactional outbox for events; never dual-write to a database and a broker.
- Time: store timestamps in UTC; business dates (value date, settlement date, cut-off) are separate fields in the relevant time zone and calendar.

## 6. Auditability

- Immutable event history for every financial object (who, what, when, from which channel, previous and new state).
- Correlate with request IDs and external references (processor IDs, bank references, end-to-end IDs).
- Retention periods are set by regulation and contracts (often years); plan storage tiers accordingly.

## 7. External Integrations

- Treat processors and banks as unreliable: timeouts, retries with idempotency keys, circuit breakers, and **unknown outcomes**.
- On timeout, the payment state is "unknown", not "failed": query the processor or wait for the webhook before retrying with a new attempt.
- Verify webhook signatures (HMAC or asymmetric), check timestamps to prevent replay, and process asynchronously after acknowledging.
- Daily reconciliation against settlement reports catches what real-time flows miss.

## 8. Regulatory and Security Baseline

| Area | Baseline |
|------|----------|
| Card data | PCI DSS v4.0.1; minimise scope with hosted fields/tokenization so raw PANs never touch your servers |
| Strong customer authentication | PSD2 SCA in the EEA/UK (3-D Secure 2 for cards), with exemptions managed by the acquirer |
| AML/KYC | Customer due diligence, sanctions screening, transaction monitoring, record keeping (see `kyc-aml.md`) |
| Data protection | GDPR/CCPA; encryption in transit and at rest; field-level encryption or tokenization for sensitive identifiers |
| Operational resilience | DORA (EU financial entities), incident reporting obligations, third-party risk management |

Requirements depend on jurisdiction and licence type (EMI, payment institution, bank partner program); confirm with compliance.

## 9. Testing Money Code

- Property tests: allocation sums to total; conversions round-trip within tolerance; ledger entries always balance.
- Concurrency tests: parallel withdrawals never overdraw.
- Contract tests against processor sandboxes; replay real webhook samples, including duplicates and out-of-order delivery.

## Checklist

- [ ] Integer minor units or fixed decimals with currency everywhere
- [ ] Idempotency keys on all mutating endpoints, stored atomically with effects
- [ ] Explicit state machines with forward-only transitions
- [ ] Double-entry ledger with append-only entries
- [ ] DB constraints enforce balance and uniqueness invariants
- [ ] Unknown outcomes handled; webhooks verified and deduplicated
- [ ] PCI scope minimised; regulatory obligations mapped per market
