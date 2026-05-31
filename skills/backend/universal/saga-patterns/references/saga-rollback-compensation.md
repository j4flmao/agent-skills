# Saga Rollback and Compensation

## Overview

Compensation is the defining characteristic of the saga pattern. Unlike traditional ACID transactions that roll back automatically, sagas must explicitly undo each completed step through compensating actions. This reference covers compensation design patterns, idempotency strategies, failure handling during compensation, timeouts, and edge cases that arise in production compensation scenarios.

## Compensation Fundamentals

### What is Compensation?

A compensating action is a business operation that semantically undoes the effect of a previously completed saga step. Compensation is not a database rollback, it is a business transaction that reverses the effect of a prior transaction. For example, if a saga step charged a credit card, the compensation is issuing a refund — not deleting the charge record.

### Compensation Rules

1. **Every forward action must have a compensating action.** No exceptions.
2. **Compensations must be idempotent.** Running a compensation twice must produce the same state as running it once.
3. **Compensations must succeed eventually.** If a compensation fails permanently, a saga is stuck in an unrecoverable state.
4. **Compensations execute in reverse order.** LIFO (last completed step is compensated first).
5. **Compensations should not depend on the success of other compensations.** Each one must stand alone.

## Compensation Patterns

### Pattern 1: Semantic Undo

The most common pattern. Each forward action has a corresponding reverse action:

| Forward Action | Compensation |
|----------------|-------------|
| Reserve inventory | Release inventory |
| Charge payment | Issue refund |
| Send email | Cannot compensate (informational) |
| Create user account | Deactivate user account |
| Book a hotel room | Cancel reservation |
| Deduct loyalty points | Credit loyalty points |

```typescript
interface CompensableAction<T> {
  execute(): Promise<T>;
  compensate(result: T): Promise<void>;
}

class ReserveInventoryAction implements CompensableAction<ReservationResult> {
  async execute(): Promise<ReservationResult> {
    return await inventoryClient.reserve(this.orderId, this.items);
  }

  async compensate(result: ReservationResult): Promise<void> {
    await inventoryClient.release(this.orderId, result.reservationId);
  }
}

class ChargePaymentAction implements CompensableAction<PaymentResult> {
  async execute(): Promise<PaymentResult> {
    return await paymentClient.charge(this.customerId, this.amount);
  }

  async compensate(result: PaymentResult): Promise<void> {
    await paymentClient.refund(result.transactionId);
  }
}
```

### Pattern 2: Toggle State

Some actions are inherently toggles. The compensation flips the state back:

```typescript
class UpdateOrderStatusAction implements CompensableAction<void> {
  private previousStatus: string;

  async execute(): Promise<void> {
    const order = await orderRepo.findById(this.orderId);
    this.previousStatus = order.status;
    order.status = 'confirmed';
    await orderRepo.save(order);
  }

  async compensate(): Promise<void> {
    const order = await orderRepo.findById(this.orderId);
    if (order.status === 'confirmed') {
      order.status = this.previousStatus;
      await orderRepo.save(order);
    }
  }
}
```

### Pattern 3: Increment/Decrement Counter

For resource allocations, use counters that can be incremented and decremented:

```typescript
class AllocateCreditsAction implements CompensableAction<void> {
  async execute(): Promise<void> {
    await billingClient.incrementUsage(this.customerId, this.credits);
  }

  async compensate(): Promise<void> {
    await billingClient.decrementUsage(this.customerId, this.credits);
  }
}
```

### Pattern 4: Expiring Reservation

For resources that auto-release after a timeout, the compensation becomes optional but still recommended for prompt release:

```typescript
class ReserveSeatAction implements CompensableAction<SeatReservation> {
  async execute(): Promise<SeatReservation> {
    const reservation = await seatService.reserve(
      this.eventId,
      this.seatNumber,
      { expiresIn: '15m' }  // Auto-expiration safety net
    );
    return reservation;
  }

  async compensate(result: SeatReservation): Promise<void> {
    // Explicit cancellation for prompt release
    await seatService.cancelReservation(result.reservationId);
  }
}
```

### Pattern 5: Null Compensation (Log-Only)

Some actions genuinely cannot be compensated. For these, log the action and accept that the operation cannot be fully undone:

```typescript
class SendNotificationAction implements CompensableAction<void> {
  async execute(): Promise<void> {
    await emailClient.send(this.emailData);
  }

  async compensate(): Promise<void> {
    // Cannot unsend an email
    // Log the compensation event for audit purposes
    await auditLog.write({
      type: 'compensation_skipped',
      reason: 'email_already_sent',
      emailId: this.emailData.id,
      sagaId: this.sagaId,
    });
  }
}
```

## Idempotency in Compensations

### Idempotency Key Pattern

Every compensation should accept an idempotency key to prevent duplicate execution:

```typescript
interface CompensationRequest {
  compensationId: string;  // Unique idempotency key
  sagaId: string;
  stepName: string;
  payload: Record<string, unknown>;
}

class PaymentService {
  private processedCompensations = new Set<string>();

  async refund(request: CompensationRequest): Promise<void> {
    // Idempotency check
    const existing = await this.refundRepo.findByIdempotencyKey(request.compensationId);
    if (existing) {
      return existing.result;  // Already processed, return cached result
    }

    // Execute compensation
    const refund = await this.paymentGateway.refund(request.payload.transactionId);

    // Store result with idempotency key
    await this.refundRepo.save({
      idempotencyKey: request.compensationId,
      sagaId: request.sagaId,
      result: refund,
      processedAt: new Date(),
    });

    return refund;
  }
}
```

### State-Based Idempotency

Check the current state before executing a compensation:

```typescript
async function compensatePayment(saga: Saga): Promise<void> {
  const paymentStatus = await paymentClient.getPaymentStatus(saga.data.transactionId);

  // State-based idempotency
  if (paymentStatus.status === 'refunded') {
    // Already compensated, skip
    return;
  }

  if (paymentStatus.status === 'pending') {
    // Payment was not yet processed, void it
    await paymentClient.void(saga.data.transactionId);
    return;
  }

  if (paymentStatus.status === 'completed') {
    // Payment was processed, issue refund
    await paymentClient.refund(saga.data.transactionId);
    return;
  }
}
```

## Compensation Execution Engine

### Robust Compensation Executor

```typescript
class CompensationExecutor {
  constructor(
    private sagaStore: SagaStore,
    private retryConfig: RetryConfig = { maxRetries: 3, backoffMs: 1000 },
  ) {}

  async executeCompensations(
    saga: Saga,
    failedStep: string,
  ): Promise<CompensationResult> {
    saga.markCompensating(failedStep);
    await this.sagaStore.save(saga);

    const completedSteps = saga.getCompletedStepsInReverseOrder();
    const results: StepCompensationResult[] = [];

    for (const step of completedSteps) {
      const result = await this.compensateStep(saga, step);
      results.push(result);

      if (!result.success) {
        saga.markStepCompensationFailed(step.name, result.error.message);
        await this.sagaStore.save(saga);
        // Continue with remaining compensations — do NOT stop on failure
      } else {
        saga.markStepCompensated(step.name);
        await this.sagaStore.save(saga);
      }
    }

    const allSucceeded = results.every(r => r.success);
    saga.markFinalStatus(allSucceeded ? 'FAILED' : 'COMPENSATION_FAILED');
    await this.sagaStore.save(saga);

    return {
      sagaId: saga.id,
      overallSuccess: allSucceeded,
      stepResults: results,
      failedStep,
    };
  }

  private async compensateStep(
    saga: Saga,
    step: SagaCompletedStep,
  ): Promise<StepCompensationResult> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const compensation = saga.getCompensation(step.name);
        await compensation(saga, step.result);
        return { stepName: step.name, success: true };
      } catch (err) {
        lastError = err;
        if (attempt < this.retryConfig.maxRetries) {
          await sleep(this.retryConfig.backoffMs * Math.pow(2, attempt - 1));
        }
      }
    }

    return {
      stepName: step.name,
      success: false,
      error: lastError,
      attempts: this.retryConfig.maxRetries,
    };
  }
}
```

### Compensation with Circuit Breaker

```typescript
class CircuitBreakerCompensationExecutor {
  private circuitStates = new Map<string, CircuitState>();

  async compensateStep(saga: Saga, step: SagaCompletedStep): Promise<void> {
    const circuitKey = `${saga.sagaType}:${step.name}`;
    const state = this.circuitStates.get(circuitKey) ?? { failures: 0, halfOpen: false };

    if (state.failures >= 5) {
      // Circuit open — skip automatic retry, escalate
      await this.escalateToManual(saga, step);
      return;
    }

    try {
      const compensation = saga.getCompensation(step.name);
      await compensation(saga, step.result);
      this.circuitStates.set(circuitKey, { failures: 0, halfOpen: false });
    } catch (err) {
      state.failures++;
      this.circuitStates.set(circuitKey, state);
      throw err;
    }
  }

  private async escalateToManual(saga: Saga, step: SagaCompletedStep): Promise<void> {
    await opsAlert.send({
      severity: 'critical',
      type: 'compensation_circuit_open',
      sagaId: saga.id,
      sagaType: saga.sagaType,
      stepName: step.name,
      message: `Compensation for ${step.name} has failed 5+ times. Manual intervention required.`,
    });
  }
}
```

## Timeout Handling

### Per-Step Timeouts vs Saga Timeouts

```typescript
class TimedSagaExecutor {
  async executeStep(step: SagaStep, timeoutMs: number): Promise<void> {
    const result = await Promise.race([
      step.action(),
      this.createTimeout(timeoutMs, step.name),
    ]);
    return result;
  }

  private createTimeout(ms: number, stepName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new SagaTimeoutError(`Step ${stepName} timed out after ${ms}ms`));
      }, ms);
    });
  }
}
```

### Saga-Level Timeout

```typescript
class SagaTimeoutManager {
  constructor(private sagaStore: SagaStore) {}

  async findAndTimeoutStuckSagas(): Promise<void> {
    const stuckSagas = await this.sagaStore.findByStatus('RUNNING', {
      olderThan: '30 minutes',  // Saga-level timeout
    });

    for (const saga of stuckSagas) {
      saga.status = 'TIMED_OUT';
      await this.sagaStore.save(saga);

      // Trigger compensation for timed-out sagas
      await this.compensationExecutor.executeCompensations(saga, 'timeout');
    }
  }
}
```

## Partial Compensation Scenarios

### Scenario 1: Compensation Itself Fails

What happens when the refund API is down during compensation?

```typescript
class PartialCompensationHandler {
  async handleCompensationFailure(
    saga: Saga,
    failedCompensation: StepCompensationResult,
  ): Promise<void> {
    // Log the failure
    await auditLog.write({
      type: 'compensation_partial_failure',
      sagaId: saga.id,
      failedStep: failedCompensation.stepName,
      error: failedCompensation.error,
      timestamp: new Date(),
    });

    // Store pending compensation for retry
    await this.pendingCompensationRepo.save({
      sagaId: saga.id,
      stepName: failedCompensation.stepName,
      payload: saga.getStepPayload(failedCompensation.stepName),
      retryCount: failedCompensation.attempts,
      status: 'PENDING_RETRY',
    });

    // Update saga status to indicate partial compensation
    saga.status = 'COMPENSATION_INCOMPLETE';
    saga.compensationIncompleteSteps.push(failedCompensation.stepName);
    await this.sagaStore.save(saga);

    // Alert operations team
    await this.escalateToOps(saga, failedCompensation);
  }
}
```

### Scenario 2: Non-Compensable Steps in the Middle

If a saga has a mix of compensable and non-compensable steps:

```typescript
class MixedSagaHandler {
  async handleNonCompensableStep(
    saga: Saga,
    stepName: string,
  ): Promise<void> {
    // Record that this step cannot be compensated
    saga.nonCompensableSteps.push(stepName);

    // If a later step fails, we compensate what we can
    // and log what we cannot
    const compensatedSteps: string[] = [];
    const nonCompensatedSteps: string[] = [];

    for (const completedStep of saga.getCompletedStepsInReverseOrder()) {
      if (saga.nonCompensableSteps.includes(completedStep)) {
        nonCompensatedSteps.push(completedStep);
        await auditLog.write({
          type: 'non_compensable_step',
          sagaId: saga.id,
          stepName: completedStep,
          action: 'manual_review_required',
        });
      } else {
        await this.compensationExecutor.compensateStep(saga, completedStep);
        compensatedSteps.push(completedStep);
      }
    }

    saga.status = 'PARTIALLY_COMPENSATED';
    saga.compensatedSteps = compensatedSteps;
    saga.uncompensatedSteps = nonCompensatedSteps;
    await this.sagaStore.save(saga);

    // Generate report for manual intervention
    await this.generateManualInterventionReport(saga);
  }
}
```

### Scenario 3: Concurrent Compensation Conflicts

When two sagas operate on the same resource:

```typescript
class ConflictAwareCompensation {
  async compensateWithLock(step: SagaStep, saga: Saga): Promise<void> {
    const lockKey = `resource:${step.payload.resourceId}`;

    // Acquire distributed lock for the resource
    const lock = await distributedLock.acquire(lockKey, {
      ttl: 5000,  // 5 second lock
      retryDelay: 100,
    });

    if (!lock) {
      throw new CompensationConflictError(
        `Cannot compensate ${step.name}: resource ${step.payload.resourceId} is locked by another saga`
      );
    }

    try {
      // Check if resource state is still consistent
      const currentState = await resourceService.getState(step.payload.resourceId);
      const expectedState = step.savedState;  // State when the forward action executed

      if (this.isStateModified(currentState, expectedState)) {
        // Resource was modified by another saga — handle conflict
        await this.handleCompensationConflict(saga, step, currentState, expectedState);
        return;
      }

      await step.compensation(saga, step.result);
    } finally {
      await distributedLock.release(lock);
    }
  }

  private isStateModified(current: ResourceState, expected: ResourceState): boolean {
    return current.version !== expected.version;
  }

  private async handleCompensationConflict(
    saga: Saga,
    step: SagaCompletedStep,
    currentState: ResourceState,
    expectedState: ResourceState,
  ): Promise<void> {
    // Log the conflict for auditing
    await auditLog.write({
      type: 'compensation_conflict',
      sagaId: saga.id,
      stepName: step.name,
      expectedState: expectedState,
      currentState: currentState,
      timestamp: new Date(),
    });

    // Attempt semantic compensation based on current state
    if (currentState.quantity >= step.payload.quantity) {
      // Enough quantity exists, proceed with normal compensation
      await step.compensation(saga, step.result);
    } else {
      // Not enough quantity — compensate partially, log remainder
      await step.compensation(saga, {
        ...step.result,
        partialQuantity: currentState.quantity,
      });
    }
  }
}
```

## Observability of Compensations

### Compensation Audit Trail

```sql
CREATE TABLE compensation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_id UUID NOT NULL,
  saga_type VARCHAR(100) NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- SUCCESS, FAILED, SKIPPED, CONFLICT
  error_message TEXT,
  result_data JSONB,
  attempt_number INT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INT NOT NULL
);

CREATE INDEX idx_compensation_audit_saga ON compensation_audit(saga_id);
CREATE INDEX idx_compensation_audit_status ON compensation_audit(status);
```

### Compensation Dashboard Metrics

```prometheus
# Compensation metrics
saga_compensation_total{saga_type="create_order", status="success"}
saga_compensation_total{saga_type="create_order", status="failed"}
saga_compensation_total{saga_type="create_order", status="retry"}
saga_compensation_duration_seconds{saga_type="create_order"}
saga_compensation_retry_attempts{saga_type="create_order", step_name="refund_payment"}
saga_compensation_conflicts_total{saga_type="create_order"}
saga_partial_compensation_total{saga_type="create_order"}
```

### Logging Compensation Flow

```typescript
class CompensationLogger {
  async logCompensationStart(saga: Saga, failedStep: string): Promise<void> {
    logger.info({
      message: 'Starting saga compensation',
      sagaId: saga.id,
      sagaType: saga.sagaType,
      failedStep,
      completedSteps: saga.completedSteps,
      compensationSteps: saga.completedSteps.reverse(),
    });
  }

  async logCompensationStep(
    saga: Saga,
    step: SagaCompletedStep,
    status: 'STARTED' | 'SUCCESS' | 'FAILED',
    durationMs?: number,
    error?: Error,
  ): Promise<void> {
    logger.info({
      message: `Compensation step ${status.toLowerCase()}`,
      sagaId: saga.id,
      sagaType: saga.sagaType,
      stepName: step.name,
      status,
      durationMs,
      error: error?.message,
      errorStack: error?.stack,
    });
  }
}
```

## Manual Intervention Patterns

### When Manual Intervention is Needed

1. Compensation has failed after exhausting all retries.
2. A step has no possible compensation (non-compensable).
3. Compensation conflicted with another saga.
4. The saga timed out but the timeout itself occurred during compensation.
5. External system is unavailable and manual approval is needed to proceed.

### Manual Intervention API

```typescript
class ManualInterventionAPI {
  constructor(private sagaStore: SagaStore) {}

  // List all sagas requiring manual intervention
  async listStuckSagas(): Promise<StuckSaga[]> {
    return await this.sagaStore.findByStatusIn([
      'COMPENSATION_FAILED',
      'PARTIALLY_COMPENSATED',
      'MANUAL_REVIEW',
    ]);
  }

  // Manually mark a step as compensated
  async markStepCompensated(sagaId: string, stepName: string, operator: string): Promise<void> {
    const saga = await this.sagaStore.load(sagaId);
    saga.addManualCompensation(stepName, operator);
    saga.compensationIncompleteSteps = saga.compensationIncompleteSteps
      .filter(s => s !== stepName);

    if (saga.compensationIncompleteSteps.length === 0) {
      saga.status = 'FAILED';  // Full compensation achieved
    }

    await this.sagaStore.save(saga);

    await auditLog.write({
      type: 'manual_compensation',
      sagaId,
      stepName,
      operator,
      timestamp: new Date(),
    });
  }

  // Forcefully resolve a saga
  async forceResolve(sagaId: string, resolution: 'FAILED' | 'COMPLETED', reason: string): Promise<void> {
    const saga = await this.sagaStore.load(sagaId);
    saga.status = resolution;
    saga.resolutionNote = reason;
    saga.resolvedBy = 'manual';
    await this.sagaStore.save(saga);

    await auditLog.write({
      type: 'saga_force_resolved',
      sagaId,
      resolution,
      reason,
      timestamp: new Date(),
    });
  }
}
```

## Advanced Topics

### Compensating Transactions in Event Sourced Systems

```typescript
class EventSourcedCompensation {
  async compensateEvent(streamId: string, eventId: string): Promise<void> {
    // Read the event to be compensated
    const event = await eventStore.readEvent(streamId, eventId);

    // Create a compensation event
    const compensationEvent = {
      eventId: uuid(),
      eventType: `${event.eventType}.Compensated`,
      data: {
        originalEventId: eventId,
        reason: 'saga_compensation',
        timestamp: new Date().toISOString(),
      },
      metadata: {
        causationId: eventId,
        correlationId: event.metadata.correlationId,
      },
    };

    // Append compensation event to the same stream
    await eventStore.appendEvent(streamId, compensationEvent, event.version);
  }
}
```

### Compensation Ordering in Directed Acyclic Graphs

For complex sagas with parallel branches, compensation order follows a topological sort:

```typescript
class DAGCompensationOrchestrator {
  async compensateDAG(saga: Saga, failedNode: string): Promise<void> {
    // Build dependency graph
    const graph = saga.getDependencyGraph();
    const completedNodes = graph.getExecutedNodes();

    // Get topological order excluding the failed node
    const topologicalOrder = graph.topologicalSort(completedNodes);
    const reversedOrder = topologicalOrder.reverse();

    // Execute compensations in reverse topological order
    for (const node of reversedOrder) {
      if (node === failedNode) continue;
      await this.executeCompensation(saga, node);
    }
  }
}
```

## Testing Compensations

### Compensation Test Patterns

```typescript
describe('Compensation Testing', () => {
  it('should be idempotent when called twice', async () => {
    const result1 = await paymentService.refund({ transactionId: 'txn-1', compensationId: 'c1' });
    const result2 = await paymentService.refund({ transactionId: 'txn-1', compensationId: 'c1' });

    expect(result1).toEqual(result2);
  });

  it('should handle concurrent compensation requests', async () => {
    const requests = Array(5).fill(null).map(() =>
      paymentService.refund({ transactionId: 'txn-1', compensationId: 'c1' })
    );

    const results = await Promise.allSettled(requests);
    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBe(5);  // All idempotent
  });

  it('should compensate in correct reverse order', async () => {
    const executor = new CompensationExecutor(sagaStore);
    const saga = createTestSaga({
      completedSteps: ['stepA', 'stepB', 'stepC'],
    });

    await executor.executeCompensations(saga, 'stepD');

    const compensationOrder = sagaStore.getCompensationOrder(saga.id);
    expect(compensationOrder).toEqual(['stepC', 'stepB', 'stepA']);
  });

  it('should continue compensating even when one step fails', async () => {
    const mockCompensation = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))  // stepC compensation fails
      .mockResolvedValueOnce(undefined)                    // stepB compensation succeeds
      .mockResolvedValueOnce(undefined);                   // stepA compensation succeeds

    const saga = createTestSaga({ completedSteps: ['stepA', 'stepB', 'stepC'] });
    const result = await executor.executeCompensations(saga, 'stepD');

    expect(result.overallSuccess).toBe(false);
    expect(result.stepResults[0].stepName).toBe('stepC');
    expect(result.stepResults[0].success).toBe(false);
    expect(result.stepResults[1].success).toBe(true);
    expect(result.stepResults[2].success).toBe(true);
  });
});
```

## References
- references/compensating-transactions.md — Compensating Transactions Reference
- references/saga-state-management.md — Saga State Management
- references/saga-testing.md — Saga Testing
- references/saga-observability.md — Saga Observability
- references/saga-timeout-handling.md — Saga Timeout Handling
- references/saga-orchestration-choreography.md — Saga Orchestration vs Choreography
