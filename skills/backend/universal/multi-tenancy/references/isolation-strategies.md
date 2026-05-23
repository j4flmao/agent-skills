# Isolation Strategies

## Row-Level (Shared Database)

Single DB, single schema. All tenants share tables; a `tenant_id` column isolates rows.

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    amount DECIMAL NOT NULL
);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
```

**Pros**: Low operational cost, easy cross-tenant analytics.  
**Cons**: Noisy neighbor, harder to restore individual tenants, row leakage risk.

## Schema-Per-Tenant

Each tenant gets their own schema in a shared database.

```sql
CREATE SCHEMA tenant_abc;
CREATE TABLE tenant_abc.users (...);
```

**Pros**: Logical isolation, easier to restore one tenant.  
**Cons**: Shared connection pool, schema migration must run per tenant.

## Database-Per-Tenant

Each tenant gets their own database.

```python
DATABASES = {
    "tenant_abc": "postgresql://.../tenant_abc",
    "tenant_xyz": "postgresql://.../tenant_xyz",
}
```

**Pros**: Strongest isolation, independent scaling.  
**Cons**: Connection overhead, migration cost, backup complexity.

## Comparison

| Strategy | Isolation | Cost | Migration | Analytics |
|----------|-----------|------|-----------|-----------|
| Row-level | Low | Lowest | Easy | Easy |
| Schema-per-tenant | Medium | Medium | Per-schema | Medium |
| DB-per-tenant | High | Highest | Per-DB | Hard |

## Tenant Context Propagation

```python
from contextvars import ContextVar

current_tenant: ContextVar[str] = ContextVar("current_tenant")

async def resolve_tenant(request):
    tenant = request.headers.get("X-Tenant-ID")
    current_tenant.set(tenant)

def get_connection():
    tenant = current_tenant.get()
    return connections[tenant]
```

Use middleware to resolve tenant from header, JWT claim, or subdomain at every request.
