# Angular Modules & Routing

## Angular Routing Patterns

### Standalone Route Configuration

```typescript
// app.routes.ts
import { Routes } from '@angular/router'
import { authGuard } from './core/guards/auth.guard'
import { roleGuard } from './core/guards/role.guard'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page.component').then(m => m.HomePageComponent),
    title: 'Home',
  },
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.routes').then(m => m.productsRoutes),
    canActivate: [authGuard],
    title: 'Products',
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
    canMatch: [roleGuard('admin')],
    title: 'Admin',
  },
  {
    path: '**',
    loadComponent: () => import('./features/errors/not-found.component').then(m => m.NotFoundComponent),
    title: 'Not Found',
  },
]
```

### Feature Routes

```typescript
// features/products/products.routes.ts
import { Routes } from '@angular/router'

export const productsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/product-list/product-list.component').then(m => m.ProductListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
    resolve: { product: productResolver },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/product-edit/product-edit.component').then(m => m.ProductEditComponent),
    canDeactivate: [unsavedChangesGuard],
  },
]
```

## Router Features

| Feature | API | Usage |
|---------|-----|-------|
| Lazy loading | `loadComponent` / `loadChildren` | Route-level code splitting |
| Guards | `canActivate`, `canMatch`, `canDeactivate` | Auth, roles, data check |
| Resolvers | `resolve` | Pre-fetch data before navigation |
| Title | `title` property | Dynamic page titles |
| Query params | `queryParams`, `queryParamsHandling` | Search, filter, pagination |
| Route params | `:id` / `input()` binding | Dynamic segments |

```typescript
// Parsing route params with input signals (v16+)
@Component({ template: `Product ID: {{ productId() }}` })
export class ProductDetailComponent {
  readonly productId = input.required<string>()
}
```

### Navigation

```typescript
import { inject } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'

export class NavigationService {
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  goToProduct(id: string) {
    this.router.navigate(['/products', id])
  }

  updateSearch(q: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q },
      queryParamsHandling: 'merge',
    })
  }
}
```

## NgModule (Legacy)

```typescript
@NgModule({
  declarations: [ProductListComponent, ProductDetailComponent],
  imports: [CommonModule, RouterModule.forChild([
    { path: '', component: ProductListComponent },
    { path: ':id', component: ProductDetailComponent },
  ])],
})
export class ProductsModule {}
```
