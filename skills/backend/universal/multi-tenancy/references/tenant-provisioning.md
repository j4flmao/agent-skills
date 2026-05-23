# Tenant Provisioning

## Provisioning Flow

1. Tenant signs up → generate `tenant_id` (UUID)
2. Create isolation unit (row, schema, or DB)
3. Run migrations for that tenant
4. Seed default data (roles, settings)
5. Configure routing (subdomain/DNS)

```python
async def provision_tenant(name: str) -> str:
    tenant_id = str(uuid.uuid4())
    schema = f"tenant_{tenant_id.replace('-', '_')}"

    async with admin_conn.cursor() as cur:
        await cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
        await cur.execute(f"SET search_path TO {schema}")
        await run_migrations(cur)

    await TenantConfig.create(
        id=tenant_id,
        schema=schema,
        status="active"
    )
    return tenant_id
```

## Migration Strategies

| Strategy | Description |
|----------|-------------|
| Serial migration | Run per-tenant migrations one by one. Safe but slow for 1000+ tenants. |
| Parallel batches | Migrate N tenants concurrently. Track completion per tenant. |
| Lazy migration | Migrate on first access. Complex state tracking. |

## Connection Pooling

- **Row-level**: Single pool.
- **Schema-per-tenant**: Pool per pool group with schema routing.
- **DB-per-tenant**: Dynamic pool creation. Close idle pools.

```python
from sqlalchemy import create_engine
from functools import lru_cache

@lru_cache(maxsize=100)
def tenant_engine(tenant_id: str):
    db_url = f"postgresql:///tenant_{tenant_id}"
    return create_engine(db_url)
```

## Tenant Deactivation

- Set `status = "disabled"` — reject API requests.
- Graceful: complete in-flight requests, reject new ones.
- Data retention: archive DB/schema before deletion.
- Re-activation: restore from archive.
