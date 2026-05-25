---
name: frontend-patterns
description: >
  Use this skill when the user asks about frontend design patterns, component
  patterns, Container/Presentational, Compound Components, HOC, Render Props,
  Hooks patterns, Provider, or State Reducer.
version: "1.0.0"
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

## References

### Reference Files
- `references/component-patterns.md` — Full component pattern catalog with framework-specific examples
- `references/hooks-patterns.md` — Hook design patterns, composition rules, testing
- `references/rendering-patterns.md` — Conditional rendering, list rendering, composition, portals, render delegation, layout patterns
- `references/composition-patterns.md` — Compound components, component injection, render props, polymorphic components, composition vs configuration

### Related Skills
- `frontend/universal/state-management/SKILL.md` — State management integration
- `frontend/universal/microfrontend/SKILL.md` — Component patterns in MFE context
- `frontend/universal/design-system/SKILL.md` — Design system component architecture
- `frontend/universal/testing/SKILL.md` — Frontend testing strategies

## Handoff

Hand off to `frontend/universal/state-management/SKILL.md` if state management pattern selection is needed. Hand off to `frontend/universal/testing/SKILL.md` for testing strategy.
