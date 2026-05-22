# Vite Configuration

Complete patterns for Vite config, plugins, SSR, build optimization, and migration from Webpack.

---

## Basic Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
```

---

## Code Splitting with Vite

```ts
rollupOptions: {
  output: {
    manualChunks(id: string) {
      if (id.includes('node_modules')) {
        const pkg = id.split('node_modules/')[1].split('/')[0];
        return `vendor-${pkg}`;
      }
      if (id.includes('src/pages/')) {
        return 'pages';
      }
    },
  },
},
```

---

## Environment Variables

```
# .env.development
VITE_API_URL=http://localhost:8080

# .env.production
VITE_API_URL=https://api.example.com
```

```ts
const apiUrl = import.meta.env.VITE_API_URL;
```

Add TypeScript types:
```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
```

---

## Plugins

| Plugin | Purpose |
|--------|---------|
| `@vitejs/plugin-react` | React fast-refresh, JSX transform |
| `@vitejs/plugin-vue` | Vue SFC compilation |
| `vite-plugin-pwa` | Service worker generation |
| `vite-plugin-compression` | Brotli/Gzip output |
| `vite-plugin-image-optimizer` | Sharp-based image optimization |
| `unplugin-auto-import` | Auto-import API without explicit import |

---

## SSR Setup

```ts
export default defineConfig({
  plugins: [react()],
  ssr: {
    noExternal: ['@some-lib'],
    target: 'node',
  },
});
```

Server entry uses `server.render()` for per-request HTML generation. Client hydration via `hydrateRoot` on the same component tree.

---

## Migration from Webpack

| Webpack | Vite Equivalent |
|---------|----------------|
| `webpack-dev-server` | Built-in dev server |
| `babel-loader` | esbuild transpilation |
| `css-loader` + `style-loader` | Native CSS handling |
| `file-loader` | Static asset import (URL or inline) |
| `DefinePlugin` | `import.meta.env.*` |
| `HtmlWebpackPlugin` | Built-in HTML generation |
| `MiniCssExtractPlugin` | Built-in CSS extraction |
| `TerserPlugin` | esbuild minifier (default) |
| `ModuleFederationPlugin` | `vite-plugin-federation` |

Key migration steps: convert `require` to ESM `import`, move config from `webpack.config.js` to `vite.config.ts`, test HMR behavior.
