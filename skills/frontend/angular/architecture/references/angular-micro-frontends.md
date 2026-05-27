# Angular Micro-Frontends

## Micro-Frontend Architecture Fundamentals

### Decomposition Strategies

Micro-frontends decompose a monolithic frontend into independently deployable, loosely coupled applications. Three primary strategies exist:

**Domain decomposition** — Split by business domain (products, orders, users). Each domain owns its complete vertical slice.

**Technical decomposition** — Split by technical concern (shell, feature-A, feature-B, shared-libs). Less common in practice.

**Page/route decomposition** — Each micro-app owns specific routes. The shell manages navigation and routing.

```typescript
// Domain decomposition example
// shell-app:       / (shell, auth, layout)
// products-app:    /products/**
// orders-app:      /orders/**
// users-app:       /admin/users/**
```

### Integration Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Client-side composition | JavaScript loads micro-apps dynamically at runtime | Module Federation |
| Server-side composition | Server assembles HTML fragments | SSI, Tailor, Podium |
| Build-time composition | All apps compiled into single bundle | Monorepo, worst choice |
| iFrame composition | Each micro-app in its own iframe | Legacy isolation |

### Communication

Micro-frontends communicate through a shared event bus, URL changes, or shared state:

```typescript
// Custom event-based communication
export class EventBus {
  private events = new Map<string, Set<(data: unknown) => void>>()

  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.events.has(event)) this.events.set(event, new Set())
    this.events.get(event)!.add(handler)
    return () => this.events.get(event)?.delete(handler)
  }

  emit(event: string, data: unknown): void {
    this.events.get(event)?.forEach(handler => handler(data))
  }
}
```

## Module Federation with Angular

### Webpack ModuleFederationPlugin

Module Federation, introduced in Webpack 5, enables loading remote modules at runtime:

```typescript
// webpack.config.js — Shell Application
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        'productsApp': 'productsApp@https://cdn.example.com/products/remoteEntry.js',
        'ordersApp': 'ordersApp@https://cdn.example.com/orders/remoteEntry.js',
      },
      shared: {
        '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' },
        '@angular/common': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' },
        '@angular/router': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' },
        '@angular/forms': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' },
        'rxjs': { singleton: true, strictVersion: true, requiredVersion: '^7.8.0' },
        '@ngrx/store': { singleton: true, strictVersion: true },
      },
    }),
  ],
}
```

```typescript
// webpack.config.js — Micro-App (Products)
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'productsApp',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductsModule': './src/app/products/products.module.ts',
        './ProductsRoutes': './src/app/products/products.routes.ts',
        './ProductListComponent': './src/app/products/pages/product-list/product-list.component.ts',
      },
      shared: {
        '@angular/core': { singleton: true, strictVersion: true },
        '@angular/common': { singleton: true, strictVersion: true },
        '@angular/router': { singleton: true, strictVersion: true },
        'rxjs': { singleton: true, strictVersion: true },
      },
    }),
  ],
}
```

### Shared Dependencies

The `shared` configuration prevents duplication of common libraries:

```javascript
// Singleton dependencies — only one instance across all micro-apps
shared: {
  '@angular/core': {
    singleton: true,
    strictVersion: true,
    requiredVersion: '^17.0.0',
    eager: false,
  },
  '@angular/common': {
    singleton: true,
    strictVersion: true,
    requiredVersion: '^17.0.0',
  },
  // Library with version mismatch handling
  'lodash': {
    singleton: true,
    requiredVersion: false, // Allow any version
  },
}
```

### Exposes/Remotes

**Exposes** — What the micro-app makes available to the shell:

```javascript
// products-app/webpack.config.js
exposes: {
  './ProductsModule': './src/app/products/products.module.ts',
  './routes': './src/app/products/products.routes.ts',
  './components/ProductCard': './src/app/shared/product-card.component.ts',
}
```

**Remotes** — Where the shell loads micro-apps from:

```javascript
// shell/webpack.config.js
remotes: {
  productsApp: 'productsApp@https://cdn.example.com/products/remoteEntry.js',
  ordersApp: 'ordersApp@https://cdn.orders.com/orders/remoteEntry.js',
}
```

## Native Federation

### Angular-Specific Federation

Native Federation provides a framework-specific approach to Module Federation that integrates with the Angular CLI and supports esbuild:

```bash
# Install Native Federation
ng add @angular-architects/native-federation

# Add a micro frontend
ng g @angular-architects/native-federation:init --port 4201 --type dynamic
```

```typescript
// shell/app.config.ts — Native Federation configuration
import { initFederation } from '@angular-architects/native-federation'

initFederation({
  name: 'shell',
  remotes: {
    productsApp: 'https://cdn.example.com/products/federation.manifest.json',
    ordersApp: 'https://cdn.example.com/orders/federation.manifest.json',
  },
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err))
```

```typescript
// products-app/federation.config.js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config')

module.exports = withNativeFederation({
  name: 'productsApp',
  exposes: {
    './routes': './src/app/products/products.routes.ts',
    './components': './src/app/products/components/index.ts',
  },
  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
    }),
  },
  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],
})
```

### Esbuild Support

Native Federation uses esbuild under the hood, providing faster build times compared to Webpack-based federation:

```javascript
// angular.json — Configure Native Federation builder
{
  "projects": {
    "products": {
      "architect": {
        "build": {
          "builder": "@angular-architects/native-federation:build",
          "options": {
            "federation": "federation.config.js"
          }
        }
      }
    }
  }
}
```

### Shared Library Handling

```typescript
// federation.config.js — Advanced shared configuration
const { shareAll, share } = require('@angular-architects/native-federation/config')

module.exports = withNativeFederation({
  name: 'productsApp',
  exposes: {
    './routes': './src/app/products/products.routes.ts',
  },
  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
      includeSecondaries: {
        skip: ['@angular/material/fesm2022'],
      },
    }),
    // Explicit shared library override
    ...share({
      '@ngrx/store': {
        singleton: true,
        strictVersion: true,
        requiredVersion: '^17.0.0',
      },
    }),
  },
})
```

## Module Federation Configuration

### Shell Webpack Configuration

```javascript
// shell/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')
const mf = require('@angular-architects/module-federation/webpack')
const path = require('path')

module.exports = {
  output: {
    uniqueName: 'shell',
    publicPath: 'auto',
  },
  optimization: {
    runtimeChunk: false,
  },
  plugins: [
    new ModuleFederationPlugin({
      remotes: {
        productsApp: mf.lazyMf('productsApp', 'https://cdn.example.com/products/remoteEntry.js'),
        ordersApp: mf.lazyMf('ordersApp', 'https://cdn.example.com/orders/remoteEntry.js'),
      },
      shared: mf.shareAll({
        singleton: true,
        strictVersion: true,
        requiredVersion: 'auto',
        includeSecondaries: {
          skip: true,
        },
      }),
    }),
  ],
}
```

### Micro-App Webpack Configuration

```javascript
// products-app/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')
const mf = require('@angular-architects/module-federation/webpack')
const path = require('path')

module.exports = {
  output: {
    uniqueName: 'productsApp',
    publicPath: 'auto',
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      library: { type: 'module' },
      name: 'productsApp',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductsModule': './src/app/products/products.module.ts',
        './routes': './src/app/products/products.routes.ts',
      },
      shared: mf.shareAll({
        singleton: true,
        strictVersion: true,
        requiredVersion: 'auto',
      }),
    }),
  ],
}
```

### Shared Module Configuration

```javascript
// shared/webpack.config.js — Shared library consumed by multiple apps
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'sharedLibs',
      filename: 'remoteEntry.js',
      exposes: {
        './ui-components': './src/index.ts',
        './services': './src/services/index.ts',
        './models': './src/models/index.ts',
      },
      shared: {
        '@angular/core': { singleton: true },
        '@angular/common': { singleton: true },
      },
    }),
  ],
}
```

## Shell Application Setup

### Dynamic Loading

```typescript
// shell/src/app/mfe/mfe-loader.service.ts
import { Injectable } from '@angular/core'
import { loadRemoteModule, LoadRemoteModuleOptions } from '@angular-architects/module-federation'

@Injectable({ providedIn: 'root' })
export class MfeLoaderService {
  private loadedModules = new Map<string, any>()

  async loadModule(options: LoadRemoteModuleOptions): Promise<any> {
    const key = `${options.remoteName}-${options.exposedModule}`

    if (this.loadedModules.has(key)) {
      return this.loadedModules.get(key)
    }

    const module = await loadRemoteModule(options)
    this.loadedModules.set(key, module)
    return module
  }

  async loadRoutes(remoteName: string, exposedModule: string): Promise<any> {
    const module = await this.loadModule({
      remoteName,
      exposedModule,
    })
    return module.routes || module.default
  }
}
```

### Routing Configuration

```typescript
// shell/src/app/app.routes.ts
import { Routes } from '@angular/router'
import { MfeLoaderService } from './mfe/mfe-loader.service'
import { inject } from '@angular/core'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell-layout.component')
      .then(m => m.ShellLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home.component')
          .then(m => m.HomeComponent),
      },
      {
        path: 'products',
        loadChildren: () => inject(MfeLoaderService).loadRoutes('productsApp', './routes'),
      },
      {
        path: 'orders',
        loadChildren: () => inject(MfeLoaderService).loadRoutes('ordersApp', './routes'),
      },
    ],
  },
]
```

### Shell Layout

```typescript
// shell/src/app/layout/shell-layout.component.ts
@Component({
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, NotificationPanelComponent],
  selector: 'app-shell-layout',
  template: `
    <app-navbar
      [navItems]="navItems()"
      (navigate)="onNavigate($event)"
    />
    <main class="shell-content">
      <app-notification-panel />
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [`
    .shell-content {
      min-height: calc(100vh - 120px);
      padding: 24px;
    }
  `],
})
export class ShellLayoutComponent {
  private router = inject(Router)
  private mfeRegistry = inject(MfeRegistryService)

  navItems = computed(() => [
    { label: 'Home', path: '/' },
    { label: 'Products', path: '/products' },
    { label: 'Orders', path: '/orders' },
    ...this.mfeRegistry.registeredApps(),
  ])

  onNavigate(event: { path: string }) {
    this.router.navigateByUrl(event.path)
  }
}
```

### Shared Services

```typescript
// shell/src/app/shared/services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(null)
  private token = signal<string | null>(null)

  readonly isAuthenticated = computed(() => this.currentUser() !== null)
  readonly user = this.currentUser.asReadonly()

  login(credentials: Credentials): Observable<User> {
    return this.http.post<User>('/api/auth/login', credentials).pipe(
      tap(user => {
        this.currentUser.set(user)
        this.token.set(user.token)
        // Notify micro-apps via event bus
        window.dispatchEvent(new CustomEvent('auth:login', {
          detail: { user, token: user.token },
        }))
      }),
    )
  }

  logout(): void {
    this.currentUser.set(null)
    this.token.set(null)
    window.dispatchEvent(new CustomEvent('auth:logout'))
  }
}
```

## Micro-App Setup

### Exposed Components

```typescript
// products-app/src/app/products/products.routes.ts
import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/product-list/product-list.component')
      .then(m => m.ProductListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/product-detail/product-detail.component')
      .then(m => m.ProductDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/product-edit/product-edit.component')
      .then(m => m.ProductEditComponent),
    canDeactivate: [unsavedChangesGuard],
  },
]
```

### Standalone Deployment

Each micro-app is built and deployed independently with its own CI/CD pipeline:

```typescript
// products-app/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser'
import { ProductsRootComponent } from './app/products-root.component'

// Each micro-app is independently bootstrappable for development
bootstrapApplication(ProductsRootComponent, {
  providers: [
    provideRouter([]),
    provideHttpClient(),
  ],
}).catch(err => console.error(err))
```

### Routing Isolation

Micro-apps define routes relative to their mount point, unaware of shell routing:

```typescript
// products-app/src/app/products/products.routes.ts
// Routes are relative — the shell prefixes them with /products
export const routes: Routes = [
  {
    path: '',
    component: ProductListComponent,
    title: 'Products',
  },
  {
    path: ':id',
    component: ProductDetailComponent,
    title: 'Product Detail',
  },
]

// Micro-app does NOT know about shell routes
// Shell handles: /products, /orders, /admin
// Micro-app only sees: '', ':id', ':id/edit'
```

## Cross-App Communication

### Shared State

```typescript
// shared-sdk/src/lib/global-state.service.ts
@Injectable({ providedIn: 'root' })
export class GlobalStateService {
  private state = new Map<string, Signal<unknown>>()
  private sources = new Map<string, Signal<unknown>>()

  setState<T>(key: string, value: T): void {
    const signal = signal(value)
    this.sources.set(key, signal)
    this.state.set(key, signal.asReadonly())
  }

  select<T>(key: string): Signal<T | undefined> {
    return this.state.get(key) as Signal<T | undefined> ?? signal(undefined).asReadonly()
  }

  update<T>(key: string, updater: (current: T | undefined) => T): void {
    const current = this.sources.get(key)
    if (current) {
      (current as WritableSignal<T>).set(updater(current() as T))
    } else {
      this.setState(key, updater(undefined))
    }
  }
}
```

### Custom Events

```typescript
// shared-sdk/src/lib/event-bus.service.ts
export interface AppEvent {
  type: string
  payload: unknown
  source: string
  timestamp: number
}

@Injectable({ providedIn: 'root' })
export class AppEventBus {
  private events$ = new Subject<AppEvent>()

  // Subscribe to specific event types
  on<T>(eventType: string): Observable<T> {
    return this.events$.pipe(
      filter(event => event.type === eventType),
      map(event => event.payload as T),
    )
  }

  // Emit an event
  emit(eventType: string, payload: unknown): void {
    const event: AppEvent = {
      type: eventType,
      payload,
      source: window.location.host,
      timestamp: Date.now(),
    }
    this.events$.next(event)

    // Also dispatch as DOM event for cross-micro-app communication
    window.dispatchEvent(new CustomEvent('app-event', {
      detail: event,
    }))
  }
}
```

### URL-Based Communication

```typescript
// shell/src/app/shared/services/url-state.service.ts
@Injectable({ providedIn: 'root' })
export class UrlStateService {
  private router = inject(Router)
  private activatedRoute = inject(ActivatedRoute)

  // Share state via query params
  setSharedState(key: string, value: string): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [key]: value },
      queryParamsHandling: 'merge',
    })
  }

  getSharedState(key: string): Observable<string | null> {
    return this.activatedRoute.queryParams.pipe(
      map(params => params[key] ?? null),
    )
  }

  clearSharedState(key: string): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [key]: null },
      queryParamsHandling: 'merge',
    })
  }
}
```

### Store Synchronization

```typescript
// NgRx store synchronization across micro-apps
@Injectable({ providedIn: 'root' })
export class StoreSyncService {
  private store = inject(Store)
  private eventBus = inject(AppEventBus)

  constructor() {
    // Subscribe to events from other micro-apps
    this.eventBus.on<{ key: string; value: unknown }>('store:sync')
      .subscribe(({ key, value }) => {
        this.store.dispatch(syncAction({ key, value }))
      })
  }

  syncState(key: string, value: unknown): void {
    this.eventBus.emit('store:sync', { key, value })
  }

  // Selective sync — only share specific slices
  syncSlice<T>(selector: (state: any) => T): void {
    this.store.select(selector).pipe(
      distinctUntilChanged(),
    ).subscribe(value => {
      this.eventBus.emit('store:sync', { key: selector.name, value })
    })
  }
}
```

## Shared Library Management

### Singleton Dependencies

Angular itself must be singleton — multiple instances cause runtime errors:

```javascript
// webpack.config.js — Critical singleton configuration
shared: {
  '@angular/core': {
    singleton: true,
    strictVersion: true,
    requiredVersion: '^17.0.0',
    eager: false,
  },
  '@angular/common': {
    singleton: true,
    strictVersion: true,
    requiredVersion: '^17.0.0',
  },
  '@angular/router': {
    singleton: true,
    strictVersion: true,
    requiredVersion: '^17.0.0',
  },
  // Third party singletons
  '@ngrx/store': {
    singleton: true,
    strictVersion: true,
  },
  'rxjs': {
    singleton: true,
    strictVersion: true,
    requiredVersion: '^7.8.0',
  },
}
```

### Version Conflicts

Handle version conflicts with alias strategies or shared version ranges:

```javascript
// Option 1: Version range tolerance
shared: {
  '@angular/core': {
    singleton: true,
    requiredVersion: '^17.0.0 || ^18.0.0',
  },
}

// Option 2: Skip version check (use with caution)
shared: {
  'some-lib': {
    singleton: true,
    requiredVersion: false, // Accept any version
  },
}

// Option 3: Explicit version fallback
shared: {
  '@angular/core': {
    singleton: true,
    strictVersion: false,
    version: '17.2.0',
  },
}
```

### Shared Library Patterns

**NPM package approach:**

```json
// package.json — Shared library in all micro-apps
{
  "dependencies": {
    "@company/shared-sdk": "^2.1.0"
  }
}
```

```javascript
// webpack.config.js — Share the SDK as singleton
shared: {
  '@company/shared-sdk': {
    singleton: true,
    strictVersion: true,
    requiredVersion: '^2.1.0',
  },
}
```

**Workspace monorepo approach:**

```json
// angular.json — Workspace project reference
{
  "projects": {
    "shared-sdk": {
      "root": "libs/shared-sdk",
      "projectType": "library"
    },
    "shell": {
      "root": "apps/shell"
    },
    "products-app": {
      "root": "apps/products"
    }
  }
}
```

## Routing Approaches

### Shell-Managed Routing

The shell owns top-level routes and delegates to micro-apps:

```typescript
// shell/src/app/app.routes.ts
export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      // Shell pages
      { path: '', component: HomeComponent },
      { path: 'login', component: LoginComponent },
      // Micro-app routes — dynamically loaded
      {
        path: 'products',
        loadChildren: () => loadRemoteModule({
          remoteName: 'productsApp',
          exposedModule: './routes',
        }).then(m => m.routes),
      },
      {
        path: 'orders',
        loadChildren: () => loadRemoteModule({
          remoteName: 'ordersApp',
          exposedModule: './routes',
        }).then(m => m.routes),
      },
    ],
  },
]
```

### Per-App Routing

Each micro-app has its own router instance but shares the URL:

```typescript
// Not recommended — multiple router instances cause conflicts
// Instead, use the shell router and have micro-apps register routes

// products-app/src/app/products/products.routes.ts
export const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: ':id', component: ProductDetailComponent },
  { path: ':id/edit', component: ProductEditComponent },
]

// Shell registers these routes dynamically
```

### Route Redistribution

When routes need to move between micro-frontends, implement a redirect mechanism:

```typescript
// shell/src/app/features/route-redirect.service.ts
@Injectable({ providedIn: 'root' })
export class RouteRedirectService {
  private router = inject(Router)
  private mfeRegistry = inject(MfeRegistryService)

  registerRedirect(from: string, to: string, targetApp: string): void {
    this.router.config.unshift({
      path: from,
      redirectTo: to,
      pathMatch: 'full',
    })
  }

  redistributeRoutes(routes: RouteDistribution[]): void {
    for (const { oldPath, newPath, app } of routes) {
      this.registerRedirect(oldPath, newPath, app)
    }
  }
}
```

## Styling Isolation

### Scoped Styles

Angular's default style encapsulation provides isolation within each micro-app:

```typescript
@Component({
  standalone: true,
  selector: 'app-product-card',
  encapsulation: ViewEncapsulation.Emulated, // Default
  styles: [`
    .card { border: 1px solid #ddd; padding: 16px; }
    .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  `],
  template: `...`,
})
export class ProductCardComponent {}
```

### CSS Custom Properties

Use CSS custom properties for cross-micro-app theming:

```css
/* shell/src/styles.css — Global design tokens */
:root {
  --color-primary: #1976d2;
  --color-accent: #ff4081;
  --color-background: #fafafa;
  --color-surface: #ffffff;
  --color-text: #212121;
  --color-text-secondary: #757575;
  --spacing-unit: 8px;
  --border-radius: 4px;
  --font-family: 'Roboto', sans-serif;
  --font-size-base: 14px;
}
```

```typescript
// Micro-apps reference shell tokens
@Component({
  styles: [`
    .card {
      background: var(--color-surface);
      color: var(--color-text);
      border-radius: var(--border-radius);
      font-family: var(--font-family);
      padding: calc(var(--spacing-unit) * 2);
    }
  `],
})
export class ProductCardComponent {}
```

### Shadow DOM

For strict isolation, use `ViewEncapsulation.ShadowDom`:

```typescript
@Component({
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: [`
    :host { display: block; }
    .container { padding: 16px; }
  `],
  template: `<div class="container"><ng-content /></div>`,
})
export class IsolatedComponent {}
```

### BEM Naming

Without scoped styles, use BEM naming to prevent collisions:

```css
/* products-app */
.products-app__card { }
.products-app__card--featured { }
.products-app__card-title { }

/* orders-app */
.orders-app__card { }
.orders-app__card--urgent { }
.orders-app__card-status { }
```

## State Management Across Micro-Frontends

### NgRx Store Sharing

```typescript
// shell/src/app/store/index.ts
import { ActionReducerMap } from '@ngrx/store'

export interface AppState {
  auth: AuthState
  shell: ShellState
  // Micro-app states are registered dynamically
  [key: string]: any
}

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  shell: shellReducer,
}

// shell/src/app/store/global-store.ts
@Injectable({ providedIn: 'root' })
export class GlobalStoreService {
  private store = inject(Store)

  registerFeatureStore(featureKey: string, reducer: ActionReducer<any>): void {
    this.store.addReducer(featureKey, reducer)
  }

  removeFeatureStore(featureKey: string): void {
    this.store.removeReducer(featureKey)
  }
}
```

```typescript
// products-app — Register feature state with shell store
@Injectable({ providedIn: 'root' })
export class ProductsStoreService {
  private globalStore = inject(GlobalStoreService)

  constructor() {
    this.globalStore.registerFeatureStore('products', productsReducer)
  }

  // Cleanup when micro-app is destroyed
  destroy(): void {
    this.globalStore.removeFeatureStore('products')
  }
}
```

### Signals Approach

```typescript
// shared-sdk/src/lib/shared-signals.service.ts
@Injectable({ providedIn: 'root' })
export class SharedSignalsService {
  private stores = new Map<string, ReturnType<typeof signal>>()

  createStore<T>(key: string, initialValue: T): {
    state: Signal<T>
    set: (value: T) => void
    update: (fn: (prev: T) => T) => void
  } {
    const s = signal(initialValue)
    this.stores.set(key, s)

    return {
      state: s.asReadonly(),
      set: (value: T) => {
        s.set(value)
        this.syncToEventBus(key, value)
      },
      update: (fn: (prev: T) => T) => {
        s.update(fn)
        this.syncToEventBus(key, s())
      },
    }
  }

  private syncToEventBus(key: string, value: unknown): void {
    window.dispatchEvent(new CustomEvent('signal:update', {
      detail: { key, value },
    }))
  }
}
```

### Event Bus for Cross-App State

```typescript
// shared-sdk/src/lib/cross-app-bus.ts
export type CrossAppHandler = (payload: unknown, source: string) => void

export class CrossAppBus {
  private handlers = new Map<string, Set<CrossAppHandler>>()
  private listener: ((event: CustomEvent) => void) | null = null

  start(): void {
    this.listener = (event: CustomEvent) => {
      const { type, payload, source } = event.detail
      this.handlers.get(type)?.forEach(handler => {
        handler(payload, source)
      })
    }
    window.addEventListener('app-event', this.listener as EventListener)
  }

  stop(): void {
    if (this.listener) {
      window.removeEventListener('app-event', this.listener as EventListener)
    }
  }

  on(eventType: string, handler: CrossAppHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
    return () => this.handlers.get(eventType)?.delete(handler)
  }

  emit(eventType: string, payload: unknown): void {
    window.dispatchEvent(new CustomEvent('app-event', {
      detail: {
        type: eventType,
        payload,
        source: window.location.host,
      },
    }))
  }
}
```

## Authentication and Authorization

### Centralized Auth

```typescript
// shell/src/app/auth/auth.service.ts
@Injectable({ providedIn: 'root' })
export class CentralAuthService {
  private token = signal<string | null>(null)
  private user = signal<User | null>(null)

  readonly isAuthenticated = computed(() => !!this.token())
  readonly currentUser = this.user.asReadonly()

  async login(credentials: Credentials): Promise<void> {
    const response = await this.http.post<AuthResponse>('/api/auth/login', credentials).toPromise()
    this.token.set(response.token)
    this.user.set(response.user)
    this.storeToken(response.token)
    this.broadcastAuthState()
  }

  async refreshToken(): Promise<void> {
    const response = await this.http.post<{ token: string }>('/api/auth/refresh', {}).toPromise()
    this.token.set(response.token)
    this.storeToken(response.token)
  }

  private broadcastAuthState(): void {
    // Share auth state with all micro-apps
    window.dispatchEvent(new CustomEvent('auth:state-changed', {
      detail: {
        token: this.token(),
        user: this.user(),
        isAuthenticated: this.isAuthenticated(),
      },
    }))
  }
}
```

### Token Sharing

```typescript
// shell/src/app/auth/token-interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http'

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(CentralAuthService)
  const token = authService.getToken()

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  return next(req)
}

// Shared token service for micro-apps
@Injectable({ providedIn: 'root' })
export class TokenProviderService {
  private token = signal<string | null>(null)

  constructor() {
    window.addEventListener('auth:state-changed', ((event: CustomEvent) => {
      this.token.set(event.detail.token)
    }) as EventListener)
  }

  getToken(): string | null {
    return this.token()
  }

  onTokenChange(): Observable<string | null> {
    return toObservable(this.token)
  }
}
```

### Per-App Auth

```typescript
// products-app/src/app/auth/products-auth.guard.ts
export function productsAuthGuard(): boolean {
  const tokenProvider = inject(TokenProviderService)
  const productsAuth = inject(ProductsAuthService)
  const router = inject(Router)

  // Check both global and app-specific auth
  const globalToken = tokenProvider.getToken()
  const hasProductsAccess = productsAuth.hasAccess()

  if (globalToken && hasProductsAccess) {
    return true
  }

  router.navigate(['/products/unauthorized'])
  return false
}
```

## Deployment Strategies

### Independent Deployment

Each micro-app is built, versioned, and deployed independently:

```yaml
# .github/workflows/products-app.yml
name: Deploy Products App

on:
  push:
    branches: [main]
    paths:
      - 'apps/products/**'
      - 'libs/shared-sdk/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx nx build products-app --configuration=production
      - name: Deploy to CDN
        run: |
          aws s3 sync dist/apps/products s3://mfe-cdn/products/${{ github.sha }}
          aws s3 cp dist/apps/products/remoteEntry.js \
            s3://mfe-cdn/products/remoteEntry.js
          # Update manifest with new version
          echo "{\"version\":\"${{ github.sha }}\",\"url\":\"https://cdn.example.com/products/${{ github.sha }}/remoteEntry.js\"}" \
            > mfe-manifest.json
          aws s3 cp mfe-manifest.json s3://mfe-cdn/products/manifest.json
```

### Version Compatibility

Use a manifest file to manage micro-app versions:

```json
// federation.manifest.json
{
  "shell": {
    "version": "2.1.0",
    "url": "https://cdn.example.com/shell/remoteEntry.js"
  },
  "productsApp": {
    "version": "1.4.2",
    "url": "https://cdn.example.com/products/v1.4.2/remoteEntry.js",
    "compatibleShellVersions": [">=2.0.0 <3.0.0"],
    "dependencies": {
      "@angular/core": "^17.0.0",
      "@company/shared-sdk": "^2.1.0"
    }
  },
  "ordersApp": {
    "version": "2.0.1",
    "url": "https://cdn.example.com/orders/v2.0.1/remoteEntry.js",
    "compatibleShellVersions": [">=2.0.0 <3.0.0"],
    "dependencies": {
      "@angular/core": "^17.0.0"
    }
  }
}
```

### Blue-Green Deployment

```yaml
# deployment/blue-green.ps1
$APP_NAME = "products-app"
$BLUE_URL = "s3://mfe-cdn/$APP_NAME/blue"
$GREEN_URL = "s3://mfe-cdn/$APP_NAME/green"
$ACTIVE_ENV = (aws s3api get-object --bucket mfe-cdn --key "$APP_NAME/active.txt" --query Body --output text)

if ($ACTIVE_ENV -eq "blue") {
  $NEW_ENV = "green"
} else {
  $NEW_ENV = "blue"
}

# Deploy to inactive environment
Write-Host "Deploying to $NEW_ENV..."
aws s3 sync ./dist s3://mfe-cdn/$APP_NAME/$NEW_ENV

# Run smoke tests against new environment
$HEALTH_URL = "https://cdn.example.com/$APP_NAME/$NEW_ENV/remoteEntry.js"
$HEALTH_CHECK = Invoke-WebRequest -Uri $HEALTH_URL -Method Head
if ($HEALTH_CHECK.StatusCode -ne 200) {
  Write-Host "Health check failed!"
  exit 1
}

# Switch active environment
Write-Host "Switching active environment to $NEW_ENV..."
aws s3api put-object --bucket mfe-cdn --key "$APP_NAME/active.txt" --body $NEW_ENV

Write-Host "Deployment to $NEW_ENV complete. Active: $NEW_ENV"
```

## CI/CD for Micro-Frontends

### Independent Pipelines

```yaml
# .github/workflows/ci.yml — Per-app CI pipeline
name: Micro-App CI

on:
  pull_request:
    paths:
      - 'apps/products/**'
      - 'libs/shared-sdk/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx nx affected:lint --base=origin/main --head=HEAD

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx nx affected:test --base=origin/main --head=HEAD
      - run: npx nx affected:build --base=origin/main --head=HEAD --configuration=production
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/apps/**/*
```

### Build Artifacts

```yaml
# .github/workflows/release.yml — Versioned build artifacts
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx nx build products-app --configuration=production
      - name: Create versioned artifact
        run: |
          VERSION=${{ github.sha }}
          mkdir -p artifacts
          cp -r dist/apps/products "artifacts/products-${VERSION}"
          tar -czf "artifacts/products-${VERSION}.tar.gz" -C artifacts "products-${VERSION}"
      - uses: actions/upload-artifact@v4
        with:
          name: products-app-build
          path: artifacts/products-*.tar.gz
```

### CDN Deployment

```yaml
deploy:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: products-app-build
    - name: Deploy to CDN
      run: |
        VERSION=$(ls *.tar.gz | sed 's/products-//' | sed 's/.tar.gz//')
        tar -xzf "products-${VERSION}.tar.gz"
        aws s3 sync "products-${VERSION}" "s3://mfe-cdn/products/${VERSION}" --cache-control "public, max-age=31536000, immutable"
        # Update immutable version reference
        aws s3 cp "products-${VERSION}/remoteEntry.js" "s3://mfe-cdn/products/remoteEntry.js" --cache-control "public, max-age=300"
    - name: Invalidate CDN cache
      run: |
        aws cloudfront create-invalidation \
          --distribution-id ${{ secrets.CDN_DISTRIBUTION_ID }} \
          --paths "/products/*"
```

## Platform/Portal Architecture

### Dynamic App Registration

```typescript
// shell/src/app/registry/mfe-registry.service.ts
export interface MfeRegistration {
  appName: string
  displayName: string
  routePrefix: string
  remoteEntry: string
  exposedModule: string
  icon: string
  permissions: string[]
  preload: boolean
  weight: number
}

@Injectable({ providedIn: 'root' })
export class MfeRegistryService {
  private registrations = signal<MfeRegistration[]>([])

  registeredApps = this.registrations.asReadonly()

  async registerApp(registration: MfeRegistration): Promise<void> {
    // Validate compatibility
    const manifest = await fetch(registration.remoteEntry.replace('remoteEntry.js', 'manifest.json'))
      .then(r => r.json())

    if (!this.isCompatible(manifest)) {
      console.warn(`App ${registration.appName} is not compatible with current shell version`)
      return
    }

    this.registrations.update(apps => [...apps, registration])
  }

  unregisterApp(appName: string): void {
    this.registrations.update(apps => apps.filter(app => app.appName !== appName))
  }

  private isCompatible(manifest: any): boolean {
    return manifest.compatibleShellVersions?.some((range: string) => {
      return semver.satisfies('2.1.0', range)
    }) ?? true
  }
}
```

### App Catalog

```typescript
// shell/src/app/catalog/app-catalog.component.ts
@Component({
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, SearchBarComponent, CardComponent],
  template: `
    <app-search-bar (search)="onSearch($event)" />
    <div class="catalog-grid">
      <app-card
        *ngFor="let app of filteredApps()"
        [title]="app.displayName"
        [icon]="app.icon"
        (click)="navigateToApp(app)"
      >
        <div class="app-meta">
          <span class="version">{{ app.version }}</span>
          <span class="status" [class.active]="app.isActive">
            {{ app.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </app-card>
    </div>
  `,
})
export class AppCatalogComponent {
  private registry = inject(MfeRegistryService)
  private router = inject(Router)

  searchQuery = signal('')

  filteredApps = computed(() => {
    const query = this.searchQuery().toLowerCase()
    return this.registry.registeredApps().filter(app =>
      app.displayName.toLowerCase().includes(query) ||
      app.appName.toLowerCase().includes(query)
    )
  })

  onSearch(query: string): void {
    this.searchQuery.set(query)
  }

  navigateToApp(app: MfeRegistration): void {
    this.router.navigateByUrl(`/${app.routePrefix}`)
  }
}
```

### Shell UX Patterns

```typescript
// shell/src/app/layout/shell-navigation/shell-navigation.component.ts
@Component({
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive],
  selector: 'app-nav',
  template: `
    <nav class="shell-nav">
      <div class="nav-brand">
        <img [src]="brandLogo" alt="Brand" />
        <span class="brand-name">Portal</span>
      </div>

      <div class="nav-items">
        <a
          *ngFor="let item of navItems()"
          [routerLink]="item.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          class="nav-item"
        >
          <mat-icon [fontIcon]="item.icon" />
          <span class="nav-label">{{ item.label }}</span>
          <span *ngIf="item.badge" class="nav-badge">{{ item.badge }}</span>
        </a>
      </div>

      <div class="nav-actions">
        <app-app-switcher />
        <app-user-menu />
      </div>
    </nav>
  `,
  styles: [`
    .shell-nav {
      display: flex;
      align-items: center;
      height: 64px;
      padding: 0 24px;
      background: var(--color-primary);
      color: white;
    }
    .nav-items {
      display: flex;
      gap: 4px;
      flex: 1;
      margin: 0 24px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: background 0.2s;
    }
    .nav-item:hover,
    .nav-item.active {
      background: rgba(255, 255, 255, 0.15);
      color: white;
    }
    .nav-badge {
      background: red;
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 10px;
    }
  `],
})
export class ShellNavigationComponent {
  private registry = inject(MfeRegistryService)

  navItems = computed(() => [
    { label: 'Home', path: '/', icon: 'home', exact: true },
    { label: 'Products', path: '/products', icon: 'inventory_2' },
    { label: 'Orders', path: '/orders', icon: 'receipt_long' },
    ...this.registry.registeredApps().map(app => ({
      label: app.displayName,
      path: `/${app.routePrefix}`,
      icon: app.icon,
    })),
  ])
}
```

## Performance

### Shared Dependencies

Proper shared dependency configuration prevents duplication:

```javascript
// webpack.config.js — Verify shared deps are not duplicated
shared: {
  '@angular/core': {
    singleton: true,
    strictVersion: true,
  },
}

// Check browser console for:
// ⚠️ [MF] Multiple versions of @angular/core detected
```

### Tree-Shaking

Each micro-app tree-shakes independently, reducing per-app bundle size:

```javascript
// webpack.config.js — Enable tree-shaking per micro-app
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: true,
    concatenateModules: true,
  },
}
```

### Preloading Strategies

```typescript
// shell/src/app/preloading/mfe-preloading-strategy.ts
@Injectable({ providedIn: 'root' })
export class MfePreloadingStrategy implements PreloadingStrategy {
  private registry = inject(MfeRegistryService)
  private mfeLoader = inject(MfeLoaderService)

  preload(route: Route, fn: () => Observable<any>): Observable<any> {
    // Preload based on user behavior patterns
    const shouldPreload = this.shouldPreloadRoute(route)

    if (shouldPreload) {
      return fn().pipe(
        tap(() => {
          const appName = route.data?.['mfeApp']
          if (appName) {
            this.mfeLoader.preloadApp(appName)
          }
        }),
      )
    }

    return of(null)
  }

  private shouldPreloadRoute(route: Route): boolean {
    // Preload frequently accessed routes
    const preloadPriority = route.data?.['preload']
    if (preloadPriority === 'always') return true
    if (preloadPriority === 'never') return false

    // Heuristic: preload based on app weight/size
    return route.data?.['mfeApp'] !== undefined
  }
}
```

```typescript
// shell/src/app/preloading/mfe-preloader.service.ts
@Injectable({ providedIn: 'root' })
export class MfePreloaderService {
  private preloaded = new Set<string>()

  preloadApp(appName: string): void {
    if (this.preloaded.has(appName)) return

    requestIdleCallback(() => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = `https://cdn.example.com/${appName}/remoteEntry.js`
      document.head.appendChild(link)

      // Also preload critical chunks
      const criticalChunks = [
        `https://cdn.example.com/${appName}/main.js`,
        `https://cdn.example.com/${appName}/styles.js`,
      ]
      criticalChunks.forEach(chunk => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.as = 'script'
        link.href = chunk
        document.head.appendChild(link)
      })

      this.preloaded.add(appName)
    })
  }
}
```

### Critical Path Optimization

```typescript
// shell/src/app/optimization/critical-path.service.ts
@Injectable({ providedIn: 'root' })
export class CriticalPathService {
  private router = inject(Router)

  optimizeInitialLoad(): void {
    // Load shell CSS immediately
    const shellStyles = document.createElement('link')
    shellStyles.rel = 'stylesheet'
    shellStyles.href = '/assets/shell-critical.css'
    document.head.prepend(shellStyles)

    // Defer non-critical micro-app assets
    window.addEventListener('load', () => {
      requestIdleCallback(() => {
        this.preloadLikelyApps()
      })
    })
  }

  private preloadLikelyApps(): void {
    // Determine likely app based on user role/history
    const likelyApps = this.getLikelyApps()

    likelyApps.forEach(app => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = `https://cdn.example.com/${app}/remoteEntry.js`
      document.head.appendChild(link)
    })
  }

  private getLikelyApps(): string[] {
    // Logic to determine which apps to preload
    return ['products'] // Default to most common entry point
  }
}
```

## Testing Micro-Frontends

### E2E Testing with Shell

```typescript
// e2e/shell/shell.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Shell Application', () => {
  test('should load shell and navigate to products micro-app', async ({ page }) => {
    await page.goto('/')

    // Shell layout is visible
    await expect(page.locator('app-shell-layout')).toBeVisible()
    await expect(page.locator('app-nav')).toBeVisible()

    // Navigate to products micro-app
    await page.click('text=Products')
    await expect(page).toHaveURL(/\/products/)

    // Products micro-app content is loaded
    await expect(page.locator('app-product-list')).toBeVisible({ timeout: 10000 })
  })

  test('cross-app navigation preserves state', async ({ page }) => {
    await page.goto('/products')
    await page.click('text=Product 1')

    // Navigate to orders and back
    await page.click('text=Orders')
    await page.click('text=Products')

    // Should still be on product detail
    await expect(page).toHaveURL(/\/products\/1/)
    await expect(page.locator('app-product-detail')).toBeVisible()
  })
})
```

### Integration Testing

```typescript
// products-app/src/app/products/services/product.service.spec.ts
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing'
import { ProductService } from './product.service'

describe('ProductService (Micro-App)', () => {
  let service: ProductService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProductService,
      ],
    })

    service = TestBed.inject(ProductService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  it('should fetch products', () => {
    const mockProducts = [{ id: '1', name: 'Widget' }]

    service.getAll().subscribe(products => {
      expect(products).toEqual(mockProducts)
    })

    const req = httpMock.expectOne('/api/products')
    expect(req.request.headers.get('Authorization')).toBeTruthy()
    req.flush(mockProducts)
  })
})
```

### Contract Testing

```typescript
// shared-contracts/shell-products.contract.ts
// Verify the contracts between shell and micro-apps

export interface MicroAppContract {
  // Routes must be an array of Route objects
  routes: Route[]

  // Exposed component selectors must follow naming convention
  componentSelectors: string[]

  // Event bus contract
  events: {
    emits: string[]
    listens: string[]
  }

  // Store slices this app registers
  storeSlices: string[]
}

// Contract test
describe('Products App Contract', () => {
  it('should expose valid routes', async () => {
    const module = await loadRemoteModule({
      remoteName: 'productsApp',
      exposedModule: './routes',
    })

    const routes = module.routes || module.default
    expect(Array.isArray(routes)).toBe(true)

    routes.forEach(route => {
      expect(route.path).toBeDefined()
      expect(typeof route.path).toBe('string')
    })
  })

  it('should not use shell routes directly', () => {
    const routes = loadRoutes()
    const allPaths = routes.map(r => r.path)

    // Micro-app should not reference shell-managed paths
    expect(allPaths).not.toContain('/')
    expect(allPaths).not.toContain('/admin')
  })
})
```

## Error Handling

### Error Boundaries

```typescript
// shell/src/app/error-boundary/micro-app-error-boundary.component.ts
@Component({
  standalone: true,
  selector: 'app-mfe-error-boundary',
  template: `
    @if (!hasError()) {
      <ng-content />
    } @else {
      <div class="error-boundary">
        <mat-icon>error_outline</mat-icon>
        <h3>Something went wrong</h3>
        <p>{{ errorMessage() }}</p>
        <button mat-raised-button color="primary" (click)="retry()">
          Retry
        </button>
        <button mat-button (click)="goHome()">
          Go to Home
        </button>
      </div>
    }
  `,
  styles: [`
    .error-boundary {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      text-align: center;
    }
    mat-icon { font-size: 48px; width: 48px; height: 48px; color: #f44336; }
  `],
})
export class MicroAppErrorBoundaryComponent {
  private router = inject(Router)
  hasError = signal(false)
  errorMessage = signal('')

  @Input({ required: true }) appName = ''

  captureError(error: Error): void {
    this.hasError.set(true)
    this.errorMessage.set(error.message || 'An unexpected error occurred while loading this section.')

    console.error(`[MFE Error] ${this.appName}:`, error)
  }

  retry(): void {
    this.hasError.set(false)
    // Force re-render by reloading the route
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(this.router.url)
    })
  }

  goHome(): void {
    this.router.navigateByUrl('/')
  }
}
```

```typescript
// shell/src/app/error-boundary/mfe-error-handler.ts
@Injectable()
export class MfeErrorHandler extends ErrorHandler {
  private errorBoundaries = new Map<string, MicroAppErrorBoundaryComponent>()

  registerErrorBoundary(appName: string, component: MicroAppErrorBoundaryComponent): void {
    this.errorBoundaries.set(appName, component)
  }

  handleError(error: Error): void {
    // Try to identify which micro-app caused the error
    const appName = this.identifySourceApp(error)

    if (appName && this.errorBoundaries.has(appName)) {
      this.errorBoundaries.get(appName)!.captureError(error)
    } else {
      // Fallback to default error handling
      console.error('[Shell Error Handler]', error)
    }
  }

  private identifySourceApp(error: Error): string | null {
    const stack = error.stack || ''

    if (stack.includes('products')) return 'products'
    if (stack.includes('orders')) return 'orders'

    return null
  }
}
```

### Fallback UIs

```typescript
// shell/src/app/fallback/loading-fallback.component.ts
@Component({
  standalone: true,
  selector: 'app-loading-fallback',
  template: `
    <div class="loading-fallback">
      <mat-spinner diameter="40" />
      <p>Loading {{ appName() }}...</p>
    </div>
  `,
})
export class LoadingFallbackComponent {
  appName = input('')
}
```

```typescript
// Route configuration with fallbacks
export const routes: Routes = [
  {
    path: 'products',
    loadChildren: () => loadRemoteModule({
      remoteName: 'productsApp',
      exposedModule: './routes',
    }).then(m => m.routes),
    // Angular 17+ provides built-in loading/error components
    data: {
      loadingComponent: LoadingFallbackComponent,
      errorComponent: MicroAppErrorBoundaryComponent,
    },
  },
]
```

### Per-App Fault Isolation

```typescript
// shell/src/app/error-boundary/fault-isolation.service.ts
@Injectable({ providedIn: 'root' })
export class FaultIsolationService {
  private criticalResources = new Map<string, Set<string>>()
  private failures = new Map<string, number>()
  private readonly MAX_RETRIES = 3
  private readonly CIRCUIT_BREAK_TIMEOUT = 30000 // 30 seconds

  isAppAvailable(appName: string): boolean {
    const failures = this.failures.get(appName) ?? 0
    if (failures >= this.MAX_RETRIES) {
      const lastFailure = this.criticalResources.get(appName)?.size ?? 0
      const timeSinceLastFailure = Date.now() - lastFailure

      if (timeSinceLastFailure < this.CIRCUIT_BREAK_TIMEOUT) {
        return false // Circuit breaker open
      }

      // Reset after timeout
      this.failures.set(appName, 0)
    }

    return true
  }

  reportFailure(appName: string): void {
    this.failures.set(appName, (this.failures.get(appName) ?? 0) + 1)
  }

  resetCircuitBreaker(appName: string): void {
    this.failures.delete(appName)
  }
}
```

## Performance Metrics

### FCP, LCP, TTI Per Micro-App

```typescript
// shared-sdk/src/lib/performance-monitor.service.ts
@Injectable({ providedIn: 'root' })
export class PerformanceMonitorService {
  private metrics = new Map<string, PerformanceMetrics>()
  private observer: PerformanceObserver | null = null

  startMonitoring(appName: string): void {
    const startTime = performance.now()

    // Measure First Contentful Paint
    this.observer = new PerformanceObserver(list => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric(appName, 'FCP', entry.startTime)
        }
        if (entry.name === 'largest-contentful-paint') {
          this.recordMetric(appName, 'LCP', entry.startTime)
        }
      })
    })

    this.observer.observe({ type: 'paint', buffered: true })

    // Measure Time to Interactive approximation
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.recordMetric(appName, 'TTI', performance.now() - startTime)
      }, 0)
    })
  }

  stopMonitoring(appName: string): void {
    this.observer?.disconnect()
  }

  private recordMetric(appName: string, metric: string, value: number): void {
    if (!this.metrics.has(appName)) {
      this.metrics.set(appName, { FCP: 0, LCP: 0, TTI: 0 })
    }
    this.metrics.get(appName)![metric as keyof PerformanceMetrics] = value
    console.log(`[Performance] ${appName} — ${metric}: ${value.toFixed(2)}ms`)
  }

  getMetrics(appName: string): PerformanceMetrics | undefined {
    return this.metrics.get(appName)
  }
}
```

### Shell Overhead Measurement

```typescript
// shell/src/app/performance/shell-perf.service.ts
@Injectable({ providedIn: 'root' })
export class ShellPerformanceService {
  private metrics = {
    shellLoadTime: 0,
    microAppRegistrationTime: 0,
    routeResolutionTime: 0,
    totalStartupTime: 0,
  }

  measureShellLoadTime(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    this.metrics.shellLoadTime = navigation.domContentLoadedEventEnd - navigation.startTime
  }

  async measureStartup(): Promise<void> {
    const start = performance.now()

    // Measure micro-app registration overhead
    const regStart = performance.now()
    await this.registry.loadRegisteredApps()
    this.metrics.microAppRegistrationTime = performance.now() - regStart

    // Measure route resolution
    const routeStart = performance.now()
    this.router.resetConfig(this.router.config)
    this.metrics.routeResolutionTime = performance.now() - routeStart

    this.metrics.totalStartupTime = performance.now() - start

    console.log('[Shell Performance]', this.metrics)
  }
}
```

## Monitoring and Observability

### Distributed Tracing

```typescript
// shared-sdk/src/lib/tracing.service.ts
@Injectable({ providedIn: 'root' })
export class DistributedTracingService {
  private traceId = this.generateTraceId()
  private spanId = 0

  generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  startSpan(operationName: string, metadata?: Record<string, unknown>): TracingSpan {
    const spanId = ++this.spanId

    return {
      traceId: this.traceId,
      spanId: `span-${spanId}`,
      parentSpanId: null,
      operationName,
      startTime: Date.now(),
      metadata: metadata ?? {},
      end: () => {
        const duration = Date.now() - this.startTime
        this.reportSpan({ ...this, duration })
      },
    }
  }

  private reportSpan(span: Record<string, unknown>): void {
    // Send to centralized tracing backend
    fetch('/api/tracing/spans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(span),
    }).catch(() => {})
  }
}
```

### Centralized Logging

```typescript
// shared-sdk/src/lib/logging.service.ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  app: string
  message: string
  data?: unknown
  traceId?: string
}

@Injectable({ providedIn: 'root' })
export class CentralizedLoggingService {
  private buffer: LogEntry[] = []
  private flushInterval = 5000 // 5 seconds
  private maxBufferSize = 50

  constructor() {
    setInterval(() => this.flush(), this.flushInterval)
    window.addEventListener('unload', () => this.flush())
  }

  log(level: LogLevel, app: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      app,
      message,
      data,
    }

    this.buffer.push(entry)

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush()
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return

    const entries = [...this.buffer]
    this.buffer = []

    // Use sendBeacon for reliable delivery during page unload
    navigator.sendBeacon('/api/logs', JSON.stringify(entries))
  }
}
```

### Error Aggregation

```typescript
// shell/src/app/monitoring/error-aggregator.service.ts
@Injectable({ providedIn: 'root' })
export class ErrorAggregatorService {
  private errors = new Map<string, { count: number; firstSeen: number; lastSeen: number }>()

  reportError(error: Error, source: string, appName: string): void {
    const key = `${appName}:${error.message}`

    if (!this.errors.has(key)) {
      this.errors.set(key, {
        count: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      })
    }

    const record = this.errors.get(key)!
    record.count++
    record.lastSeen = Date.now()

    // Aggregate duplicate errors within a 5-minute window
    console.warn(`[Error Aggregation] ${appName}: ${error.message} (x${record.count})`)

    // Send to monitoring service
    this.sendToMonitoring(error, source, appName, record)
  }

  private sendToMonitoring(error: Error, source: string, appName: string, record: { count: number }): void {
    fetch('/api/monitoring/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: appName,
        source,
        message: error.message,
        stack: error.stack,
        count: record.count,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {})
  }
}
```

## Security Considerations

### Cross-App Security

```typescript
// shell/src/app/security/mfe-sandbox.service.ts
@Injectable({ providedIn: 'root' })
export class MfeSandboxService {
  private allowedOrigins = new Set([
    'https://cdn.example.com',
    'https://products.example.com',
    'https://orders.example.com',
  ])

  validateRemoteSource(remoteUrl: string): boolean {
    try {
      const url = new URL(remoteUrl)
      return this.allowedOrigins.has(url.origin)
    } catch {
      return false
    }
  }

  sanitizeRemoteData(data: unknown, expectedType: string): unknown {
    // Validate data structure from remote sources
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid data from remote source')
    }

    return data
  }
}
```

### XSS Prevention

```typescript
// micro-apps must use Angular's built-in sanitization
@Component({
  template: `
    <!-- Safe: Angular sanitizes by default -->
    <div [innerHTML]="userContent"></div>

    <!-- Safe: Property binding prevents XSS -->
    <a [href]="userProvidedUrl">Link</a>

    <!-- Dangerous: Never use bypassSecurityTrust with user input -->
    <!-- <div [innerHTML]="sanitizer.bypassSecurityTrustHtml(userContent)"></div> -->
  `,
})
export class SafeComponent {
  userContent = '<p>Safe content</p>'
  userProvidedUrl = 'https://example.com'

  constructor(private sanitizer: DomSanitizer) {}

  // Safe usage of bypass for trusted content only
  getSafeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url)
  }
}
```

### Content Security Policy

```html
<!-- index.html — CSP headers for micro-frontends -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.example.com 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.example.com;
  connect-src 'self' https://api.example.com https://cdn.example.com;
  frame-src 'self' https://*.example.com;
  font-src 'self' https://fonts.gstatic.com;
">
```

## Scaling Patterns

### Multi-Team Development

```
Repository structure for multi-team micro-frontends:

monorepo/
├── apps/
│   ├── shell/              # Team Platform
│   ├── products/           # Team Products
│   ├── orders/             # Team Orders
│   └── admin/              # Team Admin
├── libs/
│   ├── shared-sdk/         # Shared library team
│   ├── ui-components/      # Design system team
│   └── api-contracts/      # API contract definitions
├── tools/
│   ├── generators/         # Code generators
│   └── scripts/            # Build/deploy scripts
└── .github/
    ├── workflows/
    │   ├── shell.yml       # Shell CI/CD
    │   ├── products.yml    # Products CI/CD
    │   └── shared-sdk.yml  # Shared SDK CI/CD
    └── CODEOWNERS          # Team ownership
```

```gitignore
# CODEOWNERS — Enforce team ownership
/apps/shell/ @team-platform
/apps/products/ @team-products
/apps/orders/ @team-orders
/libs/shared-sdk/ @team-shared
/libs/ui-components/ @team-design-system
```

### API Contracts

```typescript
// libs/api-contracts/src/lib/product.contract.ts
// Shared contract between shell and micro-apps
export interface ProductContract {
  id: string
  name: string
  price: number
  description: string
  category: string
  images: string[]
  variants: ProductVariant[]
  createdAt: string
  updatedAt: string
}

export interface ProductListContract {
  items: ProductContract[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Contract tests ensure shell and micro-app agree on data shape
describe('Product Contract', () => {
  it('shell should send valid product payload', () => {
    const product: ProductContract = { ... }
    expect(product).toMatchContract(ProductContract)
  })

  it('products app should handle shell payload', () => {
    const shellPayload = { ... }
    expect(() => validateProduct(shellPayload)).not.toThrow()
  })
})
```

### Version Negotiation

```typescript
// shell/src/app/registry/version-negotiation.service.ts
@Injectable({ providedIn: 'root' })
export class VersionNegotiationService {
  async negotiateCompatibility(appName: string, shellVersion: string): Promise<boolean> {
    const manifest = await fetch(`https://cdn.example.com/${appName}/manifest.json`).then(r => r.json())

    const compatibleRanges = manifest.compatibleShellVersions ?? ['*']

    return compatibleRanges.some(range => {
      if (range === '*') return true
      return semver.satisfies(shellVersion, range)
    })
  }

  async resolveVersion(appName: string, requiredVersion: string): Promise<string | null> {
    const versions = await this.listAvailableVersions(appName)

    // Find latest compatible version
    const compatible = versions
      .filter(v => semver.satisfies(v, requiredVersion))
      .sort(semver.compare)

    return compatible[compatible.length - 1] ?? null
  }

  private async listAvailableVersions(appName: string): Promise<string[]> {
    const response = await fetch(`https://cdn.example.com/${appName}/versions.json`)
    return response.json()
  }
}
```

## Comparison with Alternatives

| Approach | Isolation | Shared Deps | SEO | Performance | Complexity |
|----------|-----------|-------------|-----|-------------|------------|
| Module Federation | Medium | Yes | No | Good | High |
| iframes | High | No | Poor | Poor | Low |
| Web Components | High | No | No | Good | Medium |
| single-spa | Medium | Yes | No | Good | High |
| Podium (SSI) | High | N/A | Yes | Excellent | Medium |
| Piral | Medium | Yes | No | Good | Medium |

### iframes

```html
<!-- Simplest isolation but poor UX -->
<iframe
  src="https://products.example.com"
  title="Products"
  width="100%"
  height="600"
  sandbox="allow-scripts allow-same-origin"
></iframe>
```

**Drawbacks**: No shared context, poor accessibility, SEO issues, slow communication via postMessage.

### Web Components

```typescript
// Micro-app exposes as custom element
class ProductsAppElement extends HTMLElement {
  connectedCallback() {
    // Bootstrap Angular app into custom element
    bootstrapApplication(ProductsRootComponent, {
      providers: [provideRouter([])],
    })
  }
}

customElements.define('products-app', ProductsAppElement)
```

**Limitations**: No Angular change detection across boundaries, complex state sharing.

### single-spa

```typescript
// single-spa registration
import { registerApplication, start } from 'single-spa'

registerApplication({
  name: 'products',
  app: () => import('products-app'),
  activeWhen: ['/products'],
  customProps: {
    authToken: getAuthToken(),
  },
})

start()
```

## Migration: From Monolith to Micro-Frontends

### Strangler Fig Pattern

```typescript
// Phase 1: Identify and extract bounded contexts
// Phase 2: Route new features to micro-apps
// Phase 3: Gradually migrate existing features
// Phase 4: Remove monolith

// Phase 2 — Route new features to micro-apps
export const routes: Routes = [
  {
    path: 'products', // New feature goes to micro-app
    loadChildren: () => loadRemoteModule({
      remoteName: 'productsApp',
      exposedModule: './routes',
    }).then(m => m.routes),
  },
  {
    path: 'products/legacy', // Old feature still in monolith
    loadChildren: () => import('./legacy/products.module').then(m => m.ProductsModule),
  },
]
```

### Phased Adoption

```
Phase 1 — Foundation (Weeks 1-4)
├── Set up module federation infrastructure
├── Create shared library (auth, event bus, models)
├── Extract shell application from monolith
└── Establish CI/CD pipelines

Phase 2 — First Micro-App (Weeks 5-8)
├── Identify lowest-risk feature for extraction
├── Extract feature into standalone micro-app
├── Configure routing and shared dependencies
├── Implement cross-app communication
└── Run monolith and micro-app in parallel

Phase 3 — Expansion (Weeks 9-16)
├── Extract additional features incrementally
├── Establish team ownership model
├── Implement contract testing
├── Set up monitoring and observability
└── Optimize performance

Phase 4 — Monolith Retirement (Weeks 17-20)
├── Verify all features are extracted
├── Decommission monolith
├── Clean up legacy code
└── Optimize shared dependencies
```

### Code Migration Strategy

```typescript
// Monolith service being extracted to shared library
// Step 1: Extract interface to shared-sdk
// libs/shared-sdk/src/lib/interfaces/product.interface.ts
export interface Product {
  id: string
  name: string
  price: number
}

// Step 2: Extract service to shared-sdk
// libs/shared-sdk/src/lib/services/product.service.ts
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products')
  }
}

// Step 3: Both monolith and micro-app consume shared-sdk
// Monolith still uses ProductService from shared-sdk
// New micro-app also uses ProductService from shared-sdk
// When migration is complete, old code is removed
```

## Code Examples

### Module Federation Configuration — Complete Shell

```javascript
// apps/shell/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')
const mf = require('@angular-architects/module-federation/webpack')
const path = require('path')
const share = mf.shareAll

module.exports = {
  output: {
    uniqueName: 'shell',
    publicPath: 'auto',
    scriptType: 'text/javascript',
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: {
      chunks: 'async',
      cacheGroups: {
        defaultVendors: {
          name: 'shell-vendors',
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          chunks: 'async',
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [
    new ModuleFederationPlugin({
      remotes: {
        productsApp: mf.lazyMf('productsApp', 'https://cdn.example.com/products/remoteEntry.js'),
        ordersApp: mf.lazyMf('ordersApp', 'https://cdn.example.com/orders/remoteEntry.js'),
        adminApp: mf.lazyMf('adminApp', 'https://cdn.example.com/admin/remoteEntry.js'),
      },
      shared: share({
        singleton: true,
        strictVersion: true,
        requiredVersion: 'auto',
        includeSecondaries: {
          skip: true,
        },
      }),
    }),
  ],
}
```

### Module Federation Configuration — Complete Micro-App

```javascript
// apps/products/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')
const mf = require('@angular-architects/module-federation/webpack')
const share = mf.shareAll

module.exports = {
  output: {
    uniqueName: 'productsApp',
    publicPath: 'auto',
    scriptType: 'text/javascript',
  },
  optimization: {
    runtimeChunk: false,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'productsApp',
      filename: 'remoteEntry.js',
      exposes: {
        './routes': './src/app/products/products.routes.ts',
        './ProductListComponent': './src/app/products/pages/product-list/product-list.component.ts',
        './ProductCardComponent': './src/app/products/components/product-card/product-card.component.ts',
      },
      shared: share({
        singleton: true,
        strictVersion: true,
        requiredVersion: 'auto',
        includeSecondaries: {
          skip: true,
        },
      }),
    }),
  ],
}
```

### Shell Setup — Complete

```typescript
// apps/shell/src/main.ts
import { initFederation } from '@angular-architects/native-federation'

initFederation('federation.manifest.json')
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err))

// apps/shell/src/bootstrap.ts
import { bootstrapApplication } from '@angular/platform-browser'
import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err))
```

```typescript
// apps/shell/src/app/app.config.ts
import { ApplicationConfig } from '@angular/core'
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideAnimations } from '@angular/platform-browser/animations'
import { provideStore } from '@ngrx/store'
import { provideStoreDevtools } from '@ngrx/store-devtools'
import { isDevMode } from '@angular/core'
import { routes } from './app.routes'
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor'
import { mfeErrorInterceptor } from './core/interceptors/mfe-error.interceptor'
import { MfeErrorHandler } from './error-boundary/mfe-error-handler'
import { ErrorHandler } from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({
        paramsInheritanceStrategy: 'always',
        onSameUrlNavigation: 'reload',
      }),
    ),
    provideHttpClient(
      withInterceptors([authTokenInterceptor, mfeErrorInterceptor]),
    ),
    provideAnimations(),
    provideStore(),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),
    { provide: ErrorHandler, useClass: MfeErrorHandler },
  ],
}
```

### Micro-App Setup — Complete

```typescript
// apps/products/src/main.ts
// Standalone bootstrap for local development
import { bootstrapApplication } from '@angular/platform-browser'
import { provideRouter } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { ProductsRootComponent } from './app/products-root.component'
import { routes } from './app/products/products.routes'

bootstrapApplication(ProductsRootComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ],
}).catch(err => console.error(err))
```

```typescript
// apps/products/src/app/products-root.component.ts
@Component({
  standalone: true,
  imports: [RouterOutlet],
  selector: 'app-products-root',
  template: `<router-outlet />`,
})
export class ProductsRootComponent {
  // Initialize micro-app specific services
  private storeService = inject(ProductsStoreService)
  private eventBus = inject(AppEventBus)
  private logging = inject(CentralizedLoggingService)

  constructor() {
    this.logging.log('info', 'products', 'Products app initialized')
    this.setupCrossAppListeners()
  }

  private setupCrossAppListeners(): void {
    this.eventBus.on('auth:logout').subscribe(() => {
      this.handleLogout()
    })
  }

  private handleLogout(): void {
    this.logging.log('info', 'products', 'User logged out, clearing local state')
    this.storeService.clear()
  }
}
```

### Communication Patterns — Complete

```typescript
// Shell emits events
// shell/src/app/services/global-events.service.ts
@Injectable({ providedIn: 'root' })
export class GlobalEventsService {
  private bus = inject(AppEventBus)

  notifyNavigation(from: string, to: string): void {
    this.bus.emit('navigation:changed', { from, to })
  }

  notifyFeatureToggle(feature: string, enabled: boolean): void {
    this.bus.emit('features:toggle', { feature, enabled })
  }
}

// Micro-app listens
// products-app/src/app/listeners/global-event-listener.ts
@Injectable({ providedIn: 'root' })
export class GlobalEventListener {
  private bus = inject(AppEventBus)
  private featureFlags = inject(FeatureFlagService)

  constructor() {
    this.bus.on<{ feature: string; enabled: boolean }>('features:toggle')
      .subscribe(({ feature, enabled }) => {
        this.featureFlags.setFeature(feature, enabled)
      })
  }
}
```

## Key Points

- Module Federation (Webpack 5) and Native Federation (esbuild) enable dynamic loading of independently deployed Angular applications
- The shell application owns routing, layout, authentication, and cross-app communication
- Each micro-app is independently built, tested, and deployed with its own CI/CD pipeline
- Angular core libraries (@angular/core, @angular/common, @angular/router, rxjs) must be configured as singletons
- Use CSS custom properties for cross-app theming and ViewEncapsulation.Emulated for style isolation
- Cross-app communication via custom events, shared NgRx store, URL params, or event bus
- Implement error boundaries and circuit breakers to isolate failures per micro-app
- Contract testing ensures shell and micro-apps agree on API shapes and event payloads
- Start migration with the strangler fig pattern, extracting one feature at a time
- Use CDN with immutable versioned assets and cache-busting via manifest files
- Monitor FCP, LCP, TTI per micro-app to track shell overhead
- Distributed tracing and centralized logging are essential for debugging cross-app issues
- Content Security Policy headers prevent XSS across micro-app boundaries
- Single-spa, iframes, and Web Components are alternatives with different isolation/complexity trade-offs
- The strangler fig pattern enables gradual migration from monolith to micro-frontends
