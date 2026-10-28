# State Management in Kotlin Services

Where state lives in a Kotlin backend and how to keep it correct under concurrency: immutable domain models, shared in-memory state with coroutines, persistence with optimistic locking, and reactive state with `StateFlow`.

## Principle: Stateless Request Handling

Request handlers should hold no mutable state between calls. Persistent state belongs in a database or cache so any replica can serve any request. In-process state is limited to caches, connection pools, rate-limit buckets, and coordination primitives — and must be safe for concurrent coroutines.

## Immutable Domain Models

```kotlin
data class Cart(val id: CartId, val items: List<Line>, val version: Long) {
    data class Line(val sku: String, val qty: Int)

    fun add(sku: String, qty: Int): Cart {
        require(qty > 0) { "qty must be positive" }
        val existing = items.find { it.sku == sku }
        val updated = if (existing == null) items + Line(sku, qty)
                      else items.map { if (it.sku == sku) it.copy(qty = it.qty + qty) else it }
        return copy(items = updated)
    }
}
```

- `val` + read-only `List` types; transitions return new instances via `copy`.
- `List` is a read-only view, not deep immutability; do not expose a `MutableList` cast to `List`. Use `kotlinx.collections.immutable` (`persistentListOf`) when true immutability matters.

## Shared Mutable State with Coroutines

| Need | Tool |
|------|------|
| Single counter / reference | `AtomicLong`, `AtomicReference` (or `kotlinx.atomicfu`) |
| Compound update of a map | `ConcurrentHashMap.compute` / `merge` |
| Critical section that suspends | `kotlinx.coroutines.sync.Mutex` |
| Serialize all access to a resource | Single coroutine owning the state, fed by a `Channel` (actor style) |
| Observable current value | `MutableStateFlow` with `update { }` |

```kotlin
class InFlightLimiter(private val max: Int) {
    private val inFlight = MutableStateFlow(0)

    fun tryAcquire(): Boolean {
        while (true) {
            val cur = inFlight.value
            if (cur >= max) return false
            if (inFlight.compareAndSet(cur, cur + 1)) return true
        }
    }
    fun release() = inFlight.update { it - 1 }
}
```

```kotlin
class TokenCache(private val fetch: suspend () -> Token) {
    private val mutex = Mutex()
    @Volatile private var cached: Token? = null

    suspend fun get(): Token {
        cached?.takeIf { !it.isExpiringSoon() }?.let { return it }
        return mutex.withLock {
            cached?.takeIf { !it.isExpiringSoon() } ?: fetch().also { cached = it }
        }
    }
}
```

- Do not use `synchronized` around suspending calls; it is not allowed to suspend inside and blocks the thread. Use `Mutex`.
- `Mutex` is not reentrant; calling `withLock` again from inside the lock deadlocks.

## StateFlow and SharedFlow

- `StateFlow`: always has a value, conflates updates, equality-based deduplication. Good for config snapshots, feature flags, health state.
- `SharedFlow`: event stream with configurable replay and buffer; set `extraBufferCapacity` and `onBufferOverflow` explicitly to avoid suspending emitters.

```kotlin
class FeatureFlags(scope: CoroutineScope, source: FlagSource) {
    val flags: StateFlow<Map<String, Boolean>> = source.updates()
        .stateIn(scope, SharingStarted.Eagerly, emptyMap())

    fun isOn(name: String) = flags.value[name] == true
}
```

## Persistent State and Concurrency Control

### Optimistic Locking

```kotlin
// Exposed
val updated = Carts.update({ (Carts.id eq cart.id.value) and (Carts.version eq cart.version) }) {
    it[items] = Json.encodeToString(cart.items)
    it[version] = cart.version + 1
}
if (updated == 0) throw ConflictException("cart_modified", "Cart ${cart.id.value} changed concurrently")
```

JPA: `@Version` field; Spring Data throws `OptimisticLockingFailureException`. Retry the whole load-modify-save cycle a bounded number of times, or return 409 to the client.

### Pessimistic Locking

`SELECT ... FOR UPDATE` inside a short transaction for hot rows where conflicts are frequent (e.g. inventory counters). Keep the transaction short and never call remote services while holding row locks.

### Atomic Database Updates

Prefer single-statement updates over read-modify-write:

```sql
UPDATE inventory SET available = available - :qty
WHERE sku = :sku AND available >= :qty;
```

Zero rows affected means insufficient stock.

## Transactions with Coroutines

- Exposed: `newSuspendedTransaction(Dispatchers.IO) { }` (or the R2DBC variant) — do not switch dispatchers inside the block, the transaction is bound to the context.
- Spring: `@Transactional` works on suspend functions with reactive transaction managers (R2DBC); with JDBC + MVC, keep transactional code blocking or use `TransactionTemplate`.

## Session and User State

- Store sessions in Redis or signed cookies (Ktor `Sessions` with `SessionTransportTransformerMessageAuthentication` / encryption), not in replica memory.
- Keep session payload small: user id, tenant id, CSRF token.

## Distributed State Pitfalls

- In-memory caches diverge across replicas; use short TTLs or pub/sub invalidation.
- Scheduled jobs running on every replica; use a lock (ShedLock, DB advisory lock) or a single scheduler.
- Idempotency keys stored in memory are lost on restart; persist them with a unique constraint.

## Checklist

- [ ] Request handlers stateless; replicas interchangeable
- [ ] Domain models immutable with explicit transitions
- [ ] Shared in-process state uses atomics, `Mutex`, or a single owner
- [ ] No `synchronized` around suspension points
- [ ] Optimistic locking or atomic SQL for concurrent writes
- [ ] Sessions and idempotency keys in durable shared storage
