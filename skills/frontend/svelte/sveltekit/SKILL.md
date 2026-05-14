---
name: sveltekit
description: SvelteKit architecture — routing, loaders, forms, server-side rendering, endpoints, stores, deployment.
---

# SvelteKit

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

## Project Structure

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

## Page Load

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

## Form Actions

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

## Endpoint

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

## References

### Reference Files
- `references/sveltekit-routing.md` — Advanced routing, params, layouts, error pages
- `references/sveltekit-deployment.md` — Deployment to Vercel, Netlify, Cloudflare, Docker

### Related Skills
- `frontend/universal/state-management/SKILL.md` — Svelte stores
- `frontend/universal/performance/SKILL.md` — SvelteKit performance
- `frontend/universal/testing/SKILL.md` — Svelte testing

## Handoff

Hand off to `frontend/universal/state-management/SKILL.md` for store patterns. Hand off to `frontend/universal/performance/SKILL.md` for optimization.
