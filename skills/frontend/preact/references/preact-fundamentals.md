# Preact Fundamentals

Preact is a small (around 4 kB gzipped core) virtual-DOM UI library with a React-compatible API. This reference covers components, JSX, hooks, events, refs, rendering, Signals basics and the differences from React that matter in daily work. Setup is in `preact-setup.md`; architecture choices in `preact-architecture.md`; comparison in `preact-vs-react.md`.

## Rendering an App

```tsx
import { render } from 'preact';
import { App } from './app';

render(<App />, document.getElementById('app')!);
```

JSX compiles to `h()` / `jsx()` calls. With TypeScript or Vite, configure the automatic runtime:

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

The `@preact/preset-vite` plugin configures JSX, aliases and Prefresh (hot module replacement).

## Components

```tsx
import type { ComponentChildren } from 'preact';

type CardProps = { title: string; children?: ComponentChildren };

export function Card({ title, children }: CardProps) {
  return (
    <section class="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

- Function components are the norm; class components (`Component` from `preact`) remain supported.
- Both `class` and `className` work; `class` is idiomatic in Preact.
- `Fragment` (`<>...</>`) groups children without a wrapper element.

## Hooks

Import from `preact/hooks`:

```tsx
import { useState, useEffect, useMemo, useCallback, useRef, useReducer, useContext } from 'preact/hooks';

export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <button onClick={() => setCount(c => c + 1)}>Clicked {count}</button>;
}
```

Hook rules are the same as React: call at the top level, never conditionally; include dependencies in effect arrays.

## Events

- Preact attaches native DOM listeners; there is no synthetic event system. Event objects are native `Event`s.
- Use `onInput` for text input changes (fires per keystroke). `onChange` follows native semantics: for text inputs it fires on blur/commit. `preact/compat` maps `onChange` to input events for React compatibility.
- For standard DOM events Preact lowercases the name (`onClick` listens to `click`); for custom element events the case after `on` is preserved, so `onMyEvent` listens to `MyEvent`.

```tsx
function NameField() {
  const [name, setName] = useState('');
  return <input value={name} onInput={e => setName(e.currentTarget.value)} />;
}
```

## Refs

```tsx
import { useRef, useEffect } from 'preact/hooks';

function AutoFocus() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <input ref={ref} />;
}
```

`forwardRef` lives in `preact/compat`; in Preact you can also pass a ref as a regular prop with a different name.

## Context

```tsx
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

const ThemeContext = createContext<'light' | 'dark'>('light');

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button class={`btn btn-${theme}`}>OK</button>;
}

<ThemeContext.Provider value="dark"><ThemedButton /></ThemeContext.Provider>
```

## Signals Basics

`@preact/signals` provides fine-grained reactive state that updates only the components (or text nodes) that read it.

```tsx
import { signal, computed } from '@preact/signals';

const count = signal(0);
const double = computed(() => count.value * 2);

export function SignalCounter() {
  return (
    <div>
      <p>{count} x 2 = {double}</p>      {/* passing the signal itself binds the text node directly */}
      <button onClick={() => count.value++}>+1</button>
    </div>
  );
}
```

- Read and write with `.value`. Inside components, reading `.value` subscribes the component.
- Passing a signal directly into JSX (`{count}`) updates only that text node without re-rendering the component.
- Module-level signals act as simple global stores; use `useSignal`/`useComputed` for component-local signals.

Details and patterns in `preact-advanced.md`.

## Lists and Keys

```tsx
<ul>{items.map(item => <li key={item.id}>{item.label}</li>)}</ul>
```

Stable keys (IDs, not array indexes) are required for correct reordering and preserved state.

## Conditional Rendering and Forms

- Conditional: `{loading ? <Spinner /> : <Results />}`, `{error && <ErrorBanner error={error} />}`.
- Controlled inputs with `value` + `onInput`; uncontrolled with `defaultValue` and refs.
- Checkboxes: `checked` + `onChange` (native change fires on toggle).

## Differences From React to Remember

| Topic | Preact | React |
|-------|--------|-------|
| Events | Native DOM events | Synthetic events |
| Text input change | `onInput` (core); `onChange` aliased only via compat | `onChange` per keystroke |
| `class` attribute | `class` or `className` | `className` |
| Hooks import | `preact/hooks` | `react` |
| Compatibility layer | `preact/compat` (aliases `react`, `react-dom`) | n/a |
| Concurrent features | Not implemented the same way (no full concurrent rendering) | Concurrent rendering, transitions |
| Size | ~4 kB core | Significantly larger |

## Debugging

```ts
// import once in development entry
if (import.meta.env.DEV) {
  await import('preact/debug');   // warnings + Preact DevTools browser extension support
}
```

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/preact';

test('increments the counter', () => {
  // Arrange
  render(<Counter />);
  // Act
  fireEvent.click(screen.getByRole('button'));
  // Assert
  expect(screen.getByRole('button').textContent).toBe('Clicked 1');
});
```

Use Vitest with `jsdom` or `happy-dom` environments.

## Checklist

- [ ] `jsxImportSource: preact` configured; `@preact/preset-vite` for Vite
- [ ] Hooks imported from `preact/hooks`
- [ ] `onInput` for text fields (or compat semantics deliberately)
- [ ] Stable keys on lists
- [ ] `preact/debug` only in development
- [ ] Tests with `@testing-library/preact`
