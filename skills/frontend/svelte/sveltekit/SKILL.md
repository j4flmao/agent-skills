---
name: sveltekit
description: >
  Use this skill when building SvelteKit applications — routing, load functions, form actions, API endpoints, server-side rendering, stores, deployment. This skill enforces: file-based routing conventions, server load functions for data fetching, form actions with validation and redirects, separated API endpoints in routes/api. Do NOT use for: non-Svelte frontend frameworks, backend-only APIs, static site generation without SvelteKit.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, svelte, sveltekit, phase-3]
---

# SvelteKit

## Purpose
Define and enforce SvelteKit application architecture with routing conventions, data loading, form handling, and deployment patterns.

## Agent Protocol

### Trigger
User request includes: `svelte`, `sveltekit`, `svelte app`, `svelte routing`, `svelte load`, `svelte server`, `svelte form`, `svelte kit`.

### Input Context
- SvelteKit version (2.x)
- Rendering mode (SSR, SPA, static)
- Data fetching requirements
- Auth strategy

### Output Artifact
A markdown document containing:
- Project structure
- Routing conventions
- Load functions (page, layout, server)
- Form actions
- Server-side vs client-side rendering
- Stores and state management
- Deployment configuration

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up Project Structure

```
src/
├── routes/
│   ├── +page.svelte           # Home page
│   ├── +layout.svelte         # Root layout
│   ├── +layout.server.ts      # Server-side layout data
│   ├── orders/
│   │   ├── +page.svelte       # /orders
│   │   ├── +page.server.ts    # Server load
│   │   ├── [id]/
│   │   │   ├── +page.svelte   # /orders/:id
│   │   │   └── +page.server.ts
│   │   └── create/
│   │       └── +page.svelte   # /orders/create
│   └── api/
│       └── orders/
│           └── +server.ts     # API endpoint
├── lib/
│   ├── server/
│   │   ├── db.ts
│   │   └── auth.ts
│   ├── components/
│   │   ├── OrderCard.svelte
│   │   └── Pagination.svelte
│   └── types.ts
├── stores/
│   ├── cart.ts
│   └── user.ts
├── app.html
├── hooks.server.ts
└── params.ts
```

### Step 2: Implement Page Load

```typescript
// src/routes/orders/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const page = Number(url.searchParams.get('page')) || 1;
  const orders = await db.order.findMany({
    where: { userId: locals.user.id },
    skip: (page - 1) * 20,
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  const total = await db.order.count({ where: { userId: locals.user.id } });

  return { orders, total, page };
};
```

### Step 3: Implement Form Actions

```typescript
// src/routes/orders/create/+page.server.ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const customerId = data.get('customerId');
    const items = JSON.parse(data.get('items') as string);

    if (!customerId) return fail(422, { error: 'Customer required' });

    const order = await db.order.create({
      data: { customerId, items: { create: items }, userId: locals.user.id }
    });

    throw redirect(303, `/orders/${order.id}`);
  }
};
```

### Step 4: Implement API Endpoints

```typescript
// src/routes/api/orders/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
  const orders = await db.order.findMany({ where: { userId: locals.user.id } });
  return json(orders);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const order = await db.order.create({ data: { ...body, userId: locals.user.id } });
  return json(order, { status: 201 });
};
```

### Step 5: Shared Load Functions

```typescript
// src/routes/+layout.server.ts — runs for every route in the tree
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user,
    notifications: await db.notification.findMany({
      where: { userId: locals.user.id, read: false }
    }),
    cartCount: await db.cartItem.count({ where: { userId: locals.user.id } })
  };
};
```

### Step 6: Universal Load Functions

```typescript
// src/routes/products/+page.ts — runs on server (SSR) and client (SPA navigation)
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
  const page = url.searchParams.get('page') || '1';
  const res = await fetch(`/api/products?page=${page}`);
  return await res.json();
};
```

### Step 7: Error Handling

```typescript
// src/routes/+error.svelte
<script lang="ts">
  import { page } from '$app/stores';
</script>

<h1>{$page.status}</h1>
<p>{$page.error?.message}</p>
```

### Step 8: Hooks

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');
  event.locals.user = token ? await getUserFromToken(token) : null;
  return await resolve(event);
};
```

## Component Architecture

### Load Function Decision Tree
```
Is the data user-specific or server-side only?
  Yes -> +page.server.ts or +layout.server.ts
  No  -> Is the data publicly cacheable?
    Yes -> +page.ts (universal load, runs on server+client)
    No -> +page.server.ts

Does the parent route have data the child needs?
  Yes -> Use parent() in the child load function
  No -> Independent fetch
```

### Route Structure Patterns
```
src/routes/
  (app)/                    -- Route group, no path segment
    +layout.svelte          -- App shell (sidebar + header)
    +layout.server.ts       -- User data fetch
    dashboard/+page.svelte
    settings/+page.svelte
  (marketing)/
    +layout.svelte          -- Marketing layout (no auth check)
    +page.svelte            -- Landing page
    about/+page.svelte
```

## Common Pitfalls

1. **Fetching on client for initial data**: Initial page data must be loaded in `+page.server.ts`, not in onMount.
2. **Mutating `$page.data` directly**: It's read-only. Use stores or form actions for mutations.
3. **Forgetting `throw redirect`**: `redirect` must be thrown, not returned.
4. **Over-fetching in layout load**: Layout loads run on every navigation — keep them minimal.
5. **Mixing server and client code**: `$page`, `$app/stores` are client-only. Use `+page.server.ts` for server code.
6. **Missing error pages**: Every app needs `+error.svelte` and optionally `+error@...` per route group.
7. **Not using `invalid` for validation**: Use `fail()` (formerly `invalid()`) with field-level error maps.

## Best Practices

1. Colocate server load functions with the page that needs the data.
2. Use `+layout.server.ts` for shared data (user, notifications) — avoids N+1 load calls.
3. Prefer `form actions` over API routes + client fetch for mutations.
4. Use `+page.ts` (universal load) for publicly cacheable data to enable client-side navigation caching.
5. Validate all form data before passing to database — never trust the client.
6. Use `locals` for auth and database clients — injected via `hooks.server.ts`.
7. Keep `+page.svelte` components thin — extract reusable UI into `$lib/components/`.

## Compared With

| Aspect | SvelteKit | Next.js App Router | Nuxt 3 |
|--------|-----------|-------------------|--------|
| Data loading | load functions (+page.server.ts) | async component + fetch | useAsyncData / useFetch |
| Mutations | form actions | Server Actions | useFetch with method |
| API endpoints | +server.ts | route.ts | server/api/ |
| Stores | writable/derived stores | useState / Zustand | useState / Pinia |
| Rendering | SSR, SSG, SPA per route | SSR, SSG, ISR per route | SSR, SSG, SPA per route |
| Bundle size | ~5KB runtime | ~70KB+ (React) | ~40KB (Vue) |
| Hydration | Per-component (lazy) | Full-page | Full-page |

## Performance

1. Svelte compiles to vanilla JS — no virtual DOM, smaller bundles (~5KB runtime).
2. Per-component hydration (Svelte 5 with runes) reduces initial JS cost.
3. Load functions run on server for SSR, client for SPA navigation — data can be cached.
4. Image optimization via `@sveltejs/enhanced-img` for automatic AVIF/WebP.
5. Route-level code splitting by default.
6. `preload` attributes for critical assets.
7. Caching headers via `setHeaders` in load functions.

## Tooling

1. `npm create svelte@latest` — scaffold project.
2. `npm run dev` — HMR dev server.
3. `npm run build` — production build with adapter.
4. `npm run preview` — preview production build locally.
5. `svelte-check` — CLI type checking.
6. `@sveltejs/adapter-auto` — automatic adapter selection.
7. `svelte-add` — CLI to add integrations (Tailwind, PostCSS, etc.).
8. `vite-plugin-svelte-inspector` — inspect component hierarchy in dev.

## Rules
- All routes follow SvelteKit file-based routing convention with `+page.svelte`, `+layout.svelte`, `+server.ts` naming.
- Data fetching in `+page.server.ts` load functions — never fetch on client for initial page data.
- Form mutations use `Actions` with `fail()` for validation errors and `redirect()` for success.
- API endpoints placed in `routes/api/` directory with `+server.ts` handlers.
- Server-only code in `lib/server/` — never import in client components.
- Stores for client-side state only; server state flows through load functions.
- Parameters validated and parsed before use — never trust URL params directly.
- Use `+layout.server.ts` for shared data but keep it minimal to avoid unnecessary fetches.
- Always set appropriate cache headers in load functions for public data.

## References
  - references/endpoints-loading.md — SvelteKit Endpoints and Data Loading
  - references/stores-context.md — Svelte Stores and Context API
  - references/sveltekit-auth.md — SvelteKit Auth & Security Patterns
  - references/sveltekit-data.md — SvelteKit Data Loading Patterns
  - references/sveltekit-deployment.md — SvelteKit Deployment
  - references/sveltekit-routing.md — SvelteKit Routing
  - references/sveltekit-form-actions.md — SvelteKit Form Actions Reference
  - references/sveltekit-deployment-adapters.md — SvelteKit Deployment Adapters Reference

## Handoff
Hand off to `frontend/universal/state-management/SKILL.md` for store patterns. Hand off to `frontend/universal/performance/SKILL.md` for optimization.
