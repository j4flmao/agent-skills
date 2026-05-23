# Choreography vs Orchestration

## Decision Framework

### Use Choreography When:
- 2-3 services in the saga.
- Linear execution path (no branching or parallel steps).
- Teams own their services independently.
- Event-driven architecture already in place.
- Acceptable to trace flow across multiple services.

### Use Orchestration When:
- 4+ services participate.
- Conditional branching or parallel execution needed.
- Complex compensation logic required.
- Centralized monitoring of saga state is important.
- Need timeout management on individual steps.

## Detailed Comparison

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| Coordination Model | Event-driven, peer-to-peer | Central coordinator service |
| Service Coupling | Loose (by event contract only) | Tighter (to coordinator API) |
| Flow Visibility | Distributed across services | Single coordinator state |
| Failure Handling | Each service handles its own compensation | Coordinator manages all compensations |
| Testing | End-to-end event flow tests | Coordinator unit tests + integration |
| Monitoring | Distributed tracing needed | Single saga state dashboard |
| Performance | No central bottleneck | Coordinator can become bottleneck |
| Complexity | Simple flows only | Handles complex flows |
| Team Independence | High | Lower |

## Choreography Example

```
OrderCreated → Inventory Reserved → Payment Processed → Order Confirmed
     |                |                    |
     ↓                ↓                    ↓
(compensation)  (compensation)      (compensation)
OrderCancelled  InventoryReleased   PaymentRefunded
```

## Orchestration Example

```
OrderOrchestrator
  ├── Step 1: Reserve Inventory → success → Step 2
  │   └── fail → COMPENSATE (cancel order)
  ├── Step 2: Process Payment → success → Step 3
  │   └── fail → COMPENSATE (release inventory + cancel order)
  ├── Step 3: Ship Order → success → COMPLETE
  │   └── fail → COMPENSATE (refund payment + release inventory + cancel order)
  └── Monitoring: track all state transitions
```

## Hybrid Approach

For complex systems, use orchestration within a bounded context and choreography between contexts:

```
Order Orchestrator (within Order domain):
  - Coordinates inventory, payment, shipping

Cross-context communication (choreography via events):
  - OrderConfirmed → Notification service sends email
  - OrderConfirmed → Analytics service records conversion
```
