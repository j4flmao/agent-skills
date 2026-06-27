# Code Organization

## Overview
A scalable Remix application requires strict code organization. Because Remix blurs the line between client and server, keeping domain logic separated from routing infrastructure is critical for maintainability.

## 1. Directory Structure
A recommended modular structure for large Remix applications:

```text
app/
├── components/          # Reusable UI components (Buttons, Inputs)
├── routes/              # Routing layer (thin controllers)
├── services/            # Core business logic
│   ├── auth.server.ts
│   └── billing.server.ts
├── utils/               # Helpers and infrastructure
│   ├── db.server.ts
│   ├── redis.server.ts
│   └── formatting.ts
├── styles/              # Global CSS/Tailwind configurations
└── entry.server.tsx     # Server rendering entrypoint
```

## 2. The `.server` Convention
Remix forces any file ending in `.server.ts` or `.server.js` to only be included in the server bundle. If a client component imports from a `.server` file, the build will fail. This prevents leaking secrets.

```typescript
// app/utils/db.server.ts
import { PrismaClient } from '@prisma/client';

let db: PrismaClient;

declare global {
  var __db: PrismaClient | undefined;
}

if (!global.__db) {
  global.__db = new PrismaClient();
}
db = global.__db;

export { db };
```

## 3. Thin Routes, Thick Services
Routes (`app/routes/*.tsx`) should act only as controllers translating HTTP requests into domain operations. Do not put complex database queries inside loaders. Move them to `app/services/`.

```typescript
// app/routes/dashboard.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getDashboardStats } from '~/services/dashboard.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const stats = await getDashboardStats(request);
  return json(stats);
}

// app/services/dashboard.server.ts
import { db } from '~/utils/db.server';
import { requireUserId } from '~/utils/auth.server';

export async function getDashboardStats(request: Request) {
  const userId = await requireUserId(request);
  return db.userStats.findUnique({ where: { userId } });
}
```

## 4. Feature Folders (Route Folders)
For complex routes, use Route Folders to colocate route-specific components alongside the route definition.

```text
app/
└── routes/
    └── dashboard/
        ├── route.tsx          # The loader/action/default export
        ├── Chart.tsx          # Only used by dashboard
        └── Sidebar.tsx        # Only used by dashboard
```

## 5. Reusable UI Components
Components in `app/components/` should be "dumb" or stateless where possible, taking data via props. Let the Route components manage data fetching via `useLoaderData` and pass the data down.

## Best Practices
1. Strictly enforce the `.server.ts` extension for sensitive logic.
2. Keep loaders and actions thin; delegate to service functions.
3. Colocate specific components with their routes using feature folders.
4. Establish clear naming conventions for services and utilities.
5. Use absolute imports (`~/`) configured in `tsconfig.json` to avoid `../../../../` hell.

## Anti-Patterns
1. Giant route files containing database schemas, queries, and UI.
2. Importing server code directly into React components.
3. Creating deeply nested folder hierarchies for components that are rarely reused.
4. Putting business logic inside React `useEffect` hooks instead of server services.
5. Ignoring the `package.json` side-effects configuration which can bloat client bundles.
