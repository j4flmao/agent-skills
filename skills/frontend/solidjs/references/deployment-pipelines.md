# Deployment Pipelines

## Table of Contents
1. [CI/CD Workflows](#ci/cd-workflows)
2. [Building for Production](#building-for-production)
3. [Dockerizing Solid Applications](#dockerizing-solid-applications)
4. [Edge Deployment (Cloudflare/Vercel)](#edge-deployment-(cloudflare/vercel))
5. [Environment Variables](#environment-variables)
6. [Asset Optimization](#asset-optimization)
7. [Cache Invalidation](#cache-invalidation)
8. [Rollback Strategies](#rollback-strategies)

---

## CI/CD Workflows

SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.

### Core Principles
1. **Reactive Primitives**: Signals, Memos, and Effects form the core of reactivity.
2. **No Virtual DOM**: Solid compiles templates directly to real DOM nodes.
3. **Read/Write Segregation**: `createSignal` returns a getter and setter to enforce one-way data flow.
4. **Explicit Tracking**: Dependencies are tracked where read.
5. **Batched Updates**: Multiple state changes are batched to prevent unnecessary renders.

### Detailed Explanation
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.

### Code Example: Advanced Patterns
```tsx
import { createSignal, createMemo, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export function createComplexState() {
  const [state, setState] = createStore({
    users: [],
    loading: false,
    error: null,
    metadata: {
      lastFetched: null,
      totalCount: 0
    }
  });

  const [search, setSearch] = createSignal('');

  const filteredUsers = createMemo(() => {
    const term = search().toLowerCase();
    return state.users.filter(u => u.name.toLowerCase().includes(term));
  });

  createEffect(() => {
    if (search() !== '') {
      console.log(`Searching for: ${search()}`);
    }
  });

  return { state, setState, search, setSearch, filteredUsers };
}
```

### Architecture Diagram
```ascii
+------------------+       +------------------+
|   User Input     | ----> |  Update Signal   |
+------------------+       +------------------+
                                  |
                                  v
+------------------+       +------------------+
|  DOM Update      | <---- | Compute Effect   |
+------------------+       +------------------+
```

### Deep Dive
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.


### Edge Cases and Performance
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.


### Troubleshooting
| Symptom | Cause | Mitigation |
|---------|-------|------------|
| View not updating | Destructured props | Use `splitProps` or `mergeProps` |
| Infinite loop | Effect updates a signal it reads | Use `untrack` or `on` |
| High memory usage | Uncleaned resources | Use `onCleanup` |
| Store not updating | Mutating state directly | Use `produce` or setter |
| Stale closure | Reading stale variable | Always read from signal `get()` |

#### Advanced Concept Part 1
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 2
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 3
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 4
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 5
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

## Building for Production

SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.

### Core Principles
1. **Reactive Primitives**: Signals, Memos, and Effects form the core of reactivity.
2. **No Virtual DOM**: Solid compiles templates directly to real DOM nodes.
3. **Read/Write Segregation**: `createSignal` returns a getter and setter to enforce one-way data flow.
4. **Explicit Tracking**: Dependencies are tracked where read.
5. **Batched Updates**: Multiple state changes are batched to prevent unnecessary renders.

### Detailed Explanation
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.

### Code Example: Advanced Patterns
```tsx
import { createSignal, createMemo, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export function createComplexState() {
  const [state, setState] = createStore({
    users: [],
    loading: false,
    error: null,
    metadata: {
      lastFetched: null,
      totalCount: 0
    }
  });

  const [search, setSearch] = createSignal('');

  const filteredUsers = createMemo(() => {
    const term = search().toLowerCase();
    return state.users.filter(u => u.name.toLowerCase().includes(term));
  });

  createEffect(() => {
    if (search() !== '') {
      console.log(`Searching for: ${search()}`);
    }
  });

  return { state, setState, search, setSearch, filteredUsers };
}
```

### Architecture Diagram
```ascii
+------------------+       +------------------+
|   User Input     | ----> |  Update Signal   |
+------------------+       +------------------+
                                  |
                                  v
+------------------+       +------------------+
|  DOM Update      | <---- | Compute Effect   |
+------------------+       +------------------+
```

### Deep Dive
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.


### Edge Cases and Performance
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.


### Troubleshooting
| Symptom | Cause | Mitigation |
|---------|-------|------------|
| View not updating | Destructured props | Use `splitProps` or `mergeProps` |
| Infinite loop | Effect updates a signal it reads | Use `untrack` or `on` |
| High memory usage | Uncleaned resources | Use `onCleanup` |
| Store not updating | Mutating state directly | Use `produce` or setter |
| Stale closure | Reading stale variable | Always read from signal `get()` |

#### Advanced Concept Part 1
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 2
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 3
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 4
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 5
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

## Dockerizing Solid Applications

SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.

### Core Principles
1. **Reactive Primitives**: Signals, Memos, and Effects form the core of reactivity.
2. **No Virtual DOM**: Solid compiles templates directly to real DOM nodes.
3. **Read/Write Segregation**: `createSignal` returns a getter and setter to enforce one-way data flow.
4. **Explicit Tracking**: Dependencies are tracked where read.
5. **Batched Updates**: Multiple state changes are batched to prevent unnecessary renders.

### Detailed Explanation
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.

### Code Example: Advanced Patterns
```tsx
import { createSignal, createMemo, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export function createComplexState() {
  const [state, setState] = createStore({
    users: [],
    loading: false,
    error: null,
    metadata: {
      lastFetched: null,
      totalCount: 0
    }
  });

  const [search, setSearch] = createSignal('');

  const filteredUsers = createMemo(() => {
    const term = search().toLowerCase();
    return state.users.filter(u => u.name.toLowerCase().includes(term));
  });

  createEffect(() => {
    if (search() !== '') {
      console.log(`Searching for: ${search()}`);
    }
  });

  return { state, setState, search, setSearch, filteredUsers };
}
```

### Architecture Diagram
```ascii
+------------------+       +------------------+
|   User Input     | ----> |  Update Signal   |
+------------------+       +------------------+
                                  |
                                  v
+------------------+       +------------------+
|  DOM Update      | <---- | Compute Effect   |
+------------------+       +------------------+
```

### Deep Dive
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.


### Edge Cases and Performance
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.


### Troubleshooting
| Symptom | Cause | Mitigation |
|---------|-------|------------|
| View not updating | Destructured props | Use `splitProps` or `mergeProps` |
| Infinite loop | Effect updates a signal it reads | Use `untrack` or `on` |
| High memory usage | Uncleaned resources | Use `onCleanup` |
| Store not updating | Mutating state directly | Use `produce` or setter |
| Stale closure | Reading stale variable | Always read from signal `get()` |

#### Advanced Concept Part 1
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 2
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 3
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 4
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 5
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

## Edge Deployment (Cloudflare/Vercel)

SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.

### Core Principles
1. **Reactive Primitives**: Signals, Memos, and Effects form the core of reactivity.
2. **No Virtual DOM**: Solid compiles templates directly to real DOM nodes.
3. **Read/Write Segregation**: `createSignal` returns a getter and setter to enforce one-way data flow.
4. **Explicit Tracking**: Dependencies are tracked where read.
5. **Batched Updates**: Multiple state changes are batched to prevent unnecessary renders.

### Detailed Explanation
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.

### Code Example: Advanced Patterns
```tsx
import { createSignal, createMemo, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export function createComplexState() {
  const [state, setState] = createStore({
    users: [],
    loading: false,
    error: null,
    metadata: {
      lastFetched: null,
      totalCount: 0
    }
  });

  const [search, setSearch] = createSignal('');

  const filteredUsers = createMemo(() => {
    const term = search().toLowerCase();
    return state.users.filter(u => u.name.toLowerCase().includes(term));
  });

  createEffect(() => {
    if (search() !== '') {
      console.log(`Searching for: ${search()}`);
    }
  });

  return { state, setState, search, setSearch, filteredUsers };
}
```

### Architecture Diagram
```ascii
+------------------+       +------------------+
|   User Input     | ----> |  Update Signal   |
+------------------+       +------------------+
                                  |
                                  v
+------------------+       +------------------+
|  DOM Update      | <---- | Compute Effect   |
+------------------+       +------------------+
```

### Deep Dive
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.


### Edge Cases and Performance
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.


### Troubleshooting
| Symptom | Cause | Mitigation |
|---------|-------|------------|
| View not updating | Destructured props | Use `splitProps` or `mergeProps` |
| Infinite loop | Effect updates a signal it reads | Use `untrack` or `on` |
| High memory usage | Uncleaned resources | Use `onCleanup` |
| Store not updating | Mutating state directly | Use `produce` or setter |
| Stale closure | Reading stale variable | Always read from signal `get()` |

#### Advanced Concept Part 1
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 2
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 3
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 4
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 5
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

## Environment Variables

SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.

### Core Principles
1. **Reactive Primitives**: Signals, Memos, and Effects form the core of reactivity.
2. **No Virtual DOM**: Solid compiles templates directly to real DOM nodes.
3. **Read/Write Segregation**: `createSignal` returns a getter and setter to enforce one-way data flow.
4. **Explicit Tracking**: Dependencies are tracked where read.
5. **Batched Updates**: Multiple state changes are batched to prevent unnecessary renders.

### Detailed Explanation
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.

### Code Example: Advanced Patterns
```tsx
import { createSignal, createMemo, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export function createComplexState() {
  const [state, setState] = createStore({
    users: [],
    loading: false,
    error: null,
    metadata: {
      lastFetched: null,
      totalCount: 0
    }
  });

  const [search, setSearch] = createSignal('');

  const filteredUsers = createMemo(() => {
    const term = search().toLowerCase();
    return state.users.filter(u => u.name.toLowerCase().includes(term));
  });

  createEffect(() => {
    if (search() !== '') {
      console.log(`Searching for: ${search()}`);
    }
  });

  return { state, setState, search, setSearch, filteredUsers };
}
```

### Architecture Diagram
```ascii
+------------------+       +------------------+
|   User Input     | ----> |  Update Signal   |
+------------------+       +------------------+
                                  |
                                  v
+------------------+       +------------------+
|  DOM Update      | <---- | Compute Effect   |
+------------------+       +------------------+
```

### Deep Dive
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.


### Edge Cases and Performance
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.


### Troubleshooting
| Symptom | Cause | Mitigation |
|---------|-------|------------|
| View not updating | Destructured props | Use `splitProps` or `mergeProps` |
| Infinite loop | Effect updates a signal it reads | Use `untrack` or `on` |
| High memory usage | Uncleaned resources | Use `onCleanup` |
| Store not updating | Mutating state directly | Use `produce` or setter |
| Stale closure | Reading stale variable | Always read from signal `get()` |

#### Advanced Concept Part 1
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 2
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 3
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 4
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 5
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

## Asset Optimization

SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.

### Core Principles
1. **Reactive Primitives**: Signals, Memos, and Effects form the core of reactivity.
2. **No Virtual DOM**: Solid compiles templates directly to real DOM nodes.
3. **Read/Write Segregation**: `createSignal` returns a getter and setter to enforce one-way data flow.
4. **Explicit Tracking**: Dependencies are tracked where read.
5. **Batched Updates**: Multiple state changes are batched to prevent unnecessary renders.

### Detailed Explanation
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.

### Code Example: Advanced Patterns
```tsx
import { createSignal, createMemo, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export function createComplexState() {
  const [state, setState] = createStore({
    users: [],
    loading: false,
    error: null,
    metadata: {
      lastFetched: null,
      totalCount: 0
    }
  });

  const [search, setSearch] = createSignal('');

  const filteredUsers = createMemo(() => {
    const term = search().toLowerCase();
    return state.users.filter(u => u.name.toLowerCase().includes(term));
  });

  createEffect(() => {
    if (search() !== '') {
      console.log(`Searching for: ${search()}`);
    }
  });

  return { state, setState, search, setSearch, filteredUsers };
}
```

### Architecture Diagram
```ascii
+------------------+       +------------------+
|   User Input     | ----> |  Update Signal   |
+------------------+       +------------------+
                                  |
                                  v
+------------------+       +------------------+
|  DOM Update      | <---- | Compute Effect   |
+------------------+       +------------------+
```

### Deep Dive
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.


### Edge Cases and Performance
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.


### Troubleshooting
| Symptom | Cause | Mitigation |
|---------|-------|------------|
| View not updating | Destructured props | Use `splitProps` or `mergeProps` |
| Infinite loop | Effect updates a signal it reads | Use `untrack` or `on` |
| High memory usage | Uncleaned resources | Use `onCleanup` |
| Store not updating | Mutating state directly | Use `produce` or setter |
| Stale closure | Reading stale variable | Always read from signal `get()` |

#### Advanced Concept Part 1
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 2
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 3
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 4
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 5
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

## Cache Invalidation

SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.

### Core Principles
1. **Reactive Primitives**: Signals, Memos, and Effects form the core of reactivity.
2. **No Virtual DOM**: Solid compiles templates directly to real DOM nodes.
3. **Read/Write Segregation**: `createSignal` returns a getter and setter to enforce one-way data flow.
4. **Explicit Tracking**: Dependencies are tracked where read.
5. **Batched Updates**: Multiple state changes are batched to prevent unnecessary renders.

### Detailed Explanation
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.

### Code Example: Advanced Patterns
```tsx
import { createSignal, createMemo, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export function createComplexState() {
  const [state, setState] = createStore({
    users: [],
    loading: false,
    error: null,
    metadata: {
      lastFetched: null,
      totalCount: 0
    }
  });

  const [search, setSearch] = createSignal('');

  const filteredUsers = createMemo(() => {
    const term = search().toLowerCase();
    return state.users.filter(u => u.name.toLowerCase().includes(term));
  });

  createEffect(() => {
    if (search() !== '') {
      console.log(`Searching for: ${search()}`);
    }
  });

  return { state, setState, search, setSearch, filteredUsers };
}
```

### Architecture Diagram
```ascii
+------------------+       +------------------+
|   User Input     | ----> |  Update Signal   |
+------------------+       +------------------+
                                  |
                                  v
+------------------+       +------------------+
|  DOM Update      | <---- | Compute Effect   |
+------------------+       +------------------+
```

### Deep Dive
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.


### Edge Cases and Performance
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.


### Troubleshooting
| Symptom | Cause | Mitigation |
|---------|-------|------------|
| View not updating | Destructured props | Use `splitProps` or `mergeProps` |
| Infinite loop | Effect updates a signal it reads | Use `untrack` or `on` |
| High memory usage | Uncleaned resources | Use `onCleanup` |
| Store not updating | Mutating state directly | Use `produce` or setter |
| Stale closure | Reading stale variable | Always read from signal `get()` |

#### Advanced Concept Part 1
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 2
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 3
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 4
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 5
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

## Rollback Strategies

SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.
SolidJS provides fine-grained reactivity, allowing for high performance and granular updates without a virtual DOM.

### Core Principles
1. **Reactive Primitives**: Signals, Memos, and Effects form the core of reactivity.
2. **No Virtual DOM**: Solid compiles templates directly to real DOM nodes.
3. **Read/Write Segregation**: `createSignal` returns a getter and setter to enforce one-way data flow.
4. **Explicit Tracking**: Dependencies are tracked where read.
5. **Batched Updates**: Multiple state changes are batched to prevent unnecessary renders.

### Detailed Explanation
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.
When a signal is accessed within a tracking context, a dependency is created. This allows the framework to know exactly which DOM nodes or effects to update when the signal changes.

### Code Example: Advanced Patterns
```tsx
import { createSignal, createMemo, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export function createComplexState() {
  const [state, setState] = createStore({
    users: [],
    loading: false,
    error: null,
    metadata: {
      lastFetched: null,
      totalCount: 0
    }
  });

  const [search, setSearch] = createSignal('');

  const filteredUsers = createMemo(() => {
    const term = search().toLowerCase();
    return state.users.filter(u => u.name.toLowerCase().includes(term));
  });

  createEffect(() => {
    if (search() !== '') {
      console.log(`Searching for: ${search()}`);
    }
  });

  return { state, setState, search, setSearch, filteredUsers };
}
```

### Architecture Diagram
```ascii
+------------------+       +------------------+
|   User Input     | ----> |  Update Signal   |
+------------------+       +------------------+
                                  |
                                  v
+------------------+       +------------------+
|  DOM Update      | <---- | Compute Effect   |
+------------------+       +------------------+
```

### Deep Dive
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.
To truly understand Solid's reactivity, we must delve into the dependency graph. Unlike React, where components re-render, in Solid, components execute exactly once. They are factory functions for creating the reactive graph and DOM nodes.


### Edge Cases and Performance
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.
A common pitfall is destructuring props. Because Solid relies on proxy objects for props, destructuring them breaks reactivity.


### Troubleshooting
| Symptom | Cause | Mitigation |
|---------|-------|------------|
| View not updating | Destructured props | Use `splitProps` or `mergeProps` |
| Infinite loop | Effect updates a signal it reads | Use `untrack` or `on` |
| High memory usage | Uncleaned resources | Use `onCleanup` |
| Store not updating | Mutating state directly | Use `produce` or setter |
| Stale closure | Reading stale variable | Always read from signal `get()` |

#### Advanced Concept Part 1
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 2
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 3
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 4
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

#### Advanced Concept Part 5
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).
The fine-grained reactive system operates purely via signal notifications. When a value is updated, it pushes notifications to subscribers. The execution model ensures that updates happen topologically, preventing glitches (seeing inconsistent state).

```typescript
// A simple implementation of createSignal
let context = null;
export function createSignal(value) {
  const subscribers = new Set();
  const read = () => {
    if (context) subscribers.add(context);
    return value;
  };
  const write = (newValue) => {
    value = newValue;
    for (const sub of subscribers) sub.execute();
  };
  return [read, write];
}
```

This illustrates the push-pull nature of SolidJS reactive core.

