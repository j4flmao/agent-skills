# Preact Advanced Topics

Advanced Preact techniques: Signals in depth, React ecosystem interop with `preact/compat`, server-side rendering and hydration, islands and prerendering, routing and code splitting with `preact-iso`, performance tuning and debugging. Fundamentals are in `preact-fundamentals.md`; deployment in `preact-deployment.md`.

## Signals in Depth

```tsx
import { signal, computed, effect, batch, untracked } from '@preact/signals';

const items = signal<CartItem[]>([]);
const discount = signal(0);

const subtotal = computed(() => items.value.reduce((s, i) => s + i.priceMinor * i.qty, 0));
const total = computed(() => Math.max(0, subtotal.value - discount.value));

const dispose = effect(() => {
  // re-runs when total changes
  localStorage.setItem('cart-total', String(total.value));
});

function addItem(item: CartItem) {
  batch(() => {                                  // one notification for several writes
    items.value = [...items.value, item];
    discount.value = items.value.length > 5 ? 500 : 0;
  });
}

function logWithoutTracking() {
  effect(() => {
    console.log(total.value, untracked(() => discount.value));  // discount does not subscribe
  });
}
```

Rules:
- Signals compare by identity: assign a new array/object (`items.value = [...]`) rather than mutating in place.
- `computed` values are lazy and cached; keep them pure.
- `effect` returns a disposer; dispose module-level effects in tests and HMR.
- `signal.peek()` reads without subscribing.

### Component-Level Signals

```tsx
import { useSignal, useComputed, useSignalEffect } from '@preact/signals';

function Search() {
  const query = useSignal('');
  const trimmed = useComputed(() => query.value.trim());

  useSignalEffect(() => {
    if (trimmed.value.length < 2) return;
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(trimmed.value)}`, { signal: ctrl.signal });
    return () => ctrl.abort();
  });

  return <input value={query} onInput={e => (query.value = e.currentTarget.value)} />;
}
```

Binding a signal as `value={query}` updates the DOM property directly without re-rendering `Search`.

### Signals Architecture

- Domain stores: a module exporting signals plus action functions (no direct writes from components).
- Avoid deep chains of effects writing to other signals; prefer `computed`.
- For server data, combine signals with a fetch layer or use libraries that support Preact (e.g. TanStack Query via `preact/compat`).

## preact/compat: Using React Libraries

```ts
// vite.config.ts (preset-vite sets these aliases automatically)
resolve: {
  alias: {
    react: 'preact/compat',
    'react-dom': 'preact/compat',
    'react-dom/test-utils': 'preact/test-utils',
    'react/jsx-runtime': 'preact/jsx-runtime',
  },
},
```

- Most React libraries work: routing, forms, UI kits; libraries depending on React internals or concurrent APIs may not.
- `compat` adds `forwardRef`, `memo`, `PureComponent`, `Suspense`/`lazy`, `createPortal`, `onChange` input semantics, `useSyncExternalStore`, `startTransition` (executes synchronously).
- Validate each library: render tests plus a quick bundle-size check, since compat and React-specific libraries can erode Preact's size advantage.
- TypeScript: map `react` types to compat with `paths` in `tsconfig.json` if a library's types require it.

## Server-Side Rendering and Hydration

```tsx
// server.ts
import { renderToStringAsync } from 'preact-render-to-string';
import { App } from './app';

export async function handle(req: Request): Promise<Response> {
  const html = await renderToStringAsync(<App url={new URL(req.url).pathname} />);
  return new Response(`<!doctype html><html><body><div id="app">${html}</div><script type="module" src="/client.js"></script></body></html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
```

```tsx
// client.ts
import { hydrate } from 'preact';
hydrate(<App url={location.pathname} />, document.getElementById('app')!);
```

- `renderToStringAsync` waits for lazy components and suspended data; `renderToString` is synchronous.
- Server and client must render identical markup for the same data; serialize initial data into the page (escape `<` to prevent script injection) and read it on the client.
- Streaming SSR is available in `preact-render-to-string` (`renderToReadableStream`/`renderToPipeableStream` in recent versions); check the installed version.

## Islands and Frameworks

| Option | Model |
|--------|-------|
| Fresh (Deno) | Server-rendered pages, islands hydrated individually, Preact + Signals |
| Astro with `@astrojs/preact` | Static/server pages with Preact islands (`client:visible`, `client:idle`) |
| `@preact/preset-vite` prerender | Static prerendering for SPA routes with `preact-iso` |

Islands keep JavaScript proportional to interactive components, which suits content-heavy sites.

## Routing and Code Splitting with preact-iso

```tsx
import { LocationProvider, Router, Route, lazy, ErrorBoundary } from 'preact-iso';

const Home = lazy(() => import('./pages/home'));
const Product = lazy(() => import('./pages/product'));

export function App() {
  return (
    <LocationProvider>
      <ErrorBoundary>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/products/:id" component={Product} />
          <Route default component={NotFound} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  );
}
```

`preact-iso` supports async routes that keep the previous page visible until the next one loads, and pairs with `prerender()` for static generation.

## Performance

- Prefer signals for frequently changing values (timers, inputs, live data) to avoid component re-renders.
- `memo` (compat) or splitting components to narrow re-render scope.
- Virtualize long lists (e.g. `@tanstack/virtual-core` with a small Preact wrapper).
- Measure field performance with Core Web Vitals (INP, LCP, CLS); Preact's small runtime mainly helps parse/execute time on low-end devices.
- Check bundles with `rollup-plugin-visualizer` or `vite-bundle-visualizer`; compat and React-only dependencies are the usual size regressions.

## Debugging and DevTools

- `preact/debug` (development only) adds helpful warnings and enables the Preact DevTools extension.
- Signals debugging: log in `effect`s or use the signals devtools integrations available for your version.
- Hydration mismatch symptoms: duplicated or missing nodes after load; compare server HTML with client render for the same data.

## Testing Advanced Cases

- Signals: test stores without rendering (call actions, assert `.value`); dispose effects after each test.
- SSR: snapshot `renderToStringAsync` output for key routes.
- compat-heavy code: run the library's own interaction patterns in tests to catch event semantic differences.

## Checklist

- [ ] Signals updated immutably; effects disposed; `batch` for grouped writes
- [ ] compat used deliberately; each React library verified
- [ ] SSR markup matches client; initial data safely serialized
- [ ] Routes lazy-loaded; prerender for static pages where possible
- [ ] Bundle size and INP tracked per release
- [ ] `preact/debug` excluded from production builds
