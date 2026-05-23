# Compensating Transactions

## Core Principle

Every action in a saga must have a compensating action that semantically undoes it. Compensations are not rollbacks — they are new operations that correct the state.

## Compensation by Operation Type

| Action | Compensation | Notes |
|--------|-------------|-------|
| Create order | Cancel order | Mark as cancelled, not deleted |
| Reserve inventory | Release inventory | Restore stock count |
| Process payment | Refund payment | Full refund, not partial |
| Send email | Send follow-up email | Cannot unsend — send correction |
| Create user account | Deactivate account | Soft delete, not hard delete |
| Book appointment | Cancel appointment | Free up the slot |

## Idempotent Compensation

Compensations MUST be idempotent — running them twice has the same effect as running once:

```typescript
class InventoryService {
  async release(orderId: string): Promise<void> {
    const release = await this.releaseLog.findByOrderId(orderId);
    if (release) return; // Already compensated — idempotent

    const items = await this.reservationRepo.findByOrderId(orderId);
    for (const item of items) {
      await this.stockRepo.increment(item.productId, item.quantity);
    }
    await this.releaseLog.record({ orderId, releasedAt: new Date() });
  }
}
```

## Compensation Order

Compensations execute in reverse order of the original steps:

```
Original: Step1 → Step2 → Step3 → Step4
Compensation: Comp4 → Comp3 → Comp2 → Comp1
```

This ensures that dependencies are unwound correctly. If Step3 depends on Step2, then Comp2 must run before Comp3 (so Step3's dependency is released before Step2 is undone).

## Failure During Compensation

If a compensation fails:
1. Retry with exponential backoff (up to 3 attempts).
2. If retries exhausted, mark saga as FAILED.
3. Log the failed compensation with full details.
4. Alert operations team for manual intervention.

Manual intervention should be guided by a runbook for each saga type.

## Design Guidelines

- Design forward actions and compensation actions at the same time. Never add compensation as an afterthought.
- Compensations complete within the same time budget as the forward action.
- Test compensation paths in integration tests, not just happy paths.
- Monitor compensation execution rate — high compensation rate indicates system issues.
- Compensations should report success/failure to the coordinator, never block indefinitely.
