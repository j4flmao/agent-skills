# Enterprise & Architectural Patterns

> Practical reference for backend systems. Examples in C# and TypeScript.

---

## Persistence & Domain Patterns

---

## Repository

**Intent:** Mediates between domain and data mapping layers, acting like an in-memory domain object collection.

**Applicability:** When you need to decouple domain logic from persistence details; when you want to centralise data access.

**Code (C#):**
```csharp
public interface IOrderRepository
{
    Order? GetById(Guid id);
    void Add(Order order);
    void Remove(Order order);
}

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;
    public OrderRepository(AppDbContext db) => _db = db;

    public Order? GetById(Guid id) =>
        _db.Orders.Include(o => o.Items).FirstOrDefault(o => o.Id == id);
    public void Add(Order order) => _db.Orders.Add(order);
    public void Remove(Order order) => _db.Orders.Remove(order);
}
```

**Code (TypeScript):**
```typescript
export interface IOrderRepository {
  getById(id: string): Promise<Order | null>;
  add(order: Order): Promise<void>;
  remove(order: Order): Promise<void>;
}

export class OrderRepository implements IOrderRepository {
  constructor(private db: AppDbContext) {}
  async getById(id: string) {
    return this.db.orders.findUnique({ where: { id }, include: { items: true } });
  }
  async add(order: Order) { await this.db.orders.create({ data: order }); }
  async remove(order: Order) { await this.db.orders.delete({ where: { id: order.id } }); }
}
```

**Trade-offs:**
- Pro: Isolates domain from persistence; testable with mocks
- Con: Can become a "god" class; query details leak into consumers

**Relations:** Works with Unit of Work, Specification, Data Mapper.

---

## Unit of Work

**Intent:** Maintains a list of objects affected by a business transaction and coordinates writing changes.

**Applicability:** When multiple repositories need atomic commits; when change tracking across aggregates is needed.

**Code (C#):**
```csharp
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _db;

    public UnitOfWork(AppDbContext db) => _db = db;
    public IOrderRepository Orders => new OrderRepository(_db);
    public async Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        await _db.SaveChangesAsync(ct);
}

// Usage:
public class PlaceOrderHandler
{
    private readonly IUnitOfWork _uow;
    public async Task Handle(PlaceOrderCommand cmd)
    {
        var order = new Order(cmd.CustomerId);
        order.AddItem(cmd.ProductId, cmd.Quantity);
        _uow.Orders.Add(order);
        await _uow.SaveChangesAsync();
    }
}
```

**Code (TypeScript):**
```typescript
export class UnitOfWork {
  constructor(
    public readonly db: AppDbContext,
    public readonly orders: OrderRepository,
  ) {}
  async saveChanges(): Promise<void> {
    await this.db.$transaction(async (tx) => { /* atomic commit */ });
  }
}
```

**Trade-offs:**
- Pro: Atomic commits; clean transaction boundary
- Con: Long-lived UoW causes memory pressure; concurrency conflicts need explicit handling
- Note: EF Core's DbContext is a built-in Unit of Work + Identity Map

**Relations:** Works with Repository, Aggregate, Domain Event.

---

## Data Mapper

**Intent:** Transfers data between objects and database while keeping them independent.

**Applicability:** When domain objects must have no persistence awareness (no ORM annotations); when mapping rules are complex.

**Code (C#):**
```csharp
public class OrderMapper
{
    public OrderEntity ToEntity(Order domain) => new()
    {
        Id = domain.Id, CustomerId = domain.CustomerId,
        Status = domain.Status.ToString(),
        Items = domain.Items.Select(i => new OrderItemEntity
            { ProductId = i.ProductId, Quantity = i.Quantity, UnitPrice = i.UnitPrice }).ToList()
    };

    public Order ToDomain(OrderEntity entity)
    {
        var order = new Order(entity.CustomerId);
        typeof(Order).GetProperty(nameof(Order.Id))!.SetValue(order, entity.Id);
        foreach (var item in entity.Items)
            order.AddItem(item.ProductId, item.Quantity, item.UnitPrice);
        return order;
    }
}
```

**Trade-offs:**
- Pro: Domain is pure — no ORM coupling
- Con: Boilerplate-heavy; must be maintained alongside schema changes

**Relations:** Works with Repository, Identity Map. Contrast: Active Record.

---

## Identity Map

**Intent:** Ensures each object is loaded only once per transaction by caching loaded objects.

**Applicability:** When the same database row may be requested multiple times; when object graph consistency matters.

**Code (C#):**
```csharp
public class IdentityMap<T> where T : class, IAggregateRoot
{
    private readonly Dictionary<Guid, T> _map = new();
    private readonly Func<Guid, T?> _loader;

    public IdentityMap(Func<Guid, T?> loader) => _loader = loader;

    public T? GetById(Guid id)
    {
        if (_map.TryGetValue(id, out var cached)) return cached;
        var loaded = _loader(id);
        if (loaded != null) _map[id] = loaded;
        return loaded;
    }

    public void Add(T entity) => _map[entity.Id] = entity;
}
```

**Trade-offs:**
- Pro: Prevents stale in-memory duplicates; improves read performance
- Con: Memory overhead; stale data if not invalidated

**Relations:** Built into EF Core DbContext and NHibernate ISession.

---

## Lazy Load

**Intent:** Defers object loading until the moment it is accessed.

**Applicability:** When relationships are expensive to load upfront; when avoiding cartesian products.

**Code (C#):**
```csharp
public class Customer
{
    private readonly Lazy<List<Order>> _orders;

    public Customer(Func<List<Order>> orderFactory) =>
        _orders = new Lazy<List<Order>>(orderFactory);

    public IReadOnlyList<Order> Orders => _orders.Value.AsReadOnly();
}
```

**Trade-offs:**
- Pro: Avoids unnecessary DB queries
- Con: N+1 query problem; session/context must remain open during access

**Relations:** Works with Proxy pattern. Alternative: explicit loading via Repository method.

---

## Specification

**Intent:** Encapsulates business rules into queryable, composable objects.

**Applicability:** When business rules for filtering should be reusable across domain & persistence; when combining criteria flexibly.

**Code (C#):**
```csharp
public abstract class Specification<T>
{
    public abstract Expression<Func<T, bool>> ToExpression();
    public bool IsSatisfiedBy(T entity) => ToExpression().Compile()(entity);

    public static Specification<T> operator &(Specification<T> a, Specification<T> b) =>
        new AndSpecification<T>(a, b);
}

public class ActiveOrdersSpec : Specification<Order>
{
    public override Expression<Func<Order, bool>> ToExpression() =>
        o => o.Status == OrderStatus.Active && o.Total > 0;
}

// Repository integration:
public class OrderRepository
{
    public async Task<List<Order>> FindAsync(Specification<Order> spec) =>
        await _db.Orders.Where(spec.ToExpression()).ToListAsync();
}
```

**Trade-offs:**
- Pro: Highly composable; keeps query logic out of repositories
- Con: Can't always translate to efficient SQL; needs expression tree support

**Relations:** Works with Repository, CQRS (read-side specs). Supported by EF Core.

---

## Aggregate (DDD)

**Intent:** Cluster of domain objects treated as a single unit with a consistency boundary.

**Applicability:** When transactional consistency boundaries are needed; when enforcing business invariants across entities.

**Code (C#):**
```csharp
public class Order : IAggregateRoot
{
    public Guid Id { get; private set; }
    private readonly List<OrderItem> _items = new();
    public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();
    public OrderStatus Status { get; private set; }

    public Order(Guid customerId)
    {
        Id = Guid.NewGuid(); CustomerId = customerId; Status = OrderStatus.Draft;
    }

    public void AddItem(Guid productId, int quantity, decimal unitPrice)
    {
        if (Status != OrderStatus.Draft)
            throw new DomainException("Can only modify draft orders.");
        _items.Add(new OrderItem(productId, quantity, unitPrice));
    }

    public void Submit()
    {
        if (_items.Count == 0) throw new DomainException("Cannot submit empty order.");
        Status = OrderStatus.Submitted;
        AddDomainEvent(new OrderSubmittedEvent(Id));
    }
}
```

**Trade-offs:**
- Pro: Clear consistency boundaries; root is the only entry point
- Con: Wrong size is costly — too large (performance) or too small (consistency issues)
- Con: Not suitable for reporting — use separate read models

**Relations:** Works with Repository (one per aggregate), Domain Event, Unit of Work.

---

## Value Object (DDD)

**Intent:** Immutable object defined solely by attributes, without identity.

**Applicability:** When equality is based on field values; when encapsulating primitive groupings with behaviour.

**Code (C#):**
```csharp
public sealed record Money(decimal Amount, string Currency)
{
    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency) throw new DomainException("Currency mismatch.");
        return new Money(a.Amount + b.Amount, a.Currency);
    }
}

public sealed record Address(string Street, string City, string ZipCode);
```

**Trade-offs:**
- Pro: Eliminates primitive obsession; type-safe, reusable
- Con: Serialisation overhead; requires infrastructure mapping (EF Core owned types)

**Relations:** Works with Aggregate, DTO. C# record types give value equality out of the box.

---

## Domain Event

**Intent:** Captures something important that happened in the domain.

**Applicability:** When side effects should be decoupled from the triggering operation; when notifying other aggregates.

**Code (C#):**
```csharp
public abstract record DomainEvent(Guid AggregateId, DateTime OccurredAt);
public sealed record OrderSubmittedEvent(Guid OrderId)
    : DomainEvent(OrderId, DateTime.UtcNow);

// Aggregate base:
public abstract class AggregateRoot
{
    private readonly List<DomainEvent> _events = new();
    public IReadOnlyList<DomainEvent> Events => _events.AsReadOnly();
    protected void AddDomainEvent(DomainEvent e) => _events.Add(e);
    public void ClearEvents() => _events.Clear();
}

// Handler:
public class OrderSubmittedHandler : INotificationHandler<OrderSubmittedEvent>
{
    private readonly IPaymentService _payment;
    public async Task Handle(OrderSubmittedEvent e, CancellationToken ct) =>
        await _payment.AuthorizeAsync(e.OrderId);
}

// Dispatch on save:
public async Task<int> SaveChangesAsync()
{
    var events = GetTrackedAggregates().SelectMany(a => a.Events).ToList();
    var result = await _db.SaveChangesAsync();
    foreach (var e in events) await _mediator.Publish(e);
    return result;
}
```

**Trade-offs:**
- Pro: Decouples side effects; enables eventual consistency
- Con: In-process only — cross-service needs integration events + broker
- Con: Debugging harder; event ordering matters

**Relations:** Works with Aggregate, Event Sourcing, Mediator (MediatR).

---

## Application & Architectural Patterns

---

## Layered Architecture

**Intent:** Organise code into horizontal layers (presentation → application → domain → infrastructure).

**Applicability:** Traditional enterprise monoliths; clear separation of concerns; team aligns with technical layers.

**Code (C#):**
```csharp
// Application Layer
public class PlaceOrderUseCase
{
    private readonly IOrderRepository _repo;
    private readonly IUnitOfWork _uow;

    public async Task<OrderDto> Execute(PlaceOrderRequest request)
    {
        var order = new Order(request.CustomerId);
        foreach (var item in request.Items) order.AddItem(item.ProductId, item.Quantity, item.Price);
        _repo.Add(order);
        await _uow.SaveChangesAsync();
        return new OrderDto(order.Id, order.Total, order.Status.ToString());
    }
}

// Presentation Layer
[ApiController]
public class OrdersController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<OrderDto>> PlaceOrder(
        [FromBody] PlaceOrderRequest request,
        [FromServices] PlaceOrderUseCase useCase) => Ok(await useCase.Execute(request));
}
```

**Trade-offs:**
- Pro: Familiar; strict dependency direction
- Pro: Easy onboarding for new developers
- Con: Can degrade into "lasagna" — rigid, hard to cross-cut
- Con: Infrastructure layer at bottom still leaks (ORM references everywhere)
- Con: Leads to anemic domain if all logic lives in service layer

**Relations:** Works with DTO, Service Layer. Evolves into Onion / Clean Architecture.

---

## Hexagonal Architecture (Ports & Adapters)

**Intent:** Core business logic is completely isolated from external concerns. All I/O goes through ports (interfaces) and adapters (implementations).

**Applicability:** When core domain must be testable without infrastructure; when swapping adapters is expected.

**Code (C#):**
```csharp
// Domain / Core — no external dependencies (Ports)
public interface IOrderRepository        // Port Out
{
    Task<Order?> GetByIdAsync(Guid id);
    Task SaveAsync(Order order);
}

public interface IPlaceOrderUseCase       // Port In
{
    Task<OrderDto> ExecuteAsync(PlaceOrderRequest request);
}

// Core implementation
public class PlaceOrderService : IPlaceOrderUseCase
{
    private readonly IOrderRepository _orders;
    private readonly IPaymentGateway _payments;

    public async Task<OrderDto> ExecuteAsync(PlaceOrderRequest request)
    {
        var order = Order.Create(request.CustomerId);
        foreach (var i in request.Items) order.AddItem(i.ProductId, i.Quantity);
        var payment = await _payments.Charge(order.Total);
        order.RecordPayment(payment.TransactionId);
        await _orders.SaveAsync(order);
        return OrderDto.From(order);
    }
}

// Infrastructure — Adapters
public class OrderRepositoryAdapter : IOrderRepository
{
    private readonly AppDbContext _db;
    public async Task SaveAsync(Order order) { /* mapping + save */ }
}

// Composition Root
services.AddScoped<IPlaceOrderUseCase, PlaceOrderService>();
services.AddScoped<IOrderRepository, OrderRepositoryAdapter>();
```

**Trade-offs:**
- Pro: Core is pure domain; adapters swappable; easy unit testing
- Con: More interfaces and indirection; overkill for simple CRUD
- Con: Strict discipline required — no infrastructure imports in core project

**Relations:** Works with Clean Architecture, DI. Also called Ports & Adapters (Alistair Cockburn).

---

## Onion Architecture

**Intent:** Place domain model at the centre with concentric rings pointing dependencies inward.

**Applicability:** Same as Hexagonal — preference for explicit ring-bound project references; strong dependency direction enforcement.

**Code (C#):**
```csharp
// Domain Model (innermost) — zero dependencies
public class Product
{
    public Guid Id { get; }
    public string Name { get; private set; }
    public Money Price { get; private set; }
    public void UpdatePrice(Money newPrice) => Price = newPrice;
}

// Domain Service ring
public interface IProductRepository { /* ... */ }
public class PricingService
{
    public Money CalculateDiscount(Product product, Customer customer) =>
        customer.IsPremium
            ? product.Price with { Amount = product.Price.Amount * 0.9m }
            : product.Price;
}

// Application Service ring
public class UpdateProductPriceHandler
{
    private readonly IProductRepository _repo;
    private readonly IUnitOfWork _uow;

    public async Task Handle(UpdatePriceCommand cmd)
    {
        var product = await _repo.GetById(cmd.ProductId);
        product.UpdatePrice(new Money(cmd.NewPrice, cmd.Currency));
        await _uow.SaveChangesAsync();
    }
}
```

**Trade-offs:**
- Pro: Strong dependency rule (inner rings know nothing of outer)
- Con: Can lead to many thin wrappers; cross-cutting concerns need creative placement

**Relations:** Works with Clean Architecture, CQRS. Closely related to Hexagonal.

---

## Clean Architecture

**Intent:** Dependency inversion with use cases at the centre; frameworks are plugins.

**Applicability:** When building systems where frameworks change frequently; when testability and framework independence are critical.

**Code (TypeScript):**
```typescript
// Enterprise Entities
export class Order {
  constructor(
    public readonly id: string, public readonly customerId: string,
    public status: OrderStatus, public items: OrderItem[],
  ) {}
  submit(): void {
    if (this.items.length === 0) throw new Error("Empty order");
    this.status = OrderStatus.Submitted;
  }
}

// Use Case / Interactor
export interface OrderRepository {
  save(order: Order): Promise<void>;
  getById(id: string): Promise<Order | null>;
}
export interface PaymentGateway {
  charge(amount: number): Promise<string>;
}

export class SubmitOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
  ) {}

  async execute(request: SubmitOrderRequest): Promise<SubmitOrderResponse> {
    const order = await this.orders.getById(request.orderId);
    if (!order) throw new NotFoundError("Order not found");
    order.submit();
    const txId = await this.payments.charge(order.items.reduce((s, i) => s + i.price * i.qty, 0));
    await this.orders.save(order);
    return { orderId: order.id, transactionId: txId, status: order.status };
  }
}

// Interface Adapters (Controller)
export class OrderController {
  constructor(private readonly useCase: SubmitOrderUseCase) {}
  async submit(req: Request, res: Response): Promise<void> {
    const result = await this.useCase.execute(req.body);
    res.status(200).json(result);
  }
}
```

**Trade-offs:**
- Pro: Ultimate testability; frameworks are truly swappable
- Con: Lots of indirection; small changes ripple across layers
- Con: Overkill for CRUD apps; really shines in complex domains

**Relations:** Works with CQRS, DDD, Hexagonal. Robert C. Martin's "Clean Architecture".

---

## CQRS (Command Query Responsibility Segregation)

**Intent:** Separate command (write) from query (read) models — different shapes, potentially different stores.

**Applicability:** When read and write workloads have different shapes and scales; when domain complexity needs a rich command model.

**Code (C#):**
```csharp
// Command Side — uses domain model
public record PlaceOrderCommand(Guid CustomerId, List<OrderItemDto> Items) : IRequest<Guid>;

public class PlaceOrderHandler : IRequestHandler<PlaceOrderCommand, Guid>
{
    private readonly IOrderRepository _repo;
    private readonly IUnitOfWork _uow;

    public async Task<Guid> Handle(PlaceOrderCommand cmd, CancellationToken ct)
    {
        var order = new Order(cmd.CustomerId);
        foreach (var item in cmd.Items) order.AddItem(item.ProductId, item.Quantity, item.UnitPrice);
        _repo.Add(order);
        await _uow.SaveChangesAsync(ct);
        return order.Id;
    }
}

// Query Side — flat, denormalised, no domain logic
public record GetOrderSummaryQuery(Guid OrderId) : IRequest<OrderSummaryDto>;

public class GetOrderSummaryHandler : IRequestHandler<GetOrderSummaryQuery, OrderSummaryDto>
{
    private readonly IOrderReadRepository _reads; // separate, optimised store

    public async Task<OrderSummaryDto> Handle(GetOrderSummaryQuery q, CancellationToken ct) =>
        await _reads.GetOrderSummaryAsync(q.OrderId);
}

// Controller routes them to the correct side:
[ApiController]
public class OrdersController : ControllerBase
{
    [HttpPost] public async Task<Guid> Create(PlaceOrderCommand cmd) => await _mediator.Send(cmd);
    [HttpGet("{id}")] public async Task<OrderSummaryDto> Get(Guid id) =>
        await _mediator.Send(new GetOrderSummaryQuery(id));
}
```

**Trade-offs:**
- Pro: Optimised read/write models; scales read independently; command model stays pure
- Pro: Each side can use its own data store (Elasticsearch for reads, Postgres for writes)
- Con: Eventual consistency (read model may lag behind)
- Con: More code to maintain; not recommended for simple CRUD-only apps

**Relations:** Works with Event Sourcing, Mediator (MediatR), Repository.

---

## Event Sourcing

**Intent:** Store state changes as an append-only event sequence; current state is derived by replaying them.

**Applicability:** When full audit trail and temporal queries are required; for complex state machines.

**Code (C#):**
```csharp
// Events (immutable facts)
public sealed record OrderCreated(Guid OrderId, Guid CustomerId, DateTime OccurredAt);
public sealed record OrderItemAdded(Guid OrderId, Guid ProductId, int Quantity, decimal Price);
public sealed record OrderSubmitted(Guid OrderId, DateTime OccurredAt);

// Aggregate replay
public class Order
{
    public Guid Id { get; private set; }
    public OrderStatus Status { get; private set; }

    private Order() { }

    public static (Order, List<object>) Create(Guid customerId)
    {
        var ev = new OrderCreated(Guid.NewGuid(), customerId, DateTime.UtcNow);
        var order = new Order(); order.Apply(ev);
        return (order, new List<object> { ev });
    }

    public object[] AddItem(Guid productId, int qty, decimal price)
    {
        var ev = new OrderItemAdded(Id, productId, qty, price);
        Apply(ev); return new object[] { ev };
    }

    public void Apply(object @event)
    {
        switch (@event)
        {
            case OrderCreated e: Id = e.OrderId; Status = OrderStatus.Draft; break;
            case OrderSubmitted e: Status = OrderStatus.Submitted; break;
        }
    }

    public static Order LoadFromHistory(IEnumerable<object> history)
    {
        var order = new Order();
        foreach (var e in history) order.Apply(e);
        return order;
    }
}

// Event Store
public class EventStore
{
    private readonly AppDbContext _db;

    public async Task AppendAsync(Guid aggregateId, IEnumerable<object> events)
    {
        foreach (var e in events)
            _db.Events.Add(new EventEntity
            {
                AggregateId = aggregateId,
                Data = JsonSerializer.Serialize(e),
                Type = e.GetType().Name,
                Timestamp = DateTime.UtcNow
            });
        await _db.SaveChangesAsync();
    }

    public async Task<List<object>> GetEventsAsync(Guid aggregateId)
    {
        var entities = await _db.Events.Where(e => e.AggregateId == aggregateId)
            .OrderBy(e => e.Timestamp).ToListAsync();
        return entities.Select(e => JsonSerializer.Deserialize<object>(e.Data)).ToList();
    }
}
```

**Trade-offs:**
- Pro: Complete audit trail; temporal queries; event replay for debugging or rebuilding read models
- Con: Event schema evolution is hard; read models need rebuilding after schema changes
- Con: Steep learning curve; not suitable for simple CRUD

**Relations:** Works with CQRS, Projections. Tools: EventStoreDB, Marten, PostgreSQL.

---

## Saga

**Intent:** Manage a distributed transaction across multiple services with compensating actions.

**Applicability:** When a business process spans multiple services/databases; when eventual consistency with failure recovery is acceptable.

**Code (C#) — Orchestration Saga:**
```csharp
public class OrderFulfillmentSaga
{
    private readonly IOrderService _orders;
    private readonly IPaymentService _payments;
    private readonly IInventoryService _inventory;
    private readonly ISagaLog _log;

    public async Task ExecuteAsync(PlaceOrderRequest request)
    {
        var orderId = await _orders.CreateOrder(request);
        await _log.Append(orderId, "OrderCreated");
        try
        {
            await _payments.Charge(request.Total);       await _log.Append(orderId, "PaymentCharged");
            await _inventory.Reserve(request.Items);      await _log.Append(orderId, "InventoryReserved");
            await _orders.Confirm(orderId);
        }
        catch
        {
            if (await _log.HasStep(orderId, "InventoryReserved")) await _inventory.Release(request.Items);
            if (await _log.HasStep(orderId, "PaymentCharged"))    await _payments.Refund(request.Total);
            if (await _log.HasStep(orderId, "OrderCreated"))      await _orders.Cancel(orderId);
            throw;
        }
    }
}
```

**Code (TypeScript) — Choreography Saga:**
```typescript
class OrderService {
  @Subscribe("PaymentFailed")
  async handlePaymentFailed(event: PaymentFailedEvent) {
    await this.orders.cancel(event.orderId);
    await this.eventBus.publish(new OrderCancelled(event.orderId));
  }
}

class InventoryService {
  @Subscribe("OrderCreated")
  async handleOrderCreated(event: OrderCreatedEvent) {
    try {
      await this.inventory.reserve(event.items);
      await this.eventBus.publish(new InventoryReserved(event.orderId));
    } catch {
      await this.eventBus.publish(new InventoryReservationFailed(event.orderId));
    }
  }
}
```

**Trade-offs:**
| Dimension | Choreography | Orchestration |
|---|---|---|
| Coupling | Loose (events only) | Tighter (coupled to orchestrator) |
| Traceability | Hard (logic scattered) | Easy (central state machine) |
| Single point of failure | No | Yes (orchestrator) |
| Best for | Simple linear flows | Complex branching workflows |

- Pro: Avoids distributed transactions (2PC); services stay autonomous
- Con: Eventually consistent — interim states visible to other services
- Con: Choreography — harder to trace and debug

**Relations:** Works with CQRS, Event Sourcing, Outbox. Tools: MassTransit, Temporal.io, Kafka.

---

## Service Layer

**Intent:** Defines the application boundary with a set of available operations.

**Applicability:** When a clear API boundary between presentation and domain is needed; when encapsulating use case orchestration.

**Code (C#):**
```csharp
public interface IOrderService
{
    Task<OrderDto> PlaceOrderAsync(PlaceOrderRequest request);
    Task<OrderDto?> GetOrderAsync(Guid id);
    Task CancelOrderAsync(Guid id);
}

public class OrderService : IOrderService
{
    private readonly IOrderRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _email;

    public async Task<OrderDto> PlaceOrderAsync(PlaceOrderRequest request)
    {
        var order = new Order(request.CustomerId);
        foreach (var i in request.Items) order.AddItem(i.ProductId, i.Quantity);
        _repo.Add(order);
        await _uow.SaveChangesAsync();
        _email.SendConfirmation(order.CustomerId, order.Id);
        return OrderDto.From(order);
    }

    public async Task<OrderDto?> GetOrderAsync(Guid id) => OrderDto.From(await _repo.GetById(id));
    public async Task CancelOrderAsync(Guid id)
    {
        var order = await _repo.GetById(id);
        order?.Cancel();
        await _uow.SaveChangesAsync();
    }
}
```

**Trade-offs:**
- Pro: Single entry point; clear transactional boundaries
- Con: Can become anemic facade (no real orchestration)
- Con: Blends commands and queries — CQRS separates them explicitly

**Relations:** Works with DTO, Repository, Unit of Work. Contrast: CQRS.

---

## DTO (Data Transfer Object)

**Intent:** Carry data between processes without exposing internal structures.

**Applicability:** When serialisation boundaries must be stable; when domain objects have circular references or lazy loads.

**Code (C#):**
```csharp
public sealed record PlaceOrderRequest(Guid CustomerId, List<OrderItemDto> Items);
public sealed record OrderItemDto(Guid ProductId, int Quantity, decimal UnitPrice);

public sealed record OrderDto(Guid Id, Guid CustomerId, decimal Total, string Status, DateTime CreatedAt)
{
    public static OrderDto From(Order domain) => new(
        domain.Id, domain.CustomerId, domain.Total,
        domain.Status.ToString(), domain.CreatedAt);
}
```

**Trade-offs:**
- Pro: Decouples API contract from domain; can shape payload per client
- Con: Mapping boilerplate; too many DTOs can clutter the codebase

**Relations:** Works with Service Layer, Controller, Result Pattern.

---

## Result Pattern

**Intent:** Explicitly represent operation success or failure as a return type instead of exceptions.

**Applicability:** When avoiding exceptions for expected failures (validation, not-found); when callers should explicitly handle failure.

**Code (C#):**
```csharp
public class Result<T>
{
    public T? Value { get; }
    public Error? Error { get; }
    public bool IsSuccess => Error is null;

    private Result(T value) => Value = value;
    private Result(Error error) => Error = error;

    public static Result<T> Ok(T v) => new(v);
    public static Result<T> Fail(Error e) => new(e);

    public TValue Match<TValue>(Func<T, TValue> ok, Func<Error, TValue> fail) =>
        IsSuccess ? ok(Value!) : fail(Error!);
}

public sealed record Error(string Code, string Message);

// Usage:
public class PlaceOrderUseCase
{
    public async Task<Result<OrderDto>> Execute(PlaceOrderRequest request)
    {
        if (request.Items.Count == 0)
            return Result<OrderDto>.Fail(new Error("EMPTY_ORDER", "No items."));
        var order = new Order(request.CustomerId);
        _repo.Add(order); await _uow.SaveChangesAsync();
        return Result<OrderDto>.Ok(OrderDto.From(order));
    }
}

[HttpPost]
public async Task<IActionResult> PlaceOrder(PlaceOrderRequest request)
{
    var result = await _useCase.Execute(request);
    return result.Match<IActionResult>(Ok, err => Problem(err.Message, statusCode: 400));
}
```

**Code (TypeScript):**
```typescript
export class Result<T> {
  private constructor(
    public readonly value?: T,
    public readonly error?: Error,
  ) {}
  get isSuccess(): boolean { return !this.error; }
  static ok<T>(value: T): Result<T> { return new Result(value); }
  static fail<T>(error: Error): Result<T> { return new Result(undefined, error); }
  match<U>(onSuccess: (v: T) => U, onFailure: (e: Error) => U): U {
    return this.isSuccess ? onSuccess(this.value!) : onFailure(this.error!);
  }
}
```

**Trade-offs:**
- Pro: Explicit error handling; composable with Select/Bind; no hidden exceptions
- Con: No stack traces (use exceptions for programmer errors); can be verbose

**Relations:** Works with Service Layer, CQRS. Libraries: FluentResults, LanguageExt, neverthrow (TS).

---

## Integration Patterns (cross-service)

---

## Circuit Breaker

**Intent:** Prevents cascading failures by stopping calls to an unhealthy dependency.

**Applicability:** When calling external services that may become slow or unavailable.

**Code (C#):**
```csharp
public class CircuitBreaker
{
    private readonly int _threshold;
    private readonly TimeSpan _timeout;
    private int _failureCount;
    private DateTime _lastFailure;
    private CircuitState _state = CircuitState.Closed;

    public enum CircuitState { Closed, Open, HalfOpen }

    public CircuitBreaker(int threshold, TimeSpan timeout) => (_threshold, _timeout) = (threshold, timeout);

    public async Task<T> ExecuteAsync<T>(Func<Task<T>> action)
    {
        if (_state == CircuitState.Open)
        {
            if (DateTime.UtcNow - _lastFailure > _timeout) _state = CircuitState.HalfOpen;
            else throw new CircuitBreakerOpenException();
        }
        try
        {
            var result = await action();
            _state = CircuitState.Closed; _failureCount = 0;
            return result;
        }
        catch
        {
            _failureCount++; _lastFailure = DateTime.UtcNow;
            if (_failureCount >= _threshold) _state = CircuitState.Open;
            throw;
        }
    }
}

// Usage: new CircuitBreaker(3, TimeSpan.FromSeconds(30)).ExecuteAsync(() => _payment.Charge(total));
```

**Trade-offs:**
- Pro: Fast-fail protects resources; automatic recovery via half-open
- Pro: Prevents resource exhaustion and cascading failures
- Con: Tuning threshold & timeout is tricky
- Con: Distributed tracing needed to debug open-circuit scenarios

**Relations:** Works with Retry, Timeout, Bulkhead. Libraries: Polly (.NET), opossum (Node.js).

---

## Strangler Fig

**Intent:** Incrementally replace a legacy system by routing functionality piece by piece.

**Applicability:** When rewriting a legacy monolith to microservices; when big-bang replacement is too risky.

**Code (C#):**
```csharp
public class StranglerRouter
{
    private readonly ILegacyService _legacy;
    private readonly INewService _new;

    public async Task<Response> RouteAsync(Request request)
    {
        if (FeatureFlags.IsMigrated(request.Endpoint))
        {
            try { return await _new.HandleAsync(request); }
            catch { return await _legacy.HandleAsync(request); } // fallback
        }
        return await _legacy.HandleAsync(request);
    }
}
```

**Trade-offs:**
- Pro: Incremental migration; rollback to legacy on failure; no downtime
- Con: Dual maintenance (both systems run in parallel)
- Con: Data synchronisation between old and new systems

**Relations:** Works with API Gateway, Feature Flags, Anti-Corruption Layer.

---

## Backend for Frontend (BFF)

**Intent:** Create a separate backend per client type (mobile, web, IoT).

**Applicability:** When different clients need different data shapes, payload sizes, or protocols.

**Code (C#):**
```csharp
// Web BFF — full HTML-friendly data
[ApiController]
public class WebOrderController : ControllerBase
{
    [HttpGet("orders/{id}")]
    public async Task<OrderWebDto> GetOrder(Guid id)
    {
        var order = await _orderService.GetAsync(id);
        return new OrderWebDto { OrderId = order.Id, TotalFormatted = $"${order.Total:F2}" };
    }
}

// Mobile BFF — minimised payload
[ApiController]
public class MobileOrderController : ControllerBase
{
    [HttpGet("orders/{id}")]
    public async Task<OrderMobileDto> GetOrder(Guid id) =>
        new(order.Id, order.Status, order.Total);
}
```

**Trade-offs:**
- Pro: Client-optimised payloads; protocol flexibility (GraphQL for web, gRPC for mobile)
- Con: Duplication across BFFs; BFF can become a monolith if not kept slim

**Relations:** Works with API Gateway, DTO. Pattern by SoundCloud (2015).

---

## API Gateway

**Intent:** Single entry point that routes requests to appropriate microservices.

**Applicability:** When clients should not know about individual service endpoints; when cross-cutting concerns should be centralised.

**Code (TypeScript) — Express-based:**
```typescript
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use('/api/orders', createProxyMiddleware({ target: 'http://order-service:3001', changeOrigin: true }));
app.use('/api/payments', createProxyMiddleware({ target: 'http://payment-service:3002', changeOrigin: true }));
```

**Trade-offs:**
- Pro: Centralised auth, rate limiting, logging; hides service topology
- Con: Single point of failure; adds latency; can become a "smart" bottleneck

**Relations:** Works with BFF, Circuit Breaker. Tools: Ocelot, YARP, Kong, Envoy, AWS API Gateway.

---

## Outbox Pattern

**Intent:** Reliably publish messages by writing them atomically with the database transaction.

**Applicability:** When message loss after DB commit is unacceptable; when exactly-once/at-least-once delivery is needed.

**Code (C#):**
```csharp
// Outbox entity
public class OutboxMessage
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Data { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool Processed { get; set; }
}

// Writing atomically with business data:
public class PlaceOrderHandler
{
    private readonly AppDbContext _db;
    public async Task Handle(PlaceOrderCommand cmd)
    {
        _db.Orders.Add(new Order(cmd.CustomerId));
        _db.OutboxMessages.Add(new OutboxMessage
        {
            Id = Guid.NewGuid(), Type = "OrderCreated",
            Data = JsonSerializer.Serialize(new { CustomerId = cmd.CustomerId }),
            CreatedAt = DateTime.UtcNow, Processed = false
        });
        await _db.SaveChangesAsync(); // single transaction
    }
}

// Background processor:
public class OutboxProcessor : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var pending = await db.OutboxMessages.Where(m => !m.Processed)
                .OrderBy(m => m.CreatedAt).Take(50).ToListAsync(ct);
            foreach (var msg in pending)
            {
                await _bus.PublishAsync(msg.Type, msg.Data);
                msg.Processed = true;
            }
            await db.SaveChangesAsync(ct);
            await Task.Delay(1000, ct);
        }
    }
}
```

**Trade-offs:**
- Pro: Atomic writes guarantee delivery (at-least-once)
- Con: Outbox table grows; needs periodic cleanup or CDC (Debezium)
- Con: Idempotent consumers required (at-least-once delivery)

**Relations:** Works with Event Sourcing, Saga. Alternative: Transactional Outbox via CDC.

---

## Index

| Pattern | Category | Key Relations |
|---|---|---|
| Repository | Persistence | Unit of Work, Specification, Data Mapper |
| Unit of Work | Persistence | Repository, Aggregate |
| Data Mapper | Persistence | Repository, Identity Map |
| Identity Map | Persistence | Data Mapper, Unit of Work |
| Lazy Load | Persistence | Proxy, Repository |
| Specification | Persistence | Repository, CQRS |
| Aggregate | Domain | Repository, Domain Event |
| Value Object | Domain | Aggregate, DTO |
| Domain Event | Domain | Aggregate, Event Sourcing |
| Layered Architecture | Architectural | DTO, Service Layer |
| Hexagonal Architecture | Architectural | Clean Architecture, DI |
| Onion Architecture | Architectural | Clean Architecture |
| Clean Architecture | Architectural | CQRS, DDD, Hexagonal |
| CQRS | Architectural | Event Sourcing, Mediator |
| Event Sourcing | Architectural | CQRS, Projections |
| Saga | Integration | CQRS, Outbox, Event Sourcing |
| Service Layer | Application | Repository, DTO |
| DTO | Application | Service Layer, BFF |
| Result Pattern | Application | Service Layer, CQRS |
| Circuit Breaker | Integration | Retry, Timeout |
| Strangler Fig | Integration | API Gateway, Anti-Corruption Layer |
| BFF | Integration | API Gateway, DTO |
| API Gateway | Integration | BFF, Circuit Breaker |
| Outbox | Integration | Event Sourcing, Saga |

---

*References: Patterns of Enterprise Application Architecture (Fowler); Domain-Driven Design (Evans); Clean Architecture (Martin); Building Microservices (Newman).*
