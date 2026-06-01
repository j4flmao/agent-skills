# Cloud Architecture Fundamentals

## Overview
Cloud architecture designs systems that leverage cloud computing benefits: scalability, reliability, cost efficiency, and managed services. It encompasses compute, storage, networking, security, and application design patterns for cloud environments.

## Core Concepts

### Cloud Service Models
IaaS (Infrastructure as a Service): virtual machines, storage, networking. Full control, highest flexibility, most management overhead. PaaS (Platform as a Service): managed runtime, databases, middleware. Focus on code, less operational overhead. SaaS (Software as a Service): ready-to-use applications. No management, lowest flexibility.

### Deployment Models
Public cloud: shared infrastructure over internet (AWS, Azure, GCP). Private cloud: dedicated infrastructure for single organization. Hybrid cloud: mixed public and private with orchestration. Multi-cloud: multiple public cloud providers for redundancy or best-of-breed.

### Design Principles
Scalability: horizontal scaling (add instances) over vertical scaling (bigger instances). Disposability: treat servers as disposable, automate replacement. Automation: infrastructure as code, automated deployments, self-healing. Loose coupling: services communicate via APIs, not direct connections. Resilience: design for failure, graceful degradation.

## Key Architecture Patterns

### Microservices
Decompose application into small, independent services. Each service owns its data, communicates via APIs. Independent deployment and scaling. Challenges: distributed tracing, data consistency, service discovery.

### Event-Driven Architecture
Services communicate asynchronously via events. Event producers publish to message broker. Event consumers subscribe and react. Benefits: loose coupling, scalability, audit trail. Tools: Kafka, RabbitMQ, SQS, EventBridge.

### Strangler Fig Pattern
Incrementally migrate legacy systems by routing functionality to new implementations. Start with one module, route traffic to new version. Gradually increase until legacy is fully replaced. Reduces risk compared to big-bang migration.

## Design Considerations

### High Availability
Distribute workload across multiple Availability Zones. Use load balancers to distribute traffic. Implement health checks and auto-recovery. Design for instance or service failure without downtime. RTO/RPO targets drive HA investment level.

### Cost Optimization
Right-size resources based on utilization metrics. Use reserved capacity for baseline workloads. Use spot/preemptible instances for fault-tolerant workloads. Implement auto-scaling to match demand. Use managed services to reduce operational cost.

### Security
Implement defense in depth (network, application, data, identity). Encrypt data at rest and in transit. Apply least-privilege access control. Enable audit logging and monitoring. Use secrets management services.

## References
- cloud-architecture-advanced.md -- Advanced Cloud Architecture topics
- microservices-patterns.md -- Microservices Patterns
- event-driven-design.md -- Event-Driven Design
- migration-patterns.md -- Migration Patterns
- cost-optimization.md -- Cost Optimization
