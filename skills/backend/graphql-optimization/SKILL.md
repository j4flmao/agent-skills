---
name: backend-graphql-optimization
description: >
  Use this skill when the user says 'graphql n+1', 'dataloader', 'graphql slow', 'graphql performance', 'batch resolvers', 'query complexity', 'depth limit', 'persisted queries', 'graphql caching'. Diagnoses and fixes GraphQL server performance: N+1 resolver queries with per-request DataLoader, query depth/complexity limits, persisted queries, and response caching. Do NOT use for: schema design and general resolver patterns (backend-graphql-patterns), federated supergraphs (api-graphql-federation), client-side Apollo/urql caching (frontend data-fetching).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [backend, graphql, performance, dataloader, n-plus-one]
---

# GraphQL Optimization

## Purpose
GraphQL resolvers run per field, so a naive implementation issues one database query per parent object (N+1) and lets clients send arbitrarily expensive queries. This skill removes N+1 with batching, bounds query cost, and adds caching where it is safe.

## Agent Protocol

### Trigger
Exact user phrases: "graphql n+1", "dataloader", "graphql slow", "graphql performance", "batch resolvers", "query complexity", "depth limit", "persisted queries", "graphql caching".

### Input Context
- Server library (Apollo Server, GraphQL Yoga, Mercurius, graphql-java, Strawberry, gqlgen, Hot Chocolate).
- Data layer (SQL/ORM, REST backends) and the slow query or resolver.
- Whether the API is public (untrusted clients) or first-party only.

### Output Artifact
Loader definitions, context wiring, and server validation/caching config. No files unless requested.

### Response Format
```
Problem: {N+1 on Type.field | unbounded query | no caching}
Fix: {DataLoader keyed by X | depth<=N, complexity<=M | APQ/persisted | cache hint}
Queries before/after: {n} -> {m}
Code: {loader + resolver + server config}
```

## Diagnosing N+1
Enable SQL logging (or tracing via OpenTelemetry) and run a list query such as:

```graphql
{ posts(first: 50) { id title author { name } } }
```

51 queries (`SELECT posts` + 50 x `SELECT user WHERE id = ?`) is N+1. Target: 2 queries.

## DataLoader (Node.js)

Rules that make DataLoader correct:
1. **Create loaders per request** (in the context factory). A global loader caches across users and leaks data between requests.
2. The batch function receives an array of keys and **must return an array of the same length in the same order**, with `null` or an `Error` instance for missing keys.
3. Batching happens within one tick of the event loop; resolvers just call `loader.load(id)`.

```ts
import DataLoader from 'dataloader';
import type { Pool } from 'pg';

export interface User { id: string; name: string }

export function createLoaders(db: Pool) {
  return {
    userById: new DataLoader<string, User | null>(async (ids) => {
      const { rows } = await db.query<User>(
        'SELECT id, name FROM users WHERE id = ANY($1)',
        [ids as string[]],
      );
      const byId = new Map(rows.map((u) => [u.id, u]));
      return ids.map((id) => byId.get(id) ?? null);
    }),
    // One-to-many: key = authorId, value = that author's posts.
    postsByAuthor: new DataLoader<string, Post[]>(async (authorIds) => {
      const { rows } = await db.query<Post>(
        'SELECT * FROM posts WHERE author_id = ANY($1)',
        [authorIds as string[]],
      );
      const grouped = new Map<string, Post[]>();
      for (const p of rows) {
        const list = grouped.get(p.author_id) ?? [];
        list.push(p);
        grouped.set(p.author_id, list);
      }
      return authorIds.map((id) => grouped.get(id) ?? []);
    }),
  };
}

export interface Post { id: string; title: string; author_id: string }
```

Resolvers and per-request context (Apollo Server 4+ standalone):

```ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import depthLimit from 'graphql-depth-limit';
import { Pool } from 'pg';
import { createLoaders } from './loaders';
import { typeDefs } from './schema'; // SDL string or DocumentNode

const db = new Pool({ connectionString: process.env.DATABASE_URL });

type Ctx = { loaders: ReturnType<typeof createLoaders> };

const resolvers = {
  Post: {
    author: (post: { author_id: string }, _: unknown, ctx: Ctx) =>
      ctx.loaders.userById.load(post.author_id),
  },
  User: {
    posts: (user: { id: string }, _: unknown, ctx: Ctx) =>
      ctx.loaders.postsByAuthor.load(user.id),
  },
};

const server = new ApolloServer<Ctx>({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(8)], // reject deeply nested queries
});

await startStandaloneServer(server, {
  context: async () => ({ loaders: createLoaders(db) }), // fresh per request
});
```

Equivalents in other stacks: `java-dataloader` (graphql-java, Spring for GraphQL `@BatchMapping`), `strawberry.dataloader.DataLoader` (Python), `graph-gophers/dataloader` or gqlgen's dataloaden pattern (Go), Hot Chocolate `BatchDataLoader` (.NET).

## Alternative: Join-Based Resolution
When the parent resolver can see the selection set, fetch children in the same SQL with a JOIN (tools: Join Monster, PostGraphile, Hasura, Prisma `include`). This is faster for fixed shapes but couples resolvers to SQL; DataLoader stays simpler and works across data sources.

## Bounding Query Cost

| Control | What it stops | Notes |
|---|---|---|
| Depth limit | `a { b { a { b ... } } }` recursion | 7-10 is typical |
| Complexity/cost analysis | Wide queries (`first: 1000` nested twice) | `graphql-query-complexity`; weight list fields by their `first`/`limit` argument |
| Pagination caps | Unbounded lists | Enforce max `first`, e.g. 100, in resolvers |
| Persisted queries / allow-list | Arbitrary client queries | Strongest control for first-party clients |
| Timeouts | Slow resolvers holding connections | Per-request deadline propagated to DB calls |
| Disable introspection in prod (public APIs) | Schema mining | Defense in depth only, not a security boundary |

## Caching

| Layer | Mechanism | Caveat |
|---|---|---|
| Per-request | DataLoader memoization | Automatic; scoped to one request |
| Field/entity | Redis cache inside loaders or services | Invalidate on writes like any cache-aside |
| Whole response | Apollo `@cacheControl` hints + response cache plugin, or CDN | Only for public or per-user-keyed data |
| HTTP/CDN | Automatic Persisted Queries (APQ) sent as GET with a hash | Enables CDN caching of query responses |

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| DataLoader instantiated at module scope | Create in context per request |
| Batch function returns rows in DB order | Map back to input key order |
| `load()` inside a loop with `await` each time | `Promise.all(ids.map(id => loader.load(id)))` or `loadMany` |
| Fetching all columns for every resolver | Select only needed fields or use projection from `info` |
| No list size limit | Cap `first`/`limit` and compute cost |

## Checklist
- [ ] Query count for representative list queries measured before and after.
- [ ] Every relation resolver goes through a per-request loader or join.
- [ ] Depth limit, cost limit and max page size enforced.
- [ ] Persisted queries for first-party clients.
- [ ] Resolver timings traced (OpenTelemetry) to find hot fields.

## References
- Related skills: `skills/backend/universal/graphql-patterns/SKILL.md`, `skills/backend/universal/api/graphql-federation/SKILL.md`, `skills/backend/universal/caching/SKILL.md`.
