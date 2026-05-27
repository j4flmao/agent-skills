# Angular Module Architecture

## Module Structure

```typescript
// core.module.ts
@NgModule({
  imports: [CommonModule, HttpClientModule],
  declarations: [NavbarComponent, SidebarComponent, FooterComponent],
  exports: [NavbarComponent, SidebarComponent, FooterComponent],
  providers: [AuthService, ApiService],
})
export class CoreModule {
  static forRoot(): ModuleWithProviders<CoreModule> {
    return {
      ngModule: CoreModule,
      providers: [AuthService, ApiService],
    }
  }
}

// feature.module.ts
@NgModule({
  imports: [CommonModule, CoreModule, RouterModule.forChild(routes)],
  declarations: [UserListComponent, UserDetailComponent],
  providers: [UserService],
})
export class UserModule {}
```

## Lazy Loading

```typescript
const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module')
      .then(m => m.DashboardModule),
  },
  {
    path: 'users',
    loadChildren: () => import('./users/users.module')
      .then(m => m.UsersModule),
    canLoad: [AuthGuard],
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component')
      .then(m => m.ReportsComponent),
  },
]
```

## Service Architecture

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = '/api/users'

  constructor(private http: HttpClient) {}

  getUsers(page: number, pageSize: number): Observable<PaginatedResponse<User>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize))

    return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params }).pipe(
      retry(2),
      catchError(this.handleError),
    )
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError),
    )
  }

  createUser(user: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, user).pipe(
      catchError(this.handleError),
    )
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('API Error:', error)
    return throwError(() => new Error(error.message))
  }
}
```

## Reactive Forms

```typescript
@Component({
  selector: 'app-user-form',
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <div class="form-field">
        <label for="name">Name</label>
        <input id="name" formControlName="name" />
        <div *ngIf="name?.invalid && name?.touched" class="error">
          Name is required
        </div>
      </div>
      <div class="form-field">
        <label for="email">Email</label>
        <input id="email" type="email" formControlName="email" />
        <div *ngIf="email?.invalid && email?.touched" class="error">
          <div *ngIf="email?.errors?.['required']">Email is required</div>
          <div *ngIf="email?.errors?.['email']">Invalid email format</div>
        </div>
      </div>
      <button type="submit" [disabled]="userForm.invalid">Submit</button>
    </form>
  `,
})
export class UserFormComponent implements OnInit {
  userForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    role: new FormControl('user'),
  })

  get name() { return this.userForm.get('name') }
  get email() { return this.userForm.get('email') }

  ngOnInit() {
    this.userForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(value => {
      console.log('Form changed:', value)
    })
  }

  onSubmit() {
    if (this.userForm.valid) {
      console.log(this.userForm.value)
    }
  }
}
```

## Key Points

- Organize modules into Core, Feature, and Shared categories
- Implement lazy loading for all feature modules
- Use providedIn: 'root' for singleton services
- Leverage Angular CLI for consistent code generation
- Use reactive forms with proper validation
- Implement route guards for authentication and authorization
- Use resolvers for pre-fetching route data
- Handle HTTP errors with interceptors
- Use OnPush change detection for performance
- Follow the official Angular style guide
- Write unit tests for components, services, and pipes
- Use standalone components for simpler module architecture
