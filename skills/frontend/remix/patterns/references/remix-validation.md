# Remix Form Validation Patterns

## Zod Validation

```tsx
const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 characters'),
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const result = loginSchema.safeParse(Object.fromEntries(formData))

  if (!result.success) {
    return json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const user = await authenticate(result.data)
  if (!user) {
    return json(
      { errors: { email: ['Invalid credentials'] } },
      { status: 401 }
    )
  }

  return redirect('/dashboard')
}
```

## useFetcher for Non-Navigation Forms

```tsx
function NewsletterForm() {
  const fetcher = useFetcher()
  const errors = fetcher.data?.errors

  return (
    <fetcher.Form method="post" action="/api/newsletter">
      <input name="email" type="email" aria-invalid={errors?.email} />
      {errors?.email && <span role="alert">{errors.email}</span>}
      <button type="submit">
        {fetcher.state === 'submitting' ? 'Subscribing...' : 'Subscribe'}
      </button>
    </fetcher.Form>
  )
}
```

## File Upload

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const file = formData.get('avatar') as File | null

  if (!file || file.size > 5 * 1024 * 1024) {
    return json({ errors: { avatar: ['File too large (max 5MB)'] } }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const filename = `${crypto.randomUUID()}-${file.name}`
  await fs.writeFile(`public/uploads/${filename}`, buffer)

  return json({ avatar: `/uploads/${filename}` })
}
```

## Optimistic UI

```tsx
function LikeButton({ post }: { post: { id: string; liked: boolean } }) {
  const fetcher = useFetcher()
  const isLiked = fetcher.formData
    ? fetcher.formData.get('liked') === 'true'
    : post.liked

  return (
    <fetcher.Form method="post" action="/api/like">
      <input type="hidden" name="postId" value={post.id} />
      <input type="hidden" name="liked" value={String(!isLiked)} />
      <button type="submit" className={isLiked ? 'liked' : ''}>
        {isLiked ? 'Unlike' : 'Like'}
      </button>
    </fetcher.Form>
  )
}
```

## Pending UI

```tsx
function SubmitButton() {
  const transition = useTransition()
  const isPending = transition.state !== 'idle'

  return (
    <button type="submit" disabled={isPending}>
      {isPending ? 'Saving...' : 'Save'}
    </button>
  )
}
```

## Form Error Display

| Error Type | Display | Status Code |
|------------|---------|-------------|
| Field validation | Inline next to field | 400 |
| Authentication | Above form | 401 |
| Authorization | Redirect to login | 403 |
| Not found | ErrorBoundary | 404 |
| Server error | ErrorBoundary | 500 |
