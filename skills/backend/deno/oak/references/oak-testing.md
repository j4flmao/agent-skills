# Oak Testing

Testing Oak (`jsr:@oak/oak`) applications with `Deno.test`, `@std/assert`, `@std/expect`, and Oak's built-in `testing` helpers. Three levels: middleware unit tests with mock contexts, in-process request tests through `app.handle()`, and a few end-to-end tests against a real listener.

## deno.json

```json
{
  "imports": {
    "@oak/oak": "jsr:@oak/oak@^17",
    "@std/assert": "jsr:@std/assert@^1",
    "@std/expect": "jsr:@std/expect@^1",
    "@std/testing": "jsr:@std/testing@^1",
    "@std/dotenv": "jsr:@std/dotenv@^0.225"
  },
  "tasks": {
    "test": "deno test --allow-env --allow-read=. --allow-net=127.0.0.1",
    "test:cov": "deno test --allow-env --allow-read=. --allow-net=127.0.0.1 --coverage=cov && deno coverage cov"
  }
}
```
Pin versions you have verified; the old `deno.land/std/testing/asserts.ts` path is superseded by `@std/assert` on JSR.

## App Factory with Injected Dependencies

Build the app from a function so tests can pass fakes instead of real repositories.

```typescript
// src/app.ts
import { Application, Router } from "@oak/oak";
import { errorMiddleware } from "./middleware/error.ts";
import { authMiddleware } from "./middleware/auth.ts";
import type { OrderRepository } from "./orders/repository.ts";

export interface Deps { orders: OrderRepository; verifyToken(token: string): Promise<string | null> }

export function createApp(deps: Deps): Application {
  const router = new Router({ prefix: "/api" });
  router.get("/orders", async (ctx) => { ctx.response.body = { data: await deps.orders.findAll() }; });
  router.post("/orders", async (ctx) => {
    const body = await ctx.request.body.json();
    if (!body?.customerId || !Array.isArray(body.items) || body.items.length === 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: { code: "VALIDATION" } };
      return;
    }
    ctx.response.status = 201;
    ctx.response.body = await deps.orders.save(body);
  });

  const app = new Application();
  app.use(errorMiddleware);
  app.use(authMiddleware(deps.verifyToken));
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app;
}
```

## In-Memory Fake Repository

```typescript
// tests/fakes.ts
import type { Order, OrderRepository } from "../src/orders/repository.ts";

export class InMemoryOrderRepository implements OrderRepository {
  #orders = new Map<string, Order>();
  findAll() { return Promise.resolve([...this.#orders.values()]); }
  findById(id: string) { return Promise.resolve(this.#orders.get(id) ?? null); }
  save(input: Omit<Order, "id" | "status">) {
    const order: Order = { ...input, id: crypto.randomUUID(), status: "PENDING" };
    this.#orders.set(order.id, order);
    return Promise.resolve(order);
  }
}

export const fakeVerify = (token: string) => Promise.resolve(token === "valid-token" ? "user-1" : null);
```

## In-Process Request Tests with app.handle()

`app.handle(request)` runs the full middleware stack and returns a `Response` without opening a socket: fast, no port allocation, no `--allow-net` needed.

```typescript
// tests/orders_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { createApp } from "../src/app.ts";
import { fakeVerify, InMemoryOrderRepository } from "./fakes.ts";

function setup() {
  const app = createApp({ orders: new InMemoryOrderRepository(), verifyToken: fakeVerify });
  const call = async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (!headers.has("authorization")) headers.set("authorization", "Bearer valid-token");
    const res = await app.handle(new Request(`http://localhost${path}`, { ...init, headers }));
    if (!res) throw new Error(`No response for ${path}`);
    return res;
  };
  return { call };
}

Deno.test("POST /api/orders creates an order", async () => {
  // Arrange
  const { call } = setup();
  const payload = { customerId: "cust-123", items: [{ sku: "PROD-1", quantity: 2 }] };

  // Act
  const res = await call("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Assert
  assertEquals(res.status, 201);
  const body = await res.json();
  assertExists(body.id);
  assertEquals(body.status, "PENDING");
});

Deno.test("POST /api/orders rejects empty items", async () => {
  const { call } = setup();
  const res = await call("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerId: "cust-123", items: [] }),
  });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error.code, "VALIDATION");
});

Deno.test("auth: missing and invalid tokens return 401", async (t) => {
  const { call } = setup();
  for (const auth of ["", "Bearer invalid-token"]) {
    await t.step(`authorization="${auth}"`, async () => {
      const res = await call("/api/orders", { headers: { authorization: auth } });
      assertEquals(res.status, 401);
      await res.body?.cancel(); // always consume or cancel bodies to avoid leak errors
    });
  }
});

Deno.test("unknown route returns the standard error envelope", async () => {
  const res = await setup().call("/does-not-exist");
  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(body.success, false);
  assertEquals(body.error.code, "NOT_FOUND");
});
```

## Middleware Unit Tests with Mock Context

```typescript
// tests/error_middleware_test.ts
import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { errorMiddleware } from "../src/middleware/error.ts";

Deno.test("errorMiddleware maps thrown HttpError to JSON", async () => {
  const ctx = testing.createMockContext({ path: "/api/orders/x" });
  const next = () => Promise.reject(Object.assign(new Error("not found"), { status: 404 }));

  await errorMiddleware(ctx, next);

  assertEquals(ctx.response.status, 404);
  assertEquals((ctx.response.body as { success: boolean }).success, false);
});

Deno.test("errorMiddleware passes through on success", async () => {
  const ctx = testing.createMockContext();
  await errorMiddleware(ctx, testing.createMockNext());
  assertEquals(ctx.response.status, 404); // Oak default when nothing set a body
});
```

## Spies and Stubs

```typescript
import { assertSpyCalls, spy } from "@std/testing/mock";
import { FakeTime } from "@std/testing/time";

Deno.test("verifyToken is called once per request", async () => {
  const verify = spy((_t: string) => Promise.resolve("user-1"));
  const app = createApp({ orders: new InMemoryOrderRepository(), verifyToken: verify });
  const res = await app.handle(new Request("http://localhost/api/orders", {
    headers: { authorization: "Bearer x" },
  }));
  await res?.body?.cancel();
  assertSpyCalls(verify, 1);
});

Deno.test("token expiry uses fake clock", () => {
  using time = new FakeTime(new Date("2026-01-01T00:00:00Z"));
  time.tick(3_600_000);
  // assert expiry logic against Date.now()
});
```

## End-to-End Against a Real Listener

Use sparingly (TLS, streaming, SSE, WebSocket). Wait for the `listen` event to learn the port, and abort to stop.

```typescript
Deno.test("e2e: server answers over TCP", async () => {
  const app = createApp({ orders: new InMemoryOrderRepository(), verifyToken: fakeVerify });
  const controller = new AbortController();
  const listening = new Promise<number>((resolve) =>
    app.addEventListener("listen", (e) => resolve(e.port), { once: true })
  );
  const done = app.listen({ hostname: "127.0.0.1", port: 0, signal: controller.signal });
  const port = await listening;

  const res = await fetch(`http://127.0.0.1:${port}/api/orders`, {
    headers: { authorization: "Bearer valid-token" },
  });
  assertEquals(res.status, 200);
  await res.body?.cancel();

  controller.abort();
  await done;
});
```

## Test Environment

```typescript
// tests/env.ts — import first in tests that read env
import { load } from "@std/dotenv";
await load({ envPath: ".env.test", export: true });
```
Never point tests at production credentials; keep `.env.test` values fake.

## Running

```bash
deno task test
deno test --filter "auth"          # by name
deno test --watch
deno test --parallel               # files run in parallel workers
deno task test:cov                 # coverage report (also: deno coverage cov --lcov > cov.lcov)
```

## Pitfalls
- `app.listen()` returns a promise that resolves when the server closes, not a listener object; use the `listen` event and an `AbortSignal`.
- Unconsumed response bodies trigger Deno's resource sanitizer failures.
- Real timers/intervals left running fail the op sanitizer; use `FakeTime` or clear them.
- Shared module-level state between tests makes order matter; build a fresh app per test.

## Checklist
- [ ] App built via factory with injectable dependencies
- [ ] Most tests use `app.handle()`; few use real sockets
- [ ] Error envelope, validation and auth paths covered
- [ ] Bodies consumed or cancelled
- [ ] Minimal `--allow-*` permissions in the test task
