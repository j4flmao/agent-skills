# WCAG 2.2 Compliance Deep Dive

## WCAG 2.2 Overview

WCAG 2.2 was published as a W3C Recommendation on October 5, 2023. It adds 9 new success criteria on top of WCAG 2.1 (which had 17 criteria on top of WCAG 2.0's 12). The new criteria focus on accessible authentication, pointer interactions, focus appearance, and consistent help.

### What Changed from WCAG 2.1

| New Criterion | Level | Category | Summary |
|--------------|-------|----------|---------|
| 2.4.11 Focus Not Obscured (AA) | AA | Operable | Focus indicator must not be fully hidden by author-created content |
| 2.4.12 Focus Not Obscured (AAA) | AAA | Operable | Focus indicator must not be partially hidden |
| 2.4.13 Focus Appearance (AAA) | AAA | Operable | Focus indicator must be at least 2px thick and contrast with adjacent colors |
| 2.5.7 Dragging (AA) | AA | Operable | All dragging actions must have a single-pointer alternative |
| 2.5.8 Target Size (AA) | AA | Operable | Target must be at least 24x24 CSS pixels (with exceptions) |
| 3.2.6 Consistent Help (A) | A | Understandable | Help mechanisms must be in consistent location across pages |
| 3.3.7 Accessible Authentication (AA) | AA | Understandable | Authentication must not rely on cognitive function tests |
| 3.3.8 Accessible Authentication (AAA) | AAA | Understandable | No exception for authentication |
| 3.3.9 Redundant Entry (A) | A | Understandable | Information entered once must not need re-entry |

### Removed Criteria

WCAG 2.2 removed **4.1.1 Parsing** (Level A) because modern browsers and assistive technology no longer have parsing issues with invalid HTML. It was a legacy criterion from 2008 that no longer provides value.

## WCAG 2.2 Success Criteria Deep Dive

### 2.4.11 Focus Not Obscured (AA)

**Requirement**: When a component receives keyboard focus, the focus indicator must not be entirely hidden by other author-created content.

**Common violations**:
- A sticky header that overlaps focused content
- A fixed sidebar that covers the left portion of focused elements
- Modal/dialog overlays that do not move focus inside the dialog
- Cookie consent banners that cover bottom-anchored focused elements

**Fix strategies**:

```css
/* Ensure sticky headers don't cover focused content */
:focus-within {
  scroll-margin-top: 80px; /* height of sticky header */
}

/* Per element */
.focused-section {
  scroll-margin-top: 80px;
}
```

```js
// Programmatic scroll into view with offset
element.focus({ preventScroll: true });
const rect = element.getBoundingClientRect();
const headerHeight = 80;
if (rect.top < headerHeight) {
  window.scrollBy(0, rect.top - headerHeight - 16);
}
```

**Testing**: Use keyboard navigation (Tab) through the page. Watch for moments when focus lands on an element but the focus ring is not visible due to overlapping content.

### 2.4.12 Focus Not Obscured (AAA)

**Requirement**: No part of the focus indicator may be hidden by author-created content.

This is the stricter AAA version. Even partial occlusion fails. Every pixel of the focus ring must be visible.

### 2.4.13 Focus Appearance (AAA)

**Requirement**: The focus indicator must be at least as thick as a 2 CSS pixel border, and the contrast ratio between the focused and unfocused states must be at least 3:1.

```css
/* Compliant focus indicator */
:focus-visible {
  outline: 3px solid #3b82f6; /* 3px > 2px minimum */
  outline-offset: 3px;
  /* Contrast: #3b82f6 on white = 4.6:1 > 3:1 */
}

/* Alternatively, use a box-shadow-based ring */
:focus-visible {
  box-shadow: 0 0 0 3px #3b82f6;
  /* 3px > 2px minimum */
}

/* Non-compliant -- too thin */
:focus-visible {
  outline: 1px dotted #999;
  /* 1px < 2px minimum, contrast may be < 3:1 */
}
```

**Note**: The 2px thickness applies to the solid perimeter of the focus indicator. If using dashed/dotted outlines, the line segments themselves must be 2px thick.

### 2.5.7 Dragging (AA)

**Requirement**: All functionality that uses a dragging motion must have a single-pointer alternative (click, tap, or keyboard).

**Examples**:
- Drag-and-drop list reordering: also provide up/down arrow buttons
- Slider: provide numeric input or +/- buttons
- Map panning: provide arrow buttons or click-to-center
- Resize panes: provide preset sizes or numeric input

```html
<!-- Draggable reorder -->
<ul id="sortable-list">
  <li draggable="true">
    Item 1
    <button aria-label="Move up">&#x25B2;</button>
    <button aria-label="Move down">&#x25BC;</button>
  </li>
</ul>
```

```tsx
// Slider with alternative input
function AccessibleSlider({ value, onChange, min, max }) {
  return (
    <div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        aria-label="Volume"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        aria-label="Volume value"
        className="w-16"
      />
    </div>
  );
}
```

### 2.5.8 Target Size (AA)

**Requirement**: The target area for pointer inputs must be at least 24x24 CSS pixels. Exceptions:
- **Equivalent**: A smaller target exists within a larger 24x24 area that also receives the click
- **Inline**: The target is in a sentence or text block (links in paragraphs)
- **User agent control**: The size is determined by the browser and cannot be changed
- **Essential**: The size is essential for the function (e.g., interactive maps)

```css
/* Compliant -- button is 40px tall */
button {
  height: 40px;
  min-width: 44px;
  padding: 8px 12px;
}

/* Non-compliant -- icon button too small */
.icon-button {
  width: 20px;
  height: 20px;
}

/* Fix -- expand to 24x24 minimum */
.icon-button {
  width: 24px;
  height: 24px;
  padding: 4px;
}
```

**Common violations**:
- Navigation links with small click areas (10-16px tall)
- Icon-only buttons without padding
- Close (X) buttons in modals
- Tabs in tab panels
- Checkboxes and radio buttons (can be under 24px, but the label must be clickable too)

**Fix pattern for small controls**:

```css
/* Expand touch target without changing visual size */
.small-control {
  position: relative;
}
.small-control::before {
  content: '';
  position: absolute;
  /* 24x24 minimum touch target */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
}
```

### 3.2.6 Consistent Help (A)

**Requirement**: If a web page contains help mechanisms (contact information, help/support page, FAQ, chatbot), they must be located in the same relative order across all pages.

**Examples of consistent help location**:
- Help button always in the bottom-right corner
- Contact link always in the footer
- FAQ link always in the main navigation

```html
<!-- Same position, every page -->
<footer>
  <nav aria-label="Help resources">
    <a href="/help">Help Center</a>
    <a href="/contact">Contact Support</a>
    <a href="/faq">FAQ</a>
  </nav>
</footer>
```

### 3.3.7 Accessible Authentication (AA)

**Requirement**: Authentication must not rely on cognitive function tests (remembering passwords, solving puzzles, transcribing characters) unless:
- An alternative method is available (e.g., password manager, magic link, biometric)
- A mechanism is available to help the user complete the test (e.g., copy/paste, audio CAPTCHA)

**What this means in practice**:
- Password fields are allowed (password managers handle them)
- CAPTCHAs require an audio alternative or a simpler alternative (checkbox, email link)
- "What was the name of your first pet?" security questions fail this criterion for users with memory disabilities
- Puzzle-based authentication (select all images with buses) fails without alternative

**Compliant authentication patterns**:

```html
<!-- Pattern 1: Password managers work natively -->
<form>
  <label for="email">Email</label>
  <input type="email" id="email" autocomplete="email" />

  <label for="password">Password</label>
  <input type="password" id="password" autocomplete="current-password" />

  <button type="submit">Sign in</button>
</form>

<!-- Pattern 2: Magic link alternative -->
<button type="button">Send me a magic link</button>

<!-- Pattern 3: Biometric or device-based -->
<button type="button">Use biometric (Face ID / Fingerprint)</button>
```

**Non-compliant patterns**:
- CAPTCHAs without audio alternative
- "Select all squares with traffic lights" without alternative
- Math problems that must be solved without calculator
- Forced password complexity without password manager support

### 3.3.9 Redundant Entry (A)

**Requirement**: Information that a user has previously entered in the same process must either be:
- Auto-populated, or
- Available for the user to select (not re-type)

**Common violations**:
- Multi-step forms that ask for the same information in separate steps
- Shipping address requiring re-entry of billing address
- Account creation requiring email + password on one page, then full profile on next

```html
<!-- BAD -- user must re-enter billing address -->
<label>City <input name="billing-city"></label>
<label>ZIP <input name="billing-zip"></label>

<section>
  <h2>Shipping Address</h2>
  <!-- User must type same city/ZIP again -->
  <label>City <input name="shipping-city"></label>
  <label>ZIP <input name="shipping-zip"></label>
</section>

<!-- GOOD -- auto-populate or checkbox -->
<label>
  <input type="checkbox" checked onchange="copyBillingToShipping()">
  Shipping address same as billing
</label>
<section>
  <h2>Shipping Address</h2>
  <label>City <input name="shipping-city" value="Auto-populated"></label>
  <label>ZIP <input name="shipping-zip" value="Auto-populated"></label>
</section>
```

## WCAG 2.1 Compliance Summary

### Level A (Must support)

| Criterion | Summary | Common Failure |
|-----------|---------|----------------|
| 1.1.1 Non-text Content | All non-text content has text alternative | Missing alt text on images |
| 1.2.1 Audio-only/Video-only | Transcript/caption provided | No transcript for podcast |
| 1.2.2 Captions (Prerecorded) | Captions for all prerecorded video | No captions on marketing video |
| 1.2.3 Audio Description | Description of visual content in video | No audio description |
| 1.3.1 Info and Relationships | Semantic structure conveyed programmatically | Headings, lists, tables not marked up |
| 1.3.2 Meaningful Sequence | Content order is logical | CSS reordering breaks DOM order |
| 1.3.3 Sensory Characteristics | Do not rely on shape/size/location alone | "Click the square button" |
| 1.4.1 Use of Color | Color not sole information channel | Red/green status indicators |
| 1.4.2 Audio Control | Auto-play audio can be stopped | Background video with sound |
| 2.1.1 Keyboard | All functionality via keyboard | Custom widget not keyboard accessible |
| 2.1.2 No Keyboard Trap | Focus cannot be trapped | Modal without close mechanism |
| 2.1.4 Character Key Shortcuts | Single-key shortcuts can be turned off | Pressing "s" triggers search |
| 2.2.1 Timing Adjustable | Time limits can be extended | Session timeout without warning |
| 2.2.2 Pause, Stop, Hide | Moving/blinking content can be paused | Auto-playing carousel |
| 2.3.1 Three Flashes | No content flashes more than 3x/second | Animated ads, strobing effects |
| 2.4.1 Bypass Blocks | Skip link provided | No skip link on page |
| 2.4.2 Page Titled | Page has descriptive title | "Untitled" or generic title |
| 2.4.3 Focus Order | Focus order preserves meaning | Tab order jumps around |
| 2.4.4 Link Purpose (In Context) | Link text describes destination | "Click here" links |
| 2.5.1 Pointer Gestures | Gestures have alternative | Pinch-to-zoom only |
| 2.5.2 Pointer Cancellation | Can cancel pointer action | Mouse-down triggers irreversible action |
| 2.5.3 Label in Name | Visible label matches accessible name | Icon button with wrong aria-label |
| 2.5.4 Motion Actuation | Motion-activated function has alternative | Shake to undo, no button alternative |
| 3.1.1 Language of Page | Page language specified | Missing `lang` attribute |
| 3.2.1 On Focus | No unexpected context change on focus | Form submits when focus leaves field |
| 3.2.2 On Input | No unexpected context change on input | Dropdown change reloads page |
| 3.3.1 Error Identification | Error message identifies problem field | Generic "form has errors" |
| 3.3.2 Labels or Instructions | Label or instruction provided | Input without label or placeholder |
| 4.1.2 Name, Role, Value | Custom controls expose name/role/value | Custom select missing ARIA |
| 4.1.3 Status Messages | Status messages announced via role=status | "3 results found" not announced |

### Level AA (Should support)

| Criterion | Summary | Common Failure |
|-----------|---------|----------------|
| 1.2.4 Captions (Live) | Live video has captions | No captions on live stream |
| 1.2.5 Audio Description (Prerecorded) | Audio description provided | Video without described visuals |
| 1.3.4 Orientation | Content not locked to orientation | App forces portrait on tablet |
| 1.3.5 Identify Input Purpose | Input fields identify their purpose | Autocomplete attribute missing |
| 1.4.3 Contrast (Minimum) | 4.5:1 text, 3:1 large text | Light gray text on white |
| 1.4.4 Resize Text | Text can resize to 200% without loss | Layout breaks on zoom |
| 1.4.5 Images of Text | Use text, not images of text | Heading as image |
| 1.4.10 Reflow | Content works in 320px width | Horizontal scroll on mobile |
| 1.4.11 Non-text Contrast | UI components have 3:1 contrast | Disabled button contrast too low |
| 1.4.12 Text Spacing | No loss of content with spacing overrides | Text clipped on custom spacing |
| 1.4.13 Content on Hover/Focus | Dismissable, hoverable, persistent | Tooltip cannot be dismissed |
| 2.4.5 Multiple Ways | Multiple ways to find a page | No search or sitemap |
| 2.4.6 Headings and Labels | Descriptive headings and labels | "Section 1" as heading |
| 2.4.7 Focus Visible | Visible focus indicator | outline: none |
| 2.4.11 Focus Not Obscured (2.2) | Focus not hidden by content | Sticky header covers focused item |
| 2.5.7 Dragging (2.2) | Drag alternative provided | Drag-and-drop only |
| 2.5.8 Target Size (2.2) | 24x24px minimum | Small icon buttons |
| 3.1.2 Language of Parts | Language changes marked | `span lang="fr"` for French phrases |
| 3.2.3 Consistent Navigation | Same navigation order across pages | Nav links in different order |
| 3.2.4 Consistent Identification | Same icon/function same meaning | "X" sometimes means close, sometimes delete |
| 3.2.6 Consistent Help (2.2) | Help in consistent location | Help button moves around |
| 3.3.3 Error Suggestion | Error suggests specific fix | "Invalid input" vs "Email must contain @" |
| 3.3.4 Error Prevention (Legal/Financial) | Legal/financial data confirmed before submit | No confirmation on purchase |
| 3.3.7 Accessible Auth (2.2) | No cognitive function test required | CAPTCHA without audio alternative |
| 3.3.9 Redundant Entry (2.2) | No re-entry of same info | Re-typing address across steps |

## Automated Testing Configuration

### axe-core Configuration for WCAG 2.2

```ts
import { axe } from 'jest-axe';

const wcag22Config = {
  runOnly: {
    type: 'tag',
    values: [
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa', // WCAG 2.2 AA new criteria
    ],
  },
};

it('meets WCAG 2.2 AA', async () => {
  const { container } = render(<MyPage />);
  const results = await axe(container, wcag22Config);
  expect(results).toHaveNoViolations();
});
```

### CI Pipeline with WCAG 2.2 Rules

```yaml
- name: Accessibility audit (WCAG 2.2)
  run: |
    npx @axe-core/cli http://localhost:3000 \
      --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa \
      --exit \
      --save artifacts/a11y-report.json

- name: Fail on violations
  run: |
    $report = Get-Content artifacts/a11y-report.json | ConvertFrom-Json
    if ($report.violations.length -gt 0) {
      Write-Error "Found $($report.violations.length) WCAG violations"
      exit 1
    }
```

## Common WCAG 2.2 Violations in Practice

### Focus Not Obscured by Sticky Header

```css
/* Fix: Use scroll-margin to ensure focused elements are visible below sticky headers */

/* Global fix for all focusable elements */
:where(a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])):focus {
  scroll-margin-top: calc(var(--header-height, 0px) + 8px);
}

/* Per-section fix */
section:focus-within {
  scroll-margin-top: 80px;
}
```

### Insufficient Target Size for Icon Buttons

```html
<!-- BEFORE: 20x20 clickable area -->
<button class="w-5 h-5" aria-label="Close">
  <svg><!-- X icon --></svg>
</button>

<!-- AFTER: 24x24 minimum via pseudo-element -->
<button class="relative w-5 h-5" aria-label="Close">
  <svg><!-- X icon --></svg>
</button>
<style>
  button[aria-label="Close"]::before {
    content: '';
    position: absolute;
    inset: -4px; /* Expands to 28x28 */
  }
</style>
```

### Drag-and-Drop Without Pointer Alternative

```tsx
function AccessibleSortableList({ items, onReorder }) {
  const [list, setList] = useState(items);

  return (
    <ul>
      {list.map((item, index) => (
        <li key={item.id} role="listitem">
          <span>{item.label}</span>
          <button
            onClick={() => moveItem(index, index - 1)}
            disabled={index === 0}
            aria-label={`Move ${item.label} up`}
          >
            Up
          </button>
          <button
            onClick={() => moveItem(index, index + 1)}
            disabled={index === list.length - 1}
            aria-label={`Move ${item.label} down`}
          >
            Down
          </button>
        </li>
      ))}
    </ul>
  );

  function moveItem(fromIndex, toIndex) {
    const newList = [...list];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, moved);
    setList(newList);
    onReorder(newList);
  }
}
```

### Accessible Authentication Implementation

```tsx
function LoginForm() {
  const [useMagicLink, setUseMagicLink] = useState(false);

  return (
    <form>
      <label htmlFor="email">Email address</label>
      <input
        type="email"
        id="email"
        autoComplete="email"
        required
      />

      {useMagicLink ? (
        <p>A magic link will be sent to your email. No password needed.</p>
      ) : (
        <>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            autoComplete="current-password"
          />
        </>
      )}

      <button type="submit">
        {useMagicLink ? 'Send Magic Link' : 'Sign In'}
      </button>

      <button type="button" onClick={() => setUseMagicLink(!useMagicLink)}>
        {useMagicLink ? 'Sign in with password instead' : 'Send magic link instead'}
      </button>
    </form>
  );
}
```

## WCAG 2.2 Migration Checklist

- [ ] Review all sticky headers and fixed position elements for focus obscuring
- [ ] Audit all icon buttons and navigation links for 24x24 minimum target size
- [ ] Identify all drag-and-drop interactions and add pointer/keyboard alternatives
- [ ] Review authentication flow for cognitive function test issues
- [ ] Add consistent help mechanisms to all pages
- [ ] Audit multi-step forms for redundant entry
- [ ] Update focus indicator thickness to 2px minimum with 3:1 contrast
- [ ] Remove CSS outline: 0 / outline: none unless replaced with visible indicator
- [ ] Test with axe-core using WCAG 2.2 tags
- [ ] Update accessibility policy and compliance documentation
