# Qwik Resumability Architecture

## Resumability vs Hydration

| Aspect | Hydration (React/Vue) | Resumability (Qwik) |
|--------|----------------------|---------------------|
| Initial load | Download all component code + replay | Download HTML + tiny JS |
| Boot time | Scales with component count | Constant (~1ms) |
| State | In JS memory | Serialized in HTML |
| Event handling | Re-attach all listeners | Lazy-load per interaction |
| Bundle sent | Entire app | Only what's needed |

## How Resumability Works

```tsx
// Component code
export default component$(() => {
  const count = useSignal(0)
  return <button onClick$={() => count.value++}>{count.value}</button>
})
```

**At build time**, Qwik optimizer extracts:
- Serialized HTML with `data-qwik` attributes
- QRL (Qwik Resource Locator) references pointing to lazy chunks
- Inline state serialized as JSON in HTML comments

**At runtime**, browser:
1. Renders HTML directly (no JS needed)
2. On click, loads only the `onClick$` handler chunk via QRL
3. Resumes component state from HTML serialization
4. Never re-runs the component function

## Dollar-Sign API

| API | Boundary |
|-----|----------|
| `component$()` | Lazy-loadable component |
| `$()` | Lazy-loadable closure |
| `onClick$()` | Lazy event handler |
| `useVisibleTask$()` | Lazy client-side effect |
| `useComputed$()` | Lazy computed value |
| `routeLoader$()` | Lazy server data |
| `routeAction$()` | Lazy server action |
| `server$()` | Server-only function |

## Serialization

```tsx
export default component$(() => {
  const state = useStore({
    items: [{ id: 1, text: 'Hello' }],
    filter: 'active',
    metadata: { version: 2 },
  })

  return <div>{state.items.length}</div>
})
```

The store is serialized into HTML as:
```html
<div>
  <script type="qwik/json">{"items":[{"id":1,"text":"Hello"}],"filter":"active","metadata":{"version":2}}</script>
</div>
```

## Lazy Loading Flow

1. User visits page → HTML renders immediately
2. User clicks button → `onClick$` QRL resolves to chunk URL
3. Browser fetches chunk → `https://site.com/build/q-abc123.js`
4. Qwik resumes the component from serialized state
5. Event handler executes, state updates, DOM patches

## Optimizer Rules

```tsx
// ✅ Correct — $() boundaries visible to optimizer
export const log = $((msg: string) => console.log(msg))

// ❌ Wrong — dynamic $() call cannot be analyzed
const fn = Math.random() > 0.5 ? $(() => 'a') : $(() => 'b')

// ✅ Correct — event handlers as $ suffix
<button onClick$={() => doStuff()}>

// ❌ Wrong — wrapping handler breaks lazy loading
<button onClick={() => $(doStuff)()}>
```

## Bundle Splitting

Every `$` boundary creates a separate chunk:
- `q-abc123.js` — component A
- `q-def456.js` — component B onClick handler
- `q-ghi789.js` — component B onScroll handler
- `q-jkl012.js` — shared utility function

This means a page with 50 components only downloads what the user actually interacts with.
