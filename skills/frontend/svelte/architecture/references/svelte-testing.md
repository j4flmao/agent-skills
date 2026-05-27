# Svelte Testing Reference

## Component Testing

```svelte
<!-- Counter.svelte -->
<script>
  let count = $state(0);
</script>

<button onclick={() => count++}>
  {count}
</button>
```

```javascript
import { render, screen, fireEvent } from '@testing-library/svelte';
import Counter from './Counter.svelte';

test('increments on click', async () => {
  render(Counter);
  
  const button = screen.getByRole('button');
  expect(button).toHaveTextContent('0');
  
  await fireEvent.click(button);
  expect(button).toHaveTextContent('1');
});
```

## Key Points

- @testing-library/svelte provides Svelte component render
- $state runes manage reactive state in Svelte 5
- $derived computes values from reactive dependencies
- $effect runs side effects on state changes
- Component props tested with initial values
- Slots tested with child content passed to render
- Stores tested in isolation with get and set
- Svelte transitions tested with tick after animation
- SSR tests verify server-rendered component output
- Error boundaries catch render errors gracefully
