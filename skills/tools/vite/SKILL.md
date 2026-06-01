# Vite Skill

## Overview
Vite is a build tool and dev server that provides fast HMR and optimized production builds using native ESM. This skill covers configuration patterns, plugin development, build optimization, SSR, and deployment.

## Decision Tree: Should I Use Vite?

### Build Tool Selection
```
What kind of project?
├── New frontend app (React, Vue, Svelte, etc.) → Vite (best DX)
├── Existing CRA/Webpack project → Migrate to Vite (significant speed improvement)
├── Library/package publishing → Vite library mode
├── Server-rendered app (Next.js, Nuxt, Remix) → Use framework's own build (still Vite-based)
├── SSR app from scratch → Vite + express/koa
├── Simple static site → Vite (lightweight, fast)
└── Legacy browser support needed → Vite with @vitejs/plugin-legacy
```

### Framework Setup Decision
```
Which framework?
├── React → @vitejs/plugin-react (SWC) or @vitejs/plugin-react-swc (faster)
├── Vue → @vitejs/plugin-vue + @vitejs/plugin-vue-jsx
├── Svelte → @sveltejs/vite-plugin-svelte
├── Solid → vite-plugin-solid
├── Lit → @lit-labs/vite-plugin
├── Vanilla JS/TS → No plugin needed
└── Astro/Nuxt/Next → Use their CLI (internally Vite)
```

## Configuration Patterns

### Project Structure Setup
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

### Environment Variable Pattern
```typescript
// Use import.meta.env — never process.env in browser code
// .env
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=My App
VITE_ENABLE_FEATURE_X=true

// Access in code:
const apiUrl = import.meta.env.VITE_API_URL;
if (import.meta.env.VITE_ENABLE_FEATURE_X === 'true') {
  enableFeatureX();
}

// TypeScript types:
// src/env.d.ts or vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_ENABLE_FEATURE_X: string;
}
```

### Mode-Based Configuration
```typescript
export default defineConfig(({ mode, command }) => {
  const isProduction = mode === 'production';
  const isBuild = command === 'build';

  return {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    build: {
      minify: isProduction ? 'esbuild' : false,
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          entryFileNames: isProduction
            ? 'assets/[name].[hash].js'
            : 'assets/[name].js',
        },
      },
    },
    css: {
      modules: {
        generateScopedName: isProduction
          ? '[hash:base64:8]'
          : '[name]__[local]__[hash:base64:5]',
      },
    },
  };
});
```

## Plugin Development

### Plugin Decision Tree
```
What does my plugin need to do?
├── Transform source files → use `transform` hook
├── Resolve module paths → use `resolveId` + `load` hooks
├── Inject virtual modules → use `virtual:` prefix pattern
├── Add dev server routes → use `configureServer` middleware
├── Customize HTML output → use `transformIndexHtml`
├── Modify build output → use `generateBundle` + `writeBundle`
└── SSR transformations → use `ssrTransform` hook
```

### Common Plugin Patterns

#### Virtual Module Pattern
```typescript
function virtualRoutesPlugin(): Plugin {
  const virtualModuleId = 'virtual:routes';
  const resolvedId = '\0' + virtualModuleId;

  return {
    name: 'virtual-routes',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId;
      return null;
    },
    load(id) {
      if (id === resolvedId) {
        // Generate routes at build time
        const routes = scanFilesystemForRoutes();
        return `export const routes = ${JSON.stringify(routes)};`;
      }
      return null;
    },
  };
}
```

#### Transform Pattern
```typescript
function stripDebugPlugin(): Plugin {
  return {
    name: 'strip-debug',
    transform(code, id) {
      if (id.includes('node_modules')) return null;
      return {
        code: code
          .replace(/console\.debug\(.*?\)/g, '')
          .replace(/debugger;/g, ''),
        map: null,
      };
    },
  };
}
```

#### Server Middleware Pattern
```typescript
function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use('/api/users', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify([{ id: 1, name: 'Mock User' }]));
      });
    },
  };
}
```

## Build Optimization

### Chunk Splitting Strategy
```
How should I split chunks?
├── Large third-party libraries → Manual vendor chunk
├── Route-based code splitting → Dynamic imports for routes
├── Shared components used by many pages → Shared chunk
└── Small app (<50KB total) → Single chunk (avoid splitting overhead)
```

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('node_modules/react')) return 'vendor-react';
        if (id.includes('node_modules/lodash')) return 'vendor-lodash';
        if (id.includes('node_modules')) {
          // Group remaining node_modules by top-level package
          const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
          if (match) return `vendor-${match[1].replace('/', '-')}`;
        }
        if (id.includes('/pages/')) {
          const page = id.split('/pages/')[1]?.split('/')[0];
          if (page) return `page-${page}`;
        }
      },
    },
  },
}
```

### CSS Optimization
```typescript
css: {
  modules: {
    localsConvention: 'camelCaseOnly',
    scopeBehaviour: 'local',
  },
  preprocessorOptions: {
    scss: {
      additionalData: `@import "@/styles/variables.scss";`,
      api: 'modern-compiler',
    },
  },
  devSourcemap: true,
  lightningcss: {
    targets: { chrome: 90, firefox: 90, safari: 15 },
  },
},
// With plugin:
import tailwindcss from '@tailwindcss/vite';
plugins: [tailwindcss()],
```

### Image and Asset Optimization
```typescript
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [
    imagetools({
      defaultDirectives: (url) => {
        if (url.searchParams.has('webp')) {
          return new URLSearchParams('format=webp&quality=75');
        }
        return new URLSearchParams();
      },
    }),
  ],
  build: {
    assetsInlineLimit: 4096,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (info) => {
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(info.name)) {
            return 'images/[name]-[hash][extname]';
          }
          if (/\.(woff2?|eot|ttf)$/.test(info.name)) {
            return 'fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
```

## SSR Configuration

### Basic SSR Setup
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    ssr: 'src/entry-server.tsx',
    rollupOptions: {
      output: {
        format: 'esm',
      },
    },
  },
  ssr: {
    // Externalize dependencies that should not be bundled
    noExternal: ['some-react-component'],
  },
});

// server.js (Node.js)
import express from 'express';
import { createServer as createViteServer } from 'vite';

async function createServer() {
  const app = express();
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.get('*', async (req, res) => {
    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
    const html = await render(req);
    res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
  });
  app.listen(5173);
}
createServer();
```

## Library Mode

### Publishing a Library
```typescript
// vite.config.ts — library mode
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLibrary',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `my-lib.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'], // Peer dependencies
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

## Performance Debugging

### Bundle Analysis
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
});
```

### Slow Dev Server
```bash
# Check for slow module transforms
npx vite --debug

# Use SWC instead of Babel for React
npm install @vitejs/plugin-react-swc
```

## Deployment Patterns

### SPA with History Fallback
```typescript
// vite.config.ts
export default defineConfig({
  // No special config needed — Vite generates index.html
  // Configure server to serve index.html for all routes:
  // Nginx: try_files $uri $uri/ /index.html;
});
```

### Nginx Configuration
```nginx
server {
  listen 80;
  root /var/www/myapp/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

## Key Anti-Patterns
- **Using `process.env` in browser code**: Use `import.meta.env.VITE_*` instead
- **Committing `dist/` folder**: Add to `.gitignore`
- **No proxy config**: Leads to CORS issues during development
- **Large chunks without splitting**: Always configure manualChunks or dynamic imports
- **Disabling all cache headers in build**: Assets should be immutable-cached
- **Not using `defineConfig`**: Loses type checking on config
- **Overriding Vite defaults unnecessarily**: Vite's defaults are well-tuned
- **Not handling environment variables in TypeScript**: Always declare in `ImportMetaEnv`
- **Inlining large assets**: Keep `assetsInlineLimit` reasonable (4KB default)
- **Missing `.env` example file**: Create `.env.example` with dummy values for the team
