# Multi-Tenant Fundamentals: Tenancy Models and Tenant Context

The foundations of a multi-tenant SaaS: the deployment models (silo, pool, bridge), how a request is bound to a tenant, how tenant context propagates through services and jobs, and how the data layer enforces it. Deeper material: `multi-tenant-architecture.md`, `tenant-isolation.md`, `tenant-provisioning.md`, `tenant-lifecycle.md`.

## Tenancy Models

| Model | Compute | Data | Isolation | Cost per tenant | Ops effort |
|---|---|---|---|---|---|
| Silo | Dedicated stack per tenant | Dedicated DB/account | Strongest | Highest | Highest (N deployments) |
| Pool | Shared | Shared tables with `tenant_id` | Logical (code + DB policies) | Lowest | Lowest |
| Bridge (hybrid) | Shared compute | Schema or DB per tenant | Medium | Medium | Medium |
| Tiered | Pool for small tenants, silo for enterprise | Mixed | Per tier | Per tier | Needs both paths |

Choose by compliance requirements, tenant size distribution, noisy-neighbor tolerance and team capacity. Most products start pooled and offer silo for top-tier customers.

## Tenant Identification

| Source | Example | Notes |
|---|---|---|
| Token claim | `tenant_id` / `org_id` claim in an OIDC access token | Preferred: authenticated and signed |
| Subdomain | `acme.app.example.com` | Map to tenant, then verify user belongs to it |
| Path | `/t/acme/...` | Same verification |
| Header | `X-Tenant-ID` | Only from trusted internal callers; never trust from browsers |

Rule: the tenant is derived from authenticated identity (or verified against it), never taken from user-controlled input alone.

## Request Flow

```
request → authenticate (JWT) → resolve tenant (claim / subdomain) → verify membership
       → set tenant context (request-scoped) → authorize action within tenant
       → data access filtered by tenant → response
```

## Request-Scoped Context (TypeScript, AsyncLocalStorage)

```ts
import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";

type TenantContext = { tenantId: string; userId: string; tier: "free" | "pro" | "enterprise" };
const als = new AsyncLocalStorage<TenantContext>();

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const claims = req.auth;                       // set by JWT verification middleware
  if (!claims?.tenant_id) {
    res.status(401).json({ error: { code: "TENANT_MISSING" } });
    return;
  }
  als.run({ tenantId: claims.tenant_id, userId: claims.sub, tier: claims.tier }, next);
}

export function currentTenant(): TenantContext {
  const ctx = als.getStore();
  if (!ctx) throw new Error("tenant context missing: called outside a tenant-scoped request");
  return ctx;
}
```

Fail closed: code paths without tenant context throw instead of defaulting to "all tenants".

## Propagation Beyond the Request

| Channel | Carry tenant via |
|---|---|
| Service-to-service HTTP/gRPC | Forward the user token (or a token exchange result); internal header only between authenticated services |
| Messages/events | `tenant_id` attribute in the envelope; consumers restore context before processing |
| Background jobs | `tenant_id` in the job payload; worker sets context per job |
| Logs/traces/metrics | `tenant_id` as log field and trace attribute (W3C baggage for propagation; avoid as metric label if tenants are many) |
| Caches | Tenant prefix in every key: `t:{tenantId}:user:{id}` |
| Object storage | Tenant prefix: `s3://bucket/tenants/{tenantId}/...` |

## Data Layer Enforcement (PostgreSQL Row-Level Security)

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;          -- applies to table owner too

CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.tenant_id')::bigint)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::bigint);

CREATE INDEX ON invoices (tenant_id, created_at DESC);
```

Application sets the setting per transaction (so pooled connections never leak it):

```sql
BEGIN;
SELECT set_config('app.tenant_id', $1, true);   -- true = local to this transaction
SELECT * FROM invoices WHERE status = 'open';   -- RLS adds the tenant filter
COMMIT;
```

The application database role must not have `BYPASSRLS` and must not be a superuser. `current_setting` without a value raises an error, which keeps it fail-closed.

Additional guards:
- Composite foreign keys including `tenant_id` prevent cross-tenant references: `FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)`.
- Unique constraints scoped by tenant: `UNIQUE (tenant_id, email)`.

## Tenant Metadata

Keep a tenant registry (control plane) with: tenant ID, status (active, suspended, deleting), tier, region/residency, deployment model (pool/silo + shard location), limits and feature flags. Resolve routing and limits from it, cached with short TTL.

## Testing Isolation

- Automated tests that create two tenants and assert every API endpoint denies cross-tenant access (IDs from tenant A used with tenant B's token).
- Tests that run queries without tenant context and expect errors.
- Periodic audit queries in production for rows whose foreign keys cross tenants.

## Checklist
- [ ] Tenancy model chosen per tier with documented rationale
- [ ] Tenant derived from authenticated identity and verified
- [ ] Request-scoped context that fails closed
- [ ] Tenant propagated through messages, jobs, caches, storage and telemetry
- [ ] Database enforcement (RLS or per-tenant DB) plus tenant-scoped keys and constraints
- [ ] Cross-tenant access tests in CI
