---
name: frontend-bundler-tools
description: >
  Use this skill when the user says 'bundler', 'Vite', 'Webpack', 'Turbopack', 'build tool', 'bundle config', 'build optimization', 'tree shaking', 'code splitting', 'lazy loading', 'chunk splitting', 'asset bundling', 'build performance', 'bundler migration'. Configure and optimize frontend build tooling. Do NOT use for: framework-specific builds or deployment pipelines.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, bundler, build, phase-7, universal]
version: "1.2.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Bundler Tools

**Description:** Configures and optimizes frontend build tools -- bundler selection, code splitting, tree shaking, asset optimization, build performance. Triggered by "bundler", "Vite", "Webpack", "Turbopack", "build tool", "bundle config", "build optimization", "tree shaking", "code splitting", "lazy loading", "chunk splitting", "asset bundling", "build performance", "bundler migration".

**Version:** 1.2.0
**Author:** j4flmao
**License:** MIT

---

## Purpose

Configure and optimize the frontend build pipeline for fast development iteration and lean production bundles -- leveraging modern bundlers, strategic code splitting, and aggressive tree shaking. Target: dev server < 2s, production entry chunk < 200KB gzipped.

---

## Agent Protocol

### Trigger
User request includes any of: "bundler", "Vite", "Webpack", "Turbopack", "build tool", "bundle config", "build optimization", "tree shaking", "code splitting", "lazy loading", "chunk splitting", "asset bundling", "build performance", "bundler migration".

### Input Context
- Current bundler (if migrating)
- Framework (React, Vue, Svelte, etc.)
- Project size and monorepo structure
- Performance targets (bundle size, build time)

### Output Artifact
Build configuration with optimization strategy.

### Response Format
```
## Strategy
<bundle-selection, migration-plan>

## Config
<key-config-snippets>

## Splitting
<code-splitting, chunk-strategy>

## Optimization
<tree-shaking, assets, caching>

--
Compression footer: frontend-bundler-tools/v1 | 4 sections | bundler: <selected> | size: <current>-><target>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- Dev server starts in < 2s (Vite) or < 10s (Webpack)
- Production build produces optimized bundles with content hashes
- Code splitting in place for all routes and heavy dependencies
- Asset optimization (minification, image compression)
- Source maps disabled in production

### Max Response Length
4096 tokens

---

## Component Architecture / Decision Trees

### Bundler Selection Decision Tree

```
Project type?
  |-- SPA (React, Vue, Svelte) --> Vite (default), Webpack (legacy)
  |-- SSR framework -->
  |     |-- Next.js -> Turbopack (dev) + Webpack (prod) or Next.js 15+: Turbopack (both)
  |     |-- Nuxt -> Vite (built-in)
  |     |-- Remix -> Vite (built-in since v2)
  |     |-- Astro -> Vite (built-in)
  |-- Library/package -->
  |     |-- ESM only -> tsup / bunchee
  |     |-- UMD + ESM + CJS -> Rollup
  |     |-- Micro-frontend -> Module Federation (Webpack 5 / Vite plugin)
  |-- Monorepo -->
        |-- Batch: TurboRepo + Vite
        |-- Fine-grained: Nx + Vite/Webpack
```

### Architecture Options

**Option A: Vite with Rollup production build.**
Best for: Most projects. Fastest dev experience. Rich plugin ecosystem. Production via Rollup with tree shaking and code splitting.

**Option B: Webpack 5 with persistent caching.**
Best for: Legacy projects, complex Module Federation setups, projects needing fine-grained loader configuration.

**Option C: Turbopack (Next.js).**
Best for: Very large Next.js applications. Incremental computation for fast rebuilds. Limited to Next.js ecosystem.

**Option D: Parcel with zero configuration.**
Best for: Small projects, prototypes, internal tools. Fast builds with zero configuration.

**Option E: tsup/Rollup for library publishing.**
Best for: Publishing npm packages with multiple formats (ESM, CJS, UMD).

---

## Workflow

### 1. Bundler Selection
- **Vite:** Default choice. Fast dev with esbuild pre-bundling, Rollup production builds. Rich plugin ecosystem. Best for: most SPAs, SSR apps, static sites.
- **Webpack:** Legacy projects, custom plugin needs, fine-grained config control. Richest plugin ecosystem.
- **Turbopack:** Very large Next.js apps. Incremental computation for fast rebuilds. Currently Next.js only.
- **Parcel:** Zero-config, fast. Good for: small projects, prototypes.

### 2. Code Splitting
- Dynamic `import()` -- automatic chunk by bundler.
- Vendor chunk: separate chunk for `node_modules` (longer cache).
- Route-based splitting: one chunk per route (SPA frameworks).
- Component-level: lazy-load heavy components (charts, editors, maps).
- Lib splitting: extract large deps to separate chunks.

### 3. Tree Shaking
- `"sideEffects": false` in `package.json` -- tells bundler to remove unused exports.
- ES modules only (`import`/`export`) -- CommonJS `require()` can't be tree-shaken.
- Avoid barrel files (`index.ts` that re-export everything) -- bundler may retain unused exports.
- Dead code elimination via minifier (terser, esbuild, swc).
- Mark components as `/*#__PURE__*/` when they have no side effects.

### 4. Asset Optimization
- CSS minification via lightningcss (Vite) or css-minimizer-webpack-plugin.
- JS minification via esbuild (Vite) or terser-webpack-plugin (Webpack).
- Image compression via sharp during build (responsive images, WebP generation).
- Font subsetting: remove unused glyphs from icon fonts / variable fonts.
- Brotli/Gzip compression generated at build time for static hosting.

### 5. Build Performance
- Content hash in filenames for cache invalidation: `[name].[contenthash:8].js`.
- Persistent cache: Vite's cacheDir, Webpack's `cache: { type: 'filesystem' }`.
- esbuild-loader for TS/JSX transpilation (swap babel-loader).
- swc-loader as alternative (faster than babel, slower than esbuild).
- Exclude large deps from bundling if served separately (CDN).

### 6. Environment Config
- Mode-specific `.env` files: `.env.development`, `.env.production`, `.env.local`.
- Define replacement: `import.meta.env.VITE_API_URL` (Vite), `process.env.API_URL` (Webpack).
- Public env vars only (prefixed) -- never bundle secrets.
- Build-time constants: `__VERSION__`, `__COMMIT_HASH__`, `__BUILD_TIME__`.

### 7. Migrating Between Bundlers
1. Audit all bundler-specific plugins and replace with framework-native alternatives
2. Migrate PostCSS config to framework-native CSS handling
3. Replace `process.env.*` with `import.meta.env.*` (Vite) or inject via define
4. Update import paths for asset resolution
5. Test build output for parity: chunk count, total size, runtime behavior
6. Add build time measurement and compare between old and new

### 8. Measuring Bundle Health
```bash
# Analyze bundle composition
npx vite-bundle-analyzer
npx webpack-bundle-analyzer dist/stats.json
# Track over time in CI
```

---

## Common Pitfalls

### 1. Barrel File Bloat
```ts
// BAD: re-exports everything, bundler includes unused exports
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Modal } from './Modal';
// ... 50 more exports

// GOOD: tree-shakeable, direct imports
import { Button } from './Button';
```

### 2. Dynamic Import Strings
```tsx
// BAD -- static analysis cannot resolve the import path
const Component = React.lazy(() => import(`./pages/${pageName}`));

// GOOD -- explicit mapping, fully analyzable
const pages = {
  home: () => import('./pages/Home'),
  about: () => import('./pages/About'),
  contact: () => import('./pages/Contact'),
};
```

### 3. Missing sideEffects: false
Without this flag, bundlers assume every module import has side effects and will not tree-shake unused exports. Always set `"sideEffects": false` in library `package.json` files.

### 4. CommonJS Dependencies
Some npm packages export as CommonJS (`module.exports`). These cannot be tree-shaken. Use `"module"` field in package.json or use bundler heuristics (Webpack's `module.rules` with `sideEffects`).

### 5. Large Vendor Bundles Without Splitting
All node_modules in a single vendor chunk means a change to any dependency invalidates the entire cache. Split vendors by category: `react-vendor`, `ui-lib`, `utility`.

### 6. Source Maps in Production
Generating full source maps in production slows the build and exposes source code. Use `hidden-source-map` for error monitoring or disable entirely.

---

## Compared With

| Bundler | Dev Speed | Production Build | Config Complexity | Plugin Ecosystem | Use Case |
|---------|-----------|-----------------|-------------------|-----------------|----------|
| Vite | < 2s HMR | Fast (Rollup) | Low | Growing | Default for new projects |
| Webpack 5 | 2-10s HMR | Moderate | High | Largest | Legacy, enterprise, Module Federation |
| Turbopack | < 50ms HMR | Fast | Low (Next.js) | Limited | Large Next.js apps |
| Parcel | < 1s HMR | Fast | Zero | Small | Prototypes, small projects |
| Rollup | N/A (no dev server) | Fast | Moderate | Large | Library publishing |
| esbuild | < 100ms | Very fast | Low | Minimal | Transpilation, simple builds |
| Rsbuild | < 1s HMR | Fast | Low | Growing | Webpack-compatible modern build |

---

## Performance Considerations

### Dev Server Optimization
- Vite uses esbuild pre-bundling to convert CommonJS deps to ESM -- large deps take extra time on first load
- Configure `optimizeDeps.include` for deps that are slow to pre-bundle
- Vite caches pre-bundled deps in `node_modules/.vite` -- invalidate by deleting this directory
- Webpack's `watchOptions.aggregateTimeout` reduces rebuild thrashing on file change

### Production Build Optimization
- Parallelism: Webpack `parallel: true` for terser, Vite uses esbuild (parallel by default)
- CSS extraction: `mini-css-extract-plugin` (Webpack) or Vite's built-in CSS splitting
- Image assets: Use `vite-plugin-image-optimizer` (Vite) or `image-minimizer-webpack-plugin` (Webpack)
- Font subsetting: Use glyphhanger or `font-subset` CLI tools

### Bundle Analysis
- `vite-bundle-analyzer` for Vite projects
- `webpack-bundle-analyzer` for Webpack projects
- Track baseline: `npm run build` time, total output size, entry chunk size, vendor chunk count

---

## Ecosystem & Tooling

### Bundle Analysis
- **webpack-bundle-analyzer** -- Interactive treemap of Webpack output
- **vite-bundle-analyzer** -- Visualize Vite bundle composition
- **bundle-wizard** -- Visual analysis and suggestions
- **bundlephobia.com** -- Check individual package size before adding

### Build Performance
- **esbuild** -- Go-based transpiler/minifier, 10-100x faster than Babel/Terser
- **swc** -- Rust-based transpiler/minifier, faster than Babel
- **lightningcss** -- Rust-based CSS parser/transformer/minifier
- **oxlint** -- Rust-based linter (potential ESLint replacement)

### Plugin Libraries
- **Vite plugins:** `@vitejs/plugin-react`, `@vitejs/plugin-vue`, `vite-plugin-pwa`, `vite-plugin-svgr`
- **Webpack plugins:** `html-webpack-plugin`, `mini-css-extract-plugin`, `copy-webpack-plugin`
- **Rollup plugins:** `@rollup/plugin-commonjs`, `@rollup/plugin-node-resolve`, `@rollup/plugin-typescript`

---

## Rules

1. Use dynamic `import()` for every lazy route -- no eager imports for route components.
2. Always use content hashes in output filenames for long-term caching.
3. Set `"sideEffects": false` in library `package.json` for tree shaking.
4. Avoid barrel `index.ts` files that re-export everything from a directory.
5. Environment variables are build-time constants -- never reference runtime env in client code.
6. Source maps only in development -- disable in production or use hidden source maps for error monitoring.
7. Enable tree shaking at bundler level -- don't rely solely on minifier.
8. Keep production entry chunk under 200KB (gzipped) for fast initial load.
9. Separate vendor code from application code for cache optimization.
10. Measure build time and bundle size in CI and alert on regressions.

---

## References

- `references/bundle-optimization.md` -- Bundle Optimization
- `references/bundler-comparison.md` -- Bundler Comparison
- `references/bundler-configuration.md` -- Bundler Configuration
- `references/bundler-optimization.md` -- Bundler Optimization
- `references/module-federation.md` -- Module Federation
- `references/vite-config.md` -- Vite Configuration
- `references/bundler-performance-tuning.md` -- Bundler Performance Tuning
- `references/module-federation-code-splitting.md` -- Module Federation & Code Splitting

## Handoff

If project requires custom Webpack plugin development, complex Module Federation setup, or migration from a legacy bundler (Grunt/Gulp/Browserify), flag for build engineer review. Otherwise implement complete bundler config.
