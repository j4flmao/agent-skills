---
name: Next.js Server Components
description: Best practices for SSR, Streaming, and hydration optimization in Next.js.
---

# Next.js Server Components

## Core Concepts
- **Server Components (RSC):** Render exclusively on the server. Zero bundle size impact.
- **Client Components:** Render on both client and server. Use only for interactivity.
- **Streaming:** Progressively render UI to the client, reducing Time To First Byte (TTFB).

## Mermaid Diagram
```mermaid
flowchart TD
    A[Request] --> B[Next.js Server]
    B --> C{Component Type?}
    C -->|Server Component| D[Fetch Data & Render HTML]
    C -->|Client Component| E[Render HTML & Send JS Bundle]
    D --> F[Stream to Browser]
    E --> F
    F --> G[Hydration for Client Components]
```

## Best Practices & Code Snippets

### 1. Data Fetching in Server Components
Fetch data directly in components to leverage caching and avoid client-side waterfalls.

```tsx
// app/page.tsx (Server Component)
async function getData() {
  const res = await fetch('https://api.example.com/data', { next: { revalidate: 3600 } });
  return res.json();
}

export default async function Page() {
  const data = await getData();
  return <main>{data.title}</main>;
}
```

### 2. Streaming with Suspense
Wrap slow data-fetching components in `<Suspense>` to unblock the rest of the UI.

```tsx
import { Suspense } from 'react';
import SlowComponent from './SlowComponent';

export default function Layout() {
  return (
    <section>
      <h1>Dashboard</h1>
      <Suspense fallback={<p>Loading data...</p>}>
        <SlowComponent />
      </Suspense>
    </section>
  );
}
```
