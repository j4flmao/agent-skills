# Behavioral Design Patterns

Behavioral patterns organize responsibilities and communication between objects: who decides, who reacts, and how requests travel. This reference gives a selection table, idiomatic TypeScript implementations for the patterns most used in backend code, and the modern alternatives that often replace them (first-class functions, events, state machines).

## Selection Table

| Problem | Pattern | Lighter alternative |
|---------|---------|---------------------|
| Swap an algorithm at runtime (pricing, routing, retry policy) | Strategy | Pass a function |
| Notify many dependents of a change | Observer | Event emitter / domain events |
| Encapsulate a request (queue, undo, audit, retry) | Command | Serializable message object |
| Behaviour depends on lifecycle state | State | Explicit state machine (transition table) |
| Pass a request through handlers until one handles it | Chain of Responsibility | Middleware pipeline |
| Fixed algorithm skeleton with variable steps | Template Method | Higher-order function with hooks |
| Many objects talking to each other | Mediator | Message bus / orchestrator |
| Operations over a closed type hierarchy | Visitor | Discriminated unions + exhaustive `switch` |
| Snapshot and restore state | Memento | Immutable values / event sourcing |
| Sequential access to a collection | Iterator | Language iterators / generators |

## Strategy

```ts
export interface ShippingStrategy {
  quote(order: Order): Money
}

export const flatRate = (amount: Money): ShippingStrategy => ({ quote: () => amount })

export const byWeight = (perKg: Money): ShippingStrategy => ({
  quote: (order) => perKg.times(order.totalWeightKg),
})

export class Checkout {
  constructor(private readonly shipping: ShippingStrategy) {}

  total(order: Order): Money {
    return order.subtotal.plus(this.shipping.quote(order))
  }
}

const strategies: Record<ShippingMethod, ShippingStrategy> = {
  standard: byWeight(Money.of('2.50', 'EUR')),
  express: flatRate(Money.of('15.00', 'EUR')),
}
```

Use when there are several interchangeable algorithms selected by configuration or input. A map of strategies replaces `switch` blocks that grow with each new variant.

## Observer / Domain Events

```ts
type Handler<E> = (event: E) => Promise<void>

export class EventBus<Events extends Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Handler<Events[K]>[] } = {}

  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    const list = (this.handlers[type] ??= [])
    list.push(handler)
    return () => { this.handlers[type] = list.filter((h) => h !== handler) }
  }

  async emit<K extends keyof Events>(type: K, event: Events[K]): Promise<void> {
    const results = await Promise.allSettled((this.handlers[type] ?? []).map((h) => h(event)))
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failures.length > 0) {
      throw new AggregateError(failures.map((f) => f.reason), `${failures.length} handler(s) failed for ${String(type)}`)
    }
  }
}

type DomainEvents = { OrderPaid: { orderId: string; amount: number } }
const bus = new EventBus<DomainEvents>()
bus.on('OrderPaid', async (e) => sendReceipt(e.orderId))
```

In-process observers share the publisher's failure and transaction scope. When handlers must run reliably after a database commit or in other services, publish through a transactional outbox and a message broker instead.

## Command

```ts
export interface Command<R = void> {
  readonly type: string
  readonly idempotencyKey: string
  execute(ctx: AppContext): Promise<R>
}

export class RefundPayment implements Command<RefundId> {
  readonly type = 'RefundPayment'
  constructor(readonly idempotencyKey: string, readonly paymentId: string, readonly amount: Money) {}

  execute(ctx: AppContext): Promise<RefundId> {
    return ctx.payments.refund(this.paymentId, this.amount, { idempotencyKey: this.idempotencyKey })
  }
}

export class CommandBus {
  constructor(private readonly ctx: AppContext, private readonly audit: AuditLog) {}

  async dispatch<R>(cmd: Command<R>): Promise<R> {
    await this.audit.record(cmd.type, cmd.idempotencyKey)
    return cmd.execute(this.ctx)
  }
}
```

Commands make requests storable (queues, retries, audit). CQRS command handlers are the service-level form of this pattern.

## State (as an explicit state machine)

```ts
type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled'
type OrderEvent = 'pay' | 'ship' | 'cancel'

const transitions: Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>> = {
  pending: { pay: 'paid', cancel: 'cancelled' },
  paid: { ship: 'shipped', cancel: 'cancelled' },
  shipped: {},
  cancelled: {},
}

export function transition(current: OrderStatus, event: OrderEvent): OrderStatus {
  const next = transitions[current][event]
  if (!next) throw new Error(`Invalid transition: ${event} from ${current}`)
  return next
}
```

A transition table is easier to review and test than polymorphic state classes. Use classic State objects when each state has substantial distinct behaviour. Persist status with a database `CHECK` constraint and update with a guarded `UPDATE ... WHERE status = $expected` to avoid concurrent invalid transitions.

## Chain of Responsibility (middleware)

```ts
type Middleware<C> = (ctx: C, next: () => Promise<void>) => Promise<void>

export function compose<C>(middlewares: Middleware<C>[]): (ctx: C) => Promise<void> {
  return (ctx) => {
    const run = (i: number): Promise<void> =>
      i < middlewares.length ? middlewares[i](ctx, () => run(i + 1)) : Promise.resolve()
    return run(0)
  }
}

const pipeline = compose<RequestCtx>([requestId, authenticate, rateLimit, validateBody, handle])
```

Each handler either handles, short-circuits (e.g. returns 401), or delegates. HTTP frameworks (Express, Koa, Hono, ASP.NET Core) are built on this pattern.

## Template Method vs Hooks

```ts
// Template method via composition: fixed skeleton, injected steps
export async function runImport<T>(steps: {
  fetch: () => AsyncIterable<unknown>
  parse: (raw: unknown) => T
  validate: (item: T) => void
  save: (batch: T[]) => Promise<void>
}, batchSize = 500): Promise<number> {
  let batch: T[] = []
  let count = 0
  for await (const raw of steps.fetch()) {
    const item = steps.parse(raw)
    steps.validate(item)
    batch.push(item)
    if (batch.length === batchSize) { await steps.save(batch); count += batch.length; batch = [] }
  }
  if (batch.length) { await steps.save(batch); count += batch.length }
  return count
}
```

Prefer this over abstract base classes: no inheritance hierarchy, each step testable alone.

## Visitor vs Discriminated Unions

```ts
type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'add'; left: Expr; right: Expr }
  | { kind: 'mul'; left: Expr; right: Expr }

function evaluate(e: Expr): number {
  switch (e.kind) {
    case 'num': return e.value
    case 'add': return evaluate(e.left) + evaluate(e.right)
    case 'mul': return evaluate(e.left) * evaluate(e.right)
    default: { const unreachable: never = e; throw new Error(`Unhandled expr ${JSON.stringify(unreachable)}`) }
  }
}
```

In languages with sum types and exhaustiveness checks (TypeScript, Rust, Kotlin sealed classes, Java sealed interfaces with pattern matching), this replaces Visitor for closed hierarchies.

## Mediator

Use a mediator (orchestrator) when several components would otherwise call each other directly. In distributed systems the orchestration saga is the same idea: one coordinator issues commands and reacts to replies, instead of services chaining calls.

## Anti-Patterns

| Smell | Problem | Fix |
|-------|---------|-----|
| Observer chains triggering observers | Hidden control flow, cascades | Explicit orchestration or limited event depth |
| Strategy with one implementation | Indirection without benefit | Plain function until a second variant exists |
| God mediator | All logic in one class | Split by use case |
| Status booleans (`isPaid`, `isShipped`) | Invalid combinations | Single status + transition table |
| Synchronous event handlers doing I/O inside a DB transaction | Long transactions, partial failures | Outbox + async consumers |

## Checklist

- [ ] Pattern chosen from the problem, not the other way round
- [ ] Function-based variant considered first
- [ ] Events crossing transaction/service boundaries go through an outbox
- [ ] State transitions centralized and enforced in storage
- [ ] Exhaustiveness checks for closed type hierarchies
- [ ] Each strategy/handler unit-tested in isolation
