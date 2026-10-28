# Structural Design Patterns

Structural patterns compose objects and modules into larger structures while keeping dependencies manageable. This reference covers Adapter, Facade, Decorator, Proxy, Composite, Bridge and Flyweight with backend-oriented TypeScript examples, plus guidance on when a pattern adds value and when it is ceremony.

## Selection Table

| Problem | Pattern | Typical backend use |
|---------|---------|---------------------|
| Incompatible interface from a library/vendor | Adapter | Payment/email/SMS providers behind a port |
| Complex subsystem used in a few standard ways | Facade | `CheckoutService` over inventory, pricing, payments |
| Add behaviour without changing the class | Decorator | Caching, retries, metrics, logging around a repository/client |
| Control access to an object | Proxy | Lazy loading, authorization, remote stubs, rate limiting |
| Treat individual and grouped objects uniformly | Composite | Permission trees, pricing rules, UI/menu trees |
| Vary abstraction and implementation independently | Bridge | Notification type × delivery channel |
| Share immutable state among many objects | Flyweight | Interned tokens, shared metadata, glyph caches |

## Adapter (ports and adapters)

```ts
// Port owned by the domain
export interface PaymentGateway {
  charge(input: { amountMinor: number; currency: string; customerRef: string; idempotencyKey: string }):
    Promise<{ chargeId: string; status: 'succeeded' | 'pending' | 'failed' }>
}

// Adapter owned by infrastructure
import Stripe from 'stripe'

export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly stripe: Stripe) {}

  async charge(input: Parameters<PaymentGateway['charge']>[0]) {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: input.amountMinor,
        currency: input.currency.toLowerCase(),
        customer: input.customerRef,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      },
      { idempotencyKey: input.idempotencyKey },
    )
    const status = intent.status === 'succeeded' ? 'succeeded' : intent.status === 'processing' ? 'pending' : 'failed'
    return { chargeId: intent.id, status } as const
  }
}
```

The domain depends on `PaymentGateway`; vendor types never leak past the adapter. Tests use an in-memory fake implementing the port.

## Facade

```ts
export class CheckoutFacade {
  constructor(
    private readonly carts: CartRepository,
    private readonly pricing: PricingService,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentGateway,
    private readonly orders: OrderRepository,
  ) {}

  async placeOrder(cartId: string, idempotencyKey: string): Promise<OrderId> {
    const cart = await this.carts.get(cartId)
    const quote = await this.pricing.quote(cart)
    const reservation = await this.inventory.reserve(cart.lines)
    try {
      const charge = await this.payments.charge({
        amountMinor: quote.totalMinor, currency: quote.currency,
        customerRef: cart.customerRef, idempotencyKey,
      })
      if (charge.status === 'failed') throw new PaymentDeclinedError(cartId)
      return await this.orders.create(cart, quote, charge.chargeId)
    } catch (err) {
      await this.inventory.release(reservation.id)
      throw err
    }
  }
}
```

A facade gives controllers one entry point and keeps orchestration out of HTTP handlers. Keep it thin: business rules stay in the services it calls.

## Decorator

```ts
export interface ProductRepository {
  findById(id: string): Promise<Product | null>
}

export class CachedProductRepository implements ProductRepository {
  constructor(private readonly inner: ProductRepository, private readonly cache: Cache, private readonly ttlSeconds = 300) {}

  async findById(id: string) {
    const key = `product:${id}`
    const hit = await this.cache.get<Product>(key)
    if (hit) return hit
    const product = await this.inner.findById(id)
    if (product) await this.cache.set(key, product, this.ttlSeconds)
    return product
  }
}

export class TimedProductRepository implements ProductRepository {
  constructor(private readonly inner: ProductRepository, private readonly metrics: Metrics) {}

  async findById(id: string) {
    const start = performance.now()
    try {
      return await this.inner.findById(id)
    } finally {
      this.metrics.histogram('repo.product.find_ms', performance.now() - start)
    }
  }
}

const repo: ProductRepository = new TimedProductRepository(new CachedProductRepository(new SqlProductRepository(db), redisCache), metrics)
```

Decorators stack cross-cutting concerns in a visible order (here: metrics measure cache hits and misses). Order matters: a retry decorator outside a circuit breaker behaves differently from one inside it.

## Proxy

| Kind | Purpose | Example |
|------|---------|---------|
| Virtual | Defer expensive creation | Lazy ORM relations |
| Protection | Check permissions before delegating | Authorization wrapper on a service |
| Remote | Local stand-in for a remote object | gRPC/HTTP client stubs |
| Smart reference | Count/limit/log access | Rate-limited API client |

```ts
export class AuthorizedDocumentService implements DocumentService {
  constructor(private readonly inner: DocumentService, private readonly policy: Policy) {}

  async read(user: User, docId: string) {
    if (!(await this.policy.can(user, 'document:read', docId))) {
      throw new ForbiddenError(`user ${user.id} cannot read document ${docId}`)
    }
    return this.inner.read(user, docId)
  }
}
```

Decorator and Proxy share structure; the difference is intent (adding behaviour vs controlling access/lifecycle).

## Composite

```ts
type Rule =
  | { kind: 'percentOff'; percent: number }
  | { kind: 'fixedOff'; amountMinor: number }
  | { kind: 'all'; rules: Rule[] }
  | { kind: 'best'; rules: Rule[] }

function discount(rule: Rule, subtotalMinor: number): number {
  switch (rule.kind) {
    case 'percentOff': return Math.floor(subtotalMinor * rule.percent / 100)
    case 'fixedOff': return Math.min(rule.amountMinor, subtotalMinor)
    case 'all': return Math.min(subtotalMinor, rule.rules.reduce((sum, r) => sum + discount(r, subtotalMinor), 0))
    case 'best': return Math.max(0, ...rule.rules.map((r) => discount(r, subtotalMinor)))
  }
}
```

Composites model trees (rules, permissions, org units, bill of materials). Guard against cycles and unbounded depth when trees come from user data.

## Bridge

```ts
interface Channel { send(to: string, subject: string, body: string): Promise<void> }

abstract class Notification {
  constructor(protected readonly channel: Channel) {}
  abstract deliver(user: User): Promise<void>
}

class PasswordReset extends Notification {
  constructor(channel: Channel, private readonly link: string) { super(channel) }
  deliver(user: User) { return this.channel.send(user.contact, 'Reset your password', `Use this link: ${this.link}`) }
}

// any notification × any channel without N×M classes
await new PasswordReset(new EmailChannel(ses), link).deliver(user)
await new PasswordReset(new SmsChannel(twilio), link).deliver(user)
```

## Flyweight

Share immutable intrinsic state; pass extrinsic state per use.

```ts
const currencyCache = new Map<string, Currency>()
export function currency(code: string): Currency {
  const upper = code.toUpperCase()
  let c = currencyCache.get(upper)
  if (!c) {
    c = Object.freeze(loadCurrencyMetadata(upper))
    currencyCache.set(upper, c)
  }
  return c
}
```

Only worth it when millions of objects duplicate the same data; measure memory first.

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| Adapter leaks vendor types or errors | Map to domain types and domain errors in the adapter |
| Facade grows into a god service | Split per use case; keep rules in domain services |
| Decorator stacks built ad hoc in many places | Build the stack once in the composition root / DI container |
| Proxy hides network calls behind a local-looking API | Make latency and failure explicit (timeouts, `Promise` return types, errors) |
| Patterns introduced before a second implementation exists | Start concrete; refactor when variation appears |

## Checklist

- [ ] External dependencies behind ports with adapters
- [ ] Cross-cutting concerns as decorators composed in one place, order documented
- [ ] Access control proxies tested for deny paths
- [ ] Composites protected against cycles and excessive depth
- [ ] Each wrapper unit-tested with a fake inner implementation
