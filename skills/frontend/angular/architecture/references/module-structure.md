# Angular Module Structure

```
src/
├── app/
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
├── features/
│   ├── orders/
│   │   ├── pages/
│   │   │   ├── orders-page.component.ts
│   │   │   └── order-detail-page.component.ts
│   │   ├── components/
│   │   │   ├── order-list.component.ts
│   │   │   ├── order-card.component.ts
│   │   │   └── order-form.component.ts
│   │   ├── services/
│   │   │   ├── order.service.ts
│   │   │   └── order.state.ts       (Signal Store)
│   │   ├── models/
│   │   │   └── order.model.ts
│   │   └── orders.routes.ts
│   └── users/
│       └── ...
├── shared/
│   ├── components/
│   │   ├── button.component.ts
│   │   ├── input.component.ts
│   │   └── card.component.ts
│   ├── directives/
│   │   └── tooltip.directive.ts
│   └── pipes/
│       └── format-date.pipe.ts
├── core/
│   ├── interceptors/
│   │   ├── auth.interceptor.ts
│   │   └── error.interceptor.ts
│   ├── guards/
│   │   └── auth.guard.ts
│   └── services/
│       └── api.service.ts
└── environments/
    ├── environment.ts
    └── environment.prod.ts
```

## Module Declaration (Standalone)
```typescript
// Standalone component (default)
@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [NgFor, DatePipe, OrderCardComponent],
  template: `...`,
})
export class OrderListComponent { ... }
```

## Routing
```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'orders', loadChildren: () => import('./features/orders/orders.routes') },
]

// orders.routes.ts
export default [
  { path: '', component: OrdersPageComponent },
  { path: ':id', component: OrderDetailPageComponent },
] as Routes
```
