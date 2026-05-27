# Qwik City Routing

## File-Based Routing

```typescript
// src/routes/index.tsx
import { component$ } from '@builder.io/qwik'
import { routeLoader$ } from '@builder.io/qwik-city'

export const useFeaturedProducts = routeLoader$(async () => {
  const response = await fetch('/api/products/featured')
  return response.json() as Promise<Product[]>
})

export default component$(() => {
  const products = useFeaturedProducts()

  return (
    <div>
      <h1>Featured Products</h1>
      <div class="grid">
        {products.value.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
})

// src/routes/products/[productId]/index.tsx
import { component$ } from '@builder.io/qwik'
import { routeLoader$, useLocation } from '@builder.io/qwik-city'

export const useProduct = routeLoader$(async ({ params }) => {
  const response = await fetch(`/api/products/${params.productId}`)
  if (!response.ok) throw new Error('Product not found')
  return response.json() as Promise<Product>
})

export default component$(() => {
  const product = useProduct()
  const loc = useLocation()

  return (
    <div>
      <h1>{product.value.name}</h1>
      <p>{product.value.description}</p>
      <p>Price: ${product.value.price}</p>
    </div>
  )
})
```

## Layouts

```typescript
// src/routes/layout.tsx
import { component$, Slot } from '@builder.io/qwik'
import { routeLoader$ } from '@builder.io/qwik-city'

export const useServerTime = routeLoader$(() => {
  return { date: new Date().toISOString() }
})

export default component$(() => {
  return (
    <div class="app-layout">
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/products">Products</a>
          <a href="/about">About</a>
        </nav>
      </header>
      <main>
        <Slot />
      </main>
      <footer>
        <p>Server time: {useServerTime().value.date}</p>
      </footer>
    </div>
  )
})

// src/routes/products/layout.tsx
export default component$(() => {
  return (
    <div class="products-layout">
      <aside>
        <ProductFilters />
      </aside>
      <section>
        <Slot />
      </section>
    </div>
  )
})
```

## Form Actions

```typescript
// src/routes/products/new/index.tsx
import { component$ } from '@builder.io/qwik'
import { routeAction$, Form } from '@builder.io/qwik-city'
import { z } from 'zod'

export const useCreateProduct = routeAction$(async (data) => {
  const schema = z.object({
    name: z.string().min(2),
    price: z.number().min(0),
    description: z.string().optional(),
  })

  const result = schema.safeParse(data)
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors }
  }

  const product = await createProduct(result.data)
  return { success: true, product }
})

export default component$(() => {
  const action = useCreateProduct()

  return (
    <Form action={action} class="max-w-md">
      <label>Name
        <input name="name" required />
      </label>
      {action.value?.errors?.name && (
        <p class="error">{action.value.errors.name[0]}</p>
      )}
      <label>Price
        <input name="price" type="number" step="0.01" required />
      </label>
      <button type="submit">Create Product</button>
      {action.value?.success && <p>Product created!</p>}
    </Form>
  )
})
```

## Key Points

- Use routeLoader$ for server-side data loading
- Use routeAction$ for form mutations
- Use routeHandler$ for API endpoints
- Implement layouts for shared UI structure
- Use file-based routing with directory structure
- Use params for dynamic route segments
- Use searchParams for query string access
- Handle 404s with catch-all routes
- Use redirect for route navigation
- Use middleware for authentication and logging
- Use request and response objects in handlers
- Implement error boundaries with error pages
