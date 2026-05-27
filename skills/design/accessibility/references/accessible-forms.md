# Accessible Forms

## Form Accessibility Fundamentals
Forms are one of the most critical interaction patterns on the web. Accessible forms ensure that users of all abilities can complete tasks like registration, checkout, data entry, and search.

### Core Principles
- Every input must have an associated label
- Error messages must be programmatically associated with inputs
- Focus management must follow a logical order
- Instructions must be clear and available to screen readers
- Validation feedback must be perceivable through multiple channels

## Labeling Techniques

### Explicit Label Association
`html
<label for="email">Email address</label>
<input type="email" id="email" name="email" required />
`

### Implicit Label Association
`html
<label>
  Email address
  <input type="email" id="email2" name="email2" required />
</label>
`

### Using aria-label (When Visual Label Isn't Possible)
`html
<button aria-label="Close dialog" onclick="closeDialog()">
  <span aria-hidden="true">X</span>
</button>
`

### Using aria-labelledby (Multiple Sources)
`html
<h2 id="section-title">Shipping Information</h2>
<fieldset aria-labelledby="section-title">
  <label for="address">Street Address</label>
  <input type="text" id="address" name="address" />
</fieldset>
`

## Grouping Related Inputs

### Fieldset and Legend
`html
<fieldset>
  <legend>Payment Method</legend>

  <label>
    <input type="radio" name="payment" value="credit" />
    Credit Card
  </label>
  <label>
    <input type="radio" name="payment" value="paypal" />
    PayPal
  </label>
  <label>
    <input type="radio" name="payment" value="invoice" />
    Invoice
  </label>
</fieldset>
`

### Grouping Checkboxes
`html
<fieldset>
  <legend>Newsletter Preferences</legend>

  <label>
    <input type="checkbox" name="topics" value="product" />
    Product Updates
  </label>
  <label>
    <input type="checkbox" name="topics" value="events" />
    Events & Webinars
  </label>
  <label>
    <input type="checkbox" name="topics" value="offers" />
    Special Offers
  </label>
</fieldset>
`

## Required Fields and Constraints

### Indicating Required Fields
`html
<label for="username">
  Username
  <span aria-hidden="true">*</span>
</label>
<input
  type="text"
  id="username"
  name="username"
  required
  aria-required="true"
/>
`

### Describing Constraints with aria-describedby
`html
<label for="password">Password</label>
<input
  type="password"
  id="password"
  name="password"
  required
  minlength="8"
  aria-describedby="password-help"
/>
<p id="password-help">Must be at least 8 characters with one number and one capital letter</p>
`

## Error Handling and Validation

### Inline Error Messages
`html
<div class="form-field">
  <label for="email">Email Address</label>
  <input
    type="email"
    id="email"
    name="email"
    required
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" role="alert">
    Please enter a valid email address (e.g., user@example.com)
  </p>
</div>
`

### Real-time Validation with ARIA Live Regions
`html
<div aria-live="polite" aria-atomic="true" id="form-errors">
  <!-- Errors appear here dynamically -->
</div>
`

`javascript
function validateField(input) {
  const errorContainer = document.getElementById('form-errors');
  const fieldName = input.getAttribute('aria-describedby');

  if (!input.validity.valid) {
    input.setAttribute('aria-invalid', 'true');
    if (input.validity.valueMissing) {
      errorContainer.textContent = ${input.labels[0].textContent} is required.;
    } else if (input.validity.typeMismatch) {
      errorContainer.textContent = Please enter a valid .;
    } else if (input.validity.tooShort) {
      errorContainer.textContent = ${input.labels[0].textContent} must be at least  characters.;
    }
  } else {
    input.removeAttribute('aria-invalid');
    errorContainer.textContent = '';
  }
}
`

### Summary Error List
`html
<div role="alert" aria-live="assertive" id="error-summary" hidden>
  <h2>There are 3 errors in the form</h2>
  <ul>
    <li><a href="#name">Name is required</a></li>
    <li><a href="#email">Email is invalid</a></li>
    <li><a href="#password">Password is too short</a></li>
  </ul>
</div>
`

## Custom Form Controls

### Accessible Custom Select
`html
<!-- Custom select with ARIA combobox pattern -->
<div class="custom-select">
  <button
    role="combobox"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-controls="select-listbox"
    id="select-button"
  >
    Select a country
  </button>
  <ul
    role="listbox"
    id="select-listbox"
    aria-labelledby="select-button"
    hidden
  >
    <li role="option" id="option-us" aria-selected="false">United States</li>
    <li role="option" id="option-ca" aria-selected="false">Canada</li>
    <li role="option" id="option-mx" aria-selected="false">Mexico</li>
  </ul>
</div>
`

### Toggle Switch Pattern
`html
<button
  role="switch"
  aria-checked="false"
  aria-label="Enable dark mode"
  id="dark-mode-toggle"
>
  <span class="toggle-track">
    <span class="toggle-thumb"></span>
  </span>
</button>
`

`javascript
document.getElementById('dark-mode-toggle').addEventListener('click', function() {
  const isChecked = this.getAttribute('aria-checked') === 'true';
  this.setAttribute('aria-checked', !isChecked);
});
`

## Multi-Step Forms

### Progress Indicator
`html
<nav aria-label="Form progress">
  <ol class="progress-steps">
    <li aria-current="step">
      <span class="step-number">1</span> Account Details
    </li>
    <li>
      <span class="step-number">2</span> Shipping Address
    </li>
    <li>
      <span class="step-number">3</span> Payment Information
    </li>
    <li>
      <span class="step-number">4</span> Review & Confirm
    </li>
  </ol>
</nav>
`

### Step Navigation
`html
<div class="step-navigation">
  <button type="button" aria-label="Previous step: Account Details" disabled>
    Back
  </button>
  <button type="button" aria-label="Next step: Shipping Address">
    Continue
  </button>
</div>
`

## Keyboard Interactions
| Control | Expected Behavior |
|---------|------------------|
| Tab | Move focus to next form element |
| Shift+Tab | Move focus to previous form element |
| Enter | Submit form, activate button |
| Space | Toggle checkbox, activate button |
| Escape | Close autocomplete suggestions, dismiss modal forms |
| Arrow keys | Navigate radio groups, select options, date pickers |

## Testing Form Accessibility
`javascript
// Automated checks with axe-core
import axe from 'axe-core';

async function testFormAccessibility(formElement) {
  const results = await axe.run(formElement, {
    rules: {
      'label': { enabled: true },
      'aria-required-children': { enabled: true },
      'aria-valid-attr-value': { enabled: true },
      'input-button-name': { enabled: true },
    }
  });

  const formViolations = results.violations.filter(v =>
    v.tags.includes('cat.forms')
  );

  if (formViolations.length > 0) {
    console.error('Form accessibility violations:', formViolations);
  }
  return formViolations;
}
`

## Key Points
- Every form input must have a programmatic label (explicit label, aria-label, or aria-labelledby)
- Group related controls with fieldset/legend for radio buttons, checkboxes, and address fields
- Use aria-describedby to associate help text and error messages with inputs
- Set aria-invalid on inputs with errors and provide clear error messages in an alert role
- Implement summary error lists at the top of long forms
- Ensure custom form controls implement proper ARIA roles, states, and keyboard interactions
- Test forms with screen readers (NVDA, VoiceOver, JAWS) to verify announcements
- Support keyboard-only navigation with clear focus indicators on all form elements
- Use live regions (aria-live) for dynamic content updates in forms
