# Cypress End-to-End Testing

## Overview
Cypress provides fast, reliable end-to-end testing for modern web applications. It runs in the browser with automatic waiting, time-travel debugging, and real-time reloads. This reference covers test writing, commands, assertions, fixtures, network stubbing, and CI integration.

## Basic Test Structure

### Test Organization
```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login form', () => {
    cy.get('[data-testid="email-input"]').should('be.visible');
    cy.get('[data-testid="password-input"]').should('be.visible');
    cy.get('[data-testid="submit-button"]')
      .should('be.visible')
      .and('contain', 'Sign In');
  });

  it('should show validation errors for empty fields', () => {
    cy.get('[data-testid="submit-button"]').click();
    cy.get('[data-testid="email-error"]')
      .should('be.visible')
      .and('contain', 'Email is required');
    cy.get('[data-testid="password-error"]')
      .should('be.visible')
      .and('contain', 'Password is required');
  });

  it('should navigate to dashboard on successful login', () => {
    cy.get('[data-testid="email-input"]').type('user@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="submit-button"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome-message"]')
      .should('contain', 'Welcome');
  });
});
```

## Commands and Assertions

### Custom Commands
```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      createPost(post: PostData): Chainable<Post>;
      resetDatabase(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="submit-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});

Cypress.Commands.add('createPost', (post: PostData) => {
  cy.request({
    method: 'POST',
    url: '/api/posts',
    body: post,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

Cypress.Commands.add('resetDatabase', () => {
  cy.exec('npm run db:reset');
  cy.wait(1000);
});
```

### Using Custom Commands
```typescript
describe('Dashboard', () => {
  beforeEach(() => {
    cy.login('user@example.com', 'password123');
    cy.visit('/dashboard');
  });

  it('should display user posts', () => {
    cy.get('[data-testid="post-card"]').should('have.length.at.least', 1);
  });
});

describe('Post Creation', () => {
  it('should create a new post via API', () => {
    cy.createPost({ title: 'Test Post', content: 'Test content' }).then(
      (post) => {
        expect(post.title).to.equal('Test Post');
      }
    );
  });
});
```

## Network Stubbing

### Intercepting Requests
```typescript
describe('API Integration', () => {
  it('should display loading state while fetching', () => {
    cy.intercept('GET', '/api/users', {
      delayMs: 1000,
      fixture: 'users.json',
    }).as('getUsers');

    cy.visit('/users');
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.wait('@getUsers');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
    cy.get('[data-testid="user-list"]').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    cy.intercept('POST', '/api/login', {
      statusCode: 500,
      body: { error: 'Server error' },
    }).as('loginRequest');

    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type('user@example.com');
    cy.get('[data-testid="submit-button"]').click();

    cy.wait('@loginRequest');
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Server error');
  });

  it('should validate network error handling', () => {
    cy.intercept('GET', '/api/posts', {
      forceNetworkError: true,
    }).as('networkError');

    cy.visit('/posts');
    cy.wait('@networkError');
    cy.get('[data-testid="offline-message"]').should('be.visible');
  });
});
```

## Fixtures

### Using Fixtures
```json
// cypress/fixtures/users.json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "admin"
  },
  {
    "id": 2,
    "name": "Bob Smith",
    "email": "bob@example.com",
    "role": "user"
  }
]
```

```typescript
describe('User Management', () => {
  beforeEach(() => {
    cy.fixture('users.json').as('users');
  });

  it('should display users from fixture', function () {
    cy.intercept('GET', '/api/users', {
      body: this.users,
    }).as('getUsers');

    cy.visit('/users');
    cy.wait('@getUsers');
    cy.get('[data-testid="user-row"]').should('have.length', 2);
  });
});
```

## Component Testing

### Mounting Components
```typescript
// cypress/component/Button.cy.tsx
import { Button } from './Button';

describe('Button Component', () => {
  it('should render with text', () => {
    cy.mount(<Button>Click me</Button>);
    cy.get('button').should('contain', 'Click me');
  });

  it('should handle click events', () => {
    const onClick = cy.spy().as('clickHandler');
    cy.mount(<Button onClick={onClick}>Submit</Button>);
    cy.get('button').click();
    cy.get('@clickHandler').should('have.been.calledOnce');
  });

  it('should show loading state', () => {
    cy.mount(<Button loading>Loading...</Button>);
    cy.get('button').should('be.disabled');
    cy.get('[data-testid="spinner"]').should('be.visible');
  });
});
```

## Page Objects

### Page Object Pattern
```typescript
// cypress/support/pages/login-page.ts
export class LoginPage {
  visit() {
    cy.visit('/login');
  }

  get emailInput() {
    return cy.get('[data-testid="email-input"]');
  }

  get passwordInput() {
    return cy.get('[data-testid="password-input"]');
  }

  get submitButton() {
    return cy.get('[data-testid="submit-button"]');
  }

  get errorMessage() {
    return cy.get('[data-testid="error-message"]');
  }

  login(email: string, password: string) {
    this.emailInput.type(email);
    this.passwordInput.type(password);
    this.submitButton.click();
  }

  shouldShowError(message: string) {
    this.errorMessage.should('be.visible').and('contain', message);
  }
}

// Usage in tests
describe('Login with Page Object', () => {
  const loginPage = new LoginPage();

  beforeEach(() => {
    loginPage.visit();
  });

  it('should show error for invalid credentials', () => {
    cy.intercept('POST', '/api/login', {
      statusCode: 401,
      body: { error: 'Invalid credentials' },
    });
    loginPage.login('wrong@email.com', 'wrongpass');
    loginPage.shouldShowError('Invalid credentials');
  });
});
```

## CI Integration

### GitHub Actions
```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  cypress-run:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        containers: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
          browser: chrome
          record: true
          parallel: true
          group: 'UI Tests'
          tag: ${{ github.event_name }}
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```

## Key Points
- cy.visit() navigates to pages, cy.get() queries elements
- Custom commands encapsulate reusable behavior
- cy.intercept() stubs and spies on network requests
- Fixtures provide test data from JSON files
- cy.session() caches authentication state
- Automatic waiting eliminates explicit sleep calls
- Time-travel debugging improves troubleshooting
- Component testing mounts components directly
- Page objects organize selectors and actions
- Screenshots and videos capture test failures
- Parallel execution speeds up test suites
- Dashboard records test results and flake analysis
- Environment variables manage configuration
- Test retries handle flaky tests
- Cross-browser testing in Firefox, Chrome, and Edge
- Real browser rendering catches layout and CSS issues
