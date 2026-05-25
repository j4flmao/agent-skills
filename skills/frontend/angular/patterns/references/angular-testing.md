# Angular Testing Patterns

## Component Testing

### Basic Component Test

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { UserCardComponent } from './user-card.component'

describe('UserCardComponent', () => {
  let fixture: ComponentFixture<UserCardComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent],  // Standalone component
    }).compileComponents()

    fixture = TestBed.createComponent(UserCardComponent)
    fixture.componentRef.setInput('user', { id: '1', name: 'Alice', email: 'alice@example.com' })
    await fixture.whenStable()
  })

  it('should display user name', () => {
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('[data-testid="user-name"]')?.textContent).toContain('Alice')
  })

  it('should emit select event on click', () => {
    const selectSpy = jasmine.createSpy()
    fixture.componentRef.setInput('select', selectSpy)
    fixture.nativeElement.querySelector('button')?.click()
    expect(selectSpy).toHaveBeenCalled()
  })
})
```

### Testing with Signals

```typescript
@Component({
  standalone: true,
  template: `
    @if (isLoading()) { <div>Loading...</div> }
    @for (user of users(); track user.id) {
      <div>{{ user.name }}</div>
    }
  `,
})
class TestHostComponent {
  readonly isLoading = signal(false)
  readonly users = signal<User[]>([])
}

describe('Signal-based component', () => {
  it('should show loading state', async () => {
    const fixture = TestBed.createComponent(TestHostComponent)
    fixture.componentRef.setInput('isLoading', true)
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('Loading...')
  })
})
```

## Service Testing

```typescript
import { TestBed } from '@angular/core/testing'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { UserService } from './user.service'

describe('UserService', () => {
  let service: UserService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UserService],
    })
    service = TestBed.inject(UserService)
    http = TestBed.inject(HttpTestingController)
  })

  it('should fetch users', async () => {
    const promise = service.getUsers()
    const req = http.expectOne('/api/users')
    expect(req.request.method).toBe('GET')
    req.flush([{ id: '1', name: 'Alice' }])
    const users = await promise
    expect(users.length).toBe(1)
  })

  afterEach(() => http.verify())
})
```

## Directive Testing

```typescript
describe('HasPermissionDirective', () => {
  it('should show element when user has permission', () => {
    @Component({
      standalone: true,
      imports: [HasPermissionDirective],
      template: '<div *appHasPermission="\'admin\'">Admin Content</div>',
    })
    class TestHost {}

    const fixture = TestBed.configureTestingModule({
      imports: [TestHost],
    }).createComponent(TestHost)
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('Admin Content')
  })
})
```

## Integration Testing

```typescript
describe('UserList Integration', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserListComponent, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    })
  })

  it('should load and display users', async () => {
    const fixture = TestBed.createComponent(UserListComponent)
    const http = TestBed.inject(HttpTestingController)
    fixture.detectChanges()

    http.expectOne('/api/users').flush([{ id: '1', name: 'Bob' }])
    await fixture.whenStable()
    fixture.detectChanges()

    expect(fixture.nativeElement.textContent).toContain('Bob')
  })
})
```

## Test Patterns

| Pattern | Technique |
|---------|-----------|
| Override providers | `TestBed.overrideProvider` |
| Mock component | `TestBed.overrideComponent` with mock |
| Detect changes | `fixture.detectChanges()` |
| Async stability | `await fixture.whenStable()` |
| Input signals | `fixture.componentRef.setInput()` |
| Route params | `provideRouter` + `RouterTestingHarness` |
