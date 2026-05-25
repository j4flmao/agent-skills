# Query Optimization

## Overview
Drizzle ORM query patterns — relational queries, prepared statements, raw SQL, pagination, connection pooling for production workloads.

## Relational Queries

```typescript
import { db } from './db';
import { users, posts, comments } from './db/schema';
import { eq, and, or, like, ilike, inArray, between, desc, asc, sql } from 'drizzle-orm';

// One-to-many with filtering
const userWithPosts = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, userId),
  with: {
    posts: {
      where: (posts, { eq }) => eq(posts.published, true),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      limit: 10,
      columns: { content: false }, // exclude heavy field
    },
  },
});

// Nested relations
const postWithAll = await db.query.posts.findFirst({
  where: (posts, { eq }) => eq(posts.id, postId),
  with: {
    author: true,
    comments: {
      with: {
        author: true,
      },
      orderBy: (comments, { desc }) => [desc(comments.createdAt)],
    },
    tags: true,
  },
});

// Many-to-many through junction
const postWithTags = await db.query.posts.findFirst({
  where: (posts, { eq }) => eq(posts.id, postId),
  with: {
    tags: {
      with: {
        tag: true,
      },
    },
  },
});
```

## Prepared Statements

```typescript
import { sql } from 'drizzle-orm';

// Prepare once, execute many times
const getUserStmt = db.query.users
  .findFirst({ where: (users, { eq }) => eq(users.id, sql.placeholder('id')) })
  .prepare('get_user');

const user1 = await getUserStmt.execute({ id: 'abc' });
const user2 = await getUserStmt.execute({ id: 'def' });

// Batch prepared statements
const stmts = [
  db.select().from(users).where(eq(users.id, sql.placeholder('id'))).prepare('u'),
  db.select().from(posts).where(eq(posts.authorId, sql.placeholder('id'))).prepare('p'),
];

const [[user], [postList]] = await db.batch(stmts.map(s => s.execute({ id: userId })));
```

## Raw SQL

```typescript
import { sql } from 'drizzle-orm';

// Typed raw queries
const result = await db.execute<{ count: number }>(
  sql`SELECT count(*) as count FROM users WHERE is_active = ${true}`
);

// SQL template tags for partial queries
const searchTerm = 'alice';
const results = await db.execute(
  sql`SELECT * FROM users WHERE email ILIKE ${'%' + searchTerm + '%'}`
);

// Raw query in select
const usersWithRank = await db.select({
  id: users.id,
  name: users.name,
  rank: sql<number>`RANK() OVER (ORDER BY ${users.createdAt} DESC)`,
}).from(users);
```

## Pagination

```typescript
// Offset pagination
const page = 1;
const pageSize = 20;

const items = await db.select().from(posts)
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt))
  .limit(pageSize)
  .offset((page - 1) * pageSize);

const [{ count }] = await db.select({ count: sql<number>`count(*)` })
  .from(posts)
  .where(eq(posts.published, true));

// Keyset (cursor) pagination
const cursor = '2024-01-01T00:00:00Z';

const nextPage = await db.select().from(posts)
  .where(and(
    eq(posts.published, true),
    lt(posts.createdAt, cursor)
  ))
  .orderBy(desc(posts.createdAt))
  .limit(20);
```

## Aggregations

```typescript
import { count, sum, avg, min, max, countDistinct } from 'drizzle-orm';

// Group by with aggregations
const stats = await db.select({
  authorId: posts.authorId,
  postCount: count(),
  avgLikes: avg(posts.likes),
  lastPost: max(posts.createdAt),
}).from(posts)
  .groupBy(posts.authorId)
  .having(({ postCount }) => gte(postCount, 5));

// Window functions
const ranked = await db.select({
  id: posts.id,
  title: posts.title,
  rank: sql<number>`RANK() OVER (PARTITION BY author_id ORDER BY likes DESC)`,
}).from(posts);
```

## Connection Pooling

```typescript
// PostgreSQL with pg
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const db = drizzle(pool);

// Serverless (Neon)
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql2 = neon(process.env.DATABASE_URL!);
const db2 = drizzle(sql2);

// Edge (Cloudflare D1)
import { drizzle } from 'drizzle-orm/d1';

const db3 = drizzle(env.DB);

// Turso (libSQL)
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
const db4 = drizzle(client);

// Connect via pg in Edge
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql as vercelSql } from '@vercel/postgres';

const db5 = drizzle(vercelSql);
```

## Performance Patterns

```typescript
// Select specific columns — never select *
const userBrief = await db.select({
  id: users.id,
  email: users.email,
  name: users.name,
}).from(users);

// Use prepared statements for hot-path queries
const findUserByEmail = db.select({
  id: users.id,
  email: users.email,
}).from(users)
  .where(eq(users.email, sql.placeholder('email')))
  .prepare('find_by_email');

// Batch reads
const [userData, postData, commentData] = await db.batch([
  db.select().from(users).where(eq(users.id, userId)),
  db.select().from(posts).where(eq(posts.authorId, userId)).limit(10),
  db.select().from(comments).where(eq(comments.userId, userId)).limit(5),
]);

// Partial index for filtered queries
// CREATE INDEX idx_active_users ON users (created_at) WHERE is_active = true
const activeSince = await db.select()
  .from(users)
  .where(and(eq(users.isActive, true), gte(users.createdAt, sinceDate)));
```

## Key Points
- Prepared statements in Drizzle are explicit (`prepare()`) — use them for repeated queries.
- `db.batch()` runs multiple prepared statements in a single roundtrip.
- Relational queries (`db.query.*.findMany`) use the query builder internally — customize with `with`, `where`, `orderBy`, `limit`.
- Raw SQL with `sql` template tag is type-safe — parameters are automatically escaped.
- Drizzle does not manage the connection pool — pass your own pool/client instance.
- For read replicas, pass separate pool instance in drizzle constructor.
- Use `extractTablesFromCreateUpdateConfig` for multi-schema setups.
