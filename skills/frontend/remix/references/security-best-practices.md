# Security Best Practices

## Overview
Remix provides excellent security defaults because its architecture heavily relies on server-side execution for data fetching and mutation. However, proper security practices must still be strictly enforced within Loaders and Actions.

## 1. Authentication and Session Management
Never trust the client. Always verify authentication state on the server inside loaders and actions.

```typescript
import { redirect } from '@remix-run/node';
import { getSession } from '~/utils/session.server';

export async function requireUserId(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  
  if (!userId) {
    throw redirect("/login");
  }
  return userId;
}

// Usage in Loader
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  // Fetch user specific data securely
}
```

## 2. Cross-Site Request Forgery (CSRF)
Since Remix Actions handle form submissions, they are susceptible to CSRF attacks. You should implement a CSRF token mechanism.

```typescript
import { json } from '@remix-run/node';
import { verifyCSRFToken } from '~/utils/csrf.server';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const csrfToken = formData.get('csrf');
  
  try {
    await verifyCSRFToken(request, csrfToken);
  } catch (error) {
    return new Response('Invalid CSRF token', { status: 403 });
  }

  // Proceed with mutation
}
```

## 3. Input Validation & Sanitization
Always validate and sanitize data received in Actions before processing it or saving it to a database. Zod is highly recommended for this.

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  age: z.coerce.number().min(18)
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);
  
  const result = UserSchema.safeParse(data);
  if (!result.success) {
    return json({ errors: result.error.flatten() }, { status: 400 });
  }

  // Safe to use result.data
}
```

## 4. Preventing Cross-Site Scripting (XSS)
React automatically escapes HTML characters, preventing most XSS attacks. However, avoid using `dangerouslySetInnerHTML`. If you must render user-generated HTML, sanitize it on the server before sending it to the client.

```typescript
import sanitizeHtml from 'sanitize-html';

export async function loader({ request }: LoaderFunctionArgs) {
  const rawHtml = await fetchUserBio();
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
    allowedAttributes: { 'a': [ 'href' ] }
  });
  return json({ bio: cleanHtml });
}
```

## 5. Security Headers
Implement strict HTTP security headers using the `headers` function in the root route or middleware.

```typescript
export function headers() {
  return {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline';",
  };
}
```

## Best Practices
1. Authenticate aggressively in both Loaders and Actions.
2. Use HTTPOnly and Secure flags for Session cookies.
3. Validate all inputs using schema validators like Zod.
4. Implement CSRF protection for all state-changing Actions.
5. Set appropriate security headers globally.

## Anti-Patterns
1. Relying on client-side routing guards for security (e.g., hiding a component instead of securing the loader).
2. Passing raw, unsanitized user input into database queries (SQL injection).
3. Exposing sensitive API keys or environment variables to the browser build.
4. Failing to validate authorization (checking if the authenticated user actually owns the resource they are trying to edit).
5. Using predictable or easily guessable session IDs.
