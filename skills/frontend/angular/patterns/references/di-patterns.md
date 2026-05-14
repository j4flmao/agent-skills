# Angular DI Patterns

## Injection Tokens
```typescript
// API base URL configuration
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL')

// Provider
providers: [{ provide: API_BASE_URL, useValue: 'https://api.example.com' }]

// Consumer
export class OrderService {
  private apiBase = inject(API_BASE_URL)
}
```

## Multi Providers
```typescript
export const HTTP_INTERCEPTORS = new InjectionToken<HttpInterceptor[]>('HTTP_INTERCEPTORS')

// Register multiple interceptors
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: LoggingInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
]
```

## Tree-Shakeable Services
```typescript
@Injectable({ providedIn: 'root' })
export class OrderService { ... }
```

## Factory Providers
```typescript
providers: [
  {
    provide: LoggerService,
    useFactory: (config: ConfigService) => {
      return config.production ? new ProductionLogger() : new DebugLogger()
    },
    deps: [ConfigService],
  },
]
```

## Component-Level Providers
```typescript
@Component({
  selector: 'app-order-form',
  standalone: true,
  providers: [FormBuilder],  // Scoped to this component tree
  template: `...`,
})
export class OrderFormComponent { ... }
```
