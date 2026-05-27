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

## Workflow

### Step 1: HTTP Interceptor
```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService)

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.token()
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    }
    return next.handle(req)
  }
}

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(`HTTP error ${error.status}: ${error.message}`)
        return throwError(() => error)
      })
    )
  }
}

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
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

// Route config
export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [authGuard],
    canMatch: [roleGuard('admin')],
    loadChildren: () => import('./features/admin/admin.routes'),
  },
]
```

### Step 3: Signals vs RxJS Decision
| Use Signals When | Use RxJS When |
|-----------------|---------------|
| Component-local state | HTTP requests |
| UI state (loading, error, selected) | WebSocket streams |
| Derived values (computed) | Debounced input |
| Simple state that one component owns | Complex async compositions |
| Counter, toggle, form field value | Multi-source event merging |

```typescript
@Component({...})
export class UserSearchComponent {
  readonly searchControl = new FormControl('')

  // RxJS for async streams (debounced HTTP search)
  readonly searchResults$ = this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((term): term is string => term.length >= 2),
    switchMap(term => this.userService.search(term)),
    catchError(() => of([])),
    takeUntilDestroyed(),
  )

  // Signals for sync state
  readonly selectedUser = signal<User | null>(null)

  selectUser(user: User) {
    this.selectedUser.set(user)
  }
}
```

### Step 4: NgRx vs Signal Store Decision
| NgRx When | Signal Store When |
|-----------|-------------------|
| Large application, many state interactions | Small to medium app |
| Complex side effect orchestration | Simple async operations |
| Team knows NgRx | Team is new to the project |
| Need Redux DevTools and time-travel debugging | State is straightforward |

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

## Rules
- Signals for synchronous state. RxJS for asynchronous streams (HTTP, events, WebSocket).
- Interceptors handle cross-cutting concerns only. No business logic in interceptors.
- takeUntilDestroyed() for automatic subscription cleanup. No manual unsubscribe in components.
- Signal Store over NgRx for most applications. NgRx is overkill for common CRUD apps.
- Custom directives encapsulate reusable DOM behavior that repeats across components.
- Pipes are pure and side-effect-free. Same input always produces the same output.

## References
  - references/angular-design-patterns.md — Angular Design Patterns
  - references/angular-performance.md — Angular Performance Patterns
  - references/angular-rxjs-patterns.md — Angular RxJS Patterns
  - references/angular-testing.md — Angular Testing Patterns
  - references/di-patterns.md — Angular DI Patterns
  - references/rxjs-patterns.md — Angular RxJS Patterns
## Handoff
No artifact produced.
Next skill: frontend-testing — test Angular components.
Carry forward: interceptor setup, store pattern choice (Signal Store/NgRx), RxJS conventions.
