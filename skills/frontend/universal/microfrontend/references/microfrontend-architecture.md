# Microfrontend Architecture

## Architecture Patterns

| Pattern | Integration | Isolation | Bundle Size | SEO | Best For |
|---------|-------------|-----------|-------------|-----|----------|
| Module Federation | Runtime (Webpack 5) | Shared deps | Smaller total | Via shell | Same-framework teams |
| Web Components | Runtime (custom elements) | Shadow DOM | Per component | Good | Cross-framework |
| iframe | Runtime (iframe) | Complete | Independent | Poor | Strict isolation |
| Build-time composition | Compile-time (monorepo) | Package-level | Monolith | Excellent | 2-3 teams |

## Module Federation Architecture

```
┌──────────────────────────────────────┐
│            Shell (Host)              │
│  Navigation  │  Auth  │  Layout      │
└─────┬────────┴─────┬──┴──────┬───────┘
      │              │          │
      ▼              ▼          ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Orders   │  │ Products │  │  Profile  │
│  (Remote) │  │ (Remote) │  │  (Remote) │
└──────────┘  └──────────┘  └──────────┘
   CI/CD A       CI/CD B       CI/CD C
```

## Shell Application Responsibilities

```typescript
// Shell provides:
// 1. Global navigation (header, sidebar)
// 2. Authentication state
// 3. Theme/provider wrappers
// 4. Error boundaries for each remote
// 5. Shared dependency management
// 6. Routing orchestration

function Shell() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ErrorBoundary fallback={<RootError />}>
            <Navigation />
            <main>
              <ErrorBoundary fallback={<OrderError />}>
                <Suspense fallback={<Loading />}>
                  <OrderList />
                </Suspense>
              </ErrorBoundary>
              <ErrorBoundary fallback={<ProductError />}>
                <Suspense fallback={<Loading />}>
                  <ProductList />
                </Suspense>
              </ErrorBoundary>
            </main>
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

## Shared Dependency Strategy

| Dependency | Strategy | Rationale |
|-----------|----------|-----------|
| `react`, `react-dom` | Singleton | Hooks, context, event system break with multiple instances |
| `react-router-dom` | Singleton | Router context must be shared |
| `@tanstack/react-query` | Singleton | QueryClient context shared |
| `dayjs`, `date-fns` | Shared (version range) | Acceptable to have multiple versions |
| `lodash`, `lodash-es` | Shared (version range) | Utility, version mismatch is safe |
| `chart.js`, `three.js` | Standalone | Large, version-specific APIs |
| Design system | Singleton via federation | Visual consistency |

```javascript
// Host shared config
shared: {
  react: { singleton: true, requiredVersion: '^18.2.0', eager: true },
  'react-dom': { singleton: true, requiredVersion: '^18.2.0', eager: true },
  '@tanstack/react-query': { singleton: true },
  dayjs: { singleton: false, requiredVersion: '^1.11' },
}
```

## Communication Architecture

```
┌─────────────┐  Custom Events   ┌─────────────┐
│  MFE A      │ ──────────────→  │  MFE B      │
│  (Orders)   │                  │  (Products)  │
└──────┬──────┘                  └──────┬──────┘
       │                                │
       │       URL params / route       │
       └───────────────────────────────┘
       │                                │
       │    Shared event bus (pub/sub)  │
       └────────────────────────────────┘
```

## Deployment Architecture

```
Deploy pipeline per microfrontend:

┌──────────┐    ┌──────────┐    ┌──────────┐
│   Build   │ →  │   Test   │ →  │  Deploy  │
│ (webpack) │    │ (vitest) │    │  (CDN)   │
└──────────┘    └──────────┘    └────┬─────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  remoteEntry.js   │
                            │  v1.2.3           │
                            │  /v1.2.3/entry.js │
                            └──────────────────┘
```

## Monorepo Structure

```
packages/
├── shell/                    # Host application
│   ├── src/
│   └── webpack.config.js    # remotes configured here
├── mfe-orders/               # Orders microfrontend
│   ├── src/
│   └── webpack.config.js    # exposes OrderList, OrderDetail
├── mfe-products/             # Products microfrontend
│   ├── src/
│   └── webpack.config.js    # exposes ProductList, ProductDetail
├── shared-ui/                # Design system (federated)
│   ├── src/
│   └── webpack.config.js    # exposes Button, Card, Modal
└── shared-lib/               # Shared utilities (npm package)
    └── src/
```

## Migration Strategy: Monolith → MFE

```
Phase 1: Extract shell (navigation, auth, layout)
Phase 2: Set up Module Federation, load monolith as remote
Phase 3: Extract one feature at a time into independent MFE
Phase 4: Replace monolith entirely with remotes
Phase 5: Independent deployment per MFE

Each phase = 2-4 weeks. Total migration: 3-6 months for typical app.
```

## When NOT to Use Microfrontends

| Scenario | Recommended Approach |
|----------|---------------------|
| 1-2 frontend teams | Monolith SPA or monorepo |
| No independent deploy need | Monolith SPA |
| Components < 20 | Monolith SPA |
| Team prefers monolith | Monolith SPA |
| No cross-team coordination issues | Monolith SPA |
