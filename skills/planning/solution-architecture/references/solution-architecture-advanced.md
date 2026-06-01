# Solution Architecture Advanced Topics

## Introduction
Advanced solution architecture covers system decomposition strategies, distributed systems patterns, architecture modernization, and organizational architecture practices. These topics apply when the architecture must handle significant scale, complexity, or organizational breadth.

## Domain-Driven Design for Architecture

### Strategic Design
| Concept | Purpose | Example |
|---------|---------|---------|
| Bounded Context | Explicit boundary where a domain model applies | "Order Management" vs "Inventory Management" |
| Ubiquitous Language | Shared vocabulary within a context | Order context: "Order", "Line Item", "Shipment" |
| Context Map | Relationships between bounded contexts | Partnership, Shared Kernel, Customer-Supplier |
| Core Domain | The most valuable part of the system | Different for every business |

### Tactical Patterns
| Pattern | When to Use | Example |
|---------|-------------|---------|
| Entity | Object with identity and lifecycle | Customer, Order, Product |
| Value Object | Immutable object defined by attributes | Address, Money, Date Range |
| Aggregate | Cluster of entities treated as a unit | Order (with Line Items) |
| Repository | Collection-like access to aggregates | OrderRepository |
| Domain Event | Something that happened in the domain | OrderShipped, PaymentReceived |
| Domain Service | Stateless operation that doesn't fit an entity | PricingService, ShippingCalculator |
| Factory | Encapsulates complex creation logic | OrderFactory |

### Event Storming for Domain Discovery
A workshop technique to discover domain events and bounded contexts:
1. **Chaotic exploration**: Stakeholders write domain events on sticky notes (orange)
2. **Timeline**: Arrange events in chronological order
3. **Pain points**: Mark where processes break or need manual intervention (purple)
4. **Commands**: What triggers each event (blue)
5. **Aggregates**: Group events and commands into aggregates (yellow)
6. **Bounded contexts**: Identify natural cluster boundaries (pink boundaries)
7. **Actors**: Who performs each command (green)
8. **Systems**: What systems are involved (gray)
9. **Hot spots**: Mark areas needing deeper analysis

## Distributed Systems Patterns

### Data Consistency Patterns
| Pattern | Consistency | Performance | Complexity | Use Case |
|---------|-------------|-------------|------------|----------|
| Two-Phase Commit (2PC) | Strong | Low | High | Financial transactions |
| Saga (Choreography) | Eventual | High | Medium | Multi-service workflows |
| Saga (Orchestration) | Eventual | Medium | Medium | Complex workflows |
| Outbox Pattern | Strong(ish) | Medium | Medium | Reliable event publishing |
| Event Sourcing | Eventual | Medium | High | Audit trails, temporal queries |
| CQRS | Eventual | High | High | Different read/write optimization |

### Saga Pattern Implementation
A saga is a sequence of local transactions where each step publishes an event that triggers the next step. If a step fails, compensating transactions undo previous steps.

**Choreography Saga**: Each service listens for events and decides what to do:
```
OrderCreated → PaymentService processes → PaymentProcessed → ShippingService schedules → ShipmentScheduled
                                          → PaymentFailed → OrderService cancels order
```

**Orchestration Saga**: A coordinator tells each service what to do:
```
OrderOrchestrator: 
  1. Tell PaymentService to process payment
  2. Wait for PaymentProcessed or PaymentFailed
  3. If success: tell ShippingService to schedule
  4. If failure: tell OrderService to cancel
```

### Outbox Pattern
When a service needs to update the database AND publish an event reliably, use the outbox pattern:
1. Write the event to an `outbox` table in the same database transaction as the business data
2. A separate process reads the outbox table and publishes events
3. After successful publication, delete or mark the outbox record

This avoids the dual-write problem (database + message broker) that can cause inconsistency.

### CQRS (Command Query Responsibility Segregation)
Separate read and write models into different services or data stores:
- **Commands** (writes): Use the normalized domain model, validate business rules, enforce consistency
- **Queries** (reads): Use denormalized projections optimized for specific query patterns, bypass the domain model

Use CQRS when: read and write patterns are significantly different, read performance is critical, or you need different data representations for different consumers.

## Architecture Modernization

### Strangler Fig Pattern
Incrementally replace a legacy system by routing functionality to a new implementation:
1. Identify a bounded capability to extract
2. Build the new implementation alongside the legacy system
3. Route traffic for that capability to the new system
4. Run both systems in parallel to validate correctness
5. Remove the legacy code for that capability
6. Repeat with the next capability

### Anti-Corruption Layer
When integrating with a legacy system, create a translation layer that:
- Prevents the legacy system's domain model from leaking into the new system
- Translates between the legacy model and the new model
- Provides a clean interface that the new system depends on

### Feature Toggle Architecture
Feature flags enable deploying code without releasing it:
- **Release toggles**: Control feature availability (gradual rollout)
- **Experiment toggles**: A/B testing variants
- **Ops toggles**: Kill switches for problematic features
- **Permission toggles**: Who can see what (internal vs. external)

Architecture for feature flags: use a centralized flag evaluation service with caching. Avoid flag dependencies in critical paths. Clean up flags after feature stabilization.

## Architecture Evaluation Methods

### ATAM (Architecture Trade-off Analysis Method)
A structured evaluation approach involving stakeholders:
1. **Present**: architecture overview and business drivers
2. **Identify**: architectural approaches and their trade-offs
3. **Analyze**: how approaches address quality attribute scenarios
4. **Prioritize**: scenarios by business value and technical risk
5. **Document**: risks, trade-offs, sensitivity points, and non-risks

### Lightweight Architecture Evaluation
For smaller projects or faster cadence:
1. List the top 5 quality attribute scenarios
2. Map each to architectural decisions
3. Identify forced trade-offs between scenarios
4. Score how well the architecture supports each scenario
5. Document risks and mitigations

## Architecture Metrics

### DORA Metrics for Architecture
| Metric | What It Measures | Elite Performance |
|--------|-----------------|-------------------|
| Deployment Frequency | How often you deploy | Multiple times daily |
| Lead Time for Changes | Time from commit to production | < 1 hour |
| Change Failure Rate | % of deployments causing failure | < 5% |
| Time to Restore Service | Time to recover from failure | < 1 hour |

Architecture decisions directly impact these metrics. Microservices improve deployment frequency but may increase change failure rate. Monorepo + modular monolith may optimize lead time.

### Flow Metrics
- **Cycle Time**: Time from start of work to delivery
- **WIP**: Work in Progress — too much WIP slows everything
- **Throughput**: Items delivered per unit time
- **Flow Efficiency**: Active time / total time (target > 30%)

Architecture affects flow: tight coupling creates dependencies that increase WIP and cycle time. Poor modularity creates coordination overhead.

## Infrastructure Architecture

### Multi-Cloud Strategy
| Approach | Benefit | Cost | Complexity |
|----------|---------|------|------------|
| Single cloud | Simplicity, volume discounts | Lowest | Lowest |
| Multi-cloud primary/DR | Resilience, vendor independence | Higher | Higher |
| Multi-cloud active-active | No downtime, geographic distribution | Highest | Highest |
| Multi-cloud best-of-breed | Best services per workload | Highest | Highest |

Most organizations should start with single cloud. Add multi-cloud only when specific requirements (compliance, resilience, or negotiation leverage) demand it.

### Network Architecture
Standard secure topology:
```
Internet → WAF/CDN → Load Balancer → [Public Subnet: API Gateway, Reverse Proxy]
                                        → [Private Subnet: Application Services]
                                          → [Data Subnet: Databases, Caches, Queues]
```

- Public subnets: Only load balancers and reverse proxies
- Private subnets: Application services, no direct internet access
- Data subnets: Databases, caches, queues — no direct access from outside
- VPC peering / service mesh: Service-to-service communication
- VPN / Direct Connect: Corporate network access

## Organizational Architecture

### Conway's Law in Practice
"Organizations design systems that mirror their communication structure."
- Team boundaries should align with service boundaries (inverse Conway maneuver)
- Each service should be owned by exactly one team
- Cross-team communication should happen through APIs, not Slack
- Shared services require explicit ownership and governance

### Team Topologies
| Type | Purpose | Example |
|------|---------|---------|
| Stream-aligned | Owns a complete capability aligned to a value stream | Checkout team |
| Enabling | Helps other teams learn and adopt technologies | DevOps enablement |
| Complicated Subsystem | Owns a complex technical domain | Search/recommendation team |
| Platform | Builds internal platforms for other teams | Infrastructure platform team |

## Key Points
- Domain-driven design provides the language for decomposing systems into bounded contexts
- Distributed systems require explicit consistency and error handling patterns
- Modernization is incremental — use strangler fig and anti-corruption layers
- Architecture evaluation should be regular, structured, and involve stakeholders
- DORA and flow metrics give data-driven feedback on architecture decisions
- Team topology should drive system architecture, not the reverse
- Event storming is the most effective technique for discovering domain boundaries
- Outbox pattern prevents dual-write failures in event-driven systems
- CQRS is not a default — it's a solution to specific read/write asymmetry problems
- Feature flags decouple deployment from release, enabling safer rollouts
