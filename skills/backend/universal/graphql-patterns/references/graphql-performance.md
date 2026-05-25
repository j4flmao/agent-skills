# GraphQL Performance

## N+1 Prevention with DataLoader

```typescript
// DataLoader — batches individual loads into a single query
import DataLoader from 'dataloader';

// Batch function — receives keys, returns values in same order
async function batchUsers(userIds: readonly string[]): Promise<User[]> {
  const users = await db.query(
    'SELECT * FROM users WHERE id = ANY($1)',
    [userIds],
  );
  // Map to maintain order (required by DataLoader)
  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id) ?? null);
}

// Request-scoped DataLoader
function createDataLoaders(): DataLoaders {
  return {
    userLoader: new DataLoader(batchUsers),
    orderLoader: new DataLoader(batchOrders),
    productLoader: new DataLoader(batchProducts),
  };
}

// In resolver — batches all user loads in this query
const resolvers = {
  Post: {
    author: (post, _, { dataLoaders }) => {
      return dataLoaders.userLoader.load(post.authorId);
    },
  },
};
```

## Query Complexity Analysis

```typescript
// Complexity calculation per field
const complexityMap = {
  Query: { users: 10, user: 5, search: 20 },
  User: { id: 1, name: 1, email: 1, posts: 10 },
  Post: { id: 1, title: 1, comments: 5 },
};

function calculateComplexity(ast: DocumentNode): number {
  let complexity = 0;
  visit(ast, {
    Field(node) {
      const parentType = getParentType(node);
      const baseCost = complexityMap[parentType]?.[node.name.value] ?? 1;
      const argsMultiplier = node.arguments?.length || 1;
      complexity += baseCost * argsMultiplier;
    },
  });
  return complexity;
}

// Reject queries exceeding budget
const COMPLEXITY_LIMIT = 1000;
const validationRule = (context: ValidationContext) => ({
  Document(node: DocumentNode) {
    const cost = calculateComplexity(node);
    if (cost > COMPLEXITY_LIMIT) {
      context.reportError(new GraphQLError(
        `Query complexity ${cost} exceeds limit of ${COMPLEXITY_LIMIT}`,
      ));
    }
  },
});
```

## Response Caching Strategies

```typescript
// Apollo cache hints
const typeDefs = gql`
  type User @cacheControl(maxAge: 60, scope: PUBLIC) {
    id: ID!
    name: String!
    email: String @cacheControl(maxAge: 300, scope: PRIVATE)
    posts: [Post!]! @cacheControl(maxAge: 30)
  }
`;

// Dynamic cache control from resolver
const resolvers = {
  Post: {
    __resolveReference(post, { dataLoaders }) {
      return dataLoaders.postLoader.load(post.id);
    },
  },
  Query: {
    post: (_, { id }, { dataLoaders, cacheControl }) => {
      cacheControl.setCacheHint({ maxAge: 60, scope: 'PRIVATE' });
      return dataLoaders.postLoader.load(id);
    },
  },
};
```

## Persisted Queries

```typescript
// Server — register persisted queries
const persistedQueries = {
  'ecf4d1a2b3c4d5e6f7a8b9c0d1e2f3a4':
    'query GetUser($id: ID!) { user(id: $id) { id name email } }',
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6':
    'query GetPosts($first: Int, $after: String) { posts(first: $first, after: $after) { edges { node { id title } } } }',
};

// Apollo Server plugin
const persistedQueriesPlugin = {
  async requestDidStart() {
    return {
      async didResolveSource(requestContext) {
        const { request } = requestContext;
        // If request uses SHA256 hash instead of query
        if (request.extensions?.persistedQuery?.version === 1) {
          const hash = request.extensions.persistedQuery.sha256Hash;
          const query = persistedQueries[hash];
          if (!query) {
            throw new GraphQLError('Persisted query not found');
          }
          request.query = query;
        }
      },
    };
  },
};
```

## Depth Limiting

```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

// Limit query depth to prevent abusive queries
const depthLimitRule = createComplexityLimitRule(1000, {
  onCost: (cost) => console.log(`Query cost: ${cost}`),
  formatErrorMessage: (cost) =>
    `Query complexity ${cost} exceeds maximum of 1000`,
});

const server = new ApolloServer({
  schema,
  validationRules: [depthLimitRule],
});
```

## Connection Pool Optimization for DataLoader

```typescript
class OptimizedBatchLoader {
  private db: Pool;

  async batchLoadUsers(keys: readonly string[]): Promise<(User | Error)[]> {
    // Single optimized query with IN clause
    const result = await this.db.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE id = ANY($1)
       ORDER BY array_position($1, id)`, // Preserve order
      [keys],
    );

    const userMap = new Map(result.rows.map(r => [r.id, this.mapRow(r)]));

    return keys.map(key => {
      const user = userMap.get(key);
      return user ?? new Error(`User not found: ${key}`);
    });
  }
}
```

## Performance Benchmarks

| Strategy | Query Type | Latency (p50) | Latency (p99) | DB Queries |
|----------|-----------|---------------|---------------|------------|
| No DataLoader | Fetch users + posts | 150ms | 500ms | N+1 = 101 |
| With DataLoader | Fetch users + posts | 30ms | 80ms | 2 |
| With Redis cache | Fetch users + posts | 5ms | 20ms | 0-2 |
| Persisted query + cache | Fetch users + posts | 3ms | 15ms | 0-2 |

## Monitoring Performance

```yaml
monitoring:
  metrics:
    - "graphql.query.duration"        # Histogram: query execution time
    - "graphql.query.depth"            # Histogram: query depth
    - "graphql.query.complexity"       # Histogram: query complexity
    - "graphql.resolver.duration"      # Histogram: per-resolver timing
    - "graphql.dataloader.cache_hit"   # Counter: cache hit rate
    - "graphql.dataloader.batch_size"  # Histogram: avg batch size
    - "graphql.error.count"            # Counter: errors by code

  tracing:
    apollo_tracing_v1: true            # Apollo Tracing header
    open_telemetry: true               # OTel spans per resolver

  alerts:
    query_too_deep:
      condition: "query.depth > 10"
      severity: warning
    query_too_slow:
      condition: "query.duration.p99 > 5s"
      severity: critical
    resolver_n_plus_1:
      condition: "resolver.calls > 100 AND same_parent"
      severity: warning
```

## Performance Optimization Checklist

- [ ] DataLoader for every relation field
- [ ] Query complexity limits enforced
- [ ] Depth limiting (max 7 levels)
- [ ] Rate limiting per client (1000 req/min)
- [ ] Persisted queries enabled in production
- [ ] Apollo cache hints on read-heavy types
- [ ] Connection pooling (DB side) optimized
- [ ] Resolvers are thin — business logic in services
- [ ] Subscriptions use selective filters, not all-events
- [ ] Schema uses pagination (Relay connection) for all lists
- [ ] Nullable fields don't throw, return null gracefully
- [ ] Batch mutations to reduce round trips
