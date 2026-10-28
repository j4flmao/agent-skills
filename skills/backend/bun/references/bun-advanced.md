# Bun Advanced: Routing, WebSockets, Built-in Clients, Workers, FFI and Bundling

Advanced Bun runtime features for production services: declarative routes in `Bun.serve`, WebSocket pub/sub, built-in PostgreSQL, S3 and Redis clients, workers, the foreign function interface, macros and bundler plugins, and single-file executables. Features were added across Bun 1.1 to 1.3; check the version you run (`bun --version`) against the docs for each API.

## Bun.serve Routes

Since Bun 1.2.3, `Bun.serve` accepts a `routes` object with path parameters, per-method handlers and static responses.

```ts
const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  idleTimeout: 30,                          // seconds; default 10
  routes: {
    "/health": new Response("ok"),          // static response, served without calling JS
    "/api/users/:id": async (req) => {
      const user = await findUser(req.params.id);
      return user ? Response.json(user) : new Response("Not found", { status: 404 });
    },
    "/api/posts": {
      GET: () => Response.json(listPosts()),
      POST: async (req) => {
        const body = await req.json();
        return Response.json(await createPost(body), { status: 201 });
      },
    },
    "/api/*": Response.json({ error: "Not found" }, { status: 404 }),
  },
  fetch(req) {                              // fallback for unmatched requests
    return new Response("Not found", { status: 404 });
  },
  error(err) {
    console.error("Unhandled error", err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Listening on ${server.url}`);
```

- Route precedence: exact paths, then parameterized, then wildcards.
- `server.reload({ routes })` swaps handlers without restarting.
- HTML imports (`import page from "./index.html"` used as a route value) let Bun bundle and serve frontend assets in full-stack apps.
- Frameworks (Hono, Elysia) remain useful for middleware, validation and OpenAPI generation.

## WebSockets with Pub/Sub

```ts
type SocketData = { userId: string; room: string };

Bun.serve<SocketData, {}>({
  fetch(req, server) {
    const url = new URL(req.url);
    const userId = authenticate(req);                   // validate token/cookie before upgrading
    if (!userId) return new Response("Unauthorized", { status: 401 });
    const ok = server.upgrade(req, { data: { userId, room: url.searchParams.get("room") ?? "lobby" } });
    return ok ? undefined : new Response("Upgrade failed", { status: 400 });
  },
  websocket: {
    maxPayloadLength: 64 * 1024,
    idleTimeout: 120,
    open(ws) {
      ws.subscribe(ws.data.room);
    },
    message(ws, message) {
      ws.publish(ws.data.room, JSON.stringify({ from: ws.data.userId, text: String(message) }));
    },
    close(ws) {
      ws.unsubscribe(ws.data.room);
    },
  },
});
```

`publish` fans out within one process. With multiple instances, bridge topics through Redis pub/sub or a message broker. Watch `ws.send` return values for backpressure (`-1` means queued due to backpressure, `0` means dropped).

## Built-in SQL Client

```ts
import { sql, SQL } from "bun";

// Uses DATABASE_URL / POSTGRES_URL from the environment by default
const users = await sql`SELECT id, email FROM users WHERE active = ${true} LIMIT ${50}`;

const db = new SQL({ url: Bun.env.DATABASE_URL!, max: 20, idleTimeout: 30 });

await db.begin(async (tx) => {
  const [order] = await tx`INSERT INTO orders (user_id, total) VALUES (${userId}, ${total}) RETURNING id`;
  await tx`INSERT INTO order_items ${tx(items.map((i) => ({ ...i, order_id: order.id })))}`;
});
```

- Tagged template values are sent as parameters, not concatenated, so they are safe from SQL injection. Never build query text with string concatenation; use `sql.unsafe` only for trusted, static fragments.
- PostgreSQL support arrived in Bun 1.2; MySQL and SQLite adapters behind the same API arrived later. ORMs (Drizzle, Prisma, Kysely) also run on Bun.

## Built-in S3 Client

```ts
import { s3, S3Client } from "bun";

// Default client reads S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_BUCKET / S3_REGION / S3_ENDPOINT
// (AWS_* equivalents are also recognized); prefer instance/workload credentials where supported.
const report = s3.file("reports/2026-10.json");
await report.write(JSON.stringify(data), { type: "application/json" });
const text = await report.text();

const url = report.presign({ expiresIn: 900, method: "GET" });   // 15-minute download link

const r2 = new S3Client({
  bucket: "assets",
  endpoint: "https://<account-id>.r2.cloudflarestorage.com",
  accessKeyId: Bun.env.R2_ACCESS_KEY_ID,
  secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY,
});
```

Works with S3-compatible stores (Cloudflare R2, MinIO, Google Cloud Storage interoperability, DigitalOcean Spaces). Large uploads are streamed with multipart automatically through `file.writer()`.

## Built-in Redis Client

```ts
import { redis, RedisClient } from "bun";

await redis.set("session:abc", JSON.stringify(session), "EX", 3600);
const raw = await redis.get("session:abc");

const cache = new RedisClient(Bun.env.REDIS_URL);
```

Available since Bun 1.2.9; supports common commands, pipelining, and pub/sub on dedicated connections. Use `ioredis` or `node-redis` if you need cluster or sentinel features not yet covered.

## Workers

```ts
// main.ts
const worker = new Worker(new URL("./hash-worker.ts", import.meta.url).href);
worker.postMessage({ password: "example" });
worker.onmessage = (e) => console.log("hash", e.data);

// hash-worker.ts
declare var self: Worker;
self.onmessage = async (e: MessageEvent<{ password: string }>) => {
  const hash = await Bun.password.hash(e.data.password);   // argon2id by default
  postMessage(hash);
};
```

Use workers for CPU-bound work so the event loop keeps serving requests. `node:worker_threads` is also supported. For many short tasks, keep a pool of workers rather than spawning per request.

## Foreign Function Interface (bun:ffi)

```ts
import { dlopen, FFIType, suffix } from "bun:ffi";

const lib = dlopen(`./libmath.${suffix}`, {
  add: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
});

console.log(lib.symbols.add(2, 3));
lib.close();
```

`bun:ffi` calls C ABI functions directly (Rust, Zig, C, C++ with `extern "C"`). Bun documents it as experimental; memory safety is your responsibility, and N-API addons are the more stable option for distributed packages.

## Bundler, Plugins and Macros

```ts
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun",              // "browser" | "bun" | "node"
  format: "esm",
  minify: true,
  sourcemap: "linked",
  splitting: true,
  external: ["pg-native"],
  plugins: [yamlPlugin],
});
```

```ts
import type { BunPlugin } from "bun";

export const yamlPlugin: BunPlugin = {
  name: "yaml",
  setup(build) {
    build.onLoad({ filter: /\.ya?ml$/ }, async (args) => {
      const { parse } = await import("yaml");
      const data = parse(await Bun.file(args.path).text());
      return { contents: `export default ${JSON.stringify(data)};`, loader: "js" };
    });
  },
};
```

Macros run at bundle time and inline their return value:

```ts
import { gitCommit } from "./build-info.ts" with { type: "macro" };
export const VERSION = gitCommit();     // evaluated during bundling, embedded as a string
```

Only use macros from trusted code: they execute during the build.

## Single-File Executables

```bash
bun build ./src/index.ts --compile --minify --sourcemap --bytecode --outfile dist/server
bun build ./src/index.ts --compile --target=bun-linux-x64 --outfile dist/server-linux     # cross-compile
bun build ./src/index.ts --compile --target=bun-linux-arm64-musl --outfile dist/server-alpine-arm64
```

- Embeds the Bun runtime and your bundled code into one binary; `--bytecode` precompiles to reduce startup time.
- Embed assets with `import file from "./public/logo.png" with { type: "file" }`.
- The binary includes the full runtime (tens of MB); size matters for some distribution channels.

## Performance and Debugging

```bash
bun --inspect src/index.ts          # WebKit Inspector protocol; open debug.bun.sh
bun --inspect-brk src/index.ts      # break on first line
bun --smol src/index.ts             # smaller heap, more frequent GC for memory-constrained containers
```

- Measure with real load (`oha`, `bombardier`, k6); micro-benchmarks of hello-world servers say little about your app.
- `Bun.nanoseconds()` and `performance.now()` for timing; `bun:jsc` exposes `heapStats()` for memory inspection.
- Use `Bun.gc(true)` only in diagnostics, never in request paths.

## Checklist

- [ ] Bun version supports each API used (routes 1.2.3+, SQL 1.2+, Redis 1.2.9+)
- [ ] WebSocket upgrades authenticate before `server.upgrade`; cross-instance fan-out via broker
- [ ] SQL only through tagged templates or an ORM; no string-built queries
- [ ] Credentials from environment or workload identity, never in code
- [ ] CPU-bound work moved to workers
- [ ] FFI isolated and covered by tests; macros only from trusted sources
- [ ] Executables built per target platform in CI
