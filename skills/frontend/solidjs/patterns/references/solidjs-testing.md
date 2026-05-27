# SolidJS Testing Reference

## Component Testing

```tsx
import { render, screen, fireEvent } from 'solid-testing-library';
import { createSignal } from 'solid-js';

function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <div>
      <p data-testid="count">{count()}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

test('increments on click', async () => {
  render(() => <Counter />);
  
  expect(screen.getByTestId('count').textContent).toBe('0');
  
  fireEvent.click(screen.getByText('Increment'));
  
  expect(screen.getByTestId('count').textContent).toBe('1');
});
```

## Key Points

- solid-testing-library provides render with cleanup
- Signals are reactive primitives tested in isolation
- createResource tested with mocked fetcher functions
- Suspense boundaries show fallback during async loading
- createEffect triggers side effects on signal changes
- onMount and onCleanup lifecycle hooks in components
- Store updates with produce for immutable patterns
- Context providers tested with wrapper components
- Error boundaries catch thrown errors in components
- Memos derived from signals tested like computed values
