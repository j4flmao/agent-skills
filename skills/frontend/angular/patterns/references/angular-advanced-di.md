# Angular Advanced Dependency Injection

## Introduction

Angular's Dependency Injection (DI) system is one of the most powerful features of the framework. Beyond basic `providedIn: 'root'` and constructor injection, Angular DI supports hierarchical injectors, custom providers, multi-providers, injection tokens, optional dependencies, and advanced factory patterns. This guide covers the full spectrum of Angular DI, from intermediate to advanced patterns.

## DI Architecture

### Injector Hierarchy

```
PlatformInjector (singleton for the platform)
  |
  RootInjector (providedIn: 'root', AppModule providers)
    |
    ModuleInjector (lazy-loaded NgModule providers)
      |
      ComponentInjector (component-level providers)
        |
        EmbeddedViewInjector (dynamic component hosts)
```

Each injector can override providers from its ancestors. A component requesting a service receives the nearest instance in the hierarchy.

### Resolution Rules

1. Check the component's own injector
2. Walk up the component tree (parent components)
3. Check the module injector
4. Check the root injector
5. If not found and @Optional, return null
6. If not found and not @Optional, throw NullInjectorError

## Provider Types

### useClass

```typescript
@Injectable()
export class LoggerService {
  log(message: string) {
    console.log(`[Default]: ${message}`)
  }
}

@Injectable()
export class VerboseLoggerService {
  log(message: string) {
    console.log(`[Verbose ${new Date().toISOString()}]: ${message}`)
  }
}

// Provide VerboseLoggerService whenever LoggerService is requested
providers: [
  { provide: LoggerService, useClass: VerboseLoggerService },
]
```

### useExisting

Creates an alias — both tokens resolve to the same instance:

```typescript
// Multiple tokens pointing to the same service
providers: [
  LoggerService,
  { provide: 'LOGGER', useExisting: LoggerService },
  { provide: LogInterface, useExisting: LoggerService },
]
```

### useFactory

```typescript
export const API_CONFIG = new InjectionToken<ApiConfig>('API Configuration')

providers: [
  {
    provide: API_CONFIG,
    useFactory: () => {
      return {
        baseUrl: environment.apiUrl,
        timeout: environment.production ? 10_000 : 30_000,
        retries: environment.production ? 3 : 0,
      }
    },
  },
  {
    provide: LoggerService,
    useFactory: (config: ApiConfig) => {
      if (config.timeout > 10_000) {
        return new VerboseLoggerService()
      }
      return new LoggerService()
    },
    deps: [API_CONFIG],
  },
]
```

### useValue

```typescript
export const APP_NAME = new InjectionToken<string>('App Name')
export const MAX_RETRIES = new InjectionToken<number>('Max Retries')

providers: [
  { provide: APP_NAME, useValue: 'My Angular App' },
  { provide: MAX_RETRIES, useValue: 3 },
  { provide: 'API_BASE_URL', useValue: environment.apiUrl },
]
```

## InjectionToken

### Creating Tokens

```typescript
import { InjectionToken } from '@angular/core'

// Simple token
export const APP_CONFIG = new InjectionToken<AppConfig>('app.config')

// Token with factory
export const WINDOW = new InjectionToken<Window>('Window', {
  factory: () => window,
})

// Token with providedIn
export const DATE_FORMAT = new InjectionToken<string>('date.format', {
  providedIn: 'root',
  factory: () => 'YYYY-MM-DD',
})
```

### Using Tokens

```typescript
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly config = inject(APP_CONFIG)
  private readonly window = inject(WINDOW)
  private readonly format = inject(DATE_FORMAT)
}
```

## Multi-Providers

### When to Use Multi-Providers

Multi-providers allow multiple implementations for the same token. They are collected into an array.

```typescript
// Define a multi-provider token
export const FEATURE_PROVIDER = new InjectionToken<FeatureProvider[]>('feature.provider')

// Multiple providers
providers: [
  { provide: FEATURE_PROVIDER, useClass: AuthFeatureProvider, multi: true },
  { provide: FEATURE_PROVIDER, useClass: DashboardFeatureProvider, multi: true },
  { provide: FEATURE_PROVIDER, useClass: SettingsFeatureProvider, multi: true },
]
```

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureService {
  private readonly providers = inject(FEATURE_PROVIDER)
  // providers is an array: [AuthFeatureProvider, DashboardFeatureProvider, SettingsFeatureProvider]

  initializeAll() {
    for (const provider of this.providers) {
      provider.initialize()
    }
  }
}
```

### Built-in Multi-Providers

```typescript
// HTTP_INTERCEPTORS
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: TimingInterceptor, multi: true },
]

// NG_VALIDATORS
providers: [
  { provide: NG_VALIDATORS, useExisting: CustomValidator, multi: true },
]

// NG_VALUE_ACCESSOR
providers: [
  { provide: NG_VALUE_ACCESSOR, useExisting: CustomInputComponent, multi: true },
]
```

## @Optional and @Self

### @Optional

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  // This dependency is optional
  private readonly analytics = inject(AnalyticsService, { optional: true })

  trackEvent(event: string) {
    this.analytics?.track(event)
  }
}
```

### @Self

Resolves only from the current injector, not parent injectors:

```typescript
@Component({
  providers: [LoggerService],
})
export class ChildComponent {
  // Only looks in this component's injector
  private readonly logger = inject(LoggerService, { self: true })
}
```

### @SkipSelf

Skips the current injector, resolves from parent:

```typescript
@Component({
  providers: [LoggerService],  // This component's own LoggerService
})
export class ChildComponent {
  // Skips this component, gets parent's LoggerService
  private readonly parentLogger = inject(LoggerService, { skipSelf: true })
}
```

### @Host

Resolves up to the host component (useful for directives):

```typescript
@Directive({
  selector: '[appHighlight]',
})
export class HighlightDirective {
  // Only looks in the host component's injector tree
  private readonly elementRef = inject(ElementRef, { host: true })
}
```

## ViewProviders vs Providers

```typescript
@Component({
  selector: 'app-parent',
  template: `<app-child />`,
  providers: [SharedService],         // Visible to the component and its content children
  viewProviders: [InternalService],   // Only visible to the component's view, not content children
})
export class ParentComponent {}
```

`viewProviders` are not visible to projected content:

```html
<app-parent>
  <!-- This component cannot inject InternalService -->
  <app-projected-content />
</app-parent>
```

## Platform Injection

### Platform-Level Providers

```typescript
import { createPlatform, platformBrowser } from '@angular/core'

// Custom platform with providers
const platform = platformBrowser([
  { provide: APP_BASE_HREF, useValue: '/my-app/' },
  { provide: 'PLATFORM_NAME', useValue: 'browser' },
])
```

## Tree-Shakable Providers

### providedIn

```typescript
@Injectable({
  providedIn: 'root',         // Singleton for the app
})
export class RootService {}

@Injectable({
  providedIn: 'platform',    // Singleton across multiple Angular apps
})
export class PlatformService {}

@Injectable({
  providedIn: 'any',         // Singleton per lazy-loaded module
})
export class AnyService {}
```

### providedIn with InjectionToken

```typescript
export const API_URL = new InjectionToken<string>('API URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
})
```

## Dynamic Providers

### Component-Level Providers

```typescript
@Component({
  selector: 'app-dynamic',
  providers: [
    {
      provide: LoggerService,
      useFactory: (config: ConfigService) => {
        return config.isVerbose()
          ? new VerboseLoggerService()
          : new LoggerService()
      },
      deps: [ConfigService],
    },
  ],
})
export class DynamicComponent {}
```

### Directive Providers

```typescript
@Directive({
  selector: '[appPermission]',
  providers: [
    {
      provide: PermissionService,
      useFactory: (auth: AuthService) => {
        return new PermissionService(auth.user())
      },
      deps: [AuthService],
    },
  ],
})
export class PermissionDirective {}
```

## Advanced Patterns

### Pattern 1: Configurable Services

```typescript
// lib/config.ts
export interface LibConfig {
  apiUrl: string
  timeout: number
  retries: number
}

export const LIB_CONFIG = new InjectionToken<LibConfig>('Lib Configuration')

export function provideLibConfig(config: Partial<LibConfig>): Provider[] {
  return [
    {
      provide: LIB_CONFIG,
      useFactory: (defaultConfig: LibConfig) => ({
        ...defaultConfig,
        ...config,
      }),
      deps: [{ provide: LibConfig, useExisting: LIB_CONFIG }],
    },
  ]
}

// app.config.ts
providers: [
  provideLibConfig({
    apiUrl: 'https://api.example.com',
    timeout: 5000,
  }),
]
```

### Pattern 2: Strategy Pattern with Multi-Providers

```typescript
export const PAYMENT_STRATEGY = new InjectionToken<PaymentStrategy>('Payment Strategy')

// Register strategies
providers: [
  { provide: PAYMENT_STRATEGY, useClass: CreditCardStrategy, multi: true },
  { provide: PAYMENT_STRATEGY, useClass: PayPalStrategy, multi: true },
  { provide: PAYMENT_STRATEGY, useClass: CryptoStrategy, multi: true },
]

// Use strategies
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly strategies = inject(PAYMENT_STRATEGY)

  processPayment(type: string, amount: number) {
    const strategy = this.strategies.find(s => s.type === type)
    if (!strategy) throw new Error(`No strategy for ${type}`)
    return strategy.pay(amount)
  }
}
```

### Pattern 3: Decorator Pattern

```typescript
@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  private readonly next = inject(HttpInterceptor, { skipSelf: true })

  intercept(req: HttpRequest<any>, handler: HttpHandler) {
    console.log(`Request: ${req.method} ${req.url}`)
    return this.next.intercept(req, handler).pipe(
      tap(response => console.log(`Response: ${response.status}`)),
    )
  }
}
```

### Pattern 4: Circular Dependency Breaking

```typescript
@Injectable({ providedIn: 'root' })
export class ServiceA {
  private readonly serviceB = inject(ServiceB, { optional: true })

  // Use injector for late resolution
  private readonly injector = inject(Injector)

  getB(): ServiceB {
    // Lazily resolve to break circular dependency
    if (!this.serviceB) {
      return this.injector.get(ServiceB)
    }
    return this.serviceB
  }
}
```

### Pattern 5: Conditional Provider Registration

```typescript
export function provideFeature(config: { enabled: boolean }): Provider[] {
  if (!config.enabled) return []

  return [
    FeatureService,
    { provide: FeatureFlag, useValue: true },
    { provide: FEATURE_PROVIDER, useClass: FeatureProvider, multi: true },
  ]
}

// Usage
@NgModule({
  providers: [
    ...provideFeature({ enabled: true }),
  ],
})
```

## Testing with DI

### Mocking Providers

```typescript
import { TestBed } from '@angular/core/testing'

describe('UserService', () => {
  let service: UserService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: API_URL, useValue: 'http://test-api.com' },
        { provide: LoggerService, useClass: MockLoggerService },
      ],
    })

    service = TestBed.inject(UserService)
    httpMock = TestBed.inject(HttpTestingController)
  })
})
```

### Testing with inject()

```typescript
it('should inject dependencies', () => {
  const config = TestBed.inject(APP_CONFIG)
  expect(config.apiUrl).toBe('http://test-api.com')
})
```

## DI Performance

### Provider Resolution Cost

| Resolution Depth | Time |
|------------------|------|
| Same injector | <1 microsecond |
| One level up | ~2 microseconds |
| Root injector | ~5-10 microseconds |
| Failed resolution | ~50 microseconds |

### Optimizing Provider Lookups

- Use `providedIn: 'root'` for singletons — skips hierarchy traversal
- Avoid deep component injector chains for frequently resolved services
- Use `@Self()` and `@SkipSelf()` to constrain resolution path
- Prefer `inject()` over constructor injection for better tree-shaking

## DI Security

### Preventing Injection Attacks

```typescript
// Sanitize injection tokens
const safeToken = new InjectionToken<string>('Safe Token', {
  factory: () => {
    // Validate the factory result
    const value = someExternalSource()
    if (typeof value !== 'string') throw new Error('Invalid value')
    return value
  },
})
```

## Summary

| Pattern | Token Type | Multi | Use Case |
|---------|------------|-------|----------|
| useClass | Any | No | Implementation swap |
| useExisting | Any | No | Aliasing |
| useFactory | Any | No | Dynamic creation |
| useValue | InjectionToken | No | Configuration values |
| multi: true | InjectionToken | Yes | Extension points |
| @Optional | Any | N/A | Optional dependencies |
| @Self | Any | N/A | Constrain resolution |
| @SkipSelf | Any | N/A | Skip current injector |
| @Host | Any | N/A | Host component scope |
