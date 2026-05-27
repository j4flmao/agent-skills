# Angular Performance

## Change Detection Strategy

```typescript
@Component({
  selector: 'app-user-card',
  template: `
    <div class="card">
      <h3>{{ user.name }}</h3>
      <p>{{ user.email }}</p>
      <button (click)="onSelect.emit(user.id)">Select</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  @Input() user!: User
  @Output() onSelect = new EventEmitter<string>()
}
```

## Virtual Scrolling

```typescript
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling'

@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="50" class="viewport">
      <div *cdkVirtualFor="let user of users" class="list-item">
        {{ user.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `,
})
export class UserListComponent {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport
  users: User[] = []

  loadMore() {
    const end = this.viewport.getRenderedRange().end
    if (end === this.users.length) {
      this.loadMoreUsers()
    }
  }
}
```

## TrackBy Function

```typescript
@Component({
  template: `
    <div *ngFor="let user of users; trackBy: trackByUserId">
      {{ user.name }}
    </div>
  `,
})
export class UserListComponent {
  trackByUserId(index: number, user: User): string {
    return user.id
  }
}
```

## Lazy Image Loading

```typescript
import { LazyLoadImageModule } from 'ng-lazyload-image'

@NgModule({
  imports: [LazyLoadImageModule],
})
export class SharedModule {}

@Component({
  template: `
    <img [lazyLoad]="user.avatar" [defaultImage]="placeholder" />
  `,
})
export class UserAvatarComponent {
  @Input() user!: User
  placeholder = 'assets/placeholder.png'
}
```

## Zone.js Optimization

```typescript
import { NgZone } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  constructor(private ngZone: NgZone) {}

  runOutsideAngular(fn: () => void): void {
    this.ngZone.runOutsideAngular(fn)
  }

  runInsideAngular(fn: () => void): void {
    this.ngZone.run(fn)
  }
}

@Component({
  template: `Scroll position: {{ scrollPosition }}`,
})
export class ScrollTrackerComponent implements OnInit {
  scrollPosition = 0

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', () => {
        this.scrollPosition = window.scrollY
      })
    })
  }
}
```

## Key Points

- Use OnPush change detection for predictable rendering
- Implement virtual scrolling for long lists
- Use trackBy with ngFor to minimize DOM manipulation
- Lazy load images with dedicated libraries
- Run performance-critical code outside Angular zone
- Unsubscribe from observables to prevent memory leaks
- Use Angular CDK for reusable UI primitives
- Implement route reuse strategy for tabbed interfaces
- Preload lazy modules after initial load
- Use pure pipes for expensive computations
- Monitor bundle size with source-map-explorer
- Profile component rendering with Angular DevTools
