# Schema Types

## Overview
Column types available per dialect in Drizzle ORM — schema definition, type mapping, default values, constraints.

## PostgreSQL Column Types

```typescript
import {
  pgTable, serial, integer, bigint, numeric, decimal, real, doublePrecision,
  text, varchar, char, boolean, date, timestamp, time, interval,
  json, jsonb, uuid, bytea, geometry, point, line, lseg, box, path,
  polygon, circle, cidr, inet, macaddr, macaddr8, tsvector, tsquery,
  vector, bit, bitVarying, serial, bigserial,
} from 'drizzle-orm/pg-core';

// Numeric types
const id = serial('id').primaryKey();
const count = integer('count').notNull().default(0);
const price = numeric('price', { precision: 10, scale: 2 });
const rating = real('rating');

// String types
const name = varchar('name', { length: 255 });
const bio = text('bio');
const code = char('code', { length: 3 });

// Temporal types
const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow();
const birthDate = date('birth_date');
const sessionTimeout = interval('session_timeout');

// JSON types
const metadata = jsonb('metadata').notNull().default('{}');
const config = json('config');

// Special types
const id2 = uuid('id').defaultRandom().primaryKey();
const avatar = bytea('avatar');
const searchVector = tsvector('search_vector');
```

## MySQL Column Types

```typescript
import {
  mysqlTable, serial, int, bigint, decimal, float, double,
  varchar, char, text, tinytext, mediumtext, longtext,
  boolean, date, datetime, timestamp, time, year,
  json, binary, varbinary, blob, tinyblob, mediumblob, longblob,
  enum: mysqlEnum,
} from 'drizzle-orm/mysql-core';

const status = mysqlEnum('status', ['active', 'inactive', 'pending']);
const price2 = decimal('price', { precision: 10, scale: 2 });
const createdAt2 = datetime('created_at').default(sql`CURRENT_TIMESTAMP`);
```

## SQLite Column Types

```typescript
import {
  sqliteTable, integer, real, text, blob, numeric,
} from 'drizzle-orm/sqlite-core';

const id3 = integer('id').primaryKey({ autoIncrement: true });
const name2 = text('name').notNull();
const price3 = real('price');
const data = blob('data');
const isActive = integer('is_active', { mode: 'boolean' });
```

## Constraints

```typescript
// Primary keys
const id4 = uuid('id').defaultRandom().primaryKey();
// Composite primary key
const compositePk = pgTable('order_items', {
  orderId: uuid('order_id').notNull(),
  productId: uuid('product_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.orderId, table.productId] }),
}));

// Unique constraints
const email = text('email').unique().notNull();
// Composite unique
(table) => ({
  unq: uniqueIndex('unique_order_product').on(table.orderId, table.productId),
}),

// Foreign keys
const authorId = uuid('author_id').references(() => users.id, {
  onDelete: 'cascade',
  onUpdate: 'restrict',
});

// Check constraints (PostgreSQL)
(table) => ({
  check: check('price_check', sql`${table.price} > 0`),
});

// Default values
const isActive2 = boolean('is_active').default(true);
const createdAt3 = timestamp('created_at').defaultNow();
```

## Indexes

```typescript
import { index, uniqueIndex } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  authorId: uuid('author_id'),
  publishedAt: timestamp('published_at'),
}, (table) => ({
  titleIdx: index('posts_title_idx').on(table.title),
  authorIdx: index('posts_author_idx').on(table.authorId),
  uniqueTitleAuthor: uniqueIndex('posts_title_author').on(table.title, table.authorId),
  publishedAtIdx: index('posts_published_at_idx').on(table.publishedAt),
}));

// PostgreSQL partial indexes
const activeUsersIdx = index('active_users_idx')
  .on(table.isActive)
  .where(sql`is_active = true`);

// Concurrent index creation
await db.execute(sql`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author
  ON posts (author_id)
`);
```

## Enums

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('order_status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: statusEnum('status').default('pending').notNull(),
});

// MySQL enum
import { mysqlEnum } from 'drizzle-orm/mysql-core';
const role = mysqlEnum('role', ['admin', 'user', 'viewer']);
```

## Migrations

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (dev only - no versioning)
npx drizzle-kit push

# Inspect database and generate schema
npx drizzle-kit introspect

# Drop and recreate (dev only)
npx drizzle-kit drop
```

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Migration customization
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
  verbose: true,
  strict: true,
});
```

## Seeding

```typescript
// src/db/seed.ts
import { db } from './index';
import { users } from './schema/users';
import { hash } from 'bcrypt';

async function seed() {
  const hashedPassword = await hash('password123', 10);

  await db.insert(users).values([
    { email: 'admin@example.com', name: 'Admin', role: 'admin' },
    { email: 'user@example.com', name: 'User', role: 'user' },
  ]);

  console.log('Seed complete');
}

seed().catch(console.error);
```

## Key Points
- Use `{ mode: 'boolean' }` for SQLite integer-as-boolean columns.
- PostgreSQL `uuid().defaultRandom()` generates v4 UUIDs automatically.
- MySQL `serial` is an alias for `int auto_increment`.
- Always generate migrations in development — push only for prototyping.
- Index names must be unique within a schema — use descriptive prefixes.
- Composite primary keys use `primaryKey({ columns: [...] })` function in table config.
