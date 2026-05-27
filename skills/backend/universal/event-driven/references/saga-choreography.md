# Saga and Choreography Patterns

## Purpose

A saga is a sequence of local transactions that maintains data consistency across multiple services in a distributed system. Unlike a distributed transaction (2PC), a saga commits each step independently and executes compensating actions on failure. This reference covers choreography vs orchestration patterns, compensating transactions, saga state machines, execution coordinators, monitoring, timeout handling, and recovery strategies.

## Saga Patterns

### Choreography vs Orchestration

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| Coordination | Decentralized, each service reacts to events | Central orchestrator directs each step |
| Coupling | Loose — services only know about events | Tighter — services know about orchestrator |
| Complexity | Harder to trace the full flow | Easier to understand and manage |
| Failure handling | Distributed — each service handles its own | Centralized — orchestrator manages all |
| Best for | Few services, simple flows | Many services, complex flows, strict SLAs |
| Tooling | Event bus, message broker | Saga engine, workflow engine (Temporal, Camunda) |

### Choreography Saga

Each service produces events that trigger the next step. No central coordinator.

```typescript
// Order Service
class OrderService {
  async createOrder(command: CreateOrderCommand): Promise<void> {
    const order = Order.create(command)
    await this.orderRepo.save(order)
    await this.eventBus.publish(new OrderCreated({
      orderId: order.id,
      customerId: command.customerId,
      items: command.items,
      total: order.total,
    }))
  }

  async onPaymentFailed(event: PaymentFailed): Promise<void> {
    const order = await this.orderRepo.findById(event.data.orderId)
    order.cancel('Payment failed')
    await this.orderRepo.save(order)
    await this.eventBus.publish(new OrderCancelled({
      orderId: order.id,
      reason: 'Payment failed',
    }))
  }

  async onPaymentConfirmed(event: PaymentConfirmed): Promise<void> {
    const order = await this.orderRepo.findById(event.data.orderId)
    order.confirm()
    await this.orderRepo.save(order)
  }
}

// Payment Service
class PaymentService {
  async onOrderCreated(event: OrderCreated): Promise<void> {
    try {
      const payment = await this.paymentGateway.charge(event.data.total)
      await this.eventBus.publish(new PaymentConfirmed({
        orderId: event.data.orderId,
        transactionId: payment.id,
      }))
    } catch (err) {
      await this.eventBus.publish(new PaymentFailed({
        orderId: event.data.orderId,
        reason: err.message,
      }))
    }
  }
}

// Inventory Service
class InventoryService {
  async onOrderCreated(event: OrderCreated): Promise<void> {
    try {
      await this.inventoryClient.reserve(event.data.items)
    } catch (err) {
      await this.eventBus.publish(new InventoryReservationFailed({
        orderId: event.data.orderId,
        reason: err.message,
      }))
    }
  }

  async onOrderCancelled(event: OrderCancelled): Promise<void> {
    await this.inventoryClient.release(event.data.orderId)
  }
}
```

### Orchestration Saga

A central orchestrator tells each service what to do and manages compensation on failure.

```typescript
class OrderSagaOrchestrator {
  constructor(
    private commandBus: CommandBus,
    private sagaStore: SagaStore,
    private eventBus: EventBus
  ) {}

  async start(orderId: string): Promise<void> {
    const saga = Saga.create('order-saga', orderId)
    await this.executeStep(saga, 0)
  }

  private async executeStep(saga: Saga, stepIndex: number): Promise<void> {
    if (stepIndex >= saga.definition.steps.length) {
      saga.status = 'completed'
      await this.sagaStore.save(saga)
      await this.eventBus.publish(new SagaCompleted({ sagaId: saga.id, orderId: saga.correlationId }))
      return
    }

    const step = saga.definition.steps[stepIndex]
    saga.currentStep = stepIndex
    saga.status = 'running'
    await this.sagaStore.save(saga)

    try {
      const result = await this.commandBus.dispatch(step.command)
      saga.results[step.name] = result
      await this.sagaStore.save(saga)
      await this.executeStep(saga, stepIndex + 1)
    } catch (err) {
      saga.status = 'compensating'
      saga.error = err.message
      await this.sagaStore.save(saga)
      await this.compensate(saga, stepIndex)
    }
  }

  private async compensate(saga: Saga, failedStep: number): Promise<void> {
    // Execute compensations in reverse order from failed step
    for (let i = failedStep; i >= 0; i--) {
      const step = saga.definition.steps[i]
      if (step.compensation) {
        try {
          await this.commandBus.dispatch(step.compensation)
        } catch (err) {
          console.error(`Compensation for step ${step.name} failed:`, err.message)
          // Log and continue — manual intervention may be needed
          await this.eventBus.publish(new CompensationFailed({
            sagaId: saga.id,
            step: step.name,
            error: err.message,
          }))
        }
      }
    }
    saga.status = 'failed'
    await this.sagaStore.save(saga)
    await this.eventBus.publish(new SagaFailed({ sagaId: saga.id, orderId: saga.correlationId, error: saga.error }))
  }
}
```

## Compensating Transactions

### Compensation Design Principles

1. **Idempotent compensations**: A compensation must be safe to execute multiple times
2. **Commutative compensations**: The order of original actions and compensations must produce the correct final state
3. **Compensation can fail**: Design for partial compensation failures
4. **Semantic undo**: Compensation is not a database rollback — it is a business-level reversal

### Compensation Examples

```typescript
// Step: Reserve Inventory
class ReserveInventoryHandler {
  async handle(command: ReserveInventoryCommand): Promise<Result> {
    // Original action
    await this.inventoryDb.reserve(command.orderId, command.items)
    return Result.success({ reservationId: reservation.id })
  }
}

// Compensation: Release Inventory
class ReleaseInventoryHandler {
  async handle(command: ReleaseInventoryCommand): Promise<Result> {
    await this.inventoryDb.release(command.orderId)
    return Result.success()
  }
}

// Step: Process Payment
class ProcessPaymentHandler {
  async handle(command: ProcessPaymentCommand): Promise<Result> {
    const charge = await this.gateway.charge(command.amount, command.paymentToken)
    return Result.success({ chargeId: charge.id })
  }
}

// Compensation: Refund Payment
class RefundPaymentHandler {
  async handle(command: RefundPaymentCommand): Promise<Result> {
    // Re-check before refunding — may have already been refunded
    const charge = await this.gateway.getCharge(command.chargeId)
    if (charge.status === 'refunded') return Result.success()
    if (charge.status === 'pending') {
      // Could not refund a pending charge — wait and retry
      return Result.failure('Payment is pending, cannot refund yet')
    }
    await this.gateway.refund(command.chargeId)
    return Result.success()
  }
}
```

### Compensating Action Pattern

```typescript
interface SagaStep {
  name: string
  action: () => Promise<StepResult>
  compensate: () => Promise<void>
  maxRetries: number
  timeoutMs: number
  // Is this compensation reversible? If false, manual intervention may be required
  compensationIsGuaranteed: boolean
}

class CompensatingTransactionBuilder {
  static buildOrderSaga(orderId: string): SagaStep[] {
    return [
      {
        name: 'reserve-inventory',
        action: () => this.reserveInventory(orderId),
        compensate: () => this.releaseInventory(orderId),
        maxRetries: 3,
        timeoutMs: 5000,
        compensationIsGuaranteed: true,
      },
      {
        name: 'process-payment',
        action: () => this.processPayment(orderId),
        compensate: () => this.refundPayment(orderId),
        maxRetries: 3,
        timeoutMs: 10000,
        compensationIsGuaranteed: false, // Refund may fail or be delayed
      },
    ]
  }
}
```

## Saga State Machines

### State Machine Definition

```typescript
enum SagaState {
  PENDING = 'PENDING',
  RESERVING_INVENTORY = 'RESERVING_INVENTORY',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  PROCESSING_PAYMENT = 'PROCESSING_PAYMENT',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  CONFIRMING_ORDER = 'CONFIRMING_ORDER',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED',
}

interface SagaTransition {
  from: SagaState
  to: SagaState
  action: string
  onSuccess: SagaState
  onFailure: SagaState
}

const orderSagaTransitions: SagaTransition[] = [
  { from: SagaState.PENDING, to: SagaState.RESERVING_INVENTORY, action: 'reserveInventory', onSuccess: SagaState.INVENTORY_RESERVED, onFailure: SagaState.FAILED },
  { from: SagaState.INVENTORY_RESERVED, to: SagaState.PROCESSING_PAYMENT, action: 'processPayment', onSuccess: SagaState.PAYMENT_COMPLETED, onFailure: SagaState.COMPENSATING },
  { from: SagaState.PAYMENT_COMPLETED, to: SagaState.CONFIRMING_ORDER, action: 'confirmOrder', onSuccess: SagaState.ORDER_CONFIRMED, onFailure: SagaState.COMPENSATING },
  { from: SagaState.ORDER_CONFIRMED, to: SagaState.COMPLETED, action: 'complete', onSuccess: SagaState.COMPLETED, onFailure: SagaState.COMPENSATING },
  { from: SagaState.COMPENSATING, to: SagaState.FAILED, action: 'compensateAll', onSuccess: SagaState.FAILED, onFailure: SagaState.FAILED },
]
```

### State Machine Executor

```typescript
class SagaStateMachine {
  constructor(private commandBus: CommandBus) {}

  async execute(saga: SagaInstance): Promise<void> {
    let currentState = saga.state

    while (currentState !== SagaState.COMPLETED && currentState !== SagaState.FAILED) {
      const transition = this.findTransition(currentState)
      if (!transition) throw new Error(`No transition from state ${currentState}`)

      saga.state = transition.to
      saga.startedAt = new Date()
      await this.sagaStore.save(saga)

      try {
        const result = await this.commandBus.dispatch(new Command(transition.action, saga.correlationId))
        saga.lastResult = result
        currentState = transition.onSuccess
      } catch (err) {
        saga.error = err.message
        saga.failedAt = new Date()
        if (currentState === SagaState.COMPENSATING) {
          currentState = SagaState.FAILED
        } else {
          // Find the compensation transition from current state
          currentState = transition.onFailure
        }
      }
    }

    saga.status = currentState === SagaState.COMPLETED ? 'completed' : 'failed'
    saga.completedAt = new Date()
    await this.sagaStore.save(saga)
  }

  private findTransition(state: SagaState): SagaTransition | undefined {
    return orderSagaTransitions.find(t => t.from === state)
  }
}
```

## Saga Execution Coordinator

### Persistent Saga Store

```typescript
interface SagaRecord {
  sagaId: string
  sagaType: string
  correlationId: string
  status: 'pending' | 'running' | 'compensating' | 'completed' | 'failed'
  state: SagaState
  currentStep: number
  steps: SagaStepRecord[]
  results: Record<string, any>
  error?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  failedAt?: Date
}

class PostgresSagaStore implements SagaStore {
  async create(sagaType: string, correlationId: string, steps: SagaStepDefinition[]): Promise<SagaInstance> {
    const sagaId = uuid()
    await this.db.query(
      `INSERT INTO sagas (saga_id, saga_type, correlation_id, status, state, steps)
       VALUES ($1, $2, $3, 'pending', 'INITIALIZED', $4)`,
      [sagaId, sagaType, correlationId, JSON.stringify(steps)]
    )
    return this.load(sagaId)
  }

  async save(instance: SagaInstance): Promise<void> {
    await this.db.query(
      `UPDATE sagas SET status = $1, state = $2, current_step = $3, results = $4,
       error = $5, updated_at = now(), completed_at = $6, failed_at = $7
       WHERE saga_id = $8`,
      [instance.status, instance.state, instance.currentStep,
       JSON.stringify(instance.results), instance.error,
       instance.completedAt, instance.failedAt, instance.sagaId]
    )
  }

  async findPending(): Promise<SagaInstance[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM sagas WHERE status IN ('pending', 'running') AND updated_at < now() - interval '1 minute'`
    )
    return rows.map(this.toInstance)
  }
}
```

### Coordinator Recovery

```typescript
class SagaRecovery {
  constructor(
    private sagaStore: SagaStore,
    private orchestrator: SagaOrchestrator,
    private logger: Logger
  ) {}

  async recoverStuckSagas(): Promise<void> {
    const stuckSagas = await this.sagaStore.findStuck(30) // stuck for 30+ minutes
    for (const saga of stuckSagas) {
      this.logger.warn('Recovering stuck saga', { sagaId: saga.sagaId, state: saga.state })
      try {
        await this.orchestrator.resume(saga)
      } catch (err) {
        this.logger.error('Failed to recover saga', { sagaId: saga.sagaId, error: err.message })
      }
    }
  }

  async resume(saga: SagaInstance): Promise<void> {
    if (saga.status === 'running') {
      // Re-check current step status before resuming
      const lastCommandResult = await this.checkStepCompletion(saga)
      if (lastCommandResult.isCompleted()) {
        saga.currentStep++
      }
      await this.orchestrator.executeStep(saga, saga.currentStep)
    } else if (saga.status === 'compensating') {
      await this.orchestrator.compensate(saga, saga.currentStep)
    }
  }
}
```

## Monitoring Sagas

### Key Metrics

```typescript
interface SagaMetrics {
  // Business metrics
  saga_completed_total: Counter   // Total completed sagas
  saga_failed_total: Counter      // Total failed sagas (requires intervention)
  saga_duration_seconds: Histogram // End-to-end saga duration

  // Step metrics
  saga_step_duration_seconds: Histogram  // Per-step duration
  saga_step_retries_total: Counter       // Per-step retries
  saga_compensation_executed_total: Counter // Compensations executed

  // Health metrics
  saga_stuck_total: Counter       // Sagas stuck for > threshold
  saga_recovery_attempts: Counter // Recovery attempts
  saga_recovery_success: Counter  // Successful recoveries
}
```

### Dashboard Example

```sql
-- Active sagas by type and status
SELECT saga_type, status, count(*) as count
FROM sagas
WHERE completed_at IS NULL OR completed_at > now() - interval '24h'
GROUP BY saga_type, status;

-- Slow sagas (p99 duration)
SELECT saga_type,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))) as p99_duration
FROM sagas WHERE status = 'completed'
GROUP BY saga_type;

-- Compensation rate
SELECT saga_type,
  count(*) FILTER (WHERE compensations_executed > 0) as compensated_count,
  count(*) as total_count,
  round(100.0 * count(*) FILTER (WHERE compensations_executed > 0) / count(*), 2) as compensation_rate
FROM sagas
GROUP BY saga_type;
```

### Alerting Rules

```yaml
alerts:
  - name: SagaFailureRate
    condition: rate(saga_failed_total[5m]) > 0.01
    message: "Saga failure rate exceeds 1% in the last 5 minutes"
    severity: critical

  - name: SagaStuck
    condition: saga_stuck_total > 0
    message: "Sagas stuck in running/compensating state for over 30 minutes"
    severity: warning

  - name: SagaDurationP99
    condition: histogram_quantile(0.99, saga_duration_seconds) > 300
    message: "P99 saga duration exceeds 5 minutes"
    severity: warning
```

## Timeout Handling

### Step Timeouts

Each saga step should have a timeout. If the step does not complete within the timeout, it is treated as a failure.

```typescript
class TimeoutSagaStep implements SagaStep {
  constructor(
    private inner: SagaStep,
    private timeoutMs: number,
    private onTimeout: () => Promise<void>
  ) {}

  async execute(): Promise<StepResult> {
    const result = await Promise.race([
      this.inner.execute(),
      this.delay(this.timeoutMs).then(() => { throw new TimeoutError(this.inner.name) }),
    ])
    return result
  }

  async compensate(): Promise<void> {
    await this.inner.compensate()
  }
}
```

### Saga-Level Timeout

The entire saga must complete within a maximum duration.

```typescript
class TimeboxedSaga {
  constructor(
    private saga: SagaInstance,
    private maxDurationMs: number,
    private onExpiry: () => Promise<void>
  ) {}

  async start(): Promise<void> {
    const result = await Promise.race([
      this.saga.execute(),
      this.delay(this.maxDurationMs),
    ])
    if (result === undefined) {
      // Saga took too long — expire and compensate
      await this.onExpiry()
      throw new SagaTimeoutError(this.saga.id)
    }
  }
}
```

## Saga Recovery

### Recovery Strategies

| Scenario | Recovery Action |
|----------|----------------|
| Saga step timeout | Retry with backoff (max 3 times) |
| Saga step returns transient error | Retry with exponential backoff |
| Saga step returns permanent error | Begin compensation |
| Saga process crashes mid-execution | Recover from saga store on restart |
| Compensation fails | Log, alert for manual intervention |
| Compensation partially succeeds | Mark saga as MANUAL_INTERVENTION_REQUIRED |

### Exponential Backoff

```typescript
class RetryWithBackoff {
  async execute(action: () => Promise<StepResult>, stepName: string, maxRetries: number): Promise<StepResult> {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await action()
      } catch (err) {
        lastError = err
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000 // 1s, 2s, 4s, 8s + jitter
          await this.sleep(delay)
        }
      }
    }
    throw lastError
  }
}
```

### Manual Intervention Handling

```typescript
class ManualInterventionHandler {
  async handle(sagaId: string): Promise<void> {
    // Notify ops team
    await this.notifier.sendAlert({
      type: 'saga_manual_intervention',
      sagaId,
      message: `Saga ${sagaId} requires manual intervention. Compensations partially executed.`,
      severity: 'critical',
    })

    // Create intervention ticket
    await this.ticketSystem.create({
      title: `Saga compensation failure: ${sagaId}`,
      description: JSON.stringify(await this.sagaStore.getDetails(sagaId)),
      priority: 'high',
    })
  }

  // Admin API for manual compensation
  async adminRetryCompensation(sagaId: string): Promise<void> {
    const saga = await this.sagaStore.load(sagaId)
    if (saga.status !== 'compensating' && saga.status !== 'failed') {
      throw new Error('Saga is not in a compensatable state')
    }
    // Retry compensation from where it failed
    await this.compensator.compensate(saga, saga.failedStepIndex)
  }
}
```

## Key Points

- Sagas maintain data consistency across services without distributed transactions.
- Choreography works for simple flows with few services; orchestration scales to complex workflows.
- Every saga step must have a compensating action that semantically reverses the step.
- Compensations must be idempotent and handle partial failure gracefully.
- Saga state is persisted for durability — sagas survive process crashes.
- Timeouts at both the step level and saga level prevent infinite hangs.
- Exponential backoff with jitter for transient failures; immediate compensation for permanent failures.
- Monitor saga duration, failure rate, and stuck sagas.
- Recover stuck sagas periodically and on service restart.
- When automatic compensation fails, alert for manual intervention with incident management.
- State machines make saga logic explicit and testable.
