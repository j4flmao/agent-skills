# Angular RxJS Patterns

## Signals for Sync State, RxJS for Async Streams

### Do NOT
```typescript
// Using RxJS for synchronous state is overkill
const count$ = new BehaviorSubject(0)
count$.pipe(map(v => v * 2)).subscribe()
```

### DO
```typescript
// Signal for sync state
const count = signal(0)
const doubled = computed(() => count() * 2)

// RxJS for async streams
const orders$ = this.http.get<Order[]>('/api/orders').pipe(
  catchError(err => {
    this.error.set(err.message)
    return of([])
  }),
)
```

## HttpClient Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient)

  getOrders(userId: string): Observable<Order[]> {
    return this.http.get<Order[]>(`/api/orders`, { params: { userId } }).pipe(
      retry(2),
      catchError(err => {
        console.error('Failed to load orders', err)
        return throwError(() => new Error('Failed to load orders'))
      }),
    )
  }
}
```

## Interceptor Pattern
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService)
  const token = auth.token()
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
  }
  return next(req)
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) { /* redirect to login */ }
      if (err.status === 500) { /* show error toast */ }
      return throwError(() => err)
    }),
  )
}
```

## RxJS Operators by Use Case
| Use Case | Operator |
|----------|----------|
| Debounce input | `debounceTime(300)` |
| Distinct values | `distinctUntilChanged()` |
| Combine streams | `combineLatest()` |
| Switch on new value | `switchMap()` |
| Cache result | `shareReplay(1)` |
| Error handling | `catchError()` |
| Retry on failure | `retry(3)` |
| Take first value | `first()` |
