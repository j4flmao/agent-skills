# SolidJS Forms — Controlled Inputs, Validation, Field Arrays, Custom Form State

## Basic Controlled Form with Signals

```tsx
import { createSignal } from 'solid-js'

function LoginForm() {
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [submitted, setSubmitted] = createSignal(false)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setSubmitted(true)
    await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: email(), password: password() }),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email()} onInput={(e) => setEmail(e.target.value)} />
      <input type="password" value={password()} onInput={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={submitted()}>Login</button>
    </form>
  )
}
```

## Validation with Zod

```tsx
import { z } from 'zod'
import { createStore } from 'solid-js/store'

const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
})

function LoginForm() {
  const [values, setValues] = createStore({ email: '', password: '' })
  const [errors, setErrors] = createStore<Record<string, string>>({})

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const result = LoginSchema.safeParse(values)
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as Record<string, string>)
      return
    }
    setErrors({})
    // submit...
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={values.email}
        onInput={(e) => setValues('email', e.target.value)}
      />
      {errors.email && <span>{errors.email}</span>}
      <input
        type="password"
        value={values.password}
        onInput={(e) => setValues('password', e.target.value)}
      />
      {errors.password && <span>{errors.password}</span>}
      <button type="submit">Login</button>
    </form>
  )
}
```

## Field Arrays

```tsx
import { createStore } from 'solid-js/store'

function InvoiceForm() {
  const [items, setItems] = createStore<{ name: string; price: number }[]>([])

  function addItem() {
    setItems([...items, { name: '', price: 0 }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: 'name' | 'price', value: string | number) {
    setItems(index, field, value as never)
  }

  return (
    <div>
      <For each={items}>
        {(item, index) => (
          <div>
            <input value={item.name} onInput={(e) => updateItem(index(), 'name', e.target.value)} />
            <input type="number" value={item.price} onInput={(e) => updateItem(index(), 'price', Number(e.target.value))} />
            <button onClick={() => removeItem(index())}>Remove</button>
          </div>
        )}
      </For>
      <button onClick={addItem}>Add Item</button>
    </div>
  )
}
```

## Custom Form State with createStore

```tsx
function createForm<T extends Record<string, any>>(initial: T) {
  const [values, setValues] = createStore(initial)
  const [errors, setErrors] = createStore<Record<string, string>>({})
  const [touched, setTouched] = createStore<Record<string, boolean>>({})

  return {
    values,
    errors,
    touched,
    setField: (field: keyof T, value: T[keyof T]) => setValues(field as string, value as never),
    setError: (field: string, error: string) => setErrors(field, error),
    setTouched: (field: string) => setTouched(field, true),
    reset: () => { setValues(initial); setErrors({}); setTouched({}) },
    isValid: () => Object.keys(errors).length === 0,
  } as const
}
```
