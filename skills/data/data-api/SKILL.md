---
name: data-data-api
description: >
  Use this skill when asked about data API, Hasura, PostgREST, WunderGraph, GraphQL for data, REST API for data, instant API, database API, real-time API, data authorization, or data gateway. This skill enforces: Hasura GraphQL engine for auto-generated APIs from databases, PostgREST for REST APIs from PostgreSQL, WunderGraph for API gateway patterns for data, authorization models (RBAC, session, JWT), real-time subscriptions, and performance optimization with caching and connection pooling. Do NOT use for: custom REST/GraphQL API development with frameworks like Express or FastAPI, frontend-only API consumption, or general API gateway design unrelated to data.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, api, access, phase-11]
---

# Data Data API

## Purpose
Design and deploy data APIs using Hasura (GraphQL) or PostgREST (REST) with authorization, real-time subscriptions, performance optimization, and security patterns.

## Agent Protocol

### Trigger
Exact user phrases: "data API", "Hasura", "PostgREST", "WunderGraph", "GraphQL for data", "REST API for data", "instant API", "database API", "real-time API", "data authorization", "data gateway", "auto-generated API".

### Input Context
- Database(s) to expose (PostgreSQL, MySQL, SQL Server)
- API style preference (GraphQL, REST, both)
- Authentication provider (Auth0, Keycloak, Cognito, custom)
- Authorization model (RBAC, column-level, row-level)
- Real-time requirements (subscriptions, webhooks)
- Performance requirements (latency, throughput, caching)

### Output Artifact
Data API architecture with tool selection (Hasura/PostgREST/WunderGraph), authorization model (row-level, column-level, session), real-time subscription setup, and performance strategy.

### Response Format
```yaml
# API tool selection
# Hasura/PostgREST configuration
# Authorization rules (row + column level)
# Real-time subscription config
# Caching and performance tuning
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] API tool selected with rationale
- [ ] Database connected and tables tracked
- [ ] Row-level security (RLS) configured for all tables
- [ ] Column-level permissions set per role
- [ ] Real-time subscriptions enabled where needed
- [ ] Caching and rate limiting configured
- [ ] API monitoring and logging set up

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Select API Tool

| Tool | API Style | Database Support | Real-time | Auth |
|---|---|---|---|---|
| **Hasura** | GraphQL + REST | Postgres, MySQL, SQL Server, BigQuery, Snowflake | Subscriptions, live queries | JWT, Webhook, OIDC |
| **PostgREST** | REST | PostgreSQL only | Webhooks (trigger) | JWT, API key, OAuth |
| **WunderGraph** | GraphQL + REST + RPC | Postgres + any OpenAPI/gRPC | Server-sent events | JWT, OIDC, API key |

Default: Hasura for GraphQL (native subscriptions, broad DB support, built-in auth). PostgREST for REST-only PostgreSQL stack. WunderGraph for polyglot backends combining data APIs with external services.

### Step 2: Hasura Configuration

```yaml
# docker-compose.hasura.yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: ${PG_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  hasura:
    image: hasura/graphql-engine:v2.40.0
    ports:
      - "8080:8080"
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:${PG_PASSWORD}@postgres:5432/postgres
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: ${HASURA_ADMIN_SECRET}
      HASURA_GRAPHQL_JWT_SECRET: '{"type":"HS256","key":"${JWT_SECRET}"}'
      HASURA_GRAPHQL_UNAUTHORIZED_ROLE: anonymous
      HASURA_GRAPHQL_ENABLE_REMOTE_SCHEMAS: "true"
      HASURA_GRAPHQL_CACHE_MAX_ENTRIES: 5000
      HASURA_GRAPHQL_DEV_MODE: "false"
```

### Step 3: Authorization Model

| Role | Row Filter | Column Mask | Rate Limit |
|---|---|---|---|
| **anonymous** | None (no access) | None | 10 req/min |
| **authenticated** | User sees own data | Full access | 100 req/min |
| **data_analyst** | All rows, no PII | Exclude PII columns | 1000 req/min |
| **data_owner** | Own domain only | Full access | 500 req/min |
| **admin** | All rows | All columns | 5000 req/min |

```yaml
# Hasura metadata authorization
tables:
  - table: orders
    select_permissions:
      - role: authenticated
        permission:
          filter:
            customer_id:
              _eq: X-Hasura-User-Id
          columns:
            - order_id
            - total_amount
            - status
            - created_at
      - role: data_analyst
        permission:
          columns:
            - order_id
            - total_amount
            - status
            - created_at
          filter: {}
```

### Step 4: Row-Level Security (PostgreSQL + PostgREST)

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- User sees own orders
CREATE POLICY user_orders ON orders
  FOR SELECT
  USING (customer_id = current_setting('request.jwt.claims')::json->>'sub');

-- Analyst sees all non-PII
CREATE POLICY analyst_orders ON orders
  FOR SELECT
  TO data_analyst
  USING (true);

-- Admin full access
CREATE POLICY admin_orders ON orders
  FOR ALL
  TO admin
  USING (true)
  WITH CHECK (true);
```

### Step 5: Real-Time Subscriptions

```graphql
# Hasura subscription — real-time order updates
subscription OrderUpdates($userId: String!) {
  orders(
    where: { customer_id: { _eq: $userId } }
    order_by: { created_at: desc }
    limit: 10
  ) {
    order_id
    total_amount
    status
    created_at
    items {
      product_id
      quantity
    }
  }
}
```

### Step 6: Performance

| Strategy | Hasura | PostgREST |
|---|---|---|
| **Connection pooling** | PgBouncer | PgBouncer |
| **Query caching** | `max-age` header, Redis | Response headers |
| **Prepared statements** | Auto | Default |
| **Rate limiting** | Env config + proxy | Nginx/openresty |
| **Response compression** | Auto (gzip) | Auto (gzip) |
| **Batch queries** | Native GraphQL batching | Bulk endpoints |

```yaml
caching:
  default_max_age: 60  # seconds
  per_table:
    orders: 30
    products: 300
    categories: 600
```

### Step 7: Monitoring

```yaml
monitoring:
  metrics:
    - query_latency_p50
    - query_latency_p99
    - error_rate
    - active_connections
    - cache_hit_ratio
  logging:
    - slow_queries (>500ms)
    - auth_failures
    - schema_changes
  alerts:
    - error_rate > 1%
    - p99_latency > 2s
    - cache_hit_ratio < 80%
```

## Rules
- Every table has row-level security — no table exposed without filter
- Admin secret never committed, never in client code
- JWT or webhook authentication required for all non-anonymous access
- Rate limiting configured per role, per endpoint
- Cache headers set on all read-only queries
- Real-time subscriptions limited to authenticated users
- No direct database connection from client — always through API
- PII columns excluded from non-privileged roles

## References
- `references/hasura-postgrest.md` — Hasura GraphQL engine, PostgREST setup, relationships, permissions, subscriptions
- `references/data-api-patterns.md` — Authorization, rate limiting, caching, performance, monitoring, security

## Handoff
`data-data-platform` for deployment infrastructure. `data-data-catalog` for API endpoint documentation. `data-data-observability` for API monitoring. `data-data-contracts` for API schema contracts.
