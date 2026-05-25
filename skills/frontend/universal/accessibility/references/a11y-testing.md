# Accessibility Testing Patterns

## Testing with axe-core

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('should have no accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Testing with Cypress + cypress-axe

```typescript
// cypress/support/e2e.ts
import 'cypress-axe'

// Component test
it('should pass a11y audit', () => {
  cy.mount(<LoginForm />)
  cy.injectAxe()
  cy.checkA11y()
})

// Page-level test
it('home page passes a11y', () => {
  cy.visit('/')
  cy.injectAxe()
  cy.checkA11y({
    runOnly: { type: 'tag', values: ['wcag2aa', 'wcag21aa'] },
  })
})
```

## Testing with Playwright

```typescript
import { test, expect } from '@playwright/test'

test('should pass automated accessibility checks', async ({ page }) => {
  await page.goto('/products')
  await page.getByRole('button', { name: /add to cart/i }).click()

  // Check specific violations
  const violations = await page.evaluate(async () => {
    const { default: axe } = await import('axe-core')
    const { violations } = await axe.run()
    return violations
  })

  expect(violations).toHaveLength(0)
})
```

## Common Violations to Test For

| Violation | Check | WCAG |
|-----------|-------|------|
| Missing alt text | `img` elements without `alt` | 1.1.1 |
| Low contrast | Text/background ratio < 4.5:1 | 1.4.3 |
| Missing labels | Form inputs without aria-label or label | 1.3.1 |
| Keyboard trap | Focus cannot leave an element | 2.1.2 |
| Missing heading levels | Skipped h1-h6 hierarchy | 1.3.1 |
| Duplicate IDs | Same id on multiple elements | 4.1.1 |

## Integration Tests

```typescript
it('announces dynamic content changes', async () => {
  render(<NotificationSystem />)
  const liveRegion = screen.getByRole('status')
  expect(liveRegion).toHaveAttribute('aria-live', 'polite')
})

it('focuses first error on form submission', async () => {
  const { container } = render(<FormWithValidation />)
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))
  expect(screen.getByRole('alert')).toHaveFocus()
})
```

## CI Integration

```yaml
# .github/workflows/a11y.yml
jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npx pa11y-ci --sitemap https://example.com/sitemap.xml
```
