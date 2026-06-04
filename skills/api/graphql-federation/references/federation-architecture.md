# Federation Architecture

This document specifies the core architectural principles, topology design patterns, and structural differences between Federation v1 and v2 in a distributed GraphQL ecosystem.

---

## Monolith vs. Federated GraphQL Architecture

In a monolithic GraphQL architecture, a single application server hosts the entire schema, handles all queries, and communicates with all downstream databases or microservices. As organizations grow, this creates a bottleneck.

```
Monolithic GraphQL:
Client ──► [ GraphQL Monolith Server ] ──► [ DB / Microservices ]
            (Single Point of Failure, Schema Collisions)

Federated GraphQL:
Client ──► [ Apollo Router (Gateway) ]
             ├──► [ Accounts Subgraph ] ──► [ Accounts DB ]
             ├──► [ Products Subgraph ] ──► [ Products DB ]
             └──► [ Orders Subgraph ]   ──► [ Orders DB ]
```

### Key Trade-offs

| Dimension | Monolithic GraphQL | Federated GraphQL |
|-----------|--------------------|-------------------|
| **Schema Ownership** | Shared across all developers; prone to merge conflicts. | Bounded contexts owned by distinct teams. |
| **Scaling** | Scale the entire monolith vertically or horizontally. | Scale individual subgraphs based on load profiles. |
| **Latency** | Single hop. In-memory execution of resolvers. | Gateway adds network hop + query planning overhead. |
| **Resiliency** | Crash in one resolver can take down the whole server. | Subgraph failure only affects fields owned by it. |
| **Composition** | Runtime schema initialization. | Build-time composition with CI validation. |

---

## Subgraph Design Principles & Bounded Contexts

Following Domain-Driven Design (DDD) principles, subgraphs should represent **Bounded Contexts** with clear boundaries and independent databases.

### 1. Database-Per-Subgraph Pattern
*   **Rule**: A subgraph must never read or write directly to another subgraph's database. All cross-subgraph data access must go through the graph using entities or via async event-driven propagation.
*   **Rationale**: Direct database coupling bypasses the service API, breaks data encapsulation, and prevents independent schema schema migrations.

### 2. Entity Representation vs. Value Types
*   **Entities**: Types defined with `@key`. They represent business concepts with identity across multiple subgraphs (e.g., `User`, `Product`).
*   **Value Types**: Types without `@key`. They are copied across subgraphs if they represent immutable structures (e.g., `Money`, `GeoPoint`). They should be marked `@shareable` in Federation v2.

### 3. Asynchronous Entity Synchronization
*   While queries are resolved synchronously across subgraphs by the router, mutating actions should publish domain events to a message broker (e.g., Apache Kafka, RabbitMQ) to allow other subgraphs to update their cached representations or perform side-effects.

```
               [ User Created Mutation ]
                           │
                           ▼
                  [ Accounts Subgraph ]
                           │
                 (Publish Event to Kafka)
                           │
                           ▼
                 [ Kafka Event Bus ]
                  /               \
                 ▼                 ▼
        [ Orders Subgraph ]   [ Reviews Subgraph ]
         (Store User ID)       (Initialize User Profile)
```

---

## Apollo Federation v1 vs. Federation v2

Federation v2 simplifies subgraph schema design by making common directives implicit, improving type merging, and adding support for multi-graph capabilities.

| Directive / Feature | Federation v1 | Federation v2 |
|---------------------|---------------|---------------|
| **`@extends`** | Required on all entity extensions. | Implicit. Removed. Types are extended by simply redeclaring the type name with a `@key`. |
| **`@external`** | Required on all fields used in keys, requires, or provides. | Implicit for key fields. Still required for `@requires` and `@provides` dependencies. |
| **`@shareable`** | Not supported. Field definition conflicts caused composition errors. | Supported. Allows multiple subgraphs to define and resolve the same field. |
| **`@override`** | Not supported. | Supported. Allows migrating field resolution logic from one subgraph to another without downtime. |
| **`@interfaceObject`**| Not supported. Interfaces could not be extended as entities. | Supported. Allows an interface to be extended in other subgraphs as if it were a type. |

---

## Entity Relationship Modeling Patterns

Modeling relationships across separate subgraphs requires leveraging keys and external references carefully.

### 1. One-to-Many (Parent-Child) Relationship
To link a `User` (Accounts subgraph) to their `Orders` (Orders subgraph):

*   **Accounts Subgraph (Origin)**:
    ```graphql
    type User @key(fields: "id") {
      id: ID!
      name: String!
      email: String!
    }
    ```

*   **Orders Subgraph (Extension)**:
    ```graphql
    type User @key(fields: "id") {
      id: ID!
      orders: [Order!]!
    }

    type Order @key(fields: "id") {
      id: ID!
      total: Float!
    }
    ```

### 2. Many-to-Many Relationship
To model `Product` (Products subgraph) belonging to many `Category` objects:

*   **Products Subgraph**:
    ```graphql
    type Product @key(fields: "id") {
      id: ID!
      name: String!
      categoryIds: [ID!]! # Store IDs for joins
    }
    ```

*   **Categories Subgraph**:
    ```graphql
    type Category @key(fields: "id") {
      id: ID!
      title: String!
    }

    # Extend Product in Categories subgraph to fetch details
    type Product @key(fields: "id") {
      id: ID!
      categories: [Category!]!
    }
    ```

---

## Graph Composition Conflict Rules

When Rover composes subgraphs, it verifies structural consistency rules to ensure query execution correctness.

### 1. Type Mismatch Conflicts
*   **Error**: `TYPE_MISMATCH`
*   **Cause**: Subgraph A defines `type Address { zip: String! }` and Subgraph B defines `type Address { zip: Int! }`.
*   **Resolution**: Align scalar and object types across all schemas.

### 2. Shareability Conflicts
*   **Error**: `DUPLICATE_FIELD`
*   **Cause**: Multiple subgraphs define the same field on a type without marking it `@shareable`.
*   **Resolution**: Add `@shareable` to the field in all subgraphs, or move field resolution to a single owner.

### 3. Key Definition Mismatch
*   **Error**: `KEY_MISMATCH`
*   **Cause**: Subgraph A defines `@key(fields: "id")` on `User`, but Subgraph B extends `User` with `@key(fields: "email")`.
*   **Resolution**: The extending subgraph must use one of the key sets defined by the origin subgraph, or the origin subgraph must declare multiple `@key` options.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Apollo Federation v2 directives, supergraph schema compositions, query planning, and entity resolution patterns.
-->
