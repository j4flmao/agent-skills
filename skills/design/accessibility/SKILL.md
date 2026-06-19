---
name: design-accessibility
description: >
  Use this skill when addressing accessibility, a11y, WCAG compliance, screen reader support, keyboard navigation, color contrast, ARIA patterns, or inclusive design. This skill enforces: WCAG 2.2 AA compliance (AAA where possible), semantic HTML structure, correct ARIA patterns, keyboard interaction design, sufficient color contrast, and screen reader testing protocol. Do NOT use for: general frontend performance optimization, visual design aesthetics, or mobile gesture-only interactions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, frontend, phase-10]
---

# Design Accessibility

## Purpose
Ensure digital products meet WCAG compliance with semantic HTML, correct ARIA, keyboard support, and inclusive patterns. Enable users of all abilities to perceive, understand, navigate, and interact with digital products effectively and independently.

## Agent Protocol

### Trigger
Exact user phrases: "accessibility", "a11y", "WCAG", "screen reader", "keyboard navigation", "color contrast", "ARIA", "inclusive design", "accessible", "508 compliance", "disabled users".

### Input Context
Before activating, verify:
- Target WCAG level (A, AA, or AAA)
- Supported assistive technologies (screen readers, voice control)
- Component or page scope (entire app vs specific feature)
- Current accessibility baseline (none, partial, audited)
- Regulatory requirements (section 508, ADA, EAA)
- Design system or component library being used

### Output Artifact
Accessibility audit with WCAG compliance plan, ARIA patterns, and testing strategy.

### Response Format
```yaml
# WCAG compliance status per criterion
# Audit findings with severity, location, and fix
```
```html
<!-- Correct ARIA patterns -->
<!-- Keyboard interaction implementation -->
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] WCAG level target confirmed (AA minimum)
- [ ] Color contrast ratios verified (4.5:1 text, 3:1 large text)
- [ ] All interactive elements keyboard accessible
- [ ] ARIA landmarks defined for page structure
- [ ] Screen reader announcements verified for dynamic content
- [ ] Focus management implemented (visible focus, logical order)
- [ ] Automated a11y tests configured (axe/Lighthouse)
- [ ] Manual keyboard audit completed
- [ ] Screen reader testing completed on target platforms
- [ ] Accessibility documentation created for reusable patterns

### Max Response Length
200 lines of spec, patterns, and configuration.

## Framework/Methodology

### POUR Framework
WCAG is organized around four principles:

| Principle | Focus | WCAG Criteria Examples |
|-----------|-------|----------------------|
| Perceivable | Content must be available to the senses | 1.1.1 Non-text Content, 1.4.3 Contrast Minimum |
| Operable | UI components must be usable | 2.1.1 Keyboard, 2.4.7 Focus Visible |
| Understandable | Content and UI must be comprehensible | 3.2.3 Consistent Navigation, 3.3.2 Labels |
| Robust | Content must work with assistive technologies | 4.1.2 Name Role Value, 4.1.3 Status Messages |

### WCAG Compliance Levels

| Level | Criteria Count | Requirements | Target Scenarios |
|-------|---------------|--------------|------------------|
| A | 30 | Minimum accessibility, essential support | All public content |
| AA | 20 (additional) | Acceptable for most users, standard target | Business, e-commerce, SaaS |
| AAA | 28 (additional) | Enhanced accessibility, specialized | Government, healthcare, finance |

### Accessibility Maturity Model

| Level | Name | Characteristics | Testing |
|-------|------|-----------------|---------|
| 1 | Unaware | No accessibility knowledge, no testing | None |
| 2 | Reactive | Fixes issues found by users or audits | Manual audits |
| 3 | Proactive | Basic accessibility in design and development | Automated checks in CI |
| 4 | Integrated | Accessibility built into design system and workflow | Automated + manual + user testing |
| 5 | Inclusive | Accessibility is a core product value, not compliance | Continuous testing with assistive tech users |

### Inclusive Design Principles

| Principle | Application |
|-----------|-------------|
| Recognize exclusion | Design for edge cases first, then adapt for typical users |
| Solve for one, extend to many | Accessibility improvements often benefit all users |
| Learn from diversity | Include people with disabilities in research and testing |
| Provide equivalent experience | All users should have access to same information and functionality |
| Consider situational disabilities | Bright sunlight, noisy environment, mobile use, temporary injury |

## Workflow

### Step 1: WCAG Level Target
AA minimum for all public-facing interfaces. AAA for: government, healthcare, financial, educational. If budget/time constrained, prioritize AA and document AAA gaps. Perceivable, Operable, Understandable, Robust (POUR) — every fix maps to at least one principle.

Assess current state against target level:
1. Run automated scan (axe/Lighthouse) for baseline
2. Manual keyboard audit (can all functionality be accessed?)
3. Screen reader audit (can content be understood audibly?)
4. Compile findings into severity matrix
5. Estimate effort and prioritize fixes

### Step 2: Semantic HTML
Use native HTML elements before ARIA: `<nav>` not `<div role="navigation">`, `<button>` not `<div role="button">`, `<heading>` elements in correct hierarchy (h1 → h2 → h3, no skipping). Landmarks: `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`. Each page has exactly one `<main>`.

Semantic HTML benefits:
- Built-in keyboard accessibility (native elements handle Tab, Enter, Space)
- Screen reader announcements (roles and states are pre-defined)
- SEO improvements (search engines understand structure)
- Reduced code complexity (less ARIA, less JavaScript)
- Future-proofing (browser improvements apply automatically)

### Step 3: Color Contrast
Text contrast ratios: 4.5:1 for normal text (<18px), 3:1 for large text (>=18px bold or >=24px). UI component contrast: 3:1 for borders, icons, focus indicators. Use tools: WebAIM Contrast Checker, axe DevTools, Stark plugin. Never rely on color alone to convey information — add icons, patterns, or text labels.

Contrast requirements by WCAG:

| Element | AA Required | AAA Required |
|---------|-------------|--------------|
| Normal text (<18px / <14px bold) | 4.5:1 | 7:1 |
| Large text (>=18px bold / >=24px) | 3:1 | 4.5:1 |
| UI components (borders, icons) | 3:1 | N/A |
| Focus indicator | 3:1 against adjacent colors | N/A |
| Graphs and infographics | 3:1 for data elements | N/A |

### Step 4: Keyboard Navigation
Every interactive element is reachable via Tab. Tab order matches visual order. Visible focus indicator (3:1 contrast against background, 2px minimum). No keyboard traps. Custom widgets use arrow keys for internal navigation (tablist, menu, combobox). Skip link at page start: "Skip to main content".

Keyboard interaction patterns for custom widgets:

| Widget | Expected Keyboard Behavior |
|--------|--------------------------|
| Tab/Tab panel | Tab to widget, Arrow keys to switch tabs |
| Menu/Menubar | Tab to widget, Arrow keys to navigate, Enter/Space to select |
| Accordion | Tab to accordion, Enter/Space to toggle, Arrow keys if single-section navigation |
| Dialog | Tab to open, Tab trap inside, Escape to close |
| Combobox | Tab to widget, Arrow keys to navigate list, Enter to select, Escape to close |
| Slider | Tab to widget, Arrow keys to adjust, Home/End for min/max |
| Tree | Tab to widget, Arrow keys to navigate, Enter to select, Left/Right to expand/collapse |
| Grid | Tab to grid, Arrow keys to navigate cells |
| Toolbar | Tab to toolbar, Arrow keys to navigate items |
| Carousel | Tab to carousel, Tab to navigation controls (avoid arrow key conflicts) |

### Step 5: ARIA Patterns
Use ARIA only when native HTML is insufficient. Roles: `alert`, `dialog`, `tablist`, `tab`, `tabpanel`. Properties: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-expanded`, `aria-controls`, `aria-current`. States: `aria-disabled`, `aria-hidden`, `aria-selected`, `aria-checked`. Always test ARIA with a screen reader — incorrect ARIA is worse than no ARIA.

ARIA usage rules:
- First rule of ARIA: Don't use ARIA if you can use a native HTML element
- Second rule: Don't change native semantics (don't add `role="button"` to `<h1>`)
- Third rule: All interactive ARIA widgets must be keyboard accessible
- Fourth rule: Don't use `role="presentation"` or `aria-hidden="true"` on focusable elements
- Fifth rule: All interactive elements must have an accessible name

### Step 6: Dynamic Content
Loading states: `aria-busy="true"`. Live regions: `aria-live="polite"` for non-critical updates, `aria-live="assertive"` for time-sensitive alerts. Toast/notification: `role="alert"`. Modal: trap focus inside, `role="dialog"` + `aria-modal="true"`, close on Escape. Announcements: use `aria-live` regions, not screen reader detection hacks.

### Step 7: Testing Strategy
Automated (axe DevTools, Lighthouse in CI): catches 30% of issues — contrast, ARIA, heading hierarchy, label associations. Manual: keyboard-only navigation (full pass), screen reader testing (VoiceOver macOS, NVDA Windows, TalkBack Android, VoiceOver iOS). User testing with assistive tech users for complex interactions.

Testing frequency:

| Test Type | Frequency | Tools | Issues Found |
|-----------|-----------|-------|--------------|
| Automated (CI) | Every commit | axe-core, Lighthouse, Pa11y | ~30% |
| Automated (design) | Per design review | Stark, Contrast checkers | Color, contrast |
| Manual keyboard | Per feature/cycle | Manual tab-through | ~30% |
| Screen reader | Per major release | VoiceOver, NVDA, JAWS | ~25% |
| User testing | Quarterly or per milestone | Assistive technology users | ~15% |

Common screen reader commands for testing:

| Platform | Read Content | Navigate | Interact |
|----------|-------------|----------|----------|
| VoiceOver (macOS) | VO+A | VO+Arrow | VO+Space |
| NVDA (Windows) | NVDA+Down | Tab | Enter/Space |
| JAWS (Windows) | Insert+Down | Tab | Enter/Space |
| TalkBack (Android) | Swipe right | Swipe right/left | Double tap |
| VoiceOver (iOS) | Swipe down | Swipe right/left | Double tap |

### Step 8: Accessible Forms
Every form input has a visible `<label>`. Labels must be programmatically associated (not just visually near). Error messages must be associated with inputs via `aria-describedby`. Required fields indicated with `required` attribute (not just asterisk). Success messages announced via live region.

Form accessibility checklist:
- All inputs have `<label>` with `for` attribute matching input `id`
- Required fields have `required` attribute (screen readers announce)
- Error messages linked to inputs via `aria-describedby`
- Error summary at top of form with links to error fields
- Input purpose can be programmatically determined (autocomplete attributes)
- No placeholder-only labeling (placeholder disappears on input)
- Distinct focus indicators on all form controls

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| ARIA overuse | Adding ARIA where native HTML would work | Use native elements first; ARIA only as supplement |
| Invisible focus indicators | Removing `:focus` outline for aesthetics | Design custom but visible focus indicators |
| Color-only information | Conveying meaning only through color | Add text labels, icons, or patterns |
| Missing form labels | Placeholder only instead of proper label | Always use `<label>` elements with `for` attributes |
| Incorrect heading hierarchy | Skipping levels (h1→h3) or styling non-headings | Validate heading structure in automated testing |
| Keyboard traps | Users can tab into but not out of elements | Test tab-through before every release |
| Dynamic content without announcements | Content changes without screen reader notification | Use `aria-live` regions for all dynamic updates |
| Unlabeled icon-only buttons | Buttons with icon but no text or aria-label | Always provide accessible name for interactive elements |
| Low contrast text | Light gray text on white backgrounds | Verify all text colors meet 4.5:1 minimum |
| Skipping user testing | Relying only on automated checks | Include manual and user testing at least quarterly |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Semantic HTML first — ARIA only as supplement | Native elements have built-in accessibility |
| No color-only information | Colorblind users (8% of males) cannot perceive color-coded info |
| Focus indicators are never removed | Keyboard users need visible focus to navigate |
| Every form input has a visible label | Screen readers and sighted users need labels |
| Dynamic content changes announced via live regions | Screen reader users need to know about changes |
| Tab order = DOM order | Avoids confusing navigation sequences |
| Automated testing catches syntax, human testing catches experience | Both are necessary |
| `prefers-reduced-motion` respected for all animations | Prevents discomfort for users with vestibular disorders |
| Test with real assistive technology users | Finds issues automated and manual testing miss |
| Document accessible patterns in design system | Prevents recurring accessibility debt |

## Templates & Tools

### Accessibility Audit Template
```
Issue: {description}
WCAG Criterion: {SC number}
Severity: {Critical / Major / Minor / Suggestion}
Location: {URL or component path}
Current Behavior: {what happens}
Expected Behavior: {what should happen}
Fix: {specific remediation steps}
Owner: {person responsible}
Status: {Open / In Progress / Fixed / Verified}
```

### Focus Management Implementation
```javascript
function handleDialogOpen(dialogEl) {
  const previousFocus = document.activeElement;
  dialogEl.show();
  trapFocus(dialogEl);

  function handleEscape(e) {
    if (e.key === 'Escape') {
      dialogEl.close();
      previousFocus.focus();
    }
  }

  document.addEventListener('keydown', handleEscape);
}
```

### Skip Link Implementation
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```
```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
```

### Automated Testing Configuration (axe-core)
```javascript
import axe from 'axe-core';

function runA11yTests() {
  axe.run(document, {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
  }, (err, results) => {
    if (err) throw err;
    console.log(`${results.violations.length} violations found`);
    results.violations.forEach(v => {
      console.log(`- ${v.id}: ${v.description}`);
      v.nodes.forEach(n => console.log(`  ${n.target}`));
    });
  });
}
```

### Testing Tools

| Tool | Type | Coverage | Integration |
|------|------|----------|-------------|
| axe DevTools | Automated browser extension | 50+ rules | Chrome, Firefox, Edge |
| Lighthouse | Automated audit | 30+ checks | Chrome DevTools, CI |
| Pa11y | Automated CI | 50+ rules | CI pipeline |
| WAVE | Visual audit overlay | Core checks | Browser extension |
| WebAIM Contrast Checker | Color contrast | Text and UI contrast | Web tool |
| Stark | Design-time contrast | Text, UI, colorblind sim | Figma, Sketch plugin |
| VoiceOver | Screen reader | Full experience | macOS, iOS built-in |
| NVDA | Screen reader | Full experience | Windows (free) |
| JAWS | Screen reader | Full experience | Windows (paid) |

## Case Studies

### Case Study 1: E-commerce Accessibility Redesign Increases Revenue
An online retailer redesigned their site for WCAG AA compliance. Changes included: semantic HTML restructuring, color contrast improvements, keyboard navigation, screen reader announcements for cart updates, and accessible form validation. Post-launch analytics showed:
- 20% increase in conversion rate from users with disabilities (estimated from assistive tech detection)
- 15% improvement in overall conversion (benefits extended to all users)
- 25% reduction in cart abandonment
- 40% reduction in form submission errors

Method: WCAG AA compliance audit → systematic remediation across 120 pages
Key insight: Accessibility improvements benefited all users, not just those with disabilities
Impact: 20% increase in conversions from assistive technology users, 15% overall

### Case Study 2: Financial Services App Keyboard Navigation
A financial services web app received complaints from users who couldn't complete transactions using keyboard alone. A full keyboard audit revealed 47 focus and navigation issues. Fixes included: skip links, logical tab order, visible focus indicators, and keyboard shortcuts for common actions. After fixes, keyboard-only task completion increased from 45% to 95%, and support tickets related to keyboard navigation dropped by 80%.

Method: Keyboard-only usability audit → systematic issue remediation
Key insight: Many power users (not just those with disabilities) prefer keyboard navigation
Impact: Keyboard task completion 45% to 95%, support tickets -80%

### Case Study 3: Design System Accessibility Integration
A SaaS company integrated accessibility into their design system by creating accessible component templates with:
- Built-in ARIA patterns for all interactive components
- Color token system enforcing minimum contrast ratios
- Focus indicator styles included in every component
- Automated testing in the component build pipeline
- Documentation for each component's accessibility features

Result: New features built with the design system achieved 95% automated compliance out of the box, reducing per-feature accessibility audit effort by 70%. Annual accessibility audit findings decreased by 60% year-over-year.

Method: Accessibility embedded in design system components, tokens, and documentation
Key insight: Upstream accessibility (in the design system) is more efficient than per-feature fixes
Impact: Per-feature a11y audit effort -70%, annual findings -60%

## Rules
- Semantic HTML first — ARIA only as supplement.
- No color-only information — always pair with text or icon.
- Focus indicators are never removed — only improved.
- Every form input has a visible `<label>`.
- Dynamic content changes are announced via live regions.
- Tab order = DOM order (avoid tabindex > 0).
- Automated testing catches syntax — human testing catches experience.
- Disable animations with `prefers-reduced-motion`.
- Every interactive element must have an accessible name.
- Heading hierarchy must be sequential (no skipping levels).
- Keyboard testing must be completed for every feature before release.
- Custom widgets must follow WAI-ARIA Authoring Practices patterns.
- Error messages must be programmatically associated with their inputs.
- All images must have alt text (decorative images get alt="").
- Touch targets must be minimum 44x44px on mobile.
- Content must not require horizontal scrolling at 320px viewport width.
- Focus must be managed programmatically for dynamic content changes.
- Accessibility fixes must be prioritized alongside functional bugs.
- Screen reader testing must include at least VoiceOver and NVDA.
- Accessibility documentation must be included in component handoff.

## Mobile Accessibility Patterns

### Touch Target Sizing
| Platform | Minimum | Recommended | Context |
|----------|---------|-------------|---------|
| iOS (HIG) | 44x44pt | 48x48pt | All interactive elements |
| Android (Material) | 48x48dp | 56x56dp | Touch targets |
| WCAG 2.2 | 24x24px | 44x44px | Level AA / AAA |

Spacing between touch targets: minimum 8px (prevents accidental taps). For targets below recommended size, increase padding inside the touch target area rather than enlarging the visual element.

### Mobile Screen Reader Patterns
| Platform | Screen Reader | Gesture | Command |
|----------|--------------|---------|---------|
| iOS | VoiceOver | Swipe right/left | Navigate between elements |
| iOS | VoiceOver | Double tap | Activate element |
| iOS | VoiceOver | Three-finger swipe | Scroll page |
| iOS | VoiceOver | Rotor (two-finger twist) | Change navigation mode |
| Android | TalkBack | Swipe right/left | Navigate between elements |
| Android | TalkBack | Double tap | Activate element |
| Android | TalkBack | Swipe up/down with one finger | Change reading mode |

Mobile accessibility testing must include: gesture-only interactions (can they be performed with screen reader gestures?), focus indicators on mobile (visible on colored backgrounds), dynamic content announcements (live regions work on mobile WebView?), orientation lock impact (can content be accessed in both orientations?).

### Mobile-Specific WCAG Criteria
- **1.3.4 Orientation**: Content must not be locked to a single orientation unless essential (e.g., piano app)
- **1.3.5 Identify Input Purpose**: Autofill attributes on form fields for password managers
- **1.4.10 Reflow**: Content must not require horizontal scrolling at 320px equivalent
- **1.4.11 Non-text Contrast**: UI components and graphic objects must have 3:1 contrast ratio
- **1.4.12 Text Spacing**: No loss of content when text spacing is overridden
- **1.4.13 Content on Hover or Focus**: Dismissible, hoverable, persistent popovers
- **2.5.5 Target Size (AAA)**: Target size at least 44x44px
- **2.5.7 Dragging Movements (AA)**: All dragging functionality must have a single-pointer alternative
- **2.5.8 Target Size (AA, 2.2 new)**: Target size at least 24x24px with exceptions

## Accessibility Governance and CI/CD

### Automated Testing in CI
```yaml
# GitHub Actions — accessibility checks
name: Accessibility CI
on: [pull_request]
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            https://staging.example.com/
            https://staging.example.com/checkout
          configPath: ./lighthouserc.js
      - name: axe-core
        run: npx axe --exit --show-errors
      - name: Pa11y CI
        run: npx pa11y-ci --sitemap https://staging.example.com/sitemap.xml
```

### Governance Maturity Levels

| Level | Practices | Enforcement | Frequency |
|-------|-----------|-------------|-----------|
| 1 | Ad hoc fixes | None | Reactive (user complaint) |
| 2 | Automated checks | CI pipeline with axe-core | Per commit |
| 3 | Manual audits | Keyboard + screen reader audits per feature | Per feature release |
| 4 | Integrated workflow | A11y in design review, dev review, QA, and CI | Every sprint |
| 5 | Inclusive culture | User testing with assistive tech, a11y metrics tracked | Continuous |

### A11y Debt Tracking
Track accessibility issues like technical debt:
- Severity: Critical (blocks task completion), Major (significant friction), Minor (annoyance), Suggestion
- Fix effort: hours estimated per issue
- Category: Perceivable, Operable, Understandable, Robust (POUR)
- Source: Automated scan, manual audit, user report

Report quarterly to leadership: total issues, issues fixed, issues added, median severity, time-to-fix by severity. Target: zero critical/major issues in production.

## Production Accessibility Checklist

### Pre-Launch Verification
- [ ] All pages pass automated axe-core scan (zero violations in wcag2a, wcag2aa)
- [ ] Manual keyboard audit: all interactive elements reachable and operable via keyboard
- [ ] Screen reader audit: all content perceivable with VoiceOver (macOS) and NVDA (Windows)
- [ ] Color contrast: all text/background combos verified programmatically (4.5:1 minimum)
- [ ] Zoom test: page renders without breakage at 200% and 400% zoom
- [ ] Focus management: visible focus indicators on all interactive elements
- [ ] Form labels: every form input has a programmatically associated label
- [ ] Error handling: form errors are announced and associated with inputs
- [ ] Dynamic content: all updates are announced via aria-live regions
- [ ] Video/audio: captions, transcripts, and accessible controls
- [ ] PDFs: tagged with proper heading hierarchy and alt text
- [ ] Mobile: 44x44px minimum touch targets, no horizontal scroll at 320px
- [ ] Reduced motion: all animations disable with `prefers-reduced-motion: reduce`

### Post-Launch Monitoring
- Monthly: automated scan of top 20 pages
- Quarterly: full keyboard audit + screen reader audit
- Bi-annually: user testing with assistive technology users
- Continuous: monitor support tickets for accessibility-related complaints
- Per release: a11y regression check on changed pages

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| **ARIA overuse** | `role="button"` on a `<div>` when `<button>` exists | Use native HTML elements first; ARIA only when HTML semantics insufficient |
| **accessi-beige** | Making everything gray and boring "for accessibility" | Accessibility doesn't mean ugly — vibrant colors work with sufficient contrast |
| **Focus outline: none** | Removing focus indicators for visual "cleanliness" | Custom focus indicators that match brand but remain visible (2px outline, 3:1 contrast) |
| **Skip link missing** | Users must tab through entire navigation on every page | Add "Skip to main content" link as first focusable element |
| **Only automated testing** | 100% Lighthouse score but users can't complete tasks | Automated testing catches ~30% of issues. Manual and user testing required |
| **Title attribute overuse** | `title` attributes on everything thinking it helps accessibility | Screen readers don't consistently announce title. Use aria-label, aria-describedby |
| **Disabling zoom** | `user-scalable=no` or `maximum-scale=1.0` in viewport meta | Users with low vision need pinch-zoom. Never disable zoom |
| **Modal focus trap failure** | Focus leaves modal or Escape key doesn't close it | Implement proper focus trapping: tab cycles within modal, Escape closes, focus returns to trigger |
| **Color-only states** | Active/selected state shown only by color change | Add icon, text change, underline, or other non-color indicator to all states |
| **`aria-hidden="true"` on focusable elements** | Screen reader skips content but keyboard can still focus on it | Never use aria-hidden on focusable elements. Combine with `tabindex="-1"` or `display: none` |
| **CAPTCHA without audio alternative** | Visual CAPTCHA blocks screen reader users | Use hCaptcha (accessible) or implement audio CAPTCHA alternative |
| **No `prefers-reduced-motion`** | Animations cause discomfort for users with vestibular disorders | Wrap all animations in `@media (prefers-reduced-motion: no-preference)`, provide static alternatives |

## Tools & Deliverables

| Deliverable | Contents | Tools |
|------------|----------|-------|
| Accessibility audit | WCAG violations by criterion, severity, location, fix steps | axe DevTools, Lighthouse, manual testing |
| VPAT (Voluntary Product Accessibility Template) | Section 508 / EN 301 549 compliance statement | Template + audit results |
| ARIA pattern library | Reusable ARIA patterns per component type | Storybook, documentation site |
| Accessibility statement | Public-facing commitment, known issues, contact info | Web page |
| Testing protocol | Step-by-step manual testing procedures | Internal wiki/documentation |
| Training materials | Developer a11y guide, designer a11y checklist | Internal wiki, slide deck |
| VPAT report | Formal accessibility conformance report | Compliance team, procurement |

## References
  - references/accessible-forms.md — Accessible Forms
  - references/aria-patterns.md — ARIA Patterns
  - references/color-contrast-design.md — Color Contrast Design
  - references/testing-tools.md — Testing Tools
  - references/wcag-checklist.md — WCAG Checklist
  - references/wcag-guide.md — WCAG Guide
  - references/accessibility-testing-methods.md — Accessibility Testing Methods
  - references/accessible-design-patterns.md — Accessible Design Patterns
## Handoff
`design-design-systems` for accessible component library integration.
`quality-visual-testing` for visual regression with a11y states.
Carry forward: WCAG audit report, ARIA patterns, testing checklist.
