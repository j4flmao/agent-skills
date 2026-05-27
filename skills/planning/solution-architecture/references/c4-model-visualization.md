# C4 Model for Architecture Visualization

## Overview

The C4 model is a hierarchical approach to software architecture visualization created by Simon Brown. It provides four abstraction levels (Context, Container, Component, Code) that allow different stakeholders to understand the system at the appropriate level of detail.

## Core Principles

### Abstractions Match Stakeholder Needs

| Level | Audience | What It Shows |
|-------|----------|--------------|
| Level 1: System Context | Everyone | System as a black box, users, dependencies |
| Level 2: Container | Tech + non-tech | High-level technology choices, service boundaries |
| Level 3: Component | Developers | Internal structure of a container |
| Level 4: Code | Developers | Implementation details (optional, often code itself) |

### Diagramming Standards

```
Every C4 diagram MUST include:
- Title (level + system name)
- Legend explaining shapes and colors
- Clear labels on all relationships
- Direction of data/control flow arrows
- Key: solid = sync, dashed = async
- Version/date for traceability
```

## Level 1: System Context Diagram

### Purpose
Show the system boundary, external actors (people and systems), and the relationships between them.

### Elements

| Element | Shape | Color | Description |
|---------|-------|-------|-------------|
| System | Box (center) | Primary | The system being modeled |
| Person | Stick figure | Secondary | End users, administrators, operators |
| External System | Box (perimeter) | Gray | Dependent or dependent-on systems |
| Relationship | Arrow | N/A | Labeled with data flow description |

### System Context Template

```
┌─────────────────────────────────────────────────────┐
│                    [Person]                         │
│              "Customer (web user)"                  │
│                    │                                │
│                    │ "Uses"                         │
│                    ▼                                │
│  ┌─────────────────────────────────────────────┐   │
│  │              [Software System]              │   │
│  │         "E-Commerce Platform"               │   │
│  └─────────────────────────────────────────────┘   │
│                    │                                │
│       ┌────────────┼────────────┐                  │
│       │            │            │                   │
│       ▼            ▼            ▼                   │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐             │
│  │Payment  │ │Inventory│ │  Email   │             │
│  │Gateway  │ │ System  │ │ Service  │             │
│  │[Ext]    │ │ [Ext]   │ │ [Ext]    │             │
│  └─────────┘ └─────────┘ └──────────┘             │
└─────────────────────────────────────────────────────┘
```

### Rules
- Exactly ONE software system (the one you're building) in the center
- Include only external dependencies, NOT internal containers
- Label ALL relationships with a brief verb phrase
- Persons are actors, not roles — use personas (e.g., "Customer," not "User")

## Level 2: Container Diagram

### Purpose
Decompose the system into runtime containers (services, databases, message queues, etc.) and show technology choices.

### Container Types

| Container | Shape | Technology in Label | Example |
|-----------|-------|-------------------|---------|
| Single-page app | Browser icon | React, Angular | "React SPA" |
| Web API | Server icon | Language + framework | "Java Spring Boot API" |
| Database | Cylinder | Product + version | "PostgreSQL 16" |
| Queue | Queue icon | Product | "Apache Kafka" |
| File Storage | Cloud icon | Service | "AWS S3" |
| Cache | Box with lightning | Product | "Redis Cluster" |

### Container Diagram Template

```
┌─────────┐     ┌────────────────────────────────────────────┐
│ Web App │────▶│         API Gateway (Kong)                │
│ (NextJS)│     │  Auth, Rate-limit, Routing, Aggregation    │
└─────────┘     └──────┬────────────────────┬───────────────┘
                       │                    │
                       ▼                    ▼
            ┌──────────────────┐  ┌──────────────────┐
            │  User Service    │  │  Order Service   │
            │  (Spring Boot)   │  │  (Spring Boot)   │
            └───────┬──────────┘  └────────┬─────────┘
                    │                      │
                    ▼                      ▼
            ┌──────────────────┐  ┌──────────────────┐
            │   PostgreSQL     │  │   PostgreSQL     │
            │   (Primary)      │  │   (Primary)      │
            └──────────────────┘  └──────────────────┘
                    │                      │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────┐
                    │   Kafka Queue   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Search Worker  │
                    │  (Node.js)      │
                    └───────┬──────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  Elasticsearch   │
                    └──────────────────┘
```

### Container Rules

```
R1: Every container has a defined technology stack
R2: Every container has a single responsibility
R3: Inter-container communication is through network calls or message passing
R4: Database is a container — NOT embedded inside a service
R5: External systems from Level 1 appear as boundary boxes, not containers
R6: Include ALL significant technology choices in labels
```

### Technology Decision Annotation

For each container, annotate the key technology decision:

```
Container: Order Service (Spring Boot 3.2, Java 21)
Decision: ADR-004 — Chose Spring Boot over Quarkus
  Reason: Team expertise, ecosystem maturity
  Trade-off: Slightly higher memory footprint
```

## Level 3: Component Diagram

### Purpose
Decompose a single container into its structural components — what building blocks exist inside.

### Component Types

| Component | Description | Examples |
|-----------|-------------|----------|
| Controller | API surface, request handling | REST controller, GraphQL resolver |
| Service | Business logic, orchestration | OrderService, PaymentService |
| Repository | Data access, persistence | UserRepository, OrderRepository |
| Adapter | External system integration | PaymentGatewayAdapter, EmailClient |
| Domain | Core business model | Order, Customer, Product |
| Infrastructure | Cross-cutting concerns | AuthFilter, LoggingMiddleware |

### Component Diagram Template (for a single container)

```
┌─────────────────── Order Service Container ───────────────────┐
│                                                                │
│  ┌──────────┐  ┌────────────┐  ┌────────────────────────┐    │
│  │ REST     │─▶│ Order      │─▶│ OrderRepository (JPA)  │    │
│  │Controller│  │ Service    │  │                        │    │
│  └──────────┘  └─────┬──────┘  └──────────┬─────────────┘    │
│                      │                    │                   │
│                      │                    ▼                   │
│                      │           ┌────────────────────┐       │
│                      │           │  PostgreSQL (DB)    │       │
│                      │           └────────────────────┘       │
│                      │                                        │
│                      │  ┌────────────────────────┐            │
│                      └─▶│ PaymentGatewayAdapter  │            │
│                         └──────────┬─────────────┘            │
│                                    ▼                           │
│                          [External: Payment Gateway]           │
└────────────────────────────────────────────────────────────────┘
```

### Component Rules

```
R1: Every component belongs to exactly one container
R2: Components communicate via interfaces, not implementation
R3: Component boundaries should align with architectural boundaries
R4: Adapter components isolate external dependencies
R5: A component is NOT a microservice — it's an internal module
```

## Level 4: Code

### Purpose
Show how individual components are implemented using UML class diagrams, entity-relationship diagrams, or similar.

### When to Use Level 4

```
Level 4 diagrams are useful when:
- Onboarding new team members to complex domain logic
- Documenting complex entity relationships
- Explaining a state machine or workflow
- Modeling aggregate boundaries for DDD

Level 4 diagrams are NOT useful when:
- The code itself is the source of truth (current state)
- The implementation is straightforward
- The diagram would duplicate what already exists in code
```

### Code Diagram Template (UML class diagram)

```
┌─────────────────────────────┐
│          Order              │
├─────────────────────────────┤
│ - id: UUID                  │
│ - customerId: UUID          │
│ - lines: List<OrderLine>    │
│ - status: OrderStatus       │
│ - total: Money              │
├─────────────────────────────┤
│ + addLine(product, qty)     │
│ + confirm()                 │
│ + cancel(reason)            │
│ + collectEvents()           │
│ ─────────────────────────── │
│ - _validateInvariants()     │
└─────────────────────────────┘
         │ 1            *
         ▼
┌─────────────────────────────┐
│        OrderLine            │
├─────────────────────────────┤
│ - productId: string         │
│ - quantity: int             │
│ - unitPrice: Money          │
├─────────────────────────────┤
│ + total(): Money            │
└─────────────────────────────┘
```

## Diagram Notation Standards

### Relationships

| Notation | Meaning |
|----------|---------|
| ──▶  | Synchronous call (REST, gRPC) |
| ══▶  | Asynchronous message (event, queue) |
| ─ ─▶ | Eventual / eventual flow |
| ──◇  | Data flow with transformation |
| ──●  | Dependency with shared model |

### Colors and Styling

```
System colors (recommended palette):
- Existing system:      #CCCCCC (gray) with dashed border
- New system being built: #1168BD (blue) with solid border
- External system:       #999999 (light gray)
- Database:              #E8E8E8 (light) with cylinder icon
- Person:                #08427B (dark blue)

Data store: use cylinder shape
Active component: use box with solid border
Passive component: use box with dashed border
```

## Diagram Anti-Patterns

### Anti-Pattern 1: Too Many Details on High-Level Diagrams

```
Bad (Level 1 with implementation detail):
  System Context shows database engine, cache type, number of pods
  → Violates abstraction layering, confuses non-technical stakeholders

Good:
  Level 1 = system as black box
  Level 2 = technology choices visible
  Level 3 = detailed implementation
```

### Anti-Pattern 2: Missing Relationship Labels

```
Bad:
  [User] ──▶ [System] (what does the user DO with the system?)

Good:
  [User] ──▶ [System] "Places orders and views history"
```

### Anti-Pattern 3: Overloaded Diagrams

```
Bad:
  Single diagram showing all 4 C4 levels simultaneously

Good:
  One diagram per C4 level, each with specific audience and purpose
```

### Anti-Pattern 4: Inconsistent Abstraction Levels

```
Bad:
  Container diagram showing a single class inside a service
  → Jumps between Level 2 and Level 4

Good:
  Container diagram = only containers (services, DBs, queues)
  Component diagram = internals of ONE container
```

## Tooling

### Diagram-as-Code Tools

| Tool | Language | Best For |
|------|----------|----------|
| Structurizr DSL | Java-based DSL | Full C4 model, automated diagram generation |
| PlantUML | Plain text DSL | Quick C4 diagrams, CI pipeline integration |
| Mermaid | Markdown DSL | Markdown-native diagrams, GitHub/MDN compatible |
| Diagrams (Python) | Python | Code-based infrastructure diagrams |
| Draw.io / diagrams.net | GUI + XML | Collaborative diagramming |

### Structurizr DSL Example

```
workspace "E-Commerce Platform" {
    model {
        user = person "Customer" "A web shop customer"
        system = softwareSystem "E-Commerce Platform" "Allows customers to browse and purchase products"
        
        user -> system "Places orders"
    }
    views {
        systemContext system {
            include *
            autoLayout
        }
    }
}
```

### PlantUML C4 Example

```
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

Person(customer, "Customer", "Web shop customer")
System_Boundary(ecommerce, "E-Commerce Platform") {
    Container(web_app, "Web App", "Next.js", "Server-side rendered React app")
    Container(api, "API", "Spring Boot", "REST API handling business logic")
    ContainerDb(db, "Database", "PostgreSQL 16", "Primary data store")
}

Rel(customer, web_app, "Uses", "HTTPS")
Rel(web_app, api, "API calls", "JSON/HTTPS")
Rel(api, db, "Reads/Writes", "JDBC")
@enduml
```

## Key Points

- Use C4 to communicate with different stakeholders at the right abstraction level — one diagram does not fit all
- Always label relationships with a verb phrase describing the interaction — unlabeled arrows create ambiguity
- Keep each diagram focused on one level of abstraction — mixing levels defeats the purpose
- Annotate technology decisions with ADR references — connecting diagrams to decisions creates traceability
- Use diagram-as-code tools for version-controlled, reviewable architecture documentation
- Start with System Context for any design discussion — it aligns all stakeholders on scope and boundaries
- Container diagrams are the most valuable for engineering discussions — they capture real technology choices
- Component diagrams are optional and most valuable for complex containers with multiple internal modules
- Review diagrams with the target audience before finalizing — if they don't understand it, it's too detailed or too vague
