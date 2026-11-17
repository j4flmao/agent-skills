# Cypress Guide

## Installation

```bash
npm install cypress --save-dev
npx cypress open  # first run creates scaffold
```

## Project Structure

```
cypress/
├── e2e/
│   ├── login.cy.ts
│   └── dashboard.cy.ts
├── support/
│   ├── commands.ts
│   ├── commands.js
│   └── e2e.ts
├── fixtures/
│   ├── users.json
│   └── auth.json
└── downloads/
cypress.config.ts
```

## Configuration

```typescript
// cypress.config.ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    screenshotOnRunFailure: true,
    video: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      on("task", {
        seedDatabase() {
          // Run database seeding
          return null;
        },
        async queryDb(query: string) {
          // Execute database query
          return null;
        },
      });
    },
  },
});
```

## Custom Commands

```typescript
// cypress/support/commands.ts
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit("/login");
    cy.getByLabel("Email").type(email);
    cy.getByLabel("Password").type(password);
    cy.getByRole("button", { name: "Sign in" }).click();
    cy.url().should("include", "/dashboard");
  });
});

Cypress.Commands.add("getByTestId", (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add("getByLabel", (label: string) => {
  return cy.get(`label:contains("${label}")`)
    .invoke("attr", "for")
    .then((id) => cy.get(`#${id}`));
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      getByLabel(label: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}
```

## Test Examples

```typescript
// cypress/e2e/login.cy.ts
describe("Login", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("successful login redirects to dashboard", () => {
    cy.getByLabel("Email").type("user@example.com");
    cy.getByLabel("Password").type("correct-password");
    cy.getByRole("button", { name: "Sign in" }).click();
    cy.url().should("include", "/dashboard");
    cy.contains("Welcome back").should("be.visible");
  });

  it("shows error on invalid credentials", () => {
    cy.getByLabel("Email").type("wrong@example.com");
    cy.getByLabel("Password").type("wrong-password");
    cy.getByRole("button", { name: "Sign in" }).click();
    cy.getByTestId("error-message")
      .should("be.visible")
      .and("contain", "Invalid credentials");
  });

  it("preserves login across page reloads", () => {
    cy.login("user@example.com", "correct-password");
    cy.visit("/dashboard");
    cy.url().should("include", "/dashboard");
  });
});
```

```typescript
// cypress/e2e/dashboard.cy.ts
describe("Dashboard", () => {
  beforeEach(() => {
    cy.login("user@example.com", "correct-password");
    cy.visit("/dashboard");
  });

  it("displays all metric cards", () => {
    cy.getByTestId("revenue-card").should("be.visible");
    cy.getByTestId("active-users-card").should("be.visible");
    cy.getByTestId("conversion-card").should("be.visible");
  });

  it("navigates to settings page", () => {
    cy.contains("Settings").click();
    cy.url().should("include", "/settings");
  });
});
```

## API Testing

```typescript
// cypress/e2e/api.cy.ts
describe("API", () => {
  it("GET /api/users returns paginated results", () => {
    cy.request("/api/users?page=1&limit=10").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.data).to.have.length(10);
      expect(response.body.meta).to.deep.include({
        page: 1,
        limit: 10,
      });
    });
  });

  it("intercepts and stubs API response", () => {
    cy.intercept("GET", "/api/users", {
      fixture: "users.json",
    }).as("getUsers");
    cy.visit("/users");
    cy.wait("@getUsers");
    cy.getByTestId("user-list").children().should("have.length", 3);
  });
});
```

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  deployment_status:
jobs:
  cypress:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          config: baseUrl=${{ github.event.deployment_status.environment_url }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots/
```

## Component Testing

```typescript
// cypress/component/Button.cy.tsx
import { Button } from "./Button";

describe("Button", () => {
  it("renders with text", () => {
    cy.mount(<Button>Click me</Button>);
    cy.contains("Click me").should("be.visible");
  });

  it("fires onClick handler", () => {
    const onClick = cy.stub();
    cy.mount(<Button onClick={onClick}>Click</Button>);
    cy.contains("Click").click();
    expect(onClick).to.have.been.calledOnce;
  });

  it("is disabled when loading", () => {
    cy.mount(<Button loading>Submit</Button>);
    cy.contains("Submit").should("be.disabled");
  });
});
```

## Best Practices

- Use `cy.session()` to cache browser context (cookies, localStorage) between tests
- Use `cy.intercept()` at the route level, not the URL level, for maintainable stubs
- Prefer `cy.getByRole()` and `cy.getByLabel()` over CSS selectors for accessibility
- Use `data-testid` attributes only for elements that can't be selected by role or label
- Keep tests independent — never rely on state from a previous test
- Use `beforeEach()` for setup, not `before()` — each test should start fresh
- Set `baseUrl` in config, never hardcode URLs in tests
- Use `cy.origin()` for cross-origin testing (iframes, OAuth flows)
