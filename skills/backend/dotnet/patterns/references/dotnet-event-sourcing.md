# .NET Event Sourcing

## Event Sourcing vs State Persistence

| Aspect | State Persistence | Event Sourcing |
|--------|------------------|----------------|
| Storage | Current state | Event stream |
| History | Lost on update | Full audit trail |
| Complexity | Low | High |
| Debugging | Hard (current state only) | Easy (replay events) |
| Performance | Fast reads | Fast writes, slow reads |
| When | CRUD apps | Audit, compliance, complex state |

## Event Store Pattern

```csharp
// Domain event base
public record DomainEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    public string EventType => GetType().Name;
    public int Version { get; init; }
}

// Specific events
public record OrderPlacedEvent(Guid OrderId, string CustomerId, decimal Total) : DomainEvent;
public record OrderConfirmedEvent(Guid OrderId) : DomainEvent;
public record OrderShippedEvent(Guid OrderId, string TrackingNumber) : DomainEvent;
public record OrderCancelledEvent(Guid OrderId, string Reason) : DomainEvent;
```

## Aggregate with Event Sourcing

```csharp
public class Order : AggregateRoot
{
    private readonly List<DomainEvent> _changes = [];
    private Guid _id;
    private string _customerId;
    private OrderStatus _status;
    private decimal _total;

    public Guid Id => _id;
    public IReadOnlyList<DomainEvent> Changes => _changes.AsReadOnly();

    // Factory method — creates and records event
    public static Order Place(string customerId, List<OrderItem> items)
    {
        var order = new Order();
        var @event = new OrderPlacedEvent(Guid.NewGuid(), customerId, items.Sum(i => i.Price));
        order.Apply(@event);
        order._changes.Add(@event);
        return order;
    }

    // Command methods
    public void Confirm()
    {
        if (_status != OrderStatus.Pending)
            throw new DomainException("Only pending orders can be confirmed");
        var @event = new OrderConfirmedEvent(_id);
        Apply(@event);
        _changes.Add(@event);
    }

    // Apply to mutate state
    private void Apply(OrderPlacedEvent @event)
    {
        _id = @event.OrderId;
        _customerId = @event.CustomerId;
        _status = OrderStatus.Pending;
        _total = @event.Total;
    }

    private void Apply(OrderConfirmedEvent @event) => _status = OrderStatus.Confirmed;

    // Rebuild from history
    public static Order Load(IEnumerable<DomainEvent> history)
    {
        var order = new Order();
        foreach (var @event in history)
            order.Apply((dynamic)@event); // Dispatch by type
        order._changes.Clear();
        return order;
    }
}
```

## Event Store Implementation

```csharp
public interface IEventStore
{
    Task AppendAsync(string streamId, IEnumerable<DomainEvent> events, CancellationToken ct);
    Task<IEnumerable<DomainEvent>> ReadStreamAsync(string streamId, CancellationToken ct);
}

public class PostgresEventStore : IEventStore
{
    private readonly NpgsqlConnection _conn;

    public PostgresEventStore(NpgsqlConnection conn) => _conn = conn;

    public async Task AppendAsync(string streamId, IEnumerable<DomainEvent> events, CancellationToken ct)
    {
        await using var writer = _conn.CreateBinaryCopyCommand(@"
            COPY events (stream_id, version, event_type, data, occurred_at) FROM STDIN (FORMAT BINARY)");

        foreach (var (ev, index) in events.Select((e, i) => (e, i)))
        {
            await writer.WriteAsync(streamId, ct);
            await writer.WriteAsync(index + 1, ct);
            await writer.WriteAsync(ev.EventType, ct);
            await writer.WriteAsync(JsonSerializer.Serialize(ev, ev.GetType()), ct);
            await writer.WriteAsync(ev.OccurredAt, ct);
        }
        await writer.CompleteAsync(ct);
    }

    public async Task<IEnumerable<DomainEvent>> ReadStreamAsync(string streamId, CancellationToken ct)
    {
        var events = new List<DomainEvent>();
        await using var cmd = new NpgsqlCommand(
            "SELECT event_type, data FROM events WHERE stream_id = @id ORDER BY version",
            _conn) { Parameters = { new("id", streamId) } };

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var type = Type.GetType(reader.GetString(0));
            var data = reader.GetString(1);
            events.Add((DomainEvent)JsonSerializer.Deserialize(data, type!)!);
        }
        return events;
    }
}
```

## Read Model Projections

```csharp
public class OrderProjectionService : IEventHandler<OrderPlacedEvent>
{
    private readonly OrdersReadDbContext _db;

    public async Task Handle(OrderPlacedEvent @event, CancellationToken ct)
    {
        await _db.OrderSummaries.AddAsync(new OrderSummary
        {
            Id = @event.OrderId,
            CustomerId = @event.CustomerId,
            Status = "Pending",
            Total = @event.Total,
            CreatedAt = @event.OccurredAt,
        }, ct);
        await _db.SaveChangesAsync(ct);
    }
}
```

## Snapshot Strategy

```csharp
// Take snapshot every N events to avoid replaying entire stream
public record OrderSnapshot(Guid OrderId, string CustomerId, OrderStatus Status, decimal Total, int Version);

public interface ISnapshotStore
{
    Task<OrderSnapshot?> GetLatestAsync(Guid aggregateId, CancellationToken ct);
    Task SaveAsync(OrderSnapshot snapshot, CancellationToken ct);
}

const int SnapshotInterval = 100;

public async Task<Order> LoadAsync(Guid id, CancellationToken ct)
{
    var snapshot = await _snapshotStore.GetLatestAsync(id, ct);
    var events = await _eventStore.ReadStreamAsync($"order-{id}", ct);
    if (snapshot != null)
        events = events.Skip(snapshot.Version);
    return Order.Load(snapshot, events);
}
```
