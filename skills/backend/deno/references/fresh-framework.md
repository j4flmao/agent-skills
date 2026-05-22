# Fresh Framework

## Project Structure

```
my-app/
  main.ts                     # Entry — call start()
  deno.json                   # Config, import map
  fresh.config.ts             # Fresh plugins, options
  fresh.gen.ts                # Auto-generated (do not edit)
  static/
    favicon.ico                # Served at /favicon.ico
    logo.svg
    styles.css
  routes/
    _app.tsx                   # App shell — wraps all routes
    _layout.tsx                # Layout for route group
    index.tsx                  # GET /
    about.tsx                  # GET /about
    [slug].tsx                 # Dynamic param: /hello-world
    blog/
      index.tsx                # GET /blog
      [slug].tsx               # GET /blog/my-post
    api/
      users.ts                 # GET/POST /api/users
      users/
        [id].ts                # /api/users/123
  islands/
    Counter.tsx                # Interactive island
    SearchBar.tsx
  components/
    Header.tsx
    Footer.tsx
    Card.tsx
  utils/
    db.ts
    auth.ts
```

## Route Handlers

### Page Routes

```typescript
// routes/index.tsx — Static page
export default function Home() {
  return (
    <div>
      <h1>Welcome</h1>
      <p>Fresh framework</p>
    </div>
  );
}
```

```typescript
// routes/blog/[slug].tsx — Dynamic page with data
import { RouteContext } from '$fresh/server.ts';

interface Data {
  post: { title: string; body: string };
}

export async function handler(_req: Request, ctx: RouteContext): Promise<Response> {
  const slug = ctx.params.slug;
  const post = await db.getPost(slug);
  if (!post) return ctx.renderNotFound();
  return ctx.render({ post });
}

export default function BlogPost({ data }: PageProps<Data>) {
  return (
    <article>
      <h1>{data.post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: data.post.body }} />
    </article>
  );
}
```

### API Routes

```typescript
// routes/api/users/[id].ts
import { Handlers } from '$fresh/server.ts';

export const handler: Handlers = {
  async GET(_req, ctx) {
    const id = ctx.params.id;
    const user = await db.getUser(id);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    return Response.json({ data: user });
  },

  async PUT(req, ctx) {
    const id = ctx.params.id;
    const body = await req.json();
    const updated = await db.updateUser(id, body);
    return Response.json({ data: updated });
  },

  async DELETE(_req, ctx) {
    await db.deleteUser(ctx.params.id);
    return new Response(null, { status: 204 });
  },
};
```

### Middleware

```typescript
// routes/_middleware.ts — Applies to all routes
import { MiddlewareHandlerContext } from '$fresh/server.ts';

interface State {
  user: { id: string; role: string } | null;
}

export async function handler(req: Request, ctx: MiddlewareHandlerContext<State>) {
  const token = req.headers.get('authorization')?.slice(7);
  if (token) {
    const payload = await verifyJwt(token);
    ctx.state.user = payload;
  }
  return ctx.next();
}
```

```typescript
// routes/api/_middleware.ts — Applies only to /api/*
import { MiddlewareHandlerContext } from '$fresh/server.ts';

export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
  const start = Date.now();
  const response = await ctx.next();
  const ms = Date.now() - start;
  console.log(`${req.method} ${req.url} ${response.status} ${ms}ms`);
  response.headers.set('x-response-time', `${ms}ms`);
  return response;
}
```

## Islands (Client-Side Interactivity)

```typescript
// islands/Counter.tsx
import { IS_BROWSER } from '$fresh/runtime.ts';
import { useState } from 'preact/hooks';

interface CounterProps {
  initial: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.initial ?? 0);

  return (
    <div>
      <p>{count} clicks</p>
      <button onClick={() => setCount(count - 1)} disabled={!IS_BROWSER}>
        -1
      </button>
      <button onClick={() => setCount(count + 1)} disabled={!IS_BROWSER}>
        +1
      </button>
    </div>
  );
}
```

```typescript
// islands/ThemeToggle.tsx
import { useEffect, useState } from 'preact/hooks';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button onClick={toggle}>
      {dark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
```

### Island Rules
- Island file name must be PascalCase (`SearchBar.tsx`)
- Island component must be default export
- Island props must be serializable (JSON)
- Islands hydrate independently — no shared state between islands
- Keep islands small — only interactive parts, rest stays as server-rendered

## Layouts

```typescript
// routes/_app.tsx — App shell (applies to all routes)
import { PageProps } from '$fresh/server.ts';

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <title>My App</title>
        <link rel='stylesheet' href='/styles.css' />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
```

```typescript
// routes/dashboard/_layout.tsx — Applies to all /dashboard/* routes
import { PageProps } from '$fresh/server.ts';
import Sidebar from '../../components/Sidebar.tsx';

export default function DashboardLayout({ Component }: PageProps) {
  return (
    <div class='dashboard-layout'>
      <Sidebar />
      <main>
        <Component />
      </main>
    </div>
  );
}
```

## Plugins

```typescript
// fresh.config.ts
import { defineConfig } from '$fresh/server.ts';
import tailwind from '$fresh/plugins/tailwind.ts';
import twind from '$fresh/plugins/twind.ts';
import partytown from '$fresh/plugins/partytown.ts';

export default defineConfig({
  plugins: [
    tailwind(),      // Tailwind CSS
    twind(),         // Twind (runtime CSS)
    partytown(),     // Third-party scripts in web worker
  ],
});
```

### Custom Plugin

```typescript
// plugins/helmet.ts
import { Plugin } from '$fresh/server.ts';

export function helmet(): Plugin {
  return {
    name: 'helmet',
    middlewares: [{
      path: '/',
      middleware: {
        handler: async (req, ctx) => {
          const resp = await ctx.next();
          resp.headers.set('x-content-type-options', 'nosniff');
          resp.headers.set('x-frame-options', 'DENY');
          resp.headers.set('x-xss-protection', '1; mode=block');
          resp.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
          return resp;
        },
      },
    }],
  };
}
```

## Static Files

Files in `static/` served at root path:

```
static/
  favicon.ico          → /favicon.ico
  images/logo.svg      → /images/logo.svg
  styles.css           → /styles.css
  js/app.js            → /js/app.js
```

Referenced in templates:

```tsx
<link rel='stylesheet' href='/styles.css' />
<img src='/images/logo.svg' alt='Logo' />
```

## Deployment

### Deno Deploy

```bash
# Deploy via CLI
deployctl deploy --project=my-project main.ts

# GitHub Actions
# - name: Deploy to Deno Deploy
#   uses: denoland/deployctl@v1
#   with:
#     project: my-project
#     entrypoint: main.ts
```

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - run: deno task check
      - run: deno task test
      - uses: denoland/deployctl@v1
        with:
          project: my-project
          entrypoint: main.ts
```

### Fresh Config for Deploy

```typescript
// fresh.config.ts
import { defineConfig } from '$fresh/server.ts';

export default defineConfig({
  server: {
    port: 8000,
    hostname: '0.0.0.0',
  },
});
```

### Docker (Self-Hosted)

```dockerfile
FROM denoland/deno:alpine-2.0.0
EXPOSE 8000
WORKDIR /app
COPY . .
RUN deno cache main.ts
CMD ["deno", "run", "-A", "main.ts"]
```

## Forms & CSRF

```typescript
// routes/login.tsx
import { Handlers, PageProps } from '$fresh/server.ts';

export const handler: Handlers = {
  async POST(req, ctx) {
    const form = await req.formData();
    const email = form.get('email')?.toString();
    const password = form.get('password')?.toString();
    // validate and authenticate
    return new Response(null, {
      status: 302,
      headers: { location: '/dashboard' },
    });
  },
};

export default function Login() {
  return (
    <form method='POST'>
      <input type='email' name='email' required />
      <input type='password' name='password' required />
      <button type='submit'>Log in</button>
    </form>
  );
}
```
