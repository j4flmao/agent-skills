# Angular Core Concepts

## Hierarchical Dependency Injection (DI)
Angular's DI system is hierarchical. Injectors correspond to the component tree.
- **Module/Root Level (`providedIn: 'root'`)**: Creates a single, shared instance (singleton).
- **Component Level (`providers: [...]`)**: Creates a new instance of the service for that component and its children.

```typescript
// Singleton across the app
@Injectable({ providedIn: 'root' })
export class GlobalConfigService { }

// Unique instance per component tree
@Component({
  selector: 'app-feature',
  providers: [FeatureSpecificService]
})
```

## Change Detection Strategy
Angular tracks changes to data to update the DOM.

### Default Strategy
Checks the entire component tree on every browser event, timer, or XHR (via Zone.js). Can be slow in large apps.

### OnPush Strategy
Tells Angular to only check the component when:
1. An input reference (`@Input()`) changes.
2. An event originates from the component or its children.
3. Explicitly requested via `ChangeDetectorRef.markForCheck()`.
4. An Observable linked with the `async` pipe emits.

```typescript
@Component({
  selector: 'app-optimized',
  templateUrl: './optimized.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent {
  @Input() immutableData: ReadonlyArray<Item>;
}
```
*Rule of thumb*: Use OnPush combined with Immutable data structures for maximum performance.
