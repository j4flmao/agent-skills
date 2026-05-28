---
name: angular-patterns
description: >
  Use this skill when the user says 'Angular DI', 'Angular service', 'Angular interceptor', 'Angular guard', 'Angular RxJS', 'NgRx', 'Angular store', 'Angular resolver', 'Angular pipe', 'Angular directive', 'Observable vs Signal', or when implementing Angular-specific patterns. This skill enforces: HTTP interceptors for cross-cutting concerns, route guards for auth, Signals for sync state vs RxJS for async streams, Signal Store over NgRx for most apps, custom directives for reusable DOM behavior, and pure pipes for transformations. Requires Angular 17+. Do NOT use for: Angular project structure, standalone component setup, or non-Angular patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, angular, phase-3]
---

# Angular Patterns

## Purpose
Implement Angular-specific patterns: HTTP interceptors for cross-cutting, guards for navigation control, Signals for sync state, RxJS for async streams, Signal Store over NgRx unless complexity demands it.

## Agent Protocol

### Trigger
Exact user phrases: "Angular DI", "Angular service", "Angular interceptor", "Angular guard", "Angular RxJS", "NgRx", "Angular store", "Angular resolver", "Angular pipe", "Angular directive", "Observable vs Signal".

### Input Context
Before activating, verify:
- angular.json exists (Angular 17+).
- The pattern being implemented is known (interceptor, guard, store, etc.).

### Output Artifact
No file output. Produces code examples as text.

### Response Format
```
Pattern: {name}
Purpose: {one sentence}
Code: {implementation}
Registration: {where to provide/register}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Interceptors handle cross-cutting concerns only (auth headers, error handling, logging).
- [ ] Guards decide navigation access (no side effects).
- [ ] Signals used for component state, RxJS used for async streams.
- [ ] Signal Store chosen over NgRx for most applications.
- [ ] Custom directives and pipes are pure, side-effect-free.
- [ ] inject() used for DI everywhere.

### Max Response Length
Per pattern: 20 lines.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Standalone components (default since v17) | No NgModules, simpler | New projects, new features |
| NgModules-based | Legacy, shared declarations | Existing Angular <17 projects |
| Signal Store (manual or @ngrx/signals) | Lighter than NgRx | Small-medium apps, CRUD |
| NgRx (Store + Effects + Entity) | Full Redux pattern | Large apps, complex side effects |
| Component Store (@ngrx/component-store) | Local state management | Feature-scoped state |
| Presentational + Container Components | Separates logic from UI | Complex feature components |

### Decision Tree: State Management

```
How complex is the state?
  ├── Simple (component-local) -> signal() or BehaviorSubject
  ├── Medium (feature-scoped) -> Signal Store or Component Store
  └── Complex (cross-feature, many side effects) -> NgRx
```

```
Does async data control the flow?
  ├── Yes (HTTP, WebSocket, events) -> RxJS Observables
  ├── No (UI state, toggles, selections) -> Signals
  └── Both -> RxJS for streams, Signals for sync state
```

### Decision Tree: Dependency Injection

```
Is this a reusable service with multiple implementations?
  ├── Yes -> Provide with useClass, useExisting, or useFactory
  ├── Yes -> Inject with InjectionToken and @Optional()
  └── No -> providedIn: 'root' singleton
```

## Common Pitfalls

### Pitfall 1: Manual Subscription Management
```typescript
// Wrong — manual subscribe, easy to forget unsubscribe
this.route.params.subscribe(params => this.id = params['id'])

// Correct — automatic cleanup
this.route.params.pipe(takeUntilDestroyed()).subscribe(params => this.id = params['id'])
```
Always use `takeUntilDestroyed()` (Angular 16+) or the async pipe. Never manually manage subscriptions in components.

### Pitfall 2: Business Logic in Interceptors
Interceptors should handle cross-cutting concerns only:
- Adding auth headers
- Logging errors
- Timing requests
Do NOT put business logic (redirect logic based on response data, data transformation) in interceptors.

### Pitfall 3: Side Effects in Guards
Guards should only decide navigation access. They should not dispatch analytics events, modify state, or call mutation endpoints.

### Pitfall 4: Using NgRx for Everything
NgRx adds significant boilerplate. For most CRUD apps, a Signal Store or Component Store is sufficient. Reserve NgRx for complex state interactions, multi-source event merging, or when Redux DevTools time-travel debugging is needed.

### Pitfall 5: Mixing Signals and RxJS Incorrectly
```typescript
// Wrong — converting signal to observable unnecessarily
const count$ = toObservable(this.count)

// Correct — use signal directly in template
// {{ count() }}
```
Use Signals in templates and `computed()` for sync derivations. Only use `toObservable()` when integrating with RxJS operators or libraries that expect observables.

## Compared With

### Angular vs React
| Aspect | Angular | React |
|--------|---------|-------|
| Architecture | Full framework (DI, router, HTTP, forms) | Library (ecosystem via external packages) |
| Reactivity | Signals + RxJS | Hooks + state management |
| DI | Built-in, hierarchical | Manual via context or props |
| TypeScript | First-class, required | Optional via types |
| Bundle size | Larger (~65KB base) | Smaller (~45KB with react-dom) |
| Learning curve | Steeper (many concepts) | Moderate (few concepts, many choices) |
| Performance | Default OnPush + signals | Manual memoization |

### Angular vs Vue
Both are full frameworks, but Angular uses TypeScript natively and RxJS for async, while Vue uses a simpler reactivity model with ref() and reactive(). Vue is easier to learn but Angular scales better for enterprise teams.

### Angular vs Svelte
Svelte compiles away the framework, producing tiny bundles. Angular has a larger runtime but offers more built-in features (DI, routing, forms, HTTP client). Svelte suits smaller teams; Angular suits large enterprise applications.

## Performance Considerations

### Change Detection Strategy
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```
OnPush + Signals is the most performant combination. `OnPush` skips change detection unless inputs change, events fire, or signals/observables notify. Combined with `signal()` for local state, this minimizes change detection cycles.

### Lazy Loading
```typescript
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes'),
  },
]
```
Lazy loading at feature level keeps initial bundle small. Each lazy-loaded feature is a separate chunk loaded on navigation.

### RxJS Subscription Management
Unnecessary subscriptions waste memory. Use `takeUntilDestroyed()` (Angular 16+), `async` pipe, or `first()` for one-shot operations.

### Signal Performance
Signals are lightweight compared to RxJS Subjects:
- `signal()` and `computed()` have near-zero overhead
- No Subscription objects, no operators, no schedulers
- Direct integration with Angular's change detection (no zone.js needed with zoneless)

## Ecosystem & Tooling

### Core Packages
| Package | Purpose |
|---------|---------|
| @angular/core | Framework core (components, DI, signals) |
| @angular/router | Routing and navigation |
| @angular/forms | Template-driven and reactive forms |
| @angular/common/http | HTTP client with interceptors |
| @angular/ssr | Server-side rendering |

### State Management Libraries
| Package | Purpose |
|---------|---------|
| @ngrx/store | Redux-style state management |
| @ngrx/effects | Side effect management |
| @ngrx/component-store | Local/feature state management |
| @ngrx/signals | Signal-based state management |
| ngxtension | Utilities for Signals and RxJS interop |

### Tools
- **Angular CLI** — Project scaffolding, code generation (`ng generate`), builds.
- **Angular DevTools** — Browser extension for component tree, profiler, state inspection.
- **ESLint + @angular-eslint** — Linting with Angular-specific rules.
- **Jest + Angular Testing Library** — Modern testing setup.

### UI Libraries
- **Angular Material** — Official component library (Material Design).
- **PrimeNG** — Extensive component set.
- **Taiga UI** — Enterprise UI kit.
- **ng-zorro-antd** — Ant Design for Angular.

### Community
- Docs: angular.dev
- GitHub: github.com/angular/angular
- Discord: discord.gg/angular
- Newsletter: angular.dev/newsletter

## Workflow

### Step 1: HTTP Interceptor
```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService)

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.token()
    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    }
    return next.handle(req)
  }
}

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
}
```

### Step 2: Route Guards
```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService)
  const router = inject(Router)
  if (auth.isAuthenticated()) return true
  return router.parseUrl('/login')
}

export const roleGuard = (requiredRole: string): CanMatchFn => {
  return () => {
    const auth = inject(AuthService)
    return auth.hasRole(requiredRole)
  }
}
```

### Step 3: Signals vs RxJS Decision
```typescript
@Component({...})
export class UserSearchComponent {
  readonly searchControl = new FormControl('')

  readonly searchResults$ = this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((term): term is string => term.length >= 2),
    switchMap(term => this.userService.search(term)),
    catchError(() => of([])),
    takeUntilDestroyed(),
  )

  readonly selectedUser = signal<User | null>(null)

  selectUser(user: User) {
    this.selectedUser.set(user)
  }
}
```

### Step 4: NgRx vs Signal Store Decision
```typescript
// Signal Store (preferred for most cases)
@Injectable({ providedIn: 'root' })
export class UserStore {
  readonly users = signal<User[]>([])
  readonly isLoading = signal(false)
  readonly selectedId = signal<string | null>(null)

  readonly selectedUser = computed(() =>
    this.users().find(u => u.id === this.selectedId()) ?? null
  )

  async loadUsers() {
    this.isLoading.set(true)
    try {
      const users = await this.userService.getAll()
      this.users.set(users)
    } finally {
      this.isLoading.set(false)
    }
  }
}
```

### Step 5: Custom Directive
```typescript
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef)
  private readonly viewContainer = inject(ViewContainerRef)
  private readonly auth = inject(AuthService)

  @Input() set appHasPermission(permission: string) {
    if (this.auth.hasPermission(permission)) {
      this.viewContainer.createEmbeddedView(this.templateRef)
    } else {
      this.viewContainer.clear()
    }
  }
}
```

### Step 6: Custom Pipe
```typescript
@Pipe({
  name: 'truncate',
  standalone: true,
  pure: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, maxLength: number = 100, suffix: string = '...'): string {
    if (!value) return ''
    return value.length > maxLength ? value.slice(0, maxLength) + suffix : value
  }
}
```

### Step 7: Advanced DI Patterns
```typescript
// InjectionToken for configuration
export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG')

// useFactory for conditional providers
providers: [
  {
    provide: LoggerService,
    useFactory: () => environment.production
      ? new ProductionLoggerService()
      : new DebugLoggerService(),
  },
]
```

## Rules
- Signals for synchronous state. RxJS for asynchronous streams (HTTP, events, WebSocket).
- Interceptors handle cross-cutting concerns only. No business logic in interceptors.
- takeUntilDestroyed() for automatic subscription cleanup. No manual unsubscribe in components.
- Signal Store over NgRx for most applications. NgRx is overkill for common CRUD apps.
- Custom directives encapsulate reusable DOM behavior that repeats across components.
- Pipes are pure and side-effect-free. Same input always produces the same output.
- inject() over constructor DI for better readability and testability.
- OnPush change detection with signals for optimal performance.
- Lazy load feature routes for smaller initial bundles.
- Use Angular 17+ standalone components for all new code.

## References
- references/angular-design-patterns.md — Angular Design Patterns
- references/angular-performance.md — Angular Performance Patterns
- references/angular-rxjs-patterns.md — Angular RxJS Patterns
- references/angular-testing.md — Angular Testing Patterns
- references/di-patterns.md — Angular DI Patterns
- references/rxjs-patterns.md — Angular RxJS Patterns
- references/angular-signals-migration.md — Angular Signals Migration Guide
- references/angular-advanced-di.md — Angular Advanced Dependency Injection

## Handoff
No artifact produced.
Next skill: frontend-testing — test Angular components.
Carry forward: interceptor setup, store pattern choice (Signal Store/NgRx), RxJS conventions.
