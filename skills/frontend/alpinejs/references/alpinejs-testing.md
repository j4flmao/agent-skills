# Alpine.js Testing Reference

## Test Setup

Alpine.js components can be tested in JSDOM environment with Vitest.

```javascript
import Alpine from 'alpinejs';
import { waitFor } from '@testing-library/dom';

async function mountAlpine(template) {
  document.body.innerHTML = `<div x-data>${template}</div>`;
  Alpine.start();
  await Alpine.nextTick();
}
```

## Component Testing

```javascript
test('counter increments on click', async () => {
  document.body.innerHTML = `
    <div x-data="{ count: 0 }">
      <button @click="count++" x-text="count"></button>
    </div>
  `;
  Alpine.initTree(document.body);
  
  const button = document.querySelector('button');
  expect(button.textContent).toBe('0');
  
  button.click();
  await Alpine.nextTick();
  expect(button.textContent).toBe('1');
});
```

## Key Points

- Mount Alpine components in JSDOM for unit testing
- Alpine.nextTick waits for reactivity to process
- x-data initializes component state for tests
- x-text assertions verify rendered output
- @click events trigger state changes synchronously
- x-show elements test conditional rendering
- x-for loops generate repeated DOM for testing
- $store access requires store registration before mount
- x-init functions can be spied for initialization tests
- Component isolation prevents cross-test pollution
