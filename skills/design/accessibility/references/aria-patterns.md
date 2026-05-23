# ARIA Patterns

## ARIA Rules (First Rule of ARIA)

1. If you can use a native HTML element that has the semantics you need, don't use ARIA
2. Don't change native semantics unless you absolutely have to (`<h1 role="button">` is wrong)
3. All interactive ARIA controls must be keyboard operable
4. Don't use `role="presentation"` or `aria-hidden="true"` on focusable elements
5. All interactive elements must have an accessible name

## Common Patterns

### Accordion

```html
<div role="heading" aria-level="3">
  <button
    id="accordion-btn-1"
    aria-expanded="false"
    aria-controls="accordion-panel-1"
  >
    Section 1
  </button>
</div>
<div
  id="accordion-panel-1"
  role="region"
  aria-labelledby="accordion-btn-1"
  hidden
>
  <p>Panel content here.</p>
</div>
```

Keyboard: Enter/Space to toggle, Tab to move between accordion headers, Up/Down optional for prev/next.

### Tabs

```html
<div role="tablist" aria-label="Documentation">
  <button id="tab-1" role="tab" aria-selected="true" aria-controls="panel-1">
    Overview
  </button>
  <button id="tab-2" role="tab" aria-selected="false" aria-controls="panel-2">
    API
  </button>
</div>
<div id="panel-1" role="tabpanel" aria-labelledby="tab-1">
  <p>Overview content.</p>
</div>
<div id="panel-2" role="tabpanel" aria-labelledby="tab-2" hidden>
  <p>API content.</p>
</div>
```

Keyboard: Tab to tablist, Left/Right to switch tabs, Tab to move into active panel.

### Modal Dialog

```html
<div
  id="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-desc"
>
  <h2 id="modal-title">Confirm Delete</h2>
  <p id="modal-desc">This action cannot be undone.</p>
  <button id="confirm-btn">Delete</button>
  <button id="cancel-btn">Cancel</button>
</div>
```

JavaScript requirements:
- Focus trap: Tab cycles within modal, Escape closes
- On open: focus first focusable element
- On close: return focus to trigger element
- Body scroll prevented while modal is open
- `aria-hidden="true"` on content behind modal

### Combobox / Autocomplete

```html
<label for="search">Search users</label>
<div role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <input
    id="search"
    type="text"
    role="combobox"
    aria-autocomplete="list"
    aria-controls="listbox"
    aria-activedescendant=""
  />
  <ul id="listbox" role="listbox" aria-label="Users">
    <li id="option-1" role="option" aria-selected="false">Alice</li>
    <li id="option-2" role="option" aria-selected="false">Bob</li>
  </ul>
</div>
```

Keyboard: Typing filters options, Down/Arrow navigates, Enter selects, Escape closes.

### Menu / Navigation

```html
<nav aria-label="Main navigation">
  <button aria-expanded="false" aria-controls="menu-list">
    Menu
  </button>
  <ul id="menu-list" role="menu" aria-label="Main">
    <li role="none">
      <a role="menuitem" href="/">Home</a>
    </li>
    <li role="none">
      <a role="menuitem" href="/about">About</a>
    </li>
  </ul>
</nav>
```

### Tooltip

```html
<button aria-describedby="tooltip-1" aria-label="Delete item">
  🗑️
</button>
<div id="tooltip-1" role="tooltip" hidden>
  Delete this item permanently
</div>
```

Tooltip appears on hover and focus. Escape dismisses. No interactive content in tooltips.

### Alert / Notification

```html
<!-- For dynamic announcements (not user-initiated) -->
<div role="status" aria-live="polite">
  Item added to cart
</div>

<!-- For critical/user-initiated announcements -->
<div role="alert" aria-live="assertive">
  Error: Please check your email address
</div>

<!-- For progress/loading -->
<div role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100">
  Uploading: 50%
</div>
```

### Switch / Toggle

```html
<label>
  <span id="switch-label">Dark mode</span>
  <button
    role="switch"
    aria-checked="false"
    aria-labelledby="switch-label"
  >
    <span class="slider"></span>
  </button>
</label>
```

Keyboard: Enter or Space to toggle.

### Breadcrumb

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li aria-current="page">Current Page</li>
  </ol>
</nav>
```

### Table / Grid

```html
<div role="grid" aria-label="Data table">
  <div role="rowgroup">
    <div role="row">
      <div role="columnheader" aria-sort="ascending">Name</div>
      <div role="columnheader">Role</div>
    </div>
  </div>
  <div role="rowgroup">
    <div role="row">
      <div role="gridcell">Alice</div>
      <div role="gridcell">Admin</div>
    </div>
  </div>
</div>
```

Use native `<table>` for static data. Use `role="grid"` only for editable/interactive tables.

## Live Region Roles

| Role | aria-live | Use Case |
|------|-----------|----------|
| `status` | polite | Non-critical updates, status messages |
| `alert` | assertive | Errors, critical notifications |
| `log` | polite | Chat, log output, streaming data |
| `marquee` | off | Scrolling text (not recommended) |
| `timer` | off | Countdown timers |
| `progressbar` | off | Progress indicators |

## ARIA States and Properties Quick Reference

| Property | Use On | Values |
|----------|--------|--------|
| `aria-expanded` | Toggle, accordion, menu | `true` / `false` |
| `aria-selected` | Tabs, grid cells, options | `true` / `false` |
| `aria-checked` | Checkbox, switch, menuitemradio | `true` / `false` / `mixed` |
| `aria-current` | Current item (nav, breadcrumb) | `page` / `step` / `location` / `date` / `time` / `true` |
| `aria-pressed` | Toggle button (non-menu) | `true` / `false` / `mixed` |
| `aria-hidden` | Decorative content, off-screen | `true` / `false` |
| `aria-disabled` | Disabled element (when not using `disabled`) | `true` / `false` |
| `aria-required` | Required form field | `true` / `false` |
| `aria-invalid` | Form field with error | `true` / `false` / `grammar` / `spelling` |
| `aria-describedby` | Additional description, error message | ID reference |
| `aria-labelledby` | Accessible name from visible label | ID reference |
| `aria-label` | Accessible name when no visible label | String |
| `aria-controls` | Element controlled by this widget | ID reference |
| `aria-owns` | Parent-child relationship in DOM | ID reference |
| `aria-flowto` | Alternative reading order | ID reference |
| `aria-details` | Extended description | ID reference |
