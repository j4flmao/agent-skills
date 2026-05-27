# Qwik Testing Reference

## Component Testing

```tsx
import { createDOM } from '@builder.io/qwik/testing';
import { component$ } from '@builder.io/qwik';

export const Counter = component$(() => {
  const count = useSignal(0);
  return (
    <button onClick$={() => count.value++}>
      {count.value}
    </button>
  );
});

test('counter increments', async () => {
  const { screen, render } = await createDOM();
  await render(<Counter />);
  
  expect(screen.querySelector('button')?.textContent).toBe('0');
  
  screen.querySelector('button')?.click();
  await screen.querySelector('button')?.click();
  
  expect(screen.querySelector('button')?.textContent).toBe('2');
});
```

## Key Points

- createDOM creates isolated test environment for Qwik components
- Component rendering is fully async — use await
- useSignal manages reactive state in components
- onClick$ handlers are serialized for resumability
- $ suffix indicates lazy-loadable boundary
- SSR tests verify server-rendered HTML output
- useResource$ tested with mock fetch functions
- Route loaders tested with mocked RequestContext
- Dollar sign API ensures code splitting at boundaries
- Test both client and server execution paths
