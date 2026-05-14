# Pattern Catalog

## Creational Patterns

### Singleton

```
+--------------------+
| Singleton          |
|--------------------|
| - instance: T      |
|--------------------|
| + getInstance(): T |
+--------------------+
```

**Implementation rules**:
- Thread-safe initialization (static constructor in C#, `__new__` lock in Python, `sync.Once` in Go)
- Private constructor
- No cloning, no serialization breaking singleton

**Code**:
```csharp
public sealed class DatabaseConnectionPool
{
    private static readonly Lazy<DatabaseConnectionPool> _instance =
        new(() => new DatabaseConnectionPool());
    public static DatabaseConnectionPool Instance => _instance.Value;
    private DatabaseConnectionPool() { /* init */ }
}
```

### Factory Method

```
+-----------------------+        +------------------+
| Creator (abstract)    |<>----->| Product (interface)|
|-----------------------|        +------------------+
| + factoryMethod(): P  |                  ^
+-----------------------+                  |
         ^                          +------------+
         |                          | ConcreteP  |
+-------------------+               +------------+
| ConcreteCreator   |
| + factoryMethod() |
+-------------------+
```

**Code**:
```csharp
abstract class DocumentCreator
{
    public abstract IDocument Create();
}

class PdfCreator : DocumentCreator
{
    public override IDocument Create() => new PdfDocument();
}
```

### Abstract Factory

```
+------------------+        +------------------+
| IGUIFactory       |------->| IButton          |
|-------------------|        | ICheckbox        |
| + CreateButton()  |        +------------------+
| + CreateCheckbox()|                 ^
+------------------+                  |
         ^                     +--------------+
         |                     | WinFactory   |
+------------------+           | MacFactory   |
| WinFactory       |           +--------------+
| + CreateButton() |
| + CreateCheckbox()|
+------------------+
```

### Builder

```csharp
var pizza = new PizzaBuilder()
    .SetSize("Large")
    .AddTopping("Cheese")
    .AddTopping("Pepperoni")
    .SetCrust("Thin")
    .Build();
```

### Prototype

```java
abstract class Shape implements Cloneable {
    protected String color;
    public Shape clone() { return (Shape) super.clone(); }
}
```

## Structural Patterns

### Adapter

```csharp
// Third-party library
class LegacyPaymentProcessor {
    public void ProcessPayment(string xmlRequest) { ... }
}

// Target interface
interface IPaymentProcessor {
    Task<PaymentResult> ProcessAsync(PaymentRequest request);
}

// Adapter
class LegacyPaymentAdapter : IPaymentProcessor {
    private readonly LegacyPaymentProcessor _legacy;
    public async Task<PaymentResult> ProcessAsync(PaymentRequest request) {
        string xml = ConvertToXml(request);
        _legacy.ProcessPayment(xml);
        return MapResult(xml);
    }
}
```

### Decorator

```csharp
interface IDataRepository { Task<Data> GetByIdAsync(int id); }

class CachingRepositoryDecorator : IDataRepository
{
    private readonly IDataRepository _inner;
    private readonly ICache _cache;

    public async Task<Data> GetByIdAsync(int id)
    {
        if (_cache.TryGet(id, out Data cached)) return cached;
        var data = await _inner.GetByIdAsync(id);
        _cache.Set(id, data);
        return data;
    }
}

// Stacking decorators
var repo = new LoggingDecorator(
    new CachingDecorator(
        new RetryDecorator(
            new DbRepository()))));
```

### Facade

```csharp
class OrderFacade
{
    private readonly InventoryService _inventory;
    private readonly PaymentService _payment;
    private readonly ShippingService _shipping;
    private readonly NotificationService _notification;

    public async Task<OrderResult> PlaceOrder(OrderRequest request)
    {
        await _inventory.Reserve(request.Items);
        await _payment.Charge(request.PaymentInfo, request.Total);
        var tracking = await _shipping.Ship(request.Items, request.Address);
        await _notification.SendConfirmation(request.Email, tracking);
        return new OrderResult(tracking);
    }
}
```

## Behavioral Patterns

### Strategy

```csharp
interface ITaxStrategy
{
    decimal CalculateTax(Order order);
}

class VATStrategy : ITaxStrategy { ... }
class SalesTaxStrategy : ITaxStrategy { ... }

class Order
{
    private ITaxStrategy _taxStrategy;
    public Order(ITaxStrategy taxStrategy) { _taxStrategy = taxStrategy; }

    public decimal GetTax() => _taxStrategy.CalculateTax(this);
}
```

### Observer

```csharp
interface IOrderObserver
{
    void OnOrderStatusChanged(Order order);
}

class EmailNotifier : IOrderObserver { ... }
class AuditLogger : IOrderObserver { ... }

class Order
{
    private List<IOrderObserver> _observers = new();

    public void Attach(IOrderObserver observer) => _observers.Add(observer);
    public void Notify()
    {
        foreach (var obs in _observers) obs.OnOrderStatusChanged(this);
    }
}
```

### State

```csharp
interface IOrderState
{
    void Approve(Order order);
    void Ship(Order order);
    void Cancel(Order order);
}

class PendingState : IOrderState { ... }
class ApprovedState : IOrderState { ... }
class ShippedState : IOrderState { ... }
class CancelledState : IOrderState { ... }

class Order
{
    public IOrderState State { get; set; } = new PendingState();
    public void Approve() => State.Approve(this);
    public void Ship() => State.Ship(this);
    public void Cancel() => State.Cancel(this);
}
```

### Command

```csharp
interface ICommand
{
    Task ExecuteAsync();
    Task UndoAsync();
}

class CreateOrderCommand : ICommand
{
    private readonly OrderData _data;
    private readonly IOrderRepository _repo;
    private OrderId _createdOrderId;

    public async Task ExecuteAsync()
    {
        var order = Order.Create(_data);
        await _repo.SaveAsync(order);
        _createdOrderId = order.Id;
    }

    public async Task UndoAsync()
    {
        await _repo.DeleteAsync(_createdOrderId);
    }
}
```

### Chain of Responsibility

```csharp
abstract class ValidationHandler
{
    protected ValidationHandler? _next;
    public void SetNext(ValidationHandler next) => _next = next;

    public virtual ValidationResult Handle(Order order)
    {
        return _next?.Handle(order) ?? ValidationResult.Ok();
    }
}

class CustomerValidationHandler : ValidationHandler
{
    public override ValidationResult Handle(Order order)
    {
        if (order.CustomerId == Guid.Empty)
            return ValidationResult.Fail("Invalid customer");
        return base.Handle(order);
    }
}

class StockValidationHandler : ValidationHandler
{
    public override ValidationResult Handle(Order order)
    {
        if (!_stock.CheckAvailability(order.Items))
            return ValidationResult.Fail("Out of stock");
        return base.Handle(order);
    }
}
```

### Template Method

```csharp
abstract class DataExporter
{
    public void Export(string path)
    {
        var data = ExtractData();
        var formatted = FormatData(data);
        SaveToFile(formatted, path);
    }

    protected abstract List<Record> ExtractData();
    protected abstract string FormatData(List<Record> data);

    protected void SaveToFile(string content, string path) =>
        File.WriteAllText(path, content);
}

class CsvExporter : DataExporter
{
    protected override List<Record> ExtractData() => db.Query("SELECT * FROM data");
    protected override string FormatData(List<Record> data) => ConvertToCsv(data);
}
```

### Visitor

```csharp
interface IVisitor
{
    void Visit(Order order);
    void Visit(Customer customer);
    void Visit(Product product);
}

class ExportVisitor : IVisitor
{
    public void Visit(Order order) => export.Add(order.ToExportDto());
    public void Visit(Customer customer) => export.Add(customer.ToExportDto());
    public void Visit(Product product) => export.Add(product.ToExportDto());
}
```
