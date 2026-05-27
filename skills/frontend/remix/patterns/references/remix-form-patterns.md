# Remix Form Patterns

## Progressive Enhancement

```typescript
// app/routes/login.tsx
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { Form, useActionData, useNavigation } from '@remix-run/react'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.string().optional(),
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const result = LoginSchema.safeParse(Object.fromEntries(formData))

  if (!result.success) {
    return json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const user = await authenticate(result.data)
  if (!user) {
    return json(
      { errors: { email: ['Invalid credentials'] } },
      { status: 401 },
    )
  }

  const session = await createUserSession(user)
  return redirect('/dashboard', {
    headers: { 'Set-Cookie': session },
  })
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <Form method="post" className="max-w-sm space-y-4">
      <fieldset disabled={isSubmitting}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          {actionData?.errors?.email && (
            <p className="text-red-500 text-sm">{actionData.errors.email[0]}</p>
          )}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <label>
          <input name="remember" type="checkbox" value="on" />
          Remember me
        </label>
        <button type="submit" className="btn-primary">
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </fieldset>
    </Form>
  )
}
```

## Multi-Part Forms

```typescript
// app/routes/profile.edit.tsx
import { json, unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  type ActionFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { db } from '~/db.server'

export async function action({ request }: ActionFunctionArgs) {
  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5_000_000,
  })

  const formData = await unstable_parseMultipartFormData(request, uploadHandler)
  const name = formData.get('name') as string
  const bio = formData.get('bio') as string
  const avatar = formData.get('avatar') as File | null

  if (avatar && avatar.size > 0) {
    const imageUrl = await uploadImage(avatar)
    await db.user.update({
      where: { id: userId },
      data: { name, bio, avatar: imageUrl },
    })
  } else {
    await db.user.update({
      where: { id: userId },
      data: { name, bio },
    })
  }

  return json({ success: true })
}

export default function EditProfile() {
  return (
    <Form method="post" encType="multipart/form-data">
      <input name="name" required />
      <textarea name="bio" rows={4} />
      <input name="avatar" type="file" accept="image/*" />
      <button type="submit">Save</button>
    </Form>
  )
}
```

## Key Points

- Use Form component for progressively enhanced forms
- Disable fieldsets during submission for visual feedback
- Validate form data with Zod schemas on the server
- Return field-level error messages as JSON responses
- Use useNavigation for loading states
- Use encType="multipart/form-data" for file uploads
- Set proper upload handlers with size limits
- Leverage browser's built-in form validation
- Use hidden inputs for context and intent
- Implement optimistic UI with useFetcher
- Handle redirect after successful form submission
- Use session flash messages for success notifications
