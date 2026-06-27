---
name: backend-fintech-patterns
description: >
  Enforce fintech backend patterns including double-entry ledger, payment rails,
  reconciliation, KYC/AML, fraud detection, multi-currency, escrow, reserve management,
  and regulatory compliance. NOT for simple payment processing without ledger tracking
  or non-financial CRUD applications.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, fintech, phase-10]
---

# Fintech Patterns Skill

## Purpose
Implement production-grade financial backend systems with double-entry accounting, transaction processing, KYC/AML compliance, and audit-ready data models.

## Agent Protocol

### Trigger
User mentions payment processing, double-entry ledger, financial reconciliation, KYC, AML, transaction processing, multi-currency, escrow, reserve management, financial audit, Stripe integration, payment lifecycle, or accounting patterns.

### Input Context
- Payment provider(s) and integration scope
- Ledger design requirements (single vs double-entry)
- Currency and multi-currency needs
- KYC/AML requirements by jurisdiction
- Transaction volume estimates
- Reconciliation frequency and method
- Regulatory compliance requirements (PCI-DSS, GDPR, SOX)

### Output Artifact
SKILL.md adherence document plus implemented ledger models, payment processing, reconciliation logic, KYC workflows, and compliance documentation.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Double-entry ledger model designed with accounts, journal entries, balances
- [ ] Payment processing with idempotency and retry logic implemented
- [ ] Reconciliation engine with matching rules operational
- [ ] KYC workflow with identity verification integrated (Stripe Identity/Onfido/Jumio)
- [ ] AML screening implemented against sanctions/PEPS lists
- [ ] Multi-currency support with exchange rate handling
- [ ] Audit trail with immutable log entries
- [ ] Idempotency key enforcement on all financial operations
- [ ] Transaction reporting and financial statements generation
- [ ] Escrow/reserve management if applicable
- [ ] PCI-DSS compliance for card data handling

### Max Response Length
4096 tokens

## Workflow

1. **Double-Entry Ledger Design**: Every transaction debits one account and credits another.

```typescript
interface Account {
  id: string;
  code: string;           // e.g., "1000" for Assets:Cash
  name: string;
  type: AccountType;      // asset, liability, equity, revenue, expense
  currency: string;
  normalBalance: 'debit' | 'credit';
  parentId?: string;
  isActive: boolean;
  createdAt: Date;
}

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface JournalEntry {
  id: string;
  transactionId: string;   // external correlation
  description: string;
  entries: JournalLine[];
  entryDate: Date;
  postedAt: Date;
  createdBy: string;
  status: 'pending' | 'posted' | 'reversed';
  reversedById?: string;
}

interface JournalLine {
  accountId: string;
  debit: number;          // always >= 0
  credit: number;         // always >= 0
  currency: string;
  amountInBase: number;   // converted to base currency
  description?: string;
}

async function postJournalEntry(entry: Omit<JournalEntry, 'id' | 'postedAt' | 'status'>): Promise<void> {
  const trx = await db.transaction();
  try {
    const totalDebit = entry.entries.reduce((s, l) => s + l.debit, 0);
    const totalCredit = entry.entries.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Unbalanced entry: debits ${totalDebit} != credits ${totalCredit}`);
    }

    const created = await trx('journal_entries').insert({
      transaction_id: entry.transactionId,
      description: entry.description,
      entry_date: entry.entryDate,
      created_by: entry.createdBy,
      status: 'posted',
      posted_at: new Date(),
    }).returning('id');

    for (const line of entry.entries) {
      await trx('journal_lines').insert({
        journal_entry_id: created[0].id,
        account_id: line.accountId,
        debit: line.debit,
        credit: line.credit,
        currency: line.currency,
        amount_in_base: line.amountInBase,
        description: line.description,
      });

      await updateAccountBalance(trx, line.accountId, line.debit, line.credit);
    }

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

2. **Payment Processing with Idempotency**: Ensure payments can be retried safely.

```typescript
interface PaymentRequest {
  idempotencyKey: string;
  amount: number;
  currency: string;
  source: PaymentSource;
  description: string;
  metadata?: Record<string, unknown>;
}

async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  const existing = await IdempotencyRecord.findByKey(request.idempotencyKey);
  if (existing) {
    return existing.result;
  }

  const payment = await stripe.paymentIntents.create({
    amount: Math.round(request.amount * 100),
    currency: request.currency.toLowerCase(),
    payment_method: request.source.paymentMethodId,
    confirm: true,
    metadata: { idempotency_key: request.idempotencyKey },
    idempotencyKey: request.idempotencyKey,
  });

  if (payment.status === 'succeeded') {
    const trx = await db.transaction();
    try {
      const customerAccount = await getCustomerAssetAccount(request.source.customerId);
      const revenueAccount = await getRevenueAccount(request.description);
      const gatewayAccount = await getGatewayClearingAccount();

      await postJournalEntry({
        transactionId: payment.id,
        description: `Payment: ${request.description}`,
        entries: [
          { accountId: gatewayAccount.id, debit: request.amount, credit: 0, currency: request.currency },
          { accountId: customerAccount.id, debit: request.amount, credit: 0, currency: request.currency },
          { accountId: revenueAccount.id, debit: 0, credit: request.amount, currency: request.currency },
        ],
        entryDate: new Date(),
        createdBy: 'system',
      });

      await IdempotencyRecord.save({ key: request.idempotencyKey, result: { status: 'success', paymentId: payment.id } });
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  return { status: 'requires_action', clientSecret: payment.client_secret };
}
```

3. **Reconciliation Engine**: Match external transactions with internal ledger entries.

```typescript
interface ReconciliationRule {
  id: string;
  name: string;
  sourceField: string;     // field in external statement
  targetField: string;     // field in internal records
  matchType: 'exact' | 'fuzzy' | 'range';
  tolerance?: number;      // for range matching
  weight: number;          // for fuzzy match scoring
}

class ReconciliationEngine {
  async reconcile(
    externalTransactions: ExternalTransaction[],
    internalEntries: JournalEntry[],
    rules: ReconciliationRule[]
  ): Promise<ReconciliationResult> {
    const matched: Match[] = [];
    const unmatchedExternal: ExternalTransaction[] = [...externalTransactions];
    const unmatchedInternal: JournalEntry[] = [...internalEntries];

    for (const external of externalTransactions) {
      for (const internal of unmatchedInternal) {
        const score = this.calculateMatchScore(external, internal, rules);
        if (score >= 0.8) {
          matched.push({ external, internal, score });
          removeFromArray(unmatchedExternal, external);
          removeFromArray(unmatchedInternal, internal);
          break;
        }
      }
    }

    return {
      matched,
      unmatchedExternal,
      unmatchedInternal,
      matchRate: matched.length / externalTransactions.length,
      totalAmountMatched: matched.reduce((s, m) => s + m.external.amount, 0),
      totalAmountUnmatched: unmatchedExternal.reduce((s, t) => s + t.amount, 0),
    };
  }

  private calculateMatchScore(external: ExternalTransaction, internal: JournalEntry, rules: ReconciliationRule[]): number {
    let score = 0;
    let totalWeight = 0;

    for (const rule of rules) {
      totalWeight += rule.weight;
      const externalValue = external[rule.sourceField];
      const internalValue = this.extractJournalValue(internal, rule.targetField);

      if (rule.matchType === 'exact' && externalValue === internalValue) {
        score += rule.weight;
      } else if (rule.matchType === 'range' && typeof externalValue === 'number' && typeof internalValue === 'number') {
        if (Math.abs(externalValue - internalValue) <= (rule.tolerance || 0)) {
          score += rule.weight;
        }
      }
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }
}
```

4. **KYC/AML Workflow**: Identity verification and sanctions screening.

```typescript
interface KYCRecord {
  id: string;
  userId: string;
  status: 'pending' | 'verified' | 'rejected' | 'manual_review';
  verificationLevel: 'basic' | 'enhanced';
  identityDocs: IdentityDocument[];
  pepStatus: boolean;
  sanctionsHits: SanctionsHit[];
  riskScore: number;
  verifiedAt?: Date;
  expiresAt: Date;
}

async function performKYC(userId: string, documents: IdentityDocument[]): Promise<KYCRecord> {
  const identityCheck = await stripe.identity.verificationSessions.create({
    type: 'document',
    options: {
      document: {
        require_matching_selfie: true,
        require_id_number: true,
      },
    },
    metadata: { user_id: userId },
  });

  const verification = await VerificationSession.findById(identityCheck.id);
  const pepCheck = await checkPEPList(userId, documents[0].fullName, documents[0].dateOfBirth);
  const sanctionsCheck = await checkSanctionsList(userId, documents[0].fullName, documents[0].nationality);
  const riskScore = calculateRiskScore(identityCheck, pepCheck, sanctionsCheck);

  const kycRecord: KYCRecord = {
    id: generateId(),
    userId,
    status: identityCheck.status === 'verified' && riskScore < 70 ? 'verified' : 'manual_review',
    verificationLevel: riskScore > 50 ? 'enhanced' : 'basic',
    identityDocs: documents,
    pepStatus: pepCheck.isPep,
    sanctionsHits: sanctionsCheck.hits,
    riskScore,
    expiresAt: addMonths(new Date(), riskScore > 50 ? 12 : 24),
  };

  await KYCRecordModel.save(kycRecord);
  return kycRecord;
}
```

5. **Multi-Currency & Exchange Rates**: Handle currency conversion with rate locking.

```typescript
interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  validFrom: Date;
  validTo: Date;
}

async function lockExchangeRate(fromCurrency: string, toCurrency: string, amount: number): Promise<LockedRate> {
  const rate = await ExchangeRate.findOne({
    fromCurrency,
    toCurrency,
    validFrom: { $lte: new Date() },
    validTo: { $gte: new Date() },
    source: 'provider_x',
  });

  if (!rate) throw new Error(`No exchange rate available for ${fromCurrency} -> ${toCurrency}`);

  const convertedAmount = Math.round(amount * rate.rate * 100) / 100;

  return LockedRate.create({
    fromCurrency,
    toCurrency,
    originalAmount: amount,
    convertedAmount,
    rate: rate.rate,
    rateId: rate.id,
    expiresAt: addMinutes(new Date(), 5),
  });
}
```

6. **Audit Trail**: Immutable logging for all financial operations.

```typescript
interface AuditEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'reverse';
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  performedBy: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  signature: string;       // hash of previous + current state
}

function createAuditEvent(params: Omit<AuditEvent, 'id' | 'signature' | 'timestamp'>): AuditEvent {
  const data = { ...params, timestamp: new Date() };
  data.signature = crypto.createHash('sha256')
    .update(JSON.stringify({ prev: data.previousState, new: data.newState, ts: data.timestamp }))
    .digest('hex');
  return data as AuditEvent;
}
```

## Rules

1. Never use floating-point for monetary values — use integers (cents/smallest unit) or decimal(28,8).
2. Always implement idempotency keys on every financial write operation.
3. Never allow direct write access to account balances — always go through journal entries.
4. Always validate balance equality before committing journal entries.
5. Never store raw credit card numbers — use PCI-compliant tokenization.
6. Always implement automatic reversal for failed/cancelled transactions.
7. Never hardcode exchange rates — use provider rates with locking.
8. Always log every financial operation with immutable audit trail.
9. Never allow deletion of posted journal entries — only reversal.
10. Always implement balance checks (sufficient funds, credit limits) before posting.
11. Never exceed provider rate limits for reconciliation queries.
12. Always use database transactions for atomic ledger operations.
13. Never expose raw account balances in API responses without authorization.
14. Always implement rate limiting on financial endpoints (fraud prevention).
15. Never process payments without 3DS/SCA where required.
16. Always implement timeout handling for external payment provider calls.
17. Never store API keys for payment providers in code or config files.
18. Always test with test mode (Stripe test keys, sandbox environments) before production.
19. Never allow KYC bypass for transactions above regulatory thresholds.
20. Always implement periodic reconciliation (daily, weekly) with exception reporting.

## References
  - references/double-entry-ledger.md — Double-Entry Ledger
  - references/fintech-patterns-advanced.md — Fintech Patterns Advanced Topics
  - references/fintech-patterns-fundamentals.md — Fintech Patterns Fundamentals
  - references/fraud-detection.md — Fraud Detection
  - references/kyc-aml.md — KYC and AML
  - references/payment-orchestration.md — Payment Orchestration
  - references/reconciliation.md — Reconciliation
  - references/transaction-processing.md — Transaction Processing
## Architecture Decision Trees

### Transaction Processing Mode
```
Is the transaction customer-facing or internal?
├── Customer-facing (checkout, payment) → Synchronous with idempotency
│   Must respond within seconds. Use payment intent pattern.
│   Idempotency key required. Fail fast, let client retry.
├── Internal batch (payroll, settlement) → Asynchronous batch
│   Process in scheduled jobs. Full reconciliation after batch.
│   Use outbox pattern for reliability. Alert on partial failure.
└── Inter-system (ledger sync, reconciliation) → Event-driven
    Produce domain events. Consumers process async.
    Dead-letter queue for failed events. Manual replay capability.
```

### Ledger Account Architecture
```
What type of account?
├── Customer-facing wallet → Asset account (customer liability to platform)
│   Normal balance: credit. Each customer is a sub-ledger.
│   Non-negative balance enforced.
├── Platform operational → Revenue / Expense / Asset
│   Revenue: normal credit. Expense: normal debit.
│   Chart of accounts follows GAAP/IFRS structure.
└── Settlement / Clearing → Transit accounts
    Temporary holding during settlement windows.
    Must zero out at end of each settlement cycle.
```

## Implementation Patterns

### Pattern: Staged Payment Processing with 3DS

```typescript
async function processPaymentWith3DS(request: PaymentRequest): Promise<PaymentResult> {
  const idempotent = await IdempotencyRecord.findByKey(request.idempotencyKey);
  if (idempotent) return idempotent.result;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(request.amount * 100),
    currency: request.currency,
    payment_method_types: ['card'],
    capture_method: 'manual',
  });

  if (paymentIntent.next_action?.type === 'use_stripe_sdk') {
    return { status: 'requires_action', clientSecret: paymentIntent.client_secret };
  }

  const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id);
  if (confirmed.status === 'requires_capture') {
    const captured = await capturePayment(confirmed.id, request.amount);
    await postLedgerEntries(captured, request);
    return { status: 'succeeded', paymentId: captured.id };
  }

  return { status: 'failed', error: confirmed.last_payment_error?.message };
}
```

### Pattern: Async Reconciliation with Outbox

```typescript
async function reconcileBatch(externalTxns: ExternalTransaction[]): Promise<void> {
  const batches = chunk(externalTxns, 100);
  for (const batch of batches) {
    await db.transaction(async (trx) => {
      for (const txn of batch) {
        const match = await findMatchingEntry(trx, txn);
        if (match) {
          await trx('reconciliation_matches').insert({
            external_id: txn.id,
            internal_id: match.journal_entry_id,
            amount_match: Math.abs(txn.amount - match.amount) < 0.01,
            reconciled_at: new Date(),
          });
        } else {
          await trx('reconciliation_exceptions').insert({
            external_id: txn.id,
            amount: txn.amount,
            reason: 'no_match',
            status: 'pending_review',
          });
        }
      }
    });
  }
}
```

## Production Considerations

### Deployment & Operations
- Financial systems deploy during low-activity windows. Never deploy during end-of-day settlement.
- Database migrations for ledger tables require extreme care. Never drop columns — soft-deprecate over 3 cycles.
- Idempotency key storage: use Redis with TTL matching ledger retention period (90 days minimum).
- Payment provider API keys stored in vault/KMS, rotated quarterly. Never in config files or env vars in plaintext.
- Monitoring: alert on reconciliation match rate < 98%, journal entry imbalance, payment failure rate > 2%.

### Audit & Compliance
- Every write to ledger is logged in immutable audit table. Tamper-evident via hash chain.
- Balance snapshots taken daily at market close. Used for reconciliation and financial reporting.
- All idempotency keys logged with timestamps for audit trail.
- Read replicas for reporting queries — never run reports against primary ledger database.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| Floating-point for money | 0.1 + 0.2 = 0.30000000000000004. Balance errors. | Store in cents (integer) or PostgreSQL NUMERIC(28,8) |
| Direct balance mutation | UPDATE accounts SET balance = balance + 100 — no audit trail. | Always post journal entry. Recalculate balance from entries. |
| One-size-fits-all reconciliation | Matching payments to invoices differs from matching bank statements. | Separate reconciliation engine per transaction type. |
| No dead-letter queue | Failed reconciliation events silently dropped. Manual recovery impossible. | DLQ with alerting and replay UI. |
| Hardcoded exchange rates | Rate changes mid-transaction cause discrepancies. Audit flags every mismatch. | Lock rate at quote time. Store rate ID in transaction record. |

## Performance Optimization

- Batch journal entry posting: insert 500 entries per transaction instead of 1-at-a-time.
- Balance caching: Redis with WAL. Invalidate on journal post. Recalculate from DB on cache miss.
- Partition ledger tables by month. Archive partitions older than 7 years to cold storage.
- Reconcile incrementally: only match new transactions since last reconciliation, not full history.
- Index by (tenant_id, transaction_date) for most ledger queries. Covering indexes for balance lookups.
- Read replicas for statement generation, reports, and reconciliation queries.
- Paginate payment provider API calls. Use cursor-based pagination for large transaction volumes.

## Security Considerations

- PCI DSS: card data never touches your server. Use Stripe Elements or hosted payment fields. SAQ A scope.
- Ledger access: read-only for support staff, write for batch jobs only. All mutations require approval.
- Encryption at rest: ledger data encrypted with AES-256. Key rotation every 12 months.
- Encryption in transit: mTLS between services for ledger operations. API calls over TLS 1.3.
- Audit log: append-only database table. Hash chain links each entry to previous. Weekly hash published externally.
- Secrets management: all API keys, encryption keys in Vault. Application reads at startup, never stores on disk.
- Rate limiting: writes to ledger limited per source system (max 1000/s). Abuse detection on payment endpoints.
- Data retention: transactions kept 7 years (regulatory). After retention, anonymize, not delete.
