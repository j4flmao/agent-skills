# Inter-MFE Communication Strategies

## 1. Custom Events (Browser-native)

### Publisher

```typescript
// orders-app/src/events.ts
export function dispatchOrderCreated(orderId: string, total: number) {
  window.dispatchEvent(
    new CustomEvent('app:order-created', {
      detail: { orderId, total, timestamp: Date.now() },
      bubbles: false,
    })
  );
}
```

### Subscriber

```typescript
// dashboard-app/src/listeners.ts
import { useEffect } from 'react';

export function useOrderEvents() {
  useEffect(() => {
    const handler = (e: Event) => {
      const { orderId, total } = (e as CustomEvent).detail;
      // Update dashboard metrics
      updateMetrics({ newOrderTotal: total });
      showNotification(`Order ${orderId} created`);
    };

    window.addEventListener('app:order-created', handler);
    return () => window.removeEventListener('app:order-created', handler);
  }, []);
}
```

### Event Naming Convention

```
{domain}:{action} — e.g., order:created, user:logged-in, cart:item-added
```

## 2. URL-based Communication

### Route-Based Navigation

```typescript
// shell-app/src/navigation.ts
export function navigateToOrder(orderId: string) {
  // Update URL — all MFEs react to URL changes
  window.history.pushState({}, '', `/orders/${orderId}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
```

### Query Parameter Protocol

```
https://app.com/orders?selectedProductId=abc-123&campaign=summer-sale
```

```typescript
// products-app/src/useUrlParams.ts
export function useUrlParams() {
  const [params, setParams] = useState(new URLSearchParams(window.location.search));

  useEffect(() => {
    const handler = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  return params;
}
```

## 3. Shared State (Module Federation)

### Shared Store via Federated Module

```typescript
// shared-state-app/src/auth-store.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}));
```

```javascript
// shared-state-app/webpack.config.js
exposes: {
  './auth-store': './src/auth-store.ts',
}
```

```typescript
// Any MFE consumes the singleton store
const authStore = await import('shared-state/auth-store');
const user = authStore.useAuthStore((s) => s.user);
```

### Shared Service Bus

```typescript
// shared/bus.ts
type EventHandler = (payload: unknown) => void;

class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  emit(event: string, payload: unknown) {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
}

export const bus = new EventBus();
```

## 4. iframe Communication (postMessage)

### Parent → Child

```typescript
// shell-app sends message to iframe
const iframe = document.getElementById('orders-iframe') as HTMLIFrameElement;
iframe.contentWindow?.postMessage(
  { type: 'NAVIGATE', payload: { path: '/orders/123' } },
  'https://orders.app.com'
);
```

### Child → Parent

```typescript
// orders-app (in iframe)
window.parent.postMessage(
  { type: 'ORDER_CREATED', payload: { orderId: '123' } },
  'https://shell.app.com'
);
```

### Parent Listener

```typescript
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://orders.app.com') return;
  switch (event.data.type) {
    case 'ORDER_CREATED':
      updateDashboard();
      break;
  }
});
```

## Communication Pattern Selection

| Requirement | Method | Pros | Cons |
|---|---|---|---|
| Navigation between MFEs | URL-based | SSR-friendly, bookmarks, SEO | Limited to serializable data |
| Notifications / toasts | Custom Events | Simple, decoupled | Not debuggable, no typing |
| Auth state | Shared store (singleton) | Typed, reactive | Tight coupling to shared module |
| Complex cross-MFE workflows | Event Bus | Decoupled, typed | Requires shared lib, complexity |
| Strict isolation (different domains) | iframe + postMessage | Complete isolation | Performance overhead, SEO issues |
| Real-time (SSE/WebSocket) | Shared connection | Efficient, single socket | MFE must agree on protocol |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Direct import between MFEs | Tight coupling, breaks independent deploy | Use shared modules via federation |
| Global window variables | Namespace collision, TypeScript issues | Use CustomEvent or shared store |
| Shared localStorage schema | Breaking changes affect all MFEs | Versioned keys, or use in-memory events |
| Synchronous calls between MFEs | Blocks rendering, poor UX | Async events, loading states |
| Circular event dependencies | Infinite loops, debugging nightmare | Unidirectional event flow, event naming convention |

## Event Contract Versioning

```typescript
// Every event has a version number
window.dispatchEvent(new CustomEvent('app:order-created', {
  detail: { version: 2, data: { orderId: '123', total: 99.99 } }
}));

// Consumer handles multiple versions
const handler = (e: CustomEvent) => {
  const { version, data } = e.detail;
  switch (version) {
    case 1: return handleV1(data);
    case 2: return handleV2(data);
  }
};
```
