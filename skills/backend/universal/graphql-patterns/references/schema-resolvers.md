# Schema and Resolvers

## Naming Conventions
- **Types**: PascalCase (`UserProfile`, `OrderItem`)
- **Fields/Arguments**: camelCase (`firstName`, `createdAt`)
- **Enums**: UPPER_SNAKE_CASE (`ORDER_STATUS_PENDING`, `ROLE_ADMIN`)
- **Input types**: Suffix `Input` (`CreateUserInput`)
- **Payload types**: Suffix `Payload` (`CreateUserPayload`)
- **Union members**: Describe the error (`NotFoundError`, `UnauthorizedError`)
- **Interfaces**: Prefix `I` optional, prefer suffix `Interface` (`NodeInterface`)

## Nullability
- List fields: always non-null list with non-null items: `[Type!]!`
- ID fields: always `ID!` (non-null)
- Optional fields: nullable only when semantically optional
- Never nullable: `id`, `createdAt`, `updatedAt`

## Relay Connection Pattern
```graphql
type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### Cursor Encoding
Cursors are opaque strings that encode a sorting value. Common encoding schemes:
```typescript
// Base64-encoded ID
const cursor = Buffer.from(id.toString()).toString('base64');

// Base64-encoded timestamp + ID (for stable sort)
const cursor = Buffer.from(`${createdAt.toISOString()}_${id}`).toString('base64');

// Decode
const decoded = Buffer.from(cursor, 'base64').toString('utf8');
```

### Pagination Resolver Implementation
```typescript
const resolvers = {
  Query: {
    users: async (_, { first = 20, after, last, before }, { dataLoaders }) => {
      const afterId = after ? decodeCursor(after) : null;
      const beforeId = before ? decodeCursor(before) : null;
      const limit = first || last || 20;
      const direction = last ? 'backward' : 'forward';
      
      const { rows, hasMore } = await dataLoaders.userLoader.getPage({
        limit: limit + 1, // fetch one extra to check hasNextPage
        afterId,
        beforeId,
        direction,
      });
      
      const edges = rows.slice(0, limit).map((row) => ({
        node: row,
        cursor: encodeCursor(row.id),
      }));
      
      return {
        edges,
        pageInfo: {
          hasNextPage: direction === 'forward' ? hasMore : false,
          hasPreviousPage: direction === 'backward' ? hasMore : false,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },
  },
};
```

## Mutation Input/Output Pattern
```graphql
input CreateUserInput {
  clientMutationId: String
  email: String!
  name: String!
}

type CreateUserPayload {
  clientMutationId: String
  error: CreateUserError
  user: User
}

union CreateUserError = EmailTakenError | ValidationError
```

### Idempotent Mutations
For mutations that should only execute once, use an idempotency key:
```graphql
input CreatePaymentInput {
  clientMutationId: String
  idempotencyKey: String!
  amount: Float!
  currency: String!
}
```
The server checks if a mutation with the same idempotencyKey has already been processed. If yes, return the cached result instead of executing again. Store idempotency keys in Redis with TTL of 24 hours.

## DataLoader Setup

### DataLoader Pattern (TypeScript)
```typescript
import DataLoader from 'dataloader';

// Batch function — receives array of keys, returns array of values in same order
const batchUsers = async (ids: readonly string[]): Promise<User[]> => {
  const users = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
  const userMap = new Map(users.map(u => [u.id, u]));
  return ids.map(id => userMap.get(id) || null); // preserve order, null for missing
};

// Create DataLoader per request
export const createUserLoader = () => new DataLoader(batchUsers);

// Request context factory
export const createContext = () => ({
  userLoader: createUserLoader(),
  postLoader: new DataLoader(batchPosts),
  commentLoader: new DataLoader(batchComments),
});
```

### Resolver Using DataLoader
```typescript
const resolvers = {
  Post: {
    author: (parent, _, { userLoader }) => userLoader.load(parent.authorId),
  },
  User: {
    posts: (parent, _, { postLoader }) => postLoader.loadByUserId(parent.id),
  },
};
```

### Multi-Key DataLoaders
For data loaded by multiple key types, create a DataLoader per key type:
```typescript
const postLoader = new DataLoader(batchPostsById);
const postLoaderByUserId = new DataLoader(batchPostsByUserId);
```

## N+1 Prevention Checklist

### Detect N+1
- Enable Apollo Tracing or OpenTelemetry for resolver timings
- Monitor for resolvers that fire N times for a single parent query
- Use `express-graphql` or `apollo-server` query plan logging
- Check for repeated identical SQL queries in database logs

### Fix N+1
- Always use DataLoader for relationship fields (author, comments, tags)
- Batch parent queries to fetch all required data at once
- Use `graphql-fields` to inspect requested fields and only fetch required data
- Preload associations in the parent resolver when the child data is always needed

## Query Complexity Analysis

### Complexity Scoring
| Field Type | Cost |
|---|---|
| Scalar field | 1 |
| Object type | Sum of child fields |
| List field (connection) | 1 + childCost * pageSize |
| Mutation | 10 |

### Complexity Calculation
```typescript
const complexityEstimator = (args, childComplexity) => {
  if (args.first) return childComplexity * Math.min(args.first, 100);
  if (args.last) return childComplexity * Math.min(args.last, 100);
  return childComplexity * 20; // default page size
};
```

## Error Handling

### Error Codes
```typescript
const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
};
```

### Error Formatter
```typescript
const formatError = (err) => ({
  message: err.message,
  extensions: {
    code: err.originalError?.code || 'INTERNAL_ERROR',
    traceId: err.originalError?.traceId,
    errors: err.originalError?.validationErrors,
    statusCode: err.originalError?.statusCode || 500,
  },
});
```

## Best Practices
- One query field per root entity type
- Arguments for filtering, sorting, pagination on list queries
- Depth limit: 7 levels maximum
- Complexity limit: 1000 points per query
- N+1 prevention via DataLoader is mandatory
- Schema documentation (descriptions) on all types and fields
- Deprecation notices on fields being phased out

## Type Generation from Schema

### Code-First (TypeScript)
```typescript
import { buildSchema } from 'type-graphql';

@ObjectType()
class User {
  @Field(type => ID)
  id: string;

  @Field()
  name: string;

  @Field(type => [Post])
  posts: Post[];
}
```

### Schema-First (SDL) with Codegen
```graphql
# schema.graphql
type User {
  id: ID!
  name: String!
  posts: [Post!]!
}
```

```bash
# Generate TypeScript types from SDL
graphql-codegen --config codegen.yml
```

The generated types include resolver interfaces, argument types, and return types. Use strict typing for all resolvers and DataLoader batch functions.
