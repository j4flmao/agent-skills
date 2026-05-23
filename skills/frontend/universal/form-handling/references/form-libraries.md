# Form Libraries

## React Hook Form

### Installation
```bash
npm install react-hook-form @hookform/resolvers
```

### Basic Setup
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = async (data: FormData) => {
    await fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} aria-describedby="name-error" />
      {errors.name && <span id="name-error" role="alert">{errors.name.message}</span>}
      
      <input {...register('email')} aria-describedby="email-error" />
      {errors.email && <span id="email-error" role="alert">{errors.email.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Key API
| Hook/Method | Purpose | Usage |
|---|---|---|
| `useForm()` | Create form instance | `const { register, handleSubmit, watch, control } = useForm()` |
| `register()` | Register uncontrolled input | `{...register('fieldName', { required: true })}` |
| `handleSubmit()` | Validate and submit | `handleSubmit(onValid, onInvalid)` |
| `watch()` | Watch field value | `const value = watch('fieldName')` |
| `control` | For controlled components | `<Controller control={control} name="field" render={...} />` |
| `formState` | Form state object | `{ errors, isDirty, isSubmitting, touchedFields, isValid }` |
| `reset()` | Reset to default values | `reset(data)` after submit |
| `setValue()` | Set field value | `setValue('fieldName', 'value')` |
| `trigger()` | Trigger validation | `trigger('fieldName')` |

### Advanced Patterns
**Mode configuration**: `useForm({ mode: 'onBlur' })` validates on blur. Options: `onSubmit` (default), `onBlur`, `onChange`, `onTouched`, `all`. Use `onBlur` for most forms to balance UX and performance.

**Error focus**: After submission, focus the first field with an error:
```tsx
const { errors } = formState;
const firstError = Object.keys(errors)[0];
if (firstError) {
  const el = document.querySelector(`[name="${firstError}"]`) as HTMLElement;
  el?.focus();
}
```

## Formik

### Installation
```bash
npm install formik yup
```

### Basic Setup
```tsx
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const schema = Yup.object({
  name: Yup.string().min(2, 'Too short').required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
});

function MyForm() {
  return (
    <Formik
      initialValues={{ name: '', email: '' }}
      validationSchema={schema}
      onSubmit={async (values, { setSubmitting, resetForm }) => {
        await fetch('/api/submit', { method: 'POST', body: JSON.stringify(values) });
        resetForm();
        setSubmitting(false);
      }}
    >
      {({ isSubmitting, errors, touched }) => (
        <Form>
          <Field name="name" />
          <ErrorMessage name="name" component="span" />
          
          <Field name="email" type="email" />
          <ErrorMessage name="email" component="span" />
          
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </Form>
      )}
    </Formik>
  );
}
```

### Key API
| Prop/Method | Purpose |
|---|---|
| `initialValues` | Starting form values |
| `validationSchema` | Yup/Zod schema |
| `onSubmit` | Submission handler |
| `isSubmitting` | Submission state |
| `errors` | Validation errors object |
| `touched` | Touched fields object |
| `setFieldValue` | Set specific field value |
| `setFieldTouched` | Mark field as touched |
| `validateField` | Validate specific field |

### When to Choose Formik
- Simple to moderate forms (under 20 fields)
- Team already familiar with Formik patterns
- Controlled input behavior is acceptable
- Re-render performance is not critical

## Angular Reactive Forms

### Basic Setup
```typescript
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-my-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="name" />
      <span *ngIf="form.get('name')?.invalid && form.get('name')?.touched">
        Name is required
      </span>
      
      <input formControlName="email" type="email" />
      <span *ngIf="form.get('email')?.errors?.['email']">
        Invalid email
      </span>
      
      <button type="submit" [disabled]="form.invalid && form.touched">
        {{ isSubmitting ? 'Submitting...' : 'Submit' }}
      </button>
    </form>
  `
})
export class MyFormComponent {
  form: FormGroup;
  isSubmitting = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    await fetch('/api/submit', { method: 'POST', body: JSON.stringify(this.form.value) });
    this.isSubmitting = false;
    this.form.reset();
  }
}
```

### Custom Validators
```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordMatchValidator(password: string, confirm: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const passwordVal = control.get(password)?.value;
    const confirmVal = control.get(confirm)?.value;
    return passwordVal === confirmVal ? null : { passwordMismatch: true };
  };
}
```

### FormArray for Dynamic Fields
```typescript
this.form = this.fb.group({
  items: this.fb.array([
    this.fb.group({ name: '', quantity: 0 }),
  ]),
});

get items() {
  return this.form.get('items') as FormArray;
}

addItem() {
  this.items.push(this.fb.group({ name: '', quantity: 0 }));
}

removeItem(index: number) {
  this.items.removeAt(index);
}
```

## TanStack Form

### Installation
```bash
npm install @tanstack/react-form
```

### Basic Setup
```tsx
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

function MyForm() {
  const { Field, handleSubmit, state } = useForm({
    defaultValues: { name: '', email: '' },
    validators: { onChange: schema },
    onSubmit: async (data) => fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) }),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <Field name="name">
        {({ field, state }) => (
          <>
            <input {...field()} />
            {state.errors && <span role="alert">{state.errors}</span>}
          </>
        )}
      </Field>
      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Library Selection Guide

| Criteria | React Hook Form | Formik | Angular Reactive | TanStack Form |
|---|---|---|---|---|
| Performance | Excellent (uncontrolled) | Good (controlled) | Good (reactive) | Excellent |
| Bundle size | 9KB | 14KB | Built-in | 7KB |
| Complex forms | Best | Good | Good | Good |
| Field arrays | Built-in | Via FieldArray | Built-in (FormArray) | Built-in |
| Multi-step | Custom pattern | Custom pattern | Custom pattern | Custom pattern |
| Learning curve | Low | Low | Moderate | Low |
| Framework | React-only | React-only | Angular-only | Multi-framework |
| Validation | Zod, Yup, Joi | Yup, Zod | Built-in validators | Zod, Yup |

## Integration with Validation Libraries

### Zod Resolver
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
useForm({ resolver: zodResolver(schema) });
```

### Yup Resolver
```typescript
import { yupResolver } from '@hookform/resolvers/yup';
useForm({ resolver: yupResolver(schema) });
```

### Joi Resolver
```typescript
import { joiResolver } from '@hookform/resolvers/joi';
useForm({ resolver: joiResolver(schema) });
```

## Form State Reference

| State | React Hook Form | Formik | Angular |
|---|---|---|---|
| dirty | `formState.isDirty` | `formik.dirty` | `form.dirty` |
| touched | `formState.touched` | `formik.touched` | `form.get('field').touched` |
| submitting | `formState.isSubmitting` | `formik.isSubmitting` | Custom boolean |
| isValid | `formState.isValid` | `formik.isValid` | `form.valid` |
| errors | `formState.errors` | `formik.errors` | `form.get('field').errors` |
| validating | `formState.isValidating` | `formik.isValidating` | Custom boolean |

```tsx
<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? <Spinner /> : 'Submit'}
</button>
```
