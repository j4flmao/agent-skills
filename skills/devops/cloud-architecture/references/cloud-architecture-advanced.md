# Cloud Architecture Advanced Topics

## Introduction
Advanced cloud architecture covers multi-region active-active architectures, chaos engineering integration, cloud-agnostic patterns, cost-aware design, and platform engineering.

## Multi-Region Active-Active
Active-active architecture serves traffic from multiple regions simultaneously. Global load balancing with latency-based routing. Data replication with conflict resolution. Session affinity and distributed caching. State management strategies: global databases (Spanner, Cosmos DB), distributed caches (Redis Global Datastore), or client-side state. Failover is instant since both regions serve traffic.

## Strangler Fig Pattern Implementation
Route traffic incrementally from legacy to new system. Use feature flags or API gateway routing. Maintain both systems during migration. Monitor success rate of migrated functionality. Gradual migration reduces risk compared to big-bang. Common for monolith to microservices migration.

## Cloud-Agnostic Architecture
Abstract cloud provider dependencies behind interfaces. Use Terraform/Terraform CDK for multi-cloud IaC. Kubernetes as portable orchestration layer. OpenTelemetry for vendor-neutral observability. Avoid provider-specific managed services for core business logic. Use abstraction layers (Dapr, Crossplane) for portability.

## Cost-Aware Architecture
Design decisions informed by cost implications. Choose region based on service pricing differences. Use appropriate storage tiers for data lifecycle. Right-sizing applied before reserved capacity purchase. Spot/preemptible for fault-tolerant workloads. Data transfer costs considered in architecture (same-region affinity).

## Platform Engineering
Internal Developer Platform (IDP) for self-service infrastructure. Backstage for developer portal. Score or Humanitec for workload specifications. Crossplane for infrastructure provisioning. Goldpinger for developer golden paths. Platform team maintains paved roads, not roadblocks.

## Event-Driven Architecture at Scale
Event sourcing: immutable event log as source of truth. CQRS: separate read and write models. Saga pattern for distributed transactions. Outbox pattern for reliable event publishing. Dead letter queues for failed event processing. Schema registry for event contract evolution.

## References
- cloud-architecture-fundamentals.md -- Fundamentals
- microservices-patterns.md -- Microservices Patterns
- event-driven-design.md -- Event-Driven Design
- migration-patterns.md -- Migration Patterns
- cost-optimization.md -- Cost Optimization
