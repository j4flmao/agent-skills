---
name: angular-architecture
description: >
  Use this skill when the user says 'Angular structure', 'Angular architecture', 'Angular folder', 'Angular standalone', 'Angular signals', 'Angular clean arch', 'Angular feature', 'Angular project layout', 'NgModule vs standalone', or when structuring an Angular application (v17+). This skill enforces: standalone components by default (no NgModule), feature-based folder organization with lazy loading, Signals for component state (not RxJS for local state), new control flow (@if, @for, @switch), inject() function for DI, and OnPush change detection. Requires Angular 17+ (angular.json). Do NOT use for: AngularJS, React, Vue, or pre-standalone Angular versions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, angular, phase-3]
---

# Angular Architecture

## Purpose
Structure Angular 17+ applications with standalone components, Signals for state, and feature-based lazy loading. No NgModules. No RxJS for local state. New control flow syntax.

## Agent Protocol

### Trigger
Exact user phrases: "Angular structure", "Angular architecture", "Angular folder", "Angular standalone", "Angular signals", "Angular clean arch", "Angular feature", "Angular project layout", "NgModule vs standalone".

### Input Context
Before activating, verify:
- angular.json exists (Angular 17+).
- Whether the project uses standalone components or NgModules.

### Output Artifact
No file output. Produces folder structure and component code as text.

### Response Format
Folder structure:
```
src/app/
  features/{feature}/
    pages/, components/, services/, store/
  shared/components/
  core/
```

Code: TypeScript component and template (inline or separate). No import statements.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Standalone components by default. NgModule only for NgRx or specific lazy-loading needs.
- [ ] Signals used for component state (signal(), computed()).
- [ ] inject() used for DI instead of constructor injection.
- [ ] New control flow syntax used (@if, @for, @switch).
- [ ] Feature routes are lazy-loaded.
- [ ] OnPush change detection (default for standalone).
- [ ] No *ngIf, *ngFor, *ngSwitch in new code.

### Max Response Length
Folder structure: unlimited. Code: 20 lines per example.

## Workflow

### Step 1: Standalone Component Structure
```
src/
  app/
    app.component.ts                    -- Standalone root
    app.config.ts                       -- Providers (provideRouter, provideHttpClient)
    app.routes.ts                       -- Root route definitions
    features/
      users/
        users.routes.ts                 -- Lazy-loaded feature routes
        pages/
          user-list/
            user-list.component.ts
            user-list.component.html
            user-list.component.scss
          user-detail/
            user-detail.component.ts
            user-detail.component.html
        components/
          user-card/
            user-card.component.ts
            user-card.component.html
        services/
          user.service.ts
        store/
          user.store.ts                  -- Signal store or NgRx feature state
        models/
          user.model.ts
    shared/
      components/
        button/
          button.component.ts
      directives/
        has-permission.directive.ts
      pipes/
        truncate.pipe.ts
    core/
      auth/
      interceptors/
      guards/
```

### Step 2: Standalone Component Pattern
```typescript
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {
  private readonly userService = inject(UserService)

  readonly users = signal<User[]>([])
  readonly isLoading = signal(false)

  ngOnInit() {
    this.loadUsers()
  }

  async loadUsers() {
    this.isLoading.set(true)
    try {
      const users = await this.userService.getAll()
      this.users.set(users)
    } finally {
      this.isLoading.set(false)
    }
  }
}
```

### Step 3: Signals for State
```typescript
@Component({
  template: `
    @if (isLoading()) {
      <app-spinner />
    } @else {
      @for (user of users(); track user.id) {
        <app-user-card [user]="user" (select)="selectUser($event)" />
      } @empty {
        <p>No users found</p>
      }
    }
  `,
})
export class UsersComponent {
  // Writable signal
  count = signal(0)

  // Computed signal (derived)
  doubled = computed(() => this.count() * 2)

  // Effect (side effect — use sparingly, avoid in most cases)
  constructor() {
    effect(() => {
      console.log(`Count: ${this.count()}`)
    })
  }

  increment() {
    this.count.update(c => c + 1)
  }
}
```

### Step 4: New Control Flow (v17+)
```html
<!-- OLD: structural directives -->
<div *ngIf="isLoading$ | async">Loading...</div>
<div *ngFor="let user of users$ | async">{{ user.name }}</div>

<!-- NEW: control flow syntax -->
@if (isLoading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else {
  @for (user of users(); track user.id) {
    <div>{{ user.name }}</div>
  } @empty {
    <p>No users yet</p>
  }
}

@switch (status()) {
  @case ('active') { <span class="badge">Active</span> }
  @case ('inactive') { <span class="badge">Inactive</span> }
  @default { <span>Unknown</span> }
}
```

### Step 5: Lazy-Loaded Feature Routes
```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page.component')
      .then(m => m.HomePageComponent),
  },
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.routes')
      .then(m => m.userRoutes),
  },
]

// features/users/users.routes.ts
export const userRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/user-list/user-list.component')
      .then(m => m.UserListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/user-detail/user-detail.component')
      .then(m => m.UserDetailComponent),
  },
]
```

### Step 6: Modern DI (inject function)
```typescript
// inject() function (v14+) — preferred over constructor injection
export class UserService {
  private readonly http = inject(HttpClient)
  private readonly config = inject(APP_CONFIG)

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.config.apiUrl}/users`)
  }
}
```

## Rules
- Standalone components by default. NgModules only for NgRx feature states or backward compatibility.
- Signals for component and local state. RxJS only for complex async streams (HTTP, WebSocket, debounced inputs).
- inject() over constructor injection. Cleaner, less boilerplate, tree-shakable.
- New control flow syntax (@if, @for, @switch) in all new code. No *ngIf, *ngFor, *ngSwitch.
- Every feature route is lazy-loaded. No eager-loaded features in production bundles.
- OnPush change detection is default for standalone components.

## References
- `references/module-structure.md` — Angular standalone component structure and routing
- `references/signals-guide.md` — Signals, Signal Store, input/output with signals
- `references/standalone-components.md` — bootstrapApplication, lazy loading, migration
- `references/angular-routing.md` — route configuration, lazy loading, guards, resolvers, navigation, NgModule

## Handoff
No artifact produced.
Next skill: angular-patterns — DI, interceptors, guards, NgRx vs Signal Store.
Carry forward: standalone setup, signal patterns, feature organization.
