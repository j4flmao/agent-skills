# Micro-Frontends

> Reference for the `microfrontend` skill; [SKILL.md](../SKILL.md) is the entry point. Merged from the former `architecture/micro-frontends` skill.

## Purpose
Micro-frontends let independent teams build, test, and deploy parts of one web UI separately. They solve an organizational scaling problem (many teams blocking each other on one release), not a technical performance problem, and they add runtime complexity, duplication risk, and consistency work. Use them when team autonomy is the bottleneck; otherwise a well-structured modular monolith is cheaper.

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
