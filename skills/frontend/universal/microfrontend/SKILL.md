---
name: microfrontend
description: >
  Use this skill when the user asks about microfrontend, Module Federation, Web
  Components, iframe integration, shared dependencies, or cross-app communication
  between frontend applications.
version: "1.0.0"
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

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Too fine-grained** | Every component is a microfrontend | Group by team ownership and deployment boundaries |
| **Shared DB** | Tight coupling between frontends | Each MFE owns its data domain |
| **No shared design system** | Visual inconsistency | Shared component library via federation |
| **Circular shared deps** | Build-time errors | Strict dependency graph enforcement |
| **Wrong version of React** | Hooks broken, context lost | Force singleton via Module Federation config |

## References

### Reference Files
- `references/module-federation.md` — Detailed Module Federation configuration with examples
- `references/communication-strategies.md` — Inter-MFE communication protocols

### Related Skills
- `frontend/universal/patterns/SKILL.md` — Frontend component and hooks patterns
- `frontend/universal/design-system/SKILL.md` — Shared component library
- `frontend/universal/state-management/SKILL.md` — State management across MFEs
- `devops/containerization/SKILL.md` — Deployment and orchestration

## Handoff

Hand off to `frontend/universal/patterns/SKILL.md` for component patterns used within each microfrontend. Hand off to `frontend/universal/design-system/SKILL.md` for shared design system.
