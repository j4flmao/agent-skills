# Accessibility Tools

## Automated Testing Tools

| Tool | Type | Best For |
|------|------|----------|
| axe-core | Library | Unit/integration tests |
| Pa11y | CLI | CI pipelines, URL scanning |
| Lighthouse | Browser | Auditing, CI |
| WAVE | Browser extension | Manual inspection |
| Accessibility Insights | Extension | Guided manual testing |
| Chrome DevTools | Built-in | Quick element inspection |

## axe-core Setup

```bash
npm install -D @axe-core/playwright @axe-core/cli
```

```typescript
// axe-core with jest
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

// axe-core with Playwright
test('page is accessible', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toHaveLength(0)
})
```

## Pa11y CI

```json
{
  "urls": ["https://example.com/", "https://example.com/about", "https://example.com/contact"],
  "defaults": {
    "standard": "WCAG2AA",
    "hideElements": ".google-analytics",
    "timeout": 30000
  }
}
```

```bash
npx pa11y-ci
```

## Color Contrast Tools

| Tool | Type | URL |
|------|------|-----|
| WebAIM Contrast Checker | Online | webaim.org/resources/contrastchecker |
| Stark | Figma/Sketch plugin | getstark.co |
| Colour Contrast Analyser | Desktop app | tpq.io/colourcontrast |
| Chrome DevTools | Built-in | Elements > Styles > Color picker |

## Screen Readers

| Reader | Platform | Free |
|--------|----------|------|
| VoiceOver | macOS, iOS | Built-in |
| NVDA | Windows | Free |
| JAWS | Windows | Paid |
| TalkBack | Android | Built-in |
| Narrator | Windows | Built-in |

## Focus Management Tools

```typescript
// Tab key focus testing
it('focuses first focusable element in modal', async () => {
  render(<Modal />)
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: /close/i }))
})

it('traps focus inside modal', async () => {
  render(<Modal />)
  await userEvent.tab()
  await userEvent.tab()
  await userEvent.tab()
  // Should cycle back to first element
  expect(document.activeElement).toBe(screen.getByRole('button', { name: /close/i }))
})
```

## CI Integration

```yaml
# .github/workflows/a11y.yml
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --config=playwright.a11y.config.ts
      - run: npx pa11y-ci --sitemap https://staging.example.com/sitemap.xml
```

## Browser Extensions

| Extension | Browser | Purpose |
|-----------|---------|---------|
| axe DevTools | Chrome/Firefox | Automated scan |
| WAVE | Chrome/Firefox | Visual overlay |
| Accessibility Insights | Chrome | Guided testing |
| Siteimprove | Chrome | Continuous monitoring |
| Landmarks | Chrome | Navigation audit |
| HeadingsMap | Chrome | Heading structure |
