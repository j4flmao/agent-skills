# ARIA Patterns & Best Practices

## ARIA Rules

1. **No ARIA is better than bad ARIA** — native HTML semantics first
2. **Do not override native semantics** — don't add `role="button"` to a `<button>`
3. **All interactive ARIA widgets must be keyboard accessible**
4. **ARIA roles, states, and properties must be valid and maintained**

## Landmark Roles

```html
<header role="banner">Site header</header>
<nav role="navigation" aria-label="Main">Navigation</nav>
<main role="main">Primary content</main>
<aside role="complementary">Sidebar</aside>
<footer role="contentinfo">Footer</footer>
<form role="search" aria-label="Search">
  <input type="search" aria-label="Search site">
</form>
```

## Widget Patterns

### Accordion

```html
<div>
  <h3>
    <button aria-expanded="false" aria-controls="section1">
      Section 1
    </button>
  </h3>
  <div id="section1" role="region" aria-labelledby="accordion1-header" hidden>
    Content
  </div>
</div>
```

### Tabs

```html
<div role="tablist" aria-label="Product Details">
  <button role="tab" aria-selected="true" aria-controls="panel1" id="tab1">Description</button>
  <button role="tab" aria-selected="false" aria-controls="panel2" id="tab2">Reviews</button>
</div>
<div role="tabpanel" id="panel1" aria-labelledby="tab1">Description content</div>
<div role="tabpanel" id="panel2" aria-labelledby="tab2" hidden>Reviews content</div>
```

### Dialog/Modal

```html
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">Confirm Delete</h2>
  <p id="dialog-desc">This action cannot be undone.</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

### Menu

```html
<nav aria-label="User menu">
  <button aria-haspopup="true" aria-expanded="false">Settings</button>
  <ul role="menu" aria-label="User settings">
    <li role="menuitem" tabindex="0">Profile</li>
    <li role="menuitem" tabindex="-1">Logout</li>
  </ul>
</nav>
```

### Combobox

```html
<label for="search">Search users</label>
<input id="search" role="combobox" aria-expanded="false" aria-controls="listbox" aria-activedescendant="">
<ul id="listbox" role="listbox" aria-label="Users">
  <li role="option" id="option1" aria-selected="false">Alice</li>
  <li role="option" id="option2" aria-selected="false">Bob</li>
</ul>
```

## Live Regions

| `aria-live` | Use Case |
|-------------|----------|
| `polite` | Most updates (chat messages, notifications) |
| `assertive` | Critical alerts (form errors, time warnings) |
| `off` | Updates that should not be announced |

```html
<div aria-live="polite" aria-atomic="true">
  {{notificationMessage}}
</div>
<div role="alert" aria-live="assertive">
  {{errorMessage}}
</div>
```

## ARIA States Reference

| Attribute | Applies To | Purpose |
|-----------|-----------|---------|
| `aria-expanded` | Button, link | Indicates expandable section state |
| `aria-selected` | Tab, option | Indicates selected state |
| `aria-pressed` | Toggle button | Indicates pressed state |
| `aria-current` | Link, breadcrumb | Indicates current page/step |
| `aria-disabled` | Any element | Indicates disabled state |
| `aria-hidden` | Any element | Hides from accessibility tree |
| `aria-invalid` | Form input | Indicates validation error |
| `aria-required` | Form input | Indicates required field |
| `aria-checked` | Checkbox, radio | Indicates checked state |
| `aria-haspopup` | Button, link | Indicates menu/dialog trigger |
