# Oak Middleware

## Middleware Pipeline

Oak middleware executes in registration order. Each middleware calls `await next()` to pass control.

```typescript
import { Application, Context, Middleware } from 'oak';

const app = new Application();

// Pipeline: error handler → logger → auth → router
app.use(errorMiddleware);
app.use(loggerMiddleware);
app.use(authMiddleware);
app.use(router.routes());
app.use(router.allowedMethods());
```

## Common Middleware Patterns

### Error Handler

```typescript
import { Context, isHttpError, Status, Middleware } from 'oak';

export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      ctx.response.status = err.status;
      ctx.response.body = {
        success: false,
        error: { code: err.name, message: err.message },
      };
    } else {
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' },
      };
      console.error('Unhandled:', err);
    }
  }
};
```

### Request Logger

```typescript
export const loggerMiddleware: Middleware = async (ctx, next) => {
  const start = Date.now();
  ctx.state.requestId = crypto.randomUUID();
  await next();
  const ms = Date.now() - start;
  console.log(
    JSON.stringify({
      method: ctx.request.method,
      path: ctx.request.url.pathname,
      status: ctx.response.status,
      duration: ms,
      requestId: ctx.state.requestId,
    })
  );
};
```

### CORS

```typescript
import { Middleware } from 'oak';

export function corsMiddleware(origin: string): Middleware {
  return async (ctx, next) => {
    ctx.response.headers.set('Access-Control-Allow-Origin', origin);
    ctx.response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    ctx.response.headers.set('Access-Control-Max-Age', '86400');

    if (ctx.request.method === 'OPTIONS') {
      ctx.response.status = 204;
      return;
    }

    await next();
  };
}
```

### Auth Middleware

```typescript
import { Middleware, Status } from 'oak';
import { verify } from 'djwt/mod.ts';

interface JwtPayload {
  sub: string;
  role: string;
}

export const authMiddleware: Middleware = async (ctx, next) => {
  const auth = ctx.request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: 'Missing token' };
    return;
  }

  try {
    const token = auth.slice(7);
    const payload = await verify(token, Deno.env.get('JWT_SECRET')!);
    ctx.state.user = { id: payload.sub, role: payload.role };
    await next();
  } catch {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: 'Invalid token' };
  }
};
```

### Request Timing

```typescript
export const timingMiddleware: Middleware = async (ctx, next) => {
  const start = performance.now();
  ctx.response.headers.set('X-Request-Id', crypto.randomUUID());
  await next();
  const duration = performance.now() - start;
  ctx.response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
};
```

### Composed Middleware

```typescript
// Compose multiple middleware into one
export function compose(...middleware: Middleware[]): Middleware {
  return async (ctx, next) => {
    const dispatch = (i: number): Promise<unknown> => {
      if (i >= middleware.length) return next();
      return middleware[i](ctx, () => dispatch(i + 1));
    };
    await dispatch(0);
  };
}
```

## Context State

```typescript
// Typed state
interface AppState {
  user: { id: string; role: string };
  requestId: string;
  startTime: number;
}

const app = new Application<AppState>();

// Setting state
app.use(async (ctx, next) => {
  ctx.state.startTime = Date.now();
  ctx.state.requestId = crypto.randomUUID();
  await next();
});

// Using state in controllers
function listOrders(ctx: RouterContext<'/', AppState>) {
  const userId = ctx.state.user.id;
  // Use userId in service call
}
```

## Middleware Order Decision Table

| Position | Middleware | Responsibility |
|----------|-----------|----------------|
| 1st | Error handler | Catch all downstream errors |
| 2nd | CORS | Handle preflight, set headers |
| 3rd | Request ID | Attach correlation ID |
| 4th | Logger | Log request/response |
| 5th | Auth | Verify JWT, set user state |
| 6th | Router | Route to controllers |

## Composing External Middleware

```typescript
// oakCors
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';
app.use(oakCors({ origin: 'https://example.com' }));

// Static files
import { send } from 'oak/send.ts';
app.use(async (ctx, next) => {
  const path = ctx.request.url.pathname;
  if (path.startsWith('/static')) {
    await send(ctx, path, { root: `${Deno.cwd()}/public` });
  }
  await next();
});
```
