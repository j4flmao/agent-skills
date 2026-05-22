# Astro Island Patterns

## Client Directives Reference

| Directive | Hydration Trigger | Bundle Cost | Best For |
|-----------|-------------------|-------------|----------|
| `client:load` | Immediately on page load | Highest | Nav, header search, auth UI |
| `client:idle` | When browser is idle (requestIdleCallback) | Medium | Comments, share buttons, non-critical forms |
| `client:visible` | When element enters viewport (IntersectionObserver) | Low | Analytics widgets, chat, lazy images with interactivity |
| `client:media` | When media query matches | Low | Desktop-only or mobile-only interactive elements |
| `client:only` | On client only (no SSR render) | Varies | Browser-API-dependent components (localStorage, canvas, WebGL) |

## Island Composition Strategy

### Rule: Islands Are Isolated
- No shared JavaScript state between islands.
- Pass initial data as serializable props (strings, numbers, JSON).
- Use DOM events or data attributes for cross-island communication.

```astro
--- // src/pages/product.astro
const product = await getProduct(Astro.params.id)
---
<div class="product-page">
  <!-- Static HTML — zero JS -->
  <h1>{product.name}</h1>
  <p>{product.description}</p>

  <!-- Island A: shopping cart button -->
  <AddToCart client:visible productId={product.id} />

  <!-- Island B: reviews widget — separate island, no shared state -->
  <ReviewsWidget client:idle productId={product.id} />
</div>
```

### Cross-Island Communication via Events
```astro
---
const product = { id: '123', name: 'Widget' }
---
<AddToCart client:visible productId={product.id} data-product-id={product.id} />
<CartBadge client:load />

<script>
  // Shared event bus pattern
  document.addEventListener('cart-updated', (e) => {
    const badge = document.querySelector('cart-badge')
    if (badge) badge.count = e.detail.total
  })
</script>
```

## Lazy Loading Strategy

### Prioritization
1. **Critical (client:load)**: Above-fold interactive elements. 0-1 per page.
2. **Deferrable (client:idle)**: Below-fold non-urgent interactions.
3. **Opportunistic (client:visible)**: Non-essential UI below viewport.
4. **Conditional (client:media)**: Responsive-only components.
5. **Exclusive (client:only)**: Browser-only features.

### Code Splitting
Astro automatically code-splits island components by framework. Each island is its own chunk.

## Framework Islands

### React Island
```astro
---
import { MyReactComponent } from '../components/MyReactComponent.tsx'
---
<MyReactComponent client:idle data={someData} />
```

### Vue Island
```astro
---
import MyVueComponent from '../components/MyVueComponent.vue'
---
<MyVueComponent client:visible :initial-count="5" />
```

### Svelte Island
```astro
---
import MySvelteComponent from '../components/MySvelteComponent.svelte'
---
<MySvelteComponent client:load name="World" />
```

### Solid Island
```astro
---
import MySolidComponent from '../components/MySolidComponent.tsx'
---
<MySolidComponent client:idle />
```

## Islands Anti-Patterns
- ❌ **Over-hydration**: `client:load` on every island — defeats zero-JS purpose.
- ❌ **Global state across islands**: Sharing Pinia/Redux stores across framework islands.
- ❌ **Large island**: A single island wrapping the entire page — hydrate only what needs interactivity.
- ❌ **Missing client directive**: Framework component without `client:*` — renders as HTML with no JS.
