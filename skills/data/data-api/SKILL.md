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
- API consumers (frontend, mobile, external, internal services)
- Rate limiting and throttling needs

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
- [ ] Error handling and mutation constraints defined

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Select API Tool

#### Tool Comparison Matrix

| Tool | API Style | Database Support | Real-time | Auth |
|---|---|---|---|---|
| **Hasura** | GraphQL + REST | Postgres, MySQL, SQL Server, BigQuery, Snowflake | Subscriptions, live queries | JWT, Webhook, OIDC |
| **PostgREST** | REST | PostgreSQL only | Webhooks (trigger) | JWT, API key, OAuth |
| **WunderGraph** | GraphQL + REST + RPC | Postgres + any OpenAPI/gRPC | Server-sent events | JWT, OIDC, API key |

#### Decision Tree
```
API style preference?
├── GraphQL (client-driven queries, subscriptions)
│   ├── PostgreSQL database → Hasura
│   ├── Multiple databases (MySQL, SQL Server, etc.) → Hasura
│   └── Polyglot backend (DB + external APIs) → WunderGraph
├── REST (simpler, broader client compatibility)
│   ├── PostgreSQL only → PostgREST
│   └── PostgreSQL with GraphQL also → Hasura (also serves REST)
└── RPC / serverless functions
    ├── Database-centric → PostgREST with stored procedures
    └── Polyglot → WunderGraph with TypeScript operations
```

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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s

  hasura:
    image: hasura/graphql-engine:v2.40.0
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:${PG_PASSWORD}@postgres:5432/postgres
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: ${HASURA_ADMIN_SECRET}
      HASURA_GRAPHQL_JWT_SECRET: '{"type":"HS256","key":"${JWT_SECRET}"}'
      HASURA_GRAPHQL_UNAUTHORIZED_ROLE: anonymous
      HASURA_GRAPHQL_ENABLE_REMOTE_SCHEMAS: "true"
      HASURA_GRAPHQL_CACHE_MAX_ENTRIES: 5000
      HASURA_GRAPHQL_DEV_MODE: "false"
      HASURA_GRAPHQL_ENABLED_LOG_TYPES: startup, http-log, websocket-log
      HASURA_GRAPHQL_STRINGIFY_NUMERIC_TYPES: "true"
      HASURA_GRAPHQL_LIVE_QUERIES_MULTIPLEXED: "true"
```

### Step 3: Authorization Model

#### Role-Based Access Design

| Role | Row Filter | Column Mask | Rate Limit | Use Case |
|---|---|---|---|---|
| **anonymous** | None (no access) | None | 10 req/min | Unauthenticated visitors |
| **authenticated** | User sees own data | Full access | 100 req/min | Logged-in users |
| **data_analyst** | All rows, no PII | Exclude PII columns | 1000 req/min | Internal analysts |
| **data_owner** | Own domain only | Full access | 500 req/min | Domain data stewards |
| **admin** | All rows | All columns | 5000 req/min | Platform admins |
| **service** | All rows (machine) | Full access | 10000 req/min | Backend services |

#### Hasura Metadata Authorization

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
    insert_permissions:
      - role: authenticated
        permission:
          check:
            customer_id:
              _eq: X-Hasura-User-Id
          columns:
            - total_amount
            - status
    update_permissions:
      - role: authenticated
        permission:
          filter:
            customer_id:
              _eq: X-Hasura-User-Id
            status:
              _eq: draft
          columns:
            - total_amount
          check:
            customer_id:
              _eq: X-Hasura-User-Id
    delete_permissions:
      - role: admin
        permission:
          filter: {}
```

### Step 4: Row-Level Security (PostgreSQL + PostgREST)

#### RLS Policy Design Patterns

```sql
-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Pattern 1: User sees own data
CREATE POLICY user_orders ON orders
  FOR SELECT
  USING (customer_id = current_setting('request.jwt.claims')::json->>'sub');

-- Pattern 2: Role-based visibility
CREATE POLICY analyst_orders ON orders
  FOR SELECT
  TO data_analyst
  USING (true);

-- Pattern 3: Multi-tenant isolation
CREATE POLICY tenant_isolation ON customers
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Pattern 4: Admin override
CREATE POLICY admin_orders ON orders
  FOR ALL
  TO admin
  USING (true)
  WITH CHECK (true);

-- Pattern 5: Column masking (via views)
CREATE VIEW orders_safe AS
SELECT order_id, total_amount, status, created_at  -- No PII
FROM orders;

GRANT SELECT ON orders_safe TO data_analyst;
```

#### PostgREST Configuration

```yaml
# postgrest.conf
db-uri: "postgres://${PG_USER}:${PG_PASSWORD}@postgres:5432/analytics"
db-schema: "api"
db-anon-role: "anonymous"
db-pre-request: "auth.set_claims"
jwt-secret: "${JWT_SECRET}"
max-rows: 1000
db-pool: 25
db-pool-timeout: 10
openapi-mode: "follow-privileges"
```

### Step 5: Real-Time Subscriptions

#### Hasura Subscriptions

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

#### Webhook Triggers (Hasura Events)

```yaml
events:
  - name: "order_created"
    table: orders
    trigger:
      operation: insert
    webhook: http://event-handler:3000/order-created
    retry_config:
      interval_sec: 10
      num_retries: 3
      timeout_sec: 30
    headers:
      - name: Authorization
        value_from_env: WEBHOOK_SECRET

  - name: "order_status_changed"
    table: orders
    trigger:
      operation: update
      columns: ["status"]
    webhook: http://event-handler:3000/order-status
```

#### PostgREST Notify Pattern

```sql
-- Use PostgreSQL NOTIFY for real-time updates via PostgREST
CREATE OR REPLACE FUNCTION notify_order_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('order_changed', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION notify_order_change();
```

### Step 6: Performance Optimization

#### Caching Strategy

| Strategy | Hasura | PostgREST |
|---|---|---|
| **Connection pooling** | PgBouncer | PgBouncer |
| **Query caching** | `max-age` header, Redis upstream | Response headers |
| **Prepared statements** | Auto | Default |
| **Rate limiting** | Env config + proxy | Nginx/openresty |
| **Response compression** | Auto (gzip) | Auto (gzip) |
| **Batch queries** | Native GraphQL batching | Bulk endpoints |
| **CDN caching** | For static queries | For GET endpoints |

```yaml
caching:
  default_max_age: 60  # seconds
  per_table:
    orders: 30
    products: 300
    categories: 600
  stale_while_revalidate: 86400  # serve stale for 24h during revalidation
```

#### Database Optimization

```sql
-- Indexes for common API query patterns
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Materialized view for complex API endpoints
CREATE MATERIALIZED VIEW api_order_summary AS
SELECT
  o.order_id,
  o.status,
  o.total_amount,
  o.created_at,
  json_agg(json_build_object(
    'product_id', oi.product_id,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price
  )) AS items
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id;

-- Refresh on schedule
CREATE INDEX idx_api_order_summary_status ON api_order_summary(status);
```

### Step 7: Error Handling

#### GraphQL Error Codes

| Error Type | Code | HTTP Status | Description |
|---|---|---|---|
| Validation error | validation-error | 400 | Invalid input, missing required field |
| Authentication error | authentication-error | 401 | Invalid or missing JWT |
| Authorization error | access-denied | 403 | Insufficient permissions |
| Not found | not-found | 404 | Resource doesn't exist |
| Rate limited | rate-limit-exceeded | 429 | Too many requests |
| Constraint violation | constraint-violation | 409 | Unique, FK, or check constraint |
| Internal error | internal-error | 500 | Unexpected server error |

#### Mutation Constraints

```yaml
# Hasura mutation constraints
insert_order:
  validate:
    total_amount: { gt: 0, type: numeric }
    status: { in: [draft, pending] }
  check_conflicts:
    conflict: upsert
    constraint: order_number_unique

update_order:
  validate:
    status_transitions:
      - from: draft
        to: [submitted]
      - from: submitted
        to: [confirmed, cancelled]
  check:
    - only_owner_or_admin_can_update
```

### Step 8: API Monitoring and Observability

```yaml
monitoring:
  metrics:
    - query_latency_p50
    - query_latency_p99
    - error_rate
    - active_connections
    - cache_hit_ratio
    - subscription_count
    - mutation_rate
    - rate_limited_requests
  logging:
    - slow_queries (>500ms)
    - auth_failures
    - schema_changes
    - error_details (with PII redaction)
  alerts:
    - error_rate > 1% → Slack + Email
    - p99_latency > 2s → PagerDuty
    - cache_hit_ratio < 80% → Dashboard warning
    - rate_limited_requests > 5% → Capacity review
  tracing:
    - OpenTelemetry for request tracing
    - Trace from client → Hasura → database
    - Include GraphQL operation name in spans
```

### API Versioning Strategy

#### URL-Based Versioning
`/v1/graphql`, `/v2/graphql` — deploy separate Hasura instances for different versions. Simplest but duplicates infrastructure.

#### Schema Stitching
Hasura supports remote schemas: v1 and v2 schemas published separately, stitched in gateway. Consumers choose schema via endpoint selection. More flexible but complex to maintain.

#### Deprecation Policy
Version N+1 released with backward compatibility period. Deprecation notice via response header `Sunset: Sat, 01 Nov 2026 23:59:59 GMT`. Minimum 6 months between deprecation notice and removal. Breaking changes: new major version. Additive changes: backward-compatible minor version.

## Rules
- Every table has row-level security — no table exposed without filter
- Admin secret never committed, never in client code
- JWT or webhook authentication required for all non-anonymous access
- Rate limiting configured per role, per endpoint
- Cache headers set on all read-only queries
- Real-time subscriptions limited to authenticated users
- No direct database connection from client — always through API
- PII columns excluded from non-privileged roles
- API documentation auto-generated (GraphQL introspection, OpenAPI)
- Mutation inputs validated at API layer (not just DB constraints)
- Include versioning strategy from day one (even if v1 only)
- Set timeouts on all database connections (query_timeout, pool_timeout)
- Log API errors with correlation IDs for debugging
- Health-check endpoint returns database status and latency

## References
  - references/data-api-error-handling.md — Data API Error Handling
  - references/data-api-patterns.md — Data API Patterns
  - references/data-api-security.md — Data API Security Reference
  - references/data-api-versioning.md — Data API Versioning
  - references/graphql-for-data.md — GraphQL for Data Reference
  - references/hasura-postgrest.md — Hasura & PostgREST
## Architecture Decision Trees

```
Data API Protocol Selection
├── Complex nested queries with joins?
│   ├── Yes → GraphQL (Hasura, PostgREST)
│   └── No → REST (FastAPI, Django REST)
├── Real-time subscriptions needed?
│   ├── Yes → WebSocket / SSE via GraphQL subscriptions
│   └── No → REST with polling interval
├── Internal data mesh domains?
│   ├── Yes → gRPC with Protobuf for interservice
│   └── No → HTTP/JSON for external consumers
└── Mobile/low-bandwidth clients?
    ├── Yes → GraphQL with field selection
    └── No → REST (simpler caching)
```

**Decision criteria**: Consider query flexibility, real-time needs, client types, and team GraphQL expertise.

## Implementation Patterns

### Pagination Pattern
```python
# data_api/pagination.py
from fastapi import Query
from typing import Optional

class CursorPage:
    def __init__(self, items: list, cursor: Optional[str], has_more: bool):
        self.items = items
        self.cursor = cursor
        self.has_more = has_more

async def list_orders(
    cursor: Optional[str] = Query(None),
    limit: int = Query(default=50, le=100)
) -> CursorPage:
    query = "SELECT * FROM orders WHERE id > :cursor ORDER BY id LIMIT :limit"
    items = await db.fetch_all(query, {"cursor": cursor or 0, "limit": limit + 1})
    has_more = len(items) > limit
    return CursorPage(
        items=items[:limit],
        cursor=str(items[-1]["id"]) if items else None,
        has_more=has_more
    )
```

### GraphQL Federation Pattern
```graphql
# data_api/supergraph.graphql
extend type Query {
  order(id: ID!): Order @resolve(topic: "orders")
  customer(id: ID!): Customer @resolve(topic: "customers")
}

type Order @key(fields: "id") {
  id: ID!
  total: Float!
  customerId: ID!
  customer: Customer @resolve(topic: "customers", key: "$.customerId")
}
```

## Production Considerations

- **Rate limiting**: Implement token bucket or sliding window per API key (1000 req/min default).
- **Connection pooling**: Set database pool size to `(2 × CPU cores) + 1` with timeout.
- **Circuit breaker**: Wrap external API calls with circuit breaker (5 failures → open for 30s).
- **Idempotency**: Require `Idempotency-Key` header for mutating endpoints to prevent duplicate writes.
- **Graceful degradation**: Return cached/stale data when upstream is unavailable.
- **API versioning**: Use URL prefix `/v1/` or Accept header; maintain LTS versions for 6 months.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| N+1 queries in REST endpoints | Severe latency | GraphQL batching or SQL JOINs |
| No pagination defaults | DB crashes on large scans | Always enforce cursor/offset pagination |
| Exposing DB IDs externally | Security through obscurity | Use UUIDs or hashids |
| Over-fetching in mobile apps | High bandwidth costs | GraphQL field selection |
| Synchronous long-running requests | Connection pool exhaustion | Async processing with status endpoints |

## Performance Optimization

- **Query optimization**: Profile with `EXPLAIN ANALYZE`; add composite indexes for filter+sort patterns.
- **Response compression**: Enable gzip/brotli on reverse proxy for JSON responses.
- **Batch loading**: Use DataLoader pattern for GraphQL to batch DB queries.
- **CDN caching**: Cache GET endpoints at CDN (CloudFront/Cloudflare) with short TTLs (30-60s).
- **Connection keepalive**: Set HTTP keepalive timeout to 60s reduce TLS handshake overhead.

## Security Considerations

- **Authentication**: Enforce OAuth 2.0 / OIDC; issue JWTs with short expiry (15 min) and refresh tokens.
- **Authorization**: Implement attribute-based access control (ABAC) at the API gateway.
- **Input validation**: Validate all inputs against OpenAPI/schema; reject unexpected fields.
- **SQL injection**: Use parameterized queries exclusively; never interpolate user input.
- **CORS**: Restrict origins to known domains; do not use `Access-Control-Allow-Origin: *`.
- **Secrets management**: Store API keys and DB credentials in vault (HashiCorp Vault, AWS Secrets Manager).

## Handoff
`data-data-platform` for deployment infrastructure. `data-data-catalog` for API endpoint documentation. `data-data-observability` for API monitoring. `data-data-contracts` for API schema contracts.
