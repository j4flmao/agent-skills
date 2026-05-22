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
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Bundler Tools

**Description:** Configures and optimizes frontend build tools — bundler selection, code splitting, tree shaking, asset optimization, build performance. Triggered by "bundler", "Vite", "Webpack", "Turbopack", "build tool", "bundle config", "build optimization", "tree shaking", "code splitting", "lazy loading", "chunk splitting", "asset bundling", "build performance", "bundler migration".

**Version:** 1.0.0
**Author:** j4flmao
**License:** MIT

---

## Purpose

Configure and optimize the frontend build pipeline for fast development iteration and lean production bundles — leveraging modern bundlers, strategic code splitting, and aggressive tree shaking.

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

—
Compression footer: frontend-bundler-tools/v1 | 4 sections | bundler: <selected> | size: <current>→<target>
```

### Completion Criteria
- Dev server starts in < 2s (Vite) or < 10s (Webpack)
- Production build produces optimized bundles with content hashes
- Code splitting in place for all routes and heavy dependencies
- Asset optimization (minification, image compression)
- Source maps disabled in production

### Max Response Length
4096 tokens

---

## Workflow

### 1. Bundler Selection
- **Vite:** Default choice. Fast dev with esbuild pre-bundling, Rollup production builds. Rich plugin ecosystem. Best for: most SPAs, SSR apps, static sites.
- **Webpack:** Legacy projects, custom plugin needs, fine-grained config control. Richest plugin ecosystem.
- **Turbopack:** Very large Next.js apps. Incremental computation for fast rebuilds. Currently Next.js only.
- **Parcel:** Zero-config, fast. Good for: small projects, prototypes.

### 2. Code Splitting
- Dynamic `import()` → automatic chunk by bundler.
- Vendor chunk: separate chunk for `node_modules` (longer cache).
- Route-based splitting: one chunk per route (SPA frameworks).
- Component-level: lazy-load heavy components (charts, editors, maps).
- Lib splitting: extract large deps to separate chunks.

### 3. Tree Shaking
- `"sideEffects": false` in `package.json` — tells bundler to remove unused exports.
- ES modules only (`import`/`export`) — CommonJS `require()` can't be tree-shaken.
- Avoid barrel files (`index.ts` that re-export everything) — bundler may retain unused exports.
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
- Public env vars only (prefixed) — never bundle secrets.
- Build-time constants: `__VERSION__`, `__COMMIT_HASH__`, `__BUILD_TIME__`.

---

## Rules

1. Use dynamic `import()` for every lazy route — no eager imports for route components.
2. Always use content hashes in output filenames for long-term caching.
3. Set `"sideEffects": false` in library `package.json` for tree shaking.
4. Avoid barrel `index.ts` files that re-export everything from a directory.
5. Environment variables are build-time constants — never reference runtime env in client code.
6. Source maps only in development — disable in production or use hidden source maps for error monitoring.
7. Enable tree shaking at bundler level — don't rely solely on minifier.
8. Keep production entry chunk under 200KB (gzipped) for fast initial load.

---

## References

- `references/vite-config.md` — Vite config, plugins, SSR, build optimization, migration from Webpack
- `references/bundle-optimization.md` — Code splitting, tree shaking, asset pipeline, caching, performance budgets

---

## Handoff

If project requires custom Webpack plugin development, complex Module Federation setup, or migration from a legacy bundler (Grunt/Gulp/Browserify), flag for build engineer review. Otherwise implement complete bundler config.
