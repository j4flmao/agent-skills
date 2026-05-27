# GraphQL Security

## Depth Limiting

### Why Depth Matters
A GraphQL query can nest arbitrarily deep:
```graphql
query DeepQuery {
  user {
    posts {
      comments {
        user {
          posts {
            comments {
              user { ... }
            }
          }
        }
      }
    }
  }
}
```
Without depth limiting, a single query can cause exponential database load.

### Apollo Server Depth Limiting
```typescript
import { ApolloServer } from '@apollo/server';
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    depthLimit(10), // Maximum depth of 10 levels
  ],
});
```

### Yoga Server Depth Limiting
```typescript
import { createYoga } from 'graphql-yoga';
import { depthLimitValidator } from 'graphql-yoga/plugins/depth-limit';

const yoga = createYoga({
  schema,
  plugins: [
    depthLimitValidator({ maxDepth: 10 }),
  ],
});
```

### Express Middleware
```typescript
import depthLimit from 'graphql-depth-limit';
import { specifiedRules } from 'graphql';

app.use('/graphql', (req, res, next) => {
  const validationRules = specifiedRules.concat([depthLimit(10)]);

  graphqlHTTP({
    schema,
    validationRules,
  })(req, res, next);
});
```

### Per-Query Depth Limits
```typescript
const depthLimits: Record<string, number> = {
  PUBLIC_API: 5,
  AUTHENTICATED_API: 10,
  INTERNAL_API: 15,
  ADMIN_API: 20,
};

function getDepthLimit(context: GraphQLContext): number {
  if (context.isAdmin) return depthLimits.ADMIN_API;
  if (context.isAuthenticated) return depthLimits.AUTHENTICATED_API;
  return depthLimits.PUBLIC_API;
}

const server = new ApolloServer({
  schema,
  validationRules: [
    (context) => depthLimit(getDepthLimit(context))(context),
  ],
});
```

## Query Complexity Analysis

### Cost-Based Complexity
```typescript
interface ComplexityEstimator {
  (args: { childComplexity: number; field: GraphQLField<any, any>; args: Record<string, any> }): number;
}

// Define costs for different field types
const complexityEstimators: Record<string, ComplexityEstimator> = {
  // Scalar fields cost 1
  default: () => 1,

  // List fields with pagination costs based on limit
  list: ({ args, childComplexity }) => {
    const limit = args.first || args.last || 10;
    return childComplexity * limit;
  },

  // Relationship fields cost more
  relation: ({ args, childComplexity }) => {
    const limit = args.first || args.last || 10;
    return childComplexity * limit * 1.5;
  },

  // Expensive computations
  search: ({ args }) => {
    const term = args.query || '';
    return 10 + term.length * 0.1;
  },

  // Analytics queries are expensive
  analytics: ({ childComplexity }) => childComplexity * 5,
};
```

### Apollo Server Complexity Limiting
```typescript
import { ApolloServer } from '@apollo/server';
import {
  fieldExtensionsEstimator,
  simpleEstimator,
  getComplexity,
} from 'graphql-query-complexity';

const server = new ApolloServer({
  schema,
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation({ request, document }) {
            const complexity = getComplexity({
              schema,
              operationName: request.operationName,
              query: request.query,
              variables: request.variables,
              estimators: [
                fieldExtensionsEstimator(),
                simpleEstimator({ defaultComplexity: 1 }),
              ],
            });

            const maxComplexity = 1000;
            if (complexity > maxComplexity) {
              throw new GraphQLError(
                `Query is too complex: ${complexity}. Maximum allowed: ${maxComplexity}`
              );
            }
          },
        };
      },
    },
  ],
});
```

### Field-Level Cost Decorator
```typescript
// Define costs in schema using directives
const typeDefs = gql`
  directive @cost(value: Int!) on FIELD_DEFINITION

  type Query {
    users: [User!]! @cost(value: 2)
    searchUsers(query: String!): [User!]! @cost(value: 5)
    expensiveAnalytics: Analytics @cost(value: 20)
  }

  type User {
    name: String!
    email: String @cost(value: 3)  # Sensitive field costs more
    orders: [Order!]! @cost(value: 10)  # DB join expensive
  }
`;

// Complexity estimator using @cost directive
const costEstimator = ({ field, childComplexity }: any) => {
  const cost = field.extensions?.cost || 1;
  return cost * (childComplexity || 1);
};
```

### Yoga Server Complexity
```typescript
import { createYoga } from 'graphql-yoga';
import { useQueryComplexity } from '@envelop/on-resolve';

const yoga = createYoga({
  schema,
  plugins: [
    useQueryComplexity({
      maximumComplexity: 1000,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
    }),
  ],
});
```

## Rate Limiting by Query Cost

### Token Bucket by Cost
```typescript
interface RateLimitConfig {
  maxCostPerWindow: number;
  windowMs: number;
  costRefillRate: number;
}

class CostBasedRateLimiter {
  private budgets: Map<string, { remaining: number; resetAt: number }> = new Map();

  constructor(private config: RateLimitConfig) {}

  async checkLimit(
    clientId: string,
    queryCost: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    let budget = this.budgets.get(clientId);

    if (!budget || budget.resetAt < now) {
      budget = {
        remaining: this.config.maxCostPerWindow,
        resetAt: now + this.config.windowMs,
      };
      this.budgets.set(clientId, budget);
    }

    if (budget.remaining < queryCost) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: budget.resetAt,
      };
    }

    budget.remaining -= queryCost;

    return {
      allowed: true,
      remaining: budget.remaining,
      resetAt: budget.resetAt,
    };
  }
}

// Middleware integration
async function graphQLRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const query = req.body?.query;
  if (!query) return next();

  const cost = calculateQueryCost(query);
  const clientIp = req.ip;
  const result = await rateLimiter.checkLimit(clientIp, cost);

  res.setHeader('X-RateLimit-Cost', cost);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

  if (!result.allowed) {
    return res.status(429).json({
      errors: [{
        message: `Query cost ${cost} exceeds remaining budget ${result.remaining}`,
        extensions: {
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
      }],
    });
  }

  next();
}
```

### Rate Limiting by Role
```typescript
const rateLimitsByRole: Record<string, { maxCost: number; windowMs: number }> = {
  anonymous: { maxCost: 100, windowMs: 60_000 },
  authenticated: { maxCost: 500, windowMs: 60_000 },
  premium: { maxCost: 2000, windowMs: 60_000 },
  admin: { maxCost: 10000, windowMs: 60_000 },
};

function getRateLimit(role: string): { maxCost: number; windowMs: number } {
  return rateLimitsByRole[role] || rateLimitsByRole.anonymous;
}
```

## Persisted Operations

### Why Persisted Operations
- Prevents arbitrary query execution
- Reduces request size (send hash instead of full query)
- Enables API versioning without breaking clients
- Blocks injection attacks at network level

### Apollo Persisted Queries
```typescript
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';

// Server-side registration
const persistedQueries = new Map<string, DocumentNode>([
  ['hash1', gql`query GetUser($id: ID!) { user(id: $id) { name email } }`],
  ['hash2', gql`query GetOrders { orders { id total } }`],
]);

const server = new ApolloServer({
  schema,
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation({ request }) {
            const hash = request.extensions?.persistedQuery?.sha256Hash;
            if (hash && !persistedQueries.has(hash)) {
              throw new GraphQLError('PersistedQueryNotFound');
            }
          },
        };
      },
    },
  ],
});
```

### Relay-Style Persisted Queries
```typescript
import { persistedQueryPlugin } from './persistedQueries';

// Generate manifest during build
// scripts/generate-manifest.ts
async function generateManifest() {
  const manifest: Record<string, string> = {};

  for (const [name, query] of Object.entries(allQueries)) {
    const hash = crypto.createHash('sha256').update(query).digest('hex');
    manifest[hash] = query;
  }

  await fs.writeFile('persisted-queries.json', JSON.stringify(manifest, null, 2));
}

// Server-side validation
function createPersistedQueryPlugin(persistedQueries: Record<string, string>) {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation({ request }) {
          if (process.env.REQUIRE_PERSISTED_QUERIES !== 'true') return;

          const hash = request.extensions?.persistedQuery?.sha256Hash;
          if (!hash) {
            throw new GraphQLError('PersistedQueryRequired');
          }

          const expectedQuery = persistedQueries[hash];
          if (!expectedQuery) {
            throw new GraphQLError('PersistedQueryNotFound');
          }

          if (request.query !== expectedQuery) {
            throw new GraphQLError('PersistedQueryMismatch');
          }
        },
      };
    },
  };
}
```

## Batch Attack Prevention

### Batching Without Auth
Without proper controls, attackers can batch queries to enumerate data:
```graphql
query BatchAttack {
  user1: user(id: 1) { email }
  user2: user(id: 2) { email }
  user3: user(id: 3) { email }
  # ... up to hundreds of aliases
}
```

### Batch Limiting
```typescript
import { createYoga } from 'graphql-yoga';

const yoga = createYoga({
  schema,
  plugins: [
    {
      onExecute({ args }) {
        const operation = args.document.definitions[0];
        if (operation.kind === 'OperationDefinition') {
          const selections = operation.selectionSet.selections;

          // Count field aliases
          const aliasCount = selections.filter((s) => s.kind === 'Field' && s.alias).length;

          if (aliasCount > 20) {
            throw new GraphQLError('Too many aliased fields. Maximum: 20');
          }
        }
      },
    },
  ],
});
```

### Batching with Request Throttling
```typescript
function calculateBatchCost(query: string): number {
  const doc = parse(query);
  let cost = 0;

  visit(doc, {
    Field(node) {
      if (node.alias) cost += 2; // Aliased fields cost more
      cost += 1;
    },
    OperationDefinition() {
      cost += 5; // Base operation cost
    },
  });

  return cost;
}

// Track per-IP batch costs
const batchCosts = new Map<string, { cost: number; resetAt: number }>();

function checkBatchCost(ip: string, query: string): boolean {
  const cost = calculateBatchCost(query);
  const now = Date.now();
  const record = batchCosts.get(ip);

  if (!record || record.resetAt < now) {
    batchCosts.set(ip, { cost, resetAt: now + 1000 });
    return true;
  }

  if (record.cost + cost > 100) { // Max 100 cost per second
    return false;
  }

  record.cost += cost;
  return true;
}
```

### GraphQL Batching Security Table
| Attack | Prevention | Priority |
|--------|-----------|----------|
| N+1 queries via aliases | Limit alias count | High |
| Mass assignment via batch | Validate per-field auth | High |
| Resource exhaustion | Cost-based rate limiting | High |
| Parallel query flooding | Concurrency limits | Medium |

## Introspection Disabling in Production

### Apollo Server
```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
});
```

### Yoga Server
```typescript
const yoga = createYoga({
  schema,
  plugins: [
    process.env.NODE_ENV === 'production'
      ? { onParse() { throw new GraphQLError('Introspection disabled'); } }
      : {},
  ],
});
```

### Conditional Introspection
```typescript
import { ApolloServer } from '@apollo/server';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [
    {
      async requestDidStart({ request }) {
        const isIntrospection = request.query?.includes('__schema') ||
          request.query?.includes('__type');

        if (isIntrospection) {
          const authHeader = request.http?.headers.get('authorization');
          const isAdmin = await validateAdminAccess(authHeader);

          if (!isAdmin) {
            throw new GraphQLError('Introspection requires admin privileges');
          }
        }
      },
    },
  ],
});
```

### Regex-Based Block
```typescript
function blockIntrospection(query: string): boolean {
  const introspectionPatterns = [
    /__schema/,
    /__type/,
    /__typename.*\{/,
    /IntrospectionQuery/,
    /types\s*\{.*name/,
  ];

  return introspectionPatterns.some((pattern) => pattern.test(query));
}

app.use('/graphql', (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && blockIntrospection(req.body.query)) {
    return res.status(400).json({
      errors: [{ message: 'Introspection queries are not allowed' }],
    });
  }
  next();
});
```

## Field-Level Authorization

### Schema-Based Authorization Directive
```typescript
const typeDefs = gql`
  directive @auth(requires: Role = ADMIN) on FIELD_DEFINITION | OBJECT

  enum Role {
    PUBLIC
    USER
    ADMIN
    OWNER
  }

  type Query {
    publicData: String @auth(requires: PUBLIC)
    userProfile: User @auth(requires: USER)
    adminPanel: AdminData @auth(requires: ADMIN)
    deleteUser(id: ID!): Boolean @auth(requires: ADMIN)
  }

  type User {
    id: ID!
    name: String! @auth(requires: PUBLIC)
    email: String! @auth(requires: OWNER)
    ssn: String! @auth(requires: ADMIN)
    orders: [Order!]! @auth(requires: USER)
  }
`;
```

### Auth Directive Resolver
```typescript
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';

function authDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, 'auth')?.[0];
      if (!directive) return fieldConfig;

      const { requires } = directive;
      const originalResolver = fieldConfig.resolve || defaultFieldResolver;

      fieldConfig.resolve = async (source, args, context, info) => {
        const userRole = context.user?.role || 'PUBLIC';
        const userId = context.user?.id;

        // Role hierarchy check
        const roleHierarchy: Record<string, number> = {
          PUBLIC: 0,
          USER: 1,
          OWNER: 2,
          ADMIN: 3,
        };

        if (roleHierarchy[userRole] < roleHierarchy[requires]) {
          throw new GraphQLError('Not authorized', {
            extensions: { code: 'FORBIDDEN', requiredRole: requires },
          });
        }

        // OWNER check: user must own the resource
        if (requires === 'OWNER' && source?.userId !== userId) {
          throw new GraphQLError('Not authorized — resource belongs to another user', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        return originalResolver(source, args, context, info);
      };

      return fieldConfig;
    },
  });
}
```

### Middleware Approach (Apollo)
```typescript
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  schema,
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation({ request }) {
            // Extract requested fields
            const document = parse(request.query);
            const requestedFields = extractRequestedFields(document);

            // Check authorization for each field
            for (const field of requestedFields) {
              const fieldAuth = fieldAuthMap.get(field);
              if (fieldAuth && !hasPermission(request.user, fieldAuth)) {
                throw new GraphQLError(
                  `Not authorized to access field: ${field}`,
                  { extensions: { code: 'FORBIDDEN' } }
                );
              }
            }
          },
        };
      },
    },
  ],
});
```

## N+1 DoS Protection

### The N+1 Query Problem
Without DataLoader, a query like `{ users { posts { comments } } }` produces:
- 1 query for users (N users returned)
- N queries for each user's posts
- M queries for each post's comments
Total: 1 + N + M queries where N and M can be large.

### DataLoader Implementation
```typescript
import DataLoader from 'dataloader';

class UserDataSource {
  private userLoader = new DataLoader(async (ids: readonly string[]) => {
    const users = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
    return ids.map((id) => users.find((u) => u.id === id));
  });

  private postLoader = new DataLoader(async (userIds: readonly string[]) => {
    const posts = await db.query(
      'SELECT * FROM posts WHERE user_id = ANY($1) ORDER BY created_at DESC',
      [userIds]
    );
    return userIds.map((id) => posts.filter((p) => p.user_id === id));
  });

  async getUser(id: string) {
    return this.userLoader.load(id);
  }

  async getPosts(userId: string) {
    return this.postLoader.load(userId);
  }
}

// Context factory
const context = async () => ({
  dataSources: {
    users: new UserDataSource(),
  },
});
```

### Query Depth + Complexity Combined
```typescript
function calculateComplexityWithNPlus1(
  document: DocumentNode,
  schema: GraphQLSchema
): number {
  let complexity = 0;

  visit(document, {
    Field(node, _key, _parent, _path, ancestors) {
      const parentType = getParentType(ancestors, schema);
      if (!parentType) return;

      const fieldDef = parentType.getFields()[node.name.value];
      if (!fieldDef) return;

      // List fields that likely cause N+1
      if (isListType(fieldDef.type) || isNonNullType(fieldDef.type)) {
        const innerType = getNamedType(fieldDef.type);
        if (isObjectType(innerType)) {
          // Each list field multiplies complexity by expected result count
          complexity *= 10; // Assuming 10 items per list
        }
      }

      complexity += 1;
    },
  });

  return complexity;
}
```

## Circular Query Detection

### Cycle Detection
```typescript
import { visit, GraphQLError } from 'graphql';

function detectCircularQueries(document: DocumentNode): void {
  const visitedFields = new Set<string>();
  const path: string[] = [];

  visit(document, {
    Field: {
      enter(node) {
        const fieldName = node.name.value;

        if (path.includes(fieldName)) {
          const cycle = [...path.slice(path.indexOf(fieldName)), fieldName].join(' → ');
          throw new GraphQLError(
            `Circular query detected: ${cycle}`,
            { nodes: node }
          );
        }

        path.push(fieldName);
      },
      leave() {
        path.pop();
      },
    },
  });
}
```

### Max Recursion Depth
```typescript
function maxRecursionDepth(document: DocumentNode, maxDepth: number = 5): void {
  let currentDepth = 0;

  visit(document, {
    Field: {
      enter(node) {
        if (isCircularField(node)) {
          currentDepth++;
          if (currentDepth > maxDepth) {
            throw new GraphQLError(
              `Maximum recursion depth (${maxDepth}) exceeded for field: ${node.name.value}`,
              { nodes: node }
            );
          }
        }
      },
      leave(node) {
        if (isCircularField(node)) {
          currentDepth--;
        }
      },
    },
  });
}

function isCircularField(node: any): boolean {
  // Fields that reference their own type or form cycles
  const circularFields = ['children', 'parent', 'recursive', 'self'];
  return circularFields.includes(node.name.value);
}
```

## Subscription Auth

### WebSocket Authentication
```typescript
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

useServer(
  {
    schema,
    onConnect: async (ctx) => {
      // Authenticate during WebSocket upgrade
      const token = ctx.connectionParams?.authorization;

      if (!token) {
        // Allow anonymous subscriptions if desired
        ctx.extra.user = null;
        return true;
      }

      try {
        const user = await validateToken(token as string);
        ctx.extra.user = user;
        return true;
      } catch (err) {
        // Reject connection
        return false;
      }
    },
    onSubscribe: async (ctx, msg) => {
      // Re-verify auth for each subscription
      if (!ctx.extra.user && process.env.REQUIRE_AUTH === 'true') {
        return [{ message: 'Authentication required for subscriptions' }];
      }
    },
    context: async (ctx, msg, args) => {
      return {
        user: ctx.extra.user,
        // ... other context
      };
    },
  },
  wsServer
);
```

### Per-Subscription Authorization
```typescript
const resolvers = {
  Subscription: {
    orderUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ORDER_UPDATED']),
        (payload, variables, context) => {
          // Only notify if the user owns this order
          return payload.orderUpdated.userId === context.user?.id;
        }
      ),
    },
    adminAlert: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ADMIN_ALERT']),
        (payload, variables, context) => {
          return context.user?.role === 'ADMIN';
        }
      ),
    },
  },
};
```

## Common GraphQL Exploits

### Aliasing Overload
```graphql
query AliasFlood {
  a1: user(id: 1) { email }
  a2: user(id: 2) { email }
  # ... hundreds more
}
```
**Detection:** Count aliases and reject if > threshold.

### Directive Overuse
```graphql
query DirectiveFlood {
  user(id: 1) {
    name @skip(if: false) @include(if: true) @skip(if: false)
    email @include(if: true) @skip(if: false) @include(if: true)
  }
}
```
**Detection:** Limit directives per field.

### Depth Abuse
```graphql
query NestedQuery {
  user {
    posts { comments { user { posts { comments { user { name } } } } } }
  }
}
```
**Detection:** Query depth limit (standard).

### Cost Abuse with Lists
```graphql
query Costly {
  allUsers(first: 10000) {
    orders(first: 1000) {
      items(first: 100) { name }
    }
  }
}
```
**Detection:** Cost-based complexity analysis.

### Exploit Prevention Summary
| Exploit | Detection | Prevention |
|---------|-----------|------------|
| Alias flood | Count unique aliases | Max 20 aliases per query |
| Directive overload | Count directives | Max 5 directives per field |
| Depth abuse | Depth analysis | Max depth 10 |
| Cost abuse | Complexity analysis | Max cost 1000 |
| Introspection | Pattern matching | Disabled in production |
| Batching | Request rate | Max 10 req/min unauthenticated |
| N+1 exploit | DataLoader patterns | Always use DataLoader |
| Circular queries | Cycle detection | Max recursion 5 |

## Key Points
- Always use depth limiting and complexity analysis to prevent recursive/expensive queries
- Persisted operations eliminate arbitrary query execution — use in production APIs
- Rate limit by query cost, not just request count, to prevent expensive query abuse
- Disable introspection in production, or restrict it to admin users
- Implement field-level authorization with directives or middleware per data category
- Use DataLoader to batch database queries and prevent N+1 DoS attacks
- Limit batch queries (aliases), directives, and list sizes to prevent overload
- Authenticate subscriptions at WebSocket connect time and authorize per-event
- Monitor for alias floods, directive overuse, and circular query patterns
- Combine depth + complexity + rate limiting for defense in depth against GraphQL attacks
