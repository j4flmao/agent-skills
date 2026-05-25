# Microfrontend Integration

## Module Federation Plugin Config

### Host (Shell) Webpack 5

```javascript
const { ModuleFederationPlugin } = require('webpack').container

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        orders: 'orders@https://cdn.app.com/orders/v1.2.3/remoteEntry.js',
        products: 'products@https://cdn.app.com/products/v2.0.1/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      },
    }),
  ],
}
```

### Remote (Microfrontend)

```javascript
new ModuleFederationPlugin({
  name: 'orders',
  filename: 'remoteEntry.js',
  exposes: {
    './OrderList': './src/components/OrderList',
    './OrderDetail': './src/components/OrderDetail',
    './OrderService': './src/services/orderService',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
  },
})
```

### Vite Federation Plugin

```typescript
// vite.config.ts (remote)
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'orders',
      filename: 'remoteEntry.js',
      exposes: {
        './OrderList': './src/components/OrderList.tsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
})

// vite.config.ts (host)
federation({
  name: 'shell',
  remotes: {
    orders: 'https://cdn.app.com/orders/v1.2.3/remoteEntry.js',
  },
  shared: ['react', 'react-dom'],
})
```

### Rspack Federation

```javascript
// rspack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack')

new ModuleFederationPlugin({
  name: 'orders',
  exposes: {
    './OrderList': './src/OrderList.tsx',
  },
  shared: ['react', 'react-dom'],
})
```

## Dynamic Remote Loading

```typescript
// Load remote at runtime (defer Federation init)
async function loadRemote(scope: string, module: string): Promise<() => Promise<{ default: React.ComponentType }>> {
  return async () => {
    // Initialize the remote scope
    await __webpack_init_sharing__('default')
    const container = window[scope]
    await container.init(__webpack_share_scopes__.default)
    const factory = await container.get(module)
    return factory()
  }
}

// Usage
function DynamicOrderList() {
  const OrderList = React.lazy(() => loadRemote('orders', './OrderList'))
  return (
    <Suspense fallback={<Loading />}>
      <ErrorBoundary fallback={<RemoteError />}>
        <OrderList />
      </ErrorBoundary>
    </Suspense>
  )
}
```

## Cross-App Communication

### Custom Events

```typescript
// Type-safe event bus
type MFEEventMap = {
  'order:selected': { orderId: string }
  'product:added': { productId: string; quantity: number }
  'user:logout': void
  'cart:updated': { count: number }
}

type MFEEventName = keyof MFEEventMap

const eventBus = {
  emit<K extends MFEEventName>(name: K, detail: MFEEventMap[K]) {
    window.dispatchEvent(new CustomEvent(`mfe:${name}`, { detail, bubbles: true }))
  },
  on<K extends MFEEventName>(name: K, handler: (detail: MFEEventMap[K]) => void) {
    const wrapped = (e: Event) => handler((e as CustomEvent).detail)
    window.addEventListener(`mfe:${name}`, wrapped)
    return () => window.removeEventListener(`mfe:${name}`, wrapped)
  },
}

// Orders app emits
eventBus.emit('order:selected', { orderId: '123' })

// Products app listens
useEffect(() => eventBus.on('order:selected', ({ orderId }) => console.log(orderId)), [])
```

### URL-Based Communication

```typescript
// Shell navigation: MFE sets URL, shell routes accordingly
function ProductCard({ id }: { id: string }) {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate(`/products/${id}`)}>
      {/* Navigate triggers shell routing which loads Products MFE detail */}
    </div>
  )
}
```

## CSS Isolation

```css
/* Scope styles to microfrontend root */
.mfe-orders {
  /* Orders MFE styles */
}
.mfe-orders .button { /* ... */ }

/* Or use CSS Modules */
/* Each MFE has its own CSS Module scope automatically */

/* Or use CSS @scope (Chrome 118+) */
@scope (.mfe-orders) {
  .button { /* scoped to .mfe-orders */ }
}
```

## Shared Theme through CSS Variables

```css
:root {
  --color-primary: #2563eb;
  --color-surface: #ffffff;
  --font-body: 16px;
  --spacing-md: 16px;
}

/* All MFEs reference same variables */
/* Shell sets them, MFEs consume them */
```

## Error Handling Across MFEs

```typescript
// Shell wraps each remote in ErrorBoundary
function RemoteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="mfe-error">
          <p>This section is temporarily unavailable.</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
```

## Federation Health Check

```typescript
// Check if remote is available
async function checkRemoteHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// Fallback when remote is down
function useRemoteComponent(remoteUrl: string, fallbackComponent: React.ComponentType) {
  const [isAvailable, setIsAvailable] = useState(true)

  useEffect(() => {
    checkRemoteHealth(remoteUrl).then(setIsAvailable)
  }, [remoteUrl])

  if (!isAvailable) return fallbackComponent
  // Return lazy loaded remote
}
```
