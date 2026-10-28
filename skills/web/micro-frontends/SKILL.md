---
name: web-micro-frontends-import-maps
description: >
  Use this skill when the user says 'import maps', 'single-spa', 'native federation', 'micro-frontends without webpack', 'ES module micro-frontends', 'mount/unmount lifecycle', 'framework-agnostic micro-frontend'. It composes micro-frontends with browser-native ES modules and import maps (single-spa or Native Federation), defining lifecycle contracts, shared dependency mapping and deployment of versioned remotes. Do NOT use for: Webpack/Rspack Module Federation configuration (use module-federation-runtime-sharing), deciding whether to adopt micro-frontends (use micro-frontends-adoption), or framework-specific microfrontend recipes (use microfrontend).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [web, micro-frontends, import-maps, single-spa, native-federation, esm]
---

# Micro-frontends with Import Maps & ES Modules

## Purpose
Browsers natively resolve bare module specifiers through import maps (`<script type="importmap">`, supported in all evergreen browsers). That allows micro-frontends built with any bundler (Vite, esbuild, Rollup) to be deployed independently and loaded by URL, without a bundler-specific runtime. This skill builds that setup with explicit mount/unmount lifecycles and a shared-dependency map.

## Agent Protocol

### Trigger
"import map", "importmap", "single-spa", "native federation", "@angular-architects/native-federation", "ESM micro-frontend", "mount unmount lifecycle", "Vite micro-frontend".

### Input Context
- Frameworks per micro-frontend and bundler (Vite/esbuild/Angular CLI).
- Routing ownership (shell routes vs. app-internal routes).
- Hosting/CDN and how deployments are promoted per environment.

### Output Artifact
Import map, root config/shell code, per-app lifecycle entry, deployment step updating the map.

### Response Format
```
Shell: {root-config / host}
Apps: {name -> route -> ESM URL}
Shared: {specifier -> URL (single copy)}
Lifecycle: bootstrap/mount/unmount
Deploy: {how import map is updated per env}
```

## Import Map

```html
<script type="importmap">
{
  "imports": {
    "react": "https://cdn.example.com/shared/react@19.1.0/index.js",
    "react-dom/client": "https://cdn.example.com/shared/react-dom@19.1.0/client.js",
    "@acme/catalog": "https://cdn.example.com/catalog/3f9c2a1/catalog.js",
    "@acme/checkout": "https://cdn.example.com/checkout/a81b7e0/checkout.js",
    "@acme/contracts": "https://cdn.example.com/contracts/1.4.0/index.js"
  }
}
</script>
<script type="module" src="/root-config.js"></script>
```
- The import map must appear before any module script that uses it. Multiple import maps are merged in modern browsers; for older ones use one map or the `es-module-shims` polyfill.
- Serve the HTML/import map with short cache; versioned/hashed app URLs can be cached immutably.
- React does not ship official ESM builds; produce them in your own build (or from an ESM CDN such as esm.sh) and pin exact versions so all apps share one copy.

## Lifecycle Contract
Every micro-frontend exports the same functions so the shell can treat them uniformly:

```ts
// @acme/contracts
export interface MountProps {
  domElement: HTMLElement;
  basePath: string;
  getToken: () => Promise<string>;
}
export interface MicroFrontend {
  mount(props: MountProps): Promise<void>;
  unmount(props: MountProps): Promise<void>;
}
```

```tsx
// catalog/src/entry.tsx — built by Vite as an ES module library, react externalized
import { createRoot, type Root } from 'react-dom/client';
import type { MicroFrontend, MountProps } from '@acme/contracts';
import { CatalogApp } from './CatalogApp';

let root: Root | null = null;

const app: MicroFrontend = {
  async mount({ domElement, basePath, getToken }: MountProps) {
    root = createRoot(domElement);
    root.render(<CatalogApp basePath={basePath} getToken={getToken} />);
  },
  async unmount() {
    root?.unmount();
    root = null;
  },
};
export default app;
```

```ts
// catalog/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: 'src/entry.tsx', formats: ['es'], fileName: 'catalog' },
    rollupOptions: { external: ['react', 'react-dom/client', '@acme/contracts'] },
  },
});
```

## Shell Router (no framework)

```ts
// root-config.ts
import type { MicroFrontend } from '@acme/contracts';

const routes: { prefix: string; specifier: string }[] = [
  { prefix: '/catalog', specifier: '@acme/catalog' },
  { prefix: '/checkout', specifier: '@acme/checkout' },
];

const outlet = document.getElementById('app');
if (!outlet) throw new Error('Shell outlet #app missing');
let active: { app: MicroFrontend; prefix: string } | null = null;

async function route(): Promise<void> {
  const match = routes.find((r) => location.pathname.startsWith(r.prefix));
  if (active && active.prefix === match?.prefix) return;
  const props = { domElement: outlet!, basePath: match?.prefix ?? '/', getToken };
  if (active) await active.app.unmount(props);
  active = null;
  if (!match) { outlet!.textContent = 'Not found'; return; }
  try {
    const mod = (await import(match.specifier)) as { default: MicroFrontend };
    await mod.default.mount(props);
    active = { app: mod.default, prefix: match.prefix };
  } catch (err) {
    console.error(`Failed to load micro-frontend ${match.specifier} for ${location.pathname}`, err);
    outlet!.textContent = 'This section is temporarily unavailable.';
  }
}

async function getToken(): Promise<string> {
  const res = await fetch('/auth/token', { credentials: 'include' });
  if (!res.ok) throw new Error(`Token request failed with ${res.status}`);
  return (await res.json()).token as string;
}

window.addEventListener('popstate', route);
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest('a[data-shell-link]');
  if (a instanceof HTMLAnchorElement) { e.preventDefault(); history.pushState({}, '', a.href); void route(); }
});
void route();
```
TypeScript needs `declare module '@acme/*'` typings or a contracts package for the bare specifiers.

## Off-the-shelf Options
| Tool | What it adds |
|------|-------------|
| single-spa | Router-driven registration (`registerApplication`, `start`), framework adapters (`single-spa-react`, `-vue`, `-angular`), layout engine |
| Native Federation (`@softarc/native-federation`, `@angular-architects/native-federation`) | Module-Federation-like config (exposes/shared) that emits import maps; works with esbuild/Angular CLI |
| es-module-shims | Polyfill + features like multiple/dynamic import maps |

## Deployment
1. Each app's CI builds to an immutable, versioned URL (`/catalog/<git-sha>/catalog.js`).
2. Promotion = updating that app's entry in the environment's import map (stored in a config service/KV), not rebuilding the shell.
3. Rollback = point the map back to the previous URL.
4. Run a smoke test against the composed shell after each map update.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| Each app bundles its own React | Externalize + single shared URL in the import map |
| Shell imports app internals | Only the lifecycle contract is public |
| Long-cached import map | Short TTL for the map, immutable caching for assets |
| No unmount → memory leaks and duplicate listeners | Enforce `unmount` in the contract and test it |
| Global CSS from every app | CSS Modules/scoped styles or Shadow DOM, design-system tokens |

## Checklist
- [ ] Import map precedes module scripts; polyfill strategy decided.
- [ ] Shared deps externalized and mapped once with pinned versions.
- [ ] Lifecycle contract published as a typed package.
- [ ] Load failures caught with a visible fallback.
- [ ] Deploy promotes by editing the map; rollback tested.
