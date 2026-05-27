# Cypress Component Testing for Vue

## Overview
Cypress Component Testing provides browser-based testing for Vue components. Unlike unit tests, component tests run in a real browser with full CSS, layout, and event handling. This reference covers mounting, interactions, mocking, and visual testing.

## Setup

### Cypress Configuration
```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';
import vue from '@cypress/vue2/plugin-vue';

export default defineConfig({
  component: {
    devServer: {
      framework: 'vue',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
  },
});
```

### Support File
```typescript
// cypress/support/component.ts
import { mount } from 'cypress/vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from '../../src/router';

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
      login(): Chainable<void>;
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add('mount', (component, options = {}) => {
  const pinia = createPinia();
  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  options.global = options.global || {};
  options.global.plugins = [pinia, router];

  return mount(component, options);
});

Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-testid="${value}"]`);
});
```

## Component Mounting

### Basic Component Test
```typescript
// src/components/__tests__/Button.cy.ts
import Button from '../Button.vue';

describe('Button Component', () => {
  it('renders with text', () => {
    cy.mount(Button, {
      props: {
        label: 'Click Me',
        variant: 'primary',
      },
    });

    cy.dataCy('button').should('contain', 'Click Me');
    cy.dataCy('button').should('have.class', 'btn--primary');
  });

  it('handles click events', () => {
    const onClick = cy.stub().as('clickHandler');
    cy.mount(Button, {
      props: {
        label: 'Submit',
        onClick,
      },
    });

    cy.dataCy('button').click();
    cy.get('@clickHandler').should('have.been.calledOnce');
  });

  it('shows disabled state', () => {
    cy.mount(Button, {
      props: {
        label: 'Disabled',
        disabled: true,
      },
    });

    cy.dataCy('button').should('be.disabled');
    cy.dataCy('button').should('have.class', 'btn--disabled');
  });
});
```

### Mounting with Slots
```typescript
// src/components/__tests__/Card.cy.ts
import Card from '../Card.vue';

describe('Card Component', () => {
  it('renders with slots', () => {
    cy.mount(Card, {
      props: { title: 'Test Card' },
      slots: {
        default: '<p class="custom-content">Card body content</p>',
        footer: '<button data-testid="card-action">Action</button>',
      },
    });

    cy.dataCy('card-title').should('contain', 'Test Card');
    cy.contains('.custom-content', 'Card body content');
    cy.dataCy('card-action').should('exist');
  });

  it('renders loading skeleton in slots', () => {
    cy.mount(Card, {
      props: { loading: true },
      slots: {
        skeleton: `
          <div data-testid="custom-skeleton">
            <div class="skeleton-line"></div>
          </div>
        `,
      },
    });

    cy.dataCy('custom-skeleton').should('be.visible');
  });
});
```

## Realistic Interactions

### Form Testing
```typescript
// src/components/__tests__/LoginForm.cy.ts
import LoginForm from '../LoginForm.vue';
import { createPinia } from 'pinia';

describe('Login Form', () => {
  beforeEach(() => {
    cy.mount(LoginForm);
  });

  it('validates required fields', () => {
    cy.dataCy('submit-button').click();
    cy.dataCy('email-error').should('be.visible').and('contain', 'Email is required');
    cy.dataCy('password-error').should('be.visible').and('contain', 'Password is required');
  });

  it('submits form with valid data', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: { token: 'fake-token' },
    }).as('loginRequest');

    cy.dataCy('email-input').type('user@example.com');
    cy.dataCy('password-input').type('securepassword');

    // Verify input values
    cy.dataCy('email-input').should('have.value', 'user@example.com');
    cy.dataCy('password-input').should('have.value', 'securepassword');

    cy.dataCy('submit-button').click();

    cy.wait('@loginRequest').its('request.body').should('deep.equal', {
      email: 'user@example.com',
      password: 'securepassword',
    });
  });

  it('shows error message on failed login', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: { message: 'Invalid credentials' },
    }).as('loginRequest');

    cy.dataCy('email-input').type('wrong@example.com');
    cy.dataCy('password-input').type('wrongpass');
    cy.dataCy('submit-button').click();

    cy.wait('@loginRequest');
    cy.dataCy('error-message').should('be.visible');
    cy.dataCy('error-message').should('contain', 'Invalid credentials');
  });
});
```

## Network Mocking

### API Stubbing
```typescript
// src/components/__tests__/UserList.cy.ts
import UserList from '../UserList.vue';

describe('User List', () => {
  it('displays users from API', () => {
    cy.intercept('GET', '/api/users', {
      fixture: 'users.json',
    }).as('getUsers');

    cy.mount(UserList);
    cy.wait('@getUsers');

    cy.dataCy('user-item').should('have.length', 2);
    cy.dataCy('user-item').first().should('contain', 'Alice Johnson');
    cy.dataCy('loading-spinner').should('not.exist');
  });

  it('handles loading state', () => {
    cy.intercept('GET', '/api/users', {
      delayMs: 2000,
      fixture: 'users.json',
    }).as('getUsers');

    cy.mount(UserList);
    cy.dataCy('loading-spinner').should('be.visible');
    cy.wait('@getUsers');
    cy.dataCy('loading-spinner').should('not.exist');
  });

  it('handles empty state', () => {
    cy.intercept('GET', '/api/users', {
      body: [],
    }).as('getUsers');

    cy.mount(UserList);
    cy.wait('@getUsers');

    cy.dataCy('empty-state').should('be.visible');
    cy.dataCy('empty-state').should('contain', 'No users found');
  });

  it('handles error state', () => {
    cy.intercept('GET', '/api/users', {
      statusCode: 500,
      body: { error: 'Server error' },
    }).as('getUsers');

    cy.mount(UserList);
    cy.wait('@getUsers');

    cy.dataCy('error-message').should('be.visible');
    cy.dataCy('retry-button').should('exist');
  });
});
```

## Router Integration

### Testing with Vue Router
```typescript
// src/components/__tests__/NavBar.cy.ts
import NavBar from '../NavBar.vue';
import { mount } from 'cypress/vue';
import { createRouter, createWebHistory } from 'vue-router';

describe('NavBar', () => {
  it('highlights active route', () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
        { path: '/about', name: 'about', component: { template: '<div>About</div>' } },
        { path: '/contact', name: 'contact', component: { template: '<div>Contact</div>' } },
      ],
    });

    router.push('/about');

    cy.mount(NavBar, {
      global: { plugins: [router] },
    });

    cy.dataCy('nav-about').should('have.class', 'active');
    cy.dataCy('nav-home').should('not.have.class', 'active');
  });
});
```

## Visual Testing

### Screenshot Comparison
```typescript
// src/components/__tests__/Dashboard.cy.ts
import Dashboard from '../Dashboard.vue';

describe('Dashboard Visual Tests', () => {
  it('matches snapshot in default state', () => {
    cy.mount(Dashboard, {
      props: { showMetrics: true },
    });

    cy.dataCy('dashboard').compareSnapshot('dashboard-default');
  });

  it('matches snapshot in mobile view', () => {
    cy.viewport(375, 667);
    cy.mount(Dashboard, {
      props: { showMetrics: true },
    });

    cy.dataCy('dashboard').compareSnapshot('dashboard-mobile');
  });

  it('matches snapshot in dark mode', () => {
    cy.mount(Dashboard, {
      props: { theme: 'dark', showMetrics: true },
    });

    cy.dataCy('dashboard').compareSnapshot('dashboard-dark');
  });
});
```

## Key Points
- Cypress Component Testing runs in a real browser environment
- mount() command renders Vue components with configuration
- cy.intercept() stubs network requests at the browser level
- Real browser events capture actual user interactions
- Fixtures provide consistent test data from JSON files
- Router and Pinia plugins mount with component setup
- Custom commands reduce test boilerplate
- Visual testing with screenshot comparison catches regressions
- Viewport changes test responsive behavior
- Debugging with cy.pause() and time-travel snapshots
- Component selectors prefer data-testid attributes
- Async operations use cy.wait() for proper sequencing
- Cypress Studio records interactions for test generation
- Multiple fixtures handle different test scenarios
- Accessibility testing with cypress-axe plugin
- Performance testing measures render times
- Component tests run in parallel with spec files
- Test retries handle flaky component behavior
- Environment variables configure test-specific settings
