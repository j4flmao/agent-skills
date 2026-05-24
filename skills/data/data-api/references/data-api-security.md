# Data API Security Reference

## Authentication

### API Key Authentication

```yaml
# Hasura API key configuration
HASURA_GRAPHQL_ADMIN_SECRET: ${ADMIN_SECRET}
HASURA_GRAPHQL_UNAUTHORIZED_ROLE: anonymous

# API key management
# POST /v1/graphql with header:
# X-Hasura-Admin-Secret: <admin-secret>
# X-Hasura-Role: <role>
```

```sql
-- API key tracking table
CREATE TABLE api_keys (
    key_id UUID PRIMARY KEY,
    key_hash STRING NOT NULL,       -- SHA-256 of the API key
    key_prefix STRING NOT NULL,     -- First 8 chars for identification
    key_name STRING,
    role STRING NOT NULL,
    owner STRING,
    allowed_ips ARRAY<STRING>,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    last_used_at TIMESTAMP,
    rate_limit_per_minute INT DEFAULT 100
);

-- API key verification
SELECT * FROM api_keys
WHERE key_hash = SHA256(:api_key)
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  AND (allowed_ips IS NULL OR :client_ip IN UNNEST(allowed_ips));
```

### JWT Authentication

```yaml
# Hasura JWT config
HASURA_GRAPHQL_JWT_SECRET: '{"type":"HS256","key":"${JWT_SECRET}"}'
HASURA_GRAPHQL_JWT_CONF: |
  {
    "audience": "data-api",
    "issuer": "https://auth.internal.com",
    "claims_map": {
      "x-hasura-allowed-roles": {"path": "$.roles"},
      "x-hasura-default-role": {"path": "$.default_role"},
      "x-hasura-user-id": {"path": "$.sub"},
      "x-hasura-org-id": {"path": "$.org_id"}
    }
  }
```

```javascript
// JWT claims for data API
{
  "sub": "user_abc123",
  "roles": ["customer", "analyst"],
  "default_role": "customer",
  "org_id": "org_xyz789",
  "iat": 1712345678,
  "exp": 1712432078,
  "aud": "data-api",
  "iss": "https://auth.internal.com"
}
```

### OAuth 2.0 / OIDC

```yaml
# Hasura OIDC configuration
HASURA_GRAPHQL_SSO_PROVIDERS: |
  [{
    "client_id": "${AUTH0_CLIENT_ID}",
    "client_secret": "${AUTH0_CLIENT_SECRET}",
    "domain": "https://tenant.auth0.com",
    "authorization_url": "https://tenant.auth0.com/authorize",
    "token_url": "https://tenant.auth0.com/oauth/token",
    "userinfo_url": "https://tenant.auth0.com/userinfo",
    "scope": "openid profile email",
    "claims_map": {
      "x-hasura-allowed-roles": {"path": "$.app_metadata.roles"},
      "x-hasura-default-role": {"path": "$.app_metadata.default_role"}
    }
  }]
```

## Authorization

### Row-Level Security (RLS)

```sql
-- PostgreSQL RLS for multi-tenant data access
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: user sees only their org's data
CREATE POLICY tenant_isolation ON orders
    FOR ALL
    USING (org_id = current_setting('request.jwt.claims')::json->>'org_id');

-- Role-based: analysts see all non-PII
CREATE POLICY analyst_access ON orders
    FOR SELECT
    TO analyst
    USING (true);

-- Role-based: admins can update orders
CREATE POLICY admin_update ON orders
    FOR UPDATE
    TO admin
    USING (true)
    WITH CHECK (true);
```

### Column-Level Security

```yaml
# Hasura column-level permissions
- table:
    schema: public
    name: customers
  select_permissions:
    - role: customer_self
      permission:
        filter:
          id: { _eq: X-Hasura-User-Id }
        columns:
          - id
          - name
          - email
          - phone
          - preferences
    - role: analyst
      permission:
        filter: {}
        columns:
          - id
          - name
          - segment        # PII columns excluded
          - region
    - role: admin
      permission:
        filter: {}
        columns: []        # all columns
```

### Attribute-Based Access Control (ABAC)

```python
# ABAC policy evaluation
def check_access(user, resource, action, context):
    """Evaluate ABAC policies for data API access."""
    policies = {
        "view_sensitive_data": (
            user.role == "admin"
            or (user.role == "analyst" and resource.classification == "internal")
            or (user.role == "customer" and resource.owner_id == user.id)
        ),
        "export_data": (
            user.role == "admin"
            or (user.role == "analyst" and context.purpose == "reporting")
        ),
        "delete_data": (
            user.role == "admin"
            and context.time_of_day.hour in range(6, 22)
        ),
    }
    return policies.get(action, False)
```

## Rate Limiting

### Per-Role Rate Limits

```yaml
# Hasura rate limiting (via reverse proxy or env vars)
rate_limits:
  anonymous:
    requests_per_minute: 10
    queries_per_minute: 5
    mutations_per_minute: 0
  authenticated:
    requests_per_minute: 100
    queries_per_minute: 80
    mutations_per_minute: 20
  analyst:
    requests_per_minute: 500
    queries_per_minute: 400
    mutations_per_minute: 100
  admin:
    requests_per_minute: 1000
    queries_per_minute: 800
    mutations_per_minute: 200
```

### Nginx Rate Limiting

```nginx
# nginx rate limiting for data API
limit_req_zone $http_x_hasura_role zone=api_rates:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=ip_rate:10m rate=50r/s;

server {
    location /v1/graphql {
        limit_req zone=api_rates burst=200 nodelay;
        limit_req zone=ip_rate burst=100 nodelay;
        proxy_pass http://hasura:8080;
    }

    location /v1/metadata {
        limit_req zone=admin_rates burst=10;
        proxy_pass http://hasura:8080;
        allow 10.0.0.0/8;
        deny all;
    }
}
```

### Rate Limit Headers

```python
def apply_rate_limits(role: str, current_count: int) -> dict:
    """Calculate rate limit headers."""
    limits = {
        "anonymous": 10,
        "authenticated": 100,
        "analyst": 500,
        "admin": 1000,
    }
    limit = limits.get(role, 10)
    remaining = max(0, limit - current_count)
    return {
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(int(time.time() + 60)),
    }
```

## Audit Logging

### Audit Log Schema

```sql
CREATE TABLE api_audit_log (
    log_id UUID PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id STRING,
    user_role STRING,
    ip_address STRING,
    user_agent STRING,
    query_hash STRING,            -- SHA-256 of normalized query
    query_text STRING,            -- Original query text
    operation_type STRING,        -- query, mutation, subscription
    graphql_operation STRING,     -- operation name
    variables JSON,
    response_status INT,          -- HTTP status code
    response_size_bytes INT,
    execution_duration_ms INT,
    rows_returned INT,
    affected_rows INT,
    cache_hit BOOLEAN,
    error_message STRING,
    policy_violations ARRAY<STRING>
);

-- Index for audit queries
CREATE INDEX idx_audit_user ON api_audit_log(user_id, timestamp);
CREATE INDEX idx_audit_operation ON api_audit_log(operation_type, timestamp);
CREATE INDEX idx_audit_errors ON api_audit_log(response_status) WHERE response_status >= 400;
```

### Audit Log Query Patterns

```sql
-- Suspicious activity: auth failures
SELECT
    ip_address,
    COUNT(*) AS failure_count,
    MIN(timestamp) AS first_failure,
    MAX(timestamp) AS last_failure
FROM api_audit_log
WHERE response_status = 401
  AND timestamp >= DATEADD('hour', -1, CURRENT_TIMESTAMP)
GROUP BY ip_address
HAVING COUNT(*) > 10;

-- Slow queries (performance regression)
SELECT
    query_hash,
    query_text,
    COUNT(*) AS execution_count,
    AVG(execution_duration_ms) AS avg_duration,
    MAX(execution_duration_ms) AS max_duration
FROM api_audit_log
WHERE timestamp >= DATEADD('day', -7, CURRENT_TIMESTAMP)
GROUP BY query_hash, query_text
HAVING AVG(execution_duration_ms) > 5000
ORDER BY avg_duration DESC;

-- Data export audit (sensitive data access)
SELECT
    user_id,
    query_text,
    rows_returned,
    timestamp
FROM api_audit_log
WHERE query_text LIKE '%customers%'
  AND (query_text LIKE '%email%' OR query_text LIKE '%phone%')
  AND rows_returned > 1000
ORDER BY timestamp DESC;
```

## Web Application Firewall (WAF)

### WAF Rules for GraphQL

```nginx
# WAF: Block dangerous GraphQL patterns
# Block introspection in production
if ($request_body ~ "introspection") {
    return 403;
}

# Block field suggestions
if ($request_body ~ "suggestions") {
    return 403;
}

# Block depth attacks
if ($request_body ~ "\.\w+\(.*\)\s*\{[^}]*\{[^}]*\{[^}]*\{") {
    return 403;
}

# Block SQL injection in variables
if ($request_body ~* "(\bSELECT\b|\bDROP\b|\bUNION\b|\bINSERT\b)") {
    return 403;
}
```

### Query Complexity Analysis

```python
# GraphQL query cost analysis
QUERY_COSTS = {
    "orders": {"base": 1, "per_row": 0.01},
    "customers": {"base": 1, "per_row": 0.02},
    "products": {"base": 1, "per_row": 0.005},
    "payments": {"base": 2, "per_row": 0.05},
}

def calculate_query_cost(query: dict, role: str) -> float:
    """Estimate query cost based on resource weights."""
    cost = 0
    cost_limits = {"customer": 50, "analyst": 200, "admin": 1000}

    for field, args in extract_fields(query).items():
        if field in QUERY_COSTS:
            row_limit = args.get("limit", 100)
            cost += QUERY_COSTS[field]["base"] + QUERY_COSTS[field]["per_row"] * row_limit

    limit = cost_limits.get(role, 10)
    if cost > limit:
        raise PermissionError(f"Query cost {cost} exceeds limit {limit} for role {role}")
    return cost
```

## Rules
- Every API endpoint must authenticate (API key, JWT, or OAuth)
- Row-level security for multi-tenant data — never trust client-side filtering
- Column-level security to protect PII from non-privileged roles
- Rate limit per role with decreasing limits for more privileged roles
- Log every API request with user, query, duration, and row count
- Set WAF rules to block introspection, depth attacks, and injection attempts
- Use query cost analysis to prevent expensive queries from impacting system
- Rotate API keys regularly (every 90 days minimum)
- Never log sensitive data (passwords, tokens, PII) in audit logs
- Run regular security audits against API access patterns
