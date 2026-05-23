# GoF (Gang of Four) Design Patterns Reference

**Source:** *Design Patterns: Elements of Reusable Object-Oriented Software*
**Examples in:** C# / TypeScript

---

## Creational Patterns (5)

---

## Singleton

**Intent:** Ensure a class has exactly one instance and provide a global access point.

```
┌──────────────┐
│   Singleton   │
│ -instance     │
│ +GetInstance()│──> returns shared instance
│ +BusinessOp() │
└──────────────┘
```

**Use when:** Exactly one instance is needed (logging, cache, thread pool), global access must be controlled.

```csharp
public sealed class OrderNumberGenerator {
    private static readonly Lazy<OrderNumberGenerator> _instance =
        new(() => new OrderNumberGenerator());
    private int _counter;
    private OrderNumberGenerator() { }
    public static OrderNumberGenerator Instance => _instance.Value;
    public string Next(string prefix) =>
        $"{prefix}-{Interlocked.Increment(ref _counter):D6}";
}
// Usage: OrderNumberGenerator.Instance.Next("ORD")
```

| Pros | Cons |
|------|------|
| Controlled single instance, lazy init, thread-safe | Violates SRP, hard to test, overused |

**Relations:** Factory/Abstract Factory can return a Singleton. Facade often implemented as Singleton.

---

## Factory Method

**Intent:** Define an interface for creating an object, but let subclasses decide which class to instantiate.

```
┌──────────────┐      ┌──────────┐
│   Creator     │──>   │ Product  │
│ FactoryMethod│      │ Operation│
└──────┬───────┘      └────┬─────┘
  ┌────┴────┐              │
  │Concrete │        ┌─────┴──────┐
  │Creator  │        │ConcreteProduct│
  └─────────┘        └────────────┘
```

**Use when:** Class cannot anticipate objects it must create; subclass specifies the object.

```csharp
public abstract class PaymentProcessor {
    public abstract IPaymentMethod CreatePaymentMethod();
    public bool Process(decimal amount) => CreatePaymentMethod().Pay(amount);
}
public class CreditCardProcessor : PaymentProcessor {
    public override IPaymentMethod CreatePaymentMethod() => new CreditCard();
}
public class PayPalProcessor : PaymentProcessor {
    public override IPaymentMethod CreatePaymentMethod() => new PayPal();
}
public interface IPaymentMethod { bool Pay(decimal amount); }
public class CreditCard : IPaymentMethod {
    public bool Pay(decimal a) { Console.WriteLine($"Paid {a:C} via CC"); return true; }
}
public class PayPal : IPaymentMethod {
    public bool Pay(decimal a) { Console.WriteLine($"Paid {a:C} via PayPal"); return true; }
}
```

| Pros | Cons |
|------|------|
| Avoids tight coupling to concrete classes, OCP | Many subclasses, parallel hierarchy |

**Relations:** Template Method is a specialization. Abstract Factory uses Factory Methods.

---

## Abstract Factory

**Intent:** Provide an interface for creating families of related or dependent objects without specifying concrete classes.

```
┌──────────────┐     ┌──────────────┐
│AbstractFactory│     │AbstractProduct│
│ CreateA()     │     └──────┬───────┘
│ CreateB()     │            │
└──────┬───────┘       ┌────┴────┐
  ┌────┴────┐     ┌──────┐ ┌──────┐
  │Concrete │     │ Prod │ │ Prod │
  │Factory  │     │  A1  │ │  A2  │
  └─────────┘     └──────┘ └──────┘
```

**Use when:** System works with multiple product families; products must be used together.

```csharp
public interface IOrderFactory {
    IInvoice CreateInvoice(); IShipment CreateShipment();
}
public class DomesticFactory : IOrderFactory {
    public IInvoice CreateInvoice() => new DomesticInvoice();
    public IShipment CreateShipment() => new StandardShipping();
}
public class InternationalFactory : IOrderFactory {
    public IInvoice CreateInvoice() => new IntlInvoice();
    public IShipment CreateShipment() => new ExpressShipping();
}
public interface IInvoice { string Generate(); }
public class DomesticInvoice : IInvoice { public string Generate() => "Domestic VAT"; }
public class IntlInvoice : IInvoice { public string Generate() => "Intl customs"; }
public interface IShipment { string Track(); }
public class StandardShipping : IShipment { public string Track() => "5-7 days"; }
public class ExpressShipping : IShipment { public string Track() => "1-2 days"; }
// Client
public class OrderService {
    private readonly IOrderFactory _f;
    public OrderService(IOrderFactory f) => _f = f;
    public void Process() { Console.WriteLine(_f.CreateInvoice().Generate()); }
}
```

| Pros | Cons |
|------|------|
| Product family compatibility, isolates concrete classes | Adding products = extend all factories |

**Relations:** Implemented with Factory Methods. Concrete factory is often a Singleton.

---

## Builder

**Intent:** Separate construction of a complex object from its representation so the same process creates different representations.

```
┌──────────┐     ┌──────────┐
│ Director  │──>  │ Builder  │
│ Construct │     │ BuildA() │
└──────────┘     │ BuildB() │
                 │ GetRes() │
                 └────┬─────┘
                      │
                 ┌────┴────┐
                 │Concrete │
                 │Builder  │
                 └─────────┘
```

**Use when:** Complex construction with multiple/varying steps; same process → different products.

```csharp
public class Order {
    public List<string> Items = new();
    public string? ShippingAddress, DiscountCode, Note;
    public bool GiftWrap;
}
public interface IOrderBuilder {
    IOrderBuilder AddItem(string sku, int qty);
    IOrderBuilder SetShipping(string address);
    IOrderBuilder ApplyDiscount(string code);
    IOrderBuilder SetGiftWrap(bool wrap);
    Order Build();
}
public class OrderBuilder : IOrderBuilder {
    private Order _o = new();
    public IOrderBuilder AddItem(string sku, int qty) { _o.Items.Add($"{sku}x{qty}"); return this; }
    public IOrderBuilder SetShipping(string a) { _o.ShippingAddress = a; return this; }
    public IOrderBuilder ApplyDiscount(string c) { _o.DiscountCode = c; return this; }
    public IOrderBuilder SetGiftWrap(bool w) { _o.GiftWrap = w; return this; }
    public Order Build() => _o;
}
// Usage: new OrderBuilder().AddItem("A",1).SetShipping("123 St").Build();
```

| Pros | Cons |
|------|------|
| Step-by-step API, isolates construction, fluent | Separate builder class per product |

**Relations:** Builder builds Composite trees. Abstract Factory returns families; Builder constructs stepwise.

---

## Prototype

**Intent:** Specify kinds of objects to create using a prototypical instance, create new by copying.

```
┌──────────────┐
│   Prototype   │
│ +Clone()      │
└──────┬───────┘
  ┌────┴────┐
  │Concrete │
  │Prototype│
  └─────────┘
```

**Use when:** Classes instantiated at runtime; expensive creation; few state combinations.

```typescript
interface IPrototype<T> { clone(): T; }
class InvoiceLine implements IPrototype<InvoiceLine> {
  constructor(public sku: string, public qty: number, public price: number) {}
  clone(): InvoiceLine { return new InvoiceLine(this.sku, this.qty, this.price); }
}
class Invoice implements IPrototype<Invoice> {
  constructor(public id: string, public customer: string, public lines: InvoiceLine[]) {}
  clone(): Invoice { return new Invoice(this.id, this.customer, this.lines.map(l => l.clone())); }
}
// Usage: const tpl = new Invoice("TMPL","Acme",[new InvoiceLine("A",1,100)]);
// const inv = tpl.clone(); inv.id = "INV-001"; inv.customer = "Globex";
```

| Pros | Cons |
|------|------|
| Clone without depending on concrete classes, less boilerplate | Deep copy complexity, must maintain clone() |

**Relations:** Alternative to Factory Method (clone vs. new). Composite often uses Prototype for tree copying.

---

## Structural Patterns (7)

---

## Adapter

**Intent:** Convert interface of a class into another clients expect.

```
 Client ──> Target ──> Adapter ──> Adaptee
```

**Use when:** Existing class with wrong interface; wrapping legacy/third-party code.

```csharp
public interface IPaymentGateway { bool Charge(decimal amount, string currency); }
public class LegacyProvider {
    public bool MakePayment(double cents) { Console.WriteLine($"Legacy: {cents} cents"); return true; }
}
public class LegacyAdapter : IPaymentGateway {
    private readonly LegacyProvider _p = new();
    public bool Charge(decimal amount, string currency) => _p.MakePayment((double)(amount * 100));
}
// Usage: new LegacyAdapter().Charge(49.99m, "USD");
```

| Pros | Cons |
|------|------|
| Reuses existing code, SRP, OCP | Extra indirection layer |

**Relations:** Adapter wraps one class; Facade wraps subsystem. Bridge is designed upfront; Adapter retrofits.

---

## Bridge

**Intent:** Decouple abstraction from implementation so both can vary independently.

```
Abstraction ──> Implementor
    │                │
 Refined        ConcreteImpls
```

**Use when:** Avoid permanent binding; both hierarchies independently extensible.

```typescript
interface NotificationSender { send(msg: string): void; }
class EmailSender implements NotificationSender {
  send(msg: string): void { console.log(`[Email] ${msg}`); }
}
class SlackSender implements NotificationSender {
  send(msg: string): void { console.log(`[Slack] ${msg}`); }
}
abstract class Notification {
  constructor(protected sender: NotificationSender) {}
  abstract notify(title: string, body: string): void;
}
class OrderNotification extends Notification {
  notify(title: string, body: string): void { this.sender.send(`[Order] ${title}: ${body}`); }
}
// Usage: new OrderNotification(new SlackSender()).notify("Shipped", "#1234");
```

| Pros | Cons |
|------|------|
| Decouples interface/implementation, OCP for both | More classes, must design upfront |

**Relations:** Similar to Strategy structure; Bridge links abstraction/implementation, Strategy links algorithm.

---

## Composite

**Intent:** Compose objects into tree structures, treat individuals and compositions uniformly.

```
Component ─┬─ Leaf
           └─ Composite (contains Components)
```

**Use when:** Part-whole hierarchies; uniform treatment (UI trees, file systems, org charts).

```typescript
abstract class OrderComponent {
  abstract getTotal(): number;
  abstract getName(): string;
}
class Product extends OrderComponent {
  constructor(private name: string, private price: number) { super(); }
  getTotal(): number { return this.price; }
  getName(): string { return this.name; }
}
class Bundle extends OrderComponent {
  private items: OrderComponent[] = [];
  constructor(private name: string) { super(); }
  add(item: OrderComponent): void { this.items.push(item); }
  getTotal(): number { return this.items.reduce((s, i) => s + i.getTotal(), 0); }
  getName(): string { return this.name; }
}
// Usage: new Bundle("Bundle").add(new Product("Laptop",1200)).getTotal();
```

| Pros | Cons |
|------|------|
| Uniform client treatment, easy to add types | Hard to restrict children, LSP issues with Leaf |

**Relations:** Visitor operates on Composite trees. Decorator has similar recursive structure.

---

## Decorator

**Intent:** Attach additional responsibilities to an object dynamically, alternative to subclassing.

```
Component ─┬─ ConcreteComponent
           └─ Decorator (wraps Component)
                └─ ConcreteDecorators
```

**Use when:** Dynamic extensions, too many subclass combinations, sealed/final classes.

```typescript
interface IOrder { getDescription(): string; getTotal(): number; }
class BaseOrder implements IOrder {
  constructor(private total: number) {}
  getDescription(): string { return "Order"; }
  getTotal(): number { return this.total; }
}
abstract class OrderDecorator implements IOrder {
  constructor(protected order: IOrder) {}
  abstract getDescription(): string;
  abstract getTotal(): number;
}
class GiftWrapDecorator extends OrderDecorator {
  getDescription(): string { return `${this.order.getDescription()} + Gift Wrap`; }
  getTotal(): number { return this.order.getTotal() + 5.99; }
}
class InsuranceDecorator extends OrderDecorator {
  getDescription(): string { return `${this.order.getDescription()} + Insurance`; }
  getTotal(): number { return this.order.getTotal() + 3.99; }
}
// Usage: new InsuranceDecorator(new GiftWrapDecorator(new BaseOrder(100))).getTotal() // 109.98
```

| Pros | Cons |
|------|------|
| Flexible, SRP, composable at runtime | Many small classes, decorator order matters |

**Relations:** Adapter changes interface; Decorator keeps interface. Like degenerate Composite (1 child).

---

## Facade

**Intent:** Provide a unified interface to a set of subsystem interfaces.

```
 Client ──> Facade ──> Subsystem classes
```

**Use when:** Complex subsystem; decouple clients; layer subsystem entry points.

```csharp
public class OrderFacade {
    private readonly InventoryService _inv = new();
    private readonly PaymentService _pay = new();
    private readonly EmailService _email = new();

    public string PlaceOrder(string customerId, string email, string sku, int qty) {
        _inv.Reserve(sku, qty);
        _pay.Charge(customerId, qty * 99.99m);
        _email.SendConfirmation(email, "ORD-001");
        return "ORD-001";
    }
}
class InventoryService { public void Reserve(string s, int q) => Console.WriteLine($"Reserved {q}x{s}"); }
class PaymentService { public bool Charge(string c, decimal a) { Console.WriteLine($"Charged {c} ${a}"); return true; } }
class EmailService { public void SendConfirmation(string e, string o) => Console.WriteLine($"Email to {e}"); }
```

| Pros | Cons |
|------|------|
| Simplifies usage, reduces coupling, promotes layering | Can become god object, doesn't block direct subsystem use |

**Relations:** Often Singleton. Facade abstracts subsystem; Mediator centralizes colleague communication.

---

## Flyweight

**Intent:** Share fine-grained objects efficiently; separate intrinsic (shared) from extrinsic state.

**Use when:** Many similar objects causing memory issues; most state can be extrinsic.

```typescript
class ProductVariant {
  constructor(public sku: string, public name: string, public basePrice: number) {}
}
class VariantFactory {
  private cache = new Map<string, ProductVariant>();
  get(sku: string, name: string, price: number): ProductVariant {
    if (!this.cache.has(sku)) this.cache.set(sku, new ProductVariant(sku, name, price));
    return this.cache.get(sku)!;
  }
}
class OrderLine {
  constructor(public variant: ProductVariant, public qty: number, public price: number) {}
  get total() { return this.price * this.qty; }
}
// Usage: 1000 OrderLines can share 3 ProductVariants
```

| Pros | Cons |
|------|------|
| Reduces memory, centralizes state management | Complexity separating intrinsic/extrinsic state |

**Relations:** Composite + Flyweight → shared leaf nodes. Factory is often a Singleton.

---

## Proxy

**Intent:** Provide a surrogate to control access to another object.

```
 Subject ─┬─ RealSubject
          └─ Proxy (controls access to RealSubject)
```

**Use when:** Lazy loading, access control, logging, caching, remote representation.

```typescript
interface IOrderService { getOrder(id: string): string; }
class RealOrderService implements IOrderService {
  getOrder(id: string): string { return `Order ${id}: data`; }
}
class CachedOrderProxy implements IOrderService {
  private cache = new Map<string, string>();
  constructor(private real: IOrderService) {}
  getOrder(id: string): string {
    if (!this.cache.has(id)) this.cache.set(id, this.real.getOrder(id));
    return this.cache.get(id)!;
  }
}
class AuthProxy implements IOrderService {
  constructor(private real: IOrderService, private role: string) {}
  getOrder(id: string): string {
    if (this.role !== "admin") throw new Error("Denied");
    return this.real.getOrder(id);
  }
}
```

| Pros | Cons |
|------|------|
| Controls access, lazy init, adds logging transparently | Indirection layer, may increase latency |

**Relations:** Same structure as Decorator; Proxy controls access, Decorator adds behavior.

---

## Behavioral Patterns (11)

---

## Chain of Responsibility

**Intent:** Pass request along a chain of handlers; each handler decides to process or pass.

```
 Handler1 ──> Handler2 ──> Handler3 (chain)
```

**Use when:** Multiple handlers, handler unknown at compile time; dynamic handler set.

```typescript
abstract class OrderHandler {
  protected next?: OrderHandler;
  setNext(h: OrderHandler): OrderHandler { this.next = h; return h; }
  handle(ctx: { errors: string[]; ok: boolean }): void {
    if (this.next) this.next.handle(ctx);
  }
}
class ValidationHandler extends OrderHandler {
  handle(ctx: any): void { if (!ctx.valid) ctx.errors.push("Invalid"); super.handle(ctx); }
}
class FraudHandler extends OrderHandler {
  handle(ctx: any): void { if (ctx.fraud) ctx.errors.push("Fraud"); super.handle(ctx); }
}
class ShippingHandler extends OrderHandler {
  handle(ctx: any): void { if (!ctx.errors.length) { ctx.shipped = true; console.log("Shipped!"); } }
}
// Usage: new ValidationHandler().setNext(new FraudHandler()).setNext(new ShippingHandler()).handle(ctx);
```

| Pros | Cons |
|------|------|
| Decouples sender/receiver, SRP, OCP, dynamic chain | Unhandled requests, debugging chain is hard |

**Relations:** Similar to Decorator — COR passes requests, Decorator adds responsibilities.

---

## Command

**Intent:** Encapsulate a request as an object, enabling parameterization, queuing, undo/redo.

```
 Client ──> Invoker ──> Command ──> Receiver
```

**Use when:** Parameterize actions, queue/log requests, undo/redo, transactional behavior.

```typescript
interface ICommand { execute(): void; undo(): void; }
class Order { public items: string[] = []; }
class AddItemCommand implements ICommand {
  private prev: string[] = [];
  constructor(private o: Order, private sku: string) {}
  execute(): void { this.prev = [...this.o.items]; this.o.items.push(this.sku); }
  undo(): void { this.o.items = this.prev; }
}
class RemoveItemCommand implements ICommand {
  private prev: string[] = [];
  constructor(private o: Order, private sku: string) {}
  execute(): void { this.prev = [...this.o.items]; this.o.items = this.o.items.filter(i => i !== this.sku); }
  undo(): void { this.o.items = this.prev; }
}
class Invoker {
  private history: ICommand[] = [];
  execute(c: ICommand): void { c.execute(); this.history.push(c); }
  undo(): void { this.history.pop()?.undo(); }
}
```

| Pros | Cons |
|------|------|
| Decouples invoker/receiver, undo/redo, queuing | Many command classes, state management for undo |

**Relations:** Composite — macro commands. Memento — saves state for undo.

---

## Interpreter

**Intent:** Define grammar representation + interpreter for sentences in the language.

**Use when:** Simple stable grammar; DSL expressed as AST; efficiency is secondary.

```typescript
interface Expression { interpret(ctx: Map<string, number>): number; }
class Num implements Expression {
  constructor(private v: number) {}
  interpret(_: any): number { return this.v; }
}
class Var implements Expression {
  constructor(private n: string) {}
  interpret(ctx: Map<string, number>): number { return ctx.get(this.n) ?? 0; }
}
class Add implements Expression {
  constructor(private l: Expression, private r: Expression) {}
  interpret(ctx: Map<string, number>): number { return this.l.interpret(ctx) + this.r.interpret(ctx); }
}
class Pct implements Expression {
  constructor(private e: Expression, private p: Expression) {}
  interpret(ctx: Map<string, number>): number { return this.e.interpret(ctx) * this.p.interpret(ctx) / 100; }
}
// Discount DSL: parse("subtotal 10 %")
function parse(expr: string): Expression {
  const t = expr.split(" "), s: Expression[] = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "+") { const r = s.pop()!, l = s.pop()!; s.push(new Add(l, r)); }
    else if (t[i] === "%") { const p = s.pop()!, v = s.pop()!; s.push(new Pct(v, p)); }
    else if (/^\d+$/.test(t[i])) s.push(new Num(parseInt(t[i])));
    else s.push(new Var(t[i]));
  }
  return s.pop()!;
}
// Usage: parse("subtotal 10 %").interpret(new Map([["subtotal", 200]])) // 20
```

| Pros | Cons |
|------|------|
| Easy to extend grammar, OO representation | Class per rule, inefficient for large grammars |

**Relations:** AST is a Composite. Visitor defines operations on AST without changing classes.

---

## Iterator

**Intent:** Access elements of an aggregate sequentially without exposing representation.

```
 Aggregate ──> Iterator (First, Next, IsDone, Current)
```

**Use when:** Multiple traversals, uniform interface over different collections.

```typescript
interface IIterator<T> { current(): T; next(): T; hasNext(): boolean; }
class OrderHistory {
  private orders: string[] = [];
  add(o: string): void { this.orders.push(o); }
  createIterator(): IIterator<string> { return new OrderIterator(this.orders); }
  createReverseIterator(): IIterator<string> { return new ReverseIterator(this.orders); }
}
class OrderIterator implements IIterator<string> {
  private i = 0;
  constructor(private o: string[]) {}
  current(): string { return this.o[this.i]; }
  next(): string { return this.o[++this.i]; }
  hasNext(): boolean { return this.i < this.o.length - 1; }
}
class ReverseIterator implements IIterator<string> {
  private i: number;
  constructor(private o: string[]) { this.i = o.length - 1; }
  current(): string { return this.o[this.i]; }
  next(): string { return this.o[--this.i]; }
  hasNext(): boolean { return this.i > 0; }
}
```

| Pros | Cons |
|------|------|
| SRP (separates traversal), multiple traversals, uniform | Only useful for complex collections |

**Relations:** Iterates over Composite trees. Factory Method creates Iterator instances.

---

## Mediator

**Intent:** Define an object that encapsulates how a set of objects interact, promoting loose coupling.

```
 Colleagues ──> Mediator <── Colleagues
```

**Use when:** Complex many-to-many interactions; reusable colleagues.

```csharp
public interface IOrderMediator { void Notify(object sender, string evt); }
public class OrderMediator : IOrderMediator {
    private InventoryHandler? _inv; private PaymentHandler? _pay;
    private ShippingHandler? _ship; private EmailHandler? _email;
    public void Register(PaymentHandler h) => _pay = h;
    public void Register(InventoryHandler h) => _inv = h;
    public void Notify(object sender, string evt) {
        if (evt == "placed") { _inv?.Reserve(); _pay?.Process(); }
        if (evt == "paid") { _ship?.CreateLabel(); _email?.Send(); }
    }
}
public abstract class Colleague {
    protected IOrderMediator Mediator;
    protected Colleague(IOrderMediator m) => Mediator = m;
}
public class PaymentHandler : Colleague {
    public PaymentHandler(IOrderMediator m) : base(m) { }
    public void Process() => Mediator.Notify(this, "paid");
}
public class InventoryHandler : Colleague {
    public InventoryHandler(IOrderMediator m) : base(m) { }
    public void Reserve() => Console.WriteLine("Reserved");
}
```

| Pros | Cons |
|------|------|
| Reduces coupling, centralizes control, reusable colleagues | Mediator can become god object |

**Relations:** Mediator centralizes communication; Facade provides unified interface. Mediator can use Observer.

---

## Memento

**Intent:** Capture & externalize object's internal state without violating encapsulation so it can be restored.

```
 Originator ──> Memento <── Caretaker
```

**Use when:** Snapshots for undo/rollback; direct state exposure breaks encapsulation.

```typescript
class OrderMemento {
  constructor(public items: readonly string[], public status: string, public total: number) {}
}
class Order {
  private items: string[] = []; private status = "draft"; private total = 0;
  addItem(sku: string, price: number): void { this.items.push(sku); this.total += price; }
  submit(): void { this.status = "submitted"; }
  save(): OrderMemento { return new OrderMemento([...this.items], this.status, this.total); }
  restore(m: OrderMemento): void { this.items = [...m.items]; this.status = m.status; this.total = m.total; }
}
class Caretaker {
  private snapshots: OrderMemento[] = [];
  constructor(private o: Order) {}
  backup(): void { this.snapshots.push(this.o.save()); }
  undo(): void { const m = this.snapshots.pop(); if (m) this.o.restore(m); }
}
// Usage: new Caretaker(order).backup(); order.addItem("A", 100); caretaker.undo();
```

| Pros | Cons |
|------|------|
| Preserves encapsulation, simplifies originator | Memory-heavy for large states |

**Relations:** Command stores state via Memento for undo. Iterator can capture position via Memento.

---

## Observer

**Intent:** Define one-to-many dependency; when one object changes, all dependents notified.

```
 Subject ──> Observers (1:N)
```

**Use when:** Object change requires updating unknown number of others.

```typescript
interface IObserver { update(orderId: string, status: string): void; }
class OrderSubject {
  private observers: IObserver[] = [];
  private status = "pending";
  attach(o: IObserver): void { this.observers.push(o); }
  detach(o: IObserver): void { this.observers = this.observers.filter(x => x !== o); }
  private notify(id: string): void { this.observers.forEach(o => o.update(id, this.status)); }
  updateStatus(id: string, s: string): void { this.status = s; this.notify(id); }
}
class EmailNotifier implements IObserver {
  update(id: string, s: string): void { console.log(`[Email] ${id}: ${s}`); }
}
class SmsNotifier implements IObserver {
  update(id: string, s: string): void { console.log(`[SMS] ${id}: ${s}`); }
}
// Usage: subject.attach(new EmailNotifier()); subject.updateStatus("ORD-1", "shipped");
```

| Pros | Cons |
|------|------|
| Loose coupling, broadcast, OCP (new observers) | Random notification order, memory leaks if not detached |

**Relations:** Mediator uses Observer for coordination. Event bus is often a Singleton.

---

## State

**Intent:** Allow an object to alter its behavior when its internal state changes.

```
 Context ──> State (interface)
                │
            ConcreteStates (Draft, Submitted, Paid, Shipped...)
```

**Use when:** Behavior depends on state; state-specific conditionals dominate.

```typescript
interface IOrderState { next(o: OrderContext): void; cancel(o: OrderContext): void; }
class OrderContext {
  private state: IOrderState = new DraftState();
  setState(s: IOrderState): void { this.state = s; }
  next(): void { this.state.next(this); }
  cancel(): void { this.state.cancel(this); }
}
class DraftState implements IOrderState {
  next(o: OrderContext): void { o.setState(new SubmittedState()); }
  cancel(o: OrderContext): void { o.setState(new CancelledState()); }
}
class SubmittedState implements IOrderState {
  next(o: OrderContext): void { o.setState(new PaidState()); }
  cancel(o: OrderContext): void { o.setState(new CancelledState()); }
}
class PaidState implements IOrderState {
  next(o: OrderContext): void { o.setState(new ShippedState()); }
  cancel(o: OrderContext): void { o.setState(new RefundState()); }
}
class ShippedState implements IOrderState {
  next(o: OrderContext): void { o.setState(new DeliveredState()); }
  cancel(_: OrderContext): void { console.log("Can't cancel shipped"); }
}
class DeliveredState implements IOrderState {
  next(_: OrderContext): void {}
  cancel(_: OrderContext): void { console.log("Already delivered"); }
}
class CancelledState implements IOrderState {
  next(_: OrderContext): void {}
  cancel(_: OrderContext): void { console.log("Already cancelled"); }
}
class RefundState implements IOrderState {
  next(o: OrderContext): void { o.setState(new CancelledState()); }
  cancel(_: OrderContext): void {}
}
```

| Pros | Cons |
|------|------|
| SRP, OCP (new states easy), removes conditionals | Overkill for few states, states must know each other |

**Relations:** Same structure as Strategy; State transitions are internal, Strategy selected by client.

---

## Strategy

**Intent:** Define a family of algorithms, encapsulate each, and make them interchangeable.

```
 Context ──> Strategy
                │
            ConcreteStrategies
```

**Use when:** Multiple algorithm variants; avoid large conditionals.

```typescript
interface IDiscountStrategy { calculate(subtotal: number): number; }
class NoDiscount implements IDiscountStrategy { calculate(s: number): number { return 0; } }
class PercentageDiscount implements IDiscountStrategy {
  constructor(private pct: number) {}
  calculate(s: number): number { return s * this.pct / 100; }
}
class TieredDiscount implements IDiscountStrategy {
  calculate(s: number): number {
    if (s > 1000) return s * 0.15;
    if (s > 500) return s * 0.10;
    if (s > 100) return s * 0.05;
    return 0;
  }
}
class Order {
  constructor(private strategy: IDiscountStrategy) {}
  setStrategy(s: IDiscountStrategy): void { this.strategy = s; }
  total(subtotal: number): number { return subtotal - this.strategy.calculate(subtotal); }
}
// Usage: new Order(new PercentageDiscount(10)).total(200) // 180
```

| Pros | Cons |
|------|------|
| Algorithms swapped at runtime, SRP, OCP, no conditionals | Client must know strategies, overkill for few |

**Relations:** State has same structure; Strategy selected by client, State transitions internally.

---

## Template Method

**Intent:** Define algorithm skeleton in an operation, deferring steps to subclasses.

```
 AbstractClass ──> TemplateMethod() calls primitive ops + hooks
       │
 ConcreteClass ──> implements primitives, optionally overrides hooks
```

**Use when:** Invariant algorithm with variant steps; avoid code duplication.

```typescript
abstract class OrderProcessor {
  processOrder(id: string): void {
    this.validate(id);
    this.reserveInventory(id);
    this.processPayment(id);
    if (this.shouldNotify()) this.sendNotification(id);
    this.complete(id);
  }
  protected abstract validate(id: string): void;
  protected abstract processPayment(id: string): void;
  protected reserveInventory(id: string): void { console.log(`Reserved ${id}`); }
  protected shouldNotify(): boolean { return true; }
  protected sendNotification(id: string): void { console.log(`Notified ${id}`); }
  protected complete(id: string): void { console.log(`Completed ${id}`); }
}
class StandardProcessor extends OrderProcessor {
  protected validate(id: string): void { console.log(`Standard validation ${id}`); }
  protected processPayment(id: string): void { console.log(`CC payment ${id}`); }
}
class PrepaidProcessor extends OrderProcessor {
  protected validate(id: string): void { console.log(`Skip validation ${id}`); }
  protected processPayment(id: string): void { console.log(`Prepaid ${id}`); }
  protected shouldNotify(): boolean { return false; }
}
```

| Pros | Cons |
|------|------|
| Eliminates duplication, inversion of control, hooks | Skeleton is fixed, many abstract methods burdensome |

**Relations:** Factory Method is a specialized Template Method. Strategy uses composition; Template Method uses inheritance.

---

## Visitor

**Intent:** Represent an operation on elements of an object structure, letting you define new operations without changing element classes.

```
 Visitor ──> visit(ConcreteElement)
 Element ──> accept(Visitor)
```

**Use when:** Stable element classes but frequently added operations.

```typescript
interface OrderVisitor {
  visitProduct(p: ProductElem): void;
  visitBundle(b: BundleElem): void;
}
interface OrderElement { accept(v: OrderVisitor): void; }
class ProductElem implements OrderElement {
  constructor(public sku: string, public price: number, public weight: number) {}
  accept(v: OrderVisitor): void { v.visitProduct(this); }
}
class BundleElem implements OrderElement {
  constructor(public name: string, public items: OrderElement[]) {}
  accept(v: OrderVisitor): void { v.visitBundle(this); this.items.forEach(i => i.accept(v)); }
}
class TotalVisitor implements OrderVisitor {
  total = 0;
  visitProduct(p: ProductElem): void { this.total += p.price; }
  visitBundle(_: BundleElem): void {}
}
class XmlVisitor implements OrderVisitor {
  private parts: string[] = [];
  visitProduct(p: ProductElem): void { this.parts.push(`<product sku="${p.sku}" />`); }
  visitBundle(b: BundleElem): void { this.parts.push(`<bundle name="${b.name}" />`); }
  getResult(): string { return `<order>${this.parts.join("")}</order>`; }
}
// Usage: order.accept(new TotalVisitor()); // .total
```

| Pros | Cons |
|------|------|
| SRP, OCP for operations, related ops grouped | Adding Element class changes all Visitors, double dispatch |

**Relations:** Visitor traverses Composite trees. Interpreter AST uses Visitor for operations.

---

## Quick Summary Table

| # | Pattern | Type | Intent |
|---|---------|------|--------|
| 1 | **Singleton** | Creational | Ensure one instance, global access point |
| 2 | **Factory Method** | Creational | Subclass decides which class to instantiate |
| 3 | **Abstract Factory** | Creational | Families of related products |
| 4 | **Builder** | Creational | Construct complex objects step by step |
| 5 | **Prototype** | Creational | Clone instances |
| 6 | **Adapter** | Structural | Convert interface to another |
| 7 | **Bridge** | Structural | Decouple abstraction from implementation |
| 8 | **Composite** | Structural | Tree structure of part-whole hierarchies |
| 9 | **Decorator** | Structural | Add behavior without modifying class |
| 10 | **Facade** | Structural | Unified interface to subsystem |
| 11 | **Flyweight** | Structural | Share fine-grained objects efficiently |
| 12 | **Proxy** | Structural | Surrogate controls access to another object |
| 13 | **Chain of Responsibility** | Behavioral | Pass request along handler chain |
| 14 | **Command** | Behavioral | Encapsulate request as object (undo/redo) |
| 15 | **Interpreter** | Behavioral | Define grammar, interpret sentences |
| 16 | **Iterator** | Behavioral | Sequential access to collection elements |
| 17 | **Mediator** | Behavioral | Centralize complex communication |
| 18 | **Memento** | Behavioral | Capture/restore object state |
| 19 | **Observer** | Behavioral | One-to-many change notification |
| 20 | **State** | Behavioral | Alter behavior when state changes |
| 21 | **Strategy** | Behavioral | Select algorithm at runtime |
| 22 | **Template Method** | Behavioral | Algorithm skeleton with variant steps |
| 23 | **Visitor** | Behavioral | Separate algorithm from object structure |
