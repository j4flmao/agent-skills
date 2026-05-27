# Saga Timeout Handling

Sagas must handle timeouts at both the step level and the overall saga level.

## Step-Level Timeouts

Every saga step needs a timeout:

```typescript
async function executeStepWithTimeout<T>(
  step: () => Promise<T>,
  timeoutMs: number,
  compensation: () => Promise<void>
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      step(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new SagaTimeoutError('Step timed out'));
        });
      }),
    ]);
    return result;
  } catch (err) {
    if (err instanceof SagaTimeoutError) {
      await compensation();
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## Saga-Level Timeouts

The entire saga must complete within a time bound:

```typescript
class SagaWithTimeout {
  private startTime: Date;
  private readonly sagaTimeoutMs: number;

  constructor(sagaTimeoutMs: number) {
    this.sagaTimeoutMs = sagaTimeoutMs;
    this.startTime = new Date();
  }

  async executeStep<T>(name: string, fn: () => Promise<T>, compensation: () => Promise<void>): Promise<T> {
    const elapsed = Date.now() - this.startTime.getTime();
    const remaining = this.sagaTimeoutMs - elapsed;

    if (remaining <= 0) {
      await this.compensateAll();
      throw new SagaTimeoutError(`Saga exceeded total timeout of ${this.sagaTimeoutMs}ms`);
    }

    const stepTimeout = Math.min(remaining, 10000); // max 10s per step

    try {
      return await executeStepWithTimeout(fn, stepTimeout, compensation);
    } catch (err) {
      if (err instanceof SagaTimeoutError) {
        logger.error({ step: name, elapsed }, 'Step timed out — compensating');
      }
      throw err;
    }
  }
}
```

## Timeout Configuration

Configure timeouts per saga type:

```typescript
const SAGA_TIMEOUTS = {
  createOrder: {
    total: 30000,        // 30 seconds total
    steps: {
      reserveInventory: 5000,
      processPayment: 10000,
      confirmOrder: 3000,
    },
  },
  cancelSubscription: {
    total: 60000,
    steps: {
      cancelInBilling: 15000,
      revokeAccess: 5000,
      sendNotification: 5000,
    },
  },
};
```

## Handling Slow Compensations

Compensations can also time out:

```typescript
async function safeCompensate(step: string, compensation: () => Promise<void>, maxWaitMs = 10000): Promise<void> {
  try {
    await Promise.race([
      compensation(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Compensation timeout')), maxWaitMs)),
    ]);
  } catch (err) {
    logger.error({ step, error: err.message }, 'Compensation failed — manual intervention required');
    await alertOncall({
      type: 'compensation_failed',
      step,
      error: err.message,
      severity: 'critical',
    });
  }
}
```

## Idempotent Timeout Recovery

After a timeout, the step might have actually completed on the server:

```typescript
async function executeStepWithIdempotentTimeout(
  stepId: string,
  step: () => Promise<void>,
  checkCompletion: () => Promise<boolean>,
  timeoutMs: number
): Promise<void> {
  try {
    await Promise.race([step(), delay(timeoutMs).then(() => { throw new TimeoutError(); })]);
  } catch (err) {
    if (err instanceof TimeoutError) {
      const completed = await checkCompletion();
      if (completed) {
        logger.info({ stepId }, 'Step completed despite client timeout');
        return; // step actually succeeded
      }
      throw err; // step truly failed
    }
    throw err;
  }
}
```

## Key Points
- Set timeouts on every saga step individually
- Enforce a total saga timeout and check remaining time before each step
- Configure timeouts per saga type and per step
- Compensations themselves can time out — have an escalation path
- Use idempotent recovery to check if a timed-out step actually completed
- Log timeout events with elapsed time for debugging
- Alert on manual intervention when compensation timeouts occur
