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

## Accessibility Considerations

- Every component test should include an axe-core assertion
- `getByRole` tests that the component is semantically correct
- `getByLabelText` tests form field labeling
- `userEvent.tab()` tests keyboard navigation and focus order
- Test with `prefers-reduced-motion: reduce` if animation is present

## Rules
- One describe = one component. One it = one user behavior.
- userEvent simulates real browser interactions (clicks, typing, tabbing). fireEvent does not.
- Mock only at the network level (MSW). Never mock individual modules.
- E2E tests run against a real backend (staging or test environment).
- data-testid is the last resort. Prefer getByRole and getByLabelText.
- All tests are deterministic. No Math.random(), no Date.now() without mocking.

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
