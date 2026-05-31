# SvelteKit Form Actions

## Overview

SvelteKit form actions handle mutations (POST, PUT, PATCH, DELETE) directly from `<form>` elements without JavaScript. They provide progressive enhancement — forms work without JS and get better UX with it. This reference covers action patterns, validation, error handling, redirects, and integration with use:enhance.

## Basic Form Action

### Server-side action

```typescript
// src/routes/contact/+page.server.ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const name = data.get('name') as string;
    const email = data.get('email') as string;
    const message = data.get('message') as string;

    if (!name || name.length < 2) {
      return fail(422, { error: 'Name must be at least 2 characters', name, email });
    }

    if (!email || !email.includes('@')) {
      return fail(422, { error: 'Valid email is required', name, email });
    }

    await db.contact.create({ data: { name, email, message } });
    throw redirect(303, '/contact/thanks');
  }
};
```

```svelte
<!-- src/routes/contact/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  export let form;
</script>

<form method="POST" use:enhance>
  <label>Name <input name="name" value={form?.name ?? ''} /></label>
  <label>Email <input name="email" type="email" value={form?.email ?? ''} /></label>
  <label>Message <textarea name="message"></textarea></label>
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}
  <button type="submit">Send</button>
</form>
```

### Named Actions

```typescript
// src/routes/posts/[slug]/+page.server.ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
  create: async ({ request, params }) => {
    const data = await request.formData();
    const content = data.get('content') as string;
    const comment = await db.comment.create({
      data: { content, postId: params.slug, authorId: locals.user.id }
    });
    return { comment };
  },

  delete: async ({ request, params }) => {
    const data = await request.formData();
    const commentId = data.get('commentId') as string;
    await db.comment.delete({ where: { id: commentId, authorId: locals.user.id } });
    return { deleted: commentId };
  },

  vote: async ({ request, params }) => {
    const data = await request.formData();
    const direction = data.get('direction') as string;
    if (direction !== 'up' && direction !== 'down') {
      return fail(400, { error: 'Invalid vote direction' });
    }
    await db.vote.upsert({
      where: { postId_userId: { postId: params.slug, userId: locals.user.id } },
      create: { postId: params.slug, userId: locals.user.id, direction },
      update: { direction }
    });
    return { success: true };
  }
};
```

```svelte
<form method="POST" action="?/create" use:enhance>
  <textarea name="content" required></textarea>
  <button type="submit">Post Comment</button>
</form>

<form method="POST" action="?/delete" use:enhance>
  <input type="hidden" name="commentId" value={comment.id} />
  <button type="submit">Delete</button>
</form>

<form method="POST" action="?/vote" use:enhance>
  <input type="hidden" name="direction" value="up" />
  <button type="submit">Upvote</button>
</form>
```

## Validation Patterns

### Field-level errors

```typescript
export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const errors: Record<string, string> = {};

    const email = data.get('email') as string;
    const password = data.get('password') as string;

    if (!email) errors.email = 'Email is required';
    else if (!email.includes('@')) errors.email = 'Invalid email format';

    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Minimum 8 characters';

    if (Object.keys(errors).length > 0) {
      return fail(422, { errors, values: { email } });
    }

    await db.user.create({ data: { email, password: await hash(password) } });
    throw redirect(303, '/login');
  }
};
```

```svelte
<form method="POST" use:enhance>
  {#if form?.errors}
    <div class="errors">
      {#each Object.entries(form.errors) as [field, message]}
        <p class="error">{field}: {message}</p>
      {/each}
    </div>
  {/if}

  <label>Email
    <input name="email" type="email" value={form?.values?.email ?? ''} />
  </label>
  {#if form?.errors?.email}
    <p class="field-error">{form.errors.email}</p>
  {/if}

  <label>Password
    <input name="password" type="password" />
  </label>
  {#if form?.errors?.password}
    <p class="field-error">{form.errors.password}</p>
  {/if}

  <button type="submit">Register</button>
</form>
```

### Using Zod for validation

```typescript
import { z } from 'zod';
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name is required').max(100),
  agreeToTerms: z.enum(['on'], { required_error: 'You must agree to terms' }),
});

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const raw = {
      email: data.get('email'),
      password: data.get('password'),
      name: data.get('name'),
      agreeToTerms: data.get('agreeToTerms'),
    };

    const result = registerSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const flatErrors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(fieldErrors)) {
        if (msgs && msgs.length > 0) flatErrors[key] = msgs[0];
      }
      return fail(422, { errors: flatErrors, values: { email: raw.email, name: raw.name } });
    }

    const existing = await db.user.findUnique({ where: { email: result.data.email } });
    if (existing) {
      return fail(409, {
        errors: { email: 'Email is already registered' },
        values: { email: raw.email, name: raw.name }
      });
    }

    await db.user.create({
      data: {
        email: result.data.email,
        password: await hash(result.data.password),
        name: result.data.name,
      }
    });

    throw redirect(303, '/login');
  }
};
```

## use:enhance

### Basic progressive enhancement

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
</script>

<form method="POST" use:enhance>
  <input name="query" />
  <button type="submit">Search</button>
</form>
```

`use:enhance` provides:
- No full-page reload on form submission
- Form data is sent via fetch
- Action response updates `$page.form`
- Form is automatically reset on success
- Focus management on error

### Custom enhance callback

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  let submitting = false;

  const handleEnhance = () => {
    submitting = true;
  };
</script>

<form
  method="POST"
  use:enhance={handleEnhance}
  on:submit={(e) => {
    // Additional client-side logic before submission
  }}
>
  <button type="submit" disabled={submitting}>
    {submitting ? 'Saving...' : 'Save'}
  </button>
</form>
```

### Advanced enhance with result handling

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/stores/toast';

  const handleSubmit = ({ formElement, formData, action, cancel }) => {
    // Prevent default if needed
    // cancel();

    return async ({ result, update }) => {
      // result.type can be 'success', 'error', 'redirect', 'invalid'
      if (result.type === 'success') {
        toast.show('Saved successfully');
      } else if (result.type === 'error') {
        toast.show('Something went wrong', 'error');
      } else if (result.type === 'invalid') {
        toast.show('Please fix the errors', 'warning');
      } else if (result.type === 'redirect') {
        // SvelteKit handles the redirect
      }

      // Call update to apply default behavior (update form, reset, etc.)
      update();

      // Optionally invalidate parent data
      await invalidateAll();
    };
  };
</script>

<form method="POST" use:enhance={handleSubmit}>
  <input name="title" required />
  <button type="submit">Create Post</button>
</form>
```

## Error Handling

### Returning errors with fail

```typescript
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();

    // Validation error — status 422
    if (!data.get('email')) {
      return fail(422, { error: 'Email is required', submitted: true });
    }

    // Conflict — status 409
    const existing = await db.user.findUnique({ where: { email: data.get('email') as string } });
    if (existing) {
      return fail(409, { error: 'Email already registered', submitted: true });
    }

    // Not found — status 404
    const product = await db.product.findUnique({ where: { id: data.get('productId') as string } });
    if (!product) {
      return fail(404, { error: 'Product not found' });
    }

    throw redirect(303, '/success');
  }
};
```

### Throwing errors

```typescript
import { error } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ locals, request }) => {
    if (!locals.user) {
      throw error(401, 'You must be logged in');
    }

    const data = await request.formData();
    const postId = data.get('postId') as string;

    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw error(404, 'Post not found');
    }

    if (post.authorId !== locals.user.id) {
      throw error(403, 'You can only edit your own posts');
    }

    // proceed with mutation
  }
};
```

## Redirect Patterns

### Redirect after success

```typescript
import { redirect } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request }) => {
    const order = await db.order.create({ data: { ... } });
    throw redirect(303, `/orders/${order.id}`);
  }
};
```

Status codes for redirect:
- `303` — See Other (POST -> GET redirect, most common for forms)
- `302` — Found
- `301` — Moved Permanently (use carefully, cached by browsers)

### Conditional redirect based on user

```typescript
export const actions: Actions = {
  default: async ({ request, locals }) => {
    // ... process form

    if (locals.user.role === 'admin') {
      throw redirect(303, '/admin/dashboard');
    }
    throw redirect(303, '/dashboard');
  }
};
```

## Loading States and UX

### Button loading state

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let submitting = false;

  const handleEnhance = () => {
    submitting = true;
    return async ({ update }) => {
      await update();
      submitting = false;
    };
  };
</script>

<form method="POST" use:enhance={handleEnhance}>
  <button type="submit" disabled={submitting}>
    {#if submitting}
      <span class="spinner"></span> Saving...
    {:else}
      Save Changes
    {/if}
  </button>
</form>
```

### Disable form during submission

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let submitting = false;

  const handleEnhance = () => {
    submitting = true;
    return async ({ update }) => {
      await update();
      submitting = false;
    };
  };
</script>

<form method="POST" use:enhance={handleEnhance}>
  <fieldset disabled={submitting}>
    <input name="title" required />
    <textarea name="content" required></textarea>
    <button type="submit">Submit</button>
  </fieldset>
</form>
```

## Complex Form Patterns

### Multi-step form

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let step = 1;
</script>

<form method="POST" use:enhance>
  {#if step === 1}
    <label>Email <input name="email" type="email" /></label>
    <button type="button" on:click={() => step++}>Next</button>
  {:else if step === 2}
    <label>Name <input name="name" /></label>
    <label>Company <input name="company" /></label>
    <button type="button" on:click={() => step--}>Back</button>
    <button type="submit">Submit</button>
  {/if}
</form>
```

### Dynamic field arrays

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let inviteCount = 1;

  function addInvite() { inviteCount++; }
  function removeInvite(i: number) {
    document.getElementById(`invite-${i}`)?.remove();
  }
</script>

<form method="POST" use:enhance>
  {#each Array(inviteCount) as _, i}
    <div id="invite-{i}">
      <input name="email-{i}" type="email" placeholder="Email address" />
      <select name="role-{i}">
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button type="button" on:click={() => removeInvite(i)}>Remove</button>
    </div>
  {/each}
  <button type="button" on:click={addInvite}>Add another</button>
  <button type="submit">Send invites</button>
</form>
```

```typescript
// Server-side handling
export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const invites: Array<{ email: string; role: string }> = [];

    let i = 0;
    while (data.has(`email-${i}`)) {
      invites.push({
        email: data.get(`email-${i}`) as string,
        role: data.get(`role-${i}`) as string,
      });
      i++;
    }

    await db.invite.createMany({ data: invites });
    return { success: true, count: invites.length };
  }
};
```

### File upload

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  export let form;
</script>

<form method="POST" enctype="multipart/form-data" use:enhance>
  <label>Avatar
    <input type="file" name="avatar" accept="image/*" />
  </label>
  {#if form?.errors?.avatar}
    <p class="error">{form.errors.avatar}</p>
  {/if}
  <button type="submit">Upload</button>
</form>
```

```typescript
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const avatar = data.get('avatar') as File;

    if (!avatar || avatar.size === 0) {
      return fail(400, { errors: { avatar: 'No file selected' } });
    }

    if (avatar.size > 5 * 1024 * 1024) {
      return fail(400, { errors: { avatar: 'File too large (max 5MB)' } });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(avatar.type)) {
      return fail(400, { errors: { avatar: 'Invalid file type' } });
    }

    const buffer = Buffer.from(await avatar.arrayBuffer());
    const filename = `${Date.now()}-${avatar.name}`;
    await writeFile(`static/uploads/${filename}`, buffer);

    return { success: true, filename };
  }
};
```

### Form with captcha

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { PUBLIC_RECAPTCHA_SITE_KEY } from '$env/static/public';

  let recaptchaToken = '';

  onMount(() => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js`;
    document.head.appendChild(script);
  });

  const handleSubmit = () => {
    // @ts-ignore
    recaptchaToken = grecaptcha.getResponse();
    if (!recaptchaToken) {
      alert('Please complete the captcha');
      return;
    }
  };
</script>

<form method="POST" use:enhance={handleSubmit}>
  <input type="hidden" name="recaptchaToken" value={recaptchaToken} />
  <div class="g-recaptcha" data-sitekey={PUBLIC_RECAPTCHA_SITE_KEY}></div>
  <button type="submit">Submit</button>
</form>
```

### Form with optimistic UI

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let pendingItems = [];

  const handleSubmit = ({ formElement, formData }) => {
    const item = formData.get('todo');
    pendingItems = [...pendingItems, { text: item, pending: true }];

    return async ({ update, result }) => {
      if (result.type === 'success' || result.type === 'redirect') {
        pendingItems = pendingItems.filter(t => t.text !== item);
      } else {
        pendingItems = pendingItems.map(t =>
          t.text === item ? { ...t, pending: false, error: true } : t
        );
      }
      await update();
    };
  };
</script>

<form method="POST" use:enhance={handleSubmit}>
  <input name="todo" placeholder="Add a todo..." />
  <button type="submit">Add</button>
</form>

{#each pendingItems as item}
  <div class:pending={item.pending} class:error={item.error}>
    {item.text}
    {#if item.pending}<span class="spinner"></span>{/if}
  </div>
{/each}
```

## Security

### CSRF protection

SvelteKit has built-in CSRF protection using origin checking. Ensure your `formaction` attributes use the same origin.

### Input sanitization

```typescript
import sanitizeHtml from 'sanitize-html';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const content = sanitizeHtml(data.get('content') as string, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a'],
      allowedAttributes: { 'a': ['href'] }
    });

    await db.comment.create({ data: { content } });
    return { success: true };
  }
};
```

### Rate limiting

```typescript
// src/hooks.server.ts
const rateLimit = new Map();

export const handle: Handle = async ({ event, resolve }) => {
  if (event.request.method === 'POST') {
    const ip = event.getClientAddress();
    const key = `${ip}:${event.url.pathname}`;
    const now = Date.now();
    const windowMs = 60_000;
    const maxRequests = 10;

    const timestamps = rateLimit.get(key) || [];
    const recent = timestamps.filter(t => now - t < windowMs);

    if (recent.length >= maxRequests) {
      return new Response('Too many requests', { status: 429 });
    }

    recent.push(now);
    rateLimit.set(key, recent);
  }

  return await resolve(event);
};
```

## Testing Form Actions

```typescript
import { describe, it, expect } from 'vitest';
import { actions } from './routes/contact/+page.server';

describe('contact form action', () => {
  it('returns error for missing name', async () => {
    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('message', 'Hello');

    const result = await actions.default({
      request: new Request('http://localhost', { method: 'POST', body: formData }),
      locals: {},
      // ... other required params
    } as any);

    expect(result.status).toBe(422);
    expect(result.data.error).toBeDefined();
  });

  it('redirects on success', async () => {
    const formData = new FormData();
    formData.set('name', 'John');
    formData.set('email', 'john@example.com');
    formData.set('message', 'Hello');

    try {
      await actions.default({
        request: new Request('http://localhost', { method: 'POST', body: formData }),
        locals: {},
      } as any);
    } catch (e) {
      expect(e.status).toBe(303);
      expect(e.location).toBe('/contact/thanks');
    }
  });
});
```

## $page.form updates

The form response is available via `$page.form` in the page component. It resets after the next navigation.

```svelte
<script lang="ts">
  import { page } from '$app/stores';
</script>

{#if $page.form?.success}
  <p class="success">Item created successfully!</p>
{/if}

{#if $page.form?.error}
  <p class="error">{$page.form.error}</p>
{/if}
```
