# Form Validation

Patterns for schema definition, field-level and form-level validation, async validation, and error display.

---

## Zod Schema Definition

Define a single schema used across frontend and backend.

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

Cross-field validation:

```ts
export const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});
```

---

## Field-level vs Form-level Validation

| Aspect | Field-level | Form-level |
|--------|-------------|------------|
| When it runs | On blur, on change per field | On submit, or after all fields touched |
| Use case | Simple required, min/max, pattern | Cross-field rules, conditional logic |
| Performance | Good — only validates changed field | Validates all fields |
| Library | Zod: `z.string().min(1)` | Zod: `.refine()`, `.superRefine()` |

Use field-level for 90% of rules. Reserve form-level for cross-field dependencies.

---

## Async Validation

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

Debounce pattern:

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

---

## Error Display

Inline per-field error with accessibility:

```tsx
const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <span role="alert" className="text-red-500 text-sm mt-1">
      {message}
    </span>
  ) : null;
```

Focus first error on submit:

```ts
// React Hook Form
const { errors } = formState;
const firstError = Object.keys(errors)[0];
if (firstError) {
  const el = document.querySelector(`[name="${firstError}"]`);
  el?.focus();
}
```

Server validation errors should map to field names for inline display. Generic errors (network, server error) go in a toast or form-level banner.
