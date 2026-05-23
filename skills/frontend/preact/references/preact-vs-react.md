# Preact vs React: Differences & Migration

## Bundle Size Comparison

| Library | Minified | Gzipped |
|---------|----------|---------|
| React + ReactDOM | ~130 kB | ~42 kB |
| Preact | ~3 kB | ~1.5 kB |
| Preact + compat | ~5 kB | ~2.5 kB |
| Preact + signals | ~6 kB | ~3 kB |

## Key API Differences

### Rendering

```tsx
// React
import { createRoot } from 'react-dom/client'
createRoot(document.getElementById('root')!).render(<App />)

// Preact
import { render } from 'preact'
render(<App />, document.getElementById('app')!)
```

### JSX Pragma

```tsx
// React — uses React.createElement
// Preact — needs jsx pragma
/** @jsx h */
import { h, render } from 'preact'

// Or use automatic runtime:
// tsconfig.json: "jsxImportSource": "preact"
```

### Fragment

```tsx
// React
import { Fragment } from 'react'

// Preact — Fragment is a named export
import { Fragment } from 'preact'

// Both support <>...</>
```

### Class Component Lifecycle

Preact supports most React lifecycle methods. The only methods not supported are:
- `componentDidCatch` (use error boundaries from `preact/compat`)
- `getDerivedStateFromError`

### Synthetic Events

React uses synthetic events (wraps native events). Preact uses native DOM events directly. This means:
- `e.nativeEvent` is not needed in Preact
- `onChange` works consistently in Preact (no need for `onInput` workaround)
- Event pooling is not used

### Portal

```tsx
// React
import { createPortal } from 'react-dom'

// Preact
import { createPortal } from 'preact/compat'
```

## Signals vs useState

| Feature | React useState | Preact Signals |
|---------|---------------|----------------|
| Re-render scope | Component tree | Specific bindings |
| Fine-grained | No | Yes |
| External state | Requires context | Works globally |
| Async-safe | Yes | Yes |
| Computed values | useMemo | computed() |
| Bundle cost | Built-in | ~2 kB extra |

```tsx
// useState — re-renders entire component
const [count, setCount] = useState(0)

// Signal — only updates bound DOM nodes
const count = signal(0)
// In JSX: {count} auto-subscribes
```

## Migration from React

### Step 1: Replace dependencies

```bash
npm uninstall react react-dom
npm install preact @preact/signals
npm install -D @preact/preset-vite
```

### Step 2: Add compat aliases

```ts
// vite.config.ts
resolve: {
  alias: {
    react: 'preact/compat',
    'react-dom': 'preact/compat',
  },
},
```

### Step 3: Update entry point

```tsx
// Before
import { createRoot } from 'react-dom/client'
createRoot(document.getElementById('root')!).render(<App />)

// After
import { render } from 'preact'
render(<App />, document.getElementById('app')!)
```

### Step 4: Update imports

```tsx
// Remove explicit React import (when using automatic JSX runtime)
// Old: import React from 'react'
// New: no import needed, or import from 'preact'

import { useState, useEffect } from 'preact/hooks'
// or use compat: import { useState, useEffect } from 'react' (aliased)
```

## What Works Out of the Box

- React Router (`react-router-dom`) via compat
- TanStack Query via compat
- Zustand via compat
- Framer Motion via compat
- Most UI libraries (MUI, Chakra, Ant Design) via compat

## Potential Issues

1. **React.lazy**: Use `preact/compat` or `lazy()` from `preact/compat`
2. **createContext**: Works via compat but signals are preferred
3. **StrictMode**: Not supported in Preact (use compat)
4. **Portals**: Slightly different API — use from `preact/compat`
5. **Test Utilities**: Use `@testing-library/preact` instead of `@testing-library/react`
6. **Third-party libs** that import React internally: all work via compat aliasing

## When to Use Preact vs React

**Use Preact when:**
- Bundle size is critical (mobile, ads, embedded widgets)
- Building lightweight SPAs
- Performance-sensitive UIs with many reactive updates
- SSR-first applications

**Use React when:**
- Relying on React-specific features (Suspense, Server Components, concurrent features)
- Using the React ecosystem extensively (Next.js, Remix)
- Team is React-native and not ready for mental model shift
- Need React DevTools (Preact DevTools exist but are less mature)
