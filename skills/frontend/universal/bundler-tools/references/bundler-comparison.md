# Bundler Comparison

## Feature Comparison

| Feature | Vite | Webpack 5 | Turbopack | Parcel | Rspack |
|---------|------|-----------|-----------|--------|--------|
| Dev server start | < 1s | 5-30s | < 1s | < 2s | < 2s |
| HMR | Instant | 1-3s | Instant | Fast | Fast |
| Production build | Rollup | Webpack | Not ready | Parcel | Rspack |
| Plugin ecosystem | Large | Largest | Minimal | Small | Growing |
| Configuration | Minimal | Verbose | Minimal | Zero-config | Minimal |
| Code splitting | Automatic | Automatic | Automatic | Automatic | Automatic |
| CSS modules | Built-in | Plugin | Built-in | Built-in | Built-in |
| SSR support | Built-in | Manual | Manual | Built-in | Built-in |
| Monorepo support | Good (via plugins) | Manual | Good | Limited | Good |
| WASM support | Built-in | Plugin | Built-in | Built-in | Built-in |

## Key Metric Comparison

```
Vite (React SPA):        Dev start 0.4s | HMR 10ms | Build 8s | Bundle 180KB
Webpack 5 (React SPA):   Dev start 12s  | HMR 300ms | Build 15s | Bundle 175KB
Turbopack (Next.js):     Dev start 0.3s | HMR 5ms | (no build yet)
Parcel (React SPA):      Dev start 1.2s | HMR 50ms | Build 10s | Bundle 190KB
```

## Migration Paths

### Webpack → Vite
```typescript
// 1. Install Vite
npm install -D vite @vitejs/plugin-react

// 2. Create vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    rollupOptions: {
      input: { main: path.resolve(__dirname, 'index.html') },
    },
  },
})

// 3. Move index.html to root
// 4. Replace process.env with import.meta.env
// 5. Remove webpack.config.js, babel config
```

### Webpack → Rspack
```typescript
// 1. Install Rspack
npm install -D @rspack/cli @rspack/plugin-react-refresh

// 2. Convert webpack config (minimal changes)
const rspack = require('@rspack/core')
module.exports = {
  entry: './src/index.tsx',
  plugins: [new rspack.HtmlRspackPlugin({ template: './index.html' })],
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'builtin:swc-loader' },
    ],
  },
}
```

## Vite vs Webpack Plugin Equivalents

| Function | Webpack | Vite |
|----------|---------|------|
| TS/Babel | `babel-loader` | Built-in (esbuild) |
| CSS Modules | `css-loader` | Built-in |
| CSS extraction | `MiniCssExtractPlugin` | Built-in |
| Image import | `file-loader` | Built-in (static assets) |
| SVG as component | `@svgr/webpack` | `vite-plugin-svgr` |
| Environment vars | `webpack.DefinePlugin` | `import.meta.env` |
| Copy files | `copy-webpack-plugin` | `vite-plugin-static-copy` |
| Analyze bundle | `webpack-bundle-analyzer` | `vite-plugin-bundle-analyzer` |
| Compression | `compression-webpack-plugin` | `vite-plugin-compression` |

## When to Choose Each Bundler

```
Project type?
├── New SPA, SSR, or static site → Vite (default choice)
├── Existing Webpack project
│   ├── Migrating → Vite (better DX, simpler config)
│   ├── Not migrating → Rspack (drop-in faster replacement)
│   └── Deep custom plugin needs → Stay on Webpack
├── Next.js app with large codebase → Turbopack
├── Small project / prototype → Parcel (zero config)
└── Monorepo with many apps → Vite or Rspack
```

## Dev Build Performance Comparison

| Operation | Vite (esbuild) | Webpack (terser) | Rspack (swc) |
|-----------|---------------|------------------|--------------|
| TS transpile | 50ms | 500ms | 80ms |
| Minification | 200ms (esbuild) | 2s (terser) | 300ms (swc) |
| Source map | 100ms | 800ms | 150ms |
| CSS processing | 30ms | 100ms | 40ms |

## Bundler Performance Tips

```typescript
// Vite: exclude heavy deps from transformation
export default defineConfig({
  optimizeDeps: { exclude: ['large-dep'] },
  build: {
    target: 'es2020', // modern browsers = smaller output
    minify: 'esbuild', // faster than terser
    sourcemap: false, // disable in CI builds
  },
})

// Webpack: cache + parallel
module.exports = {
  cache: { type: 'filesystem' },
  module: {
    rules: [{ test: /\.ts$/, use: 'esbuild-loader' }],
  },
  optimization: {
    minimizer: ['...', new CssMinimizerPlugin({ parallel: true })],
  },
}
```
