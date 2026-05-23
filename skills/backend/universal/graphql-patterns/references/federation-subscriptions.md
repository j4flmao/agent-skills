# Federation and Subscriptions

## Apollo Federation

### Federation Directives
- `@key(fields: "id")` — Primary key on an entity for cross-subgraph resolution
- `@extends` — Type extends an entity defined in another subgraph
- `@external` — Field defined in another subgraph, referenced locally
- `@provides(fields: "name")` — Subgraph can resolve the field without querying another subgraph
- `@requires(fields: "price")` — Subgraph needs the specified fields from another subgraph

### Entity Resolution Pattern
```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}

type Query {
  product(id: ID!): Product
}

# Resolver implements __resolveReference
# product(id: "1") and Product.__resolveReference({ id: "1" }) return same shape
```

### Subgraph Definition
Each subgraph defines its domain entities using `@key` and must implement `__resolveReference` for each entity:
```typescript
const resolvers = {
  Product: {
    __resolveReference: (ref, { dataLoaders }) => {
      return dataLoaders.productLoader.load(ref.id);
    },
  },
};
```

### Gateway Configuration
```yaml
gateway:
  serviceList:
    - name: accounts
      url: http://accounts/graphql
    - name: products
      url: http://products/graphql
    - name: reviews
      url: http://reviews/graphql
  queryPlan:
    maxRetries: 3
    retryDelay: 100ms
```

### Supergraph Schema
The supergraph schema is the merged view of all subgraph schemas. It is validated on every subgraph deployment to ensure compatibility. The gateway uses the supergraph schema to create query plans. Supergraph schema checks can be run in CI using Apollo Studio or the Rover CLI:
```bash
rover supergraph compose --config ./supergraph.yaml
rover graph check my-supergraph --schema ./schema.graphql
```

### Query Planning
The gateway analyzes each incoming operation and creates a query plan. A query plan is a tree of fetch operations distributed across subgraphs. Each fetch operation targets a specific subgraph and includes the fields it can resolve. Query plans are cached by operation shape. The gateway can parallelize independent subgraph requests.

### Federation Version 2
Apollo Federation 2 makes all directives in-scope by default (no need to import them). Entities can be shared across subgraphs without `@extends` in Fed 2. The `@shareable` directive marks fields that can be resolved by multiple subgraphs. The `@inaccessible` directive marks fields that exist in the supergraph but should not be exposed to clients. The `@override` directive allows one subgraph to override a field from another subgraph. Fed 2 also introduces `@interfaceObject` for interface entity sharing.

### Subgraph Development Guidelines
- Each subgraph owns its domain data completely
- Entities are shared across subgraphs via `@key` references only
- Subgraphs are independently deployable with their own CI/CD
- Subgraph schemas validated against supergraph schema on every deploy
- Use Apollo Studio for schema checks and operation registry
- Avoid circular references between subgraphs
- Keep subgraphs small and focused on one domain

### Entity Resolution Performance
Minimize cross-subgraph lookups by co-locating related data. Use `@provides` to serve commonly-requested fields without cross-subgraph calls. Implement DataLoader in each subgraph for batched entity resolution. Monitor query plan execution time in the gateway.

## Subscriptions

### WebSocket Protocol (graphql-ws)
The `graphql-ws` library implements the GraphQL over WebSocket Protocol. The client establishes a WebSocket connection and sends a `subscribe` message with the subscription query. The server acknowledges with a `next` message for each event. The client sends a `complete` message to unsubscribe. The server can terminate the connection with an `error` message.

### Subscription Setup (Apollo Server with graphql-ws)
```typescript
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer({
  schema,
  context: async (ctx, msg, args) => {
    // Authenticate on connection
    const token = ctx.connectionParams?.authorization;
    const user = await authenticate(token);
    return { user, pubsub };
  },
  onDisconnect(ctx, code, reason) {
    // Clean up subscription listeners
  },
}, wsServer);
```

### Pub/Sub Implementation
```typescript
// In-memory (single instance)
import { PubSub } from 'graphql-subscriptions';
const pubsub = new PubSub();

// Redis (multi-instance)
import { RedisPubSub } from 'graphql-redis-subscriptions';
const pubsub = new RedisPubSub({
  publisher: new Redis(process.env.REDIS_URL),
  subscriber: new Redis(process.env.REDIS_URL),
});

// Publishing an event
pubsub.publish('ORDER_CREATED', { orderCreated: { id: '123', status: 'confirmed' } });
```

### Subscription Resolver Implementation
```graphql
type Subscription {
  orderCreated(userId: ID): Order!
  orderUpdated(orderId: ID!): Order!
}
```

```typescript
const resolvers = {
  Subscription: {
    orderCreated: {
      subscribe: (_, { userId }, { pubsub }) => {
        // Filter events by userId
        const iterator = pubsub.asyncIterator('ORDER_CREATED');
        return {
          [Symbol.asyncIterator]() {
            return {
              async next() {
                const { value, done } = await iterator.next();
                // Apply server-side filter
                if (value.orderCreated.userId !== userId) {
                  return this.next(); // skip
                }
                return { value, done };
              },
            };
          },
        };
      },
    },
    orderUpdated: {
      subscribe: (_, { orderId }, { pubsub, user }) => {
        // Authenticate subscription
        if (!user) throw new AuthenticationError('Not authenticated');
        // Use asyncIterator with filter
        return withFilter(
          () => pubsub.asyncIterator('ORDER_UPDATED'),
          (payload, variables) => payload.orderUpdated.orderId === variables.orderId
        )(_, { orderId }, { pubsub, user });
      },
    },
  },
};
```

### Subscription Authentication Flow
1. Client connects to WebSocket endpoint with authentication token in connection params
2. Server validates token during the `onConnect` lifecycle event
3. Server sets the authenticated user in the context for the duration of the WebSocket connection
4. Individual subscription resolvers can perform additional authorization checks
5. When the token expires, the server can close the connection or use a token refresh mechanism

### SSE Implementation
For server-to-server subscriptions or environments where WebSocket is unavailable:
```typescript
// Server-side SSE endpoint
app.post('/graphql/subscribe', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const subscription = await executeSubscription({ schema, document: req.body.query });
  
  for await (const result of subscription) {
    res.write(`data: ${JSON.stringify(result)}\n\n`);
  }
});
```

### Subscription Performance
- Limit concurrent subscriptions per user (default: 10)
- Use a connection pool for Redis pub/sub
- Monitor subscription count and event publishing rate
- Set a maximum subscription payload size (default: 1MB)
- Implement backpressure handling for slow consumers
- Clean up stale subscriptions on connection timeout

## Best Practices
- Each subgraph owns its domain data
- Entities are shared across subgraphs via `@key`
- Subgraphs are independently deployable
- Gateway handles query planning and stitching
- Subgraph schemas validated against supergraph schema on deploy
- Use Apollo Studio for schema checks and operation registry
- Subscriptions authenticate on connect, not per event
- Use Redis pub/sub for multi-instance subscription support
- Implement `withFilter` for server-side event filtering
- Monitor subscription latency and event throughput
