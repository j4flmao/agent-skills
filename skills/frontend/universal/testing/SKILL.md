---
name: frontend-testing
description: >
  Use this skill when the user says 'frontend testing', 'component test', 'React testing', 'Vue testing', 'Angular testing', 'testing library', 'Cypress', 'Playwright', 'snapshot test', 'what to test frontend', or when writing frontend tests. This skill enforces: Testing Library queries by user-facing attributes (getByRole, getByLabelText), userEvent over fireEvent, component tests for every component state, E2E for critical journeys only (5-10 per app), accessibility assertions in every test, and zero snapshot tests. Works with any frontend framework. Do NOT use for: backend testing, API testing, or manual QA.
version: "1.0.0"
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
