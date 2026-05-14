# Angular Standalone Components

## Default: Standalone
```typescript
@Component({
  selector: 'app-order-card',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  template: `
    <div class="card">
      <h3>{{ order().id }}</h3>
      <p>{{ order().total | currency }}</p>
      <p>{{ order().createdAt | date }}</p>
    </div>
  `,
})
export class OrderCardComponent {
  order = input.required<Order>()
}
```

## Bootstrapping
```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideAnimations(),
  ],
})
```

## Lazy Loading
```typescript
export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders-page.component').then(m => m.OrdersPageComponent),
    loadChildren: () => import('./features/orders/orders.routes'),
  },
]
```

## Feature Modules (when needed)
```typescript
// Only create NgModules for:
// 1. Third-party library wrappers
// 2. Declaring component sets for a large legacy feature
// 3. Shared module with many directives/pipes

// Prefer: standalone components + provide functions
```

## Migration from Modules
- Add `standalone: true` to component
- Replace `declarations` with `imports`
- Replace `providers` with `provide*` functions
- Replace `bootstrapModule` with `bootstrapApplication`
