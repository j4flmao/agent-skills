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

## Rules
- All routes follow SvelteKit file-based routing convention with `+page.svelte`, `+layout.svelte`, `+server.ts` naming.
- Data fetching in `+page.server.ts` load functions — never fetch on client for initial page data.
- Form mutations use `Actions` with `fail()` for validation errors and `redirect()` for success.
- API endpoints placed in `routes/api/` directory with `+server.ts` handlers.
- Server-only code in `lib/server/` — never import in client components.
- Stores for client-side state only; server state flows through load functions.
- Parameters validated and parsed before use — never trust URL params directly.

## References
  - references/endpoints-loading.md — SvelteKit Endpoints and Data Loading
  - references/stores-context.md — Svelte Stores and Context API
  - references/sveltekit-auth.md — SvelteKit Auth & Security Patterns
  - references/sveltekit-data.md — SvelteKit Data Loading Patterns
  - references/sveltekit-deployment.md — SvelteKit Deployment
  - references/sveltekit-routing.md — SvelteKit Routing
## Handoff

Hand off to `frontend/universal/state-management/SKILL.md` for store patterns. Hand off to `frontend/universal/performance/SKILL.md` for optimization.
