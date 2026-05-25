# Form Validation

## Schema Validation with Zod

```typescript
import { z } from 'zod'

export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  name: z.string().min(1, 'Name is required').max(100),
  age: z.coerce.number().min(18, 'Must be 18 or older').max(120),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  agreeToTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
})

export type UserFormData = z.infer<typeof userSchema>
```

## Async Validation

```typescript
const registrationSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
})

// Async refinement for server-side checks
const registrationSchemaWithAsync = registrationSchema.superRefine(async (data, ctx) => {
  const usernameTaken = await checkUsername(data.username)
  if (usernameTaken) {
    ctx.addIssue({ code: 'custom', path: ['username'], message: 'Username already taken' })
  }

  const emailTaken = await checkEmail(data.email)
  if (emailTaken) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email already registered' })
  }
})
```

## React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    mode: 'onBlur',         // validate on blur by default
    reValidateMode: 'onChange', // re-validate on change after submission
  })

  const onSubmit = async (data: UserFormData) => {
    // data is fully typed and validated
    await api.register(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <span role="alert">{errors.email.message}</span>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Register'}
      </button>
    </form>
  )
}
```

## Validation Timing Strategies

| Mode | Trigger | Use Case |
|------|---------|----------|
| `onBlur` | On field exit | Default — balances UX and feedback |
| `onChange` | Every keystroke | Password strength, character count |
| `onSubmit` | Only on form submit | Simple forms, minimal disruption |
| `onTouched` | On blur, then onChange | User-friendly progressive validation |
| All | `onBlur` + `onSubmit` | Recommended — validates on blur, re-validates on submit |

## Cross-Field Validation

```typescript
const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const dateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
})
```

## Validation Error Display

```typescript
// Inline field error component
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span className="text-red-500 text-sm mt-1" role="alert">
      {message}
    </span>
  )
}

// Summary error banner
function FormErrors({ errors }: { errors: FieldErrors }) {
  const errorList = Object.values(errors).filter(Boolean)
  if (!errorList.length) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded p-4 mb-4" role="alert">
      <h3 className="text-red-800 font-semibold">Please fix the following errors:</h3>
      <ul className="list-disc list-inside text-red-600 mt-1">
        {errorList.map((err, i) => (
          <li key={i}>{err.message}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Validation Rule Reference

| Rule | Zod Method | Message |
|------|-----------|---------|
| Required | `z.string().min(1)` | Required |
| Min length | `z.string().min(N)` | At least N characters |
| Max length | `z.string().max(N)` | At most N characters |
| Email format | `z.string().email()` | Invalid email |
| URL format | `z.string().url()` | Invalid URL |
| Regex pattern | `z.string().regex(/.../)` | Custom message |
| Numeric range | `z.number().min(N).max(M)` | Must be between N and M |
| Exact value | `z.literal(value)` | Must be value |
| Enum | `z.enum(['a', 'b'])` | Must be one of |
| Custom check | `.refine(fn, msg)` | Custom message |
| Type coercion | `z.coerce.number()` | Invalid number |
| Optional | `.optional()` | — |
| Nullable | `.nullable()` | — |
| Union | `z.union([...])` | — |
