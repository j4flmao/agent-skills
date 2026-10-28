---
name: architecture-microservices-patterns
description: >
  Use this skill when the user says 'microservices patterns', 'split the monolith', 'saga', 'circuit breaker', 'service decomposition', 'database per service', 'API gateway', 'strangler fig', 'distributed monolith', 'service-to-service resilience'. Decides whether and how to decompose into services, then applies the core patterns: decomposition by capability, data ownership, sagas, resilience (timeouts, retries, circuit breakers, bulkheads), gateway/BFF, and migration via strangler fig. Do NOT use for: domain modeling inside a service (architecture/system-design/domain-driven-design), messaging infrastructure details (architecture/event-driven), or Kubernetes/service-mesh operations (devops skills).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [architecture, microservices, saga, circuit-breaker, resilience, strangler-fig, decomposition]
---

# Microservices Architecture Patterns

## Purpose
Microservices buy independent deployment and scaling per business capability at the cost of distributed-systems complexity: partial failure, network latency, eventual consistency, and operational overhead. This skill covers when that trade is worth it and the patterns that keep a service landscape from becoming a distributed monolith.

## Agent Protocol

### Trigger
"microservices", "service decomposition", "monolith to microservices", "saga", "compensating transaction", "circuit breaker", "bulkhead", "API gateway", "database per service", "strangler fig".

### Input Context
- Team count and structure; deployment frequency pain.
- Domain map / bounded contexts.
- Current architecture and data model; cross-entity transactions.
- SLOs and traffic patterns.

### Output Artifact
Decomposition proposal, per-service data ownership, interaction style per flow, resilience policy table, migration plan.

### Response Format
```
Decision: {modular monolith|microservices} because {reason}
Services: {name}: capability, owns {data}, team {x}
Flow {name}: {sync|async} via {REST|gRPC|events}; consistency {saga orchestration|choreography}
Resilience per call: timeout={ms} retries={n, backoff+jitter, idempotent?} breaker={threshold}
Migration: strangler step {n}: route {path} -> {service}
```

### Completion Criteria
- [ ] Services aligned to business capabilities/bounded contexts.
- [ ] Each service owns its data; no shared tables.
- [ ] Every remote call has timeout; retries only on idempotent operations.
- [ ] Multi-service business transactions modeled as sagas with compensations.
- [ ] Observability: tracing across services, per-service SLOs.

## When (Not) to Use
| Situation | Recommendation |
|---|---|
| Small team, unclear domain | Modular monolith with enforced module boundaries |
| Many teams blocked by shared deploys | Extract services along team/capability lines |
| One component with very different scaling/runtime needs | Extract that component only |
| Desire for "modern architecture" | Not a reason |

## Decomposition
- By **business capability / bounded context** (Ordering, Payments, Shipping), not by technical layer or by table (entity services).
- Services should be able to fulfill most requests with their own data; frequent synchronous chains (A → B → C → D) signal wrong boundaries.
- **Database per service**: other services access data only via API or events; read models replicate what they need.

## Communication
| Style | Use for | Risks |
|---|---|---|
| Sync REST/gRPC | Queries, user-facing request/response | Temporal coupling, latency chains |
| Async events | Propagating state changes | Eventual consistency |
| Async commands (queue) | Work requests to one owner | Need correlation and replies |

Gateway/BFF: single entry point for clients handling routing, auth, rate limiting; a BFF per client type when needs diverge.

## Sagas
A saga is a sequence of local transactions; on failure, previously completed steps are undone by compensating transactions.

| Variant | Coordination | Pros | Cons |
|---|---|---|---|
| Choreography | Services react to each other's events | No central component | Flow hard to see; cyclic dependencies |
| Orchestration | Orchestrator sends commands, tracks state | Explicit flow, easier monitoring | Orchestrator is extra component |

```python
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable

log = logging.getLogger("saga")


@dataclass(frozen=True)
class Step:
    name: str
    action: Callable[[dict], None]        # must be idempotent (keyed by saga_id)
    compensate: Callable[[dict], None]    # must be idempotent and retryable


class SagaFailed(RuntimeError):
    pass


def run_saga(saga_id: str, steps: list[Step], ctx: dict) -> None:
    done: list[Step] = []
    for step in steps:
        try:
            step.action({**ctx, "saga_id": saga_id})
            done.append(step)          # persist progress in production (durable saga log)
        except Exception as exc:
            log.error("saga=%s step=%s failed: %s; compensating %d steps",
                      saga_id, step.name, exc, len(done))
            for prev in reversed(done):
                prev.compensate({**ctx, "saga_id": saga_id})
            raise SagaFailed(f"saga {saga_id} failed at {step.name}") from exc

# run_saga("ord-981", [Step("reserve_stock", reserve, release),
#                      Step("charge_payment", charge, refund),
#                      Step("schedule_shipping", schedule, cancel_shipment)], {"order_id": "981"})
```

In production, persist saga state (or use a durable workflow engine such as Temporal) so a crash mid-saga resumes or compensates; design for semantic rollback (refund, release) because steps are visible to others before the saga ends. Put the step most likely to fail early and irreversible steps (send email, ship) last.

## Resilience Patterns
| Pattern | Purpose | Guidance |
|---|---|---|
| Timeout | Bound waiting | Every call; inner timeouts shorter than outer; propagate deadlines |
| Retry | Survive transient faults | 2-3 attempts, exponential backoff + full jitter, idempotent ops only, one layer only |
| Circuit breaker | Stop hammering a failing dependency | Open on failure rate over a sliding window; half-open probes |
| Bulkhead | Contain resource exhaustion | Separate pools/concurrency limits per dependency |
| Fallback | Degrade gracefully | Cached/default data, feature off |
| Rate limiting / load shedding | Protect capacity | Reject early with 429/503 |

Resilience4j (Spring Boot) example; Hystrix is in maintenance mode since 2018:

```yaml
resilience4j:
  circuitbreaker:
    instances:
      payments:
        slidingWindowType: COUNT_BASED
        slidingWindowSize: 50
        minimumNumberOfCalls: 20
        failureRateThreshold: 50
        waitDurationInOpenState: 30s
        permittedNumberOfCallsInHalfOpenState: 5
  timelimiter:
    instances:
      payments:
        timeoutDuration: 2s
  retry:
    instances:
      payments:
        maxAttempts: 3
        waitDuration: 200ms
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2
        enableRandomizedWait: true
```

Other stacks: Polly (.NET), gobreaker / failsafe-go (Go), opossum (Node.js), or mesh-level outlier detection and retries (Envoy/Istio). Avoid retrying in both the mesh and the application.

## Migration: Strangler Fig
1. Put a routing facade (gateway/proxy) in front of the monolith.
2. Extract one capability; route its endpoints to the new service.
3. Sync data during transition (CDC from the monolith DB or events), then cut ownership over.
4. Delete the old code path; repeat. Never big-bang rewrite.

## Anti-Patterns
| Anti-pattern | Symptom | Fix |
|---|---|---|
| Distributed monolith | Lockstep deploys, shared DB | Data ownership, async integration, contract tests |
| Entity services | `CustomerService`, `AddressService` chatty calls | Capability-based boundaries |
| Synchronous chains | Latency and availability multiply | Events, local read models |
| Retry storms | Outage amplification | Retry budgets, jitter, breakers |
| No tracing | Undebuggable incidents | OpenTelemetry across services and queues |
| 2PC across services | Blocking, coupling | Sagas |

## Checklist
- [ ] Decomposition justified by teams/capabilities.
- [ ] Data ownership matrix; no shared schemas.
- [ ] Per-dependency timeout/retry/breaker/bulkhead table.
- [ ] Sagas with compensations, idempotent steps, durable state.
- [ ] Outbox for events; idempotent consumers.
- [ ] Gateway/BFF, service discovery, tracing, per-service SLOs.
- [ ] Consumer-driven contract tests in CI.

## References
- Richardson, "Microservices Patterns" (2018) and microservices.io; Newman, "Building Microservices" 2nd ed. (2021).
- Nygard, "Release It!" 2nd ed. — stability patterns; Garcia-Molina & Salem, "Sagas" (SIGMOD 1987).
- Resilience4j documentation.
