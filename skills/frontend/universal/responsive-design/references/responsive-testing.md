# Responsive Testing

## Testing Strategy

```
Manual testing (browser DevTools)
  ├── Device emulation (preset viewports)
  ├── Responsive mode (drag to resize)
  └── Touch simulation
      │
Automated testing
  ├── Visual regression (Chromatic, Percy)
  ├── Layout tests (jsdom with window resize)
  └── E2E (Playwright, Cypress with viewports)
```

## Visual Regression Testing

```typescript
// Chromatic: test each story at multiple viewports
// .storybook/preview.ts
const preview: Preview = {
  parameters: {
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
    },
    chromatic: {
      viewports: [375, 768, 1280],
    },
  },
}

// Story-level viewport override
export const MobileView: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    chromatic: { viewports: [375] },
  },
}
```

## Playwright Viewport Testing

```typescript
import { test, expect } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

viewports.forEach(({ name, width, height }) => {
  test(`homepage layout at ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')

    // Check key layout elements
    if (name === 'desktop') {
      await expect(page.locator('.sidebar')).toBeVisible()
      await expect(page.locator('.hamburger')).toBeHidden()
    } else {
      await expect(page.locator('.sidebar')).toBeHidden()
      await expect(page.locator('.hamburger')).toBeVisible()
    }

    // No horizontal scroll
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(pageWidth).toBeLessThanOrEqual(width + 1)
  })
})
```

## Cypress Viewport Testing

```typescript
describe('responsive navigation', () => {
  const sizes = [
    { width: 375, height: 667, isMobile: true },
    { width: 768, height: 1024, isMobile: false },
    { width: 1280, height: 800, isMobile: false },
  ]

  sizes.forEach(({ width, height, isMobile }) => {
    it(`shows ${isMobile ? 'hamburger' : 'full nav'} at ${width}x${height}`, () => {
      cy.viewport(width, height)
      cy.visit('/')

      if (isMobile) {
        cy.get('.hamburger').should('be.visible')
        cy.get('.nav-links').should('not.be.visible')
      } else {
        cy.get('.hamburger').should('not.be.visible')
        cy.get('.nav-links').should('be.visible')
      }
    })
  })
})
```

## Layout Test Patterns

```typescript
import { render, screen } from '@testing-library/react'

function setViewport(width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
}

describe('ResponsiveGrid', () => {
  it('shows single column on mobile', () => {
    setViewport(375)
    render(<ResponsiveGrid items={items} />)
    const grid = screen.getByTestId('grid')
    expect(grid).toHaveStyle({ gridTemplateColumns: '1fr' })
  })

  it('shows two columns on tablet', () => {
    setViewport(768)
    render(<ResponsiveGrid items={items} />)
    const grid = screen.getByTestId('grid')
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' })
  })
})
```

## Container Query Testing

```typescript
// Container queries test differently — they respond to container size
it('adapts layout within container', () => {
  const { container } = render(
    <div style={{ width: '300px' }}>
      <ResponsiveCard />
    </div>
  )
  expect(container.querySelector('.card')).toHaveStyle({ flexDirection: 'column' })

  // Re-render with wider container
  const { container: wide } = render(
    <div style={{ width: '500px' }}>
      <ResponsiveCard />
    </div>
  )
  expect(wide.querySelector('.card')).toHaveStyle({ flexDirection: 'row' })
})
```

## Touch Target Testing

```typescript
it('touch targets are at least 44x44px on mobile', () => {
  setViewport(375)
  render(<Toolbar />)

  const buttons = screen.getAllByRole('button')
  buttons.forEach(btn => {
    const styles = window.getComputedStyle(btn)
    const width = parseFloat(styles.minWidth)
    const height = parseFloat(styles.minHeight)
    expect(width >= 44 || btn.offsetWidth >= 44).toBe(true)
    expect(height >= 44 || btn.offsetHeight >= 44).toBe(true)
  })
})
```

## Accessibility Testing across Breakpoints

```typescript
it('hamburger menu is accessible on mobile', async () => {
  setViewport(375)
  render(<ResponsiveNav />)

  const toggle = screen.getByLabelText('Toggle menu')
  expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await userEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('navigation')).toBeVisible()
})
```

## Responsive Testing Checklist

- [ ] Test at minimum 3 viewports: 375px, 768px, 1280px
- [ ] No horizontal scroll at any viewport
- [ ] Touch targets ≥ 44x44 on mobile
- [ ] Font sizes legible (no text overflow) at all breakpoints
- [ ] Navigation works (hamburger menu accessible)
- [ ] Images scale correctly (no overflow, proper aspect ratio)
- [ ] Tables scroll horizontally or adapt on mobile
- [ ] Forms usable on touch devices (fields not overlapping)
- [ ] Keyboard navigation works at all breakpoints
- [ ] Visual regression test at each breakpoint
- [ ] Container queries tested independently of viewport
