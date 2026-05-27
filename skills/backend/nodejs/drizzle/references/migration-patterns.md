# Migration Patterns

## Overview
Drizzle Kit migration strategies — generating, applying, customizing, and seeding migrations for schema evolution across environments.

## Migration Generation

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Custom migration name
npx drizzle-kit generate --name "add_user_preferences"
```

Generated migrations are SQL files in the `drizzle/` directory:
```sql
-- drizzle/0000_add_user_preferences.sql
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "theme" text DEFAULT 'light',
  "notifications_enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_preferences_user_id_idx"
  ON "user_preferences" ("user_id");

--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'UTC';
```

## Migration Application

```bash
# Apply pending migrations
npx drizzle-kit migrate

# Production migration with SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require \
  npx drizzle-kit migrate
```

## Snapshot-Based Migrations

Drizzle Kit uses snapshots to detect schema changes:

```typescript
// drizzle.config.ts
export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  // Snapshot configuration
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
  // Break on potential data loss
  strict: true,
  verbose: true,
});
```

The `meta/` directory in `./drizzle` stores snapshot JSON files. Drizzle compares the current schema against the last snapshot to generate incremental migrations.

## Push (Dev-Only)

```bash
# Direct schema push (no migration file)
npx drizzle-kit push

# Push to Turso/Cloudflare D1
npx drizzle-kit push
```

Push mode directly applies schema changes without generating migration files. Use only for prototyping and development. Never use push in production — always generate + migrate.

## Introspect

```bash
# Generate schema from existing database
npx drizzle-kit introspect

# Introspect specific schema
npx drizzle-kit introspect --schema public
```

Introspection creates Drizzle schema files from an existing database. Useful for:
- Adopting Drizzle on an existing project
- Reverse-engineering a database
- Generating TypeScript types from the database schema

## Seeding

```typescript
// src/db/seed.ts
import { db } from './index';
import { users, posts, categories } from './schema';
import { hash } from 'bcrypt';

async function seed() {
  // Clear existing data
  await db.delete(users);
  await db.delete(categories);

  // Seed users
  const hashedPassword = await hash('password123', 10);
  const [admin] = await db.insert(users).values({
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
    passwordHash: hashedPassword,
  }).returning();

  // Seed categories
  await db.insert(categories).values([
    { name: 'Technology', slug: 'technology' },
    { name: 'Design', slug: 'design' },
    { name: 'Business', slug: 'business' },
  ]);

  console.log('Seed complete');
}

seed().catch(console.error);
```

```json
// package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx src/db/seed.ts",
    "db:reset": "drizzle-kit drop && drizzle-kit migrate && tsx src/db/seed.ts"
  }
}
```

## CI/CD Integration

```yaml
# .github/workflows/migrations.yml
name: Database Migrations
on:
  push:
    branches: [main]
    paths: ['src/db/schema/**', 'drizzle.config.ts']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Generate migration
        run: npx drizzle-kit generate
      - name: Apply migration
        run: npx drizzle-kit migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Verify schema
        run: npx tsx src/db/verify.ts
```

## Migration Safety

| Practice | Why |
|----------|-----|
| Always generate migrations, never push in production | Push skips versioning and rollback capability |
| Review generated SQL before applying | Drizzle may not detect all intended changes |
| Test migrations on staging first | Catch issues before production |
| Keep migrations idempotent | Use `IF NOT EXISTS`, `IF EXISTS` in raw SQL |
| Snapshot migration files in version control | Enables rollback and audit trail |
| Use `strict: true` in config | Prevents accidental data-dropping migrations |

## Custom Migrations

```typescript
// drizzle/custom/001_backfill_slugs.ts
import { db } from '../src/db';
import { posts } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function backfillSlugs() {
  const unslugged = await db.select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(sql`slug IS NULL`);

  for (const post of unslugged) {
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    await db.update(posts)
      .set({ slug })
      .where(eq(posts.id, post.id));
  }
}
```

## Key Points
- Use `generate` + `migrate` in production — never `push`.
- Snapshot files in `drizzle/meta/` are critical — commit them to version control.
- `strict: true` prevents accidental data loss.
- Always inspect generated SQL before applying to production.
- Seed scripts live alongside schema files, executed via `tsx`.
- Custom migrations run separately from Drizzle Kit — track them manually.
- Introspect to generate schemas from existing databases for migration to Drizzle.
