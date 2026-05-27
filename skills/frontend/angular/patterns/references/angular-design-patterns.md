# Angular Design Patterns

## Facade Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class UserFacade {
  private userState = new BehaviorSubject<UserState>({ users: [], loading: false })

  readonly state$ = this.userState.asObservable()
  readonly users$ = this.state$.pipe(map(s => s.users))
  readonly loading$ = this.state$.pipe(map(s => s.loading))

  constructor(
    private userService: UserService,
    private store: Store,
  ) {}

  loadUsers(): void {
    this.userState.next({ ...this.userState.value, loading: true })
    this.userService.getUsers().subscribe({
      next: users => this.userState.next({ users, loading: false }),
      error: () => this.userState.next({ ...this.userState.value, loading: false }),
    })
  }

  selectUser(id: string): void {
    this.store.dispatch(UserActions.select({ id }))
  }
}
```

## Presentational vs Container

```typescript
// Container Component
@Component({
  template: `
    <app-user-list
      [users]="users$ | async"
      [loading]="loading$ | async"
      (selectUser)="onSelectUser($event)">
    </app-user-list>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserContainerComponent implements OnInit {
  users$ = this.facade.users$
  loading$ = this.facade.loading$

  constructor(private facade: UserFacade) {}

  ngOnInit(): void {
    this.facade.loadUsers()
  }

  onSelectUser(id: string): void {
    this.facade.selectUser(id)
  }
}

// Presentational Component
@Component({
  selector: 'app-user-list',
  template: `
    <div *ngIf="loading">Loading...</div>
    <div *ngFor="let user of users">
      {{ user.name }}
      <button (click)="selectUser.emit(user.id)">View</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {
  @Input() users: User[] | null = []
  @Input() loading = false
  @Output() selectUser = new EventEmitter<string>()
}
```

## Dependency Injection Patterns

```typescript
// Injection Token
export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG')

// Factory Provider
export function apiConfigFactory(): ApiConfig {
  return {
    baseUrl: environment.apiUrl,
    timeout: environment.production ? 10000 : 30000,
    retries: environment.production ? 3 : 1,
  }
}

@NgModule({
  providers: [
    {
      provide: API_CONFIG,
      useFactory: apiConfigFactory,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
})
export class CoreModule {}
```

## Command Pattern

```typescript
interface Command {
  execute(): Observable<void>
  undo?(): Observable<void>
}

class CreateUserCommand implements Command {
  constructor(
    private user: CreateUserDto,
    private service: UserService,
  ) {}

  execute(): Observable<void> {
    return this.service.createUser(this.user).pipe(map(() => void 0))
  }
}

@Injectable({ providedIn: 'root' })
class CommandBus {
  private history: Command[] = []

  execute(command: Command): Observable<void> {
    return command.execute().pipe(
      tap(() => this.history.push(command)),
    )
  }
}
```

## Key Points

- Use facade pattern to simplify complex service interactions
- Separate container and presentational components
- Use injection tokens for flexible dependency configuration
- Implement command pattern for undoable operations
- Use RxJS operators for declarative data flows
- Prefer async pipe over manual subscriptions
- Use trackBy with ngFor for list rendering
- Implement custom form controls with ControlValueAccessor
- Use guards for route protection and data preloading
- Follow the single-responsibility principle for services
- Use shared modules for commonly used components
- Implement proper error handling with catchError
