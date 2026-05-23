# Deno Runtime Guide

## Permission Model
```bash
# Granular permissions
deno run --allow-net=api.example.com:443 --allow-read=/data --allow-env=DB_URL src/main.ts

# Common flags
--allow-net        # Network access
--allow-read       # File read access
--allow-write      # File write access
--allow-env        # Environment variables
--allow-sys        # System info
--allow-run        # Subprocesses
--allow-ffi        # Dynamic libraries
--allow-all / -A   # All permissions (avoid in prod)

# Prompt mode (ask per access)
deno run --allow-net --allow-read --allow-env --deny-write src/main.ts
```

## Dependency Management (JSR / npm)
```typescript
// deno.json
{
  "imports": {
    "@oak/oak": "jsr:@oak/oak@^17",
    "@std/assert": "jsr:@std/assert@^1",
    "pg": "npm:pg@^8"
  }
}

// Usage
import { Application } from "@oak/oak"
import { Client } from "pg"
import { assertEquals } from "@std/assert"

// Vendor deps for offline
// deno vendor src/main.ts
```

## Standard Library
```typescript
import { crypto } from "jsr:@std/crypto"
import { encodeHex } from "jsr:@std/encoding/hex"
import { basename, extname } from "jsr:@std/path"
import { parseArgs } from "jsr:@std/cli/parse-args"
import { copy as copyStream } from "jsr:@std/streams"
import { delay } from "jsr:@std/async"

// HTTP client
const res = await fetch("https://api.example.com/orders", {
  headers: { Authorization: `Bearer ${token}` },
})
const orders = await res.json()
```

## Testing
```typescript
import { assertEquals, assertRejects } from "jsr:@std/assert"

Deno.test("GET /api/orders returns 200", async () => {
  const res = await fetch("http://localhost:3000/api/orders")
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(Array.isArray(body.data), true)
})

Deno.test("POST /api/orders validates body", async () => {
  const res = await fetch("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  assertEquals(res.status, 400)
})
```

## Workers & Parallelism
```typescript
// main.ts
const worker = new Worker(
  import.meta.resolve("./worker.ts"),
  { type: "module", deno: { permissions: "none" } }
)
worker.postMessage({ task: "process-order", id: "abc" })
worker.onmessage = (e) => console.log(e.data)

// worker.ts
self.onmessage = async (e) => {
  const { task, id } = e.data
  const result = await expensiveWork(id)
  self.postMessage(result)
}
```

## File System
```typescript
// Deno-specific APIs (no fs import needed)
const text = await Deno.readTextFile("./config.json")
await Deno.writeTextFile("./output.txt", "hello")
const entries: Deno.DirEntry[] = []
for await (const entry of Deno.readDir("./data")) {
  entries.push(entry)
}
const info = await Deno.stat("./large-file.csv")
```

## KV Store (Deno KV)
```typescript
const kv = await Deno.openKv()

// Set
await kv.set(["orders", orderId], order)

// Get
const result = await kv.get(["orders", orderId])

// List
const iter = kv.list({ prefix: ["orders"] })
for await (const entry of iter) {
  console.log(entry.key, entry.value)
}

// Atomic transactions
const res = await kv.atomic()
  .check({ key: ["orders", id], versionstamp: null })
  .set(["orders", id], order)
  .commit()
```
