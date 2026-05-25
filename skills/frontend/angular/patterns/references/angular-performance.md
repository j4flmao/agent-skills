# Angular Performance Patterns

## Change Detection Strategy

### OnPush Default

```typescript
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (item of items(); track item.id) { <div>{{ item.name }}</div> }`,
})
export class EfficientList {
  readonly items = signal<Item[]>([])
}
```

OnPush components only check for changes when:
- An input signal changes
- An event originates from the component or its children
- `markForCheck()` or `detectChanges()` is called

## Signal-Based Reactivity

```typescript
@Component({ template: `{{ displayName() }}` })
export class UserProfile {
  readonly user = input<User>()
  readonly displayName = computed(() =>
    `${this.user()?.firstName} ${this.user()?.lastName}`
  )
}
```

| Approach | Change Detection | When to Use |
|----------|-----------------|-------------|
| Signals | Targeted updates | Default for all new code |
| Zone.js + OnPush | Manual check | Legacy code |
| RxJS + async pipe | Subscription | Async streams |

## Lazy Loading

```typescript
export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
]
```

## Bundle Optimization

```json
{
  "angular.json": {
    "projects": {
      "my-app": {
        "architect": {
          "build": {
            "configurations": {
              "production": {
                "optimization": true,
                "outputHashing": "all",
                "sourceMap": false,
                "namedChunks": false,
                "aot": true,
                "extractLicenses": true,
                "vendorChunk": true,
                "buildOptimizer": true,
                "budgets": [
                  { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
                  { "type": "anyComponentStyle", "maximumWarning": "2kB", "maximumError": "4kB" }
                ]
              }
            }
          }
        }
      }
    }
  }
}
```

## Image Optimization

```typescript
// Use NgOptimizedImage for automatic optimization
import { provideImgixLoader } from '@angular/common'

bootstrapApplication(App, {
  providers: [
    provideImgixLoader('https://assets.example.com'),
  ],
})

// In template
<img ngSrc="/hero.jpg" width="800" height="600" priority>
```

## Virtual Scrolling

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling'

@Component({
  imports: [ScrollingModule],
  template: `
    <cdk-virtual-scroll-viewport itemSize="50" class="viewport">
      <div *cdkVirtualFor="let item of items">{{ item.name }}</div>
    </cdk-virtual-scroll-viewport>
  `,
})
export class VirtualScrollList {}
```

## Defer Block (v17+)

```html
@defer (on viewport) {
  <heavy-component />
} @placeholder {
  <div>Placeholder</div>
} @loading {
  <div>Loading...</div>
} @error {
  <div>Failed to load</div>
}
```

| Trigger | When |
|---------|------|
| `on viewport` | When scrolled into view |
| `on idle` | When browser is idle |
| `on interaction` | When user clicks/taps |
| `on timer(5s)` | After a delay |
| `on immediate` | Immediately after rendering |
| `on hover` | When user hovers |

## Performance Budget

| Metric | Target |
|--------|--------|
| Initial bundle | <200kB |
| Lazy chunk size | <50kB |
| LCP | <2.5s |
| CLS | <0.1 |
| TBT | <200ms |
| Angular init | <500ms |
