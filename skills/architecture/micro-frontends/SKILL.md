---
name: architecture-micro-frontends
description: >
  Use this skill when the user says 'micro-frontends', 'MFE', 'Module Federation', 'split the frontend monolith', 'independent frontend deploys', 'single-spa', 'import maps', 'app shell with remotes'. Decides whether micro-frontends are justified and designs the split, composition technique (build-time, Module Federation, Web Components, server/edge composition, iframes), shared dependencies, routing, communication, and styling isolation. Do NOT use for: component library/design system work (frontend/universal/design-system), framework-specific architecture (frontend/<framework>), or bundler tuning unrelated to federation (frontend/universal/bundler-tools).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [architecture, frontend, micro-frontends, module-federation, web-components, single-spa]
---

# Micro-Frontends

## Purpose
Micro-frontends let independent teams build, test, and deploy parts of one web UI separately. They solve an organizational scaling problem (many teams blocking each other on one release), not a technical performance problem, and they add runtime complexity, duplication risk, and consistency work. Use them when team autonomy is the bottleneck; otherwise a well-structured modular monolith is cheaper.

## Agent Protocol

### Trigger
"micro-frontends", "MFE", "Module Federation", "remoteEntry", "single-spa", "import maps", "app shell", "independent UI deployments".

### Input Context
- Number of teams and how they map to product areas.
- Current frontend stack(s), build tooling (webpack, Rspack, Vite), deployment pipeline.
- Pain points: release coordination, build times, ownership conflicts.
- SEO/SSR requirements and performance budgets.

### Output Artifact
Go/no-go decision, domain split, composition approach, shared-dependency policy, contracts (routes, events), and governance rules.

### Response Format
```
Decision: {MFE|modular monolith} because {reason}
Split: {MFE: owning team, routes}
Composition: {build-time|module federation|web components|server/edge|iframe}
Shared: {react@x singleton, design-system@y} policy={versions}
Comms: {URL/state params|CustomEvent|shared minimal store}
Styling isolation: {CSS Modules|Shadow DOM|prefix}
Perf budget: {JS KB per route}
```

### Completion Criteria
- [ ] MFEs split by business domain/route, not by technical layer.
- [ ] One framework major version enforced for shared singletons.
- [ ] Contracts between host and remotes versioned and tested.
- [ ] Remote failures degrade gracefully (error boundary/fallback).
- [ ] Performance budget measured per route.

## Should You?
| Signal | Points to |
|---|---|
| 1-3 teams, one product area | Modular monolith (monorepo packages, enforced boundaries) |
| Many teams blocked on one release train | Micro-frontends |
| Need to embed legacy app during migration | MFE (strangler pattern) |
| Mixed frameworks as a goal in itself | Red flag: cost without benefit |

## Composition Techniques
| Technique | When composed | Pros | Cons |
|---|---|---|---|
| Build-time packages (npm) | Build | Simple, type-safe | Not independently deployable (host must rebuild) |
| Module Federation (webpack 5, Rspack, `@module-federation/*` incl. Vite plugin) | Runtime (JS) | Independent deploys, shared singletons | Tooling coupling, version skew at runtime |
| single-spa / import maps | Runtime | Framework-agnostic lifecycle | More glue code |
| Web Components | Runtime (DOM) | Framework-agnostic, Shadow DOM isolation | Passing rich data/callbacks is clunky; SSR limited |
| Server/edge composition (SSI/ESI, fragments) | Request | Good for SEO and first paint | Infra complexity, interactivity wiring |
| iframes | Runtime | Strong isolation | Poor UX for layout, routing, overlays, a11y |

## Module Federation Example (webpack 5)

```js
// checkout/webpack.config.js  (remote)
const { ModuleFederationPlugin } = require("webpack").container;
const deps = require("./package.json").dependencies;

module.exports = {
  output: { publicPath: "auto", uniqueName: "checkout" },
  plugins: [
    new ModuleFederationPlugin({
      name: "checkout",
      filename: "remoteEntry.js",
      exposes: { "./CheckoutPage": "./src/CheckoutPage" },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
      },
    }),
  ],
};
```

```js
// shell/webpack.config.js  (host)
new ModuleFederationPlugin({
  name: "shell",
  remotes: { checkout: "checkout@https://cdn.example.com/checkout/remoteEntry.js" },
  shared: { react: { singleton: true, requiredVersion: deps.react },
            "react-dom": { singleton: true, requiredVersion: deps["react-dom"] } },
});
```

```tsx
// shell/src/routes.tsx
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

const CheckoutPage = lazy(() => import("checkout/CheckoutPage"));

export function CheckoutRoute() {
  return (
    <ErrorBoundary fallback={<p>Checkout is temporarily unavailable.</p>}>
      <Suspense fallback={<p>Loading checkout…</p>}>
        <CheckoutPage />
      </Suspense>
    </ErrorBoundary>
  );
}
```

For dynamic remote URLs per environment, load a manifest at runtime (Module Federation 2 runtime APIs or your own config endpoint) instead of hardcoding CDN paths.

## Contracts and Communication
- **Routing**: the shell owns top-level routes; each MFE owns its sub-routes.
- **Data**: pass via URL/route params and props at the mount point; share auth/session via the shell, not via each MFE's own login.
- **Events**: `window.dispatchEvent(new CustomEvent("cart:item-added", { detail: { sku, qty } }))` with a documented, versioned event catalog.
- **Shared state**: keep it minimal (user, locale, feature flags), exposed through a small typed API from the shell; never a shared global Redux store whose shape other teams depend on.

## Styling and Design Consistency
- Scope styles: CSS Modules, CSS-in-JS with unique prefixes, or Shadow DOM for Web Components.
- Share a design system as a versioned package (tokens + components); it is the main lever for consistent UX.
- Avoid global resets inside remotes.

## Performance
- Share framework singletons; audit bundles per route for duplicated libraries.
- Preload `remoteEntry` for likely-next routes; lazy-load the rest.
- Set a JS budget per route and enforce it in CI.

## Governance
- Compatibility rules: host and remotes agree on React/Vue major version and design-system major version; upgrades are coordinated platform work.
- Contract tests: shell smoke tests against each remote's deployed `remoteEntry` before promotion.
- Independent rollback per remote (versioned remote URLs).

## Anti-Patterns
- Splitting by technical layer (header team, button team).
- Multiple framework majors loaded on one page.
- Shared mutable global store across teams.
- Remote failure crashes the whole shell (no error boundary).
- MFEs for a single team "for the future".

## Checklist
- [ ] Organizational justification recorded.
- [ ] Domain-aligned split with route ownership.
- [ ] Composition technique chosen per SEO/SSR needs.
- [ ] Shared singleton and version policy enforced.
- [ ] Event/prop contracts versioned and tested.
- [ ] Style isolation + shared design system.
- [ ] Per-route performance budget and fallback UI.

## References
- Geers, "Micro Frontends in Action" (Manning, 2020); martinfowler.com, "Micro Frontends" (Cam Jackson, 2019).
- webpack Module Federation docs; module-federation.io (Module Federation 2, Rspack/Vite plugins); single-spa docs.
