# Architecture Patterns

## Overview
This document covers detailed architectural patterns for Remix Run. Remix leverages the web platform and standard HTTP mechanisms. It shifts the paradigm from thick client SPAs to server-rendered, progressively enhanced applications.

## 1. Nested Routing Architecture

### ASCII Diagram
```text
+------------------------------------------------------+
|                    Root Layout                       |
|  +------------------------------------------------+  |
|  |                Header / Nav                    |  |
|  +------------------------------------------------+  |
|  | +-----------------+ +------------------------+ |  |
|  | | Sidebar         | |     Main Content       | |  |
|  | | - Link 1        | | [ Outlet rendered ]    | |  |
|  | | - Link 2        | |                        | |  |
|  | +-----------------+ +------------------------+ |  |
|  +------------------------------------------------+  |
|  |                  Footer                        |  |
|  +------------------------------------------------+  |
+------------------------------------------------------+
```

### Explanation
Remix deeply couples nested UI with nested routes. This means that a URL like `/dashboard/invoices/123` maps to a hierarchy of components. Each component can have its own `loader` to fetch data in parallel. 

## 2. The BFF (Backend For Frontend) Pattern
Remix naturally acts as a BFF. Loaders run on the server, meaning they can safely interact with microservices, databases, and third-party APIs without exposing secrets to the browser.

```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUser } from '~/utils/auth.server';
import { fetchInvoices } from '~/services/invoices.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const invoices = await fetchInvoices(user.id);
  
  return json({
    user: { id: user.id, name: user.name },
    invoices
  });
}

export default function Dashboard() {
  const { user, invoices } = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <ul>
        {invoices.map(inv => (
          <li key={inv.id}>{inv.amount} - {inv.status}</li>
        ))}
      </ul>
    </div>
  );
}
```

## 3. Data Mutation via Actions
Instead of manual `fetch` calls or managing `isSubmitting` states manually, Remix uses standard HTML forms and `action` functions.

```typescript
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { createInvoice } from '~/services/invoices.server';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const amount = formData.get('amount');
  
  if (typeof amount !== 'string' || isNaN(Number(amount))) {
    return json({ error: 'Invalid amount' }, { status: 400 });
  }
  
  await createInvoice(Number(amount));
  return redirect('/dashboard/invoices');
}

export default function NewInvoice() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post">
      {actionData?.error && <div className="error">{actionData.error}</div>}
      <label>
        Amount:
        <input type="text" name="amount" />
      </label>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Create Invoice'}
      </button>
    </Form>
  );
}
```

## 4. Resource Routes
Sometimes you don't need UI. You just need an endpoint (e.g., for Webhooks, RSS feeds, or downloading PDFs).

```typescript
import type { ActionFunctionArgs } from '@remix-run/node';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  // Process webhook...
  return new Response('OK', { status: 200 });
}
```

## 5. Caching Strategies
Caching in Remix relies heavily on standard HTTP headers.

```typescript
export function headers() {
  return {
    "Cache-Control": "max-age=300, s-maxage=3600"
  };
}
```

## Best Practices
1. **Thin Loaders**: Keep loaders focused on data fetching. Move complex logic to service files.
2. **Standard Web APIs**: Familiarize yourself with `Request`, `Response`, `Headers`, and `FormData`.
3. **Optimistic UI**: Use `useNavigation` or `useFetcher` to build snappy, optimistic interfaces.
4. **Graceful Degradation**: Ensure forms work without JavaScript enabled.
5. **Parallel Data Fetching**: Take advantage of nested routes to avoid network waterfalls.

## Anti-Patterns
1. Client-side data fetching on mount (e.g., `useEffect` for data).
2. Storing server state in React Context.
3. Ignoring HTTP caching headers.
4. Over-fetching in loaders.
5. Failing to handle expected errors using Error Boundaries.

## More Insights
Remix promotes a "use the platform" mentality. By understanding how the web works, you automatically become a better Remix developer. The patterns outlined here are just the beginning. 
For more complex scenarios, consider integrating robust caching layers (like Redis) and exploring Edge computing environments (like Cloudflare Workers) to bring your loaders closer to your users.
