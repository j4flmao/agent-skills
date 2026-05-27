# SvelteKit Endpoints and Data Loading

## Overview
SvelteKit uses a file-based routing system where endpoints (API routes) and page load functions handle data. This reference covers server endpoints, form actions, load functions, page data, and request handling.

## Server Endpoints

### Basic API Endpoint
```typescript
// src/routes/api/posts/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = Number(url.searchParams.get('limit') ?? '10');

  const posts = await db.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return json({ posts, page, limit });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const post = await db.post.create({
    data: {
      title: body.title,
      content: body.content,
      slug: body.title.toLowerCase().replace(/\s+/g, '-'),
    },
  });

  return json(post, { status: 201 });
};
```

### Endpoint with Parameters
```typescript
// src/routes/api/posts/[slug]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const post = await db.post.findUnique({
    where: { slug: params.slug },
    include: { author: true, comments: true },
  });

  if (!post) {
    throw error(404, 'Post not found');
  }

  return json(post);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const post = await db.post.update({
    where: { slug: params.slug },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return json(post);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  await db.post.delete({
    where: { slug: params.slug },
  });

  return new Response(null, { status: 204 });
};
```

## Form Actions

### Server-Side Form Handling
```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    if (!email) {
      return fail(400, { email, missing: true });
    }

    if (!password || password.length < 8) {
      return fail(400, { email, invalid: true });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return fail(401, { email, credentials: true });
    }

    const session = await createSession(user.id);
    cookies.set('session', session.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });

    throw redirect(303, '/dashboard');
  },

  register: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return fail(409, { email, exists: true });
    }

    const user = await db.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
      },
    });

    throw redirect(303, '/login?registered=true');
  },
};
```

### Form Action with Validation
```typescript
// src/routes/posts/create/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const postSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  published: z.coerce.boolean().default(false),
});

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const formData = Object.fromEntries(await request.formData());
    const result = postSchema.safeParse(formData);

    if (!result.success) {
      return fail(400, {
        data: formData,
        errors: result.error.flatten().fieldErrors,
      });
    }

    const post = await db.post.create({
      data: {
        ...result.data,
        authorId: locals.user.id,
        slug: result.data.title.toLowerCase().replace(/\s+/g, '-'),
      },
    });

    throw redirect(303, `/posts/${post.slug}`);
  },
};
```

### Using Actions in Templates
```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  export let form: ActionData;
</script>

<form method="POST" action="?/login" use:enhance>
  <label>
    Email
    <input
      type="email"
      name="email"
      value={form?.data?.email ?? ''}
      class:error={form?.errors?.email}
    />
    {#if form?.errors?.email}
      <span class="error-message">{form.errors.email}</span>
    {/if}
  </label>

  <label>
    Password
    <input type="password" name="password" />
    {#if form?.errors?.password}
      <span class="error-message">{form.errors.password}</span>
    {/if}
  </label>

  <button type="submit">Sign In</button>
</form>
```

## Page Data Loading

### Load Functions
```typescript
// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const page = Number(url.searchParams.get('page') ?? '1');
  const category = url.searchParams.get('category');

  const [posts, categories, stats] = await Promise.all([
    fetch(`/api/posts?page=${page}`).then((r) => r.json()),
    fetch('/api/categories').then((r) => r.json()),
    fetch('/api/stats').then((r) => r.json()),
  ]);

  return {
    posts,
    categories,
    stats,
    page,
  };
};
```

### Layout Data
```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  const session = cookies.get('session');
  if (!session) {
    return { user: null };
  }

  const user = await getUserFromSession(session);
  const notifications = await db.notification.findMany({
    where: { userId: user.id, read: false },
    take: 5,
  });

  return {
    user,
    notifications,
  };
};
```

## Key Points
- +server.ts files define API endpoints for each HTTP method
- Form actions handle POST requests with progressive enhancement
- Load functions provide data to pages and layouts
- Server load functions run on the server only
- Universal load functions run on server and client
- Form actions can return validation errors with fail()
- redirect() and error() utilities handle response flow
- enhance directive enables progressive enhancement for forms
- use:enhance provides client-side form handling
- Parallel data fetching with Promise.all improves performance
- Layout data is available to all child pages
- Invalidating data triggers re-running load functions
- Request event provides params, url, cookies, locals, and fetch
- Locals object shares data between hooks and routes
- Endpoints can return JSON, Response objects, or streams
- Error handling with proper HTTP status codes
