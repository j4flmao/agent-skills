---
name: microfrontend
description: >
  Use this skill when the user asks about microfrontend, Module Federation, Web
  Components, iframe integration, shared dependencies, or cross-app communication
  between frontend applications.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, microfrontend, phase-3, universal]
---

# Microfrontend Architecture

## Purpose
Design microfrontend architectures with integration strategy, shared dependency management, and cross-app communication protocols.

## Agent Protocol

### Trigger
User request includes: `microfrontend`, `micro-frontend`, `module federation`, `mf`, `mfe`, `frontend composition`, `federated module`, `webpack federation`, `rspack federation`.

### Input Context
- Number of frontend teams
- Current frontend architecture (monolith SPA, multi-page)
- Framework preferences (React, Vue, Angular, Solid)
- Build tool (Webpack 5, Rspack, Vite)
- Deployment platform (Kubernetes, S3/CDN, Netlify, Vercel)
- Integration requirements (auth, navigation, cross-app communication)

### Output Artifact
A markdown document containing:
- Microfrontend composition approach (Module Federation, iframe, Web Components) with rationale
- Shared dependency strategy (singleton vs shared vs standalone)
- Cross-app communication protocol
- Shell/Host application design
- Deployment pipeline per microfrontend
- Migration plan from monolith SPA

### Response Format
Produce the artifact directly. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. If monolith SPA is appropriate, output `Monolith SPA recommended. Reason: [reason].` and stop.

——

### Completion Criteria
- Integration method selected with comparison to alternatives
- Shared dependency graph is defined (what is shared, what is isolated)
- Communication protocol between microfrontends is specified
- Each microfrontend has independent deployment pipeline
- Migration strategy is ordered in phases

### Max Response Length
4096 tokens

## Microfrontend Architecture / Decision Trees

### Integration Method Decision Tree
```
Number of independent teams?
  |-- 1-2 teams -->
  |     |-- Monolith SPA recommended (microfrontend overhead not justified)
  |     |-- Alternative: monorepo with package boundaries
  |
  |-- 3+ teams on same product -->
  |     Same framework across all teams?
  |     |-- YES -->
  |     |     Module Federation (best sharing, smallest total bundle)
  |     |     Build tool? Webpack 5 / Rspack / Vite (with federation plugin)
  |     |
  |     |-- NO -->
  |           Strict isolation needed? (different auth, sandboxed, legacy app)
  |           |-- YES: iframe (complete isolation, poor perf/SEO)
  |           |-- NO: Web Components (framework-agnostic, Shadow DOM)
```

### MFE Granularity Decision Tree
```
What is the boundary?
  |-- Feature / domain (orders, products, users) -->
  |     GOOD -- team-aligned, independent deploy, clear ownership
  |
  |-- Page / route (home, checkout, settings) -->
  |     GOOD -- natural routing boundary, can be lazy-loaded
  |
  |-- Single component (button, card, modal) -->
  |     BAD -- too fine-grained, federation overhead > benefit
  |     Instead: shared component library via federation or package
```

### Shared Dependency Decision Tree
```
What type of library?
  |-- Framework (React, Vue, Angular, ReactDOM) -->
  |     MUST be singleton. Two instances break hooks/context/events.
  |
  |-- State management (Redux, Zustand, Pinia) -->
  |     Singleton if shared state. Standalone if isolated per MFE.
  |
  |-- Utility library (lodash, date-fns, axios) -->
  |     Shared with version range (same version reused, fallback to standalone).
  |
  |-- Component library (design system) -->
        Singleton (shared as federated module for visual consistency).
```

---

## Workflow

### Step 1: Assess Team and Architecture Context
Determine number of teams, current architecture, frameworks, build tools, and deployment platform.

### Step 2: Select Integration Pattern
Choose between Module Federation, Web Components, iframe, or monolith SPA using the selection decision tree.

### Step 3: Define Shared Dependency Strategy
Specify singleton, shared, or standalone approach per dependency. React/ReactDOM must be singleton.

### Step 4: Design Cross-App Communication
Select methods: URL-based for navigation, shared state for auth, custom events for domain events, shared event bus for notifications.

### Step 5: Configure Module Federation
Set up host and remote configurations with appropriate exposes, remotes, and shared dependencies.

### Step 6: Plan Deployment Pipeline
Each microfrontend gets independent CI/CD with versioned remoteEntry.js and CDN deployment.

### Step 7: Create Migration Plan
Phase extraction: identify boundaries, extract shell, configure federation, extract features one by one, replace monolith.

## Rules

- Microfrontend overhead only justified at 3+ independent teams on the same product
- React and react-dom MUST be singleton — two instances break hooks, context, and event system
- Never share remoteEntry.js directly — use CDN with long cache and versioned paths
- Group microfrontends by team ownership and deployment boundaries, not by component granularity
- Every MFE owns its data domain — no shared database between frontends
- Maintain a shared design system as a federated module for visual consistency
- Enforce strict dependency graph to prevent circular shared dependencies
- Use content hash or timestamp versioning on remoteEntry.js for cache busting

## Integration Patterns

| Pattern | Isolation | Performance | SEO | Bundle Size |
|---|---|---|---|---|
| **Module Federation** | Runtime sharing | Good (shared deps) | Requires SSR | Shared deps, smaller total |
| **iframe** | Complete | Poor (overhead) | Poor | Independent |
| **Web Components** | Shadow DOM | Good | Good | Framework runtime per component |
| **Composition API (Build-time)** | Compile-time | Excellent | Excellent | Monolith bundle |

### Selection Decision

1. **Same framework across teams?** → Module Federation (best sharing, smallest total bundle)
2. **Different frameworks?** → Web Components (framework-agnostic, Shadow DOM isolation)
3. **Strict isolation required?** (different auth, sandboxed, legacy app) → iframe
4. **Single team, small app?** → Monolith SPA (don't over-engineer)

**Rule**: Microfrontend overhead makes sense at 3+ independent teams working on the same product. Below that, monolith SPA or monorepo with package boundaries is sufficient.

## Module Federation (Recommended Default)

### Host Configuration (Webpack 5)

```javascript
// host/webpack.config.js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    orders: 'orders@https://orders.app.com/remoteEntry.js',
    products: 'products@https://products.app.com/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.2.0', eager: true },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0', eager: true },
    'react-router-dom': { singleton: true },
  },
});
```

### Remote Configuration

```javascript
// orders-app/webpack.config.js
new ModuleFederationPlugin({
  name: 'orders',
  filename: 'remoteEntry.js',
  exposes: {
    './OrderList': './src/components/OrderList.tsx',
    './OrderDetail': './src/components/OrderDetail.tsx',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
  },
});
```

### Host Shell Integration (React)

```tsx
// Dynamic remote loader
const OrderList = React.lazy(() => import('orders/OrderList'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderList />
    </Suspense>
  );
}
```

## Shared Dependency Strategy

| Strategy | Behavior | When |
|---|---|---|
| **Singleton** | Single instance across apps | Framework libs (React, Vue), state management |
| **Shared (version-range)** | Same version used; fallback if mismatched | Utility libs (lodash, date-fns) |
| **Standalone** | Each app bundles its own copy | Small libs, version-mismatch-prone libs |

**Critical rule**: `react` and `react-dom` MUST be singleton. Two React instances on the same page break hooks, context, and event system.

## Cross-App Communication

### 1. Custom Events (Simple, Global)

```javascript
// App A dispatches
window.dispatchEvent(new CustomEvent('order-selected', { detail: { orderId: '123' } }));

// App B listens
window.addEventListener('order-selected', (e) => {
  navigateToOrder(e.detail.orderId);
});
```

### 2. Shared State (Tight Coupling)

```javascript
// shared/auth-store.js (consumed by all apps via federation)
const store = createStore(authReducer);
export { store };
```

### 3. URL-based (Decoupled, SSR-friendly)

Orders app sets URL `/orders/123`, Products app reads URL param via router.

### Selection Rule

| Communication Type | Method |
|---|---|
| Navigation / routing | URL-based |
| Auth state / user info | Shared state store |
| Domain events (order created, item added) | Custom events |
| Toast / notifications | Shared event bus |

## Microfrontend by Framework

### React (via Module Federation)
- `@module-federation/enhanced` for Rspack support
- `@module-federation/nextjs-mf` for Next.js
- Remix support via `@module-federation/remix`

### Vue (via Module Federation / Vite)
- `@originjs/vite-plugin-federation` for Vite-based MFE
- Webpack 5 federation for Vue CLI

### Angular
- `@angular-architects/module-federation` plugin
- Custom webpack config per Angular app

## Deployment

### Independent Deploy

Each microfrontend has its own CI/CD:
- Builds independently
- Deploys to independent URL/CDN path
- Versioned via `remoteEntry.js` cache busting

### Version Management

```
orders-app/
  dist/
    1.2.3/
      remoteEntry.js?ts=1715000000
      vendor.js
      main.js
```

**Rule**: Always version remoteEntry.js with content hash or timestamp. Never share `remoteEntry.js` directly — use CDN with long cache + versioned paths.

## Migration from Monolith SPA

1. **Identify boundaries** — screens/modules that change independently and can be team-owned
2. **Host extraction** — extract shell (navigation, auth, layout) into host
3. **Module Federation setup** — configure host to load existing monolith as remote
4. **Feature extraction** — one feature at a time, extract into independent MFE
5. **Monolith replacement** — when all features extracted, monolith can be fully replaced by remotes

## Performance Considerations

### Federation Loading Strategy
| Strategy | Description | When |
|----------|-------------|------|
| Eager | remoteEntry.js loaded on app init | Always-needed features (auth, nav) |
| Lazy | remoteEntry.js loaded on route change | Route-scoped features |
| Preload | remoteEntry.js loaded after idle | Predicted next navigation |

### Bundle Sharing Savings
With 3 MFEs each using React (45KB gzipped):
- Without federation: 3 x 45KB = 135KB shared deps loaded separately
- With federation (singleton): 45KB loaded once = 3x savings on shared deps

## Accessibility Considerations

- Each MFE must manage its own focus management and aria-live regions
- Navigation between MFEs must preserve focus (don't lose keyboard focus)
- Loading states between MFE transitions need aria-busy or aria-live announcements
- Shared design system components must maintain consistent a11y across MFEs

## Security Considerations

- Each MFE should be isolated in its own origin or use iframe sandboxing
- Cross-MFE communication via custom events must validate message origin
- Shared auth state needs secure token storage (httpOnly cookies, not localStorage for sensitive tokens)
- Module Federation remoteEntry.js URLs should use HTTPS and SRI (Subresource Integrity)

## Module Federation with Rspack/Vite

```typescript
// Rspack Module Federation (faster builds than Webpack 5)
// rspack.config.js (host)
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        orders: 'orders@https://orders.app.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      },
    }),
  ],
};
```

```typescript
// Vite Module Federation (@originjs/vite-plugin-federation)
// vite.config.ts (host)
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    federation({
      name: 'shell',
      remotes: {
        orders: 'https://orders.app.com/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
});
```

## Cross-App Routing Patterns

```typescript
// Microfrontend routing coordination
// Shell manages top-level routes, delegates sub-routes to MFEs

// Shell router (React Router)
const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Home /> },
      // Delegated to Orders MFE
      { path: 'orders/*', element: <OrdersShell /> },
      // Delegated to Products MFE
      { path: 'products/*', element: <ProductsShell /> },
    ],
  },
]);

// Orders MFE receives base path from shell
function OrdersShell() {
  return (
    <BrowserRouter basename="/orders">
      <Routes>
        <Route index element={<OrderList />} />
        <Route path=":id" element={<OrderDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

// URL-based communication:
// Orders MFE navigates to /products/123 — shell router handles the transition
// No shared state needed for navigation between MFEs
```

## Shared Auth State Across MFEs

```typescript
// Auth token stored in httpOnly cookie (accessible to all MFEs via same domain)
// Shell MFE manages login/logout, shares auth state via custom events

// Shell auth service
class AuthService {
  private currentUser: User | null = null;

  async login(credentials: Credentials): Promise<void> {
    const { token, user } = await api.login(credentials);
    // Set httpOnly cookie (server-side)
    document.cookie = `session=${token}; path=/; HttpOnly; Secure; SameSite=Lax`;
    this.currentUser = user;
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
  }

  async logout(): Promise<void> {
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    this.currentUser = null;
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: null } }));
  }
}

// Any MFE listens:
window.addEventListener('auth:changed', (e: CustomEvent) => {
  if (e.detail.user) {
    // User logged in — update UI
  } else {
    // User logged out — redirect to login
  }
});
```

## Module Federation Dynamic Remotes

```typescript
// Dynamic remote loading — useful for feature flags or A/B testing
// Instead of static remotes in webpack config, load at runtime

interface RemoteConfig {
  name: string;
  url: string;
}

class DynamicFederationLoader {
  private loaded = new Map<string, any>();

  async loadRemote(config: RemoteConfig): Promise<any> {
    if (this.loaded.has(config.name)) {
      return this.loaded.get(config.name);
    }

    // Dynamic import of remote entry
    await __webpack_init_sharing__('default');
    const container = await import(/* webpackIgnore:true */ config.url);
    await container.init(__webpack_share_scopes__.default);

    this.loaded.set(config.name, container);
    return container;
  }

  async getModule<T>(remoteName: string, modulePath: string): Promise<() => T> {
    const container = await this.loaded.get(remoteName);
    const factory = await container.get(modulePath);
    return factory();
  }
}

// Usage:
// const OrderList = React.lazy(() => dynamicLoader.getModule('orders', './OrderList'));
```

## Testing Microfrontends

```typescript
// Integration testing MFEs together
// Playwright test across MFEs on the same page
test('navigation between MFEs works', async ({ page }) => {
  await page.goto('/');
  // Click order link in Shell → Orders MFE loads
  await page.click('[data-mfe="shell"] a[href="/orders"]');
  await expect(page.locator('[data-mfe="orders"]')).toBeVisible();
  // Click product link → Products MFE loads
  await page.click('[data-mfe="orders"] a[href="/products/123"]');
  await expect(page.locator('[data-mfe="products"]')).toBeVisible();
});

// Unit testing Module Federation components
// Mock the remote import
jest.mock('orders/OrderList', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-order-list">Mocked Orders</div>,
}));
```

## Performance Optimization

| Technique | Impact | Implementation |
|-----------|--------|---------------|
| Preload critical remotes | Remove waterfall loading | `<link rel="modulepreload" href="orders/remoteEntry.js">` |
| Lazy load non-critical MFEs | Faster initial load | Dynamic import in route component |
| Share large deps as singleton | Reduce duplicate bytes | React, ReactDOM, lodash as singleton |
| Async chunk splitting | Parallel loading | Each MFE produces independent chunks |
| Remote entry caching | Cache remoteEntry.js with hash | Versioned URLs, long cache headers |
| Preconnect to MFE origins | Faster DNS/SSL | `<link rel="preconnect" href="https://orders.app.com">` |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Too fine-grained** | Every component is a microfrontend | Group by team ownership and deployment boundaries |
| **Shared DB** | Tight coupling between frontends | Each MFE owns its data domain |
| **No shared design system** | Visual inconsistency | Shared component library via federation |
| **Circular shared deps** | Build-time errors | Strict dependency graph enforcement |
| **Wrong version of React** | Hooks broken, context lost | Force singleton via Module Federation config |
| **Synchronous remote loading** | Blocks main thread on remote load | Lazy load all remotes via React.lazy + Suspense |
| **Missing error boundaries** | One MFE crash takes down whole app | Each MFE wrapped in error boundary |
| **No loading states** | User sees blank screen on slow network | Suspense fallback per MFE boundary |
| **Over-communication** | Tight coupling via shared state | Prefer URL-based communication, limit shared state to auth only |

## Rules
- Microfrontend overhead only justified at 3+ independent teams on the same product
- React and react-dom MUST be singleton — two instances break hooks, context, and event system
- Never share remoteEntry.js directly — use CDN with long cache and versioned paths
- Group microfrontends by team ownership and deployment boundaries, not by component granularity
- Every MFE owns its data domain — no shared database between frontends
- Maintain a shared design system as a federated module for visual consistency
- Enforce strict dependency graph to prevent circular shared dependencies
- Use content hash or timestamp versioning on remoteEntry.js for cache busting
- Each MFE independence: builds, tests, and deploys independently — no coordination required for rollout

## References
  - references/communication-strategies.md — Inter-MFE Communication Strategies
  - references/microfrontend-architecture.md — Microfrontend Architecture
  - references/microfrontend-deployment.md — Microfrontend Deployment Reference
  - references/microfrontend-integration.md — Microfrontend Integration
  - references/microfrontend-testing.md — Microfrontend Testing Reference
  - references/module-federation.md — Module Federation Reference
## Handoff

Hand off to `frontend/universal/patterns/SKILL.md` for component patterns used within each microfrontend. Hand off to `frontend/universal/design-system/SKILL.md` for shared design system.
