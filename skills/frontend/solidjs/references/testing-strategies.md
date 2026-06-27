# Testing Strategies

## Table of Contents
1. [Unit Testing Signals](#unit-testing-signals)
2. [Component Testing with Solid Testing Library](#component-testing-with-solid-testing-library)
3. [Mocking Dependencies](#mocking-dependencies)
4. [E2E Testing with Playwright](#e2e-testing-with-playwright)
5. [Testing Asynchronous Code](#testing-asynchronous-code)
6. [Test Coverage Analysis](#test-coverage-analysis)
7. [Visual Regression Testing](#visual-regression-testing)
8. [Performance Testing](#performance-testing)

---

## Unit Testing Signals

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

## Component Testing with Solid Testing Library

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

## Mocking Dependencies

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

## E2E Testing with Playwright

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

## Testing Asynchronous Code

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

## Test Coverage Analysis

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

## Visual Regression Testing

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

## Performance Testing

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

