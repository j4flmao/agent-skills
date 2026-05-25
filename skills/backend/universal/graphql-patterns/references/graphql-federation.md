# GraphQL Federation

## Apollo Federation Architecture

```
                        ┌──────────────────┐
                        │   Supergraph     │
                        │   (Gateway)      │
                        └────────┬─────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
    ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
    │  Subgraph A   │   │  Subgraph B   │   │  Subgraph C   │
    │  (Users)      │   │  (Orders)     │   │  (Payments)   │
    │  @key(id)     │   │  @key(id)     │   │  @key(id)     │
    └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
            │                    │                    │
    ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
    │  User DB      │   │  Order DB     │   │  Payment DB   │
    └───────────────┘   └───────────────┘   └───────────────┘
```

## Federation Directives Reference

| Directive | Location | Purpose |
|-----------|----------|---------|
| `@key(fields: "id")` | type | Defines entity identity for cross-subgraph resolution |
| `@extends` | type | Marks type extending an entity from another subgraph |
| `@external` | field | Marks field defined in another subgraph |
| `@provides(fields: "name")` | field | Subgraph can resolve this field without querying other subgraphs |
| `@requires(fields: "price")` | field | Subgraph needs these fields from another subgraph to compute this field |
| `@shareable` | type/field | Multiple subgraphs can resolve this field (same value guaranteed) |
| `@inaccessible` | type/field | Field not included in supergraph (internal use only) |
| `@override(from: "Users")` | field | This subgraph overrides field from named subgraph |
| `@tag(name: "experimental")` | type/field | Metadata for routing or cost calculation |

## Subgraph Definition Example

```graphql
# Subgraph A: Users service
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String! @shareable
  orders: [Order!]!  # Resolved by this subgraph
}

# Subgraph B: Orders service  
type Order @key(fields: "id") {
  id: ID!
  total: Float!
  userId: ID! @external
  user: User! @requires(fields: "userId")
}

type User @key(fields: "id") @extends {
  id: ID! @external
  latestOrder: Order  # Extended field resolved by Orders service
}
```

## Entity Resolution (__resolveReference)

```typescript
// Subgraph A: Users service — resolves User entity
const resolvers = {
  User: {
    __resolveReference(ref: { id: string }, { dataLoaders }: Context) {
      return dataLoaders.userLoader.load(ref.id);
    },
  },
  Query: {
    user: (_, { id }, { dataLoaders }) => dataLoaders.userLoader.load(id),
    users: (_, args, { dataLoaders }) => dataLoaders.userConnectionLoader.load(args),
  },
};

// Subgraph B: Orders service — resolves Order and extends User
const resolvers = {
  Order: {
    __resolveReference(ref: { id: string }, { dataLoaders }: Context) {
      return dataLoaders.orderLoader.load(ref.id);
    },
    user: (order: Order, _, { dataLoaders }: Context) => {
      return dataLoaders.userLoader.load(order.userId);
    },
  },
  User: {
    __resolveReference(ref: { id: string }, { dataLoaders }: Context) {
      return { id: ref.id }; // Minimal representation
    },
    latestOrder: (user: { id: string }, _, { dataLoaders }: Context) => {
      return dataLoaders.latestOrderLoader.load(user.id);
    },
  },
};
```

## Supergraph Schema Composition

```yaml
# supergraph-config.yaml
subgraphs:
  users:
    routing_url: http://users-service:4001/graphql
    schema:
      file: ./subgraphs/users/schema.graphql
  orders:
    routing_url: http://orders-service:4002/graphql
    schema:
      file: ./subgraphs/orders/schema.graphql
  payments:
    routing_url: http://payments-service:4003/graphql
    schema:
      file: ./subgraphs/payments/schema.graphql
```

```bash
# Compose supergraph schema
rover supergraph compose --config ./supergraph-config.yaml > supergraph.graphql

# Start gateway with supergraph
APOLLO_ROVER_DEV_COMPOSE=true rover dev \
  --supergraph-path ./supergraph.graphql \
  --router-config ./router.yaml
```

## Router/Gateway Configuration

```yaml
# router.yaml
router:
  supergraph: ./supergraph.graphql
  listen: 0.0.0.0:4000
  cors:
    origins:
      - https://app.example.com

headers:
  all:
    request:
      - propagate:
          named: "authorization"
          rename: "x-user-token"

health_check:
  listen: 0.0.0.0:8088

include_subgraph_errors:
  all: false  # Don't leak internal errors to clients

traffic_shaping:
  all:
    timeout: 10s
    retry: { max_retries: 2 }
  subgraphs:
    payments:
      timeout: 30s  # Payment service may be slower
```

## Query Planning

```
Query: 
{
  users {
    name
    orders { total }
  }
}

Query Plan:
1. Query Users subgraph for: users { id, name }
2. For each user, query Orders subgraph with __typename + __resolveReference
3. Orders subgraph returns: orders { total }
4. Gateway assembles response
```

## Federation v1 vs v2

| Feature | Federation v1 | Federation v2 |
|---------|--------------|--------------|
| Value types | `@value` directive | Plain types (no directive) |
| Shareable fields | Not supported | `@shareable` directive |
| Override | Not supported | `@override(from:)` |
| Inaccessible | Not supported | `@inaccessible` |
| Tagging | Not supported | `@tag(name:)` |
| Composition | Rover CLI | Rover CLI (improved) |
| Entity resolution | `__resolveReference` | `__resolveReference` (same) |
| Migration | — | Backward compatible from v1 |

## Testing Federated Services

```typescript
describe('Users subgraph', () => {
  let server: ApolloServer;

  beforeAll(async () => {
    server = new ApolloServer({
      schema: await buildSubgraphSchema({
        typeDefs: userTypeDefs,
        resolvers: userResolvers,
      }),
    });
  });

  it('resolves user by reference', async () => {
    const result = await server.executeOperation({
      query: `query ($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ... on User { id name }
        }
      }`,
      variables: {
        representations: [{ __typename: 'User', id: 'user-1' }],
      },
    });
    expect(result.data?._entities[0].name).toBe('Alice');
  });

  it('handles unknown user reference gracefully', async () => {
    const result = await server.executeOperation({
      query: `...`,
      variables: {
        representations: [{ __typename: 'User', id: 'nonexistent' }],
      },
    });
    expect(result.data?._entities[0]).toBeNull();
  });
});
```

## Migration: Monolith to Federation

1. Add `@key` to existing schema types
2. Implement `__resolveReference` for each entity
3. Create router/gateway in front of monolith
4. Extract first subgraph (e.g., Users) — route `/graphql` for users to new service
5. Update monolith schema to `@extends` extracted types
6. Repeat extraction for each bounded context
7. Router handles cross-subgraph resolution transparently
