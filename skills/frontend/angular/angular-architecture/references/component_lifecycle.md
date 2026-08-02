# Component Lifecycle & Memory Management

## Key Lifecycle Hooks
- `ngOnChanges()`: Called when a data-bound input property changes. Useful for reacting to input updates.
- `ngOnInit()`: Called once after the first `ngOnChanges()`. Ideal for component initialization and fetching initial data.
- `ngDoCheck()`: Detects and acts upon changes that Angular can't or won't detect on its own. Use with extreme caution due to high execution frequency.
- `ngAfterViewInit()`: Called after Angular initializes the component's views and child views. Safe to access DOM elements via `@ViewChild`.
- `ngOnDestroy()`: Called immediately before Angular destroys the component. Critical for cleanup.

## Managing Memory Leaks (Unsubscribe)
Failing to unsubscribe from Observables leads to memory leaks and unexpected behavior.

### Strategies:
1. **Async Pipe (Preferred)**: Angular handles subscription and unsubscription automatically in the template.
   ```html
   <div *ngIf="data$ | async as data">{{ data }}</div>
   ```

2. **takeUntil with Subject**:
   ```typescript
   private destroy$ = new Subject<void>();

   ngOnInit() {
     this.dataService.getData().pipe(
       takeUntil(this.destroy$)
     ).subscribe(data => this.data = data);
   }

   ngOnDestroy() {
     this.destroy$.next();
     this.destroy$.complete();
   }
   ```
