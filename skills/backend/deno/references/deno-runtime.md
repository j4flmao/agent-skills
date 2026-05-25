# Deno Runtime Deep Dive

## Permissions Model

| Flag | Permission | Risk |
|------|-----------|------|
| `--allow-net` | Network access | Data exfiltration |
| `--allow-read` | File read | Source code access |
| `--allow-write` | File write | File modification |
| `--allow-env` | Environment vars | Secret leakage |
| `--allow-ffi` | FFI access | Full system access |
| `--allow-run` | Subprocess | Arbitrary execution |
| `--allow-hrtime` | High-res timers | Timing attacks |
| `-A` | All permissions | No sandbox |

```typescript
// Granular permissions — allow specific domains/ports
// deno run --allow-net=api.example.com,localhost:5432 src/main.ts

// Permission prompts (interactive)
// deno run --prompt src/main.ts
```

## Module Resolution

```json
// deno.json — import maps
{
  "imports": {
    "std/": "https://deno.land/std@0.220.0/",
    "oak/": "https://deno.land/x/oak@v12.6.2/",
    "zod/": "https://deno.land/x/zod@v3.22.0/",
    "lodash": "npm:lodash",
    "express": "npm:express"
  }
}
```

| Source | URL Pattern | When |
|--------|-------------|------|
| **deno.land/x** | `https://deno.land/x/pkg@v1.0.0/mod.ts` | Deno-native packages |
| **JSR** | `jsr:@scope/pkg` | Modern registry, works with Node/Bun |
| **npm** | `npm:package` | Node.js ecosystem packages |
| **Local** | `./path/to/mod.ts` | Project modules, relative paths |

## Standard Library Modules

```typescript
// File system
import { ensureDir, copy, move } from 'std/fs/mod.ts';
import { walk } from 'std/fs/walk.ts';

// HTTP server
import { serve } from 'std/http/server.ts';
import { Status } from 'std/http/http_status.ts';

// Testing
import { assertEquals, assertRejects } from 'std/testing/asserts.ts';
import { describe, it } from 'std/testing/bdd.ts';

// Serialization
import { parse, stringify } from 'std/json/mod.ts';
import { CSVParseStream } from 'std/csv/mod.ts';

// Crypto
import { crypto } from 'std/crypto/mod.ts';
import { encrypt, decrypt } from 'std/encryption/mod.ts';

// Logging
import * as log from 'std/log/mod.ts';
log.setup({ handlers: { console: new log.handlers.ConsoleHandler('DEBUG') } });
```

## Runtime APIs

```typescript
// File I/O
const file = await Deno.open('./data.json', { read: true });
const text = await Deno.readTextFile('./config.json');
const bytes = await Deno.readFile('./image.png');
await Deno.writeTextFile('./output.txt', 'content');
await Deno.remove('./old-file.txt');

// Environment
const port = Deno.env.get('PORT') || '8000';
const isDev = Deno.env.get('DENO_ENV') === 'development';

// Network
const conn = await Deno.connect({ port: 6379, hostname: 'localhost' });
const listener = Deno.listen({ port: 8000 });

// Process
const cmd = new Deno.Command('echo', { args: ['Hello'] });
const { stdout } = await cmd.output();
console.log(new TextDecoder().decode(stdout));

// Testing
Deno.test('math works', () => {
  assertEquals(2 + 2, 4);
});
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## Benchmarking

```typescript
// bench.ts
import { bench, runBenchmarks } from 'std/testing/bench.ts';

bench('JSON parse', () => JSON.parse('{"a":1,"b":2}'));
bench('crypto UUID', () => crypto.randomUUID());

await runBenchmarks();
```

## Vendor / Caching

```bash
# Cache dependencies locally
deno cache src/deps.ts

# Vendor dependencies (committable)
deno vendor src/main.ts
# Creates vendor/ directory with all deps

# Run with vendored deps
deno run --cached-only src/main.ts
```

## Linting & Formatting

```bash
# Lint
deno lint
deno lint --rules-exclude=no-explicit-any

# Format
deno fmt
deno fmt --check  # CI mode — check without writing
deno fmt --options-line-width=100

# Type check (without running)
deno check src/main.ts
```
