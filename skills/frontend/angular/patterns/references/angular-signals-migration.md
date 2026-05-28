# Angular Signals Migration Guide

## Overview

Angular Signals (introduced in Angular 16, stable in Angular 17+) provide a new reactive primitive for managing state. Unlike RxJS Observables, Signals are synchronous, have no subscription overhead, and integrate directly with Angular's change detection. This guide covers migrating from RxJS-based state management to Signals, including Zone.js removal, OnPush change detection with signals, and full migration strategies.

## Why Signals?

### Problems with RxJS + Zone.js

| Issue | RxJS + Zone.js | Signals |
|-------|----------------|---------|
| Change detection | Zone.js patches all async APIs | Explicit signal notification |
| Subscription cleanup | Manual (takeUntilDestroyed, async pipe) | Automatic (signal is owned by injector) |
| Debugging | Async stacks are hard to trace | Synchronous, predictable |
| Bundle size | ~5KB for Zone.js | 0KB (built-in) |
| Performance | Coarse-grained (checks entire tree) | Fine-grained (only affected components) |
| TypeScript | Complex generics | Simple type inference |

### When to Use Signals vs RxJS

| Use Signals | Use RxJS |
|-------------|----------|
| Component-local state (toggles, selections) | HTTP requests |
| Derived values (computed from other state) | WebSocket streams |
| UI state (loading, error, expanded) | Debounced input |
| Shared state in services | Complex async compositions |
| Form field values | Multi-source event merging |

## Migration Prerequisites

### Angular Version Check

```bash
ng version
# Must be Angular 17+ for stable Signals
# Angular 16 has Signals in developer preview
```

### Zone.js Check

```json
// angular.json — check if Zone.js is enabled
{
  "polyfills": [
    "zone.js"  // Can be removed when fully migrated
  ]
}
```

### Enable Zoneless

```ts
// app.config.ts
import { provideExperimentalZonelessChangeDetection } from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
  ],
}
```

## Signal Basics

### signal()

```typescript
import { signal, computed } from '@angular/core'

// Create
const count = signal(0)
const user = signal<User | null>(null)
const items = signal<string[]>([])

// Read
console.log(count())      // 0
console.log(user())       // null

// Write
count.set(5)
count.update(prev => prev + 1)

// Mutate (for objects/arrays)
items.update(prev => [...prev, 'new item'])
```

### computed()

```typescript
const firstName = signal('John')
const lastName = signal('Doe')

const fullName = computed(() => `${firstName()} ${lastName()}`)
const characterCount = computed(() => fullName().length)

console.log(fullName()) // "John Doe"
console.log(characterCount()) // 8

firstName.set('Jane')
// fullName and characterCount automatically update
console.log(fullName()) // "Jane Doe"
```

### effect()

```typescript
import { effect } from '@angular/core'

const count = signal(0)

effect(() => {
  console.log(`Count changed to: ${count()}`)
})

count.set(1)
// Log: "Count changed to: 1"
```

Effects:
- Run after change detection
- Track dependencies automatically
- Cleanup via DestroyRef or manual stop
- Should not mutate signals (causes infinite loops)

## Migration Patterns

### Pattern 1: Component State

**Before (RxJS):**
```typescript
@Component({...})
export class CounterComponent {
  private readonly destroyRef = inject(DestroyRef)

  readonly count = new BehaviorSubject<number>(0)
  readonly count$ = this.count.asObservable()
  readonly doubled$ = this.count.pipe(
    map(n => n * 2)
  )

  increment() {
    this.count.next(this.count.value + 1)
  }
}
```

```html
<p>Count: {{ count$ | async }}</p>
<p>Doubled: {{ doubled$ | async }}</p>
<button (click)="increment()">+1</button>
```

**After (Signals):**
```typescript
@Component({
  ...,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  readonly count = signal(0)
  readonly doubled = computed(() => this.count() * 2)

  increment() {
    this.count.update(c => c + 1)
  }
}
```

```html
<p>Count: {{ count() }}</p>
<p>Doubled: {{ doubled() }}</p>
<button (click)="increment()">+1</button>
```

### Pattern 2: Service State

**Before (RxJS Subject):**
```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userSubject = new BehaviorSubject<User | null>(null)
  readonly user$ = this.userSubject.asObservable()
  readonly isLoggedIn$ = this.user$.pipe(map(u => u !== null))

  setUser(user: User | null) {
    this.userSubject.next(user)
  }
}
```

**After (Signal):**
```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  readonly user = signal<User | null>(null)
  readonly isLoggedIn = computed(() => this.user() !== null)

  setUser(user: User | null) {
    this.user.set(user)
  }
}
```

### Pattern 3: HTTP with RxJS -> Signal

**Before:**
```typescript
@Component({...})
export class UserListComponent {
  private readonly userService = inject(UserService)
  readonly users$ = this.userService.getAll().pipe(
    catchError(() => of([])),
    shareReplay(1),
  )
}
```

**After (toSignal):**
```typescript
import { toSignal } from '@angular/core/rxjs-interop'

@Component({...})
export class UserListComponent {
  private readonly userService = inject(UserService)

  readonly users = toSignal(this.userService.getAll(), {
    initialValue: [],
  })

  // Or with loading state
  readonly usersResource = toSignal(
    this.userService.getAll().pipe(
      map(data => ({ data, loading: false })),
      startWith({ data: [], loading: true }),
    ),
  )
}
```

### Pattern 4: Form Control with Signals

**Before:**
```typescript
@Component({...})
export class SearchComponent {
  readonly searchControl = new FormControl('')

  readonly results$ = this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((term): term is string => term.length >= 2),
    switchMap(term => this.searchService.search(term)),
  )
}
```

**After:**
```typescript
@Component({...})
export class SearchComponent {
  private readonly destroyRef = inject(DestroyRef)

  readonly searchControl = new FormControl('')
  readonly query = signal('')

  constructor() {
    // Bridge RxJS form control to signal
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(value => this.query.set(value))

    // Or use effect to react to query changes
    effect(() => {
      const q = this.query()
      if (q.length >= 2) {
        this.loadResults(q)
      }
    })
  }
}
```

### Pattern 5: Observable to Signal (toSignal)

```typescript
import { toSignal } from '@angular/core/rxjs-interop'

@Component({...})
export class DashboardComponent {
  private readonly http = inject(HttpClient)

  // Convert observable to signal with initial value
  readonly data = toSignal(
    this.http.get<Data[]>('/api/data'),
    { initialValue: [] }
  )

  // Without initial value (starts as undefined)
  readonly user = toSignal(
    this.http.get<User>('/api/user/me')
  )

  // With error handling
  readonly products = toSignal(
    this.http.get<Product[]>('/api/products').pipe(
      catchError(() => of([] as Product[])),
    ),
    { initialValue: [] }
  )
}
```

### Pattern 6: Signal to Observable (toObservable)

```typescript
import { toObservable } from '@angular/core/rxjs-interop'

@Component({...})
export class SearchComponent {
  readonly query = signal('')

  // Convert signal to observable for RxJS interop
  readonly debouncedQuery$ = toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
  )

  constructor() {
    this.debouncedQuery$.subscribe(query => {
      // React to debounced query changes
    })
  }
}
```

## State Management Migration

### Before: NgRx Store

```typescript
// NgRx
interface AppState {
  users: User[]
  loading: boolean
  error: string | null
}

// Actions
const loadUsers = createAction('[Users] Load')
const loadUsersSuccess = createAction('[Users] Load Success', props<{ users: User[] }>())

// Reducer
const userReducer = createReducer(
  initialState,
  on(loadUsers, state => ({ ...state, loading: true })),
  on(loadUsersSuccess, (state, { users }) => ({ ...state, users, loading: false })),
)

// Effect
@Injectable()
export class UserEffects {
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),
      switchMap(() => this.userService.getAll().pipe(
        map(users => loadUsersSuccess({ users })),
        catchError(() => of(loadUsersFailure({ error: 'Failed' }))),
      ))
    )
  )
}
```

### After: Signal Store

```typescript
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals'

export const UserStore = signalStore(
  { providedIn: 'root' },

  // State
  withState({
    users: [] as User[],
    loading: false,
    error: null as string | null,
    selectedUserId: null as string | null,
  }),

  // Computed
  withComputed(({ users, selectedUserId }) => ({
    selectedUser: computed(() =>
      users().find(u => u.id === selectedUserId()) ?? null
    ),
    userCount: computed(() => users().length),
    hasUsers: computed(() => users().length > 0),
  })),

  // Methods
  withMethods((store) => ({
    async loadUsers() {
      store.loading.set(true)
      store.error.set(null)
      try {
        const users = await inject(UserService).getAll()
        store.users.set(users)
      } catch (err) {
        store.error.set('Failed to load users')
      } finally {
        store.loading.set(false)
      }
    },

    selectUser(id: string) {
      store.selectedUserId.set(id)
    },
  })),
)
```

## Change Detection Migration

### Before: Default + Zone.js

```typescript
@Component({
  selector: 'app-user',
  template: `...`,
})
export class UserComponent {
  // Zone.js patches all async operations
  // Change detection runs for any async activity
}
```

### After: OnPush + Signals

```typescript
@Component({
  selector: 'app-user',
  template: `...`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserComponent {
  readonly user = signal<User | null>(null)
  readonly loading = signal(false)

  async loadUser(id: string) {
    this.loading.set(true)
    try {
      const user = await this.userService.getById(id)
      this.user.set(user)
    } finally {
      this.loading.set(false)
    }
  }
}
```

### After: Zoneless

```typescript
// app.config.ts
import { provideExperimentalZonelessChangeDetection } from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    // Remove: provideZoneChangeDetection()
  ],
}
```

```typescript
// With zoneless, change detection only runs when:
// 1. A signal value changes (signal.set, signal.update)
// 2. An async pipe receives a new value
// 3. ChangeDetectorRef.markForCheck() is called
// 4. A DOM event fires in the component
```

## Migration Steps for Large Apps

### Phase 1: Audit and Plan

```bash
# Find all BehaviorSubject usages
rg "new BehaviorSubject" src/app/ --count

# Find all async pipes
rg "async" src/app/ --include="*.html" --count

# Find all Zone.js-dependent patterns
rg "NgZone" src/app/ --count
```

### Phase 2: Add Signal Store

```bash
npm install @ngrx/signals
```

Create signal stores alongside existing NgRx:

```typescript
// New feature development uses Signal Store
@Injectable({ providedIn: 'root' })
export class NewFeatureStore extends signalStore(
  withState({ /* ... */ }),
  withMethods({ /* ... */ }),
) {}
```

### Phase 3: Migrate Components

```typescript
// Step 1: Add OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})

// Step 2: Replace BehaviorSubject with signal
// Before
private readonly state = new BehaviorSubject<State>(initial)

// After
readonly state = signal<State>(initial)

// Step 3: Replace pipe + map with computed
// Before
readonly derived$ = this.state.pipe(map(s => s.value * 2))

// After
readonly derived = computed(() => this.state().value * 2)

// Step 4: Remove async pipes
// Before: {{ state$ | async }}
// After: {{ state() }}
```

### Phase 4: Enable Zoneless

```typescript
// 1. Add to app.config
provideExperimentalZonelessChangeDetection()

// 2. Remove zone.js from polyfills
// angular.json: remove "zone.js" from polyfills

// 3. Build and test
// Zoneless change detection must work without Zone.js
```

### Phase 5: Remove NgRx (Optional)

```typescript
// Replace NgRx store with Signal Store
// Replace NgRx effects with async methods in signal stores
// Remove @ngrx/store, @ngrx/effects from package.json
```

## Common Migration Issues

### Issue 1: Signals in Templates

```typescript
// Correct — call signal as function
// {{ count() }}

// Wrong — signal without parens
// {{ count }}
```

### Issue 2: Two-Way Binding

```typescript
@Component({...})
export class MyComponent {
  // Signal with model() for two-way binding (Angular 17.2+)
  readonly value = model('')
}
```

```html
<!-- Parent can use [(value)]="..." -->
<my-component [(value)]="parentValue" />
```

### Issue 3: @Input with Signals

```typescript
@Component({...})
export class ChildComponent {
  // Before: @Input() value: string
  // After: Signal input (Angular 17.1+)
  readonly value = input<string>('default')
  readonly valueWithTransform = input('', {
    transform: (v: string) => v.toUpperCase(),
  })

  // Computed from input
  readonly doubled = computed(() => this.value().length * 2)
}
```

### Issue 4: @Output with Signals

```typescript
@Component({...})
export class ChildComponent {
  readonly clicked = output<void>()
  readonly itemSelected = output<Item>()

  selectItem(item: Item) {
    this.itemSelected.emit(item)
  }
}
```

## Migration Priority

| Component Type | Migration Priority | Difficulty |
|----------------|-------------------|------------|
| Presentational components | High | Easy |
| Container components | High | Medium |
| Shared services | Medium | Medium |
| Feature stores | Medium | Hard |
| Complex effects | Low | Hard |
| Third-party libs | Low | N/A |

## Testing Signals

```typescript
import { signal, computed, effect } from '@angular/core'

describe('Signals', () => {
  it('should compute derived values', () => {
    const count = signal(0)
    const doubled = computed(() => count() * 2)

    expect(doubled()).toBe(0)

    count.set(5)
    expect(doubled()).toBe(10)
  })

  it('should trigger effects', () => {
    const spy = jasmine.createSpy()
    const count = signal(0)

    effect(() => {
      spy(count())
    })

    // Effects run in test without zone
    count.set(1)
    expect(spy).toHaveBeenCalledWith(0)
    expect(spy).toHaveBeenCalledWith(1)
  })
})
```

## Performance Benchmarks

| Scenario | RxJS + Zone.js | Signals | Improvement |
|----------|----------------|---------|-------------|
| Component create | ~50 microsec | ~20 microsec | 2.5x |
| State update | ~100 microsec (with CD) | ~5 microsec | 20x |
| List re-render 100 items | ~5ms | ~1ms | 5x |
| Subscriptions cleanup | Manual, error-prone | Automatic | Reliability |
| Bundle size | ~15KB (Zone + RxJS) | ~5KB (RxJS only) | 3x |

## Summary

| Migration Step | What to Do |
|----------------|------------|
| 1. Upgrade | Angular 17+ |
| 2. Add signals | signal(), computed(), effect() |
| 3. Convert services | BehaviorSubject -> signal |
| 4. Convert components | @Input/Output to input()/output() |
| 5. Convert stores | NgRx -> @ngrx/signals |
| 6. OnPush | Add ChangeDetectionStrategy.OnPush |
| 7. Zoneless | provideExperimentalZonelessChangeDetection |
| 8. Remove NgRx | Optional cleanup |
