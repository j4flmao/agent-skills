# ARIA Patterns and Accessible Design

## Overview
ARIA (Accessible Rich Internet Applications) provides attributes that enhance HTML semantics for assistive technologies. Proper ARIA usage ensures web applications are usable by people with disabilities.

## Landmark Roles

### Document Structure
```html
<!-- Navigation landmarks -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li aria-current="page">Widgets</li>
  </ol>
</nav>

<!-- Complementary content -->
<aside aria-label="Related articles">
  <h2>Related Posts</h2>
  <!-- related content -->
</aside>

<!-- Main content -->
<main>
  <h1>Page Title</h1>
  <p>Main content here.</p>
</main>

<!-- Search -->
<form role="search" aria-label="Site search">
  <input type="search" aria-label="Search" />
  <button type="submit">Search</button>
</form>
```

## Live Regions

### Dynamic Content
```html
<!-- Alert for errors -->
<div role="alert" aria-live="assertive">
  Form submission failed. Please try again.
</div>

<!-- Status updates -->
<div aria-live="polite" aria-atomic="true">
  <span>Cart updated: 3 items</span>
</div>

<!-- Progress updates -->
<div role="status" aria-live="polite">
  Loading search results...
  <progress aria-label="Search progress" max="100" value="75">75%</progress>
</div>

<!-- Timer -->
<div role="timer" aria-live="off">
  Time remaining: 5:00
</div>
```

## Widget Patterns

### Accordion
```html
<div class="accordion">
  <h3>
    <button
      aria-expanded="true"
      aria-controls="section-1-content"
      id="section-1-button"
    >
      Section 1 Title
    </button>
  </h3>
  <div
    id="section-1-content"
    role="region"
    aria-labelledby="section-1-button"
    class="accordion-panel"
  >
    <p>Section 1 content here.</p>
  </div>

  <h3>
    <button
      aria-expanded="false"
      aria-controls="section-2-content"
      id="section-2-button"
    >
      Section 2 Title
    </button>
  </h3>
  <div
    id="section-2-content"
    role="region"
    aria-labelledby="section-2-button"
    hidden
    class="accordion-panel"
  >
    <p>Section 2 content here.</p>
  </div>
</div>
```

### Tabs
```html
<div class="tabs">
  <div role="tablist" aria-label="Content tabs">
    <button
      role="tab"
      aria-selected="true"
      aria-controls="tab-1-panel"
      id="tab-1"
      tabindex="0"
    >
      Tab 1
    </button>
    <button
      role="tab"
      aria-selected="false"
      aria-controls="tab-2-panel"
      id="tab-2"
      tabindex="-1"
    >
      Tab 2
    </button>
    <button
      role="tab"
      aria-selected="false"
      aria-controls="tab-3-panel"
      id="tab-3"
      tabindex="-1"
    >
      Tab 3
    </button>
  </div>

  <div
    role="tabpanel"
    id="tab-1-panel"
    aria-labelledby="tab-1"
  >
    <p>Tab 1 content</p>
  </div>
  <div
    role="tabpanel"
    id="tab-2-panel"
    aria-labelledby="tab-2"
    hidden
  >
    <p>Tab 2 content</p>
  </div>
  <div
    role="tabpanel"
    id="tab-3-panel"
    aria-labelledby="tab-3"
    hidden
  >
    <p>Tab 3 content</p>
  </div>
</div>
```

### Modal Dialog
```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  class="modal"
>
  <div class="modal-content">
    <h2 id="dialog-title">Confirm Deletion</h2>
    <p id="dialog-description">
      Are you sure you want to delete this item? This action cannot be undone.
    </p>
    <div class="modal-actions">
      <button onclick="confirmDelete()">Delete</button>
      <button onclick="closeModal()" autofocus>Cancel</button>
    </div>
    <button
      aria-label="Close dialog"
      onclick="closeModal()"
      class="close-button"
    >
      &times;
    </button>
  </div>
</div>
```

## Form Patterns

### Accessible Forms
```html
<form novalidate>
  <!-- Required field with error -->
  <div class="field">
    <label for="email">Email address</label>
    <input
      type="email"
      id="email"
      name="email"
      required
      aria-required="true"
      aria-describedby="email-hint email-error"
      aria-invalid="true"
    />
    <span id="email-hint" class="hint">
      We'll never share your email.
    </span>
    <span id="email-error" class="error" role="alert">
      Please enter a valid email address.
    </span>
  </div>

  <!-- Custom select -->
  <div class="field">
    <label id="country-label">Country</label>
    <div
      role="combobox"
      aria-expanded="false"
      aria-haspopup="listbox"
      aria-labelledby="country-label"
      aria-controls="country-listbox"
      tabindex="0"
    >
      <span>Select a country...</span>
    </div>
    <ul
      id="country-listbox"
      role="listbox"
      aria-labelledby="country-label"
      hidden
    >
      <li role="option" aria-selected="false" tabindex="-1">United States</li>
      <li role="option" aria-selected="false" tabindex="-1">Canada</li>
      <li role="option" aria-selected="false" tabindex="-1">United Kingdom</li>
    </ul>
  </div>

  <!-- Validation summary -->
  <div role="alert" aria-live="assertive">
    <ul>
      <li>Email is required</li>
      <li>Password must be at least 8 characters</li>
    </ul>
  </div>
</form>
```

## Error States

### Accessible Error Handling
```html
<!-- Inline error -->
<div class="field">
  <label for="password">Password</label>
  <input
    type="password"
    id="password"
    aria-invalid="true"
    aria-describedby="password-error"
  />
  <span id="password-error" role="alert">
    Password must be at least 8 characters with a number.
  </span>
</div>

<!-- Error summary -->
<div
  role="alert"
  aria-labelledby="error-summary-title"
  class="error-summary"
>
  <h2 id="error-summary-title">There are 3 errors</h2>
  <ul>
    <li><a href="#name">Name is required</a></li>
    <li><a href="#email">Invalid email format</a></li>
    <li><a href="#terms">You must accept the terms</a></li>
  </ul>
</div>
```

## Key Points
- ARIA supplements but does not replace semantic HTML
- First rule of ARIA: don't use ARIA if native HTML works
- role="alert" for time-sensitive, important information
- aria-live="polite" for non-urgent updates
- aria-live="assertive" for urgent updates that interrupt
- aria-expanded indicates expandable/collapsible state
- aria-controls references the controlled element's id
- aria-labelledby provides accessible name from visible text
- aria-describedby provides additional description
- aria-invalid indicates input validation state
- aria-required is preferred over HTML required for custom controls
- aria-current indicates current item in a set
- aria-hidden removes elements from accessibility tree
- aria-modal traps focus within modal dialogs
- aria-selected indicates selected option/tab
- aria-haspopup indicates interactive popup elements
- aria-checked for custom checkbox/switch states
- aria-pressed for toggle button states
- aria-sort indicates sorted columns
- aria-valuenow/valuemin/valuemax for slider/range values
- tabindex manages keyboard focus order
- Focus management is critical for keyboard navigation
- Skip links provide navigation bypass
- Color contrast meets WCAG AA standards
- Focus indicators must be visible
- Touch targets meet minimum size requirements
- Screen reader testing validates ARIA implementation
- Automated tools catch common ARIA violations
- User testing with assistive technologies validates real-world usage
