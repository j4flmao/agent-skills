---
name: cloud-architecture
description: >
  Use this skill when the user says 'cloud architecture', 'Well-Architected',
  'landing zone', 'multi-cloud', 'hybrid cloud', 'cloud design',
  'cloud patterns', 'microservices', 'event-driven architecture',
  'resilience patterns', 'cloud migration strategy', 'cloud governance',
  'cloud security architecture', 'cost-aware architecture'.
  Covers: Well-Architected Framework (AWS/Azure/GCP), landing zone design,
  multi-cloud strategy, resilience patterns (circuit breaker, bulkhead, etc.),
  migration patterns, governance, cloud-native architecture patterns.
  Do NOT use for: specific cloud provider implementation (use aws/azure/gcp skills).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud-architecture, well-architected, phase-5]
---

# Cloud Architecture

## Purpose
Design cloud architectures following the Well-Architected Framework, landing zone patterns, multi-cloud strategies, and resilience patterns for production workloads.

## Architecture Decision Trees

### Deployment Model Decision
| Model | Best For | Complexity | Cost | Security |
|---|---|---|---|---|
| Single cloud | Startups, single-region apps | Low | Lowest (volume discounts) | Simple |
| Multi-cloud | Avoiding vendor lock-in, compliance | High | Higher (no volume discounts) | Complex |
| Hybrid cloud | On-prem + cloud, latency-sensitive | Very High | Highest | Very Complex |
| Cloud-native (PaaS) | Speed to market, less ops | Low | Medium | Platform-managed |

### Architecture Style Selection
| Style | Use Case | Scalability | Maintainability |
|---|---|---|---|
| Monolithic (lift-shift) | Legacy apps, fast migration | Vertical only | Low |
| Layered (3-tier) | Traditional web apps | Medium | Medium |
| Microservices | Complex apps, independent scaling | Excellent | High (upfront cost) |
| Event-driven | Async processing, real-time | Excellent | Medium |
| Serverless | Event-driven, variable load | Infinite (function level) | High |
| Containerized | Portable, consistent envs | Excellent | Medium |

### Compute Pattern Decision Tree
```
Is workload stateful?
├── Yes → Is latency < 5ms?
│   ├── Yes → Bare metal or dedicated instance
│   └── No → Managed service (RDS, ElastiCache, etc.)
└── No → Is workload bursty?
    ├── Yes → Serverless (Lambda, Cloud Functions)
    └── No → Does it run in containers?
        ├── Yes → ECS/EKS/GKE/AKS
        └── No → Is it a simple web app?
            ├── Yes → PaaS (App Runner, Cloud Run, App Service)
            └── No → EC2/Compute Engine/VMs
```

### Resilience Pattern Selection
| Pattern | Problem Solved | Complexity | Cost Overhead |
|---|---|---|---|
| Retry with backoff | Transient failures | Low | Minimal |
| Circuit breaker | Cascading failures | Medium | Minimal |
| Bulkhead | Resource exhaustion | Medium | Resource reservation |
| Timeout | Slow dependencies | Low | Minimal |
| Health check | Unhealthy instances | Low | Minimal |
| Throttling | Overload protection | Medium | Request queue |
| Saga | Distributed transaction | High | Compensating logic |
| CQRS | Read/write separation | High | Event store + separate DB |
| Event sourcing | Audit trail | Very High | Event store |

### Multi-Cloud Strategy
| Strategy | Primary | Secondary | Data Sync |
|---|---|---|---|
| Active-Passive (DR) | AWS | GCP | Async replication |
| Active-Active | Azure | AWS | Synchronous/eventual |
| Workload-specific | Compute: AWS | Data: GCP | Per application |
| Cloud-agnostic (K8s) | Any | Any | GitOps control plane |

## Quick Start
Identify workload characteristics → Select architecture style → Apply Well-Architected pillars → Design landing zone → Implement resilience patterns → Define governance → Document design decisions.

## Core Patterns

### Well-Architected Pillars
```
AWS Well-Architected     Azure Well-Architected      GCP Architecture
────────────────────────────────────────────────────────────────────
1. Operational Excellence  1. Reliability            Architecture Framework
2. Security                2. Security                1. System Design
3. Reliability             3. Cost Optimization      2. Operational Excellence
4. Performance Efficiency  4. Operational Excellence 3. Security
5. Cost Optimization       5. Performance Efficiency 4. Reliability
6. Sustainability          6. Sustainability         5. Cost Optimization
```

### Landing Zone Design
```hcl
# Conceptual landing zone structure
# ┌─────────────────────────────────┐
# │  Management Group Hierarchy     │
# │  ├── Platform          (mgmt)   │
# │  ├── Landing Zones     (apps)   │
# │  │   ├── Production             │
# │  │   ├── Non-Production         │
# │  │   └── Development            │
# │  └── Sandbox           (exp)    │
# └─────────────────────────────────┘
# ┌─────────────────────────────────┐
# │  Shared Services                │
# │  ├── Log Archive (central logs) │
# │  ├── Security (audit, IAM)      │
# │  └── Network (shared VPC/VNet)  │
# └─────────────────────────────────┘
```

### Circuit Breaker Pattern
```python
import time
import threading
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30, half_open_max=3):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max = half_open_max
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.half_open_attempts = 0
        self.last_failure_time = 0
        self._lock = threading.Lock()

    def call(self, func, fallback=None):
        with self._lock:
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time >= self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    self.half_open_attempts = 0
                else:
                    return fallback() if fallback else None

        try:
            result = func()
            with self._lock:
                if self.state == CircuitState.HALF_OPEN:
                    self.half_open_attempts += 1
                    if self.half_open_attempts >= self.half_open_max:
                        self.state = CircuitState.CLOSED
                        self.failure_count = 0
                else:
                    self.failure_count = 0
            return result
        except Exception as e:
            with self._lock:
                self.failure_count += 1
                self.last_failure_time = time.time()
                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                    self.failure_count = 0
            return fallback() if fallback else None
```

### Bulkhead Pattern with Thread Pools
```python
from concurrent.futures import ThreadPoolExecutor

# Bulkhead: isolated thread pools per service
class BulkheadPool:
    def __init__(self):
        self.pools = {
            "critical": ThreadPoolExecutor(max_workers=20),
            "non-critical": ThreadPoolExecutor(max_workers=5),
            "batch": ThreadPoolExecutor(max_workers=2),
        }

    def submit(self, tier, fn, *args, **kwargs):
        pool = self.pools.get(tier, self.pools["non-critical"])
        return pool.submit(fn, *args, **kwargs)

# Usage
bulkhead = BulkheadPool()
future = bulkhead.submit("critical", payment_service.process, order)
```

### Event-Driven Architecture with Message Brokers
```yaml
# Architecture flow:
# [Order Service] → (order.created) → [Payment Service] → (payment.completed)
#                                      → [Inventory Service] → (inventory.updated)
#                                      → [Notification Service]

# Using AWS services:
# Order Service → EventBridge → Payment Service (SQS)
#                             → Inventory Service (SQS)
#                             → Notification Service (SQS with DLQ)

# Using Kafka:
# Order Service → Topic: orders (key: order_id)
# Payment Service → Consumer group: payment-processors
# Inventory Service → Consumer group: inventory-trackers
```

### Strangler Fig Migration Pattern
```yaml
# Migration approach: slowly replace monolith with microservices
# Phase 1: Route /api/new/* to new services → monolith for old
# Phase 2: Route /api/orders/* to order-service
# Phase 3: Route /api/payments/* to payment-service
# Phase 4: Route /api/users/* to user-service
# Phase 5: Decommission monolith

# Reverse proxy config (nginx)
location /api/orders {
    proxy_pass http://order-service:8080;
}
location /api/payments {
    proxy_pass http://payment-service:8080;
}
location / {
    proxy_pass http://monolith:3000;  # Getting smaller
}
```

## Anti-Patterns

### Anti-Pattern 1: Over-Engineering
Designing for millions of users when starting from zero. Start simple (monolith/PaaS), evaluate scaling needs as traffic grows.

### Anti-Pattern 2: No Cost Governance
Building without cost guardrails. Set budgets, use tagging, implement auto-shutdown for non-production.

### Anti-Pattern 3: Single Points of Failure
Running one instance, one AZ, one region. Critical workloads require multi-AZ at minimum, multi-region for DR.

### Anti-Pattern 4: Deep Coupling
Services calling each other synchronously in chains. Use async messaging (queues, events) for non-critical dependencies.

### Anti-Pattern 5: No Data Strategy
Choosing database before understanding access patterns. Consider access patterns, consistency requirements, and scale before picking DB.

## Production Considerations

### Governance
- Implement tagging strategy for cost allocation and automation.
- Use policy-as-code (OPA, Azure Policy, AWS SCPs) for compliance.
- Define deployment environments (dev/staging/prod) with clear boundaries.
- Implement change management with approval gates.

### Observability Requirements
- Unified logging (structured JSON → central store).
- Distributed tracing (OpenTelemetry) across services.
- Metrics (RED: Rate, Errors, Duration per service).
- Centralized dashboard with SLO tracking.
- Alerting on burn rate, not static thresholds.

### Cost Optimization
- Use serverless / scale-to-zero for variable workloads.
- Right-size instances based on actual utilization.
- Use reserved instances for baseline capacity.
- Implement auto-scaling for variable demand.
- Delete unused resources (load balancers, EIPs, volumes).

## Rules & Constraints
- Every service must have at least 2 replicas across 2 AZs.
- All services must have health check endpoints.
- Inter-service communication must have timeouts and retries.
- Define RPO/RTO before designing DR strategy.
- Document all architecture decisions (ADRs).

## References
  - references/cloud-architecture-advanced.md
  - references/cloud-architecture-fundamentals.md
  - references/cloud-cost-optimization.md
  - references/cloud-migration.md
  - references/cloud-resilience-patterns.md
  - references/landing-zone.md
  - references/multi-cloud-strategy.md
  - references/well-architected.md
  - references/adr-template.md

## Handoff
Next: **landing-zone** — detailed landing zone implementation.
