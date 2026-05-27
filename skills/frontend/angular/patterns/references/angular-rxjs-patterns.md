# Angular RxJS Patterns

## State Management with RxJS

```typescript
@Injectable({ providedIn: 'root' })
export class Store<T extends Record<string, unknown>> {
  private state = new BehaviorSubject<Partial<T>>({})

  select<K extends keyof T>(key: K): Observable<T[K]> {
    return this.state.pipe(
      map(s => s[key]),
      distinctUntilChanged(),
    )
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.state.next({ ...this.state.value, [key]: value })
  }

  update<K extends keyof T>(key: K, updater: (prev: T[K]) => T[K]): void {
    const current = this.state.value[key]
    this.state.next({ ...this.state.value, [key]: updater(current) })
  }

  snapshot(): Partial<T> {
    return this.state.value
  }
}
```

## Operator Patterns

```typescript
@Injectable({ providedIn: 'root' })
export class UserEffects {
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadUsers),
      switchMap(() =>
        this.userService.getUsers().pipe(
          map(users => UserActions.loadUsersSuccess({ users })),
          catchError(error => of(UserActions.loadUsersFailure({ error }))),
        ),
      ),
    ),
  )

  searchUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.searchUsers),
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev.query === curr.query),
      switchMap(({ query }) =>
        this.userService.searchUsers(query).pipe(
          map(users => UserActions.searchUsersSuccess({ users })),
          catchError(error => of(UserActions.searchUsersFailure({ error }))),
        ),
      ),
    ),
  )
}
```

## Error Handling

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error.message)
      return of(result as T)
    }
  }
}

@Component({ template: '...' })
export class UserComponent {
  users$ = this.userService.getUsers().pipe(
    catchError(err => {
      this.notificationService.showError('Failed to load users')
      return of([])
    }),
    finalize(() => this.loading = false),
    shareReplay(1),
  )
}
```

## Caching Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, { data: unknown; expiry: number }>()

  get<T>(key: string): Observable<T> {
    const cached = this.cache.get(key)
    if (cached && cached.expiry > Date.now()) {
      return of(cached.data as T)
    }
    return throwError(() => new Error('Cache miss'))
  }

  set<T>(key: string, data: T, ttlMs = 300000): void {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs })
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}
```

## Polling Pattern

```typescript
@Component({
  template: 'Status: {{ status$ | async }}',
})
export class StatusComponent implements OnInit {
  status$ = interval(5000).pipe(
    startWith(0),
    switchMap(() => this.statusService.getStatus()),
    retry(3),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  private destroy$ = new Subject<void>()

  ngOnInit() {
    this.status$.pipe(takeUntil(this.destroy$)).subscribe()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
```

## Key Points

- Use BehaviorSubject for state with current value access
- Implement switchMap for type-ahead search patterns
- Use debounceTime and distinctUntilChanged for search inputs
- Handle errors with catchError and provide fallback values
- Use shareReplay for caching observable results
- Implement takeUntil pattern for automatic unsubscription
- Use combineLatest for combining multiple streams
- Use forkJoin for parallel independent requests
- Use mergeMap for concurrent operations without ordering
- Use concatMap for sequential ordered operations
- Use exhaustMap for ignoring events during processing
- Clean up subscriptions in ngOnDestroy
