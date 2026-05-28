# Accessible Component Patterns

## Button Pattern

### Native Button
```html
<button type="button" onclick="handleClick()">
  Click me
</button>
```

Native `<button>` is always preferred. It is keyboard accessible by default (Enter/Space to activate), exposes the correct role, and is focusable.

### Custom Div as Button (ARIA Fallback)
Only when `<button>` styling cannot be overridden (rare edge cases).

```html
<div
  role="button"
  tabindex="0"
  onclick="handleClick()"
  onkeydown="if(event.key==='Enter'||event.key===' ') { event.preventDefault(); handleClick(); }"
  aria-disabled="false"
>
  Click me
</div>
```

### Button States
```html
<!-- Disabled -->
<button disabled>Cannot click</button>

<!-- Loading -->
<button aria-busy="true">
  <span aria-hidden="true" class="spinner"></span>
  Saving...
</button>

<!-- Toggle -->
<button aria-pressed="false" onclick="this.setAttribute('aria-pressed', this.getAttribute('aria-pressed') === 'false' ? 'true' : 'false')">
  Mute
</button>

<!-- Icon only -->
<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false"><path d="..." /></svg>
</button>
```

## Link Pattern

```html
<!-- Use <a> even for client-side routing -->
<a href="/products">Products</a>

<!-- For client-side router navigation -->
<a href="/products" onclick="event.preventDefault(); navigate('/products')">
  Products
</a>

<!-- Link that opens in new tab -->
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  External site
  <span class="sr-only">(opens in new tab)</span>
</a>

<!-- Skip link -->
<a href="#main-content" class="skip-link">Skip to main content</a>
```

### Link vs Button Decision
```
Navigates to a new page or section? --> Use <a>
Performs an action (submit, toggle, open)? --> Use <button>
```

## Heading Pattern

### Correct Hierarchy
```html
<h1>Page Title</h1>
  <h2>Section One</h2>
    <h3>Subsection A</h3>
  <h2>Section Two</h2>
```

### Visually Hidden Heading for Sections
```html
<section aria-labelledby="section-title">
  <h2 id="section-title" class="sr-only">Related Products</h2>
  <!-- content -->
</section>
```

## Form Pattern

### Accessible Input
```html
<label for="email">Email address</label>
<input
  type="email"
  id="email"
  name="email"
  autocomplete="email"
  required
  aria-describedby="email-hint email-error"
/>

<p id="email-hint">We'll never share your email.</p>
<p id="email-error" role="alert" hidden>Please enter a valid email.</p>
```

### Fieldset for Related Inputs
```html
<fieldset>
  <legend>Shipping address</legend>

  <label for="street">Street</label>
  <input type="text" id="street" />

  <label for="city">City</label>
  <input type="text" id="city" />

  <label for="zip">ZIP code</label>
  <input type="text" id="zip" inputmode="numeric" pattern="[0-9]{5}" />
</fieldset>
```

### Error Summary Pattern
```html
<form novalidate onsubmit="return validateForm(event)">
  <div id="error-summary" role="alert" aria-live="assertive" hidden>
    <h2>Please fix the following errors:</h2>
    <ul>
      <li><a href="#email">Email is required</a></li>
      <li><a href="#password">Password must be at least 8 characters</a></li>
    </ul>
  </div>

  <!-- Individual field errors -->
  <label for="email">Email</label>
  <input type="email" id="email" aria-invalid="true" aria-describedby="email-error" />
  <span id="email-error" role="alert">Email is required</span>
</form>
```

## Dialog/Modal Pattern

```html
<div
  id="confirm-dialog"
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  hidden
>
  <h2 id="dialog-title">Confirm deletion</h2>
  <p id="dialog-description">This action cannot be undone. The item will be permanently deleted.</p>

  <button onclick="closeDialog()">Cancel</button>
  <button onclick="confirmDelete()" autofocus>Delete</button>
</div>
```

### Focus Management for Modals

```tsx
import { useEffect, useRef } from 'react';

function Dialog({ isOpen, onClose, children }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Store the trigger element
      triggerRef.current = document.activeElement;

      // Focus the dialog
      const focusable = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }

      // Trap focus
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }
        if (e.key === 'Tab') {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus
        triggerRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <h2 id="dialog-title">Dialog Title</h2>
      {children}
    </div>
  );
}
```

## Accordion Pattern

```html
<div>
  <h3>
    <button
      aria-expanded="false"
      aria-controls="section1-content"
      id="section1-button"
    >
      Section 1
    </button>
  </h3>
  <div
    id="section1-content"
    role="region"
    aria-labelledby="section1-button"
    hidden
  >
    <p>Content for section 1.</p>
  </div>
</div>
```

### React Accordion Component

```tsx
function Accordion({ sections }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div>
      {sections.map((section, index) => {
        const isOpen = openIndex === index;
        const buttonId = `accordion-btn-${index}`;
        const panelId = `accordion-panel-${index}`;

        return (
          <div key={index}>
            <h3>
              <button
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                {section.title}
                <span aria-hidden="true">{isOpen ? '-' : '+'}</span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
            >
              {section.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

## Tab Panel Pattern

```html
<div>
  <div role="tablist" aria-label="Product information">
    <button
      role="tab"
      aria-selected="true"
      aria-controls="panel-description"
      id="tab-description"
      tabindex="0"
    >
      Description
    </button>
    <button
      role="tab"
      aria-selected="false"
      aria-controls="panel-reviews"
      id="tab-reviews"
      tabindex="-1"
    >
      Reviews
    </button>
  </div>

  <div
    role="tabpanel"
    id="panel-description"
    aria-labelledby="tab-description"
  >
    Product description content.
  </div>

  <div
    role="tabpanel"
    id="panel-reviews"
    aria-labelledby="tab-reviews"
    hidden
  >
    Product reviews content.
  </div>
</div>
```

### Keyboard Navigation for Tabs

```tsx
function TabPanel({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef([]);

  const handleKeyDown = (e) => {
    let newIndex = activeIndex;

    switch (e.key) {
      case 'ArrowRight':
        newIndex = (activeIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        newIndex = (activeIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    setActiveIndex(newIndex);
    tabRefs.current[newIndex].focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Tabs" onKeyDown={handleKeyDown}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            aria-selected={activeIndex === index}
            aria-controls={`panel-${index}`}
            id={`tab-${index}`}
            tabindex={activeIndex === index ? 0 : -1}
            onClick={() => setActiveIndex(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`panel-${index}`}
          aria-labelledby={`tab-${index}`}
          hidden={activeIndex !== index}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

## Tooltip Pattern

```html
<button aria-describedby="tooltip-save">Save</button>
<div id="tooltip-save" role="tooltip" hidden>
  Save your changes (Ctrl+S)
</div>
```

### Hover and Focus Tooltip

```tsx
function Tooltip({ children, content }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  const show = () => {
    clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 300);
  };

  return (
    <span style={{ position: 'relative' }}>
      <span
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby="tooltip"
      >
        {children}
      </span>
      {visible && (
        <div
          id="tooltip"
          role="tooltip"
          style={{ position: 'absolute', bottom: '100%' }}
        >
          {content}
          <button onClick={hide} aria-label="Dismiss tooltip">
            &times;
          </button>
        </div>
      )}
    </span>
  );
}
```

## Combobox (Autocomplete) Pattern

```html
<label for="search">Search users</label>
<div role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <input
    id="search"
    type="text"
    role="combobox"
    aria-autocomplete="list"
    aria-controls="user-list"
    aria-activedescendant=""
  />
  <ul
    id="user-list"
    role="listbox"
    aria-label="Users"
  >
    <li id="user-1" role="option" aria-selected="false">Alice</li>
    <li id="user-2" role="option" aria-selected="false">Bob</li>
  </ul>
</div>
```

### React Combobox Component

```tsx
function Combobox({ options, label }) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listboxId = useId();
  const optionBaseId = useId();

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        setIsOpen(true);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
          setInputValue(filteredOptions[activeIndex]);
          setIsOpen(false);
          setActiveIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div>
      <label htmlFor="combobox-input">{label}</label>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-owns={listboxId}
      >
        <input
          ref={inputRef}
          id="combobox-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${optionBaseId}-${activeIndex}` : ''
          }
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />

        {isOpen && filteredOptions.length > 0 && (
          <ul id={listboxId} role="listbox" aria-label={`${label} suggestions`}>
            {filteredOptions.map((option, index) => (
              <li
                key={option}
                id={`${optionBaseId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={() => {
                  setInputValue(option);
                  setIsOpen(false);
                  inputRef.current.focus();
                }}
              >
                {option}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

## Toast/Notification Pattern

```html
<div
  id="toast-container"
  aria-live="polite"
  aria-atomic="true"
  style="position: fixed; top: 20px; right: 20px;"
>
  <div role="status" class="toast success">
    <span aria-hidden="true">&#10003;</span>
    Document saved successfully
  </div>
  <div role="alert" class="toast error">
    <span aria-hidden="true">&#10007;</span>
    Failed to save document
    <button onclick="dismiss(this)">Dismiss</button>
  </div>
</div>
```

## Carousel Pattern

```html
<section aria-label="Featured products" aria-roledescription="carousel">
  <div role="group" aria-roledescription="slide" aria-label="1 of 5">
    <img src="product-1.jpg" alt="Product 1 description" />
  </div>

  <div role="group" aria-roledescription="slide" aria-label="2 of 5" hidden>
    <img src="product-2.jpg" alt="Product 2 description" />
  </div>

  <button aria-label="Previous slide" onclick="prevSlide()">Prev</button>
  <button aria-label="Next slide" onclick="nextSlide()">Next</button>

  <div role="tablist" aria-label="Slide indicators">
    <button role="tab" aria-selected="true" aria-label="Slide 1" onclick="goToSlide(0)"></button>
    <button role="tab" aria-selected="false" aria-label="Slide 2" onclick="goToSlide(1)"></button>
  </div>
</section>
```

### Carousel Accessibility Rules

1. `aria-roledescription="carousel"` on the container
2. `aria-roledescription="slide"` on each slide
3. Each slide has an `aria-label` indicating position ("1 of 5")
4. Pause on hover or focus (WCAG 2.2.2)
5. No auto-play if `prefers-reduced-motion: reduce`
6. Arrow key navigation between slides
7. Slide indicators are controls, not just visual dots

## Skip Link Pattern

```html
<!-- MUST be the first focusable element on the page -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<header>
  <!-- navigation, logo, etc. -->
</header>

<main id="main-content" tabindex="-1">
  <!-- Primary page content -->
</main>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 8px;
  padding: 8px 16px;
  background: var(--color-brand);
  color: white;
  z-index: 10000;
}

.skip-link:focus {
  top: 8px;
}
```

## Progress Indicator Pattern

### Determinate Progress
```html
<progress
  value="70"
  max="100"
  aria-label="Upload progress"
>
  70%
</progress>
```

### Indeterminate Progress (Spinner)
```html
<div
  role="progressbar"
  aria-label="Loading"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuetext="Loading, please wait..."
>
  <div class="spinner" aria-hidden="true"></div>
</div>
```

## Table Pattern

```html
<table role="table" aria-label="Monthly sales data">
  <caption>
    Sales figures for Q1 2025
  </caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Revenue</th>
      <th scope="col">Costs</th>
      <th scope="col">Profit</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">January</th>
      <td>$10,000</td>
      <td>$6,000</td>
      <td>$4,000</td>
    </tr>
  </tbody>
</table>
```

### Sortable Table Headers
```html
<button
  aria-sort="ascending"
  onclick="sortTable('revenue')"
>
  Revenue
  <span aria-hidden="true">&#x25B2;</span>
</button>
```

## Navigation Pattern

### Main Navigation
```html
<nav aria-label="Main">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

### Breadcrumb Navigation
```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li aria-current="page">Widgets</li>
  </ol>
</nav>
```

## Accessibility Testing Checklist for Components

- [ ] Component uses semantic HTML (or correct ARIA role)
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order follows visual order
- [ ] Focus indicator visible (minimum 2px, 3:1 contrast)
- [ ] Color contrast meets 4.5:1 (text) and 3:1 (UI)
- [ ] Error messages associated with inputs via aria-describedby
- [ ] Dynamic content changes announced via aria-live
- [ ] Custom controls have appropriate aria-* attributes
- [ ] Images have alt text (decorative images have alt="")
- [ ] Headings form a logical hierarchy
- [ ] Touch targets are at least 24x24 CSS pixels
