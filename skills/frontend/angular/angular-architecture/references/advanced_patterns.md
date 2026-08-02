# Advanced Angular Patterns

## Advanced RxJS & Higher-Order Mapping
Utilize higher-order operators (`switchMap`, `mergeMap`, `concatMap`, `exhaustMap`) based on the specific concurrency requirements.
- `switchMap`: Cancels previous requests (ideal for typeahead searches).
- `concatMap`: Queues requests sequentially (ideal for updates).
- `mergeMap`: Runs requests in parallel.
- `exhaustMap`: Ignores new requests while a request is pending (ideal for login buttons).

```typescript
this.searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => this.apiService.search(query))
).subscribe(results => this.results = results);
```

## Subject vs BehaviorSubject
- **Subject**: Multicasts to many Observers. No initial value or replay.
- **BehaviorSubject**: Requires an initial value and emits its current value whenever it is subscribed to.
- **ReplaySubject**: Replays a specific number of previous values to new subscribers.

Use `BehaviorSubject` for state you need to access synchronously or when late subscribers need the current state.

## Custom Directives
Directives encapsulate DOM manipulation and behavior. Structural directives (`*ngIf`) manipulate the DOM, while attribute directives change the behavior or appearance.

```typescript
@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter') onMouseEnter() {
    this.renderer.setStyle(this.nativeElement, 'backgroundColor', 'yellow');
  }
}
```
