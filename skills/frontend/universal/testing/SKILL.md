---
name: frontend-testing
description: >
  Use this skill when the user says 'frontend testing', 'component test', 'React testing', 'Vue testing', 'Angular testing', 'testing library', 'Cypress', 'Playwright', 'snapshot test', 'what to test frontend', or when writing frontend tests. This skill enforces: Testing Library queries by user-facing attributes (getByRole, getByLabelText), userEvent over fireEvent, component tests for every component state, E2E for critical journeys only (5-10 per app), accessibility assertions in every test, and zero snapshot tests. Works with any frontend framework. Do NOT use for: backend testing, API testing, or manual QA.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, testing, phase-3, universal]
---

# Frontend Testing

## Purpose
Test user behavior, not implementation. Query elements the way users find them (by role, label, text). UserEvent simulates real interactions. Every component has an accessibility check.

## Agent Protocol

### Trigger
Exact user phrases: "frontend testing", "component test", "React testing", "Vue testing", "Angular testing", "testing library", "Cypress", "Playwright", "snapshot test", "what to test frontend".

### Input Context
Before activating, verify:
- The framework is known (React, Vue, Angular).
- The testing library is known (Testing Library, Playwright, Cypress) or can be inferred.
- The component or page being tested is specified.

### Output Artifact
No file output. Produces test code as text.

### Response Format
Test file:
```
describe('{Component}', () => {
  it('should {expected behavior} when {condition}', () => {
    // render
    // interact
    // assert
  })
})
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Queries use getByRole, getByLabelText, or getByText (never getByTestId unless unavoidable).
- [ ] userEvent used instead of fireEvent.
- [ ] Each test has exactly one behavior assertion.
- [ ] Component tests cover: happy path, error state, empty state, loading state.
- [ ] E2E tests cover only critical user journeys (<10 per app).
- [ ] Accessibility assertion in every component test (axe-core).
- [ ] No snapshot tests.

### Max Response Length
Per test: 20 lines.

## Testing Architecture / Decision Trees

### Test Type Decision Tree
```
What are you testing?
  |-- Single component logic -->
  |     UNIT / COMPONENT TEST
  |     Tool: Vitest / Jest + Testing Library
  |     Coverage: happy path, empty, loading, error, edge cases
  |     Assert: rendered output, called handlers, accessibility
  |
  |-- Multi-component interaction -->
  |     INTEGRATION TEST
  |     Tool: Vitest / Jest + Testing Library
  |     Approach: render parent, mock child API calls with MSW
  |     Assert: data flows correctly between components
  |
  |-- Full user journey -->
  |     E2E TEST
  |     Tool: Playwright / Cypress
  |     Coverage: 5-10 critical journeys per app (login, purchase, search)
  |     Assert: navigation, data persistence, UI flow
  |
  |-- Visual appearance -->
        VISUAL REGRESSION TEST
        Tool: Chromatic / Percy / Playwright snapshot
        Coverage: changed components only (diff-based)
        Assert: pixel-perfect match with baseline
```

### Query Priority Decision Tree
```
How does the user find the element?
  |-- By role + accessible name (button "Submit", link "View details") -->
  |     getByRole('button', { name: /submit/i })
  |     Preferred. Matches accessibility tree.
  |
  |-- By associated label (form fields) -->
  |     getByLabelText(/email/i)
  |     Links label to input. Tests accessibility.
  |
  |-- By text content (headings, paragraphs) -->
  |     getByText(/order confirmed/i)
  |     For non-interactive text content.
  |
  |-- By placeholder (no visible label) -->
  |     getByPlaceholderText(/search/i)
  |     Last resort before getByTestId.
  |
  |-- By test ID (absolutely no other option) -->
        getByTestId('order-list')
        Brittle. Avoids user-facing queries. Document why.
```

### Mock Strategy Decision Tree
```
What does the component depend on?
  |-- API calls -->
  |     MSW (Mock Service Worker) — intercepts at network level
  |     No module mocking needed, tests use real fetch
  |
  |-- Third-party libraries (auth, analytics) -->
  |     Module mock: vi.mock('@auth/client')
  |     Only for libraries where MSW can't intercept
  |
  |-- Context / providers -->
  |     Wrap in test provider with controlled values
  |     Test with different provider values
  |
  |-- Feature flags -->
        MockFlagClient with specific flag values
        Test enabled and disabled states
```

---

## Workflow

### Step 1: Query Priority
| Query | When to Use |
|-------|-------------|
| getByRole | Preferred. Finds by ARIA role + accessible name. |
| getByLabelText | Form fields. Links label to input via for/id or aria-labelledby. |
| getByPlaceholderText | Only if no label exists. Last resort before getByTestId. |
| getByText | Non-interactive elements (paragraphs, headings, spans). |
| getByTestId | Absolute last resort. Brittle — avoids user-facing queries. |

### Step 2: Component Test Structure
```typescript
describe('UserForm', () => {
  const setup = () => {
    const onSubmit = vi.fn()
    render(<UserForm onSubmit={onSubmit} />)
    return { onSubmit }
  }

  it('should show validation error when email is invalid', async () => {
    setup()
    const emailInput = screen.getByLabelText(/email/i)
    await userEvent.type(emailInput, 'invalid-email')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })

  it('should call onSubmit when form is valid', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/name/i), 'John')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      name: 'John',
    })
  })

  it('should have no accessibility violations', async () => {
    const { container } = render(<UserForm onSubmit={vi.fn()} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Step 3: E2E Tests (Playwright)
```typescript
test('user can complete checkout flow', async ({ page }) => {
  await page.goto('/products')
  await page.getByRole('button', { name: /add to cart/i }).first().click()
  await page.getByRole('link', { name: /cart/i }).click()
  await page.getByRole('button', { name: /checkout/i }).click()
  await page.getByLabelText(/email/i).fill('user@example.com')
  await page.getByRole('button', { name: /place order/i }).click()
  await expect(page.getByText(/order confirmed/i)).toBeVisible()
})
```

E2E rules:
- 5-10 E2E tests per application. Only critical user journeys (signup, purchase, core feature).
- Test on both desktop and mobile viewport.
- No shared state between tests. Each test is independent.

### Step 4: What NOT to Test
- Internal state values (useState, signals, reactive refs).
- Private methods or helper functions that are implementation details.
- CSS classes (unless they convey meaning, like dynamic visibility classes).
- Snapshot tests. They fail on every formatting change and hide meaningful differences.
- Framework internals (React reconciler, Vue reactivity system, Angular change detection).

### Step 5: Coverage Targets
| Type | Target | What It Covers |
|------|--------|----------------|
| Component tests | >= 70% of components | Each component's states rendered and interacted |
| Integration | >= 50% of feature flows | Multi-component interaction |
| E2E | 100% of critical paths | User journeys |
| Accessibility | 100% of components | axe-core assertions |

### Step 6: MSW Integration
```typescript
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ])
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('displays users from API', async () => {
  render(<UserList />)
  expect(await screen.findByText('Alice')).toBeInTheDocument()
  expect(await screen.findByText('Bob')).toBeInTheDocument()
})
```

### Step 6b: Playwright Advanced Patterns
```typescript
// Custom fixture with authenticated state
// fixtures.ts
import { test as base, type Page } from '@playwright/test'

type MyFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.getByLabelText(/email/i).fill('test@example.com')
    await page.getByLabelText(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/dashboard')
    await use(page)
  },
})

// Usage
test('user can create invoice', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/invoices/new')
  await authenticatedPage.getByLabelText(/amount/i).fill('100')
  await authenticatedPage.getByRole('button', { name: /save/i }).click()
  await expect(authenticatedPage.getByText(/invoice created/i)).toBeVisible()
})
```

```typescript
// API mocking in Playwright
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { 'x-test-mode': 'true' },
  },
})

// Block third-party requests for faster tests
test.use({
  blockURLs: ['https://www.googletagmanager.com/', 'https://cdn.segment.com/'],
})

// Mock API responses per test
test('shows empty state when no orders exist', async ({ page }) => {
  await page.route('**/api/orders/**', async (route) => {
    await route.fulfill({ json: { orders: [] } })
  })
  await page.goto('/orders')
  await expect(page.getByText(/no orders yet/i)).toBeVisible()
})
```

### Step 6c: Visual Regression Testing
```typescript
// Perceptual diff (Playwright)
import { test, expect } from '@playwright/test'

test('homepage matches snapshot', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 100, // allow minor anti-aliasing differences
    fullPage: true,
  })
})

// Component-level (Chromatic via Storybook)
// Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = {
  component: Button,
  parameters: { chromatic: { diffThreshold: 0.2 } },
} satisfies Meta<typeof Button>

export default meta

export const Primary: StoryObj<typeof meta> = {
  args: { variant: 'primary', children: 'Click Me' },
}

// CI integration: chromatic detects visual diffs and prompts approval
```

### Step 6d: Testing Framework-Specific Patterns
```typescript
// React — test hooks with renderHook
import { renderHook, act } from '@testing-library/react'

it('increments counter', () => {
  const { result } = renderHook(() => useState(0))
  act(() => { result.current[1](result.current[0] + 1) })
  expect(result.current[0]).toBe(1)
})

// Vue — test composables with mount
import { mount } from '@vue/test-utils'

it('emits submit event', async () => {
  const wrapper = mount(LoginForm)
  await wrapper.find('input[type="email"]').setValue('user@example.com')
  await wrapper.find('form').trigger('submit.prevent')
  expect(wrapper.emitted('submit')).toBeTruthy()
})

// Angular — test with TestBed
import { TestBed } from '@angular/core/testing'

it('displays user name', () => {
  const fixture = TestBed.createComponent(UserProfileComponent)
  fixture.componentInstance.user = { name: 'Alice' }
  fixture.detectChanges()
  expect(fixture.nativeElement.textContent).toContain('Alice')
})
```

### Step 6e: Test Performance & CI Optimization
```yaml
# .github/workflows/test.yml
name: Tests
on: [pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx vitest --shard=${{ matrix.shard }}/${{ strategy.job-total }}
        # Split 1000 tests across 4 shards: ~250 tests each
    strategy:
      matrix:
        shard: [1, 2, 3, 4]

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --workers=4
```

```typescript
// Skip slow tests in watch mode
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    testTimeout: process.env.CI ? 30000 : 10000,
    retry: process.env.CI ? 2 : 0, // retry flaky tests in CI
  },
})
```

### Step 7: Testing Async Operations
```typescript
it('shows loading then data', async () => {
  render(<UserList />)
  expect(screen.getByRole('status')).toBeInTheDocument() // loading state
  expect(await screen.findByRole('list')).toBeInTheDocument() // data loaded
})

it('shows error state on API failure', async () => {
  server.use(
    http.get('/api/users', () => {
      return new HttpResponse(null, { status: 500 })
    })
  )

  render(<UserList />)
  expect(await screen.findByText(/failed to load/i)).toBeInTheDocument()
})
```

## Common Pitfalls

### 1. Testing Implementation Details
```typescript
// BAD -- tests internal state
expect(counter.state.count).toBe(1)

// GOOD -- tests user-visible behavior
expect(screen.getByText('1')).toBeInTheDocument()
```

### 2. Snapshot Tests
Snapshots fail on every formatting change (Prettier, whitespace, comments). They create false negatives and desensitize developers to real failures. Prefer explicit assertions.

### 3. fireEvent Instead of userEvent
```typescript
// BAD -- doesn't simulate real browser behavior
fireEvent.change(input, { target: { value: 'test' } })

// GOOD -- simulates real typing
await userEvent.type(input, 'test')
```

### 4. Overusing getByTestId
Every getByTestId is a missed opportunity to test accessibility. If you can't find an element by role/label/text, your component likely has accessibility issues.

### 5. Shared Test State
Tests that share mutable state are flaky and order-dependent. Use `beforeEach` to reset state.

### 6. Flaky E2E Tests
Network-dependent tests fail intermittently. Use retries for flaky tests and stable selectors (getByRole, getByLabelText) over CSS/XPath.
```typescript
// Playwright auto-retry pattern
await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 10000 })
```

### 7. Over-Mocking
Mocking too many dependencies creates tests that pass but don't test real behavior. MSW at network level is preferred; avoid mocking utilities, formatters, and framework internals.

## Compared With

| Tool | Type | Speed | Purpose |
|------|------|-------|---------|
| Vitest | Unit/Component | Fastest | Component tests, pure logic |
| Jest | Unit/Component | Fast | Legacy projects |
| Testing Library | Utility | N/A | Query patterns (used with Vitest/Jest) |
| Playwright | E2E | Slowest | Critical user journeys |
| Cypress | E2E | Slow | Critical user journeys, debugging |
| MSW | Mocking | N/A | Network-level API mocking |
| Chromatic | Visual | Slow | Visual regression (diff-based) |

## Performance Considerations

- Component tests: ~10-50ms per test. 100 tests = 1-5s total
- E2E tests: ~5-30s per test. 10 critical tests = 50-300s
- MSW intercepts at the network level — near-zero performance overhead
- `axe` accessibility check adds ~100-500ms per test
- E2E parallelization: Playwright can run tests in parallel across multiple workers
- Sharding: split 1000 tests across 4 CI runners → ~250 tests each, 4x faster
- `test.concurrent` for independent integration tests reduces suite time

## Accessibility Considerations

- Every component test should include an axe-core assertion
- `getByRole` tests that the component is semantically correct
- `getByLabelText` tests form field labeling
- `userEvent.tab()` tests keyboard navigation and focus order
- Test with `prefers-reduced-motion: reduce` if animation is present
- Test color contrast by asserting no axe violations on dynamic states

## Rules
- One describe = one component. One it = one user behavior.
- userEvent simulates real browser interactions (clicks, typing, tabbing). fireEvent does not.
- Mock only at the network level (MSW). Never mock individual modules.
- E2E tests run against a real backend (staging or test environment).
- data-testid is the last resort. Prefer getByRole and getByLabelText.
- All tests are deterministic. No Math.random(), no Date.now() without mocking.
- No snapshot tests. Use explicit assertions or visual regression tools.
- E2E test count < 10 per app. More means too many brittle tests.

## References
  - references/component-test-patterns.md — Component Test Patterns
  - references/msw-api-mocking.md — MSW API Mocking
  - references/testing-ci.md — Testing CI/CD Integration
  - references/testing-library-guide.md — Testing Library Guide
  - references/testing-patterns.md — Testing Patterns
  - references/testing-tools.md — Testing Tools Guide
## Handoff
No artifact produced.
Next skill: {framework}-architecture or code-review.
Carry forward: testing framework, E2E setup, coverage targets.
