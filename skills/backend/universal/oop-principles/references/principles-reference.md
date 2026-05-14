# Principles Reference

## SOLID — Detailed Examples

### Single Responsibility Principle

**Violation**:
```java
class OrderService {
    void createOrder(OrderData data) {
        // validates order
        if (data.total < 0) throw new ValidationException();
        // saves to database
        db.insert(data);
        // sends email
        email.send(data.customerEmail, "Order created");
    }
}
```

**Fix**:
```java
class OrderValidator { void validate(OrderData data) { ... } }
class OrderRepository { void save(Order order) { ... } }
class EmailNotifier { void sendConfirmation(CustomerEmail email) { ... } }
class OrderService {
    // orchestrates, does not implement
    void createOrder(OrderData data) {
        validator.validate(data);
        var order = Order.create(data);
        repository.save(order);
        notifier.sendConfirmation(data.customerEmail);
    }
}
```

### Open-Closed Principle

**Violation**:
```python
def calculate_shipping(order, carrier):
    if carrier == "fedex":
        return order.weight * 1.5
    elif carrier == "ups":
        return order.weight * 1.3
    # adding DHL requires modifying this function
```

**Fix**:
```python
class ShippingStrategy(ABC):
    @abstractmethod
    def calculate(self, order: Order) -> float: ...

class FedExStrategy(ShippingStrategy):
    def calculate(self, order: Order) -> float:
        return order.weight * 1.5

class UPSStrategy(ShippingStrategy):
    def calculate(self, order: Order) -> float:
        return order.weight * 1.3

# New carrier = new class, no modification
class DHLStrategy(ShippingStrategy):
    def calculate(self, order: Order) -> float:
        return order.weight * 1.4
```

### Liskov Substitution Principle

**Violation** (classic Rectangle/Square):
```java
class Rectangle {
    protected int w, h;
    void setWidth(int w) { this.w = w; }
    void setHeight(int h) { this.h = h; }
    int area() { return w * h; }
}

class Square extends Rectangle {
    void setWidth(int w) { super.setWidth(w); super.setHeight(w); }
    void setHeight(int h) { super.setWidth(h); super.setHeight(h); }
}

// Client code expects Rectangle behavior:
Rectangle r = new Square();
r.setWidth(5);
r.setHeight(10);
assert r.area() == 50; // FAILS: returns 100
```

**Fix**: Do not inherit Square from Rectangle. Both can implement `Shape` interface with `area()`.

### Interface Segregation Principle

**Violation**:
```go
type Worker interface {
    Work()
    Eat()
}
type Robot struct{}
func (r Robot) Work() { /* works */ }
func (r Robot) Eat() { panic("robots don't eat") }  // LSP violation too
```

**Fix**:
```go
type Workable interface { Work() }
type Eatable interface { Eat() }
type Human struct{} // implements both
type Robot struct{} // implements Workable only
```

### Dependency Inversion Principle

**Violation**:
```csharp
class OrderController {
    private SqlOrderRepository _repo = new SqlOrderRepository(); // tight coupling
}
```

**Fix**:
```csharp
class OrderController {
    private readonly IOrderRepository _repo;
    public OrderController(IOrderRepository repo) { _repo = repo; } // abstraction injected
}
```

## GRASP — Expanded Examples

### Information Expert
- **Principle**: Assign responsibility to the class that has the information needed to fulfill it.
- **Example**: `Order` class should calculate its own total because it has the line items, NOT a separate `OrderCalculator`.

### Creator
- **Principle**: Class A should create class B if A aggregates/contains B, records B, or closely uses B.
- **Example**: `Order` creates `OrderItem` objects because Order contains them.

### Pure Fabrication
- **Principle**: When Information Expert violates SRP, create a fabricated class.
- **Example**: `Order` should not be responsible for saving itself to DB. Create `OrderRepository` (pure fabrication) to handle persistence.

### Protected Variations
- **Principle**: Wrap unstable elements behind stable interfaces.
- **Example**: Wrap third-party payment gateway behind `IPaymentGateway` interface. If provider changes, only the implementation changes.

## DRY/AHA Decision Table

| Scenario | Apply |
|---|---|
| Code duplicated once (2 locations) | Leave it (AHA: avoid hasty abstraction) |
| Code duplicated 3+ locations | Extract into shared function/class |
| Code looks similar but in different bounded contexts | Keep separate (accidental similarity) |
| Configuration values repeated | Extract to config file |
| Business rules duplicated across services | Extract to shared library or service |

## KISS/YAGNI Checklist

Before adding ANY code, ask:
- [ ] Does a user story require this right now?
- [ ] Is this the simplest possible implementation?
- [ ] Can I ship this feature without this abstraction?
- [ ] Would removing this code break any requirement?

If YES to 1 and NO to 2-4, you are violating KISS/YAGNI.

## Coupling & Cohesion Metrics

### Measuring Coupling
- **Afferent Coupling (Ca)**: number of classes outside this package that depend on classes inside.
- **Efferent Coupling (Ce)**: number of classes inside this package that depend on classes outside.
- **Instability I = Ce / (Ca + Ce)**: 1 = highly unstable, 0 = highly stable.

### Measuring Cohesion
- **LCOM (Lack of Cohesion of Methods)**: Count method pairs that share no fields. Lower = better cohesion.
- Target: LCOM ≤ 3 per class.

### Heuristics
- If a class has >6 public methods operating on unrelated data → split
- If changing class A requires changing class B, C, D → coupling too high
- If test setup requires mocking 5+ interfaces → coupling too high
