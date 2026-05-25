# Remix Routing & Validation Patterns

## Route Validation

### URL Parameter Validation

```tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const id = z.string().uuid().parse(params.id)
  const product = await db.product.findUnique({ where: { id } })
  if (!product) throw new Response('Not Found', { status: 404 })
  return json(product)
}
```

### Search Params Validation

```tsx
import { z } from 'zod'

const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  sort: z.enum(['name', 'date', 'price']).default('date'),
})

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const params = searchSchema.parse(Object.fromEntries(url.searchParams))
  return json(await searchProducts(params))
}
```

## Nested Route Data Access

```tsx
// Child route accessing parent loader data
export async function loader({ params }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  return json({ product })
}

// In child route component
function ProductDetail() {
  const { product } = useLoaderData<typeof loader>()
  const parentData = useRouteLoaderData<typeof parentLoader>('routes/products')
  // parentData.categories available
}
```

## Action Form Patterns

### Multiple Actions

```tsx
export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('_action')

  switch (intent) {
    case 'update': {
      const result = updateSchema.safeParse(Object.fromEntries(formData))
      if (!result.success) return json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
      await db.product.update({ where: { id: params.id }, data: result.data })
      return json({ ok: true })
    }
    case 'delete': {
      await db.product.delete({ where: { id: params.id } })
      return redirect('/products')
    }
    default:
      return json({ error: 'Unknown action' }, { status: 400 })
  }
}
```

```tsx
function ProductActions() {
  return (
    <Form method="post">
      <input type="hidden" name="_action" value="update" />
      <input name="name" />
      <button type="submit">Update</button>
    </Form>
  )
}
```

### Validation with useActionData

```tsx
export default function LoginPage() {
  const actionData = useActionData<typeof action>()

  return (
    <Form method="post">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          aria-invalid={actionData?.errors?.email ? 'true' : undefined}
          aria-describedby={actionData?.errors?.email ? 'email-error' : undefined}
        />
        {actionData?.errors?.email && (
          <span id="email-error" role="alert">{actionData.errors.email}</span>
        )}
      </div>
      <button type="submit">Login</button>
    </Form>
  )
}
```

## Progressive Enhancement

```tsx
// Works without JavaScript!
function CreateForm() {
  return (
    <Form method="post">
      <input name="name" required />
      <button type="submit">Create</button>
    </Form>
  )
}

// Enhanced with JavaScript
function EnhancedCreateForm() {
  const fetcher = useFetcher()
  const isPending = fetcher.state !== 'idle'

  return (
    <fetcher.Form method="post">
      <input name="name" required disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </fetcher.Form>
  )
}
```

## Route Error Handling

```tsx
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      <pre>{error.stack}</pre>
    </div>
  )
}

export function CatchBoundary() {
  const caught = useCatch()
  return (
    <div>
      <h1>{caught.status} {caught.statusText}</h1>
      <p>{caught.data}</p>
    </div>
  )
}
```
