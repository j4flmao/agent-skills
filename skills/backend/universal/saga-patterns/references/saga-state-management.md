# Saga State Management

## Saga Lifecycle

```
CREATED → RUNNING → COMPLETED (success)
                 → FAILED (unrecoverable)
                 → COMPENSATING (rolling back)
                 → COMPENSATED (rollback complete)
```

## State Persistence

Saga state must survive service restarts. Never store saga state in memory only.

```sql
CREATE TABLE saga_instances (
  id UUID PRIMARY KEY,
  saga_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  failed_step VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

## Recovery

On service restart, check for RUNNING or COMPENSATING sagas:

```typescript
async function recoverAfterRestart(): Promise<void> {
  const running = await sagaStore.findByStatus(['RUNNING', 'COMPENSATING']);

  for (const saga of running) {
    if (saga.status === 'RUNNING') {
      // Check if any steps actually completed (idempotent check)
      await resumeSaga(saga);
    } else if (saga.status === 'COMPENSATING') {
      // Continue compensation
      await continueCompensation(saga);
    }
  }
}
```

## Timeout Handling

Every saga step should have a timeout:

- Step timeout: 30 seconds per external call.
- Saga total timeout: 5 minutes for the entire flow.
- On timeout: attempt compensation for completed steps.
- If compensation also times out: mark saga as FAILED and alert.

```typescript
async function executeStepWithTimeout(step: () => Promise<void>, timeoutMs: number): Promise<void> {
  const result = await Promise.race([
    step(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Step timeout')), timeoutMs))
  ]);
  return result;
}
```

## Monitoring

Key metrics to monitor:

- Saga duration (p50, p95, p99).
- Saga failure rate by type.
- Step failure rate by service.
- Compensation frequency.
- Stuck sagas (RUNNING > 5 minutes).

Alert on:
- Saga failure rate > 5%.
- Any saga in RUNNING state > 10 minutes.
- Compensation failure (can't roll back).

## Dead Letter Saga

When a saga cannot complete and cannot compensate:

1. Mark saga as FAILED (manual intervention required).
2. Log all details: steps completed, failed step, error.
3. Notify the operations team.
4. Provide a manual compensation script for each saga type.
