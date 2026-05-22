# Data API Patterns

## Authorization Patterns

### JWT-Based Auth

```yaml
# Hasura JWT config
HASURA_GRAPHQL_JWT_SECRET: |
  {
    "type": "HS256",
    "key": "${JWT_SECRET}",
    "claims_format": "json",
    "claims_map": {
      "x-hasura-allowed-roles": {"path": "$.roles"},
      "x-hasura-default-role": {"path": "$.default_role"},
      "x-hasura-user-id": {"path": "$.sub"}
    }
  }

# JWT payload from auth provider
{
  "sub": "user-abc123",
  "roles": ["authenticated", "data_analyst"],
  "default_role": "authenticated",
  "iat": 1747891200,
  "exp": 1747977600
}
```

### Webhook Auth

```yaml
# Hasura webhook mode
HASURA_GRAPHQL_AUTH_HOOK: https://auth.internal/validate
HASURA_GRAPHQL_AUTH_HOOK_MODE: GET

# Webhook response
# 200 OK:
{
  "x-hasura-user-id": "user-abc123",
  "x-hasura-role": "data_analyst",
  "x-hasura-allowed-roles": ["authenticated", "data_analyst"],
  "x-hasura-default-role": "authenticated"
}
# 401 Unauthorized → request rejected
```

## Rate Limiting

```nginx
# Nginx rate limiting for Hasura
limit_req_zone $http_x_hasura_role zone=data_api:10m rate=100r/s;

server {
    location /v1/graphql {
        limit_req zone=data_api burst=200 nodelay;
        proxy_pass http://hasura:8080;
    }
    location /v1/subscriptions {
        # No rate limit for websocket
        proxy_pass http://hasura:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Caching Strategy

```yaml
caching_rules:
  # Static reference data — cache long
  - table: product_categories
    max_age: 600
    scope: public

  # User-specific data — cache short, vary by user
  - table: orders
    max_age: 30
    scope: private
    vary: X-Hasura-User-Id

  # Aggregated metrics — cache medium
  - table: daily_revenue
    max_age: 300
    scope: public

  # Never cache real-time
  - table: live_events
    max_age: 0
```

## Performance Tuning

### Connection Pooling (PgBouncer)

```ini
[databases]
db = host=postgres port=5432 dbname=postgres

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
default_pool_size = 25
max_client_conn = 200
query_timeout = 30
```

### Query Optimization

```sql
-- Indexes for common API queries
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Materialized view for slow aggregations
CREATE MATERIALIZED VIEW daily_order_summary AS
SELECT
    DATE(created_at) AS day,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_revenue,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at);
```

## Monitoring & Observability

```yaml
# Prometheus metrics endpoints
hasura_metrics:
  - hasura_graphql_query_latency_seconds
  - hasura_graphql_subscription_count
  - hasura_active_connections
  - hasura_rate_limit_rejections_total
  - hasura_graphql_errors_total

# Sample alert rules
alerts:
  - metric: hasura_rate_limit_rejections_total
    condition: "> 100 in 5m"
    action: scale_up
  - metric: hasura_graphql_query_latency_seconds{p99}
    condition: "> 2.0"
    action: investigate_slow_queries
```

## Security Hardening

```yaml
security:
  # Admin secret rotation
  admin_secret_rotation_days: 30

  # Disable dangerous operations in production
  HASURA_GRAPHQL_ENABLE_CONSOLE: false
  HASURA_GRAPHQL_DEV_MODE: false
  HASURA_GRAPHQL_ENABLE_REMOTE_SCHEMA_PERMISSIONS: true

  # SQL passthrough disabled
  allow_raw_sql: false

  # Metadata API protection
  admin_role: admin
  metadata_apis: admin_only

  # Network
  database_host: db.internal
  api_port: 8080
  ssl: enforced
```
