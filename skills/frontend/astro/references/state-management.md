# State Management

## Purpose and Overview
This document provides a comprehensive guide on State Management within the Astro framework. Covers using Nano Stores and React Context across Islands.
It serves as the definitive reference for engineers building scalable applications with Astro.

## Core Principles
1. **Zero JS by Default:** Always prefer static HTML. Only hydrate when interactivity is strictly needed.
2. **Islands Architecture:** Isolate interactive components into independent 'Islands'.
3. **Progressive Enhancement:** Ensure basic functionality works without JavaScript.
4. **View Transitions:** Utilize seamless page transitions for SPA-like experience in MPA.
5. **Component Agnostic:** Mix React, Vue, Svelte, and solid where it makes sense, but keep them isolated.

## Deep Architectural Insights

Astro fundamentally changes how we ship web applications. By utilizing the Islands Architecture, it flips the default from 'client-side rendering' to 'server-side rendering with surgical client-side hydration'.

```text
+-------------------------------------------------+
|                 Astro Layout                    |
|  +-------------------------------------------+  |
|  |                Header (Static)            |  |
|  +-------------------------------------------+  |
|                                                 |
|  +-------------+               +-------------+  |
|  | Sidebar     |               | Main Content|  |
|  | (Static)    |               | (Island)    |  |
|  +-------------+               +-------------+  |
|                                                 |
|  +-------------------------------------------+  |
|  |             Footer (Static)               |  |
|  +-------------------------------------------+  |
+-------------------------------------------------+
```

### Server-Side vs Client-Side
Astro parses your `.astro` files on the server (or at build time for SSG) and strips out all JavaScript by default. If a component uses a directive like `client:load`, Astro packages that component and its dependencies into an Island.

## Implementation Strategies

### Strategy 1: Implementing State Management Pattern 1

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store1.ts
import { atom } from 'nanostores';
export const myStore1 = atom(0);
```

```tsx
// ReactComponent1.tsx
import { useStore } from '@nanostores/react';
import { myStore1 } from '../stores/store1';

export default function InteractiveComponent() {
  const $store = useStore(myStore1);
  return (
    <div className="island">
      <p>State 1 Value: {$store}</p>
      <button onClick={() => myStore1.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 2: Implementing State Management Pattern 2

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store2.ts
import { atom } from 'nanostores';
export const myStore2 = atom(0);
```

```tsx
// ReactComponent2.tsx
import { useStore } from '@nanostores/react';
import { myStore2 } from '../stores/store2';

export default function InteractiveComponent() {
  const $store = useStore(myStore2);
  return (
    <div className="island">
      <p>State 2 Value: {$store}</p>
      <button onClick={() => myStore2.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 3: Implementing State Management Pattern 3

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store3.ts
import { atom } from 'nanostores';
export const myStore3 = atom(0);
```

```tsx
// ReactComponent3.tsx
import { useStore } from '@nanostores/react';
import { myStore3 } from '../stores/store3';

export default function InteractiveComponent() {
  const $store = useStore(myStore3);
  return (
    <div className="island">
      <p>State 3 Value: {$store}</p>
      <button onClick={() => myStore3.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 4: Implementing State Management Pattern 4

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store4.ts
import { atom } from 'nanostores';
export const myStore4 = atom(0);
```

```tsx
// ReactComponent4.tsx
import { useStore } from '@nanostores/react';
import { myStore4 } from '../stores/store4';

export default function InteractiveComponent() {
  const $store = useStore(myStore4);
  return (
    <div className="island">
      <p>State 4 Value: {$store}</p>
      <button onClick={() => myStore4.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 5: Implementing State Management Pattern 5

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store5.ts
import { atom } from 'nanostores';
export const myStore5 = atom(0);
```

```tsx
// ReactComponent5.tsx
import { useStore } from '@nanostores/react';
import { myStore5 } from '../stores/store5';

export default function InteractiveComponent() {
  const $store = useStore(myStore5);
  return (
    <div className="island">
      <p>State 5 Value: {$store}</p>
      <button onClick={() => myStore5.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 6: Implementing State Management Pattern 6

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store6.ts
import { atom } from 'nanostores';
export const myStore6 = atom(0);
```

```tsx
// ReactComponent6.tsx
import { useStore } from '@nanostores/react';
import { myStore6 } from '../stores/store6';

export default function InteractiveComponent() {
  const $store = useStore(myStore6);
  return (
    <div className="island">
      <p>State 6 Value: {$store}</p>
      <button onClick={() => myStore6.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 7: Implementing State Management Pattern 7

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store7.ts
import { atom } from 'nanostores';
export const myStore7 = atom(0);
```

```tsx
// ReactComponent7.tsx
import { useStore } from '@nanostores/react';
import { myStore7 } from '../stores/store7';

export default function InteractiveComponent() {
  const $store = useStore(myStore7);
  return (
    <div className="island">
      <p>State 7 Value: {$store}</p>
      <button onClick={() => myStore7.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 8: Implementing State Management Pattern 8

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store8.ts
import { atom } from 'nanostores';
export const myStore8 = atom(0);
```

```tsx
// ReactComponent8.tsx
import { useStore } from '@nanostores/react';
import { myStore8 } from '../stores/store8';

export default function InteractiveComponent() {
  const $store = useStore(myStore8);
  return (
    <div className="island">
      <p>State 8 Value: {$store}</p>
      <button onClick={() => myStore8.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 9: Implementing State Management Pattern 9

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store9.ts
import { atom } from 'nanostores';
export const myStore9 = atom(0);
```

```tsx
// ReactComponent9.tsx
import { useStore } from '@nanostores/react';
import { myStore9 } from '../stores/store9';

export default function InteractiveComponent() {
  const $store = useStore(myStore9);
  return (
    <div className="island">
      <p>State 9 Value: {$store}</p>
      <button onClick={() => myStore9.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 10: Implementing State Management Pattern 10

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store10.ts
import { atom } from 'nanostores';
export const myStore10 = atom(0);
```

```tsx
// ReactComponent10.tsx
import { useStore } from '@nanostores/react';
import { myStore10 } from '../stores/store10';

export default function InteractiveComponent() {
  const $store = useStore(myStore10);
  return (
    <div className="island">
      <p>State 10 Value: {$store}</p>
      <button onClick={() => myStore10.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 11: Implementing State Management Pattern 11

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store11.ts
import { atom } from 'nanostores';
export const myStore11 = atom(0);
```

```tsx
// ReactComponent11.tsx
import { useStore } from '@nanostores/react';
import { myStore11 } from '../stores/store11';

export default function InteractiveComponent() {
  const $store = useStore(myStore11);
  return (
    <div className="island">
      <p>State 11 Value: {$store}</p>
      <button onClick={() => myStore11.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 12: Implementing State Management Pattern 12

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store12.ts
import { atom } from 'nanostores';
export const myStore12 = atom(0);
```

```tsx
// ReactComponent12.tsx
import { useStore } from '@nanostores/react';
import { myStore12 } from '../stores/store12';

export default function InteractiveComponent() {
  const $store = useStore(myStore12);
  return (
    <div className="island">
      <p>State 12 Value: {$store}</p>
      <button onClick={() => myStore12.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 13: Implementing State Management Pattern 13

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store13.ts
import { atom } from 'nanostores';
export const myStore13 = atom(0);
```

```tsx
// ReactComponent13.tsx
import { useStore } from '@nanostores/react';
import { myStore13 } from '../stores/store13';

export default function InteractiveComponent() {
  const $store = useStore(myStore13);
  return (
    <div className="island">
      <p>State 13 Value: {$store}</p>
      <button onClick={() => myStore13.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 14: Implementing State Management Pattern 14

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store14.ts
import { atom } from 'nanostores';
export const myStore14 = atom(0);
```

```tsx
// ReactComponent14.tsx
import { useStore } from '@nanostores/react';
import { myStore14 } from '../stores/store14';

export default function InteractiveComponent() {
  const $store = useStore(myStore14);
  return (
    <div className="island">
      <p>State 14 Value: {$store}</p>
      <button onClick={() => myStore14.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 15: Implementing State Management Pattern 15

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store15.ts
import { atom } from 'nanostores';
export const myStore15 = atom(0);
```

```tsx
// ReactComponent15.tsx
import { useStore } from '@nanostores/react';
import { myStore15 } from '../stores/store15';

export default function InteractiveComponent() {
  const $store = useStore(myStore15);
  return (
    <div className="island">
      <p>State 15 Value: {$store}</p>
      <button onClick={() => myStore15.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 16: Implementing State Management Pattern 16

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store16.ts
import { atom } from 'nanostores';
export const myStore16 = atom(0);
```

```tsx
// ReactComponent16.tsx
import { useStore } from '@nanostores/react';
import { myStore16 } from '../stores/store16';

export default function InteractiveComponent() {
  const $store = useStore(myStore16);
  return (
    <div className="island">
      <p>State 16 Value: {$store}</p>
      <button onClick={() => myStore16.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 17: Implementing State Management Pattern 17

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store17.ts
import { atom } from 'nanostores';
export const myStore17 = atom(0);
```

```tsx
// ReactComponent17.tsx
import { useStore } from '@nanostores/react';
import { myStore17 } from '../stores/store17';

export default function InteractiveComponent() {
  const $store = useStore(myStore17);
  return (
    <div className="island">
      <p>State 17 Value: {$store}</p>
      <button onClick={() => myStore17.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 18: Implementing State Management Pattern 18

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store18.ts
import { atom } from 'nanostores';
export const myStore18 = atom(0);
```

```tsx
// ReactComponent18.tsx
import { useStore } from '@nanostores/react';
import { myStore18 } from '../stores/store18';

export default function InteractiveComponent() {
  const $store = useStore(myStore18);
  return (
    <div className="island">
      <p>State 18 Value: {$store}</p>
      <button onClick={() => myStore18.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 19: Implementing State Management Pattern 19

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store19.ts
import { atom } from 'nanostores';
export const myStore19 = atom(0);
```

```tsx
// ReactComponent19.tsx
import { useStore } from '@nanostores/react';
import { myStore19 } from '../stores/store19';

export default function InteractiveComponent() {
  const $store = useStore(myStore19);
  return (
    <div className="island">
      <p>State 19 Value: {$store}</p>
      <button onClick={() => myStore19.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 20: Implementing State Management Pattern 20

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```ts
// store20.ts
import { atom } from 'nanostores';
export const myStore20 = atom(0);
```

```tsx
// ReactComponent20.tsx
import { useStore } from '@nanostores/react';
import { myStore20 } from '../stores/store20';

export default function InteractiveComponent() {
  const $store = useStore(myStore20);
  return (
    <div className="island">
      <p>State 20 Value: {$store}</p>
      <button onClick={() => myStore20.set($store + 1)}>Increment</button>
    </div>
  );
}
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

## Additional Considerations

**Consideration 1:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 2:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 3:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 4:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 5:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 6:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 7:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 8:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 9:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 10:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 11:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 12:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 13:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 14:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 15:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 16:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 17:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 18:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 19:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 20:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 21:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 22:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 23:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 24:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 25:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 26:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 27:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 28:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 29:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

**Consideration 30:** Always validate that `client:idle` or `client:visible` is used appropriately instead of defaulting to `client:load`. This defers script evaluation until the main thread is free or the component enters the viewport, respectively.

## Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---|---|---|
| Client JS not loading (Case 1) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 1) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 1) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 2) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 2) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 2) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 3) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 3) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 3) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 4) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 4) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 4) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 5) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 5) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 5) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 6) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 6) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 6) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 7) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 7) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 7) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 8) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 8) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 8) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 9) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 9) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 9) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |
| Client JS not loading (Case 10) | Missing hydration directive (`client:*`) | Add `client:load` or `client:visible` to the component in the `.astro` file. |
| State not syncing (Case 10) | Multiple React versions or Island isolation | Use Nano Stores for cross-island state management. |
| Build fails (Case 10) | Unresolved imports in Astro frontmatter | Verify path aliases in `tsconfig.json` and relative paths. |

## Best Practices

- **Practice 1:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 1b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 2:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 2b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 3:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 3b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 4:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 4b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 5:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 5b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 6:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 6b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 7:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 7b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 8:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 8b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 9:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 9b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 10:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 10b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 11:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 11b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 12:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 12b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 13:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 13b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 14:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 14b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 15:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 15b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 16:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 16b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 17:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 17b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 18:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 18b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 19:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 19b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.
- **Practice 20:** Leverage Astro's built-in image optimization `<Image />` component to automatically serve WebP/AVIF formats and prevent layout shifts.
- **Practice 20b:** Keep your routing flat where possible. Deeply nested file-based routes can become hard to maintain.

<!-- Compression Footer: Validated by Skills Engine -->
