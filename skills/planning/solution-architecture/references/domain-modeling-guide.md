# Domain Modeling Guide for Solution Architects

## Overview

Strategic Domain-Driven Design (DDD) helps solution architects decompose complex business domains into manageable bounded contexts, align software boundaries with business capabilities, and establish a shared ubiquitous language. This guide covers event storming facilitation, aggregate design, domain event cataloging, and subdomain decomposition patterns.

## Strategic DDD Concepts

### Domain Types

| Type | Description | Example | Investment Level |
|------|-------------|---------|-----------------|
| Core Domain | Primary competitive advantage | Payment processing for fintech | Highest: custom build |
| Supporting Subdomain | Needed but not differentiating | User authentication | Medium: may buy or build |
| Generic Subdomain | Commodity capability, no competitive value | Email notifications | Lowest: buy or use SaaS |

### Identification Process

1. List all business capabilities
2. For each capability, ask: does this make customers choose us over competitors?
3. Yes -> Core domain. No, but still needed -> Supporting. No, solved problem -> Generic
4. Validate with business stakeholders quarterly

## Bounded Context Mapping

### Context Map Patterns

| Pattern | Description | Relationship | Example |
|---------|-------------|--------------|---------|
| Partnership | Two teams collaborate on coordinated evolution | Peer-to-peer | Payment and Fraud detection |
| Shared Kernel | Share a subset of domain model | Mutual dependencies | Customer and Account |
| Customer-Supplier | Upstream provides, downstream consumes | Directional | Orders to Inventory |
| Conformist | Downstream conforms to upstream model | Rigid | Integrates with legacy CRM |
| Anticorruption Layer | Translation layer between contexts | Protective | Wraps legacy ERP |
| Open-Host Service | Well-defined API for consumers | Protocol-based | Public REST API |
| Published Language | Shared language between contexts | Document | Industry standard data format |
| Separate Ways | No integration between contexts | Independent | Marketing and Payroll |
| Big Ball of Mud | Undifferentiated tangled model | Anti-pattern | Legacy monolith |

### Context Map Canvas

```yaml
bounded_contexts:
  - name: "Order Management"
    domain_type: core
    ubiquitous_language:
      - "Order"
      - "OrderLine"
      - "Cart"
      - "Checkout"
    events:
      - "OrderPlaced"
      - "OrderConfirmed"
      - "OrderShipped"
      - "OrderCancelled"
    relationships:
      - target: "Inventory"
        pattern: "customer-supplier"
        direction: "downstream"
      - target: "Payment"
        pattern: "partnership"
        direction: "peer"
      - target: "Legacy ERP"
        pattern: "anticorruption-layer"
        direction: "wraps"

  - name: "Inventory"
    domain_type: supporting
    ubiquitous_language:
      - "Product"
      - "Stock"
      - "Warehouse"
      - "Reservation"
    events:
      - "StockDepleted"
      - "StockReplenished"
      - "ReservationExpired"
    relationships:
      - target: "Order Management"
        pattern: "customer-supplier"
        direction: "upstream"

  - name: "Payment"
    domain_type: core
    ubiquitous_language:
      - "Transaction"
      - "PaymentMethod"
      - "Refund"
      - "Settlement"
    events:
      - "PaymentAuthorized"
      - "PaymentCaptured"
      - "PaymentFailed"
      - "RefundIssued"
    relationships:
      - target: "Order Management"
        pattern: "partnership"
        direction: "peer"
```

## Event Storming Facilitation

### Preparation

```
Before the workshop:
- Define scope and objective
- Recruit participants (domain experts, developers, architects)
- Prepare materials (virtual or physical board)
- Create event cards (orange), command cards (blue), actor cards (yellow)

Suggested participants:
- 1-2 Domain experts (product owners, business analysts)
- 2-3 Developers
- 1 Solution architect (facilitator)
- 1 UX designer (if UI interaction points are in scope)

Duration: 2-4 hours for focused scope, full day for system-wide
```

### Phase 1: Chaotic Exploration (30-60 min)

```
1. Write domain events on orange cards
   - Format: "[Entity] [Past-tense verb]"
   - Example: "Order Placed", "Payment Received"
   - One event per card, aim for 50-100 events

2. Place events chronologically on the timeline
   - Left to right, all participants contribute simultaneously

3. Identify hot spots
   - Unclear events = question marks
   - Debatable events = discussion points
   - Automation gaps = pain points

Facilitator role:
- Keep the timeline flowing
- Encourage quiet participants
- Prevent deep dives too early
```

### Phase 2: Command Identification (30-45 min)

```
1. Identify commands that trigger domain events
   - Format: "[Actor] [verb] [entity]"
   - Example: "Customer Places Order", "Admin Approves Refund"
   - Blue cards placed left of their resulting event

2. Identify actors who issue each command
   - Yellow cards above the command
   - Actors: Customer, Admin, System, Time

3. Mark commands that are currently manual for automation
```

### Phase 3: Aggregates and Bounded Contexts (30-45 min)

```
1. Group related events and commands into aggregates
   - Events that always happen together
   - Commands that affect the same entity
   - Draw aggregate boundaries with sticky notes

2. Group aggregates into bounded contexts
   - Aggregates sharing a ubiquitous language
   - Aggregates that change together
   - Draw context boundaries with thicker lines

3. Name each bounded context using business terminology
```

### Phase 4: Policy and Constraints (15-30 min)

```
1. Identify business policies
   - Format: "When [event], then [command]"
   - Purple cards connecting events to commands

2. Identify constraints
   - Business rules that must always be true
   - Example: order cannot exceed $10K without approval

3. Mark automation opportunities
```

### Phase 5: Prioritization (15 min)

```
1. Identify most valuable bounded contexts to implement first
2. Schedule follow-up deep dives for complex contexts
3. Assign context ownership to teams
4. Document the event storming output
```

## Aggregate Design

### Aggregate Rules

Rule 1: Protect invariants within aggregate boundaries
- All changes to the aggregate must satisfy business rules
- Example: order total must equal sum of line totals

Rule 2: Design small aggregates
- Start with one entity per aggregate
- Only add related entities if they share invariants
- Smaller aggregates = better performance, fewer conflicts

Rule 3: Reference other aggregates by identity only
- Use foreign keys (IDs), not object references
- Enables eventual consistency between aggregates

Rule 4: Update one aggregate per transaction
- Use domain events for eventual consistency across aggregates
- Accept temporary inconsistency across boundaries

### Aggregate Implementation

```python
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum
from datetime import datetime

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

@dataclass
class OrderLine:
    product_id: str
    product_name: str
    quantity: int
    unit_price: float

    @property
    def total(self) -> float:
        return self.quantity * self.unit_price

@dataclass
class Order:
    id: str
    customer_id: str
    lines: List[OrderLine] = field(default_factory=list)
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    _events: List[object] = field(default_factory=list, init=False)

    @property
    def total(self) -> float:
        return sum(line.total for line in self.lines)

    def add_line(self, product_id: str, name: str, qty: int, price: float) -> None:
        if self.status != OrderStatus.PENDING:
            raise ValueError("Cannot modify a non-pending order")
        existing = [l for l in self.lines if l.product_id == product_id]
        if existing:
            existing[0].quantity += qty
        else:
            self.lines.append(OrderLine(product_id, name, qty, price))
        self._validate_invariants()
        self.updated_at = datetime.utcnow()

    def confirm(self) -> None:
        if self.status != OrderStatus.PENDING:
            raise ValueError("Only pending orders can be confirmed")
        if not self.lines:
            raise ValueError("Cannot confirm an empty order")
        self.status = OrderStatus.CONFIRMED
        self.updated_at = datetime.utcnow()
        self._events.append(OrderConfirmed(self.id, self.customer_id, self.total))

    def ship(self) -> None:
        if self.status != OrderStatus.CONFIRMED:
            raise ValueError("Only confirmed orders can be shipped")
        self.status = OrderStatus.SHIPPED
        self.updated_at = datetime.utcnow()
        self._events.append(OrderShipped(self.id))

    def cancel(self, reason: str) -> None:
        if self.status in (OrderStatus.DELIVERED, OrderStatus.CANCELLED):
            raise ValueError("Cannot cancel delivered or cancelled order")
        self.status = OrderStatus.CANCELLED
        self.updated_at = datetime.utcnow()
        self._events.append(OrderCancelled(self.id, reason))

    def _validate_invariants(self) -> None:
        if any(line.quantity <= 0 for line in self.lines):
            raise ValueError("All order lines must have positive quantity")
        if self.total > 10000:
            raise ValueError("Order total requires manager approval")

    def collect_events(self) -> List[object]:
        events = list(self._events)
        self._events.clear()
        return events

@dataclass
class OrderConfirmed:
    order_id: str
    customer_id: str
    total: float

@dataclass
class OrderShipped:
    order_id: str

@dataclass
class OrderCancelled:
    order_id: str
    reason: str
```

## Domain Event Cataloging

### Event Schema Example

```yaml
domain_events:
  - name: "OrderPlaced"
    version: 1
    description: "Customer completes checkout and places an order"
    category: "order"
    produced_by: "Order Management"
    consumed_by:
      - "Inventory"
      - "Payment"
      - "Notification"
      - "Analytics"
    schema:
      type: object
      properties:
        order_id:
          type: string
          format: uuid
        customer_id:
          type: string
          format: uuid
        order_total:
          type: number
          format: float
        items:
          type: array
          items:
            type: object
            properties:
              product_id:
                type: string
              quantity:
                type: integer
              unit_price:
                type: number
        timestamp:
          type: string
          format: date-time

  - name: "StockDepleted"
    version: 1
    description: "Product stock reaches zero"
    category: "inventory"
    produced_by: "Inventory"
    consumed_by:
      - "Order Management"
      - "Procurement"
      - "Notification"
    schema:
      type: object
      properties:
        product_id:
          type: string
        warehouse_id:
          type: string
        previous_stock:
          type: integer
        timestamp:
          type: string
          format: date-time

  - name: "PaymentAuthorized"
    version: 1
    description: "Payment has been authorized by the payment gateway"
    category: "payment"
    produced_by: "Payment"
    consumed_by:
      - "Order Management"
      - "Notification"
      - "Fraud Detection"
    schema:
      type: object
      properties:
        transaction_id:
          type: string
        order_id:
          type: string
        amount:
          type: number
        payment_method:
          type: string
          enum: ["credit_card", "debit_card", "paypal"]
        authorization_code:
          type: string
        timestamp:
          type: string
          format: date-time
```

### Event Versioning Strategy

```yaml
versioning:
  strategy: "semantic"
  backward_compatible:
    - "Adding optional fields"
    - "Adding new enum values"
    - "Extending string max length"
  breaking_changes:
    - "Removing fields"
    - "Changing field types"
    - "Making optional fields required"
    - "Renaming fields"
  evolution:
    deprecated_fields: "kept for 2 versions"
    new_version: "create when breaking change is unavoidable"
```

## Subdomain Decomposition Patterns

### Decomposition Strategies

**Pattern 1: Decompose by Business Capability**
Map each bounded context to a business capability. Aligns with Conway's Law. Best for organizations with clear business capabilities.

**Pattern 2: Decompose by Subdomain Type**
Separate core, supporting, and generic subdomains. Apply different architectural approaches to each. Best for buy vs build decisions.

**Pattern 3: Decompose by Change Frequency**
Group components that change together. Separate components that change at different rates. Best for organizations with multiple release cadences.

**Pattern 4: Decompose by Data Ownership**
Each bounded context owns its data. No shared databases between contexts. Best for data-sensitive domains and compliance requirements.

**Pattern 5: Decompose by Team Structure**
One bounded context per team. Context boundaries align with team responsibilities. Best for scaling organizations.

### Decision Matrix

```yaml
decomposition_criteria:
  - name: "business_capability_alignment"
    weight: 0.25
    question: "Does this boundary align with a clear business capability?"
  - name: "team_autonomy"
    weight: 0.20
    question: "Can a single team own this context end-to-end?"
  - name: "data_encapsulation"
    weight: 0.20
    question: "Can this context own its data without sharing?"
  - name: "change_independence"
    weight: 0.15
    question: "Can this context be deployed and released independently?"
  - name: "domain_expertise"
    weight: 0.10
    question: "Is there a clear domain expert for this context?"
```

## Ubiquitous Language Glossary

### Glossary Template

```yaml
glossary:
  - term: "Order"
    definition: "A request by a customer to purchase one or more products"
    synonyms: ["purchase", "cart checkout"]
    context: "Order Management"
    example: "Customer placed order ORD-12345 for 2 widgets"

  - term: "Product"
    definition: "An item that can be purchased, identified by SKU"
    synonyms: ["item", "SKU"]
    context: "Inventory"
    example: "Product WID-001 is a blue widget priced at $49.99"

  - term: "Customer"
    definition: "A person or organization that purchases products"
    synonyms: ["buyer", "client"]
    context: "Customer Management"
    example: "Customer CUS-67890 is a premium-tier account"

  - term: "Payment"
    definition: "Transfer of funds from customer to merchant for an order"
    synonyms: ["transaction", "charge"]
    antonyms: ["refund", "chargeback"]
    context: "Payment"
    example: "Payment PAY-001 for order ORD-12345 was authorized"

  - term: "Shipment"
    definition: "Physical delivery of ordered products to customer address"
    synonyms: ["delivery", "fulfillment"]
    context: "Shipping"
    example: "Shipment SHP-001 contains order ORD-12345 items"
```

## Anti-Corruption Layer Pattern

### ACL Implementation

```python
# Anti-corruption layer between new system and legacy ERP
class LegacyErpAdapter:
    def __init__(self, legacy_client):
        self.client = legacy_client

    def submit_order(self, order):
        # Transform new domain model to legacy format
        legacy_payload = {
            "ORD_NUM": order.id,
            "CUST_CODE": order.customer_id,
            "ITEMS": [
                {
                    "ITEM_CODE": line.product_id,
                    "QTY": str(line.quantity),
                    "UNIT_PRC": str(line.unit_price),
                }
                for line in order.lines
            ],
        }
        raw_response = self.client.call("CREATE_ORDER", legacy_payload)
        return self._translate_response(raw_response)

    def _translate_response(self, raw):
        return {
            "legacy_order_id": raw.get("ORD_NUM"),
            "status": "submitted" if raw.get("STATUS") == "S" else "failed",
            "legacy_timestamp": raw.get("TIME_STAMP"),
        }


# Facade for cleaner integration
class InventoryService:
    def __init__(self):
        self.legacy = LegacyErpAdapter(LegacyErpClient())

    def reserve_stock(self, order_id: str, items: list) -> dict:
        order = {"id": order_id, "customer_id": "internal", "lines": items}
        return self.legacy.submit_order(order)
```

## Key Points

- Strategic DDD identifies three domain types: core (build custom), supporting (build pragmatically), generic (buy or use SaaS)
- Context mapping uses nine relationship patterns with clear directionality and coupling semantics
- Event storming is a five-phase workshop producing shared domain understanding and context boundaries
- Aggregates enforce invariants, reference by identity, and update one per transaction
- Domain events require versioned schemas with explicit backward compatibility rules
- Anti-corruption layers translate between bounded contexts, protecting domain integrity
- Ubiquitous language glossary ensures consistent terminology across all stakeholders
- Subdomain decomposition must balance business alignment, team autonomy, and change independence
