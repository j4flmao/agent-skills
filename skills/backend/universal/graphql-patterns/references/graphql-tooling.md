# GraphQL Tooling and Code Generation

## Code Generation with GraphQL Code Generator

### Setup
```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-resolvers @graphql-codegen/typescript-operations
```

### Configuration
```yaml
# codegen.yml
schema: './src/schema/**/*.graphql'
documents: './src/**/*.graphql'
generates:
  ./src/generated/types.ts:
    plugins:
      - typescript
      - typescript-resolvers
    config:
      contextType: '../types#Context'
      useIndexSignature: true
      maybeValue: T | undefined
  ./src/generated/operations.ts:
    plugins:
      - typescript-operations
      - typescript-documents
```

### Generated Types Usage
```typescript
import { Resolvers, QueryResolvers, MutationResolvers } from './generated/types';

const queryResolvers: QueryResolvers = {
  users: async (_, args, context) => {
    return context.dataLoaders.userLoader.loadMany(args.ids);
  },
};

const resolvers: Resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
  User: {
    posts: async (parent, args, context) => {
      return context.dataLoaders.postLoader.loadByUserId(parent.id);
    },
  },
};
```

## Apollo Client Setup

### Client Configuration
```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({ uri: process.env.GRAPHQL_URL });

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('auth_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        users: {
          merge(existing, incoming) {
            return incoming;
          },
        },
      },
    },
  },
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
  },
});
```

### Custom Hooks
```typescript
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers($first: Int!, $after: String) {
    users(first: $first, after: $after) {
      edges {
        node {
          id
          name
          email
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function useUsers(first = 20) {
  return useQuery(GET_USERS, {
    variables: { first },
    notifyOnNetworkStatusChange: true,
  });
}

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user {
        id
        name
        email
      }
      error {
        message
        code
      }
    }
  }
`;

function useCreateUser() {
  return useMutation(CREATE_USER, {
    update(cache, { data }) {
      if (data?.createUser?.user) {
        cache.modify({
          fields: {
            users(existingRefs = { edges: [] }) {
              const newUserRef = cache.writeFragment({
                data: data.createUser.user,
                fragment: gql`
                  fragment NewUser on User {
                    id
                    name
                    email
                  }
                `,
              });
              return {
                ...existingRefs,
                edges: [
                  { __typename: 'UserEdge', node: newUserRef, cursor: '' },
                  ...existingRefs.edges,
                ],
              };
            },
          },
        });
      }
    },
  });
}
```

## Federation Tooling

### Subgraph Development
```typescript
import { buildSubgraphSchema } from '@apollo/subgraph';
import { ApolloServer } from '@apollo/server';

const typeDefs = gql`
  extend type Query {
    user(id: ID!): User
  }

  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }
`;

const resolvers = {
  User: {
    __resolveReference(ref) {
      return userService.findById(ref.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }],
});
```

### Supergraph CI/CD
```yaml
# GitHub Actions for federation
name: Supergraph CI
on:
  pull_request:
    paths:
      - 'subgraphs/**/*.graphql'
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check schema composition
        run: |
          npx @apollo/rover supergraph compose \
            --config ./supergraph.yaml \
            --output ./composed.graphql
```

## Testing Tools

### Integration Testing
```typescript
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';

const server = new ApolloServer({
  schema,
  context: () => ({
    user: { id: '1', roles: ['ADMIN'] },
    dataLoaders: createDataLoaders(),
  }),
});

const { query, mutate } = createTestClient(server);

test('should return users list', async () => {
  const GET_USERS = gql`
    query GetUsers {
      users {
        edges {
          node { id name }
        }
      }
    }
  `;

  const res = await query({ query: GET_USERS });
  expect(res.data.users.edges).toHaveLength(3);
});

test('should create user', async () => {
  const CREATE_USER = gql`
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        user { id name email }
        error { message code }
      }
    }
  `;

  const res = await mutate({
    mutation: CREATE_USER,
    variables: {
      input: { name: 'Test', email: 'test@example.com' },
    },
  });

  expect(res.data.createUser.user.name).toBe('Test');
  expect(res.data.createUser.error).toBeNull();
});
```

### Mocking
```typescript
import { buildSchema } from 'graphql';
import { mockServer } from 'graphql-tools';

const schema = buildSchema(`
  type Query {
    user(id: ID!): User
    users: [User!]!
  }
  type User {
    id: ID!
    name: String!
    email: String!
  }
`);

const server = mockServer(schema, {
  Query: () => ({
    user: () => ({ id: '1', name: 'John', email: 'john@example.com' }),
    users: () => [
      { id: '1', name: 'John', email: 'john@example.com' },
      { id: '2', name: 'Jane', email: 'jane@example.com' },
    ],
  }),
});
```

## Monitoring and Observability

### Apollo Tracing
```typescript
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';

const server = new ApolloServer({
  plugins: [
    ApolloServerPluginInlineTrace(),
    ApolloServerPluginUsageReporting({
      sendReportsImmediately: true,
      generateClientInfo: ({ request }) => ({
        clientName: request.http.headers.get('apollographql-client-name'),
        clientVersion: request.http.headers.get('apollographql-client-version'),
      }),
    }),
  ],
});
```

### OpenTelemetry Integration
```typescript
import { ApolloServer } from '@apollo/server';
import { OpenTelemetryPlugin } from './opentelemetry-plugin';

const server = new ApolloServer({
  plugins: [
    new OpenTelemetryPlugin({
      tracer: tracer,
      recordErrors: true,
      createSpan: true,
    }),
  ],
});
```

## Key Points
- Use GraphQL Code Generator for type-safe resolvers and operations
- Configure Apollo Client with proper cache policies and error handling
- Test GraphQL APIs with dedicated testing utilities
- Use Apollo Studio for schema validation and performance monitoring
- Implement OpenTelemetry for distributed tracing across subgraphs
- Set up supergraph CI/CD to validate schema composition
- Use persisted queries to reduce request size in production
- Leverage mock servers for frontend development without backend dependency
- Monitor query performance with Apollo Tracing and usage reporting
- Implement proper cache invalidation strategies in the Apollo Client
