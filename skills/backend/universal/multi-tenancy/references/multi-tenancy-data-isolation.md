# Multi-Tenancy Data Isolation

## Overview

Data isolation is the foundational concern of any multi-tenant system. It determines how tenant data is separated at the storage layer, how queries are scoped, and how the system guarantees that one tenant cannot access another tenant's data. This reference covers the three canonical isolation strategies, their hybrid combinations, and the implementation patterns that enforce isolation at every layer of the application stack.

## Isolation Strategies In Depth

### Row-Level Isolation (Shared Database, Shared Schema)

In row-level isolation, all tenants share the same database and schema. Tenant data is distinguished by a `tenant_id` column on every table. This is the most cost-efficient strategy but provides the weakest isolation guarantee.

**Implementation pattern:**

```sql
-- Every tenant-aware table includes tenant_id
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_name TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every query MUST filter by tenant_id
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
```

**PostgreSQL Row-Level Security (defense in depth):**

```sql
-- Enable RLS on the table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create a policy that uses session variable for tenant ID
CREATE POLICY tenant_isolation_policy ON orders
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Create a policy for service accounts that can operate across tenants
CREATE POLICY service_account_policy ON orders
  FOR SELECT
  USING (current_setting('app.role') = 'service_account');

-- Set the tenant ID at the start of each request
SELECT set_config('app.tenant_id', $1, true);  -- $1 = tenant UUID
```

**Pros:**
- Lowest operational complexity. Single database to manage, back up, and monitor.
- Best resource utilization. Database connections, memory, and CPU are shared efficiently.
- Schema changes are applied once to all tenants simultaneously.
- Supports the highest number of tenants (hundreds of thousands).
- Easiest to implement cross-tenant analytics and reporting.

**Cons:**
- Weakest isolation. A missing `WHERE tenant_id = ?` clause leaks data globally.
- Noisy neighbor problem. One tenant's heavy query or large dataset degrades performance for all.
- Backup and restore are all-or-nothing at the database level. No per-tenant restore without complex tooling.
- Compliance audits are harder because data is physically co-located.
- Table size grows with all tenants combined, making maintenance operations (VACUUM, reindexing) more expensive.

**Best for:**
- B2C applications with many small tenants (thousands to millions).
- Free or low-tier SaaS plans where cost efficiency is paramount.
- Internal tools where all tenants belong to the same organization.
- Applications where regulatory data isolation is not required.

### Schema-Per-Tenant Isolation (Shared Database, Separate Schemas)

Each tenant gets its own database schema (e.g., `tenant_abc123`, `tenant_def456`) within a shared database. Tables are identical across schemas but data is physically separated.

**Implementation pattern:**

```sql
-- Provision a new tenant schema
CREATE SCHEMA IF NOT EXISTS tenant_{tenant_id};
GRANT USAGE ON SCHEMA tenant_{tenant_id} TO app_user;

-- Create identical tables in the new schema
CREATE TABLE tenant_{tenant_id}.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set search_path per connection
SET search_path TO tenant_{tenant_id}, public;
```

**Connection-level routing with connection pooling:**

```python
import psycopg2
from psycopg2 import pool

class SchemaRouter:
    def __init__(self, conn_string: str, max_connections: int = 20):
        self.pool = pool.ThreadedConnectionPool(1, max_connections, conn_string)

    def get_connection(self, tenant_id: str):
        conn = self.pool.getconn()
        with conn.cursor() as cur:
            cur.execute(f"SET search_path TO tenant_{tenant_id}, public")
        return conn

    def return_connection(self, conn):
        with conn.cursor() as cur:
            cur.execute("SET search_path TO public")
        self.pool.putconn(conn)
```

**Pros:**
- Strong logical isolation. Schema separation prevents cross-tenant data leaks at the database level.
- Per-tenant backup and restore is possible by backing up individual schemas.
- Schema changes can be rolled out per tenant (blue-green migration for critical tenants).
- Queries are naturally isolated — no risk of missing a tenant filter on a JOIN.
- Database maintenance (VACUUM, ANALYZE) is per-schema, limiting blast radius.
- Can support thousands of tenants (PostgreSQL handles up to ~10,000 schemas before metadata bloat becomes significant).

**Cons:**
- PostgreSQL metadata overhead grows with schema count. pg_catalog queries slow down above ~5,000 schemas.
- Connection pooling is more complex because each connection must set the correct search_path.
- Shared sequences across schemas are not possible — use UUIDs.
- Schema migration tools (e.g., Alembic, Flyway) need modification to run migrations per schema.
- Cross-tenant reporting requires UNION ALL across all schemas, which is slow.

**Best for:**
- B2B applications with medium-sized tenants (dozens to low thousands).
- Products where tenants have different configuration or extension needs.
- Applications that require per-tenant backup and restore capabilities.
- Regulated industries where data separation is required but dedicated databases are overkill.

### Database-Per-Tenant Isolation (Separate Databases)

Each tenant gets a completely separate database (or even separate database server). This provides the strongest isolation at the highest operational cost.

**Implementation pattern:**

```python
import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

class DatabaseRouter:
    def __init__(self, tenant_config_path: str):
        with open(tenant_config_path) as f:
            self.tenant_configs = json.load(f)
        self.engines = {}
        self.session_makers = {}

    def get_session(self, tenant_id: str):
        if tenant_id not in self.engines:
            config = self.tenant_configs[tenant_id]
            self.engines[tenant_id] = create_engine(
                config['database_url'],
                pool_size=config.get('pool_size', 5),
                max_overflow=config.get('max_overflow', 10),
                pool_recycle=3600,
            )
            self.session_makers[tenant_id] = sessionmaker(bind=self.engines[tenant_id])
        return self.session_makers[tenant_id]()

    def provision_database(self, tenant_id: str, plan: str):
        # Create database
        template_db = f"template_{plan}"  # Pre-created template databases per plan
        db_name = f"tenant_{tenant_id}"
        engine = create_engine(self.master_dsn, isolation_level='AUTOCOMMIT')
        engine.execute(f"CREATE DATABASE {db_name} TEMPLATE {template_db}")
        engine.dispose()
        # Register in config
        self.tenant_configs[tenant_id] = {
            'database_url': os.environ['DB_URL_PREFIX'] + db_name,
            'pool_size': 5 if plan == 'starter' else 20,
        }
        self._save_config()
```

**Pros:**
- Maximum isolation. No shared infrastructure means no shared failure risk.
- Per-tenant performance tuning (dedicated indexes, vacuum schedules, connection limits).
- Compliance-friendly: each tenant's data can be stored in a specific region.
- True per-tenant backup, restore, and point-in-time recovery.
- Upgrades and schema migrations can be scheduled per tenant without coordination.
- No noisy neighbor problem — tenants cannot affect each other's performance.

**Cons:**
- Highest operational cost. Managing N databases is significantly more expensive than one.
- Connection management overhead. Each database requires separate connection pools.
- Schema migrations must be applied N times (once per database).
- Monitoring complexity: need per-database metrics for query performance, disk usage, replication lag.
- Hardware provisioning must account for peak load across all databases simultaneously.
- Cross-tenant reporting requires federated queries or a separate analytics data warehouse.

**Best for:**
- Enterprise customers with strict compliance requirements (GDPR, SOC 2 Type II, HIPAA, PCI-DSS).
- Large tenants (millions of rows) that need dedicated performance.
- Products where per-tenant SLA guarantees are contractually required.
- White-label SaaS where each tenant needs its own database branding or configuration.

## Hybrid and Tiered Isolation

Most production SaaS systems use a hybrid approach where isolation level depends on the tenant's plan or tier:

```python
def get_isolation_strategy(tenant: Tenant) -> str:
    if tenant.plan == 'enterprise':
        return 'database_per_tenant'
    elif tenant.plan in ['pro', 'business']:
        return 'schema_per_tenant'
    else:
        return 'row_level'

class TenantDataAccessor:
    def get_orders(self, tenant: Tenant, order_id: UUID) -> Order:
        strategy = get_isolation_strategy(tenant)
        if strategy == 'database_per_tenant':
            db = db_router.get_session(tenant.id)
            return db.query(Order).filter(Order.id == order_id).one()
        elif strategy == 'schema_per_tenant':
            conn = schema_router.get_connection(tenant.id)
            return query_with_schema(conn, tenant.id, order_id)
        else:
            return shared_db.query(Order).filter(
                Order.id == order_id,
                Order.tenant_id == tenant.id,
            ).one()
```

**Tiered isolation architecture:**

```
┌──────────────────────────────────────────────────────────┐
│                    Application Layer                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │ Free Tier  │  │  Pro Tier  │  │ Enterprise Tier    │  │
│  │ (Row-Level)│  │ (Schema)   │  │ (DB-per-tenant)   │  │
│  └──────┬─────┘  └──────┬─────┘  └─────────┬──────────┘  │
└─────────┼───────────────┼──────────────────┼──────────────┘
          │               │                  │
┌─────────▼───────────────▼──────────────────▼──────────────┐
│                     Data Layer                              │
│  ┌─────────────────────┐  ┌─────────────────────────┐      │
│  │ Shared Database     │  │ Enterprise Database     │      │
│  │ - free_orders       │  │ - tenant_ent1.orders    │      │
│  │ - pro_schema1.orders│  │ - tenant_ent2.orders    │      │
│  │ - pro_schema2.orders│  │ - tenant_ent3.orders    │      │
│  └─────────────────────┘  └─────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## Enforcing Isolation at Application Layers

### API Layer
- Extract tenant ID from JWT or API key before routing to business logic.
- Validate tenant ID against allowed tenants for the authenticated user.
- Never accept tenant ID as a route or query parameter from unauthenticated requests.

```typescript
// Express middleware for tenant extraction and validation
async function tenantGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' });

  try {
    const decoded = jwt.verify(authHeader, process.env.JWT_SECRET);
    const tenantId = decoded.tenant_id;
    const userId = decoded.sub;

    // Verify user belongs to this tenant
    const membership = await membershipRepo.find(userId, tenantId);
    if (!membership) return res.status(403).json({ error: 'not_tenant_member' });

    req.tenantId = tenantId;
    req.userId = userId;
    req.tenantRoles = membership.roles;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
```

### Service Layer
- Pass tenant context explicitly to all service methods.
- Validate tenant access for cross-service calls (internal service-to-service calls must also carry tenant context).

```go
// Go service with explicit tenant context
type ServiceContext struct {
    TenantID string
    UserID   string
    Roles    []string
}

type OrderService struct {
    repo   OrderRepository
    cache  *redis.Client
}

func (s *OrderService) GetOrder(ctx context.Context, svcCtx ServiceContext, orderID string) (*Order, error) {
    // Cache with tenant prefix
    cacheKey := fmt.Sprintf("tenant:%s:order:%s", svcCtx.TenantID, orderID)

    // Check cache
    if cached, err := s.cache.Get(ctx, cacheKey).Result(); err == nil {
        var order Order
        json.Unmarshal([]byte(cached), &order)
        return &order, nil
    }

    // Database query with tenant filter
    order, err := s.repo.FindByID(ctx, orderID, svcCtx.TenantID)
    if err != nil {
        return nil, err
    }

    // Cache result
    data, _ := json.Marshal(order)
    s.cache.Set(ctx, cacheKey, data, 5*time.Minute)

    return order, nil
}
```

### Background Job Layer
- Background jobs must carry tenant context explicitly in job payloads.
- Never assume the job runner has ambient tenant context.

```python
from celery import Task

class TenantAwareTask(Task):
    abstract = True

    def __call__(self, *args, **kwargs):
        tenant_id = kwargs.pop('tenant_id', None)
        if tenant_id is None:
            raise ValueError("tenant_id is required for background tasks")
        # Set tenant context for the duration of this task
        with tenant_context.set(tenant_id):
            return super().__call__(*args, **kwargs)

@celery.task(base=TenantAwareTask)
def send_invoice_email(tenant_id: str, invoice_id: str):
    # tenant_id is available and set in async local storage
    invoice = get_invoice(invoice_id)  # Automatically scoped
    send_email(invoice.customer_email, invoice.render())
```

### Data Access Layer
- Repository methods always accept tenant ID as a parameter.
- ORM global filters automatically append tenant conditions.
- Raw SQL queries must include tenant_id in WHERE clauses.

```java
// Spring Data JPA with tenant-aware repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    @Query("SELECT o FROM Order o WHERE o.tenantId = :tenantId AND o.id = :orderId")
    Optional<Order> findByIdAndTenant(@Param("orderId") UUID orderId,
                                      @Param("tenantId") UUID tenantId);

    @Query("SELECT o FROM Order o WHERE o.tenantId = :tenantId")
    Page<Order> findAllByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);
}

// JPA Entity Listener for automatic tenant filtering
public class TenantEntityListener {
    @PrePersist
    public void setTenant(Object entity) {
        if (entity instanceof TenantAware) {
            ((TenantAware) entity).setTenantId(TenantContext.getCurrentTenantId());
        }
    }
}
```

## Testing Data Isolation

### Isolation Test Suite

```typescript
describe('Data Isolation', () => {
  let tenantA: TestContext;
  let tenantB: TestContext;

  beforeAll(async () => {
    tenantA = await setupTenant('tenant-a');
    tenantB = await setupTenant('tenant-b');
  });

  it('tenant A should not see tenant B orders via direct query', async () => {
    const tenantAOrder = await createOrder(tenantA.api, { customer: 'Alice' });
    const tenantBOrder = await createOrder(tenantB.api, { customer: 'Bob' });

    const tenantAOrders = await tenantA.api.get('/orders');
    const orderIds = tenantAOrders.data.map(o => o.id);

    expect(orderIds).toContain(tenantAOrder.id);
    expect(orderIds).not.toContain(tenantBOrder.id);
  });

  it('tenant A should not see tenant B data via JOINs', async () => {
    const result = await tenantA.api.get('/orders-with-details');
    // Verify that no tenant B data appears in joined tables
    const tenantIds = new Set(result.data.map(r => r.tenant_id));
    expect(tenantIds.size).toBe(1);
    expect(tenantIds.has(tenantA.tenantId)).toBe(true);
  });

  it('should reject cross-tenant IDOR attempts', async () => {
    const tenantBOrder = await createOrder(tenantB.api, { customer: 'Bob' });
    const response = await tenantA.api.get(`/orders/${tenantBOrder.id}`);
    expect(response.status).toBe(404); // Not 403 — never reveal existence
  });

  it('should enforce isolation in bulk operations', async () => {
    const response = await tenantA.api.post('/orders/bulk-delete', {
      orderIds: [] // Would include tenant B IDs in an attack scenario
    });
    // Verify tenant B data was not affected
    const tenantBOrders = await tenantB.api.get('/orders');
    expect(tenantBOrders.data.length).toBe(1);
  });
});
```

### Chaos Engineering for Isolation
- Randomly probe cross-tenant access paths in production.
- Run fuzz testing on API endpoints with tenant IDs swapped.
- Audit all SQL queries in production for missing tenant filters using query analysis tools.

## Cross-Cutting Concerns

### Indexing Strategy
```sql
-- Row-level: always include tenant_id as the leading column
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE UNIQUE INDEX idx_orders_tenant_ref ON orders(tenant_id, reference_number);

-- Schema-level: indexes are per-schema, no tenant_id needed
-- Create identical indexes in each tenant schema
CREATE INDEX idx_orders_created ON tenant_{id}.orders(created_at DESC);
```

### Monitoring Isolation
- Track per-tenant query latency, error rates, and throughput.
- Alert on sudden changes in per-tenant metrics (may indicate data leak or noisy neighbor).
- Maintain dashboard: "Top 10 tenants by query volume", "Tenants with highest error rate".

### Disaster Recovery
- Row-level: database-level backup and restore. For single-tenant restore, extract from full backup using tenant_id filter.
- Schema-per-tenant: pg_dump per schema. Restore individual schema from backup.
- DB-per-tenant: pg_dump per database. Restore individual database.

## References
- references/isolation-strategies.md — Isolation Strategies Overview
- references/data-partitioning.md — Data Partitioning at Scale
- references/multi-tenancy-monitoring.md — Multi-Tenancy Monitoring
- references/multi-tenancy-testing.md — Multi-Tenancy Testing
- references/tenant-provisioning.md — Tenant Provisioning
