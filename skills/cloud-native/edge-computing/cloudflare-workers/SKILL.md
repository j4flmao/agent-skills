---
name: cloud-native-cloudflare-workers
description: >
  Use this skill when the user says 'cloudflare workers', 'v8 isolates', 'edge function', 'wrangler', 'durable objects', 'workers kv', 'd1 database', 'r2 storage', 'edge compute', 'run code at the edge'. Designs and writes Cloudflare Workers applications, choosing the right storage primitive (KV, D1, R2, Durable Objects, Queues) and respecting the isolate runtime's limits. Do NOT use for: CDN caching rules only (devops cdn-edge), AWS Lambda/Lambda@Edge (cloud-native-aws-serverless), general serverless platform comparison (devops-serverless).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, edge, cloudflare, workers, v8-isolates, durable-objects]
---

# Cloudflare Workers and V8 Isolates

## Purpose
Run request-path logic close to users on Cloudflare's network. Workers use V8 isolates rather than per-function VMs or containers, which makes startup cheap but imposes a Web-standard runtime with CPU and memory limits; storage choice drives consistency and latency.

## Agent Protocol

### Trigger
"cloudflare workers", "v8 isolates", "edge function", "wrangler", "durable objects", "workers kv", "D1", "R2", "edge compute".

### Input Context
- Workload: request rewriting/auth, API, full-stack app, websockets, scheduled jobs.
- Data needs: read-heavy config, relational queries, blobs, strongly consistent per-key state.
- Node.js library dependencies.

### Output Artifact
`wrangler.toml`/`wrangler.jsonc` and Worker code. No file unless requested.

### Response Format
```
Runtime fit: {ok|needs nodejs_compat|not a fit (why)}
Storage: {KV|D1|R2|Durable Objects|Queues|Hyperdrive} (why)
Consistency: {eventual|strong per object|...}
Limits to watch: {CPU ms, memory, subrequests}
```

### Completion Criteria
- [ ] Storage primitive matches the consistency requirement.
- [ ] Bindings declared in wrangler config; secrets via `wrangler secret put`.
- [ ] No blocking/long CPU work in the request path.

## Isolates vs MicroVMs
| | V8 isolate (Workers) | MicroVM (Lambda/Firecracker) |
|---|---|---|
| Unit of isolation | Isolate (separate heap) inside a shared runtime process, plus process-level sandboxing | Dedicated lightweight VM with its own guest kernel |
| Startup | Milliseconds; Cloudflare also pre-warms during the TLS handshake | Tens of ms to seconds depending on runtime and init code |
| Runtime | Web-standard APIs (`fetch`, `Request`, `Response`, Web Crypto, Streams) + optional Node.js compatibility | Full OS process, any language/binary |
| Memory | 128 MB per isolate | Up to 10,240 MB |
| Good for | Latency-sensitive request handling, auth, routing, APIs | Heavy compute, native binaries, long jobs |

Containers do not boot a kernel — they share the host kernel; Lambda's cost comes from booting a microVM, starting the language runtime, and running init code.

## Storage Primitives
| Need | Use | Consistency |
|---|---|---|
| Read-heavy config, flags, sessions tolerant of staleness | Workers KV | Eventually consistent; writes can take up to ~60 s to be visible globally |
| Relational data, SQL | D1 (SQLite-based) | Strong on the primary; read replication optional |
| Large objects, user uploads | R2 (S3-compatible API, no egress fees) | Strong read-after-write |
| Per-key coordination: counters, rate limits, chat rooms, websockets | Durable Objects | Strongly consistent, single-threaded per object |
| Async work, retries | Queues | At-least-once |
| Existing Postgres/MySQL | Hyperdrive (pooling + caching) | Same as origin DB |

## Example Worker (ES modules, TypeScript)

```ts
export interface Env {
  CONFIG: KVNamespace;
  DB: D1Database;
  RATE_LIMITER: DurableObjectNamespace<RateLimiter>;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
    const limiter = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(ip));
    if (!(await limiter.allow())) return new Response("Too Many Requests", { status: 429 });

    const url = new URL(req.url);
    if (url.pathname.startsWith("/products/")) {
      const id = url.pathname.split("/")[2];
      const row = await env.DB.prepare("SELECT id, name, price FROM products WHERE id = ?")
        .bind(id).first();
      if (!row) return new Response("Not found", { status: 404 });
      ctx.waitUntil(env.CONFIG.put(`last-viewed:${id}`, new Date().toISOString())); // after response
      return Response.json(row);
    }
    return fetch(req); // pass through to origin
  },
} satisfies ExportedHandler<Env>;

import { DurableObject } from "cloudflare:workers";

export class RateLimiter extends DurableObject {
  async allow(): Promise<boolean> {
    const now = Date.now();
    const windowStart = (await this.ctx.storage.get<number>("windowStart")) ?? now;
    let count = (await this.ctx.storage.get<number>("count")) ?? 0;
    if (now - windowStart > 60_000) { count = 0; await this.ctx.storage.put("windowStart", now); }
    if (count >= 100) return false;
    await this.ctx.storage.put("count", count + 1);
    return true;
  }
}
```

```toml
# wrangler.toml
name = "shop-edge"
main = "src/index.ts"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "CONFIG"
id = "<kv-namespace-id>"

[[d1_databases]]
binding = "DB"
database_name = "shop"
database_id = "<d1-database-id>"

[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["RateLimiter"]
```

## Decision Rules
- Need strong consistency on a key → Durable Object, never KV.
- Fan-out to many origins → mind the subrequest limit per invocation (50 on Free, higher on paid plans).
- CPU-heavy work (image transforms, large JSON parsing) → paid plan CPU limits (configurable `limits.cpu_ms`), or Cloudflare Images / Containers.
- Node-only libraries → test under `nodejs_compat`; native addons will not run.
- Use `ctx.waitUntil()` for logging/analytics after the response; never `await` them in the hot path.

## Anti-Patterns
- Using KV as a counter or lock (lost updates).
- One global Durable Object for all traffic (single-threaded bottleneck) → shard by key.
- Storing secrets in `[vars]` (plain text in config) instead of `wrangler secret put`.
- Assuming the Worker runs in one region → plan data locality (D1 location hints, DO placement).

## Checklist
- [ ] `compatibility_date` set and bumped deliberately.
- [ ] Storage chosen per consistency table.
- [ ] Rate limiting/auth at the edge before origin calls.
- [ ] Local dev with `wrangler dev`; tests with `@cloudflare/vitest-pool-workers`.
- [ ] Observability: Workers Logs / Tail Workers enabled.

## References
- Related skills: `skills/devops/cdn-edge/SKILL.md`, `skills/cloud-native/serverless-cold-starts/SKILL.md`.
