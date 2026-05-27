# Nuxt Server Routes and API Endpoints

## Overview
Nuxt 3 provides built-in server engine (Nitro) that supports API routes, server middleware, and server-only code. Server routes live in the `server/` directory and handle HTTP requests, database access, and business logic.

## Server Route Structure

### Basic API Route
```typescript
// server/api/posts/index.ts
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const posts = await db.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  const total = await db.post.count();

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
});
```

### Dynamic Route Parameters
```typescript
// server/api/posts/[slug].ts
import { defineEventHandler, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');

  const post = await db.post.findUnique({
    where: { slug },
    include: {
      author: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Post not found',
    });
  }

  return post;
});
```

### CRUD Operations
```typescript
// server/api/posts/[slug].ts
import { defineEventHandler, readBody, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const method = event.method;
  const slug = getRouterParam(event, 'slug');

  switch (method) {
    case 'GET':
      return await getPost(slug);
    case 'PUT':
      return await updatePost(event, slug);
    case 'DELETE':
      return await deletePost(event, slug);
    default:
      throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
  }
});

async function getPost(slug: string) {
  const post = await db.post.findUnique({ where: { slug } });
  if (!post) throw createError({ statusCode: 404 });
  return post;
}

async function updatePost(event: any, slug: string) {
  const body = await readBody(event);
  const post = await db.post.update({
    where: { slug },
    data: {
      title: body.title,
      content: body.content,
    },
  });
  return post;
}

async function deletePost(event: any, slug: string) {
  await db.post.delete({ where: { slug } });
  return { success: true };
}
```

## Request Handling

### Reading Request Data
```typescript
// server/api/contact.ts
import { defineEventHandler, readBody, getQuery, getHeaders } from 'h3';

export default defineEventHandler(async (event) => {
  // Query parameters
  const query = getQuery(event);

  // Request body
  const body = await readBody(event);

  // Headers
  const headers = getHeaders(event);
  const userAgent = headers['user-agent'];
  const authorization = headers['authorization'];

  // Cookies
  const cookies = parseCookies(event);
  const sessionToken = cookies['session-token'];

  // URL
  const url = getRequestURL(event);
  const path = url.pathname;

  return {
    query,
    body,
    userAgent,
    hasAuth: !!authorization,
    hasSession: !!sessionToken,
    path,
  };
});
```

### Response Helpers
```typescript
// server/api/users/export.ts
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const users = await db.user.findMany();

  setResponseStatus(event, 200);
  setResponseHeader(event, 'Content-Type', 'application/json');
  setResponseHeader(event, 'X-Custom-Header', 'custom-value');

  const etag = `users-${Date.now()}`;
  setResponseHeader(event, 'ETag', etag);

  if (getRequestHeader(event, 'if-none-match') === etag) {
    setResponseStatus(event, 304);
    return null;
  }

  return { users, count: users.length };
});
```

## Server Middleware

### Global Middleware
```typescript
// server/middleware/auth.ts
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/health'];

  if (publicPaths.includes(event.path)) {
    return;
  }

  const token = getHeader(event, 'authorization')?.replace('Bearer ', '');
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  try {
    const user = await verifyToken(token);
    event.context.user = user;
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' });
  }
});
```

### Route-Specific Middleware
```typescript
// server/middleware/rateLimit.ts
import { defineEventHandler } from 'h3';

const rateLimit = new Map<string, { count: number; resetAt: number }>();

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return;

  const ip = getRequestIP(event) || 'unknown';
  const now = Date.now();
  const limit = 100;
  const window = 60 * 1000; // 1 minute

  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + window });
    return;
  }

  if (entry.count >= limit) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    });
  }

  entry.count++;
});
```

## Server Utilities

### Database Access
```typescript
// server/utils/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export default prisma;

// Usage in server routes
import prisma from '~/server/utils/db';

export default defineEventHandler(async () => {
  return await prisma.user.findMany();
});
```

### Validation
```typescript
// server/utils/validation.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  published: z.boolean().default(false),
  tags: z.array(z.string()).max(5).default([]),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}
```

## Server Routes Composition

### Nested Routes
```typescript
// server/api/users/[id]/posts.ts
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id');
  const query = getQuery(event);

  const posts = await db.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    take: Number(query.limit) || 10,
  });

  return posts;
});
```

### Catch-All Routes
```typescript
// server/api/[...slug].ts
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, '_');

  // slug is an array of path segments
  // e.g., /api/a/b/c -> ['a', 'b', 'c']

  return {
    segments: slug,
    depth: slug.length,
  };
});
```

## Key Points
- Server routes are defined in the server/ directory
- Nitro engine handles HTTP server functionality
- useEventHandler creates route handlers
- getRouterParam reads dynamic route parameters
- readBody parses JSON request bodies
- getQuery reads URL query parameters
- setResponseStatus and setResponseHeader control response
- Server middleware runs before route handlers
- Route-specific middleware conditionally processes requests
- Server utilities in server/utils/ are auto-imported
- Database access is safe only in server routes
- Validation protects against malformed input
- Nested routes follow the file system structure
- Catch-all routes handle dynamic path segments
- Event context shares data between middleware and handlers
- Error handling with createError standardizes error responses
- TypeScript provides type safety for request/response data
- Server routes can return JSON, streams, or Response objects
