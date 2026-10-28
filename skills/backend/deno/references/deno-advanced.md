# Advanced Deno: Workspaces, Concurrency, Native Interop, Observability and Production Patterns

Advanced capabilities of Deno 2.x for production services: monorepo workspaces, Web Workers and multi-core serving, FFI and Node-API addons, Deno KV queues, built-in OpenTelemetry, permission hardening, single-binary distribution and performance techniques. Deployment platforms are covered in `deno-deployment.md`.

## Workspaces (Monorepos)

```jsonc
// deno.json (root)
{
  "workspace": ["./packages/core", "./packages/api", "./apps/worker"],
  "imports": { "@std/assert": "jsr:@std/assert@^1" }
}
```
```jsonc
// packages/core/deno.json
{
  "name": "@acme/core",
  "version": "1.4.0",
  "exports": { ".": "./mod.ts", "./money": "./money.ts" }
}
```
- Members import each other by name (`import { Money } from "@acme/core/money"`) without publishing.
- Workspaces can mix Deno members and npm `package.json` members.
- `deno publish` from a member publishes to JSR; versions are per member.
- Run tasks across members: `deno task --recursive test` (check your Deno version supports `--recursive`/`--filter`).

## Multi-Core Serving

JavaScript runs on one thread per isolate. Options to use more cores:

| Option | How |
|---|---|
| `deno serve --parallel` | Starts one isolate per core (or `DENO_JOBS` count) sharing the port; for stateless handlers exported via `export default { fetch }` |
| Web Workers | Offload CPU work from the request thread |
| Multiple processes behind a load balancer | Containers/replicas; typical in Kubernetes |

```ts
// main.ts for `deno serve --parallel --port 8000 main.ts`
export default {
  fetch(req: Request): Response {
    return Response.json({ path: new URL(req.url).pathname });
  },
} satisfies Deno.ServeDefaultExport;
```

### Web Workers for CPU-bound tasks
```ts
// main.ts
const worker = new Worker(new URL("./hash_worker.ts", import.meta.url).href, { type: "module" });

function hashInWorker(data: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const onMessage = (e: MessageEvent<{ id: string; digest: string }>) => {
      if (e.data.id !== id) return;
      worker.removeEventListener("message", onMessage);
      resolve(e.data.digest);
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", reject, { once: true });
    worker.postMessage({ id, data }, [data.buffer]);   // transfer, do not copy
  });
}
```
```ts
// hash_worker.ts
self.onmessage = async (e: MessageEvent<{ id: string; data: Uint8Array }>) => {
  const buf = await crypto.subtle.digest("SHA-256", e.data.data);
  const digest = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  self.postMessage({ id: e.data.id, digest });
};
```
Workers inherit permissions by default; restrict with the `deno: { permissions: {...} }` worker option where supported.

## Native Interop

### FFI
```ts
const lib = Deno.dlopen("./libfast.so", {
  add: { parameters: ["i32", "i32"], result: "i32" },
  checksum: { parameters: ["buffer", "usize"], result: "u32", nonblocking: true },
} as const);

const sum = lib.symbols.add(2, 3);
const crc = await lib.symbols.checksum(new Uint8Array([1, 2, 3]), 3n);
lib.close();
```
Requires `--allow-ffi` (scope it to the library path). FFI bypasses the permission sandbox for anything the native code does, so treat it as full trust.

### Node-API addons
npm packages with Node-API native addons generally work (e.g. database drivers) when `node_modules` is present; they also require `--allow-ffi`.

## Deno KV and Queues

```ts
const kv = await Deno.openKv();              // local SQLite file, or Deno Deploy managed KV

await kv.atomic()
  .check({ key: ["order", orderId], versionstamp: null })   // only if absent
  .set(["order", orderId], { status: "pending", total: 4200 })
  .enqueue({ type: "send-confirmation", orderId }, { delay: 0 })
  .commit();

kv.listenQueue(async (msg: { type: string; orderId: string }) => {
  if (msg.type === "send-confirmation") await sendConfirmation(msg.orderId);   // must be idempotent
});
```
- Atomic operations give optimistic concurrency via `versionstamp` checks.
- Queue delivery is at-least-once; handlers must be idempotent.
- KV is marked unstable in the CLI for local use (`--unstable-kv`); check current status for your version.

## Observability

Deno includes built-in OpenTelemetry support (introduced in Deno 2.2): when enabled, it exports traces for `Deno.serve` and `fetch`, `console` logs, and runtime metrics via OTLP.
```bash
OTEL_DENO=true OTEL_SERVICE_NAME=orders-api \
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
deno run --allow-net --allow-env main.ts
```
Early 2.x versions also needed `--unstable-otel`; check the docs for your version. Custom spans use the standard `@opentelemetry/api` package.

Structured logs: write JSON to stdout with request IDs; propagate `traceparent` headers on outbound `fetch`.

## Permission Hardening

```bash
deno run \
  --allow-net=0.0.0.0:8000,api.stripe.com:443,db.internal:5432 \
  --allow-env=PORT,DATABASE_URL,STRIPE_KEY \
  --allow-read=./static,./config \
  --deny-write \
  main.ts
```
- Scope every permission to hosts, paths and variable names.
- Use `--deny-*` flags to forbid categories explicitly.
- Permissions can be declared in `deno.json` permission sets in newer Deno versions; otherwise keep them in tasks.
- Avoid `--allow-run` and `--allow-ffi` in network-facing services unless required.
- Programmatic checks: `await Deno.permissions.query({ name: "net", host: "api.stripe.com" })`.

## Single-Binary Distribution

```bash
deno compile --allow-net=0.0.0.0:8000 --allow-env=PORT \
  --include ./static --target x86_64-unknown-linux-gnu -o dist/orders-api main.ts
```
- Permissions given at compile time are baked into the binary.
- Cross-compile targets: Linux x64/arm64, macOS x64/arm64, Windows x64.
- `--include` embeds extra files/dirs readable at runtime.

## Performance Techniques
| Technique | Notes |
|---|---|
| Stream request/response bodies | Use `ReadableStream`, `Response(body.pipeThrough(...))` instead of buffering |
| Reuse connections | Keep DB pools and `fetch` clients long-lived |
| Avoid sync FS APIs in handlers | Use async variants |
| `deno bench` for hot paths | Compare implementations with `Deno.bench` groups and baselines |
| Profiling | `--inspect` + Chrome DevTools, `--cpu-prof` where available |
| V8 flags | `--v8-flags=--max-old-space-size=2048` for memory-heavy jobs |

```ts
Deno.bench({ name: "JSON.parse 10KB", group: "parse", baseline: true }, () => { JSON.parse(payload); });
Deno.bench({ name: "custom parser", group: "parse" }, () => { parse(payload); });
```

## Graceful Shutdown
```ts
const ac = new AbortController();
const server = Deno.serve({ port: 8000, signal: ac.signal }, handler);
Deno.addSignalListener("SIGTERM", () => ac.abort());
await server.finished;
await db.close();
```
In newer versions `server.shutdown()` waits for in-flight requests.

## Checklist
- [ ] Workspace members with explicit `exports` and versioned publishing
- [ ] CPU work offloaded to workers or parallel isolates
- [ ] FFI/`--allow-run` absent from network services unless justified
- [ ] KV queue handlers idempotent; atomic checks for concurrency
- [ ] OpenTelemetry export enabled and trace context propagated
- [ ] Permissions scoped per host/path/env; compiled binaries built with minimal permissions
- [ ] Graceful shutdown on SIGTERM
