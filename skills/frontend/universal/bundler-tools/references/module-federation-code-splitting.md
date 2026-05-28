# Module Federation & Code Splitting

## Module Federation Fundamentals

Module Federation is a Webpack 5 feature (and available via community plugins for other bundlers) that allows a JavaScript application to dynamically load code from another application at runtime. It enables micro-frontend architectures where independently deployed applications share components and dependencies.

### Core Concepts

**Host**: The application that consumes remote modules. The host defines which remotes it loads from and which shared dependencies it provides.

**Remote**: The application that exposes modules for consumption. The remote defines which modules are exposed and which dependencies it needs shared.

**Shared Dependencies**: Libraries like React, Vue, or Lodash that should be loaded once and shared across host and remotes to avoid duplication. The Module Federation runtime negotiates which version to use.

**Federated Module**: A module exposed by a remote and consumed by a host. Loaded asynchronously via dynamic import.

### Architecture

```
Host App (shell)
  |-- remote/Auth (Auth App -- login, signup, profile)
  |-- remote/Checkout (Checkout App -- cart, payment, confirmation)
  |-- remote/Dashboard (Dashboard App -- analytics, reports)
  Shared: react@18, react-dom@18, react-router-dom@6
```

## Webpack Module Federation Configuration

### Host Configuration

```js
// host/webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        auth: 'auth@http://localhost:3001/remoteEntry.js',
        dashboard: 'dashboard@http://localhost:3002/remoteEntry.js',
        checkout: 'checkout@http://localhost:3003/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.0.0' },
      },
    }),
  ],
};
```

### Remote Configuration

```js
// auth/webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'auth',
      filename: 'remoteEntry.js',
      exposes: {
        './Login': './src/Login',
        './SignUp': './src/SignUp',
        './AuthProvider': './src/AuthProvider',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

### Consuming Remote Components

```tsx
// host/src/App.tsx
const RemoteLogin = React.lazy(() => import('auth/Login'));
const RemoteDashboard = React.lazy(() => import('dashboard/Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<RemoteLogin />} />
        <Route path="/dashboard" element={<RemoteDashboard />} />
      </Routes>
    </Suspense>
  );
}
```

## Vite Module Federation

Vite does not include Module Federation natively but supports it via the `@originjs/vite-plugin-federation` plugin.

### Vite Federation Configuration

```ts
// host/vite.config.ts
import federation from '@originjs/vite-plugin-federation';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'host',
      remotes: {
        auth: 'http://localhost:3001/assets/remoteEntry.js',
        dashboard: 'http://localhost:3002/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
});
```

```ts
// remote/vite.config.ts
import federation from '@originjs/vite-plugin-federation';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'auth',
      filename: 'remoteEntry.js',
      exposes: {
        './Login': './src/Login.jsx',
        './AuthProvider': './src/AuthProvider.jsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext',
  },
});
```

## Code Splitting Fundamentals

Code splitting is the practice of splitting your application bundle into smaller chunks that can be loaded on demand. Module Federation is an advanced form of code splitting that spans application boundaries.

### Types of Code Splitting

**Entry Point Splitting**: Separate entry points for different pages/apps. Each entry point has its own chunk graph.

**Dynamic Import Splitting**: Using `import()` to split at logical boundaries like routes, heavy components, or rarely used features.

**Vendor Splitting**: Separating third-party code (node_modules) from application code for better caching.

**Shared Module Splitting**: Extracting modules used by multiple chunks into a common chunk.

## Route-Based Code Splitting

### React Router

```tsx
// Before: all routes eagerly loaded
import Home from './pages/Home';
import About from './pages/About';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Admin from './pages/Admin';

// After: lazy loaded per route
const Home = React.lazy(() => import('./pages/Home'));
const About = React.lazy(() => import('./pages/About'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Admin = React.lazy(() => import('./pages/Admin'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Suspense>
  );
}
```

### Vue Router

```ts
const routes = [
  { path: '/', component: () => import('./pages/Home.vue') },
  { path: '/about', component: () => import('./pages/About.vue') },
  { path: '/dashboard', component: () => import('./pages/Dashboard.vue') },
];
```

### Angular Router

```ts
const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.component').then(m => m.HomeComponent) },
  { path: 'about', loadComponent: () => import('./pages/about.component').then(m => m.AboutComponent) },
];
```

## Component-Level Lazy Loading

### Heavy Component Lazy Loading

```tsx
// Lazy load heavy dependencies only when component is used
const MarkdownEditor = React.lazy(() => import('./MarkdownEditor'));
const DataGrid = React.lazy(() => import('./DataGrid'));
const ChartWidget = React.lazy(() => import('./ChartWidget'));

function DocumentEditor({ hasCharts, hasGrid }) {
  return (
    <div>
      <Suspense fallback={<Loading />}>
        <MarkdownEditor />
      </Suspense>

      {hasCharts && (
        <Suspense fallback={<ChartSkeleton />}>
          <ChartWidget />
        </Suspense>
      )}

      {hasGrid && (
        <Suspense fallback={<GridSkeleton />}>
          <DataGrid />
        </Suspense>
      )}
    </div>
  );
}
```

### Conditional Lazy Loading

```tsx
function SearchResults({ query }) {
  const SearchWorker = useMemo(
    () => React.lazy(() => import('./searchWorker')),
    []
  );

  // Only load search worker when user actually searches
  if (!query) return null;

  return (
    <Suspense fallback={<Loading />}>
      <SearchWorker query={query} />
    </Suspense>
  );
}
```

## Vendor Splitting Strategies

### Single Vendor Chunk

Simplest approach -- all node_modules go into one chunk:

```js
// Webpack
splitChunks: {
  cacheGroups: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendor',
      chunks: 'all',
    },
  },
}
```

Downside: updating any dependency invalidates the entire vendor cache.

### Multi-Vendor Chunk

Split vendors by category for better caching:

```js
splitChunks: {
  cacheGroups: {
    react: {
      test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
      name: 'react',
      chunks: 'all',
      priority: 30,
    },
    ui: {
      test: /[\\/]node_modules[\\/](@mui|@emotion|@mui-icons)[\\/]/,
      name: 'ui-library',
      chunks: 'all',
      priority: 20,
    },
    utils: {
      test: /[\\/]node_modules[\\/](lodash|date-fns|axios|zustand)[\\/]/,
      name: 'utils',
      chunks: 'all',
      priority: 10,
    },
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendor',
      chunks: 'all',
      priority: 1,
      minSize: 30000,
    },
  },
}
```

### Automatic Vendor Splitting (Vite)

```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split by top-level package name
            const packageName = id.split('node_modules/')[1].split('/')[0];
            // Group packages by category
            const reactPackages = ['react', 'react-dom', 'react-router-dom'];
            if (reactPackages.includes(packageName)) return 'react-vendor';

            const uiPackages = ['@mui', '@radix-ui', '@emotion'];
            if (uiPackages.some(p => packageName.startsWith(p))) return 'ui-vendor';

            // For everything else, use the package name directly
            return `vendor.${packageName}`;
          }
        },
      },
    },
  },
});
```

## Shared Module Splitting

### Extracting Common Dependencies

```js
splitChunks: {
  cacheGroups: {
    common: {
      minChunks: 2, // Module used by 2+ chunks
      minSize: 10000,
      name: 'common',
      chunks: 'all',
      priority: 5,
    },
  },
}
```

### Avoiding Over-Splitting

Too many chunks can hurt performance due to HTTP overhead. Each chunk is a separate HTTP request:

| Chunk Count | HTTP/1.1 Performance | HTTP/2 Performance |
|-------------|---------------------|-------------------|
| 1-5 | Excellent | Excellent |
| 5-20 | Good | Excellent |
| 20-100 | Poor (connection limit) | Good |
| 100+ | Very poor | Degraded |

Set a minimum chunk size to prevent over-splitting:

```js
splitChunks: {
  minSize: 20000, // Don't create chunks smaller than 20KB
  maxSize: 250000, // Try to keep chunks under 250KB
}
```

## Module Federation Shared Dependencies

### Singleton vs Non-Singleton

```js
shared: {
  react: {
    singleton: true,    // Only one instance of React in the browser
    requiredVersion: '^18.0.0',
    eager: false,       // Load async, not in initial bundle
    strictVersion: false, // Don't fail if version mismatch
  },
  lodash: {
    singleton: false,   // Multiple versions OK, each remote gets its own
    requiredVersion: false,
  },
}
```

### Shared Dependency Negotiation

When a host and remote declare different versions of the same shared dependency, Module Federation uses semantic versioning to determine the best version:

1. Each application declares `requiredVersion` (semver range)
2. The runtime finds the version that satisfies all consumers
3. If no single version satisfies all, and `singleton: true`, the highest version is used
4. Version mismatches produce an error if `strictVersion: true` and `singleton: true`

### Key Sharing Rules

- **Shared `react` and `react-dom`**: Always `singleton: true`. Multiple React instances cause hard-to-debug issues (context loss, hooks errors).
- **Shared routing libraries**: Should be singleton for consistent routing state.
- **Shared state management**: Must be singleton for store consistency.
- **Utility libraries (lodash, date-fns)**: Can be non-singleton if version differences are acceptable.

## Module Federation Deployment

### Remote Entry Point

Each remote application produces a `remoteEntry.js` file that acts as the federation manifest. It contains:
- Module map (which modules are exposed)
- Shared dependency map (versions and configurations)
- Chunk URLs

### Deployment Considerations

**Version Management**:
```js
// Version your remote entry for cache management
new ModuleFederationPlugin({
  name: 'auth',
  filename: `remoteEntry.v${Date.now()}.js`, // Cache-bust on deploy
  // OR use a consistent URL with different path
  // filename: 'remoteEntry.js', and deploy to versioned path
});
```

**Consistent URLs**:
The remote URL must be configurable per environment:

```js
// Host: load remote URL from environment
new ModuleFederationPlugin({
  remotes: {
    auth: `auth@${process.env.AUTH_REMOTE_URL}/remoteEntry.js`,
  },
});
```

### CI/CD for Micro-Frontends

```yaml
# Each remote deploys independently
# Host references remotes by deploy-time URL

# Remote pipeline steps:
1. Build remote application
2. Publish to CDN or artifact storage
3. Update remote URL in host configuration (or host reads from discovery service)

# Host pipeline steps:
1. Read remote URLs from configuration service
2. Build host application
3. Deploy host
```

## Advanced Module Federation Patterns

### Dynamic Remote Loading

Instead of configuring remotes at build time, load them dynamically at runtime:

```tsx
// Dynamic remote container
async function loadRemote(url, scope) {
  // Load remote entry script
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  // Initialize the remote container
  const container = window[scope];
  await container.init(__webpack_init_sharing__('default'));

  return container;
}

// Usage
function DynamicRemoteComponent({ url, scope, module, component: Component }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRemote(url, scope)
      .then(() => setReady(true))
      .catch(setError);
  }, [url, scope]);

  if (error) return <ErrorFallback error={error} />;
  if (!ready) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}
```

### Module Federation with TypeScript

```ts
// remote: declare types for exposed modules
// auth/src/Login.tsx
export interface LoginProps {
  onSuccess?: (token: string) => void;
  redirectTo?: string;
}

export const Login: React.FC<LoginProps> = (props) => {
  // ...
};

// host: declare remote module types
// host/src/remotes.d.ts
declare module 'auth/Login' {
  import { FC } from 'react';
  interface LoginProps {
    onSuccess?: (token: string) => void;
    redirectTo?: string;
  }
  const Login: FC<LoginProps>;
  export default Login;
}
```

### Federated Store (Shared State)

```ts
// shared/context/FederatedStore.ts
import { createStore } from 'zustand';

// This module should be a shared dependency (singleton)
export const useSharedStore = createStore((set) => ({
  user: null,
  theme: 'light',
  notifications: [],

  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),
}));
```

```js
// Both host and remote share this module
shared: {
  './shared/FederatedStore': {
    singleton: true,
    requiredVersion: '^1.0.0',
  },
}
```

### Module Federation with SSR

Server-side rendering adds complexity because remote modules must be resolvable on the server:

```js
// webpack.server.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  target: 'node',
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        auth: 'auth@http://localhost:3001/server/remoteEntry.js',
      },
      shared: ['react', 'react-dom/server'],
    }),
  ],
};
```

## Code Splitting Performance

### Preloading Strategies

```tsx
// Preload critical chunks on idle
const PreloadLinks = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = '/assets/dashboard-[hash].js';
    document.head.appendChild(link);

    // Or use IntersectionObserver-based preloading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Preload chunk when user might navigate here
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = '/assets/admin-[hash].js';
          document.head.appendChild(link);
          observer.unobserve(entry.target);
        }
      });
    });
  }, []);

  return null;
};
```

### Chunk Sizing Guidelines

| Chunk Type | Ideal Size | Max Size |
|-----------|------------|----------|
| Entry chunk | < 100KB gzipped | 200KB gzipped |
| Route chunk | < 50KB gzipped | 150KB gzipped |
| Vendor chunk | < 100KB gzipped | 250KB gzipped |
| Image/lazy chunk | < 30KB gzipped | 100KB gzipped |

### Measuring Split Effectiveness

```bash
# Analyze chunk usage
npx webpack-bundle-analyzer dist/stats.json

# Count first-load chunks
# For critical path: minimize number of chunks loaded on first visit
# Measure with Lighthouse: "JavaScript execution time"
```

## Migration from Monolith to Federation

### Step-by-Step Approach

1. **Identify boundaries**: Find natural seams in the application (auth, dashboard, settings)
2. **Create proxy module**: Within the monolith, wrap import paths to look like remote imports
3. **Extract first remote**: Move one boundary to a separate application
4. **Configure sharing**: Move shared dependencies to Module Federation config
5. **Test incrementally**: Host loads remote via federation for one section, others remain in monolith
6. **Iterate**: Extract remaining boundaries one at a time

```js
// Step 2: Proxy module within monolith
// webpack.config.js (pre-migration)
module.exports = {
  resolve: {
    alias: {
      'auth/Login': path.resolve(__dirname, 'src/auth/Login'),
    },
  },
};

// Post-migration
new ModuleFederationPlugin({
  remotes: {
    auth: 'auth@http://localhost:3001/remoteEntry.js',
  },
});
```

## Error Handling and Fallbacks

### Remote Load Failure

```tsx
function SafeRemote({ children, fallback = <ErrorBoundary /> }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Timeout remote loading after 5 seconds
    const timeout = setTimeout(() => setHasError(true), 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (hasError) return fallback;
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

// Usage
<SafeRemote fallback={<FallbackComponent />}>
  <RemoteLogin />
</SafeRemote>
```

### Graceful Degradation

```tsx
function FederatedModule({ remoteUrl, remoteModule, fallback, ...props }) {
  const [status, setStatus] = useState('loading');

  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={<Loading />}>
        {status === 'loading' && <Loading />}
        {status === 'ready' && <RemoteComponent {...props} />}
        {status === 'error' && fallback}
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Module Federation Debugging

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Remote module not found | Remote entry URL wrong or remote not loaded | Check network tab for remoteEntry.js |
| React hooks error (invalid hook call) | Multiple React instances | Ensure `react` is `singleton: true` |
| Shared module version mismatch | Conflicting version ranges | Align version ranges across apps |
| Styles missing from remote | CSS not bundled with remote | Check CSS extraction config |
| Remote module cannot resolve local import | Path resolution issue | Use `shared` or ensure the module is exposed |

### Debugging Tools

```js
// Enable federation debug logging
window.__FEDERATION_DEBUG__ = true;

// Check shared scope
console.log(__webpack_init_sharing__('default'));
```

## Federation Security Considerations

### Remote URL Validation

```js
// Only allow specific remote origins
const ALLOWED_REMOTE_ORIGINS = [
  'https://apps.example.com',
  'https://cdn.example.com',
];

function loadRemote(url) {
  const origin = new URL(url).origin;
  if (!ALLOWED_REMOTE_ORIGINS.includes(origin)) {
    throw new Error(`Remote origin not allowed: ${origin}`);
  }
  // Proceed with loading
}
```

### Subresource Integrity for Remote Entry

```html
<script
  src="https://remote.app/remoteEntry.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous"
></script>
```
