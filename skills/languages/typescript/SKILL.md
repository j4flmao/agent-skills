---
name: typescript
description: >
  Use this skill when the user asks about TypeScript build tools, tsconfig,
  module resolution, type system, advanced types, generics, testing, or
  production deployment. Focus on tooling, type system, and ecosystem — not
  syntax basics.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [typescript, language, build, type-system]
---

# TypeScript

## Purpose
Guide for TypeScript build tools, tsconfig configuration, module resolution, advanced type system (generics, conditional types, template literals), testing, and production deployment.

## Agent Protocol

### Trigger
Keywords: `typescript build`, `tsconfig`, `module resolution`, `tsc`, `esbuild`, `generics typescript`, `conditional types`, `type narrowing`, `vitest`, `jest typescript`.

### Input Context
- Project type (library, app, monorepo)
- Module system (ESM, CJS, both)
- Bundler (tsc, esbuild, webpack, tsup, rollup)
- Runtime (Node.js, Deno, Bun, browser)

## Decision Trees

### Module Format Selection
```
Target runtime?
├── Node.js 22+ (modern) → ESM only ("type": "module" in package.json)
├── Node.js 18-20 → ESM + CJS fallback (dual package)
├── Library for wide consumption → ESM + CJS with "exports" field
├── Browser app → Bundled ESM via esbuild/webpack
└── Mixed-version Node.js + browsers → tsc + bundler with moduleResolution "bundler"
```

### Build Tool Selection
```
What are you building?
├── Library → tsup (esbuild-based, ESM+CJS dual output, DTS generation)
├── Node.js app → tsx (dev) + tsc (build) OR Bun for all-in-one
├── Browser app → Vite (esbuild dev, rollup prod) with TypeScript plugin
├── Monorepo → Turborepo + tsup per package + tsc --noEmit for type-check
└── Quick script → tsx (execute TS directly, no build step)
```

### Type Strictness
```
Codebase maturity?
├── New project → strict: true + noUncheckedIndexedAccess + exactOptionalPropertyTypes
├── Migrating JS → strict: true first, incremental strictness per file
├── Library → strict + declaration + declarationMap
├── Monorepo → project references + composite: true + incremental
└── Maximum safety → strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes + noPropertyAccessFromIndexSignature
```

## Build & Package Management

### tsconfig.json (Strict Modern)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,

    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    "noEmit": true  // For type-check only; use tsup/vite for emit
  },
  "include": ["src/**/*"]
}
```

### Package Exports (Dual ESM+CJS)
```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./client": {
      "import": "./dist/client.js",
      "require": "./dist/client.cjs",
      "types": "./dist/client.d.ts"
    }
  }
}
```

### Build Commands
```bash
# Type-check (no emit)
tsc --noEmit

# Library build
tsup src/index.ts --format esm,cjs --dts --clean

# App build
tsc -p tsconfig.build.json
node --experimental-specifier-resolution=node dist/index.js

# Watch mode
tsup src/index.ts --format esm --watch

# API Extractor for .d.ts rollup
api-extractor run
```

## Language-Specific Patterns

### Branded Types
```typescript
// Prevent mixing semantically different strings/numbers
type Brand<T, B> = T & { __brand: B };
type OrderId = Brand<string, "OrderId">;
type UserId = Brand<string, "UserId">;

function createOrderId(value: string): OrderId {
  return value as OrderId;
}

function getOrder(id: OrderId): Order { ... }
function getUser(id: UserId): User { ... }

// TypeScript catches the mistake:
const uid = createUserId("abc");
getOrder(uid);  // ❌ Type 'UserId' not assignable to 'OrderId'
```

### Discriminated Unions
```typescript
// Exhaustive matching with exhaustiveness check
type ApiResponse<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error; code: number };

function handleResponse<T>(resp: ApiResponse<T>): void {
  switch (resp.status) {
    case "loading":
      break;
    case "success":
      console.log(resp.data);
      break;
    case "error":
      console.error(resp.error, resp.code);
      break;
    default:
      // Ensures all cases handled — compile error if new type added
      const _exhaustive: never = resp;
  }
}
```

### Template Literal Types
```typescript
// Path parameters as types
type EventName = `user:${"created" | "updated" | "deleted"}`;
// EventName = "user:created" | "user:updated" | "user:deleted"

// Parse path params
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

type UserRouteParams = ExtractParams<"/users/:userId/orders/:orderId">;
// { userId: string; orderId: string }
```

### Conditional Types + infer
```typescript
// Extract return type from function
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

// Deep partial
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

// Non-nullable keys
type NonNullableKeys<T> = {
  [K in keyof T as T[K] extends null | undefined ? never : K]: T[K];
};
```

### Type-Safe Builder
```typescript
class QueryBuilder<T extends Record<string, unknown>> {
  private filters: Partial<T> = {};

  where<K extends keyof T>(key: K, value: T[K]): this {
    this.filters[key] = value;
    return this;
  }

  build(): Partial<T> {
    return { ...this.filters };
  }
}

type Order = { status: "pending" | "paid"; total: number; customer: string };
const query = new QueryBuilder<Order>()
  .where("status", "pending")
  .where("total", 100)
  .build();
```

## Testing & Tooling

### Vitest
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processOrder } from "./order";

const mockDb = { save: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processOrder", () => {
  it("creates order with pending status", async () => {
    mockDb.save.mockResolvedValue({ id: 1 });
    const result = await processOrder({ customerId: 1, items: [] }, mockDb);
    expect(result.status).toBe("pending");
    expect(mockDb.save).toHaveBeenCalledOnce();
  });

  it("throws if items empty", async () => {
    await expect(
      processOrder({ customerId: 1, items: [] }, mockDb)
    ).rejects.toThrow("order must have items");
  });
});
```

### Type Testing
```typescript
import { expectTypeOf } from "vitest";

it("ExtractParams extracts route params", () => {
  type Result = ExtractParams<"/users/:userId/orders/:orderId">;
  expectTypeOf<Result>().toEqualTypeOf<{
    userId: string;
    orderId: string;
  }>();
});
```

## Anti-Patterns
- **`any` everywhere**: Defeats TypeScript's entire purpose. Use `unknown` + type narrowing, or `@ts-expect-error` with comment
- **`as` casting without validation**: Silences compiler but allows runtime errors. Use runtime validation (zod, io-ts) and infer types
- **`// @ts-ignore` over `// @ts-expect-error`**: ignore silences all errors including future ones. Use expect-error with next-line specificity
- **Overly complex types**: Nested conditional types with 10+ branches are unreadable. Favor composition over mega-types
- **`enum` when union is sufficient**: `enum` values exist at runtime and tree-shake poorly. Use `as const` + union type
- **Namespace over modules**: Namespaces are legacy (pre-ESM). Use ES module `import`/`export`
- **Not using `satisfies`**: `as const` loses type info. `satisfies` validates without widening
- **`null` vs `undefined` inconsistency**: Pick one convention. Prefer `undefined` for missing values
- **`noUncheckedIndexedAccess` disabled**: Allows reading `[i]` without bounds, leading to undefined crashes
- **`skipLibCheck` disabled in large projects**: Slows typecheck dramatically. Keep enabled unless building library
- **Runtime type checking in JS emitted code**: TypeScript types don't exist at runtime. Validate external data with zod/io-ts

## Performance Patterns
- Use `tsc --noEmit` for type-check only (separate from bundler for speed)
- `skipLibCheck: true` in app projects (library type resolution takes 60%+ of typecheck time)
- `incremental: true` + `tsbuildinfo` for faster incremental type-checks
- Prefer `interface` over `type` for object shapes (faster, mergeable, better error messages)
- Use `const` assertions over `as const` for arrays: `["a", "b"] as const` creates readonly tuple
- `satisfies` keyword for type validation without widening (TypeScript 4.9+)
- `isolatedModules: true` ensures each file can be transpiled independently (required by esbuild)
- `verbatimModuleSyntax` prohibits type-only imports without `type` prefix

## Zod Runtime Validation

TypeScript types are erased at runtime — external data (API responses, form inputs, localStorage) must be validated at runtime. Zod is the standard: define schemas that double as TypeScript types via `z.infer<typeof schema>`. Pattern:
```typescript
import { z } from 'zod';

const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.number().positive(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  status: z.enum(['pending', 'paid', 'shipped', 'cancelled']),
  total: z.number().nonnegative(),
  createdAt: z.string().datetime(),
});

type Order = z.infer<typeof OrderSchema>;

// Validate at boundary
function parseOrder(data: unknown): Order {
  return OrderSchema.parse(data);
}
```

Key patterns: (a) parse at system boundaries (API, file read, storage), (b) infer types from schemas (don't duplicate), (c) use `.safeParse()` for error handling, (d) transform with `.transform()`, (e) compose schemas with `.merge()`, `.pick()`, `.omit()`. This eliminates the `any` from external data sources.

## TypeScript Monorepo Management

Monorepo with multiple TypeScript packages needs careful config:
- **Turborepo**: task orchestration, caching, parallel execution. Pipeline: `build`, `test`, `lint` per package. Remote caching with Vercel.
- **pnpm workspaces**: fast, disk-efficient, strict dependency isolation. Config in `pnpm-workspace.yaml`.
- **Project references (tsc)**: each package has a `tsconfig.json` with `composite: true` and `references`. Build with `tsc --build` for incremental compilation.
- **Shared config**: `@repo/typescript-config` package with base tsconfigs extended by all packages.

Package exports: each package defines `"exports"` map for public API, keeps internal code private. Use `"types"` export condition for DTS files. Scripts: `turbo run build --filter=@repo/api` for targeted builds.

## Next.js App Router Patterns

Server Components by default, Client Components when you need interactivity. Data fetching: `async function Page()` directly fetches in Server Component — no `useEffect`, no `useSWR`, no loading states needed for initial data. Mutations: Server Actions (`'use server'`) handle form submissions and data mutations without API routes. Caching: `fetch()` is cached by default, use `cache: 'no-store'` or `next: { revalidate: 60 }` for dynamic data. Loading/error: `loading.tsx` and `error.tsx` files at each route segment. Layouts: `layout.tsx` persists across navigations (doesn't remount). Route groups: `(marketing)` and `(dashboard)` groups have separate layouts.

Client Component optimization: (a) push state management down, (b) use `useMemo`/`useCallback` sparingly (Server Components make these often unnecessary), (c) bundle size — use `next/dynamic` for heavy client components. Forms: Server Actions with `useActionState` (React 19) for progressive enhancement.

### Testing Framework Comparison

| Feature | Vitest | Jest | Bun:test | Mocha |
|---------|--------|------|----------|-------|
| Speed | Fast (esbuild transform) | Medium | Fastest | Slow |
| TypeScript native | Yes | Via babel/ts-jest | Yes | Yes |
| Type testing | `expectTypeOf` | `expect` with jest-extended | `expectTypeOf` | Third-party |
| Browser testing | Playwright | jsdom/Playwright | Limited | jsdom |
| ESM support | Native | Experimental | Native | Good |
| Watch mode | Built-in, fast | Built-in | Yes | Chokidar |
| Snapshot | Built-in | Built-in | Built-in | Third-party |

Recommendation: Vitest for all TypeScript projects — fastest, native TS, compatible with Jest ecosystem plugins.

### Module Resolution Decision Tree
```
How are modules resolved?
├── Node.js app, modern → moduleResolution: "NodeNext"
│   Requires explicit .js/.mjs extensions in imports: `import "./utils.js"`
├── Bundler (esbuild, Vite, tsup) → moduleResolution: "bundler"
│   No extensions needed in imports, fastest resolution
│   Must set `allowImportingTsExtensions: true` for direct TS imports
├── Library for Node.js consumers → Dual: "NodeNext" for ESM, "node16" for CJS
│   Test both paths in CI
└── Deno / Bun → "NodeNext" + `--experimental-specifier-resolution=node` or native
```

### Type Safety at System Boundaries
```
External data entering the TypeScript system?
├── API response (JSON.parse / fetch) → Zod schema at fetch call site
│   const schema = z.object({...});
│   const data = schema.parse(response);  // throws if invalid
├── localStorage / AsyncStorage → Zod parse on read, toJSON on write
│   Storage is unstructured — validate every read
├── URL query params (searchParams) → Zod schema per route
│   Query params are strings — coerce to correct type
├── Form data (user input) → Zod schema at submit handler
│   Validate on submit, display field-level errors
└── WebSocket / Server-Sent Events → Zod discrimated union
    Parse each message type, dispatch to typed handlers
```

### State Management Decision Tree
```
Type of application state?
├── Server data (API results, entity cache) → TanStack Query / RTK Query
│   Automatic cache invalidation, refetch, optimistic updates
│   Type-safe via Zod → QueryResult<Order[]>
├── Client state (UI state, form, modals) → Zustand / Jotai
│   Minimal boilerplate, TypeScript native
│   Zustand: single store with selectors, Jotai: atomic signals
├── URL state (route params, query strings) → React Router / Next.js navigation
│   Source of truth in URL — persist/resume state via navigation
├── Form state → React Hook Form + Zod resolver
│   Type-safe form validation, dirty tracking, error mapping
└── Global shared state → Context API (small apps) or Zustand
    Context triggers re-render on all consumers. Zustand only re-renders on selected slices.
```

### Anti-Patterns & Patterns (Expanded)

- **`as` casting API responses**: `response.data as Order` assumes valid data at compile time — runtime may differ. Use Zod `.parse()`.
- **`// @ts-expect-error` without comment**: Future maintainers won't know why the error is suppressed. Always add a reason.
- **`namespace`**: Legacy TypeScript pre-ESM feature. Use ES modules (`import`/`export`) for all code organization.
- **Mixing `default` and named exports**: Causes import confusion. Stick to named exports exclusively for better tree-shaking.
- **Large barrel files (`index.ts`)**: Re-exporting everything creates circular import risks and slows down type checking.
- **`enum` with computed values**: Loses type safety. Define with string literals: `type Status = "active" | "inactive"`.
- **`typeof` checks on runtime values**: TypeScript types are erased. Use Zod `.safeParse()` or user-defined type guards.
- **Ignoring `strictNullChecks`**: The single most impactful setting. Without it, `null` and `undefined` pass through silently.
- **`as any` escape hatch**: Propagates silently through your type system. Use `satisfies` or `@ts-expect-error` with intent.
- **Not using `declarationMap`**: Consumers of your library can't "Go to Definition" into source. Always include `.d.ts.map`.

### Performance Optimization (Expanded)

- **Bundle size**: Use `tsup` for tree-shaking — `tsup --treeshake` removes unused exports. Analyze with `bundle-buddy` or `analyze`.
- **Type checking speed**: Use `tsc --noEmit` exclusively for type checking (not for compilation). `--incremental` caches `.tsbuildinfo`.
- **`skipLibCheck: true`**: Library type resolution takes 60%+ of total type checking time. Keep enabled for app projects.
- **`isolatedModules: true`**: Required for esbuild/Vite transpilation. Ensures each file is independently transformable.
- **`verbatimModuleSyntax`** (TS 5.0+): Prevents type-only imports without `type` prefix — ensures they're elided at runtime.
- **`noEmit: true` + `tsc --noEmit`**: Use `tsc` only for type checking, let bundler handle emit. Faster than `tsc` for both.
- **`const` assertions**: `"hello" as const` gives literal type `"hello"` (not `string`). Use for discriminant values, config objects.
- **`declare` for ambient types**: Declare module augmentations, global types, `declare module "*.module.css"`. Reduces type-checking load.

### Code Examples — Type-Safe Event Bus
```typescript
type EventMap = {
  "order:created": { orderId: string; total: number };
  "user:login": { userId: string; method: "email" | "oauth" };
  "payment:failed": { orderId: string; reason: string; code: number };
};

class TypedEventBus {
  private handlers = new Map<string, Set<Function>>();

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void) {
    if (!this.handlers.has(event as string)) {
      this.handlers.set(event as string, new Set());
    }
    this.handlers.get(event as string)!.add(handler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    this.handlers.get(event as string)?.forEach(h => h(data));
  }

  off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void) {
    this.handlers.get(event as string)?.delete(handler);
  }
}
```

## Hono for Lightweight APIs

Hono is a TypeScript-first web framework for Cloudflare Workers, Deno, Bun, and Node.js. Benefits: ultralight (14KB), fast, native TypeScript with typed routes. Pattern:
```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono<{ Bindings: Env }>();

const OrderSchema = z.object({
  customerId: z.number(),
  items: z.array(z.object({ productId: z.string(), qty: z.number() })),
});

app.post('/api/orders', zValidator('json', OrderSchema), async (c) => {
  const data = c.req.valid('json');
  const order = await createOrder(data);
  return c.json(order, 201);
});
```

Use for: serverless APIs, edge functions, middleware chains, WebSocket servers. Hono middleware: auth, CORS, rate limiting, JWT validation — all available as npm packages.

## Code Examples — Generic Repository Pattern
```typescript
// Type-safe repository with CRUD operations
interface Entity {
  id: string;
}

class Repository<T extends Entity> {
  constructor(
    private db: Database,
    private table: string,
    private schema: z.ZodType<T>,
  ) {}

  async findById(id: string): Promise<T | null> {
    const result = await this.db.query(
      `SELECT * FROM ${this.table} WHERE id = $1`, [id]
    );
    if (!result) return null;
    return this.schema.parse(result);
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const id = crypto.randomUUID();
    const entity = { ...data, id } as T;
    await this.db.insert(this.table, entity);
    return entity;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError(this.table, id);
    const updated = this.schema.parse({ ...existing, ...data, id });
    await this.db.update(this.table, updated);
    return updated;
  }
}

// Usage
const userRepo = new Repository(db, 'users', UserSchema);
const orderRepo = new Repository(db, 'orders', OrderSchema);
```

## References
- `references/module-resolution.md` — Module resolution strategies, ESM/CJS
- `references/advanced-types-decorators.md` — Conditional types, template literals, mapped types, decorators
- `references/typescript-fundamentals.md` — TypeScript Fundamentals
- `references/typescript-advanced.md` — Advanced TypeScript Patterns
- `references/typescript-zod.md` — Zod Runtime Validation Guide

## Handoff
- `mobile/react-native` — React Native TypeScript patterns
- `mobile/universal/testing` — Vitest/Jest, type testing
- `mobile/universal/networking` — Type-safe API clients
- `mobile/universal/patterns` — TypeScript patterns in mobile apps
