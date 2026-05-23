# Validation Patterns

## Zod Schema Definition

### Basic Schema
```ts
import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  age: z.coerce.number().min(18, 'Must be 18 or older').max(120),
  role: z.enum(['admin', 'user', 'viewer']),
  tags: z.array(z.string()).min(1, 'Select at least one tag').max(5),
  metadata: z.record(z.string()).optional(),
});

export type UserFormData = z.infer<typeof userSchema>;
```

### Cross-Field Validation
```ts
export const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});

// Complex cross-field with superRefine
export const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().positive(),
  })).min(1),
  couponCode: z.string().optional(),
  discount: z.number().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.couponCode && !data.discount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Discount is required when coupon code is provided',
      path: ['discount'],
    });
  }
});
```

### Transform and Coerce
```ts
const schema = z.object({
  price: z.coerce.number().positive(),
  date: z.coerce.date(),
  slug: z.string()
    .transform(val => val.toLowerCase().replace(/\s+/g, '-')),
});
```

### Reusable Validation Rules
```ts
const passwordRule = z.string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');

const phoneRule = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format');

export const registerSchema = z.object({
  password: passwordRule,
  phone: phoneRule.optional(),
});
```

## Field-level vs Form-level Validation

| Aspect | Field-level | Form-level |
|---|---|---|
| When it runs | On blur, on change per field | On submit, or after all fields touched |
| Use case | Simple required, min/max, pattern | Cross-field rules, conditional logic |
| Performance | Good — only validates changed field | Validates all fields |
| Library | Zod: `z.string().min(1)` | Zod: `.refine()`, `.superRefine()` |
| Error location | Attached to specific field | Attached to form or specific field path |

Use field-level for 90% of rules. Reserve form-level for cross-field dependencies.

## Async Validation

### Username Check
```ts
const checkUsername = async (username: string): Promise<boolean> => {
  const res = await fetch(`/api/users/check?username=${encodeURIComponent(username)}`);
  return res.json().then(d => d.available);
};

// React Hook Form + Zod
z.string().refine(async (val) => {
  if (val.length < 3) return true; // skip async if too short
  return checkUsername(val);
}, 'Username is taken');
```

### Debounce Pattern
```ts
// 300ms debounce with abort
const debouncedValidate = useMemo(() => {
  let timeout: ReturnType<typeof setTimeout>;
  let controller: AbortController;
  return (value: string) => {
    clearTimeout(timeout);
    controller?.abort();
    controller = new AbortController();
    return new Promise<boolean>((resolve) => {
      timeout = setTimeout(async () => {
        const res = await fetch(`/api/check?q=${value}`, { signal: controller.signal });
        resolve(res.ok);
      }, 300);
    });
  };
}, []);
```

### Async Validation with React Hook Form
```tsx
const { register, formState: { isValidating } } = useForm({
  resolver: zodResolver(schema),
});

// Show loading indicator during async validation
{isValidating && <Spinner />}
```

## Error Display

### Inline Per-Field Error
```tsx
const FieldError = ({ message, id }: { message?: string; id?: string }) =>
  message ? (
    <span id={id} role="alert" className="text-red-500 text-sm mt-1">
      {message}
    </span>
  ) : null;
```

### Accessible Error Association
```tsx
const fieldId = 'field-email';
const errorId = 'error-email';

<input
  id={fieldId}
  aria-describedby={errors.email ? errorId : undefined}
  aria-invalid={!!errors.email}
  {...register('email')}
/>
<FieldError message={errors.email?.message} id={errorId} />
```

### Focus First Error on Submit
```tsx
const onSubmitError = (errors: FieldErrors) => {
  const firstError = Object.keys(errors)[0];
  if (firstError) {
    const el = document.querySelector(`[name="${firstError}"]`) as HTMLElement;
    el?.focus();
  }
};

<form onSubmit={handleSubmit(onValid, onSubmitError)}>
```

### Server Error Mapping
Server validation errors should map to field names for inline display:
```tsx
const onSubmit = async (data: FormData) => {
  const res = await fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });
  if (!res.ok) {
    const serverErrors = await res.json();
    // Map server errors to form fields
    Object.entries(serverErrors.fieldErrors).forEach(([field, message]) => {
      setError(field as keyof FormData, { message: message as string });
    });
    return;
  }
  reset(data);
};
```

Generic errors (network, server error) go in a toast or form-level banner:
```tsx
{serverError && (
  <div role="alert" className="bg-red-100 p-3 rounded">
    {serverError}
  </div>
)}
```

## File Upload Validation

### File Validation Rules
```ts
const fileSchema = z.object({
  avatar: z
    .instanceof(File)
    .refine(f => f.size < 5 * 1024 * 1024, 'Max 5MB')
    .refine(
      f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
      'Only JPEG, PNG, or WebP allowed'
    ),
});

const documentSchema = z.object({
  files: z
    .array(z.instanceof(File))
    .min(1, 'At least one file required')
    .max(5, 'Max 5 files')
    .refine(
      files => files.every(f => f.size < 10 * 1024 * 1024),
      'Each file must be under 10MB'
    ),
});
```

### File Upload Component Pattern
```tsx
const FileUpload = ({ name, control }: { name: string; control: Control }) => (
  <Controller
    name={name}
    control={control}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            onChange(files);
          }}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {value?.map((file: File, i: number) => (
          <div key={i}>
            <span>{file.name}</span>
            <button type="button" onClick={() => {
              const updated = value.filter((_: File, j: number) => j !== i);
              onChange(updated);
            }}>Remove</button>
          </div>
        ))}
        <FieldError message={error?.message} id={`${name}-error`} />
      </div>
    )}
  />
);
```

## Multi-step Wizard Validation

### Step-based Validation
```tsx
const steps = ['personal', 'address', 'review'];
const [step, setStep] = useState(0);

const handleNext = async () => {
  const fields = steps[step] === 'personal'
    ? ['name', 'email']
    : ['address', 'city'];
  const output = await trigger(fields);
  if (output) setStep(s => s + 1);
};

// On final step, submit all data
const onSubmit = (data: AllFormData) => fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });
```

### Step Indicator
```tsx
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <nav aria-label="Form steps">
    {Array.from({ length: totalSteps }, (_, i) => (
      <div key={i} role="step" aria-current={i === currentStep ? 'step' : undefined}>
        <span>{i + 1}</span>
        <span>{steps[i]}</span>
      </div>
    ))}
  </nav>
);
```

## Accessibility Checklist

- [ ] All inputs have associated `<label>` elements with `htmlFor` matching the input `id`
- [ ] Error messages use `role="alert"` and are linked via `aria-describedby`
- [ ] Required fields use `aria-required="true"`
- [ ] Submit button shows loading state with `aria-busy="true"`
- [ ] First error field receives focus on failed submission
- [ ] Thank-you message or success state receives focus after success
- [ ] Fieldset and legend for grouped fields (radio groups, checkboxes)
- [ ] Color is not the only indicator of error state (add icon or text label)
- [ ] Keyboard navigation: Enter submits, Tab moves between fields, Escape closes pickers
- [ ] Focus order follows visual order (DOM order matches visual layout)
- [ ] Custom form controls (select, date picker, autocomplete) implement ARIA roles and keyboard interactions

## Validation Library Comparison

| Library | Bundle | Type Inference | Async | Cross-field | Schema Sharing |
|---|---|---|---|---|---|
| Zod | 10KB | Excellent (`z.infer`) | Built-in | `.refine()` / `.superRefine()` | Frontend + Backend |
| Yup | 12KB | Good (`InferType`) | Built-in | `.when()` / `.test()` | Frontend + Backend |
| Joi | 20KB | Moderate | Built-in | `.when()` / `.custom()` | Backend-focused |
| Class Validator | 8KB | Good (decorators) | Manual | Custom validators | NestJS backend |

## Yup Schema Example
```ts
import * as Yup from 'yup';

export const userSchema = Yup.object({
  name: Yup.string().min(2, 'Too short').max(50).required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  age: Yup.number().min(18).max(120).required(),
  role: Yup.mixed<'admin' | 'user'>().oneOf(['admin', 'user']),
  tags: Yup.array().of(Yup.string()).min(1).max(5),
});
```
