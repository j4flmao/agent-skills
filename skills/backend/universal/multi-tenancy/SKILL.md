---
name: backend-multi-tenancy
description: >
  Use this skill when the user says 'multi-tenancy', 'SaaS', 'tenant isolation', 'row-level security', 'DB per tenant', 'schema per tenant', 'tenant provisioning', 'tenant migration', 'multi-tenant database', 'tenant context'. This skill implements tenant isolation strategies: row-level, schema-per-tenant, and DB-per-tenant with provisioning and migration. Applies to any backend stack. Do NOT use for: single-tenant applications, IAM/authentication, or RBAC within a single organization.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, multi-tenancy, saas, tenant-isolation]
---

# Backend Multi-Tenancy

## Purpose
Implement tenant isolation in a SaaS application using row-level, schema-per-tenant, or DB-per-tenant strategies with automated provisioning and safe migrations. The core challenge is guaranteeing that no tenant can access another tenant's data while balancing operational complexity, cost, and compliance requirements.

## Architecture/Decision Trees

### Isolation Strategy Decision Tree

```
Is regulatory compliance required (GDPR/SOC 2/HIPAA)?
  |-- YES --> Do tenants require full data separation?
  |     |-- YES --> DB-per-tenant (highest isolation)
  |     |-- NO  --> Schema-per-tenant
  |-- NO --> Expected tenant count?
        |-- < 100, B2B --> Schema-per-tenant
        |-- >= 100, B2C --> Row-level (shared database)
        |-- Mixed (B2B+B2C) --> Hybrid: row-level for B2C, schema for B2B
```

### Hybrid Strategy Matrix
| Tier      | Isolation | Database | Provisioning | Backup |
|-----------|-----------|----------|--------------|--------|
| Free      | Row-level | Shared   | Auto (self)  | Global |
| Pro       | Schema    | Shared   | Auto (self)  | Global |
| Enterprise| DB        | Dedicated| Manual       | Per-tenant|

## Agent Protocol

### Trigger
Exact user phrases: "multi-tenancy", "SaaS", "tenant isolation", "row-level security", "DB per tenant", "schema per tenant", "tenant provisioning", "tenant migration", "multi-tenant database", "tenant context".

### Input Context
- Number of tenants (current and projected).
- Regulatory requirements (GDPR, SOC 2, HIPAA).
- Database technology and hosting model.
- Existing authentication/user system.
- Pricing tiers and tenant size distribution.
- Team operational capacity for managing per-tenant infrastructure.

### Output Artifact
Tenant isolation configuration or implementation plan. No file unless requested.

### Response Format
```
Strategy: {Row-level|Schema-per-tenant|DB-per-tenant}
Isolation Level: {shared|semi-isolated|fully-isolated}
Provisioning: {automated|manual}
Migration: {shared schema|per-tenant}
```

### Completion Criteria
- [ ] Isolation strategy chosen based on requirements.
- [ ] Tenant context propagated through all layers.
- [ ] All queries scoped to current tenant.
- [ ] Tenant provisioning automated.
- [ ] Migrations run safely across all tenants.
- [ ] Cross-tenant access audit logging configured.
- [ ] Backup strategy accounts for per-tenant restore requirements.

### Max Response Length
4 lines per isolation strategy. 20 lines for full plan.

## Workflow

### Step 1: Choose Isolation Strategy
| Strategy | Isolation | Complexity | Cost | Best For |
|----------|-----------|------------|------|----------|
| Row-level | Lowest | Low | Low | B2C, many small tenants |
| Schema-per-tenant | Medium | Medium | Medium | B2B, medium tenants |
| DB-per-tenant | Highest | High | High | Enterprise, regulated |

### Step 2: Implement Tenant Context
```javascript
// Middleware extracts tenant from auth token
async function tenantMiddleware(req, res, next) {
  const token = decodeJWT(req.headers.authorization);
  req.tenantId = token.tenant_id;
  // Validate tenant is active and not suspended
  const tenant = await tenantCache.get(req.tenantId);
  if (!tenant || tenant.status !== 'active') {
    return res.status(403).json({ error: 'tenant_inactive' });
  }
  // Set in async local storage for ORM access
  asyncLocalStorage.run({ tenantId: req.tenantId, tenant }, next);
}
```

### Step 3: Scope All Queries (Row-Level)
```javascript
// Prisma example: global middleware appends tenant filter
prisma.$use(async (params, next) => {
  const tenantId = asyncLocalStorage.getStore()?.tenantId;
  if (tenantId && params.model && !params.args.where?.tenantId) {
    params.args.where = { ...params.args.where, tenantId };
  }
  return next(params);
});
```

### Step 4: Automate Tenant Provisioning
```sql
-- For schema-per-tenant
CREATE SCHEMA IF NOT EXISTS tenant_{id};
-- Apply migrations to tenant schema
SELECT migrate_tenant('tenant_{id}');
-- Seed default data for new tenant
INSERT INTO tenant_{id}.settings (key, value) VALUES ('theme', 'default');
```

### Step 5: Handle Data Isolation at Rest
- Row-level: `WHERE tenant_id = ?` on every query.
- Schema-per-tenant: search_path or schema-qualified tables.
- DB-per-tenant: connection string per tenant in a registry.

### Step 6: Migrate Safely
```bash
# For shared schema: add nullable column, backfill, then NOT NULL
# For per-tenant: iterate tenants, migrate one by one
# Use a migration orchestration table to track per-tenant progress
```

```typescript
// Per-tenant migration runner
async function migrateTenants(migrationName: string, migrationFn: (schema: string) => Promise<void>) {
  const tenants = await tenantRepository.listActive();

  // Use batch processing with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < tenants.length; i += BATCH_SIZE) {
    const batch = tenants.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (tenant) => {
        const schema = `tenant_${tenant.id}`;
        try {
          await migrationFn(schema);
          await migrationTracker.recordSuccess(tenant.id, migrationName);
          logger.info('Migration applied', { tenant: tenant.id, migration: migrationName });
        } catch (err) {
          await migrationTracker.recordFailure(tenant.id, migrationName, err);
          logger.error('Migration failed', { tenant: tenant.id, migration: migrationName, error: err });
        }
      })
    );
  }
}
```

### Step 7: Implement Tenant-Aware Caching
- Cache keys must include tenant ID prefix.
- Bust cache scoped to tenant, not globally.
- Consider per-tenant Redis namespaces for shared Redis clusters.

### Step 8: Handle Tenant Deletion and Data Retention
- Soft-delete: mark tenant as inactive, retain data per retention policy.
- Hard-delete: purge all tenant data, take final backup before deletion.
- Anonymization: replace PII with anonymized tokens for analytics retention.

### Step 9: Rate Limiting Per Tenant

```typescript
class TenantRateLimiter {
  async checkLimit(tenantId: string): Promise<boolean> {
    const key = `ratelimit:tenant:${tenantId}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.pexpire(key, 1000);  // 1 second window
    }
    return current <= 1000;  // max 1000 requests/second per tenant
  }
}
```

### Step 10: PostgreSQL Row-Level Security (Defense in Depth)

```sql
-- Enable RLS on tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy that uses session setting
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Application sets tenant context at connection start
SET app.tenant_id = 'uuid-here';
```

## Models

### Tenant Context Propagation
```javascript
// Type-safe tenant context
class TenantContext {
  constructor(id, slug, plan, features, config) {
    this.id = id;
    this.slug = slug;
    this.plan = plan;
    this.features = features;
    this.config = config;
  }
}

// Usage: tenantContext.get() throughout application
const tenantContext = {
  get: () => asyncLocalStorage.getStore(),
  require: () => {
    const ctx = asyncLocalStorage.getStore();
    if (!ctx) throw new Error('No tenant context');
    return ctx;
  }
};
```

### Connection Pool Management (DB-per-tenant)
```python
# Python example: per-tenant connection pool registry
class TenantPoolRegistry:
    def __init__(self):
        self.pools = {}
        self.lock = Lock()

    def get_pool(self, tenant_id: str) -> Pool:
        if tenant_id not in self.pools:
            config = self.tenant_config[tenant_id]
            self.pools[tenant_id] = Pool(
                dsn=config['database_url'],
                min_size=2,
                max_size=10,
            )
        return self.pools[tenant_id]

    def remove_pool(self, tenant_id: str):
        with self.lock:
            if tenant_id in self.pools:
                self.pools[tenant_id].close()
                del self.pools[tenant_id]
```

### Background Job Tenant Propagation
```typescript
// Always pass tenant context to background jobs
interface JobPayload {
  tenantId: string;
  data: Record<string, unknown>;
}

class TenantAwareWorker {
  async process(job: JobPayload, handler: (ctx: TenantContext) => Promise<void>) {
    const tenant = await tenantCache.get(job.tenantId);
    if (!tenant || tenant.status !== 'active') {
      logger.warn('Skipping job for inactive tenant', { tenantId: job.tenantId });
      return;
    }
    await asyncLocalStorage.run({ tenantId: tenant.id, tenant }, () => handler(tenant));
  }
}
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Noisy neighbor | One tenant's heavy query degrades everyone. Rate limit per tenant, monitor top tenants |
| Schema count bloat | PostgreSQL metadata cache degrades >5000 schemas. Archive old tenants |
| Connection pooling | DB-per-tenant: use PgBouncer/RDS Proxy. Row-level: single pool with tenant_id column |
| Backup strategy | DB-per-tenant: staggered backups. Row-level: global backup with per-tenant extract capability |
| Tenant migration | Schema-per-tenant → DB-per-tenant requires data export/import. Plan for migration |
| Monitoring | Per-tenant metrics: query latency, error rate, request count, storage usage |

## Security

| Risk | Mitigation |
|------|-----------|
| Cross-tenant data access | Row-Level Security as defense-in-depth. Never rely on app-layer alone |
| Tenant ID in URL | Use auth token, never URL params for tenant ID. Validate token claims |
| Background job leaks | Always pass tenant context in job payload, validate before processing |
| Shared cache poisoning | Prefix all cache keys with tenant ID |
| Rate limit bypass | Apply rate limits at gateway (per IP) AND application (per tenant) |

## Common Pitfalls
- **Leaky tenant context**: Forgetting to propagate tenant ID in background jobs, webhooks, or message queues. Always pass tenant context explicitly in job payloads.
- **Missing tenant filter on JOINs**: A query that joins across tables may filter the primary table but miss the tenant column on joined tables. Always verify JOINs include tenant_id on all involved tables.
- **Shared cache poisoning**: Caching data without tenant key prefix causes one tenant to see another tenant's cached content. Always prefix cache keys with tenant ID.
- **Connection pool exhaustion**: In DB-per-tenant, each tenant opens connections. With 100+ tenants, this exhausts database connection limits. Use connection pooling middleware or PgBouncer.
- **Sequential migration bottlenecks**: Running per-tenant migrations serially for 1000+ tenants takes hours. Parallelize with batch size limits and rate limiting to avoid database overload.
- **Incomplete data cleanup on tenant deletion**: Foreign keys, referenced data in secondary stores (search indexes, caches, file storage), and audit logs must all be cleaned or anonymized consistently.

## Compared With
| Approach | Multi-Tenancy | Single-Tenant | Hybrid |
|----------|---------------|---------------|--------|
| Cost efficiency | High (shared infra) | Low (per-customer infra) | Medium |
| Operational overhead | Medium (one deployment) | High (N deployments) | Medium-High |
| Isolation guarantee | Configurable | Absolute | Tier-dependent |
| Upgrade velocity | Fast (one deployment) | Slow (per-customer) | Tier-dependent |
| Compliance scope | Broad (shared audit) | Per-customer | Tier-dependent |

## Performance
- Row-level: best for high tenant count but requires well-indexed `tenant_id` columns. Query planner overhead is negligible with proper indexes. Risk of "noisy neighbor" where one tenant's heavy query degrades performance for all.
- Schema-per-tenant: PostgreSQL schema switching is fast (metadata cache). Each schema is isolated, so `ANALYZE` and `VACUUM` run per-schema. Connection pooling works per-database. Schema count above ~5000 may cause metadata bloat in PostgreSQL.
- DB-per-tenant: full isolation but high connection overhead. Each database requires separate connection pool, backup schedule, and monitoring. Use connection poolers (PgBouncer, RDS Proxy) to manage connection limits. Backup windows must be staggered.

## Tooling/Methodology
- **PostgreSQL Row-Level Security**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; CREATE POLICY ... USING (tenant_id = current_setting('app.tenant_id')::UUID)`
- **Prisma/TypeORM**: Global middleware or interceptors for automatic tenant filtering.
- **Django**: `django-tenants` package for schema-per-tenant, `django-simple-multitenant` for row-level.
- **Ruby on Rails**: `acts_as_tenant` gem for row-level, `apartment` gem for schema-per-tenant.
- **Laravel**: `spatie/laravel-multitenancy` for row-level, `stancl/tenancy` for schema-per-tenant.
- **Connection pooling**: PgBouncer, RDS Proxy, Prisma Data Proxy for managing per-tenant connections.
- **Monitoring**: Prometheus metrics per tenant (query latency, error rates, request count).

## Rules
- Never let one tenant access another tenant's data — always enforce scoping at the database level, not just in application code.
- Tenant ID must come from the authentication token, never from user input.
- All indexes must include the tenant_id column (or be unique per schema).
- For schema-per-tenant: manage migrations centrally but execute per tenant.
- Backups must be restorable per tenant for enterprise plans.
- Log all cross-tenant access attempts as security events.
- Tenant context must be validated at every service boundary.
- Never use shared database sequences across tenants (use UUIDs or per-tenant sequences).
- Connection pool limits per tenant: implement max connections per tenant.
- Rate limiting must be per-tenant, not global — one noisy tenant affects others.
- Feature flags should support per-tenant rollout before global rollout.
- Monitor tenant-level query performance — a slow tenant is a canary for issues.
- Use RLS as defense-in-depth, not as primary isolation mechanism.

## References
  - references/data-partitioning.md — Data Partitioning at Scale Reference
  - references/isolation-strategies.md — Isolation Strategies
  - references/multi-tenancy-monitoring.md — Multi-Tenancy Monitoring
  - references/multi-tenancy-testing.md — Multi-Tenancy Testing
  - references/multi-tenancy-data-isolation.md — Multi-Tenancy Data Isolation
  - references/multi-tenancy-tenant-lifecycle.md — Multi-Tenancy Tenant Lifecycle
  - references/tenant-provisioning.md — Tenant Provisioning
  - references/tenant-routing.md — Tenant Routing Reference
## Handoff
No artifact produced unless requested.
Next skill: bff-pattern — create tenant-specific BFFs for different client types.
Carry forward: isolation strategy, tenant context mechanism, provisioning pipeline.

## Implementation Patterns

### Tenant Context Middleware

```javascript
// Express.js tenant context middleware
const asyncLocalStorage = require('async_hooks').AsyncLocalStorage;
const tenantStorage = new AsyncLocalStorage();

function tenantMiddleware(req, res, next) {
  const tenantId = extractTenantId(req);
  const tenantConfig = getTenantConfig(tenantId);

  if (!tenantConfig) {
    return res.status(401).json({ error: 'Invalid tenant' });
  }

  const context = {
    tenantId,
    tenantConfig,
    userId: req.user?.id,
    requestId: req.id,
  };

  tenantStorage.run(context, () => {
    req.tenant = context;
    next();
  });
}

function extractTenantId(req) {
  // Priority: header > subdomain > query param
  return req.headers['x-tenant-id']
    || req.subdomains[0]
    || req.query.tenant_id;
}

function getCurrentTenant() {
  return tenantStorage.getStore();
}

function requireTenantAccess(requiredRoles = []) {
  return (req, res, next) => {
    const tenant = getCurrentTenant();
    if (!tenant) {
      return res.status(401).json({ error: 'No tenant context' });
    }
    if (requiredRoles.length > 0) {
      const userRoles = tenant.tenantConfig.roles?.[tenant.userId] || [];
      const hasRole = requiredRoles.some(r => userRoles.includes(r));
      if (!hasRole) {
        return res.status(403).json({ error: 'Insufficient permissions for this tenant' });
      }
    }
    next();
  };
}
```

### Row-Level Security (PostgreSQL)

```sql
-- Enable RLS on tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create a secure function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT current_setting('app.tenant_id', TRUE)::TEXT;
$$;

-- Row-level security policies
CREATE POLICY tenant_isolation_orders ON orders
  FOR ALL
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_customers ON customers
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- Set tenant context per session
-- Called from connection pool middleware
SELECT set_config('app.tenant_id', 'tenant-123', TRUE);
```

### Schema-Per-Tenant Migration Runner

```python
from typing import List
import psycopg2

class TenantMigrationRunner:
    def __init__(self, conn_string: str):
        self.conn_string = conn_string

    def get_all_tenants(self) -> List[str]:
        conn = psycopg2.connect(self.conn_string)
        cur = conn.cursor()
        cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'")
        tenants = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()
        return tenants

    def run_migration_for_tenant(self, tenant_schema: str, migration_sql: str):
        conn = psycopg2.connect(self.conn_string)
        cur = conn.cursor()
        cur.execute(f"SET search_path TO {tenant_schema}")
        cur.execute(migration_sql)
        conn.commit()
        cur.close()
        conn.close()

    def run_migration_all(self, migration_sql: str, tenants: List[str] = None):
        if not tenants:
            tenants = self.get_all_tenants()
        for tenant in tenants:
            print(f"Running migration on {tenant}")
            self.run_migration_for_tenant(tenant, migration_sql)

    def add_new_tenant(self, tenant_id: str, base_schema: str = "public"):
        conn = psycopg2.connect(self.conn_string)
        cur = conn.cursor()
        schema_name = f"tenant_{tenant_id}"
        cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
        cur.execute(f"SET search_path TO {schema_name}")
        # Clone base schema tables
        cur.execute(f"""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = '{base_schema}' AND table_type = 'BASE TABLE'
        """)
        tables = cur.fetchall()
        for (table,) in tables:
            cur.execute(f"CREATE TABLE {schema_name}.{table} (LIKE {base_schema}.{table} INCLUDING ALL)")
        conn.commit()
        cur.close()
        conn.close()
        print(f"Tenant {tenant_id} provisioned in schema {schema_name}")
```

## Architecture Decision Trees

### Isolation Strategy Selection

```
What are the tenant requirements?
├── Small tenants (< 100 users), simple needs
│   └── Shared database with RLS
│       ├── Lowest cost, simplest operations
│       ├── Tenants share DB resources
│       └── RLS ensures data separation
│
├── Medium tenants, compliance needs (SOC2, HIPAA)
│   └── Schema-per-tenant
│       ├── Full data isolation in separate schemas
│       ├── Common migration per tenant
│       ├── Separate backups per tenant
│       └── More complex connection management
│
├── Large/enterprise tenants
│   └── Database-per-tenant
│       ├── Complete resource isolation
│       ├── Independent scaling and backup
│       ├── Highest cost due to per-DB overhead
│       └── Suitable for multi-region deployment
│
└── Mixed tenant tiers
    └── Hybrid: RLS for small, schema for medium, DB for large
        ├── Migrate tenants to higher isolation on tier upgrade
        ├── Monitoring-driven isolation decisions
        └── Unified tenant management across tiers
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Tenant ID from user input | Tampering allows cross-tenant access | Extract from auth token only |
| Application-level isolation only | Single bug exposes all tenant data | Defense-in-depth: app + DB-level isolation |
| Shared sequences across tenants | Predictable IDs reveal other tenant data | UUIDs or per-tenant sequences |
| Global rate limiting | One noisy tenant DoS-es all others | Per-tenant rate limits + global cap |
| One-size backup strategy | Enterprise tenants need faster RPO | Tiered backup policies per tenant plan |
| No tenant-aware connection pooling | Connections grow linearly with tenants | Use pgbouncer with pool size per tenant |

## Performance Optimization

- **Tenant-aware connection pooling**: Use PgBouncer with per-tenant connection pools. Prevents one tenant's queries from starving others. Configure pool sizes based on tenant tier.
- **Read replica per tenant group**: Route read queries to tenant-group-specific replicas. Isolates read load. Replicas can be scaled independently for high-traffic tenants.
- **Per-tenant query monitoring**: Track query performance metrics per tenant. Identify and throttle tenants with runaway queries. Alert on tenant-level performance degradation.
