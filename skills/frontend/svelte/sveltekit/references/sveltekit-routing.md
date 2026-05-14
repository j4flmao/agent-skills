# SvelteKit Routing

## Route Types
```
src/routes/
├── +page.svelte          # / (page)
├── +layout.svelte        # Layout wrapper
├── +error.svelte         # Error page
├── orders/
│   ├── +page.svelte      # /orders
│   └── [id]/
│       └── +page.svelte  # /orders/:id
└── api/
    └── orders/
        └── +server.ts    # API endpoint /api/orders
```

## Layout Data
```typescript
// +layout.server.ts
export const load: LayoutServerLoad = async ({ locals }) => {
  return { user: locals.user };
};
```
