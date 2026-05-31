# Qwik Form Validation

## Overview

Form handling in Qwik uses `routeAction$` for server mutations, `Form` component for progressive enhancement, and `useSignal`/`useStore` for client-side validation state. This reference covers form setup, validation strategies, error handling, optimistic UI, and complex form patterns.

## Form Fundamentals

### Basic Form with routeAction$

```tsx
// src/routes/contact/index.tsx
import { component$ } from '@builder.io/qwik'
import { routeAction$, Form, zod$ } from '@builder.io/qwik-city'
import { z } from '@builder.io/qwik-city/zod'

export const useContactAction = routeAction$(async (data, { fail, redirect }) => {
  const name = data.get('name') as string
  const email = data.get('email') as string
  const message = data.get('message') as string

  if (name.length < 2) {
    return fail(422, { fieldErrors: { name: 'Name must be at least 2 characters' } })
  }

  if (!email.includes('@')) {
    return fail(422, { fieldErrors: { email: 'Invalid email address' } })
  }

  await db.contact.create({ data: { name, email, message } })
  throw redirect(303, '/contact/thanks')
})

export default component$(() => {
  const action = useContactAction()

  return (
    <Form action={action} class="contact-form">
      <div>
        <label>Name</label>
        <input name="name" type="text" />
        {action.value?.fieldErrors?.name && (
          <p class="error">{action.value.fieldErrors.name}</p>
        )}
      </div>
      <div>
        <label>Email</label>
        <input name="email" type="email" />
        {action.value?.fieldErrors?.email && (
          <p class="error">{action.value.fieldErrors.email}</p>
        )}
      </div>
      <div>
        <label>Message</label>
        <textarea name="message" rows={4} />
      </div>
      <button type="submit" disabled={action.isRunning}>
        {action.isRunning ? 'Sending...' : 'Send'}
      </button>
    </Form>
  )
})
```

## Zod Validation Integration

### Inline Zod Validation

```tsx
import { routeAction$, zod$ } from '@builder.io/qwik-city'

export const useRegisterAction = routeAction$(async (data, { fail, redirect }) => {
  const parsed = zod$({
    name: z.string().min(2, 'Name too short').max(50),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  }).safeParse(data)

  if (!parsed.success) {
    return fail(422, { fieldErrors: parsed.error.flatten().fieldErrors })
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return fail(409, { fieldErrors: { email: 'Email already registered' } })
  }

  const user = await db.user.create({ data: parsed.data })
  throw redirect(303, '/login')
})
```

### Separate Schema Definition

```tsx
import { z } from '@builder.io/qwik-city/zod'

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
})

export const useLoginAction = routeAction$(async (data, { fail, redirect }) => {
  const result = loginSchema.safeParse(data)
  if (!result.success) {
    return fail(422, { fieldErrors: result.error.flatten().fieldErrors })
  }

  const user = await authenticate(result.data.email, result.data.password)
  if (!user) {
    return fail(401, { formErrors: ['Invalid email or password'] })
  }

  throw redirect(303, '/dashboard')
})
```

## Client-Side Validation

### Real-time Validation with useStore

```tsx
export default component$(() => {
  const formState = useStore({
    email: '',
    password: '',
    errors: {} as Record<string, string>,
    touched: {} as Record<string, boolean>,
  })

  const validateField = $((name: string, value: string) => {
    if (name === 'email') {
      if (!value) formState.errors.email = 'Email is required'
      else if (!value.includes('@')) formState.errors.email = 'Invalid email'
      else delete formState.errors.email
    }
    if (name === 'password') {
      if (!value) formState.errors.password = 'Password is required'
      else if (value.length < 8) formState.errors.password = 'Minimum 8 characters'
      else delete formState.errors.password
    }
  })

  return (
    <form>
      <div>
        <input
          name="email"
          type="email"
          onInput$={(_, el) => {
            formState.email = el.value
            validateField('email', el.value)
          }}
          onBlur$={(_, el) => {
            formState.touched.email = true
            validateField('email', el.value)
          }}
        />
        {formState.touched.email && formState.errors.email && (
          <p class="error">{formState.errors.email}</p>
        )}
      </div>
      <div>
        <input
          name="password"
          type="password"
          onInput$={(_, el) => {
            formState.password = el.value
            validateField('password', el.value)
          }}
          onBlur$={() => { formState.touched.password = true }}
        />
        {formState.touched.password && formState.errors.password && (
          <p class="error">{formState.errors.password}</p>
        )}
      </div>
      <button type="submit" disabled$={() => Object.keys(formState.errors).length > 0}>
        Submit
      </button>
    </form>
  )
})
```

### Reusable Validation Logic

```tsx
// src/utils/validation.ts
export const validators = {
  required: (value: string) => !value ? 'Required' : undefined,
  email: (value: string) =>
    !value.includes('@') ? 'Invalid email' : undefined,
  minLength: (min: number) => (value: string) =>
    value.length < min ? `Minimum ${min} characters` : undefined,
  maxLength: (max: number) => (value: string) =>
    value.length > max ? `Maximum ${max} characters` : undefined,
  pattern: (regex: RegExp, message: string) => (value: string) =>
    !regex.test(value) ? message : undefined,
  match: (otherValue: () => string, label: string) => (value: string) =>
    value !== otherValue() ? `Must match ${label}` : undefined,
}

export function validateField(
  value: string,
  rules: Array<(v: string) => string | undefined>
): string | undefined {
  for (const rule of rules) {
    const error = rule(value)
    if (error) return error
  }
  return undefined
}
```

```tsx
// Usage in component
import { validators, validateField } from './utils/validation'

const validationRules = {
  email: [validators.required, validators.email],
  password: [validators.required, validators.minLength(8)],
  phone: [validators.pattern(/^\+?[\d\s-]+$/, 'Invalid phone number')],
}
```

## Complex Form Patterns

### Multi-Step Form (Wizard)

```tsx
export const WizardForm = component$(() => {
  const step = useSignal(1)
  const formData = useStore({
    personal: { firstName: '', lastName: '', email: '' },
    address: { street: '', city: '', zip: '' },
    preferences: { newsletter: false, theme: 'light' },
  })

  return (
    <div class="wizard">
      <div class="steps">
        <span class={{ active: step.value === 1 }}>Personal</span>
        <span class={{ active: step.value === 2 }}>Address</span>
        <span class={{ active: step.value === 3 }}>Preferences</span>
      </div>

      {step.value === 1 && (
        <div class="step">
          <input
            placeholder="First Name"
            value={formData.personal.firstName}
            onInput$={(_, el) => { formData.personal.firstName = el.value }}
          />
          <input
            placeholder="Last Name"
            value={formData.personal.lastName}
            onInput$={(_, el) => { formData.personal.lastName = el.value }}
          />
          <input
            placeholder="Email"
            type="email"
            value={formData.personal.email}
            onInput$={(_, el) => { formData.personal.email = el.value }}
          />
          <button onClick$={() => step.value++}>Next</button>
        </div>
      )}

      {step.value === 2 && (
        <div class="step">
          <input
            placeholder="Street"
            value={formData.address.street}
            onInput$={(_, el) => { formData.address.street = el.value }}
          />
          <input
            placeholder="City"
            value={formData.address.city}
            onInput$={(_, el) => { formData.address.city = el.value }}
          />
          <input
            placeholder="ZIP Code"
            value={formData.address.zip}
            onInput$={(_, el) => { formData.address.zip = el.value }}
          />
          <button onClick$={() => step.value--}>Back</button>
          <button onClick$={() => step.value++}>Next</button>
        </div>
      )}

      {step.value === 3 && (
        <div class="step">
          <label>
            <input
              type="checkbox"
              checked={formData.preferences.newsletter}
              onChange$={(_, el) => { formData.preferences.newsletter = el.checked }}
            />
            Subscribe to newsletter
          </label>
          <select
            value={formData.preferences.theme}
            onChange$={(_, el) => { formData.preferences.theme = el.value }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <button onClick$={() => step.value--}>Back</button>
          <button type="submit">Submit</button>
        </div>
      )}
    </div>
  )
})
```

### Dynamic Form Fields

```tsx
export const DynamicForm = component$(() => {
  const entries = useStore<Array<{ key: string; value: string }>>([
    { key: '', value: '' },
  ])

  const addEntry = $(() => {
    entries.push({ key: '', value: '' })
  })

  const removeEntry = $((index: number) => {
    entries.splice(index, 1)
  })

  return (
    <div>
      {entries.map((entry, index) => (
        <div key={index} class="entry-row">
          <input
            placeholder="Key"
            value={entry.key}
            onInput$={(_, el) => { entry.key = el.value }}
          />
          <input
            placeholder="Value"
            value={entry.value}
            onInput$={(_, el) => { entry.value = el.value }}
          />
          <button onClick$={() => removeEntry(index)} disabled={entries.length === 1}>
            Remove
          </button>
        </div>
      ))}
      <button onClick$={addEntry}>Add Entry</button>
    </div>
  )
})
```

### Form with Array Fields

```tsx
export const InviteForm = component$(() => {
  const invites = useStore<Array<{ email: string; role: string }>>([
    { email: '', role: 'member' },
  ])

  const addInvite = $(() => {
    invites.push({ email: '', role: 'member' })
  })

  const removeInvite = $((index: number) => {
    invites.splice(index, 1)
  })

  return (
    <div>
      <h3>Invite Team Members</h3>
      {invites.map((invite, index) => (
        <div key={index} class="invite-row">
          <input
            type="email"
            placeholder="Email address"
            value={invite.email}
            onInput$={(_, el) => { invite.email = el.value }}
          />
          <select
            value={invite.role}
            onChange$={(_, el) => { invite.role = el.value }}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button onClick$={() => removeInvite(index)}>Remove</button>
        </div>
      ))}
      <button onClick$={addInvite}>Add Another</button>
      <button type="submit">Send Invites</button>
    </div>
  )
})
```

## Optimistic Updates

### Optimistic UI with Rollback

```tsx
export const LikeButton = component$(() => {
  const postId = useSignal('123')
  const likes = useSignal(42)
  const pending = useSignal(false)

  const handleLike = $(async () => {
    const previousLikes = likes.value
    likes.value++
    pending.value = true

    try {
      const response = await fetch(`/api/posts/${postId.value}/like`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      likes.value = data.likes
    } catch {
      likes.value = previousLikes
    } finally {
      pending.value = false
    }
  })

  return (
    <button onClick$={handleLike} disabled={pending.value} class={{ liked: likes.value > 42 }}>
      {likes.value} Likes
    </button>
  )
})
```

## Form Submission States

### Loading, Error, and Success States

```tsx
export const SubmitButton = component$((props: { action: any }) => {
  return (
    <button
      type="submit"
      disabled={props.action.isRunning}
      class={{
        'btn-loading': props.action.isRunning,
        'btn-error': props.action.value?.failed,
        'btn-success': props.action.value?.success,
      }}
    >
      {props.action.isRunning && <span class="spinner" />}
      {props.action.isRunning ? 'Submitting...' : 'Submit'}
    </button>
  )
})
```

### Form Reset After Success

```tsx
export const ContactForm = component$(() => {
  const action = useContactAction()
  const formRef = useSignal<HTMLFormElement>()

  useTask$(({ track }) => {
    const result = track(() => action.value)
    if (result?.success) {
      formRef.value?.reset()
    }
  })

  return (
    <Form action={action} ref={formRef}>
      {/* form fields */}
    </Form>
  )
})
```

## Authentication Forms

### Login Form

```tsx
export const useLoginAction = routeAction$(async (data, { fail, redirect, cookie }) => {
  const parsed = zod$({
    email: z.string().email(),
    password: z.string().min(1),
  }).safeParse(data)

  if (!parsed.success) {
    return fail(422, { fieldErrors: parsed.error.flatten().fieldErrors })
  }

  const user = await authenticate(parsed.data.email, parsed.data.password)
  if (!user) {
    return fail(401, { formErrors: ['Invalid credentials'] })
  }

  const token = await generateToken(user.id)
  cookie.set('session', token, { httpOnly: true, secure: true, maxAge: 86400 })
  throw redirect(303, '/dashboard')
})

export default component$(() => {
  const action = useLoginAction()

  return (
    <Form action={action} class="login-form">
      <h2>Login</h2>
      {action.value?.formErrors && (
        <div class="alert alert-error">
          {action.value.formErrors.map(err => <p key={err}>{err}</p>)}
        </div>
      )}
      <div>
        <label>Email</label>
        <input name="email" type="email" required />
        {action.value?.fieldErrors?.email && (
          <p class="error">{action.value.fieldErrors.email}</p>
        )}
      </div>
      <div>
        <label>Password</label>
        <input name="password" type="password" required />
        {action.value?.fieldErrors?.password && (
          <p class="error">{action.value.fieldErrors.password}</p>
        )}
      </div>
      <button type="submit" disabled={action.isRunning}>Login</button>
    </Form>
  )
})
```

### Registration Form with Confirmation

```tsx
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const useRegisterAction = routeAction$(async (data, { fail, redirect }) => {
  const result = registerSchema.safeParse(data)
  if (!result.success) {
    return fail(422, { fieldErrors: result.error.flatten().fieldErrors })
  }

  const existing = await db.user.findUnique({ where: { email: result.data.email } })
    if (existing) {
    return fail(409, { fieldErrors: { email: 'Email already registered' } })
  }

  const hashedPassword = await hashPassword(result.data.password)
  await db.user.create({
    data: {
      name: result.data.name,
      email: result.data.email,
      password: hashedPassword,
    },
  })

  throw redirect(303, '/login?registered=true')
})
```

## Validation Edge Cases

### Cross-field Validation

```tsx
const bookingSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine(data => {
  if (data.startDate === data.endDate) {
    return data.endTime > data.startTime
  }
  return true
}, {
  message: 'End time must be after start time on the same day',
  path: ['endTime'],
})
```

### Debounced Server Validation

```tsx
export const UsernameField = component$(() => {
  const username = useSignal('')
  const isAvailable = useSignal<boolean | null>(null)
  const checking = useSignal(false)

  useTask$(({ track, cleanup }) => {
    const value = track(() => username.value)
    if (value.length < 3) {
      isAvailable.value = null
      return
    }

    checking.value = true
    const controller = new AbortController()
    cleanup(() => controller.abort())

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-username?q=${value}`, { signal: controller.signal })
        const data = await res.json()
        isAvailable.value = data.available
      } catch {
        isAvailable.value = null
      } finally {
        checking.value = false
      }
    }, 500)

    cleanup(() => clearTimeout(timer))
  })

  return (
    <div>
      <input
        bind:value={username}
        placeholder="Choose a username"
        class={{
          'is-valid': isAvailable.value === true,
          'is-invalid': isAvailable.value === false,
        }}
      />
      {checking.value && <span class="checking">Checking...</span>}
      {isAvailable.value === false && <span class="error">Username taken</span>}
      {isAvailable.value === true && <span class="success">Available!</span>}
    </div>
  )
})
```

## File Upload

### Single File Upload

```tsx
export const useUploadAction = routeAction$(async (data, { fail }) => {
  const file = data.get('file') as File
  if (!file) return fail(400, { message: 'No file provided' })

  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) return fail(400, { message: 'File too large (max 5MB)' })

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) return fail(400, { message: 'Invalid file type' })

  const buffer = await file.arrayBuffer()
  const filename = `${Date.now()}-${file.name}`
  await fs.writeFile(`uploads/${filename}`, Buffer.from(buffer))

  return { success: true, filename }
})
```

### Multi-File Upload

```tsx
export const useMultiUploadAction = routeAction$(async (data, { fail }) => {
  const files = data.getAll('files') as File[]
  if (files.length === 0) return fail(400, { message: 'No files provided' })

  const uploaded = []
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) continue
    const buffer = await file.arrayBuffer()
    const filename = `${Date.now()}-${file.name}`
    await fs.writeFile(`uploads/${filename}`, Buffer.from(buffer))
    uploaded.push(filename)
  }

  return { success: true, files: uploaded }
})
```

## Form Components Library

### Reusable Input Component

```tsx
interface FormFieldProps {
  name: string
  label: string
  type?: 'text' | 'email' | 'password' | 'number'
  value: string
  error?: string
  touched?: boolean
  onInput$: PropFunction<(value: string) => void>
  onBlur$?: PropFunction<() => void>
}

export const FormField = component$<FormFieldProps>((props) => {
  return (
    <div class="form-field">
      <label for={props.name}>{props.label}</label>
      <input
        id={props.name}
        name={props.name}
        type={props.type || 'text'}
        value={props.value}
        onInput$={(_, el) => props.onInput$(el.value)}
        onBlur$={props.onBlur$}
        class={{ 'has-error': props.touched && props.error }}
      />
      {props.touched && props.error && (
        <p class="field-error">{props.error}</p>
      )}
    </div>
  )
})
```

### Select Component

```tsx
interface SelectFieldProps {
  name: string
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange$: PropFunction<(value: string) => void>
}

export const SelectField = component$<SelectFieldProps>((props) => {
  return (
    <div class="form-field">
      <label for={props.name}>{props.label}</label>
      <select
        id={props.name}
        name={props.name}
        value={props.value}
        onChange$={(_, el) => props.onChange$(el.value)}
      >
        <option value="">Select...</option>
        {props.options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
})
```

## Testing Forms

### Unit Testing Validation

```tsx
import { describe, expect, it } from 'vitest'
import { validators } from './validation'

describe('validators', () => {
  it('required returns error for empty string', () => {
    expect(validators.required('')).toBe('Required')
  })

  it('required returns undefined for non-empty string', () => {
    expect(validators.required('value')).toBeUndefined()
  })

  it('email returns error for invalid email', () => {
    expect(validators.email('not-an-email')).toBe('Invalid email')
  })

  it('email returns undefined for valid email', () => {
    expect(validators.email('test@example.com')).toBeUndefined()
  })

  it('minLength returns error for short string', () => {
    expect(validators.minLength(8)('short')).toBe('Minimum 8 characters')
  })
})
```

### Testing Form Actions

```tsx
import { describe, expect, it } from 'vitest'
import { useLoginAction } from './routes/login'

describe('login action', () => {
  it('fails with invalid email', async () => {
    const result = await useLoginAction.run(new FormData())
    expect(result.failed).toBe(true)
    expect(result.fieldErrors).toHaveProperty('email')
  })

  it('fails with wrong credentials', async () => {
    const form = new FormData()
    form.set('email', 'test@example.com')
    form.set('password', 'wrong')
    const result = await useLoginAction.run(form)
    expect(result.failed).toBe(true)
    expect(result.formErrors).toContain('Invalid credentials')
  })
})
```
