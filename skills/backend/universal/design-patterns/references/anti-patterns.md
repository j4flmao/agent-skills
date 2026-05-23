# Anti-Patterns Reference

> Practical catalogue of common anti-patterns for code review. Each entry: category, symptoms, cause, solution, and C#/TypeScript example.

---

## Architectural Anti-Patterns

---

## Big Ball of Mud

**Category:** Architectural
**Symptoms:** No recognizable structure; files reference each other arbitrarily; layering is violated everywhere; a change in one place breaks unrelated things.
**Cause:** Rapid prototyping without refactoring; no architectural oversight; deadline pressure deferring cleanup.
**Solution:** Incrementally extract bounded contexts (Strangler Fig). Enforce strict layering. Use architecture tests to prevent violations.

```typescript
// BEFORE — imports from every layer
import { formatCurrency } from '../../ui/helpers/formatting';
import { db } from '../../infrastructure/database';
import { sendEmail } from '../../notification/emailer';

export function processOrder(id: string) {
  const order = db.query(`SELECT * FROM orders WHERE id = ?`, [id]);
  sendEmail(order.userEmail, `Total: ${formatCurrency(order.total)}`);
}
```

```typescript
// AFTER — Layered
import { IOrderRepository } from '../domain/ports/order-repository';
import { IEmailService } from '../domain/ports/email-service';

export async function processOrder(id: string): Promise<void> {
  const order = await this.orderRepo.findById(id);
  await this.emailService.sendReceipt(order);
}
```

**Related:** Lava Flow, God Class, Stovepipe System

---

## Lava Flow

**Category:** Architectural
**Symptoms:** Commented-out code persisting for years, dead methods, unreachable branches, unused parameters — code "we might need someday" that never gets removed.
**Cause:** Fear of deletion; no test coverage; no collective code ownership.
**Solution:** Delete aggressively. If it has no callers and no tests, it's dead. Use lint rules (`no-unused-vars`, `no-dead-code`).

```csharp
// BEFORE
public class OrderProcessor
{
    public void Process(Order order)
    {
        // var oldTax = CalculateLegacyTax(order); // kept for reference — 2yr
        ApplyNewTax(order);
    }
    private decimal CalculateLegacyTax(Order order) => order.Total * 0.05M; // unused
}
```

```csharp
// AFTER
public class OrderProcessor
{
    public void Process(Order order) => ApplyNewTax(order);
}
```

**Related:** Big Ball of Mud, Boat Anchor

---

## Stovepipe System

**Category:** Architectural
**Symptoms:** Every team builds silos; no shared infrastructure; point-to-point integrations everywhere; duplicating auth, logging, monitoring per service.
**Cause:** Team autonomy without governance; no platform team; acquisition-driven architecture.
**Solution:** Establish a shared platform layer. Define bounded contexts with explicit integration contracts.

```typescript
// BEFORE — Each service builds its own auth
const authA = (req, res, next) => { /* JWT */ };
const authB = (req, res, next) => { /* session cookie */ };
const authC = (req, res, next) => { /* API key */ };
```

```typescript
// AFTER — Shared auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  req.user = verifyToken(token);
  next();
};
```

**Related:** Distributed Monolith, ESB Overuse

---

## Golden Hammer

**Category:** Architectural
**Symptoms:** Every problem solved with the same tool; a pattern appears universally regardless of context; no evaluation of alternatives.
**Cause:** Familiarity bias; previous success with a tool leads to over-reliance; resume-driven development.
**Solution:** Evaluate each problem on its merits. Document ADRs.

```typescript
// BEFORE — Event Sourcing + CQRS for a country code lookup
class CountryCodeService {
  async lookup(code: string): Promise<Country> {
    return this.db.findOne({ code });
  }
  // plus event store, projections, replay... for a single query
}
```

```typescript
// AFTER — Simple query is fine
class CountryCodeService {
  async lookup(code: string): Promise<Country | null> {
    return this.db.findOne({ code });
  }
}
```

**Related:** Cargo Cult, Swiss Army Knife

---

## God Class / God Object

**Category:** Architectural / OOP
**Symptoms:** Class > 1000 lines; > 20 methods; depends on > 10 classes; impossible to unit test without mocking half the system.
**Cause:** Convenience over separation; not recognizing extraction points; "one class to rule them all."
**Solution:** Extract by SRP. Decompose by behavior, not data.

```csharp
// BEFORE — 30 methods, 6 responsibilities
public class OrderService
{
    public void CreateOrder(Order order) { }
    public decimal CalculateTax(Order order) { }
    public void SendConfirmation(Order order) { }
    public void GenerateInvoice(Order order) { }
    public void UpdateInventory(Order order) { }
    public void LogAuditTrail(Order order) { }
    // 24 more...
}
```

```csharp
// AFTER — Extracted dependencies
public class OrderService {
    private readonly IOrderRepository _repo;
    private readonly ITaxCalculator _tax;
    private readonly INotificationService _notifier;
    private readonly IInventoryService _inventory;
}
```

**Related:** Swiss Army Knife, Feature Envy, Base Bean

---

## Poltergeist

**Category:** Architectural
**Symptoms:** Classes that exist only to call another class and disappear; temporary objects with trivial behavior; excessive delegation with no benefit.
**Cause:** Over-engineering; premature abstraction.
**Solution:** Inline the poltergeist. Only introduce indirection when it adds value.

```csharp
// BEFORE — Poltergeist
public class OrderCreationHelper
{
    public Order Create(string product, int qty, decimal price)
        => new Order { Product = product, Quantity = qty, Price = price };
}
public class CheckoutService
{
    public void Checkout(string product, int qty, decimal price)
    {
        var helper = new OrderCreationHelper();
        _repo.Save(helper.Create(product, qty, price));
    }
}
```

```csharp
// AFTER
public class CheckoutService
{
    public void Checkout(string product, int qty, decimal price)
    {
        _repo.Save(new Order { Product = product, Quantity = qty, Price = price });
    }
}
```

**Related:** Golden Hammer, Lava Flow

---

## Boat Anchor

**Category:** Architectural
**Symptoms:** Libraries, frameworks, services included but never used; full DI container for a 50-line script; elaborate plugin system nobody extends.
**Cause:** "We might need it someday"; copying boilerplate; over-engineering for unknown requirements.
**Solution:** YAGNI. Remove unused dependencies. Use `depcheck` / `dotnet list package`.

```json
// BEFORE
{
  "dependencies": {
    "express": "^4.18.0",
    "kafka-node": "^5.0.0",    // never implemented
    "redis": "^4.0.0",         // never set up
    "elasticsearch": "^16.0.0" // never built
  }
}
```

```json
// AFTER — only what's used
{ "dependencies": { "express": "^4.18.0" } }
```

**Related:** Lava Flow, Golden Hammer

---

## Object-Oriented Anti-Patterns

---

## Spaghetti Code

**Category:** OOP
**Symptoms:** Methods longer than a screen; nested conditionals 4+ levels deep; no single exit point; global mutable state threaded everywhere.
**Cause:** No design; procedural thinking in OOP; no refactoring discipline.
**Solution:** Extract methods aggressively. Replace conditionals with polymorphism. Use guard clauses.

```typescript
// BEFORE — deeply nested
function calculatePayout(e: Employee): number {
  if (e.type === 'fulltime') {
    if (e.seniority > 5) return e.hasBonus ? e.salary * 1.2 + 5000 : e.salary * 1.2;
    return e.hasBonus ? e.salary * 1.1 + 2000 : e.salary * 1.1;
  }
  if (e.type === 'contractor') return e.hours > 40 ? e.hours * e.rate * 1.5 : e.hours * e.rate;
  return 0;
}
```

```typescript
// AFTER — Strategy pattern
const calculators: Record<string, PayoutCalculator> = {
  fulltime: new FullTimeCalculator(),
  contractor: new ContractorCalculator(),
};
function calculatePayout(e: Employee) { return calculators[e.type]?.calculate(e) ?? 0; }
```

**Related:** Big Ball of Mud, God Class

---

## Swiss Army Knife

**Category:** OOP
**Symptoms:** A class implementing many unrelated interfaces; a utility class with methods covering different domains (`StringAndDateAndMathAndFileUtils`).
**Cause:** Convenience over cohesion; "one place to find things."
**Solution:** Split into single-purpose classes. One reason to change (SRP).

```csharp
// BEFORE
public static class EverythingUtils
{
    public static string ToSlug(string s) => s.ToLower().Replace(" ", "-");
    public static DateTime FirstOfMonth(DateTime d) => new(d.Year, d.Month, 1);
    public static int Factorial(int n) => n <= 1 ? 1 : n * Factorial(n - 1);
    public static decimal RoundToCents(decimal a) => Math.Round(a, 2);
}
```

```csharp
// AFTER
public static class StringUtils { public static string ToSlug(string s) => /* ... */; }
public static class DateUtils { public static DateTime FirstOfMonth(DateTime d) => /* ... */; }
```

**Related:** God Class, Feature Envy

---

## Yo-Yo Problem

**Category:** OOP
**Symptoms:** Deep inheritance (>3 levels); to understand a method you navigate 5+ parent classes; debugging requires jumping up and down the chain.
**Cause:** Overuse of inheritance for reuse; not preferring composition.
**Solution:** Composition over inheritance. Replace inheritance chains with interfaces + DI.

```typescript
// BEFORE — 4 levels deep
class Entity { id: string; }
class AuditableEntity extends Entity { createdAt: Date; createdBy: string; }
class SoftDeletableEntity extends AuditableEntity { deletedAt?: Date; }
class TenantScopedEntity extends SoftDeletableEntity { tenantId: string; }
class Product extends TenantScopedEntity { name: string; price: number; }
```

```typescript
// AFTER — Composition via interfaces
class Product {
  constructor(
    public id: string, public createdAt: Date, public createdBy: string,
    public tenantId: string, public name: string, public price: number,
  ) {}
}
```

**Related:** Call Super, Base Bean

---

## Circular Dependency

**Category:** OOP / Architectural
**Symptoms:** Module A imports B, B imports A; `TypeError: Class extends value undefined`; impossible to test A without B and B without A.
**Cause:** Poor boundary definition; bidirectional relationships modeled naively; same namespace.
**Solution:** Introduce an interface both depend on (Dependency Inversion). Extract shared dependency to a third module.

```typescript
// BEFORE
// order.ts: import { User } from './user';
// user.ts: import { Order } from './order';
```

```typescript
// AFTER — both depend on abstraction
// i-have-email.ts
export interface IHaveEmail { email: string; }
// order.ts: import { IHaveEmail } from './i-have-email';
// user.ts: import { IHaveEmail } from './i-have-email'; import { Order } from './order';
export class User implements IHaveEmail {
  constructor(public email: string, public orders: Order[]) {}
}
```

**Related:** God Class, Stovepipe System

---

## Singleton Abuse

**Category:** OOP / Architectural
**Symptoms:** Global mutable state; singletons used everywhere; tests depend on ordering; `.Instance` fields everywhere.
**Cause:** Convenience; not understanding DI; "it's just one."
**Solution:** DI container manages lifetimes. For singular concerns (logging), use DI single instance, not `getInstance()`.

```csharp
// BEFORE
public class Database
{
    public static Database Instance => _instance ??= new();
    public List<User> GetUsers() => /* ... */;
}
public class UserService
{
    public void DoSomething()
    {
        var db = Database.Instance; // hidden dependency, untestable
    }
}
```

```csharp
// AFTER
public class UserService
{
    private readonly IDatabase _db;
    public UserService(IDatabase db) => _db = db; // explicit, mockable
}
```

**Related:** God Class, Sequential Coupling

---

## Base Bean

**Category:** OOP
**Symptoms:** Classes inherit from "Base" just for utility methods; `BaseController`, `BaseService` with dozens of unrelated methods.
**Cause:** Attempted reuse through inheritance; framework conventions.
**Solution:** Prefer composition. Extract utilities into injectable services.

```typescript
// BEFORE
class BaseController {
  protected json(d: any, s = 200) { return { status: s, data: d }; }
  protected currentUser(req: Request): User { return req.user; }
  protected log(action: string, u: string) { /* ... */ }
}
class OrderController extends BaseController {
  get(req: Request) { return this.json({ user: this.currentUser(req) }); }
}
```

```typescript
// AFTER
class OrderController {
  constructor(private userService: IUserService) {}
  get(req: Request) { return { status: 200, data: { user: this.userService.getCurrentUser(req) } }; }
}
```

**Related:** Yo-Yo Problem, God Class

---

## Call Super

**Category:** OOP
**Symptoms:** Every override begins with `super.method()`; forgetting to call super causes bugs; subclass must remember to invoke parent.
**Cause:** Template Method pattern misused; base requiring mandatory hooks from subclass.
**Solution:** Template Method correctly (base calls hook, not subclass). Or use Strategy.

```typescript
// BEFORE
abstract class BaseValidator {
  validate(data: any): boolean {
    return data ? this.doValidate(data) : false;
  }
}
class OrderValidator extends BaseValidator {
  protected doValidate(data: any): boolean {
    return super.validate(data) && data.total > 0; // must call super
  }
}
```

```typescript
// AFTER — base calls the hook
abstract class BaseValidator {
  validate(data: any): boolean {
    return data ? this.doValidate(data) : false; // controls flow
  }
  protected abstract doValidate(data: any): boolean;
}
class OrderValidator extends BaseValidator {
  protected doValidate(data: any): boolean { return data.total > 0; } // no super
}
```

**Related:** Yo-Yo Problem, Sequential Coupling

---

## Feature Envy

**Category:** OOP
**Symptoms:** A method accesses more data from another class than its own; getter chains (`a.B.C.D`); "Inappropriate Intimacy."
**Cause:** Data and behavior separated (Anemic Domain Model); misplaced method.
**Solution:** Move the method to the class it envies. Or extract to a service if truly cross-cutting.

```csharp
// BEFORE
public class OrderTotalCalculator
{
    public decimal Calculate(Order order) =>
        order.Items.Sum(i => i.Price * i.Quantity) - order.Discount; // envies Order & LineItem
}
```

```csharp
// AFTER — behavior lives in the right class
public class Order
{
    public decimal CalculateTotal() => Items.Sum(i => i.Price * i.Quantity) - Discount;
}
```

**Related:** God Class, Anemic Domain Model

---

## Enterprise / Data Anti-Patterns

---

## Anemic Domain Model

**Category:** Enterprise
**Symptoms:** Domain classes are data bags (DTOs) with getters/setters only; all business logic in services; `Order` has 30 properties but 0 methods.
**Cause:** ORM-driven design; misunderstanding of DDD.
**Solution:** Move behavior into entities. Apply DDD: Entity, Value Object, Aggregate.

```csharp
// BEFORE
public class Order
{
    public List<LineItem> Items { get; set; } = new();
    public string Status { get; set; } = "Pending";
}
public class OrderService
{
    public void AddItem(Order order, Product product, int qty)
    {
        if (order.Status != "Pending") throw new InvalidOperationException();
        order.Items.Add(new LineItem(product, qty));
    }
}
```

```csharp
// AFTER — rich domain
public class Order
{
    private readonly List<LineItem> _items = new();
    public IReadOnlyList<LineItem> Items => _items.AsReadOnly();
    public OrderStatus Status { get; private set; } = OrderStatus.Pending;

    public void AddItem(Product product, int qty)
    {
        if (Status != OrderStatus.Pending) throw new InvalidOperationException();
        _items.Add(new LineItem(product, qty));
    }
}
```

**Related:** God Class, Feature Envy

---

## Data God

**Category:** Enterprise / Data
**Symptoms:** Database table with 50+ columns; `SELECT *` everywhere; one table tries to satisfy every query; schema migrations constantly add columns to the same table.
**Cause:** Normalization phobia; treating the DB as a single bucket.
**Solution:** Split into focused tables by aggregate/context. Bounded contexts.

```sql
-- BEFORE
CREATE TABLE Orders (
    Id INT, CustomerId INT, CustomerName NVARCHAR(100), CustomerEmail NVARCHAR(200),
    ShippingAddress NVARCHAR(500), BillingAddress NVARCHAR(500),
    PaymentMethod NVARCHAR(50), PaymentTransactionId NVARCHAR(100),
    ProductId INT, ProductName NVARCHAR(200), -- 40 more columns
);
```

```sql
-- AFTER — bounded contexts
CREATE TABLE Orders (Id INT, CustomerId INT, Status NVARCHAR(20), Total DECIMAL);
CREATE TABLE OrderItems (Id INT, OrderId INT REFERENCES Orders(Id), ProductId INT, Qty INT);
CREATE TABLE Payments (Id INT, OrderId INT REFERENCES Orders(Id), Method NVARCHAR(50));
```

**Related:** God Class, Anemic Domain Model

---

## Sequential Coupling

**Category:** Enterprise
**Symptoms:** Methods must be called in specific order; calling out of order throws; documentation says "call X before Y before Z."
**Cause:** Object has implicit state machine; methods assume preconditions without enforcement.
**Solution:** Make illegal states unrepresentable. Builder pattern enforces order.

```typescript
// BEFORE
const o = new Order();
o.setItems([...]);      // must be first
o.setDiscount(10);      // must be second
o.calculateTax();       // must be third
o.getTotal();           // must be last — fails if wrong order
```

```typescript
// AFTER — Builder enforces order
const total = new OrderBuilder()
  .withItems([...]).withDiscount(10).build() // single step
  .getTotal();
```

**Related:** Call Super, Temporal Coupling

---

## Temporal Coupling

**Category:** Enterprise
**Symptoms:** `Thread.Sleep(1000)` to "wait for data"; code depends on when methods are called relative to others; race-prone initialization.
**Cause:** Implicit ordering; shared mutable state; no initialization guarantees.
**Solution:** Constructor initialization. Immutable objects. Events/promises instead of sleep.

```csharp
// BEFORE
public class ReportEngine
{
    private DataSet? _data;
    public void LoadData() { _data = LoadFromDatabase(); }
    public void GenerateReport() { if (_data == null) throw new("Must load first"); }
}
var engine = new ReportEngine();
engine.LoadData();       // fragile ordering
engine.GenerateReport();
```

```csharp
// AFTER — guarantees via constructor
public class ReportEngine
{
    private readonly DataSet _data;
    public ReportEngine(DataSet data) => _data = data; // always ready
    public Report GenerateReport() { /* use _data */ }
}
```

**Related:** Sequential Coupling, Singleton Abuse

---

## Soft Coding

**Category:** Enterprise
**Symptoms:** Business logic in config files; XML/YAML with branches, conditions; config becomes a programming language; harder to test than code.
**Cause:** Desire to avoid redeployment; non-technical users demanding control.
**Solution:** Business rules in code — testable, versioned, reviewable. Feature flags for deployment flexibility.

```xml
<!-- BEFORE -->
<Rule name="discount">
  <Condition><GreaterThan><Field>order.Total</Field><Value>100</Value></GreaterThan></Condition>
  <Action><ApplyDiscount percent="10" /></Action>
</Rule>
```

```csharp
// AFTER — testable code
public decimal ApplyDiscount(Order order) => order.Total > 100 ? order.Total * 0.9M : order.Total;
```

**Related:** Inner Platform Effect, Cargo Cult

---

## Inner Platform Effect

**Category:** Enterprise
**Symptoms:** Re-implementing platform features (e.g., scripting engine in JS, workflow engine on a workflow engine).
**Cause:** NIH syndrome; not knowing/trusting platform capabilities.
**Solution:** Use platform built-ins first. Custom build only when provably necessary.

```typescript
// BEFORE — custom expression evaluator reimplementing JS
class ExpressionEngine {
  evaluate(expr: string, ctx: any) { /* tokenize → AST → eval — 300 lines */ }
}
```

```typescript
// AFTER — use the platform
function calculateTotal(order: Order) { return order.total > 100 ? 0.9 * order.total : order.total; }
```

**Related:** Soft Coding, Golden Hammer

---

## Cargo Cult

**Category:** Enterprise
**Symptoms:** Patterns applied without understanding why; following "best practices" blindly; over-engineered trivial solutions.
**Cause:** Copy-pasting from tutorials; "everyone does it."
**Solution:** Understand the "why." Challenge patterns in code review. Document ADRs.

```typescript
// BEFORE — Repository pattern for a 1-line query, no caching, no abstraction benefit, just ceremony
interface ICountryRepository { findByCode(code: string): Promise<Country | null>; }
class CountryRepository implements ICountryRepository {
  async findByCode(code: string) { return this.db.findOne('countries', { code }); }
}
class CountryService {
  async getCountry(code: string) { return this.repo.findByCode(code); }
}
```

```typescript
// AFTER — appropriate simplicity
async function getCountry(code: string) { return db.findOne('countries', { code }); }
```

**Related:** Golden Hammer, Swiss Army Knife

---

## Concurrency Anti-Patterns

---

## Thread Starvation

**Category:** Concurrency
**Symptoms:** Low-priority threads never execute; high-priority threads consume all CPU; some operations never complete.
**Cause:** Priority inversion; unfair locking; too many high-priority threads.
**Solution:** Fair locks. Bounded thread pools. Avoid mixing priorities.

**Related:** Deadlock, Lock Convoys

## Deadlock

**Category:** Concurrency
**Symptoms:** Application hangs; threads stuck in "Waiting"; no progress; reproducible with specific concurrency.
**Cause:** Two threads each hold a lock the other needs; inconsistent lock order.
**Solution:** Acquire locks in consistent global order. Use `Monitor.TryEnter` with timeout.

```csharp
// BEFORE
public void TransferAtoB() { lock (_lockA) { lock (_lockB) { /* ... */ } } }
public void TransferBtoA() { lock (_lockB) { lock (_lockA) { /* ... */ } } } // different order → deadlock
```

```csharp
// AFTER — same order
public void TransferAtoB() { lock (_lockA) { lock (_lockB) { /* ... */ } } }
public void TransferBtoA() { lock (_lockA) { lock (_lockB) { /* ... */ } } }
```

**Related:** Race Condition, Lock Convoys

## Race Condition

**Category:** Concurrency
**Symptoms:** Intermittent bugs; passes 90%, fails 10%; production-only; corrupted data; "impossible" states.
**Cause:** Check-then-act without atomicity; missing sync on shared mutable state.
**Solution:** Atomic operations. Synchronize access. Prefer immutable data.

```typescript
// BEFORE
let counter = 0;
async function inc() { const c = counter; await someAsync(); counter = c + 1; }
// Three concurrent calls → counter = 1 (not 3)
```

```typescript
// AFTER
let counter = 0;
const lock = new Mutex();
async function inc() { await lock.acquire(); counter++; lock.release(); }
```

**Related:** Deadlock, Temporal Coupling

## Busy Wait (Spinning)

**Category:** Concurrency
**Symptoms:** CPU at 100% doing nothing useful; `while(true)` checking a flag; thread never yields.
**Cause:** Not using blocking/signaling primitives; "polling is simpler."
**Solution:** Use events, semaphores, `Task.Delay`. Let the OS scheduler work.

```csharp
// BEFORE
private volatile bool _ready = false;
public void Wait() { while (!_ready) { } /* 100% CPU */ }
```

```csharp
// AFTER
private readonly AutoResetEvent _ready = new(false);
public void Wait() { _ready.WaitOne(); } // 0% CPU while waiting
```

**Related:** Thread Starvation

## Lock Convoys

**Category:** Concurrency
**Symptoms:** All threads waiting for a single lock; throughput drops as threads increase; one hot lock.
**Cause:** Coarse-grained locking; high contention on shared structure.
**Solution:** Reader-writer locks for read-heavy loads. Partition (shard) data. Lock-free data structures.

```csharp
// BEFORE — single lock blocks all readers during writes
public class UserCache {
    private readonly Dictionary<string, User> _cache = new();
    private readonly object _lock = new();
    public User? Get(string k) { lock (_lock) { return _cache.TryGetValue(k, out var u) ? u : null; } }
    public void Set(string k, User u) { lock (_lock) { _cache[k] = u; } }
}
```

```csharp
// AFTER — concurrent reads allowed
public class UserCache {
    private readonly Dictionary<string, User> _cache = new();
    private readonly ReaderWriterLockSlim _lock = new();
    public User? Get(string k) { _lock.EnterReadLock(); try { return _cache.GetValueOrDefault(k); } finally { _lock.ExitReadLock(); } }
    public void Set(string k, User u) { _lock.EnterWriteLock(); try { _cache[k] = u; } finally { _lock.ExitWriteLock(); } }
}
```

**Related:** Deadlock, Thread Starvation

---

## Integration / Microservices Anti-Patterns

---

## Distributed Monolith

**Category:** Integration / Microservices
**Symptoms:** Services must deploy together; change in A requires changes in B, C, D; shared DB; direct HTTP calls between every service.
**Cause:** Split by technical layer not domain; tight coupling disguised as microservices.
**Solution:** Split by bounded context. Asynchronous communication (events). Each service independently deployable.

```typescript
// BEFORE — services call each other directly; must deploy all together
export async function handleOrder(order: Order) {
  const user = await http.get(`http://user-service/users/${order.userId}`);
  const inv = await http.get(`http://inventory-service/stock/${order.productId}`);
}
```

```typescript
// AFTER — event-driven
export async function handleOrder(order: Order) {
  await this.orderRepo.save(order);
  await this.eventBus.publish(new OrderPlaced(order));
}
```

**Related:** Shared Database, Stovepipe System, Wrong Cut

## Shared Database

**Category:** Integration
**Symptoms:** Multiple services read/write same tables; schema changes require cross-team coordination; one service's query slows another.
**Cause:** Convenience; migration from monolith without proper decomposition.
**Solution:** Each service owns its data. Expose via API only. Materialized Views for cross-service queries.

**Related:** Distributed Monolith, Data God

## Chatty Service

**Category:** Integration
**Symptoms:** Single user operation triggers 10+ service calls; high latency from network overhead; client orchestrates multiple endpoints.
**Cause:** Overly fine-grained services; RPC-style thinking; no aggregation layer.
**Solution:** API composition layer (gateway, BFF). Coarse-grained operations by use case.

```typescript
// BEFORE — 6 calls for one page
const user = await api.get(`/users/${id}`);
const orders = await api.get(`/users/${id}/orders`);
const products = await Promise.all(orders.map(o => api.get(`/products/${o.productId}`)));
```

```typescript
// AFTER — one endpoint
const page = await api.get(`/orders/order-page/${orderId}`);
```

**Related:** Distributed Monolith, No API Gateway, Under-fetching

## Orchestration Overuse

**Category:** Integration
**Symptoms:** Central orchestrator knows every step of every business process; orchestrator becomes god class; every change touches orchestrator.
**Cause:** Treating microservices like a stateful workflow; not trusting choreography.
**Solution:** Prefer choreography (event-driven). Keep orchestration thin for complex sagas only.

```typescript
// BEFORE — Orchestrator knows and calls everything
class OrderOrchestrator {
  async placeOrder(order: Order) {
    await this.validateStock(order); await this.processPayment(order);
    await this.updateInventory(order); await this.fulfillOrder(order);
    await this.sendEmail(order); await this.updateAnalytics(order);
    await this.syncAccounting(order); await this.updateLoyalty(order);
  }
}
```

```typescript
// AFTER — publish event, services react independently
async function placeOrder(order: Order) {
  await this.orderRepo.save(order);
  await this.eventBus.publish(new OrderPlaced(order));
}
```

**Related:** Distributed Monolith, ESB Overuse

## ESB Overuse

**Category:** Integration
**Symptoms:** ESB becomes single point of failure; all traffic routes through one hub; bus has more business logic than services.
**Cause:** Centralized thinking in distributed world; vendor-driven architecture.
**Solution:** Smart endpoints, dumb pipes. Replace with lightweight message broker or direct integration.

**Related:** Orchestration Overuse, Stovepipe System

## No API Gateway

**Category:** Integration
**Symptoms:** Clients access microservices directly; auth, rate limiting, logging duplicated in every service; changes require updating all services.
**Cause:** "Gateways are SPOF"; premature optimization.
**Solution:** API Gateway handles auth, rate limiting, routing, aggregation, protocol translation.

**Related:** Distributed Monolith, Chatty Service

## Wrong Cut

**Category:** Integration
**Symptoms:** Services split by technical layer (Presentation, Business Logic, Data) not domain; feature change touches 3+ services.
**Cause:** MVC thinking applied to microservices; not applying DDD bounded contexts.
**Solution:** Split by business capability. Each service owns its vertical slice.

```
BEFORE: [API] → [Logic] → [Data] — forgot password touches all three
AFTER: [Orders] [Users] [Inventory] — forgot password touches only Users
```

**Related:** Distributed Monolith, Stovepipe System

---

## API Anti-Patterns

---

## REST Without HATEOAS

**Category:** API
**Symptoms:** Clients hardcode API URLs; API changes break clients; discoverability requires out-of-band docs.
**Cause:** "REST" implemented as RPC over HTTP; not following Fielding's constraints.
**Solution:** Include hypermedia links in responses. Clients navigate via links.

```json
// BEFORE
{ "id": 123, "status": "shipped" }
// Client must know: PUT /orders/123/cancel exists
```

```json
// AFTER
{
  "id": 123, "status": "shipped",
  "links": [
    { "rel": "cancel", "method": "PUT", "href": "/orders/123/cancel" },
    { "rel": "invoice", "method": "GET", "href": "/orders/123/invoice" }
  ]
}
```

**Related:** Over-fetching, Tunnel Vision

## Over-fetching

**Category:** API
**Symptoms:** API returns 50 fields when client needs 3; mobile clients download excessive data; slow low-bandwidth responses.
**Cause:** Single endpoint per entity regardless of use case; no field selection.
**Solution:** Sparse fieldsets (`?fields=id,name`). GraphQL. Specialized endpoints.

**Related:** Under-fetching, Chatty Service

## Under-fetching / N+1 Query

**Category:** API / Data
**Symptoms:** List API returns IDs, client requests each ID individually; O(n) calls for n items; high latency proportional to list size.
**Cause:** REST designed around single resources; no include/nested endpoint; GraphQL without DataLoader.
**Solution:** `?include=related`. DataLoader for batching. `Include` in EF Core.

```typescript
// BEFORE: GET /api/orders → [{id:1},{id:2}...50] → GET /api/orders/1/items, GET /api/orders/2/items... 50 calls
// AFTER:  GET /api/orders?include=items → 1 API call, 2 DB queries
```

**Related:** Over-fetching, Chatty Service

## Tunnel Vision (Happy Path Only)

**Category:** API
**Symptoms:** HTTP 500 for every failure; no validation messages; client can't distinguish 404 from 403 from 400.
**Cause:** Only testing happy path; not designing for failure.
**Solution:** Proper HTTP codes (400, 401, 403, 404, 409, 422, 429). Structured error bodies.

```json
// BEFORE: POST /api/orders → HTTP 500 "Internal Server Error"
// AFTER:
HTTP 422
{
  "error": "VALIDATION_ERROR",
  "message": "Order total exceeds credit limit",
  "details": [{ "field": "total", "code": "CREDIT_LIMIT_EXCEEDED", "limit": 5000, "actual": 7500 }]
}
```

**Related:** REST Without HATEOAS

---

## Quick Reference

| Anti-Pattern | Category | Quick Fix | Detection |
|---|---|---|---|
| Big Ball of Mud | Architecture | Strangler Fig + layering | No module boundaries |
| Lava Flow | Architecture | Delete dead code | No callers, commented out |
| Stovepipe System | Architecture | Shared platform layer | Duplicated concerns |
| Golden Hammer | Architecture | Evaluate alternatives | Same tech everywhere |
| God Class | Architecture/OOP | Extract by SRP | >1000 lines, >20 methods |
| Poltergeist | Architecture | Inline the class | Delegation-only |
| Boat Anchor | Architecture | YAGNI — delete | Unused deps/config |
| Spaghetti Code | OOP | Extract + polymorphism | Deep nesting, long methods |
| Swiss Army Knife | OOP | Split by SRP | Many unrelated interfaces |
| Yo-Yo Problem | OOP | Composition > inheritance | Hierarchy > 3 levels |
| Circular Dependency | OOP | Depend on abstraction | A imports B imports A |
| Singleton Abuse | OOP | DI instead | `.Instance` everywhere |
| Base Bean | OOP | Composition | Inheriting for utils |
| Call Super | OOP | Template Method | Every override calls super |
| Feature Envy | OOP | Move method | More `.other.` than `.self.` |
| Anemic Domain Model | Enterprise | Rich domain model | Data bags, logic in services |
| Data God | Enterprise/Data | Split tables | 50+ column tables |
| Sequential Coupling | Enterprise | Builder/State | "call X before Y" |
| Temporal Coupling | Enterprise | Constructor init | `Thread.Sleep` hacks |
| Soft Coding | Enterprise | Code over config | Business logic in YAML |
| Inner Platform Effect | Enterprise | Use platform | Custom scripting engine |
| Cargo Cult | Enterprise | Understand the why | Patterns without reason |
| Thread Starvation | Concurrency | Fair locks | Low-pri threads never run |
| Deadlock | Concurrency | Consistent lock order | Threads hang |
| Race Condition | Concurrency | Atomic ops, locks | Intermittent bugs |
| Busy Wait | Concurrency | Events, semaphores | 100% CPU on idle |
| Lock Convoys | Concurrency | RW lock, sharding | All threads same lock |
| Distributed Monolith | Integration | Bounded contexts + events | Must deploy together |
| Shared Database | Integration | DB per service | Cross-service table access |
| Chatty Service | Integration | API composition, BFF | 10+ calls per operation |
| Orchestration Overuse | Integration | Choreography | Central brain service |
| ESB Overuse | Integration | Smart endpoints, dumb pipes | ESB is bottleneck |
| No API Gateway | Integration | Introduce gateway | Auth duplicated everywhere |
| Wrong Cut | Integration | Split by domain | Feature touches 3+ services |
| REST Without HATEOAS | API | Hypermedia links | Hardcoded client URLs |
| Over-fetching | API | Sparse fieldsets | 50 fields, 3 needed |
| Under-fetching (N+1) | API/Data | Include, DataLoader | N calls for N items |
| Tunnel Vision | API | Structured errors | Happy-path-only APIs |
