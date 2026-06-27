# Error Handling

## Purpose and Overview
This document provides a comprehensive guide on Error Handling within the Astro framework. Explains custom 404, 500 pages, and API route error catching.
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

### Strategy 1: Implementing Error Handling Pattern 1

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout1.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-1').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 2: Implementing Error Handling Pattern 2

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout2.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-2').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 3: Implementing Error Handling Pattern 3

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout3.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-3').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 4: Implementing Error Handling Pattern 4

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout4.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-4').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 5: Implementing Error Handling Pattern 5

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout5.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-5').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 6: Implementing Error Handling Pattern 6

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout6.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-6').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 7: Implementing Error Handling Pattern 7

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout7.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-7').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 8: Implementing Error Handling Pattern 8

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout8.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-8').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 9: Implementing Error Handling Pattern 9

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout9.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-9').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 10: Implementing Error Handling Pattern 10

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout10.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-10').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 11: Implementing Error Handling Pattern 11

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout11.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-11').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 12: Implementing Error Handling Pattern 12

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout12.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-12').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 13: Implementing Error Handling Pattern 13

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout13.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-13').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 14: Implementing Error Handling Pattern 14

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout14.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-14').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 15: Implementing Error Handling Pattern 15

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout15.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-15').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 16: Implementing Error Handling Pattern 16

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout16.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-16').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 17: Implementing Error Handling Pattern 17

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout17.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-17').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 18: Implementing Error Handling Pattern 18

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout18.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-18').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 19: Implementing Error Handling Pattern 19

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout19.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-19').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
```

#### Benefits and Trade-offs
Using this strategy ensures that the bundle size remains optimal. However, it requires careful coordination between server-rendered data and client-side state.

### Strategy 20: Implementing Error Handling Pattern 20

When dealing with Astro, you must consider the lifecycle of the component. The server renders the initial HTML, and the client hydrates the designated islands.

```astro
---
// Layout20.astro
import { ViewTransitions } from 'astro:transitions';
import Header from '../components/Header.astro';
import InteractiveComponent from '../components/ReactComponent.tsx';

const data = await fetch('https://api.example.com/data-20').then(r => r.json());
---
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <Header />
    <main>
      <h1>Data Item: {data.title}</h1>
      <InteractiveComponent client:visible />
    </main>
  </body>
</html>
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
