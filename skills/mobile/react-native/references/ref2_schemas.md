# React Native Data Schemas: Types, Validation and Local Persistence

Data models in a React Native app live in three places: API payloads (validated at the edge), in-memory domain types, and on-device storage (key-value, SQLite, or an offline-first database). This reference covers schema definition, runtime validation, storage options and migrations.

## Validate at the Boundary

TypeScript types disappear at runtime; a backend change can still crash the app. Parse every network response with a schema and map it to a domain type.

```ts
import { z } from 'zod';

export const OrderDto = z.object({
  id: z.string(),
  status: z.enum(['pending', 'paid', 'shipped', 'cancelled']),
  total_cents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  created_at: z.string().datetime(),
  items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })),
});
export type OrderDto = z.infer<typeof OrderDto>;

export type Order = {
  id: string;
  status: OrderDto['status'];
  total: { amountMinor: number; currency: string };
  createdAt: Date;
  itemCount: number;
};

export function toOrder(dto: OrderDto): Order {
  return {
    id: dto.id,
    status: dto.status,
    total: { amountMinor: dto.total_cents, currency: dto.currency },
    createdAt: new Date(dto.created_at),
    itemCount: dto.items.reduce((n, i) => n + i.qty, 0),
  };
}

export async function getOrder(id: string): Promise<Order> {
  const res = await http.get(`/orders/${id}`);
  const parsed = OrderDto.safeParse(res.data);
  if (!parsed.success) {
    logger.error('Order payload failed validation', { id, issues: parsed.error.issues });
    throw new Error(`Invalid order payload for id ${id}`);
  }
  return toOrder(parsed.data);
}
```

Guidelines:
- Store money as integer minor units plus ISO 4217 currency; format with `Intl.NumberFormat` at render time.
- Store timestamps as ISO 8601 UTC strings; convert to `Date` in the mapper.
- Use `z.enum` and handle unknown values deliberately (`.catch('unknown')`) if the server may add states.
- Generate DTO schemas from OpenAPI (e.g. `openapi-typescript`, `orval`, `zodios`) to avoid drift.

## Storage Options

| Store | Model | Use for | Notes |
|-------|-------|---------|-------|
| `react-native-mmkv` | Sync key-value (C++) | Settings, flags, persisted query cache | Fast; optional encryption key; keep values small |
| `@react-native-async-storage/async-storage` | Async key-value | Simple legacy cases | Slower; unencrypted |
| `expo-secure-store` / `react-native-keychain` | Keychain / Keystore | Tokens, secrets | Small values only |
| `expo-sqlite` / `op-sqlite` | SQLite | Relational offline data, search | Write migrations yourself or with Drizzle |
| WatermelonDB | SQLite + reactive models + sync protocol | Large offline-first datasets | Lazy loading, sync adapter needed |
| Realm (Atlas Device SDK) | Object DB | Existing Realm apps | MongoDB deprecated Atlas Device Sync (end of life Sept 2025); avoid for new sync designs |

## Key-Value Schema Discipline

```ts
import { createMMKV } from 'react-native-mmkv';   // v4 API; v3 used `new MMKV()`
const storage = createMMKV({ id: 'app' });

const SettingsV2 = z.object({
  version: z.literal(2),
  theme: z.enum(['system', 'light', 'dark']),
  locale: z.string(),
});

export function loadSettings() {
  const raw = storage.getString('settings');
  if (!raw) return defaultSettings;
  const json = JSON.parse(raw);
  if (json.version === 1) return migrateV1toV2(json);
  return SettingsV2.parse(json);
}
```

Version every persisted object and keep migration functions for each previous version.

## SQLite with Drizzle

```ts
// db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  status: text('status', { enum: ['pending', 'paid', 'shipped', 'cancelled'] }).notNull(),
  totalMinor: integer('total_minor').notNull(),
  currency: text('currency').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
}, (t) => [index('orders_status_idx').on(t.status)]);
```

```ts
// db/client.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';

export const db = drizzle(openDatabaseSync('app.db'));
// in the root component: const { success, error } = useMigrations(db, migrations);
```

Generate migrations with `drizzle-kit generate` (driver `expo`), bundle them, and run them before rendering data screens.

## Sync-Friendly Schema Fields

| Field | Purpose |
|-------|---------|
| Client-generated `id` (UUIDv7/ULID) | Create records offline without server round trip |
| `updated_at` (server clock) | Delta sync cursor |
| `deleted_at` tombstone | Propagate deletes |
| `version` or `etag` | Optimistic concurrency / conflict detection |
| `sync_status` (local only) | `pending`, `synced`, `failed` for outbox rows |

Keep a local outbox table of pending mutations, each with an idempotency key, and replay it when connectivity returns.

## Migration Rules

- Never edit a shipped migration; add a new one.
- Migrations must handle every older app version still installed (users skip versions).
- Destructive changes (drop column) go in two releases: stop writing, then remove.
- Test migrations against a fixture database exported from an old build.

## Pitfalls

- Storing tokens in MMKV/AsyncStorage without encryption; use Keychain/Keystore.
- Large JSON blobs in key-value stores; parsing blocks the JS thread.
- Trusting `as Order` casts on network data.
- Floating-point money.
- Device-local time used as a sync cursor.

## Checklist

- [ ] Every network payload parsed with a schema and mapped to domain types
- [ ] Persisted objects versioned with migrations
- [ ] Secrets only in secure storage
- [ ] SQLite migrations bundled and run at startup
- [ ] Sync fields (ids, timestamps, tombstones) present for offline data
