# GraphQL Security

## Depth Limiting
Prevent malicious deep queries that can cause performance issues:

```typescript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(7)],
});
```

Set max depth to 7 levels for production APIs. Adjust based on schema complexity.

## Query Complexity Analysis
Assign cost to each field and reject queries exceeding budget:

```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const complexityRule = createComplexityLimitRule(1000, {
  onCost: (cost) => console.log(`Query cost: ${cost}`),
  formatErrorMessage: (cost) =>
    `Query too complex: ${cost}. Maximum allowed: 1000`,
});

const server = new ApolloServer({
  validationRules: [complexityRule],
});
```

### Cost Assignment
- Simple scalar field: 1 point
- Nested object: childCost + 1
- List field: childCost * expectedPageSize
- External API call: 5 points per field

## Rate Limiting
Apply rate limits at GraphQL level, not just HTTP:

```typescript
import { RateLimit } from 'graphql-rate-limit';

const typeDefs = `
  directive @rateLimit(
    max: Int!
    window: String!
    message: String!
  ) on FIELD_DEFINITION

  type Query {
    users: [User!]! @rateLimit(max: 100, window: "1m", message: "Too many requests")
  }
`;
```

### Per-Resolver Rate Limiting
```typescript
const resolvers = {
  Query: {
    users: async (_, args, context) => {
      const { remaining, reset } = await context.rateLimiter.check('users_query', 100, 60);
      context.setResponseHeader('X-RateLimit-Remaining', remaining);
      if (remaining <= 0) {
        throw new ApolloError('Rate limit exceeded', 'RATE_LIMITED', { reset });
      }
      return userService.findAll();
    },
  },
};
```

## Authentication
### JWT Authentication
```typescript
const server = new ApolloServer({
  context: ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return { user: null };
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      return { user };
    } catch {
      return { user: null };
    }
  },
});
```

### Directive-Based Auth
```graphql
directive @auth on FIELD_DEFINITION
directive @hasRole(roles: [String!]!) on FIELD_DEFINITION

type Query {
  me: User! @auth
  users: [User!]! @hasRole(roles: ["ADMIN"])
}
```

```typescript
class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve } = field;
    field.resolve = async (parent, args, context, info) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return resolve.call(this, parent, args, context, info);
    };
  }
}
```

## Authorization Patterns
### Role-Based Access Control
```typescript
const resolvers = {
  Query: {
    users: async (_, args, { user, dataLoaders }) => {
      if (!user.roles.includes('ADMIN')) {
        throw new ForbiddenError('Admin access required');
      }
      return dataLoaders.usersLoader.load();
    },
  },
};
```

### Field-Level Authorization
Hide sensitive fields based on user role:

```typescript
const resolvers = {
  User: {
    email: (parent, args, { user }) => {
      if (user.id === parent.id || user.roles.includes('ADMIN')) {
        return parent.email;
      }
      return null;
    },
    ssn: (parent, args, { user }) => {
      throw new ForbiddenError('SSN access restricted');
    },
  },
};
```

### Data-Based Authorization
Filter results based on user permissions:

```typescript
const resolvers = {
  Query: {
    documents: async (_, args, { user, dataLoaders }) => {
      const allDocs = await dataLoaders.documentsLoader.load();
      return allDocs.filter(doc => doc.organizationId === user.organizationId);
    },
  },
};
```

## Persisted Queries
### Registration Flow
```typescript
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    cache: new PersistedQueryCache({
      maxSize: 1000,
      ttl: 86400,
    }),
  },
});
```

### Client-Side Usage
```typescript
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { createHttpLink } from '@apollo/client/link/http';
import { ApolloClient, InMemoryCache } from '@apollo/client';

const link = createPersistedQueryLink().concat(
  createHttpLink({ uri: '/graphql' })
);

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});
```

## Introspection Protection
Disable introspection in production:

```typescript
const server = new ApolloServer({
  introspection: process.env.NODE_ENV !== 'production',
});
```

## Batching and Throttling
### Request Batching
```typescript
import { createBatchingLink } from './batching-link';

const link = createBatchingLink({
  batchMax: 5,
  batchInterval: 10,
}).concat(httpLink);
```

### Query Batching
```typescript
const resolvers = {
  Query: {
    users: async (_, { ids }, { dataLoaders }) => {
      return dataLoaders.userLoader.loadMany(ids);
    },
  },
};
```

## CSRF Protection
```typescript
const server = new ApolloServer({
  csrfPrevention: {
    requestHeaders: ['content-type', 'apollo-require-preflight'],
  },
});
```

## Error Handling Security
Never leak stack traces or internal details:

```typescript
const server = new ApolloServer({
  formatError: (formattedError) => {
    if (process.env.NODE_ENV === 'production') {
      return {
        message: formattedError.message,
        code: formattedError.extensions?.code,
      };
    }
    return formattedError;
  },
});
```

## Secure Subscription Connections
```typescript
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

useServer({
  onConnect: (ctx) => {
    const token = ctx.connectionParams?.authToken;
    if (!token) return false;
    try {
      ctx.user = jwt.verify(token, process.env.JWT_SECRET);
      return true;
    } catch {
      return false;
    }
  },
}, wsServer);
```

## Key Points
- Enforce depth limiting (max 7 levels) and query complexity budgets (max 1000 points)
- Use directive-based auth for declarative security
- Never expose stack traces in production errors
- Disable introspection in production
- Apply rate limiting at both HTTP and GraphQL levels
- Use persisted queries to prevent arbitrary query execution
- Validate all input arguments against injection attacks
- Implement CSRF prevention for mutation operations
- Always authenticate WebSocket connections for subscriptions
- Log security events with structured logging for audit trails
