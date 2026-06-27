# Error Handling

## Overview
Remix brings error handling to the forefront. It replaces the traditional "white screen of death" seen in React SPAs with granular, route-level Error Boundaries. Error boundaries handle both expected errors (like 404 Not Found) and unexpected errors (Server 500s).

## 1. The Route ErrorBoundary
Every route module can export an `ErrorBoundary` component. If an error is thrown anywhere in that route—during rendering, in a loader, or in an action—Remix stops execution and renders the nearest `ErrorBoundary`.

```typescript
import { isRouteErrorResponse, useRouteError } from '@remix-run/react';

export function ErrorBoundary() {
  const error = useRouteError();

  // Handle expected HTTP responses thrown from Loaders/Actions
  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-container">
        <h1>{error.status} - {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  // Handle unexpected Javascript Errors
  let errorMessage = "Unknown error";
  if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="error-container critical">
      <h1>Application Error</h1>
      <pre>{errorMessage}</pre>
    </div>
  );
}
```

## 2. Throwing Responses (Expected Errors)
In Remix, throwing a `Response` is a control-flow mechanism, not a crash. It is used for handling Not Found, Unauthorized, or Bad Request scenarios cleanly.

```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { db } from '~/utils/db.server';

export async function loader({ params }: LoaderFunctionArgs) {
  const document = await db.document.findUnique({ where: { id: params.id } });
  
  if (!document) {
    // This stops the loader and triggers the nearest ErrorBoundary
    throw new Response("Document not found", { status: 404 });
  }

  return json(document);
}
```

## 3. Nested Error Boundaries
Because Remix uses nested routing, errors are caught by the *nearest* boundary. This means a broken sidebar component won't crash the header or main layout.

```text
+------------------------------------------------------+
|                    Root Layout                       |
|  +------------------------------------------------+  |
|  |                Root ErrorBoundary              |  |
|  +------------------------------------------------+  |
|  | +-----------------+ +------------------------+ |  |
|  | | Sidebar         | |     Invoice Route      | |  |
|  | |                 | | [ InvoiceErrorBoundary]| |  |
|  | |                 | |                        | |  |
|  | +-----------------+ +------------------------+ |  |
|  +------------------------------------------------+  |
+------------------------------------------------------+
```

## 4. Global Error Handling
The root route (`root.tsx`) must export an `ErrorBoundary`. This acts as the global catch-all for any errors not handled deeper in the component tree.

## 5. Logging Errors to External Services
You should report unexpected errors to services like Sentry. This can be done inside the `ErrorBoundary` or at the server adapter level.

```typescript
import * as Sentry from '@sentry/remix';

export function ErrorBoundary() {
  const error = useRouteError();
  
  if (!isRouteErrorResponse(error)) {
    Sentry.captureException(error);
  }
  
  // Render UI...
}
```

## Best Practices
1. Throw Responses for expected problems (404, 401, 403).
2. Throw standard Errors for unexpected crashes.
3. Place ErrorBoundaries in layouts to isolate failures.
4. Provide helpful UI in boundaries, like "Go back home" or "Retry".
5. Track unhandled errors with monitoring tools.

## Anti-Patterns
1. Catching errors in loaders just to return an `{ error: "..." }` object, bypassing the ErrorBoundary.
2. Rendering a blank page in the ErrorBoundary.
3. Exposing sensitive stack traces to the client in production.
4. Forgetting a Root ErrorBoundary.
5. Not differentiating between expected 40x responses and unexpected 50x errors.
