---
name: backend-multi-tenancy
description: >
  Use this skill when the user says 'multi-tenancy', 'SaaS', 'tenant isolation', 'row-level security', 'DB per tenant', 'schema per tenant', 'tenant provisioning', 'tenant migration', 'multi-tenant database', 'tenant context'. This skill implements tenant isolation strategies: row-level, schema-per-tenant, and DB-per-tenant with provisioning and migration. Applies to any backend stack. Do NOT use for: single-tenant applications, IAM/authentication, or RBAC within a single organization.
version: "1.0.0"
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
Implement tenant isolation in a SaaS application using row-level, schema-per-tenant, or DB-per-tenant strategies with automated provisioning and safe migrations.

## Agent Protocol

### Trigger
Exact user phrases: "multi-tenancy", "SaaS", "tenant isolation", "row-level security", "DB per tenant", "schema per tenant", "tenant provisioning", "tenant migration", "multi-tenant database", "tenant context".

### Input Context
- Number of tenants (current and projected).
- Regulatory requirements (GDPR, SOC 2, HIPAA).
- Database technology and hosting model.
- Existing authentication/user system.

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
  // Set in async local storage for ORM access
  asyncLocalStorage.run({ tenantId: req.tenantId }, next);
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
```

### Step 5: Handle Data Isolation at Rest
- Row-level: `WHERE tenant_id = ?` on every query.
- Schema-per-tenant: search_path or schema-qualified tables.
- DB-per-tenant: connection string per tenant in a registry.

### Step 6: Migrate Safely
```bash
# For shared schema: add nullable column, backfill, then NOT NULL
# For per-tenant: iterate tenants, migrate one by one
```

## Rules
- Never let one tenant access another tenant's data — always enforce scoping at the database level, not just in application code.
- Tenant ID must come from the authentication token, never from user input.
- All indexes must include the tenant_id column (or be unique per schema).
- For schema-per-tenant: manage migrations centrally but execute per tenant.
- Backups must be restorable per tenant for enterprise plans.
- Log all cross-tenant access attempts as security events.

## References
- `references/isolation-strategies.md` — Tenant isolation strategy comparison
- `references/tenant-provisioning.md` — Automated tenant provisioning guide

## Handoff
No artifact produced unless requested.
Next skill: bff-pattern — create tenant-specific BFFs for different client types.
Carry forward: isolation strategy, tenant context mechanism, provisioning pipeline.
