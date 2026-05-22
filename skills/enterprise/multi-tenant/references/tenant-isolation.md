# Tenant Isolation Models

## Isolation Models Comparison

| Model | Isolation | Complexity | Cost | Tenant Count | Compliance |
|-------|-----------|------------|------|--------------|------------|
| DB per Tenant | Strongest | High | Highest | <500 | HIPAA, PCI, SOC2 |
| Schema per Tenant | Strong | Medium | Medium | <5000 | SOC2 |
| Row-Level | Moderate | Low | Lowest | 10k+ | Basic |

## DB per Tenant

### When to Use
- Regulated data (healthcare, finance, government)
- Enterprise customers with isolation requirements
- <500 tenants expected
- Premium pricing tier

### Implementation
```python
def get_tenant_db(tenant_id):
    config = tenant_config[tenant_id]
    return create_engine(
        f"postgresql://{config.db_user}:{config.db_pass}"
        f"@{config.db_host}:{config.db_port}/{config.db_name}"
    )
```

### Connection Pooling
- Pool per tenant connection
- Max pool size = 10 per active tenant
- Idle timeout = 300s
- Monitor connection count per tenant

### Migration Strategy
- Migrate one tenant at a time
- Maintenance windows per tenant
- Canary tenant first, then batch

## Schema per Tenant

### When to Use
- SOC2 compliance needed
- 500-5000 tenants
- Balanced cost and isolation

### Implementation
```sql
-- Create schema per tenant
CREATE SCHEMA IF NOT EXISTS tenant_{tenant_id};
SET search_path TO tenant_{tenant_id}, public;
```

### Connection Pooling
- Shared connection pool
- Schema set on connection checkout
- Pgbouncer with schema routing

### Migration Strategy
- Run migration across all schemas
- Use migration tool with schema iteration
- Lock per-schema to avoid conflicts

## Row-Level

### When to Use
- B2C SaaS with 10k+ tenants
- No compliance isolation requirements
- Lowest operational cost priority

### Implementation
```sql
-- Row-level security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

### Connection Pooling
- Single shared pool
- Max connections per app instance
- Tenant context via session variable

### Risks
- Bug in tenant filter leaks data
- Query planner ignores tenant filter
- ORM association mistakes

## Hybrid Approach

### Tiered Isolation
- Enterprise tier: DB per tenant
- Business tier: Schema per tenant
- Free tier: Row-level

### Routing Middleware
```
Request → API Gateway → Tenant Resolver → Connection Router → Target DB
```
