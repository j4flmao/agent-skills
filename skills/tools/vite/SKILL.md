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
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.

## Architecture Decision Trees

### Vite vs Webpack vs Turbopack

| Decision | Vite | Webpack | Turbopack |
|---|---|---|---|
| Dev server | ES modules, instant HMR | Bundle-based, slower | Rust-based, very fast |
| HMR speed | Module-level (~10ms) | Bundle-level (~300ms) | Module-level (~10ms) |
| Plugin API | Rollup-compatible | Webpack-specific | Next.js-specific |
| Production build | Rollup (tree-shaking) | Custom bundler | Turbopack bundler |
| Community | Rapidly growing | Mature | Early (Next.js only) |
| Best for | New projects, any framework | Legacy webpack projects | Next.js apps only |

### Rollup vs esbuild for Build

| Aspect | Rollup | esbuild |
|---|---|---|
| Speed | Moderate | Very fast (Go) |
| Plugin ecosystem | Rich (Vite uses it) | Growing |
| Code splitting | Excellent | Good |
| Tree shaking | Excellent | Good |
| ESM output | Excellent | Good |
| Use case | Vite production builds | Vite dependency pre-bundling |