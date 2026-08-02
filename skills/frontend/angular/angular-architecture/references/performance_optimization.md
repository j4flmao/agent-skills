# Performance Optimization

## Lazy Loading Modules
Lazy loading defers loading code until a route is requested, significantly reducing the initial bundle size.

```typescript
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  }
];
```

## `trackBy` in `*ngFor`
By default, `ngFor` tracks items by object identity. If the array is replaced, Angular re-renders the entire list. `trackBy` provides a unique identifier, allowing Angular to only update changed items.

```typescript
// Component
trackById(index: number, item: any): number {
  return item.id;
}
```
```html
<!-- Template -->
<div *ngFor="let user of users; trackBy: trackById">
  {{ user.name }}
</div>
```

## Optimizing Zone.js
Zone.js triggers change detection for many async events.
- **Run outside Angular**: For heavy DOM manipulations or high-frequency events (like scrolling/mouse movement) that don't need UI updates.
```typescript
constructor(private ngZone: NgZone) {}

this.ngZone.runOutsideAngular(() => {
  window.addEventListener('mousemove', this.heavyCalculations);
});
```
- **Zoneless Angular (Future)**: Leveraging Signals and experimental APIs to eventually remove Zone.js entirely.
