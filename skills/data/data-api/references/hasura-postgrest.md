# Hasura & PostgREST

## Hasura GraphQL Engine

### Quick Start

```bash
docker run -d \
  --name hasura \
  -p 8080:8080 \
  -e HASURA_GRAPHQL_DATABASE_URL=postgres://user:pass@host:5432/db \
  -e HASURA_GRAPHQL_ENABLE_CONSOLE=true \
  -e HASURA_GRAPHQL_ADMIN_SECRET=myadminsecret \
  hasura/graphql-engine:v2.40.0
```

### Track Tables & Relationships

```graphql
# Auto-generated queries (example)
query GetOrdersWithCustomer {
  orders(limit: 10, order_by: {created_at: desc}) {
    order_id
    total_amount
    status
    customer {
      name
      email
    }
    items {
      product {
        name
        price
      }
      quantity
    }
  }
}
```

Relationships defined via metadata: `orders → customer (foreign key)`, `orders → items (array relationship)`, `items → product (object relationship)`. Hasura infers from DB foreign keys or manual metadata config.

### Permissions

```yaml
# Hasura metadata/permissions/orders.yaml
table: orders
insert_permissions:
  - role: user
    permission:
      check:
        customer_id:
          _eq: X-Hasura-User-Id
      columns:
        - order_id
        - customer_id
        - total_amount
        - status
select_permissions:
  - role: user
    permission:
      filter:
        customer_id:
          _eq: X-Hasura-User-Id
      columns:
        - order_id
        - total_amount
        - status
update_permissions:
  - role: user
    permission:
      filter:
        customer_id:
          _eq: X-Hasura-User-Id
      columns:
        - status
      check: {}
delete_permissions: []
```

### Real-Time Subscriptions

```graphql
# Live query — any change to matching rows pushes update
subscription LiveOrderStatus {
  orders(where: {status: {_eq: "processing"}}) {
    order_id
    status
    updated_at
  }
}

# With aggregation
subscription OrderMetrics {
  orders_aggregate(where: {created_at: {_gte: "2026-05-01"}}) {
    aggregate {
      count
      sum {
        total_amount
      }
    }
  }
}
```

### Remote Schemas (Join Across Databases)

```yaml
# Add remote schema (another Hasura instance or any GraphQL server)
metadata:
  remote_schemas:
    - name: payments_service
      definition:
        url: http://payments-api:4000/graphql
        forward_client_headers: true
      permissions:
        - role: admin
```

## PostgREST

### Quick Start

```bash
docker run -d \
  --name postgrest \
  -p 3000:3000 \
  -e PGRST_DB_URI=postgres://user:pass@host:5432/db \
  -e PGRST_DB_SCHEMA=api \
  -e PGRST_DB_ANON_ROLE=web_anon \
  -e PGRST_JWT_SECRET=myjwtsecret \
  postgrest/postgrest:v12.0
```

### REST Endpoints

```bash
# List all orders (with pagination)
GET /orders
# Response: 
# [
#   {"order_id": "ORD-001", "total_amount": 150.00, "status": "completed"},
#   ...
# ]
# Headers: Content-Range: 0-99/10000

# Single order
GET /orders?order_id=eq.ORD-001

# Filtering
GET /orders?total_amount=gte.100&status=eq.completed

# Nested (embedded)
GET /orders?select=order_id,total_amount,customer(name,email)

# Aggregation
GET /orders?select=count,sum:total_amount&created_at=gte.2026-05-01

# Upsert
POST /orders
{
  "order_id": "ORD-002",
  "customer_id": "CUST-001",
  "total_amount": 250.00,
  "status": "pending"
}
Prefer: return=representation

# Stored procedure
GET /rpc/get_customer_orders?customer_id=CUST-001
```

### OpenAPI

PostgREST auto-generates OpenAPI schema at `GET /`. Import into Swagger, Postman, or codegen tools.
