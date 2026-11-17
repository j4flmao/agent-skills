# React Compiler

## Overview

React Compiler (nee React Forget) is a build-time optimization tool that automatically memoizes React components and hooks. It eliminates the need for manual `useMemo`, `useCallback`, and `React.memo`.

## Before vs After

```tsx
// Before React Compiler — manual memoization
function ProductList({ products, onSelect }: ProductListProps) {
  const sorted = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  )

  const handleSelect = useCallback(
    (id: string) => onSelect(id),
    [onSelect]
  )

  return (
    <ul>
      {sorted.map(product => (
        <ProductCard key={product.id} product={product} onSelect={handleSelect} />
      ))}
    </ul>
  )
}

// After React Compiler — automatic memoization
function ProductList({ products, onSelect }: ProductListProps) {
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <ul>
      {sorted.map(product => (
        <ProductCard key={product.id} product={product} onSelect={onSelect} />
      ))}
    </ul>
  )
}
```

## Installation

```bash
npm install -D babel-plugin-react-compiler   # React Compiler 1.0 (stable since Oct 2025)
# React 17/18 also need: npm install react-compiler-runtime
```

## Configuration

### Vite
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The compiler runs as a Babel plugin through @vitejs/plugin-react.
// Check the React Compiler docs for the setup matching your plugin-react major.
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]], // '18'/'17' for older React
      },
    }),
  ],
})
```

### Next.js
```javascript
// next.config.js
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
}
```

### Babel
```json
{
  "plugins": [
    ["babel-plugin-react-compiler", { "target": "19" }]
  ]
}
```

### ESLint Plugin
The compiler-aware lint rules ship in `eslint-plugin-react-hooks` (recommended presets); the separate `eslint-plugin-react-compiler` package is no longer needed. The rules work even before the compiler is enabled.
```bash
npm install -D eslint-plugin-react-hooks@latest
```

## Rules of React Compiler

### ✅ Valid Patterns (auto-memoized)

```tsx
// Local mutation
function Form() {
  const [items, setItems] = useState([])
  const newItems = items.filter(item => item.active)
  return <List items={newItems} />
}

// Derived state
function Greeting({ user }) {
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Guest'
  return <h1>Hello, {displayName}</h1>
}

// Callbacks
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>
}

// Props destructuring
function Card({ title, description, onAction }) {
  return (
    <div onClick={() => onAction(title)}>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}
```

### ❌ Invalid Patterns (not auto-memoized)

```tsx
// ❌ Side effects in render
function BadComponent() {
  analytics.track('render') // side effect — compiler may skip
  return <div>Hello</div>
}

// ❌ Mutating non-local values
function BadList({ items }) {
  items.push({ id: 99 }) // mutation of prop — breaks memoization
  return <List items={items} />
}

// ❌ Using refs in render (refs are fine, but not mutation)
function BadRef() {
  const ref = useRef(0)
  ref.current++ // mutation in render
  return <div>{ref.current}</div>
}

// ❌ Conditional hooks
function BadHooks({ condition }) {
  if (condition) {
    useState(0) // hooks must be unconditional
  }
  return <div />
}
```

## Compiler Output

```typescript
// Input
function ProductList({ products, onSelect }) {
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name))
  return sorted.map(product => (
    <ProductCard key={product.id} product={product} onSelect={onSelect} />
  ))
}

// Compiler output (conceptual — actual output is low-level IR)
// Uses t.memo and t.useCallback automatically
// function ProductList(t0) {
//   const $ = useMemoCache(2)
//   let [products, onSelect] = [t0.products, t0.onSelect]
//   let sorted
//   if ($[0] !== products) {
//     sorted = [...products].sort((a, b) => a.name.localeCompare(b.name))
//     $[0] = products
//     $[1] = sorted
//   } else {
//     sorted = $[1]
//   }
//   return sorted.map(product =>
//     <ProductCard key={product.id} product={product} onSelect={onSelect} />
//   )
// }
```

## Performance Impact

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| Re-renders | Manual memo (often missed) | Automatic | 20-80% fewer |
| Code complexity | useMemo/useCallback everywhere | Clean code | Significant |
| Bundle size | Larger (memo code) | Slightly smaller | ~2-5% |
| Build time | — | +10-20% | Moderate |
| Debugging | React DevTools | React DevTools + compiler | Same tools |

## Migration Strategy

```bash
# 1. Install compiler and ESLint plugin
npm install -D babel-plugin-react-compiler eslint-plugin-react-hooks@latest

# 2. Run ESLint with the react-hooks recommended preset to find violations
npx eslint src/
# 3. Enable the compiler in the bundler config (start with a directory or annotation opt-in if needed)

# 4. Fix violations iteratively
# 5. Enable compiler in CI
# 6. Remove manual useMemo/useCallback over time
```

## Compiler ESLint Rules

```typescript
// eslint.config.js
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  reactHooks.configs.flat.recommended,
]
```

What the compiler-aware rules flag (fix these before enabling the compiler on that code):
- mutating props, state or values created during render
- reading or writing `ref.current` during render
- calling `setState` during render or synchronously in an effect
- impure calls during render (`Date.now()`, `Math.random()`) and components defined inside components

## Compiler + React 19

React Compiler works best with React 19's improved reconciliation and concurrent features. React 19 also adds:

- **`use()`** — read promises and context without hooks
- **`useOptimistic()`** — optimistic updates
- **Server Components** — compile-time optimization
- **Actions** — form handling built-in

## When to Skip the Compiler

```tsx
// Skip compiler for specific components
// Add "use no memo" directive at top of file
"use no memo"

function LegacyComponent() {
  // This file won't be processed by the compiler
}
```

Use sparingly — only for components with intentional mutation patterns or third-party code.
