# Remix Forms — Validation, Progressive Enhancement, Pending States

## Server-Side Validation with Zod

```tsx
import { z } from 'zod'
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'

const ProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.coerce.number().positive('Price must be positive'),
  categoryId: z.string().uuid('Invalid category'),
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = Object.fromEntries(await request.formData())
  const result = ProductSchema.safeParse(formData)

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors
    return json({ errors: fieldErrors, values: formData }, { status: 400 })
  }

  await db.product.create({ data: result.data })
  return redirect('/products')
}
```

## Client-Side Enhancement with useActionData

```tsx
import { Form, useActionData } from '@remix-run/react'

export default function ProductForm() {
  const actionData = useActionData<typeof action>()

  return (
    <Form method="post">
      <label>
        Name:
        <input
          type="text"
          name="name"
          defaultValue={actionData?.values?.name}
          aria-invalid={!!actionData?.errors?.name}
        />
        {actionData?.errors?.name && (
          <span role="alert">{actionData.errors.name}</span>
        )}
      </label>
      <label>
        Price:
        <input
          type="number"
          step="0.01"
          name="price"
          defaultValue={actionData?.values?.price}
          aria-invalid={!!actionData?.errors?.price}
        />
        {actionData?.errors?.price && (
          <span role="alert">{actionData.errors.price}</span>
        )}
      </label>
      <button type="submit">Save</button>
    </Form>
  )
}
```

## Pending States with useNavigation

```tsx
import { Form, useNavigation } from '@remix-run/react'

function SubmitButton() {
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const isUploading = navigation.formData?.get('intent') === 'upload'

  return (
    <button type="submit" disabled={isSubmitting}>
      {isUploading ? 'Uploading...' : isSubmitting ? 'Saving...' : 'Submit'}
    </button>
  )
}
```

## Multiple Forms on One Page

Use hidden intent field to distinguish actions:

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  switch (intent) {
    case 'create': return handleCreate(formData)
    case 'update': return handleUpdate(formData)
    case 'delete': return handleDelete(formData)
    default: return json({ error: 'Unknown intent' }, { status: 400 })
  }
}
```

```tsx
<Form method="post">
  <input type="hidden" name="intent" value="delete" />
  <button type="submit">Delete</button>
</Form>
```

## useFetcher with Form Validation

```tsx
import { useFetcher } from '@remix-run/react'

function QuickEdit({ product }: { product: Product }) {
  const fetcher = useFetcher()
  const errors = fetcher.data?.errors

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="quick-update" />
      <input type="text" name="name" defaultValue={product.name} />
      {errors?.name && <span>{errors.name}</span>}
      <button type="submit">Save</button>
    </fetcher.Form>
  )
}
```

## File Uploads

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    return json({ errors: { avatar: 'File is required' } }, { status: 400 })
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadToS3(buffer, file.name)
  return json({ url })
}
```

```tsx
<Form method="post" encType="multipart/form-data">
  <input type="file" name="avatar" accept="image/*" />
  <button type="submit">Upload</button>
</Form>
```
