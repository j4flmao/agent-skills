# Accessibility Testing and Auditing

## Overview
Accessibility testing ensures web applications are usable by people with disabilities. Testing combines automated tools, manual audits, and assistive technology testing.

## Automated Testing

### Axe Core
```typescript
import axe from 'axe-core';

// Run axe against the document
axe.run(document, {
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  rules: {
    'color-contrast': { enabled: true },
    'heading-order': { enabled: true },
    'label': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
  },
}).then((results) => {
  console.log('Violations:', results.violations.length);
  console.log('Passes:', results.passes.length);
  console.log('Incomplete:', results.incomplete.length);
  console.log('Inapplicable:', results.inapplicable.length);

  results.violations.forEach((violation) => {
    console.log(`Rule: ${violation.id}`);
    console.log(`Impact: ${violation.impact}`);
    console.log(`Help: ${violation.help}`);
    console.log(`Help URL: ${violation.helpUrl}`);

    violation.nodes.forEach((node) => {
      console.log(`Element: ${node.html}`);
      console.log(`Target: ${node.target.join(', ')}`);
      node.failureSummary && console.log(`Summary: ${node.failureSummary}`);
    });
  });
});
```

### Integration with Testing
```typescript
// Jest with axe
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

test('component should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('specific rules', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: false }, // Skip contrast for this test
      'aria-allowed-role': { enabled: true },
    },
  });
  expect(results).toHaveNoViolations();
});
```

### Cypress Axe
```typescript
// Cypress test with axe
describe('Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should have no violations on home page', () => {
    cy.checkA11y();

    // Check specific elements
    cy.checkA11y('main', {
      runOnly: ['wcag2a', 'wcag2aa'],
    });
  });

  it('should handle navigation with keyboard', () => {
    cy.checkA11y('nav');

    // Tab through navigation
    cy.get('nav').first().focus();
    cy.focused().should('have.attr', 'role', 'navigation');
  });

  it('modal should trap focus', () => {
    cy.get('[data-testid="open-modal"]').click();
    cy.checkA11y('[role="dialog"]', {
      rules: {
        'color-contrast': { enabled: false },
      },
    });
    cy.focused().should('have.attr', 'autofocus');
  });
});
```

## Lighthouse Audits

### Programmatic Lighthouse
```typescript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function auditAccessibility(url: string) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['accessibility'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options);
  const accessibility = runnerResult.lhr.categories.accessibility;

  console.log(`Accessibility Score: ${accessibility.score * 100}`);

  // Detailed audit results
  const auditRefs = accessibility.auditRefs;
  for (const ref of auditRefs) {
    const audit = runnerResult.lhr.audits[ref.id];
    if (audit.score !== 1) {
      console.log(`Failed: ${audit.title}`);
      console.log(`  Score: ${audit.score}`);
      console.log(`  Description: ${audit.description}`);
    }
  }

  await chrome.kill();
  return runnerResult.lhr;
}
```

## Manual Testing Checklist

### Keyboard Navigation
```typescript
test('full keyboard navigation', async () => {
  const page = await browser.newPage();
  await page.goto('https://example.com');

  // Tab through all interactive elements
  let previousElement = null;
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        role: el?.getAttribute('role'),
        text: el?.textContent?.slice(0, 50),
        focusVisible: window.getComputedStyle(el!).outlineStyle !== 'none',
      };
    });

    if (focused.tag === 'BODY') break;
    expect(focused.focusVisible).toBe(true);
    previousElement = focused;
  }
});
```

### Screen Reader Testing
```typescript
// Simulating screen reader output
test('announces dynamic content', async () => {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');

  // Listen for aria-live region updates
  const announcements: string[] = [];
  await page.exposeFunction('onAnnouncement', (text: string) => {
    announcements.push(text);
  });

  await page.evaluate(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute('aria-live')) {
            (window as any).onAnnouncement(target.textContent);
          }
        }
      });
    });

    document.querySelectorAll('[aria-live]').forEach((el) => {
      observer.observe(el, { childList: true, subtree: true });
    });
  });

  // Trigger an action that updates live region
  await page.click('[data-testid="add-to-cart"]');
  await page.waitForTimeout(500);

  expect(announcements).toContain('Item added to cart');
});
```

## CI Integration

### Accessibility in CI
```yaml
# .github/workflows/a11y.yml
name: Accessibility Checks

on: [push, pull_request]

jobs:
  pa11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm start & npx wait-on http://localhost:3000
      - run: npx pa11y-ci --sitemap http://localhost:3000/sitemap.xml

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun --collect.url=http://localhost:3000 \
                       --collect.numberOfRuns=3 \
                       --assert.assertions.accessibility=error
```

## Decision Trees

### When to Use Each Testing Method
```
Is it a code-level check?
├── Yes → Is it a unit test?
│   ├── Yes → jest-axe (component-level assertions)
│   └── No → Pa11y CI / axe-core (HTML validation)
├── No → Is it a visual/interaction check?
│   ├── Yes → Is it during development?
│   │   ├── Yes → axe DevTools / Lighthouse (quick feedback)
│   │   └── No → Cypress-axe / Playwright (E2E assertions)
│   └── No → Is it a user experience check?
│       ├── Yes → Manual testing (keyboard + screen reader)
│       └── No → User testing with assistive tech
```

### Choose Screen Reader for Testing
```
Which platform?
├── Windows → Does the user prefer free or commercial?
│   ├── Free → NVDA (most popular, frequent updates)
│   └── Commercial → JAWS (enterprise standard)
├── macOS → VoiceOver (built-in, excellent WebKit support)
└── Linux → Orca (only option, limited browser support)
```

## Anti-Patterns
- **Relying solely on automated tools**: Only catches 30-50% of issues
- **Not testing with real screen readers**: Automated tools miss UX issues
- **Testing only in one browser**: Different AT/browser combinations behave differently
- **Ignoring zoom testing**: Critical for low-vision users
- **Testing only happy paths**: Test error states, edge cases, loading states
- **No keyboard-only testing**: Many issues only surface via keyboard navigation
- **Focus order ≠ visual order**: Tab order must match visual layout
- **Skipping reduced-motion testing**: Animations can cause vestibular issues
- **Testing without real content**: Lorum ipsum testing misses real-world issues
- **No accessibility regression suite**: New features introduce new issues

## CI Integration Patterns

### GitHub Actions
```yaml
name: Accessibility
on: [pull_request]
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Run axe checks
        run: npx pa11y-ci --config .pa11yci
      - name: Run jest-axe
        run: npm test -- --testPathPattern=a11y
```

### Playwright with axe
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no detectable a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('dynamic modal is accessible', async ({ page }) => {
  await page.goto('/');
  await page.click('#open-modal');
  await page.waitForSelector('[role="dialog"]');
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Cypress with cypress-axe
```typescript
describe('Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('Has no violations on load', () => {
    cy.checkA11y();
  });

  it('Has no violations after interaction', () => {
    cy.get('#expand-section').click();
    cy.checkA11y('#expanded-content', {
      runOnly: ['wcag2a', 'wcag2aa'],
    });
  });
});
```

## Manual Testing Checklist

### Keyboard Navigation
```
□ All interactive elements reachable via Tab
□ Tab order follows visual order
□ Focus indicators clearly visible on all elements
□ No focus traps (unless intentional, like modals)
□ Escape closes modals, menus, dropdowns
□ Arrow keys work for list navigation
□ Enter/Space activate buttons and links
□ Skip link visible on first Tab press
□ Custom widgets follow ARIA keyboard patterns
```

### Screen Reader Testing
```
□ Page title describes content/purpose
□ Landmarks (nav, main, aside) properly labeled
□ Headings structure is logical (no skipped levels)
□ Images have meaningful alt text (or role="presentation")
□ Links are descriptive ("Learn more about pricing", not "click here")
□ Forms have associated labels
□ Error messages are announced
□ Dynamic content updates announced via aria-live
□ Tables have headers (scope or id/headers)
□ Custom controls announce role, state, and name
```

### Zoom and Resize
```
□ 200% zoom: all content visible without horizontal scroll
□ 400% zoom: content reflows without truncation
□ Browser zoom (Ctrl+/-) works correctly
□ Text spacing (1.5 line height, 2em paragraph, etc.) doesn't break layout
□ Responsive layout at 320px viewport width
□ Touch targets at least 44x44px on mobile
```

## Automated Tool Configuration

### axe-core Configuration
```javascript
// .pa11yci
{
  "defaults": {
    "timeout": 1000,
    "viewport": { "width": 1280, "height": 720 },
    "standard": "WCAG2AA",
    "runners": ["axe"],
    "includeWarnings": true,
    "ignore": ["color-contrast"],
    "runOnly": {
      "type": "tag",
      "values": ["wcag2a", "wcag2aa"]
    }
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/about",
    "http://localhost:3000/contact"
  ]
}
```

### jest-axe Configuration
```javascript
import { configureAxe } from 'jest-axe';

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    'region': { enabled: true },
  },
});

expect.extend(toHaveNoViolations);

test('component passes accessibility', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Key Points
- Automated testing catches 30-50% of accessibility issues
- axe-core provides comprehensive rule-based testing
- jest-axe integrates with unit tests
- Cypress axe enables E2E accessibility assertions
- Lighthouse generates accessibility scores with recommendations
- Pa11y CI automates accessibility in CI pipelines
- Keyboard testing verifies all functionality without mouse
- Focus indicators must be visible (outline, contrast)
- Tab order follows visual order
- Skip links provide navigation bypass
- Screen reader testing validates real-world experience
- VoiceOver (macOS), NVDA (Windows), and JAWS (Windows) are common screen readers
- Dynamic content must be announced via aria-live
- Zoom testing up to 400% without horizontal scroll
- Color contrast testing with tools (WebAIM, axe)
- Touch target size minimum 44x44 pixels
- Motion/movement must be pausable (prefers-reduced-motion)
- PDF accessibility includes tags and reading order
- Video accessibility requires captions and transcripts
- WCAG conformance levels: A, AA, AAA
- Four principles: Perceivable, Operable, Understandable, Robust
- Automated + manual + user testing provides complete coverage
- Accessibility regression tests prevent new issues
- Accessibility statement documents current compliance level
- VPAT (Voluntary Product Accessibility Template) documents conformance
- Include axe checks in CI pipeline (fail build on violations)
- Run full manual audit quarterly or before major releases
- Test with multiple screen readers (NVDA + VoiceOver minimum)
- Use prefers-reduced-motion media query to pause animations
