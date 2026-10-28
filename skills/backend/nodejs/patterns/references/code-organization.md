# Node.js Code Organization

How to structure a Node.js (TypeScript or JavaScript) backend so it stays navigable as it grows: feature-based modules, layering, module system choices (ESM), `package.json` `exports`/`imports`, configuration, composition root, and monorepo layout. Framework specifics are in `express-patterns.md`; DI in `nodejs-di.md`; error handling in `nodejs-error-handling.md`.

## Feature (Module) Structure over Technical Layers

```
src/
├── modules/
│   ├── orders/
│   │   ├── orders.routes.ts        # HTTP adapter (Express/Fastify/Hono)
│   │   ├── orders.service.ts       # use cases / business logic
│   │   ├── orders.repository.ts    # data access (Prisma/Drizzle/Kysely/SQL)
│   │   ├── orders.schemas.ts       # request/response validation (Zod, TypeBox)
│   │   ├── orders.types.ts
│   │   ├── orders.service.test.ts  # co-located unit tests
│   │   └── index.ts                # public API of the module
│   └── customers/
├── shared/
│   ├── errors.ts                   # AppError hierarchy
│   ├── logger.ts                   # pino instance
│   └── db.ts                       # connection pool
├── config.ts                       # validated configuration
├── app.ts                          # builds the app (no listen) - testable
└── server.ts                       # entry point: listen, signals, shutdown
```

- A folder per feature keeps related changes together; `controllers/ services/ models/` at the top level scatters every feature.
- Each module exports a small public API through `index.ts`; other modules import only from there, never from internal files.
- Keep `app.ts` (construct and wire the app) separate from `server.ts` (bind port, handle signals) so tests can create the app without listening.

## Layer Responsibilities

| Layer | Does | Must not |
|-------|------|----------|
| Routes / controllers | Parse and validate input, call service, map result to HTTP | Contain business rules or SQL |
| Services | Business rules, orchestration, transactions | Know about `req`/`res` |
| Repositories | Queries, mapping rows to domain objects | Make business decisions |
| Shared | Cross-cutting utilities (logging, errors, config) | Depend on feature modules |

```ts
// orders.routes.ts (Fastify example)
import type { FastifyInstance } from 'fastify';
import { createOrderBody } from './orders.schemas.js';
import type { OrdersService } from './orders.service.js';

export function ordersRoutes(app: FastifyInstance, service: OrdersService) {
  app.post('/orders', async (req, reply) => {
    const input = createOrderBody.parse(req.body);
    const order = await service.create(input);
    return reply.code(201).send(order);
  });
}
```

```ts
// orders.service.ts
export class OrdersService {
  constructor(private readonly repo: OrdersRepository, private readonly payments: PaymentsClient) {}

  async create(input: CreateOrderInput): Promise<Order> {
    if (input.items.length === 0) throw new ValidationError('Order must contain at least one item');
    const order = await this.repo.insert(input);
    await this.payments.authorize(order.id, order.totalCents);
    return order;
  }
}
```

## Composition Root

Wire dependencies in one place instead of importing singletons everywhere:

```ts
// app.ts
import Fastify from 'fastify';
import { createPool } from './shared/db.js';
import { OrdersRepository, OrdersService, ordersRoutes } from './modules/orders/index.js';
import type { Config } from './config.js';

export function buildApp(config: Config) {
  const app = Fastify({ logger: { level: config.logLevel } });
  const db = createPool(config.databaseUrl);
  const orders = new OrdersService(new OrdersRepository(db), new PaymentsClient(config.paymentsUrl));
  ordersRoutes(app, orders);
  app.addHook('onClose', async () => db.end());
  return app;
}
```

Tests call `buildApp(testConfig)` with fakes or a test database. Use a DI container (Awilix, tsyringe, NestJS) only when manual wiring becomes unwieldy.

## Module System: ESM

- New projects: `"type": "module"` in `package.json`; use `import`/`export`.
- With TypeScript, set `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`; relative imports need explicit extensions (`./orders.service.js` even in `.ts` source).
- `require()` of synchronous ES modules is supported in current Node LTS releases, easing interop with CommonJS consumers, but avoid mixing systems inside one package.

## Internal Import Aliases with `imports`

Avoid `../../../shared/logger.js` chains using Node's native subpath imports:

```json
{
  "name": "orders-api",
  "type": "module",
  "imports": {
    "#shared/*": "./dist/shared/*",
    "#modules/*": "./dist/modules/*"
  }
}
```

TypeScript (`NodeNext`) resolves `#` imports from `package.json`; for source-time resolution with conditions, map to `./src/*` under a development condition or use TS `paths` consistently with your build tool. Native `imports` work at runtime without extra loaders.

## Library Packages: `exports`

```json
{
  "name": "@acme/money",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./testing": { "types": "./dist/testing.d.ts", "default": "./dist/testing.js" }
  },
  "files": ["dist"]
}
```

`exports` defines the public surface; deep imports into internal files are blocked.

## Configuration

```ts
// config.ts
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = { port: number; databaseUrl: string; logLevel: string; env: string };

export function loadConfig(env = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`);
  }
  const c = parsed.data;
  return { port: c.PORT, databaseUrl: c.DATABASE_URL, logLevel: c.LOG_LEVEL, env: c.NODE_ENV };
}
```

- Read `process.env` only in `config.ts`; pass typed config down.
- Fail fast at startup on invalid config.
- Local development: `node --env-file=.env` (Node 20.6+) instead of extra dotenv dependencies; never commit `.env` with secrets.

## Entry Point and Shutdown

```ts
// server.ts
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = buildApp(config);
await app.listen({ port: config.port, host: '0.0.0.0' });

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, 'shutting down');
    await app.close();             // stops accepting connections, runs onClose hooks
    process.exit(0);
  });
}
```

## Monorepo Layout

```
apps/
  orders-api/
  web/
packages/
  money/           # shared domain library
  eslint-config/
  tsconfig/
package.json       # workspaces: ["apps/*", "packages/*"]
```

- npm/pnpm/yarn workspaces; pnpm is common for strict dependency isolation.
- Task orchestration and caching with Turborepo or Nx.
- TypeScript project references (`composite: true`) for incremental builds across packages.

## Tooling Conventions

| Concern | Choice |
|---------|--------|
| Lint | ESLint flat config (`eslint.config.js`) with typescript-eslint |
| Format | Prettier or Biome |
| Tests | Vitest or `node:test`; co-locate `*.test.ts` |
| Type checking | `tsc --noEmit` in CI |
| Running TS | Build with `tsc`/`tsup`, or run via `tsx`; recent Node versions can strip erasable TypeScript types natively |
| Boundaries | `eslint-plugin-boundaries` or dependency-cruiser to enforce module import rules |

```js
// .dependency-cruiser.cjs (excerpt): forbid importing module internals
module.exports = {
  forbidden: [{
    name: 'no-deep-module-imports',
    from: { path: '^src/modules/([^/]+)/' },
    to: { path: '^src/modules/(?!$1)[^/]+/(?!index\\.ts$)' },
    severity: 'error',
  }],
};
```

## Pitfalls

- `utils/` and `helpers/` folders that become dumping grounds.
- Importing `process.env` throughout the codebase.
- Circular imports between modules (often surfaced as `undefined` at runtime in ESM/CJS); enforce boundaries.
- Business logic inside route handlers, making it untestable without HTTP.
- Global singletons (DB clients created at import time) that make tests share state.

## Checklist

- [ ] Feature modules with an explicit public `index.ts`
- [ ] Routes thin; services hold business logic; repositories hold data access
- [ ] `app.ts` / `server.ts` split with graceful shutdown
- [ ] ESM with NodeNext resolution; subpath `imports` instead of deep relative paths
- [ ] Typed, validated configuration loaded once
- [ ] Import boundaries enforced by lint rules
