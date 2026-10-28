# Deno 2 Fundamentals: Runtime Model, Project Setup and Node/npm Compatibility

Deno is a JavaScript/TypeScript runtime built on V8 and Rust (Tokio) with secure-by-default permissions, built-in tooling, and web-standard APIs. Deno 2 (October 2024) added broad Node.js and npm compatibility, `package.json` support and workspaces. This reference covers the mental model, project layout, dependency management and the Node interop that most teams need first. Permissions, module resolution details and the standard library are covered in `deno-essentials.md` and `deno-runtime.md`.

## Mental Model

| Aspect | Deno | Node.js |
|---|---|---|
| Language | TypeScript and JavaScript natively (type-stripping + optional type check) | JavaScript; TypeScript via tooling (Node 22.6+/23 can strip types) |
| Security | No file/net/env/subprocess access unless granted | Full access by default (Node has an experimental permission model) |
| APIs | Web standards first: `fetch`, `Request`/`Response`, `URL`, Web Streams, `WebSocket`, Web Crypto | Node core modules, with growing web API support |
| Tooling | Built in: `fmt`, `lint`, `test`, `bench`, `check`, `doc`, `compile`, `task`, `coverage`, `publish` | External tools (Prettier, ESLint, Jest/Vitest, tsc) |
| Packages | JSR (`jsr:`), npm (`npm:`), URLs; `node_modules` optional | npm with `node_modules` |
| Module system | ES modules only | CommonJS and ESM |

## Minimal HTTP Server

```ts
// main.ts
Deno.serve({ port: 8000 }, async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  if (url.pathname === "/health") return new Response("ok");
  if (req.method === "POST" && url.pathname === "/echo") {
    const body = await req.json();
    return Response.json({ received: body });
  }
  return new Response("Not Found", { status: 404 });
});
```
```bash
deno run --allow-net=0.0.0.0:8000 main.ts
# or the declarative form: export default { fetch(req) { ... } } and
deno serve --port 8000 main.ts
```

## Project Setup

```bash
deno init my-service        # creates deno.json, main.ts, main_test.ts
```

```jsonc
// deno.json
{
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-env=DATABASE_URL,PORT main.ts",
    "test": "deno test --allow-net=127.0.0.1",
    "check": "deno fmt --check && deno lint && deno check main.ts"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1",
    "@std/http": "jsr:@std/http@^1",
    "@oak/oak": "jsr:@oak/oak@^17",
    "zod": "npm:zod@^3"
  },
  "compilerOptions": { "strict": true },
  "lint": { "rules": { "tags": ["recommended"] } },
  "fmt": { "lineWidth": 100 },
  "lock": true
}
```
- `imports` is an import map; code imports bare names (`import { z } from "zod"`).
- `deno.lock` pins exact versions and integrity hashes; commit it and use `deno install --frozen` (or `--frozen` on run/test) in CI.
- Add dependencies with `deno add jsr:@std/path npm:hono`; remove with `deno remove`.

## Dependencies: JSR, npm, URLs

| Source | Specifier | Notes |
|---|---|---|
| JSR | `jsr:@std/path@^1` | TypeScript-first registry; Deno standard library lives here |
| npm | `npm:express@^4` | Most npm packages work, including many native addons via Node-API |
| Node built-ins | `node:fs`, `node:crypto` | Use the `node:` prefix |
| HTTPS URLs | `https://deno.land/x/...` | Legacy style; prefer JSR/npm for versioning and dedup |

### node_modules modes
| `nodeModulesDir` in deno.json | Behavior |
|---|---|
| `"none"` (default without package.json) | Global cache, no local folder |
| `"auto"` | Deno creates and manages `node_modules` (needed by some tools/bundlers) |
| `"manual"` (default with package.json) | You run `deno install`; works like npm |

## Running Existing Node Projects

Deno 2 understands `package.json` (dependencies, scripts) and CommonJS packages.
```bash
cd existing-node-app
deno install                     # installs from package.json into node_modules
deno task dev                    # runs package.json scripts too
deno run -A server.js            # -A grants all permissions; narrow it before production
```
Compatibility notes:
- CommonJS files must use `.cjs` or a `package.json` with `"type": "commonjs"`; `require` is available in CJS modules.
- `process`, `Buffer`, `__dirname` (CJS) are supported; in ESM use `import.meta.dirname` / `import.meta.filename`.
- Frameworks such as Express, Hono, Fastify, Next.js, Astro and Prisma have documented Deno support; test native-addon-heavy packages before committing.

## Configuration and Environment

```ts
const port = Number(Deno.env.get("PORT") ?? "8000");
const dbUrl = Deno.env.get("DATABASE_URL");
if (!dbUrl) throw new Error("DATABASE_URL is required");
```
- Reading env requires `--allow-env` (optionally scoped: `--allow-env=PORT,DATABASE_URL`).
- `--env-file=.env` loads a dotenv file (keep secrets out of git).

## Built-in Toolchain Cheatsheet

| Command | Purpose |
|---|---|
| `deno fmt` / `deno lint` | Format and lint (JS, TS, JSON, Markdown, and more) |
| `deno check main.ts` | Type-check without running |
| `deno test` | Test runner with sanitizers for leaked ops/resources |
| `deno bench` | Benchmarks |
| `deno coverage` | Coverage reports (lcov, HTML) |
| `deno doc` | Generate docs from JSDoc/types |
| `deno compile` | Self-contained executable |
| `deno publish` | Publish to JSR |
| `deno upgrade` | Upgrade the runtime |
| `deno outdated` | Show outdated dependencies (`--update` to bump) |

## Error Handling Basics
```ts
try {
  const text = await Deno.readTextFile("./config.json");
  return JSON.parse(text);
} catch (err) {
  if (err instanceof Deno.errors.NotFound) {
    throw new Error("config.json not found; create it from config.example.json", { cause: err });
  }
  if (err instanceof Deno.errors.PermissionDenied) {
    throw new Error("Missing --allow-read for ./config.json", { cause: err });
  }
  throw err;
}
```

## When to Choose Deno
- New TypeScript services wanting zero-config tooling and a secure default.
- Edge/serverless deployments (Deno Deploy, other platforms supporting Deno).
- Scripts and CLIs (`deno compile` single binaries).
- Existing Node apps can migrate incrementally thanks to npm and package.json support.

## Checklist
- [ ] `deno.json` with tasks, import map and lockfile committed
- [ ] Narrow permissions in tasks and production commands (no `-A`)
- [ ] `deno fmt --check`, `deno lint`, `deno check`, `deno test` in CI
- [ ] Dependencies from JSR/npm with semver ranges and a frozen lockfile
- [ ] Node-specific APIs imported with the `node:` prefix
