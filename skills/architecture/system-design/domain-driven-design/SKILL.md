---
name: architecture-domain-driven-design
description: >
  Use this skill when the user says 'DDD', 'domain-driven design', 'bounded context', 'aggregate', 'aggregate root', 'ubiquitous language', 'context map', 'anti-corruption layer', 'event storming', 'value object'. Applies strategic DDD (subdomains, bounded contexts, context maps) and tactical DDD (aggregates, entities, value objects, domain events, repositories) to model complex business logic. Do NOT use for: simple CRUD apps where DDD adds ceremony, service decomposition mechanics (architecture/system-design/microservices-patterns), or layering/folder structure only (backend/universal/clean-architecture).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [architecture, ddd, bounded-context, aggregates, domain-events, modeling]
---

# Domain-Driven Design

## Purpose
DDD aligns software structure with the business: a shared language inside explicit boundaries, models that enforce business invariants, and deliberate translation where contexts meet. Use it where domain complexity is the main risk (pricing, underwriting, logistics, billing). For simple CRUD, plain layered code is cheaper.

## Agent Protocol

### Trigger
"DDD", "bounded context", "aggregate", "aggregate root", "entity vs value object", "domain event", "context map", "anti-corruption layer", "ubiquitous language", "event storming".

### Input Context
- Business capabilities and processes; domain experts' vocabulary.
- Current pain: tangled models, inconsistent rules, overloaded terms.
- Team structure (contexts usually map to team ownership).
- Persistence and integration constraints.

### Output Artifact
Strategic map (subdomains, contexts, relationships) and/or tactical model (aggregates with invariants, value objects, events, repository interfaces).

### Response Format
```
Subdomains: {core|supporting|generic}: {name}
Contexts: {name} owns {terms}; team {x}
Context map: {upstream} -> {downstream} [{pattern}]
Aggregate: {Root} invariants: {list}; references others by id
Events: {PastTenseName}(fields)
```

### Completion Criteria
- [ ] Each term defined per context (no global "User"/"Product" model).
- [ ] Every aggregate lists the invariants it protects.
- [ ] One aggregate modified per transaction; others updated via events.
- [ ] Context relationships named with a context-map pattern.

## Strategic Design

**Subdomains**: core (competitive advantage: invest, custom build), supporting (needed, specific: build simply), generic (commodity: buy/SaaS, e.g. auth, payments).

**Bounded context**: a boundary within which a model and its language are consistent. "Product" in Catalog (description, images), Inventory (SKU, quantity, location), and Pricing (price lists, discounts) are different models that share an identifier.

**Context map patterns**
| Pattern | Relationship |
|---|---|
| Partnership | Two teams coordinate releases jointly |
| Shared Kernel | Small shared model owned by both (keep tiny) |
| Customer/Supplier | Downstream needs influence upstream's roadmap |
| Conformist | Downstream adopts upstream model as-is |
| Anti-Corruption Layer (ACL) | Downstream translates upstream model into its own terms |
| Open Host Service + Published Language | Upstream offers a stable, documented API/schema for many consumers |
| Separate Ways | No integration; duplicate where cheaper |

**Event Storming** (Brandolini): domain experts and engineers place domain events (orange) on a timeline, then commands, actors, policies, and aggregates; clusters suggest context boundaries.

## Tactical Design
| Building block | Identity | Mutability | Example |
|---|---|---|---|
| Entity | Has id; equality by id | Mutable via methods | `Order` |
| Value object | No id; equality by value | Immutable | `Money`, `Address`, `DateRange` |
| Aggregate | Cluster with one root; consistency boundary | Changed only through root | `Order` + `OrderLine` |
| Domain event | Immutable fact | Immutable | `OrderPlaced` |
| Repository | Loads/saves whole aggregates | n/a | `OrderRepository` |
| Domain service | Logic not belonging to one entity | Stateless | `PricingService` |

### Aggregate rules (Vernon)
1. Protect true invariants inside the boundary.
2. Design small aggregates.
3. Reference other aggregates by identity only.
4. Use eventual consistency (domain events) outside the boundary; modify one aggregate per transaction.

## Example (TypeScript)

```typescript
export class Money {
  private constructor(readonly cents: number, readonly currency: string) {}
  static of(cents: number, currency: string): Money {
    if (!Number.isInteger(cents) || cents < 0) throw new RangeError(`invalid amount: ${cents}`);
    return new Money(cents, currency);
  }
  add(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new Error(`currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(this.cents + other.cents, this.currency);
  }
}

type OrderStatus = "draft" | "placed" | "cancelled";
export type OrderEvent =
  | { type: "OrderPlaced"; orderId: string; customerId: string; totalCents: number; at: Date };

interface OrderLine { readonly sku: string; readonly qty: number; readonly unitPrice: Money }

export class Order {
  private lines: OrderLine[] = [];
  private status: OrderStatus = "draft";
  private pending: OrderEvent[] = [];

  constructor(readonly id: string, readonly customerId: string, private readonly currency: string) {}

  addLine(sku: string, qty: number, unitPrice: Money): void {
    if (this.status !== "draft") throw new Error(`order ${this.id} is ${this.status}; cannot add lines`);
    if (qty <= 0) throw new RangeError(`qty must be positive, got ${qty}`);
    if (unitPrice.currency !== this.currency) throw new Error("line currency differs from order");
    if (this.lines.length >= 100) throw new Error("max 100 lines per order");   // invariant
    this.lines.push({ sku, qty, unitPrice });
  }

  total(): Money {
    return this.lines.reduce((sum, l) => sum.add(Money.of(l.unitPrice.cents * l.qty, this.currency)),
                             Money.of(0, this.currency));
  }

  place(now: Date): void {
    if (this.status !== "draft") throw new Error(`order ${this.id} already ${this.status}`);
    if (this.lines.length === 0) throw new Error("cannot place an empty order");
    this.status = "placed";
    this.pending.push({ type: "OrderPlaced", orderId: this.id, customerId: this.customerId,
                        totalCents: this.total().cents, at: now });
  }

  pullEvents(): OrderEvent[] {
    const events = this.pending;
    this.pending = [];
    return events;
  }
}

export interface OrderRepository {
  get(id: string): Promise<Order>;
  save(order: Order): Promise<void>;   // persists state + pulled events (outbox) in one transaction
}
```

Application service: load aggregate → call one method → save (state + events via outbox) in one transaction. Other contexts (Inventory, Billing) react to `OrderPlaced` asynchronously, translating through their own ACL.

## Anti-Corruption Layer
```typescript
// Shipping context translating a legacy ERP customer into its own model
export function toRecipient(erp: { CUST_NM: string; ADDR1: string; CNTRY_CD: string }): Recipient {
  if (!erp.ADDR1) throw new Error(`ERP customer ${erp.CUST_NM} has no address`);
  return { name: erp.CUST_NM.trim(), street: erp.ADDR1.trim(), country: mapCountry(erp.CNTRY_CD) };
}
```
The ACL keeps upstream naming, quirks, and changes from leaking into the downstream model.

## Anti-Patterns
- **Anemic domain model**: entities as property bags, rules spread through services.
- **Giant aggregates** (Customer containing all orders): lock contention and slow loads.
- **One enterprise-wide model** for core concepts.
- **Repositories per table** instead of per aggregate.
- **DDD ceremony on CRUD** subdomains.
- Bounded contexts that ignore team boundaries (Conway's law will win).

## Checklist
- [ ] Subdomains classified; investment matches type.
- [ ] Bounded contexts with glossary and owning team.
- [ ] Context map with explicit patterns; ACL where upstream model is foreign.
- [ ] Aggregates small, invariants listed and enforced in methods.
- [ ] Value objects immutable with validation.
- [ ] Domain events published via outbox; consumers idempotent.
- [ ] Unit tests on aggregates without infrastructure.

## References
- Evans, "Domain-Driven Design" (2003); Vernon, "Implementing Domain-Driven Design" (2013) and "Effective Aggregate Design" essays.
- Brandolini, "Introducing EventStorming"; Khononov, "Learning Domain-Driven Design" (2021).
