# GraphQL for Data Reference

## GraphQL Federation for Distributed Data

Federation enables composing a unified GraphQL API from multiple subgraphs (services), each owning a distinct domain of the data graph.

### Federation Architecture

```
                  ┌─────────────────────────┐
                  │  Gateway (Apollo Router)  │
                  └────┬──────┬──────┬───────┘
                       │      │      │
              ┌────────▼──┐ ┌──▼───┐ ┌▼────────┐
              │ Products   │ │Orders│ │ Customers│
              │ Subgraph   │ │SG    │ │ SG       │
              └────────────┘ └──────┘ └──────────┘
```

### Subgraph Definition

```graphql
# Products subgraph
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
  category: String
  stock: Int
}

extend type Query {
  products(ids: [ID!]): [Product!]!
  productsByCategory(category: String!): [Product!]!
}
```

```graphql
# Orders subgraph (references Product from another subgraph)
type Order @key(fields: "id") {
  id: ID!
  productId: ID!
  quantity: Int!
  total: Float!
  status: OrderStatus!
  product: Product @requires(fields: "productId")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
}

extend type Query {
  orders(customerId: ID!): [Order!]!
}
```

### Gateway Configuration

```yaml
# apollo-router.yaml
supergraph:
  path: /graphql
  listen: 0.0.0.0:4000

cors:
  origins:
    - https://app.internal.com
    - https://analytics.internal.com

headers:
  all:
    request:
      - propagate:
          matching: "x-user-id|x-role"

authentication:
  jwt:
    jwks_url: https://auth.internal.com/.well-known/jwks.json
    issuer: https://auth.internal.com/
    audiences:
      - data-api

rhai:
  scripts: ./rhai-scripts

limits:
  max_depth: 10
  max_height: 200
  max_aliases: 50
```

## Hasura Permissions Model

### Role-Based Access Control

```yaml
# hasura/metadata/tables.yaml
- table:
    schema: public
    name: orders
  select_permissions:
    - role: customer
      permission:
        filter:
          customer_id:
            _eq: X-Hasura-User-Id
        columns:
          - id
          - total_amount
          - status
          - created_at
          - items
    - role: support_agent
      permission:
        filter:
          _or:
            - customer_id:
                _eq: X-Hasura-User-Id
            - assigned_to:
                _eq: X-Hasura-User-Id
        columns:
          - id
          - customer_id
          - total_amount
          - status
          - created_at
          - notes
          - assigned_to
    - role: admin
      permission:
        filter: {}
        columns: []
        allow_aggregations: true
  insert_permissions:
    - role: customer
      permission:
        check:
          customer_id:
            _eq: X-Hasura-User-Id
        columns:
          - items
          - shipping_address
  update_permissions:
    - role: admin
      permission:
        columns:
          - status
          - assigned_to
        filter: {}
```

### Column-Level Security

```yaml
# Column-level permissions
- table:
    schema: public
    name: customers
  select_permissions:
    - role: customer
      permission:
        filter:
          id:
            _eq: X-Hasura-User-Id
        columns:
          - id
          - name
          - email
          - phone
    - role: analyst
      permission:
        filter: {}
        columns:
          - id
          - name
          - segment
          - region
          - acquisition_channel
    - role: agent
      permission:
        filter: {}
        columns:
          - id
          - name
          - email
          - phone
          - last_contacted_at
```

### Row-Level Security with Session Variables

```sql
-- Custom session variable for multi-tenant data
-- Hasura passes X-Hasura-Tenant-Id from JWT

-- Permissions rule uses session variable:
-- {"tenant_id": {"_eq": "X-Hasura-Tenant-Id"}}

-- This ensures every query is scoped to the user's tenant
```

## Resolving from Multiple Sources

### Remote Schemas and Actions

```yaml
# hasura/metadata/remote_schemas.yaml
- name: payments-service
  definition:
    url: http://payments-service:4001/graphql
    timeout_seconds: 5
    forward_client_headers: true
    customization:
      root_fields_namespace: payments

- name: recommendations-service
  definition:
    url_from_env: RECOMMENDATIONS_SERVICE_URL
    timeout_seconds: 10
    forward_client_headers: true
```

### Event Triggers for Real-Time Sync

```yaml
# hasura/metadata/event_triggers.yaml
- name: order_created
  definition:
    enable: true
    insert:
      columns: "*"
    retry_conf:
      num_retries: 3
      retry_interval_seconds: 10
      timeout_seconds: 60
    webhook: http://webhook-service:4002/events
    headers:
      - name: x-webhook-secret
        value_from_env: WEBHOOK_SECRET
```

### Relationships Across Sources

```graphql
# Query combining PostgreSQL + REST API + remote schema
query OrderWithRecommendations($orderId: ID!) {
  orders_by_pk(id: $orderId) {
    id
    total_amount
    items {
      product_id
      quantity
    }
    customer {
      id
      name
    }
    # Remote schema: recommendations service
    payments {
      recommendations {
        products {
          product_id
          score
        }
      }
    }
  }
}
```

## Caching Strategies

### Response Caching

```yaml
# Hasura caching configuration
caching:
  default_max_age: 60
  stale_tolerance: 120
  store:
    type: redis
    redis:
      host: redis-cache
      port: 6379
      password_from_env: REDIS_CACHE_PASSWORD

  # Per-query cache config
  per_query:
    - query: "GetProducts"
      max_age: 300
    - query: "GetOrders"
      max_age: 30
    - query: "GetUserProfile"
      max_age: 60
```

### Cache Invalidation

```graphql
# Automatic cache invalidation on mutations
mutation CreateOrder($input: OrderInput!) {
  insert_orders_one(object: $input) {
    id
    total_amount
  }
  # Cache invalidated for affected queries
  # Hasura automatically invalidates related cache entries
}

# Manual cache purge
POST /v1/graphql
{
  "type": "clear_cache",
  "args": {
    "scope": "query",
    "query_name": "GetProducts"
  }
}
```

## Subscriptions

### Real-Time Subscriptions

```graphql
# Subscription for real-time order updates
subscription OrderUpdates($customerId: ID!) {
  orders(
    where: { customer_id: { _eq: $customerId } }
    order_by: { created_at: desc }
    limit: 10
  ) {
    id
    status
    total_amount
    items {
      id
      product_id
      quantity
    }
    tracking {
      carrier
      status
      estimated_delivery
    }
  }
}
```

### Subscription Performance

```yaml
# Hasura subscription performance tuning
subscriptions:
  polling_interval: 1000  # ms
  batch_size: 100
  max_subscriptions_per_user: 20
  max_rows_per_subscription: 1000
  enable_streaming: false  # switch to streaming for < 1s latency
```

## Rules
- Federation for multi-service data graphs; monolithic GraphQL for single-source
- Every query must enforce row-level security via session variables
- Expose remote schemas for services, actions for REST endpoints
- Set query depth limits to prevent abuse (max 10 by default)
- Cache read-heavy queries with Redis; invalidate on mutations
- Subscriptions for real-time needs; polling for < 5s latency tolerance
- Use persisted queries for production to reduce parsing overhead
- Enable query cost analysis to prevent expensive queries
- Always deploy schema changes via CI/CD, never manual
- Monitor query performance and error rates per role and endpoint
