---
name: frontend-patterns
description: >
  Use this skill when the user asks about frontend design patterns, component
  patterns, Container/Presentational, Compound Components, HOC, Render Props,
  Hooks patterns, Provider, or State Reducer.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, patterns, phase-3, universal]
---

# Frontend Design Patterns

## Purpose
Select and implement frontend component patterns that solve specific architectural problems with idiomatic framework code.

## Agent Protocol

### Trigger
User request includes: `frontend pattern`, `component pattern`, `react pattern`, `vue pattern`, `container pattern`, `hoc`, `render prop`, `compound component`, `hooks pattern`, `provider pattern`, `composable`.

### Input Context
- Framework (React, Vue, Angular, Svelte, Solid)
- Component hierarchy and data flow
- Current pain points (prop drilling, re-renders, complex state logic)
- Performance requirements

### Output Artifact
A markdown document containing:
- Selected pattern(s) with code examples
- Pattern selection rationale (why pattern A over pattern B)
- Refactoring plan if converting existing code
- Testing strategy for the pattern

### Response Format
Produce the artifact directly. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. If no pattern applies, output `No pattern required. Current approach is sufficient.` and stop.

——

### Completion Criteria
- Pattern implementation idiomatic to target framework
- Selection criteria documented with rejected alternatives
- Testing strategy included
- Edge cases covered (loading, error, empty states)

### Max Response Length
4096 tokens

## Pattern Architecture / Decision Trees

### Pattern Selection Decision Tree
```
What problem are you solving?

  |-- Logic scattered across lifecycle methods? -->
  |     |-- React: Custom Hooks (preferred) or HOC (legacy only)
  |     |-- Vue: Composables
  |     |-- Angular: Services + RxJS
  |     |-- Svelte: Store + reactive statements
  |
  |-- Prop drilling (>3 levels)? -->
  |     |-- React/Vue: Provider/Context pattern
  |     |-- Angular: DI + services
  |     |-- Alternative: Component composition (restructure tree)
  |
  |-- Complex multi-part UI (Tabs, Accordion, Select)? -->
  |     |-- Compound Components with context-based state
  |     |-- Each sub-component shares state via parent context
  |
  |-- Cross-cutting concern across many components? -->
  |     |-- HOC (for pre-render wrapping like auth guards)
  |     |-- Hooks (for functional composition)
  |     |-- Provider (for global state like theme, locale)
  |
  |-- Dynamic rendering logic sharing? -->
  |     |-- Render Props (when consumer needs rendering control)
  |     |-- Slots (Vue/Svelte native slot pattern)
  |
  |-- Need to override internal component behavior? -->
        |-- State Reducer pattern (for reusable component libraries)
        |-- Strategy pattern (pass behavior as prop)
```

### Composition vs Configuration Decision Tree
```
How many variations does the component have?
  |-- Few variations (2-3) -->
  |     Props-based configuration is fine
  |     Example: <Button variant="primary" size="md" />
  |
  |-- Many variations (4+), composable parts -->
  |     Composition preferred
  |     Example: <Card><Card.Header><Card.Body><Card.Footer>
  |
  |-- Consumer needs full rendering control -->
        Render props / slots
        Example: <DataTable columns={...} renderRow={(row) => ...} />
```

---

## Workflow

### Step 1: Identify the Problem
Analyze component hierarchy, data flow, and current pain points (prop drilling, re-renders, complex state logic).

### Step 2: Select the Pattern
Use the pattern selection table to match the problem to the appropriate pattern.

### Step 3: Implement the Pattern
Write idiomatic framework code following the pattern catalog examples.

### Step 4: Write Tests
Implement tests per pattern type using the testing strategy table.

### Step 5: Review Edge Cases
Cover loading, error, and empty states for every component.

## Rules

- Prefer hooks over HOC since React 16.8 — use HOC only for legacy components or pre-render wrapping
- Prefer hooks over Render Props since React 16.8 — use render props only for render-prop-only libraries
- One hook per concern — single responsibility at the hook level
- Return stable references from hooks to avoid infinite re-render loops
- Use Provider only when data is needed by 3+ levels of nesting — prop drilling is fine for 2 levels
- Compound components are for multi-part UI with shared state (Select, Tabs, Accordion), not single-element components
- State Reducer pattern is only justified for reusable component libraries, not internal-only components
- Container/Presentational split when a component has 3+ state variables or data sources

## Pattern Catalog

### 1. Container / Presentational

**Intent**: Separate logic (container) from rendering (presentational).

```tsx
// Container (handles data, state, events)
function OrderListContainer() {
  const { data, isLoading, error } = useOrders();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={error.message} />;
  return <OrderListPresentation orders={data} onSelect={handleSelect} />;
}

// Presentational (pure rendering, no side effects)
function OrderListPresentation({ orders, onSelect }: Props) {
  return (
    <ul>
      {orders.map(order => (
        <li key={order.id} onClick={() => onSelect(order.id)}>
          {order.name} - ${order.total}
        </li>
      ))}
    </ul>
  );
}
```

**When**: Complex pages with data fetching, loading/error states, multiple data sources. Avoid for simple static components.
**Selection rule**: Component has 3+ state variables or data sources? Use Container/Presentational. Otherwise, keep single component.

### 2. Compound Components

**Intent**: Expressive, declarative API for multi-part components.

```tsx
// Select with context-based state sharing
function OrderActions({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(orderActionsReducer, initialState);
  return (
    <OrderActionsContext.Provider value={{ state, dispatch }}>
      <div className="order-actions">{children}</div>
    </OrderActionsContext.Provider>
  );
}

OrderActions.Approve = function Approve() {
  const { dispatch } = useOrderActionsContext();
  return <button onClick={() => dispatch({ type: 'APPROVE' })}>Approve</button>;
};

OrderActions.Reject = function Reject() {
  const { dispatch } = useOrderActionsContext();
  return <button onClick={() => dispatch({ type: 'REJECT' })}>Reject</button>;
};

// Usage
<OrderActions>
  <OrderActions.Approve />
  <OrderActions.Reject />
</OrderActions>
```

**When**: Multi-part UI with shared state (Select, Tabs, Accordion, Stepper). Avoid for single-element components.

### 3. Higher-Order Component (HOC)

**Intent**: Reuse component logic by wrapping.

```tsx
function withAuth<P>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    return <Component {...props} user={user} />;
  };
}

const ProtectedOrders = withAuth(OrderList);
```

**When**: Cross-cutting concerns (auth, logging, permissions) applied to multiple components.
**Prefer**: Hooks over HOC since React 16.8. Use HOC only when wrapping legacy components or when conditional rendering before hook execution is needed.
**Selection rule**: Can the behavior be a hook? Yes → use hook. No → use HOC.

### 4. Render Props

**Intent**: Share logic via function-as-child prop.

```tsx
function OrderFetcher({ orderId, children }: {
  orderId: string;
  children: (state: { order: Order | null; loading: boolean }) => ReactNode;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder(orderId).then(o => { setOrder(o); setLoading(false); });
  }, [orderId]);

  return <>{children({ order, loading })}</>;
}

// Usage
<OrderFetcher orderId="123">
  {({ order, loading }) => loading ? <Loading /> : <OrderView order={order} />}
</OrderFetcher>
```

**When**: Component needs to expose state to consumers without dictating rendering.
**Prefer**: Hooks over Render Props since React 16.8. Use for complex render-props-only libraries (React Motion, Formik).

### 5. Hooks Patterns

**Intent**: Encapsulate stateful logic in composable functions.

#### Custom Hook (React)

```tsx
function useOrders(filters: OrderFilters) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getOrders(filters)
      .then(setOrders)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [filters]);

  return { orders, loading, error };
}
```

#### Composable (Vue)

```ts
// useOrders.ts
import { ref, watch, type Ref } from 'vue'

export function useOrders(filters: Ref<OrderFilters>) {
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  watch(filters, async (newFilters) => {
    loading.value = true
    try {
      orders.value = await api.getOrders(newFilters)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }, { immediate: true })

  return { orders, loading, error }
}
```

#### Hook Composition Rules

| Rule | Rationale |
|---|---|
| One hook per concern | Single responsibility at hook level |
| Hooks call hooks only at top level | Rules of Hooks (React) / lifecycle consistency |
| Prefix with `use` (React) or file scope (Vue) | Convention |
| Return stable references | Avoid infinite re-render loops |
| Parameterize eagerly | Accept primitive params, return stable callbacks |

### 6. Provider Pattern

**Intent**: Pass data deeply through component tree without prop drilling.

```tsx
const OrderContext = createContext<OrderContextType | null>(null);

function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const addOrder = useCallback((order: Order) => setOrders(prev => [...prev, order]), []);
  return (
    <OrderContext.Provider value={{ orders, addOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

function useOrdersContext() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('OrderProvider missing');
  return ctx;
}
```

**When**: Global or feature-level state (theme, auth, locale, feature flags, order state). Avoid wrapping entire app in single provider — split by domain.
**Selection rule**: Data needed by 3+ levels of nesting? Use Provider. 2 levels only? Prop drilling is fine.

### 7. State Reducer Pattern

**Intent**: Expose internal state changes to consumers for overriding behavior.

```tsx
type Action = { type: 'TOGGLE' } | { type: 'CLOSE' };

function useDropdown<T>(
  userReducer?: (state: T, action: Action) => T,
  initialOpen = false
) {
  const defaultReducer = (state: boolean, action: Action) => {
    switch (action.type) {
      case 'TOGGLE': return !state;
      case 'CLOSE': return false;
      default: return state;
    }
  };
  const reducer = userReducer || defaultReducer;
  const [open, dispatch] = useReducer(reducer, initialOpen);
  return { open, toggle: () => dispatch({ type: 'TOGGLE' }), close: () => dispatch({ type: 'CLOSE' }) };
}

// Consumer overrides behavior
const { open, toggle } = useDropdown(
  (state, action) => action.type === 'TOGGLE' ? state : state, // never toggles
);
```

**When**: Building reusable component libraries where consumers need to customize behavior. Overkill for internal-only components.

## Pattern Selection by Problem

| Problem | Pattern | Reason |
|---|---|---|
| Logic scattered across lifecycle | Custom hooks / Composables | Encapsulates stateful logic |
| Prop drilling >3 levels | Provider / Context | Avoids threading props |
| Complex multi-part UI | Compound Components | Declarative API, shared context |
| Cross-cutting concern across many components | HOC | Wrapping before render |
| Dynamic rendering logic sharing | Render Props | Flexible rendering control |
| Component library customization | State Reducer | Overridable internal state |
| Data fetching + rendering separation | Container / Presentational | Clear separation of concerns |

## Testing Strategy

| Pattern | Test Focus | Example |
|---|---|---|
| **Container** | Mock data layer, test loading/error/success | `render(<Container />)` with mocked hooks |
| **Presentational** | Pure props → rendered output | Snapshot + behavior tests |
| **Compound** | Context provider + child interactions | `render(<Component><ChildA/><ChildB/></>)` |
| **HOC** | Wrapped component behavior | `render(hoc(WrappedComponent))` |
| **Hooks** | Render hook via `renderHook` | `renderHook(() => useOrders(filters))` |
| **Provider** | Consumer components render correctly | Wrap test with provider, assert children |

## Performance Considerations

### Pattern Re-render Cost
| Pattern | Re-render triggers | Optimization |
|---------|-------------------|--------------|
| Container/Presentational | Parent state changes | React.memo on presentational |
| Compound Components | Context value changes | Memoize context value with useMemo |
| HOC | Wrapper re-renders passed props | Avoid inline object props |
| Render Props | Parent re-renders → new function each time | useCallback on the render function |
| Provider | Context value changes → all consumers re-render | Split by domain, memoize value |
| Hooks | Hook internal state changes | Single responsibility, stable refs |

### Provider Splitting for Performance
```tsx
// BAD -- single provider for everything, any change re-renders all consumers
<AppProvider value={{ user, orders, theme, locale }}>
  <App />
</AppProvider>

// GOOD -- split by domain, consumer only subscribes to what it needs
<UserProvider>
  <OrdersProvider>
    <ThemeProvider>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </ThemeProvider>
  </OrdersProvider>
</UserProvider>
```

## References
  - references/component-patterns.md — Component Patterns Reference
  - references/composition-patterns.md — Composition Patterns
  - references/frontend-security.md — Frontend Security Reference
  - references/frontend-testing.md — Frontend Testing Reference
  - references/hooks-patterns.md — Hooks Patterns Reference
  - references/rendering-patterns.md — Rendering Patterns
## Handoff

Hand off to `frontend/universal/state-management/SKILL.md` if state management pattern selection is needed. Hand off to `frontend/universal/testing/SKILL.md` for testing strategy.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Architecture Decision Trees

### Component Composition Decision Tree
`
Does the child component need to manage its own state?
  ├── No  → Pure function component (props in, JSX out)
  └── Yes → Is the state derived from props?
       ├── Yes → useMemo or computed property
       └── No  → useState/useReducer for local state
            Does the state need to persist across route changes?
            ├── Yes → URL state (search params) or global store
            └── No  → Component-local state
`

### State Management Decision Tree
`
How many components share the state?
  ├── 0-1 → Component-local state (useState/useReducer)
  ├── 2-5 → Prop drilling or React Context
  └── 5+ → Global state library (Zustand, Jotai, NgRx Signal Store)
       Is the state from server API?
       ├── Yes → TanStack Query/SWR/Apollo Client (server state)
       └── No  → Client state library (Zustand, Context)
`
