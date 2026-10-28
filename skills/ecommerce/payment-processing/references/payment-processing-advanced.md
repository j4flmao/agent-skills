# Payment Processing Advanced Topics

Production payment engineering beyond a single PSP integration: multi-provider orchestration and routing, Strong Customer Authentication and exemptions, network tokens and card lifecycle, reconciliation with a double-entry ledger, disputes, fraud controls, and resilience patterns. Basics are in `payment-processing-fundamentals.md`.

## Payment Orchestration

```text
checkout ─► Payment Orchestrator ──► routing rules ──► PSP A (EU cards)
                 │                                  ├─► PSP B (US cards, failover)
                 │                                  └─► Local method provider (iDEAL, Pix, ...)
                 ├─ vault / tokens (PSP-agnostic or network tokens)
                 ├─ idempotency + state machine
                 └─ ledger + reconciliation
```

Reasons to add a second PSP: availability failover, regional acquiring (higher approval rates with local acquirers), cost, and local payment methods. Costs: two integrations, token portability, split reporting and reconciliation.

### Routing rules
| Input | Example rule |
|-------|--------------|
| Card BIN / issuer country | Route EU-issued cards to EU acquirer |
| Currency | Settle in the currency the acquirer supports without conversion |
| Amount / risk score | High-risk to the PSP with stronger fraud tooling |
| PSP health | Circuit-break a PSP with elevated errors/timeouts |
| Cost | Cheapest eligible route when approval rates are equal |

Measure per-route authorization rate, latency and cost; change routing based on data, and A/B test routing changes.

### Cascading retries
Retrying a soft decline on another PSP can recover approvals, but:
- Only for soft declines and technical failures, never hard declines (stolen/lost card, do-not-honor policies).
- Respect network rules on retry counts and timing for the same card.
- Ensure the first attempt definitely failed (no unknown outcome) before trying elsewhere, or you risk double charges.

## Strong Customer Authentication (PSD2) and 3DS2

SCA requires two of knowledge, possession, inherence for many electronic payments in the EEA (and the UK under equivalent rules). 3-D Secure 2 is the card mechanism.

| Concept | Notes |
|---------|-------|
| Frictionless flow | Issuer approves based on risk data without a challenge |
| Challenge flow | Customer completes authentication in issuer UI |
| Liability shift | Successful 3DS generally shifts fraud chargeback liability to the issuer |
| Exemptions | Low-value, transaction risk analysis (TRA), trusted beneficiary, secure corporate payments; issuer may still demand SCA |
| Out of scope | Merchant-initiated transactions (MIT) after an authenticated setup, one-leg-out transactions (non-EEA issuer/acquirer) |

Practices:
- Send rich data (billing/shipping address, device info, account age) to maximize frictionless approvals.
- Set up off-session payments (subscriptions, delayed charges) with an authenticated customer-initiated setup and then flag later charges as MIT.
- Handle `requires_action` states in every flow; mobile apps need SDK support for challenges.

## Tokens and Card Lifecycle

| Token type | Issued by | Portable across PSPs | Benefit |
|------------|-----------|----------------------|---------|
| PSP token | Your PSP | No (requires data migration via PSP-to-PSP PAN export) | Simple |
| Network token (VTS, MDES) | Card network | Usable with PSPs supporting network tokens for your merchant ID | Auto-updated when cards are reissued, often higher approval rates |
| Wallet token (DPAN) | Device wallet | Per device | Device-bound cryptograms |

Use account updater / network token lifecycle updates to keep stored cards valid; expired-card declines are a major source of involuntary churn in subscriptions.

PSP migration: request a PCI-compliant PAN export from the old PSP to the new one (vault-to-vault). Plan it months ahead; it is not self-service.

## Reconciliation and Ledger

Your system, the PSP, and the bank each hold a version of the truth. Reconcile all three.

```text
orders/payments DB  ⇄  PSP balance transactions report  ⇄  bank statement (payouts)
```

Double-entry ledger (every movement debits one account and credits another, sums to zero):

| Event | Debit | Credit |
|-------|-------|--------|
| Payment captured | PSP receivable | Revenue / customer liability |
| PSP fee | Fees expense | PSP receivable |
| Payout to bank | Bank cash | PSP receivable |
| Refund | Revenue / customer liability | PSP receivable |
| Chargeback | Chargeback losses (and fee expense) | PSP receivable |

```sql
CREATE TABLE ledger_entries (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journal_id   BIGINT NOT NULL,
  account      TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,          -- positive debit, negative credit
  currency     CHAR(3) NOT NULL,
  source_ref   TEXT NOT NULL,            -- PSP balance transaction / payout id
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_ref, account)
);
-- enforce per journal: SUM(amount_minor) = 0 per currency (deferred constraint trigger or posting service)
```

Daily reconciliation job:
1. Import PSP settlement/balance reports (API or files).
2. Match each line to a payment/refund/dispute by PSP reference.
3. Match payouts to bank statement lines.
4. Report unmatched items with age; investigate within SLA.
Entries are append-only; corrections are new reversing entries.

## Disputes

- Reason codes differ by network (fraud, product not received, not as described, duplicate, credit not processed).
- Respond within network deadlines through the PSP with evidence: delivery proof, logs of 3DS authentication, customer communications, terms accepted, IP/device data.
- Use pre-dispute programs (e.g. Visa/Mastercard alert and inquiry programs offered through PSPs or providers) to refund before a chargeback is filed when appropriate.
- Track dispute rate per card network; excessive rates trigger network monitoring programs with fines.

## Fraud Controls

| Layer | Examples |
|-------|----------|
| Velocity rules | Attempts per card/IP/account per time window |
| Card testing defenses | CAPTCHA/bot detection at checkout, rate limits, minimum amounts, blocking many small auths |
| ML risk scoring | PSP tools (e.g. Stripe Radar, Adyen RevenueProtect) or third-party |
| 3DS on risk | Request authentication for higher-risk transactions |
| Manual review | Queue for borderline orders before fulfilment |
| Account security | Protect stored-card accounts against takeover (MFA, anomaly detection) |

Tune for total cost: fraud losses + chargeback fees + false-decline revenue loss + review cost.

## Resilience

- Timeouts on PSP calls with an "unknown" outcome state; resolve by querying the PSP or waiting for webhooks before retrying elsewhere.
- Circuit breaker per PSP (Resilience4j, Polly, or equivalent) feeding the router.
- Queue non-critical calls (receipts, ledger posting) off the checkout path.
- Webhook ingestion highly available and replayable; PSPs retry deliveries but for limited periods.
- Run reconciliation even when everything "worked": it catches silent failures.

## Compliance Notes

- PCI DSS v4.0.1 is the current standard; requirements that were future-dated became mandatory on 31 March 2025 (e.g. script integrity and change detection on payment pages under 6.4.3 and 11.6.1 for e-commerce).
- Keep systems that touch card data minimal; prefer PSP-hosted fields and network tokens.
- Data retention: keep transaction records per finance/tax rules, but no sensitive authentication data.

## Checklist

- [ ] Routing rules data-driven with per-route approval, latency and cost metrics
- [ ] Cascading only on soft declines with certain prior outcome
- [ ] SCA flows, exemptions and MIT flags implemented; `requires_action` handled everywhere
- [ ] Network tokens/account updater for stored cards; PSP migration plan
- [ ] Double-entry ledger and daily three-way reconciliation
- [ ] Dispute evidence pipeline and dispute-rate monitoring
- [ ] Layered fraud controls tuned on total cost
- [ ] Unknown-outcome handling, circuit breakers, replayable webhooks
