# Saga Observability

Observability is critical for sagas because failures span multiple services and steps.

## Tracing Sagas

Use distributed tracing to follow saga execution across services:

```typescript
class TracedSagaOrchestrator {
  async run(sagaName: string, sagaId: string, steps: SagaStep[]): Promise<void> {
    const tracer = opentelemetry.trace.getTracer('saga-orchestrator');
    const ctx = trace.setBaggage(
      context.active(),
      propagation.createBaggage({ 'saga.id': { value: sagaId }, 'saga.name': { value: sagaName } })
    );

    await tracer.startActiveSpan(`saga.${sagaName}`, { attributes: { sagaId } }, async (span) => {
      for (const step of steps) {
        await this.runStepWithTrace(span, sagaId, step);
      }
      span.end();
    });
  }

  private async runStepWithTrace(parentSpan: Span, sagaId: string, step: SagaStep): Promise<void> {
    const span = tracer.startSpan(`saga.step.${step.name}`, {
      attributes: { sagaId, step: step.name, service: step.service },
      links: [{ context: parentSpan.spanContext() }],
    });

    try {
      await step.execute();
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  }
}
```

## Metrics

Track saga health and performance:

```
saga_started_total{saga, service}           — saga invocations
saga_completed_total{saga, service}         — successful completions
saga_failed_total{saga, service, step}      — failures with failed step
saga_compensation_total{saga, service}      — compensation triggers
saga_duration_seconds{saga}                 — total saga duration
saga_step_duration_seconds{saga, step}      — per-step duration
saga_current_active{saga}                   — currently running sagas
```

## Logging

Structured logging for every saga event:

```typescript
function logSagaEvent(event: string, sagaId: string, data: Record<string, unknown>): void {
  logger.info({
    event: `saga.${event}`,
    sagaId,
    sagaType: data.sagaType,
    step: data.step,
    status: data.status,
    durationMs: data.durationMs,
    error: data.error,
    completedSteps: data.completedSteps,
    timestamp: new Date().toISOString(),
  });
}

// Usage
logSagaEvent('step.completed', sagaId, {
  sagaType: 'createOrder',
  step: 'reserveInventory',
  status: 'success',
  durationMs: 234,
  completedSteps: ['reserveInventory'],
});
```

## Monitoring Dashboard

```
Panel: Saga success rate
  - Gauge of saga_completed_total / saga_started_total per saga type
  - Alert when < 99.5%

Panel: Failed sagas by step
  - Bar chart of saga_failed_total broken down by step name
  - Identify which steps fail most

Panel: Active sagas
  - Gauge of saga_current_active over time
  - Alert when > 100 (indicates stuck sagas)

Panel: Saga duration
  - Histogram of saga_duration_seconds
  - Alert on p99 > 30s for critical sagas
```

## Stuck Saga Detection

Detect sagas that haven't progressed:

```typescript
async function detectStuckSagas(): Promise<Saga[]> {
  const stuck = await sagaStore.findByStatusAndUpdatedBefore(
    'RUNNING',
    new Date(Date.now() - 30 * 60 * 1000) // no update in 30 min
  );

  for (const saga of stuck) {
    logger.warn({
      event: 'saga.stuck',
      sagaId: saga.id,
      sagaType: saga.type,
      completedSteps: saga.completedSteps,
      lastUpdated: saga.updatedAt,
      ageMinutes: (Date.now() - saga.updatedAt.getTime()) / 60000,
    });
  }

  return stuck;
}
```

## Key Points
- Use distributed tracing to follow saga execution across services
- Carry saga.id as baggage in all propagated contexts
- Track metrics: started, completed, failed, compensated, duration
- Log every saga event with structured fields
- Alert on low saga success rates or high failure rates
- Monitor active saga count to detect stuck sagas
- Detect sagas with no progress for > 30 minutes
