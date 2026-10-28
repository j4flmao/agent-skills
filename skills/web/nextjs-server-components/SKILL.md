---
name: nextjs-server-components
description: >
  Use this skill when the user says 'Next.js server components', 'fetch data in a server component', 'Next.js streaming', 'loading.tsx', 'Suspense in Next.js', 'reduce client JS in Next.js', 'hydration error', 'server actions in Next.js', 'parallel data fetching Next.js'. It applies Server Components in the Next.js App Router (15/16): data fetching without waterfalls, streaming with Suspense, small client boundaries, Server Actions with revalidation, and hydration-error fixes. Do NOT use for: caching/PPR internals and static-vs-dynamic diagnosis (use nextjs-internals), framework-agnostic RSC theory (use react-server-components), or Pages Router projects (use react-nextjs).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [web, nextjs, app-router, server-components, streaming, server-actions]
---

# Next.js Server Components in Practice

## Purpose
In the App Router every `page`/`layout` is a Server Component by default. Done well, this removes client-side fetching waterfalls and ships far less JavaScript; done badly (a `'use client'` at the top of every page), it is a slower SPA. This skill gives the concrete patterns for data loading, streaming, mutations and hydration correctness.

## Agent Protocol

### Trigger
"server component", "app router data fetching", "loading.tsx", "Suspense streaming", "hydration mismatch", "server action", "use client everywhere", "waterfall".

### Input Context
- Next.js version (15 or 16; async `params`/`cookies()` required in both).
- Data sources (ORM, internal API, third-party API) and auth.
- Which UI must be interactive.

### Output Artifact
Page/layout/component code with boundaries and Suspense placement; Server Actions.

### Response Format
```
Route: {app/... path}
Server: {components, data they fetch}
Client: {components with 'use client' and why}
Streaming: {Suspense boundaries + fallbacks}
Mutations: {action -> validation -> revalidation}
```

## Fetch Where You Render, in Parallel

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { getUser, getStats, getActivity } from '@/lib/data';

export default async function DashboardPage() {
  // Start independent requests together; await only what the shell needs.
  const userPromise = getUser();
  const statsPromise = getStats();
  const user = await userPromise;

  return (
    <main>
      <h1>Welcome, {user.name}</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats statsPromise={statsPromise} />
      </Suspense>
      <Suspense fallback={<p>Loading activity…</p>}>
        <Activity userId={user.id} />
      </Suspense>
    </main>
  );
}

async function Stats({ statsPromise }: { statsPromise: ReturnType<typeof getStats> }) {
  const stats = await statsPromise;
  return <dl>{stats.map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>;
}

async function Activity({ userId }: { userId: string }) {
  const items = await getActivity(userId);
  return <ul>{items.map(i => <li key={i.id}>{i.text}</li>)}</ul>;
}

function StatsSkeleton() {
  return <div aria-busy="true" style={{ minHeight: 120 }} />;
}
```
- Sequential `await a(); await b();` is a waterfall — start promises first or use `Promise.all`.
- Deduplicate repeated reads within one request with React `cache()`:

```ts
// lib/data.ts
import 'server-only';
import { cache } from 'react';
export const getUser = cache(async () => {
  const session = await auth();
  if (!session) throw new Error('getUser called without a session');
  return db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { id: true, name: true } });
});
```

## Dynamic Params (async)

```tsx
// app/posts/[slug]/page.tsx
import { notFound } from 'next/navigation';

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return <article><h1>{post.title}</h1><div>{post.body}</div></article>;
}

export async function generateStaticParams() {
  const posts = await listPublishedSlugs();
  return posts.map((slug) => ({ slug }));
}
```

## Streaming Rules
- `loading.tsx` wraps the whole page segment in Suspense — good for navigation feedback.
- Add granular `<Suspense>` around independent slow sections so the shell renders first.
- Fallbacks should reserve the final layout size to avoid CLS.
- Call `notFound()`/`redirect()` before the first Suspense boundary when they decide the status code.

## Client Boundaries
Mark only interactive leaves with `'use client'`; pass Server Components as `children`.

```tsx
// app/products/[id]/AddToCart.tsx
'use client';
import { useOptimistic, useTransition } from 'react';
import { addToCart } from './actions';

export function AddToCart({ productId, initialCount }: { productId: string; initialCount: number }) {
  const [count, setOptimistic] = useOptimistic(initialCount);
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(count + 1);
          await addToCart(productId);
        })
      }
    >
      Add to cart ({count})
    </button>
  );
}
```

## Server Actions

```ts
// app/products/[id]/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ProductId = z.string().uuid();

export async function addToCart(productId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error('Unauthorized addToCart call');
  const id = ProductId.parse(productId);
  await db.cartItem.upsert({
    where: { userId_productId: { userId: session.userId, productId: id } },
    create: { userId: session.userId, productId: id, qty: 1 },
    update: { qty: { increment: 1 } },
  });
  revalidatePath('/cart');
}
```
Actions are public POST endpoints: authenticate, authorize and validate in every action. With Cache Components (Next.js 16) prefer `updateTag()` for read-your-writes on tagged data.

## Hydration Mismatch Fixes
| Cause | Fix |
|-------|-----|
| `Date.now()`, `Math.random()`, locale formatting differs server vs. client | Compute on server and pass as prop, or render in `useEffect` |
| `typeof window` branches in render | Move to effect or a client-only component (`dynamic(() => import(...), { ssr: false })` inside a Client Component) |
| Invalid HTML nesting (`<div>` in `<p>`, nested `<a>`) | Fix markup |
| Browser extensions mutating DOM | `suppressHydrationWarning` only on the affected element (e.g. `<html>` with theme class) |

## Reducing Client JS
- Keep heavy libraries (markdown, syntax highlighting, date libs) in Server Components.
- Audit with `next build` output and `@next/bundle-analyzer`.
- Use `next/dynamic` for client components that are below the fold or rarely opened.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| `'use client'` on page.tsx to use one hook | Extract a small client child |
| Route Handler + `fetch('/api/...')` from a Server Component | Call the data function directly |
| Passing full ORM objects to client components | `select` only needed fields |
| Awaiting everything before rendering | Stream with Suspense |
| Auth only in `proxy.ts`/middleware | Check in data layer and actions |

## Checklist
- [ ] Pages/layouts are Server Components; client boundaries are leaves.
- [ ] No request waterfalls; `cache()` dedupes repeated reads.
- [ ] Suspense boundaries with size-stable fallbacks.
- [ ] Actions validate input, authorize and revalidate.
- [ ] No hydration warnings in the console.
