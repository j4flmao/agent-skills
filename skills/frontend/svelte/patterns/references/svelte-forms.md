# Svelte Forms — bind:value, Form Actions, Validation, File Uploads

## Basic Form with bind:value

```svelte
<script>
  let email = $state('')
  let password = $state('')
  let submitted = $state(false)

  async function handleSubmit(e: Event) {
    e.preventDefault()
    submitted = true
    await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }
</script>

<form onsubmit={handleSubmit}>
  <input type="email" bind:value={email} />
  <input type="password" bind:value={password} />
  <button type="submit" disabled={submitted}>Login</button>
</form>
```

## Progressive Enhancement (use:enhance)

```svelte
<script>
  import { enhance } from '$app/forms'

  let result = $state<{ type: 'success' | 'error'; message: string }>()

  async function handleSubmit({ formData, formElement, submitter }: {
    formData: FormData
    formElement: HTMLFormElement
    submitter: HTMLElement | null
  }) {
    const res = await fetch('/api/form', { method: 'POST', body: formData })
    result = await res.json()
  }
</script>

<form method="post" use:enhance={handleSubmit}>
  <input name="name" />
  <button type="submit">Submit</button>
</form>

{#if result}
  <p class:success={result.type === 'success'}>{result.message}</p>
{/if}
```

## Validation with Superforms + Zod

```svelte
<script lang="ts">
  import { superForm, type SuperValidated } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { z } from 'zod'

  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    age: z.coerce.number().min(18),
  })

  let { form, errors, enhance, constraints } = superForm(data as SuperValidated<typeof schema>, {
    validators: zod(schema),
  })
</script>

<form method="post" use:enhance>
  <input name="name" bind:value={$form.name} {...$constraints.name} />
  {#if $errors.name}<span>{$errors.name}</span>{/if}

  <input type="email" name="email" bind:value={$form.email} />
  {#if $errors.email}<span>{$errors.email}</span>{/if}

  <input type="number" name="age" bind:value={$form.age} />
  {#if $errors.age}<span>{$errors.age}</span>{/if}

  <button type="submit">Submit</button>
</form>
```

## File Upload

```svelte
<script>
  let files = $state<FileList | null>(null)

  async function upload() {
    const formData = new FormData()
    if (files) Array.from(files).forEach(f => formData.append('files', f))
    await fetch('/api/upload', { method: 'POST', body: formData })
  }
</script>

<input type="file" bind:files multiple accept="image/*" onchange={upload} />

<!-- With preview -->
{#each Array.from(files ?? []) as file}
  <img src={URL.createObjectURL(file)} alt={file.name} width="100" />
{/each}
```

## HTML Form Validation

```svelte
<form onsubmit={handleSubmit}>
  <input
    name="email"
    type="email"
    bind:value={email}
    required
    pattern="[^@]+@[^@]+\.[^@]+"
  />
  <input name="age" type="number" bind:value={age} min={18} max={120} required />
  <button type="submit">Submit</button>
</form>
```

## Form Actions (SvelteKit)

```ts
// +page.server.ts
import type { Actions } from './$types'
import { fail } from '@sveltejs/kit'

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData()
    const name = data.get('name')
    if (!name || name.toString().length < 2) {
      return fail(400, { error: 'Name too short', name: name?.toString() })
    }
    await db.user.create({ data: { name: name.toString() } })
    return { success: true }
  },
} satisfies Actions
```
