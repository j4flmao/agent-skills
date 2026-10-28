# Fintech Patterns: Advanced Topics

Advanced patterns for payment platforms and financial products at scale: card payment lifecycle and disputes, real-time and account-to-account rails, ISO 20022 messaging, multi-currency and FX, settlement and treasury, ledger scaling, open banking, and tokenization. Builds on `fintech-patterns-fundamentals.md`.

## Card Payment Lifecycle

| Phase | What happens | Engineering concerns |
|-------|--------------|----------------------|
| Authorization | Issuer approves and places a hold | Idempotent auth requests, 3-D Secure / SCA, decline code mapping, auth expiry |
| Incremental / partial auth | Hold adjusted (hotels, rentals) | Track current authorized amount |
| Capture | Merchant claims funds (full, partial, multiple) | Capture windows vary by network/MCC; release uncaptured holds |
| Clearing | Transaction details sent to networks | Batch files, interchange qualification data (Level 2/3) |
| Settlement | Funds move acquirer to merchant, net of fees | Payout reconciliation; fees known after the fact |
| Refund | New credit transaction | Partial refunds, refund to original method |
| Chargeback / dispute | Cardholder disputes via issuer | Evidence submission deadlines, representment, pre-arbitration |

Model authorization holds, captured amounts, fees and disputes as separate ledger accounts so the merchant balance can be explained at any point.

### Disputes

- Ingest dispute events (webhooks/files), freeze or debit the disputed amount plus fee, collect evidence automatically (receipts, delivery proof, logs), track network deadlines.
- Track dispute ratio per merchant; card network monitoring programs penalise high ratios.

## Network Tokens and Tokenization

- Network tokens (Visa Token Service, Mastercard MDES) replace PANs for card-on-file and improve authorization rates and lifecycle updates.
- Vault tokenization (processor or third-party vault) keeps PANs out of your PCI scope; store only tokens, last4, brand, expiry.
- Card account updater services refresh expired/reissued cards for subscriptions.

## Account-to-Account and Real-Time Rails

| Rail | Region | Characteristics |
|------|--------|-----------------|
| SEPA Instant Credit Transfer | Euro area | Seconds, 24/7; EU Instant Payments Regulation requires PSPs to offer it at no more than the price of standard transfers, plus Verification of Payee |
| SEPA Credit Transfer / Direct Debit | Euro area | Batch; direct debits have mandates and refund rights |
| Faster Payments | UK | Near real-time; Confirmation of Payee |
| FedNow, RTP | US | Real-time, irrevocable |
| ACH (Nacha) | US | Batch; returns up to days later (R-codes) |
| Pix | Brazil | Instant, QR-based |
| UPI | India | Instant, VPA-based |

Engineering consequences:
- Instant rails are irrevocable: run fraud and sanctions checks before submission; design for authorized push payment (APP) fraud controls.
- Batch rails with late returns (ACH, direct debit): keep funds in a pending state or accept risk with limits; handle returns as reversing ledger entries.
- Cut-off times and banking calendars determine value dates; model them explicitly.

## ISO 20022

- The XML (and JSON-capable) messaging standard for payments: `pain.001` (customer credit transfer initiation), `pacs.008` (FI-to-FI customer credit transfer), `pacs.002` (status report), `pacs.004` (return), `camt.053` (bank statement), `camt.054` (debit/credit notification).
- SWIFT cross-border payments moved to ISO 20022; the MT/MX coexistence period for payment instructions ended in November 2025.
- Rich structured data: structured addresses, remittance information, purpose codes, Legal Entity Identifiers. Preserve the **end-to-end ID** and **UETR** through your system for tracing and reconciliation.
- Validate messages against XSD schemas plus scheme-specific usage guidelines (e.g. EPC rulebooks for SEPA, CBPR+ for cross-border).

## Multi-Currency and FX

- Hold balances per currency; never mix currencies in one account.
- FX conversion is a pair of ledger entries via an FX account, recording rate, source, timestamp and markup.
- Quote-then-execute: give customers a rate quote with expiry; execution checks the quote is still valid.
- Rate sources and spreads are configuration with audit history.
- Revaluation for reporting (mark-to-market of foreign balances) is an accounting process, separate from transactional conversion.

## Settlement, Treasury and Safeguarding

- Map money flows: customer funds (safeguarded/segregated accounts where required), operating funds, processor reserves.
- Daily processes: match processor settlement reports and bank statements (`camt.053`) to the ledger; investigate breaks.
- Liquidity forecasting for payouts on real-time rails (prefunding accounts).
- Safeguarding rules for e-money and payment institutions require customer funds to be segregated or insured and reconciled daily in many jurisdictions.

## Ledger at Scale

| Challenge | Pattern |
|-----------|---------|
| Hot accounts (fee account, settlement account touched by every transaction) | Shard the account into sub-accounts and sum for balance; or batch postings to the hot account asynchronously |
| High write throughput | Purpose-built ledgers (e.g. TigerBeetle) or partitioned relational ledgers |
| Balance reads | Maintain balance projections updated in the same transaction as entries; snapshots for historical balances |
| Corrections | Reversing entries only; no updates/deletes |
| Multi-region | Single writer per account/partition; avoid multi-master for balances |

## Workflow Orchestration

- Long-running money workflows (payouts, onboarding, loan disbursement) benefit from durable workflow engines (Temporal, AWS Step Functions) with explicit compensation steps.
- Every activity calling external systems is idempotent; workflow history doubles as an audit trail.
- Events to other services via the transactional outbox; consumers deduplicate.

## Open Banking

- EU/UK: PSD2 access to account (AIS) and payment initiation (PIS) APIs; PSD3/PSR reforms are in progress. UK uses the Open Banking Standard; US: CFPB Section 1033 personal financial data rights rule (with phased compliance and ongoing revisions).
- Security profiles: FAPI 2.0 (OAuth 2.0 + PAR, PKCE, sender-constrained tokens via mTLS or DPoP).
- Consent management: scopes, expiry, revocation, and audit of data access.

## Risk Controls in Real-Time Systems

- Pre-transaction checks in a defined latency budget: limits, velocity rules, device/behavioural signals, sanctions screening, ML fraud scores (see `fraud-detection.md`).
- Decisions logged with model version and feature values for explainability and disputes.
- Kill switches per rail, merchant or corridor.

## Checklist

- [ ] Card lifecycle states and ledger accounts cover holds, captures, fees, refunds, disputes
- [ ] PAN-free architecture with vault or network tokens
- [ ] Rail-specific rules: irrevocability, returns, cut-offs, payee verification
- [ ] ISO 20022 identifiers (end-to-end ID, UETR) preserved end to end
- [ ] FX entries record rate, source and markup; quotes expire
- [ ] Daily settlement and safeguarding reconciliation
- [ ] Hot-account strategy for high-volume ledgers
- [ ] Durable workflows with compensations; outbox for events
