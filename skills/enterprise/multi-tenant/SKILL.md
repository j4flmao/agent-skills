---
name: enterprise-multi-tenant
description: >
  Use this skill when designing or managing multi-tenant SaaS architectures.
  This skill enforces: tenant isolation, lifecycle management, data boundary enforcement.
  Do NOT use for: single-tenant deployments, B2C monoliths, infrastructure provisioning.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, multi-tenant, phase-8]
---

# Multi-Tenant Architecture Agent

## Purpose
Designs and enforces tenant isolation, lifecycle management, and cross-tenant operational patterns.

## Framework/Methodology

### TENANT-ISOLATE Framework
A six-phase approach to designing and operating multi-tenant systems:

Phase 1 - Tenant Model Definition: Determine isolation requirements based on compliance, security, and operational needs. Define tenant hierarchy (organization, workspace, user). Decide on data residency requirements.

Phase 2 - Environment Design: Select isolation model (DB per tenant, schema per tenant, row-level). Design tenant-aware infrastructure. Configure networking, encryption, and access control boundaries.

Phase 3 - Naming and Routing: Implement tenant ID propagation through every layer. Design tenant-aware DNS, API gateway routing, and database connection management.

Phase 4 - Automation: Build tenant provisioning pipeline with IaC. Implement lifecycle automation (provision, onboard, suspend, delete). Create tenant-specific monitoring and alerting.

Phase 5 - Operations: Design cross-tenant operations (analytics, backups, migrations) with isolation guarantees. Implement tenant-level rate limiting, caching, and resource quotas.

Phase 6 - Lifecycle Management: Define tenant state machine. Implement data export for portability. Handle suspension and deletion with compliance requirements. Plan for tenant migration across regions.

### Isolation Model Deep Dive

DB per tenant: Each tenant gets a dedicated database instance or cluster. Strongest isolation, best for regulated data (HIPAA, PCI), highest operational cost, complex to manage at scale (hundreds of DBs). Connection pooling and management overhead significant.

Schema per tenant: Shared database, separate schema per tenant. Moderate isolation, balanced cost. Schemas created programmatically during tenant provisioning. Cross-tenant queries use schema prefix. Best for mid-scale SaaS (50-500 tenants).

Row-level: Shared database and schema, tenant_id column on every table. Simplest operations, lowest cost, weakest isolation. Requires row-level security (RLS) policies or middleware enforcement. Best for B2C SaaS with thousands of tenants. Security risk if tenant_id is leaked or bypassed.

### Hybrid and Multi-Model Approaches

Hybrid: Use different isolation levels for different parts of the application. Example: customer financial data in per-tenant DB, configuration data in shared schema, logs in row-level table with indexed tenant_id.

Multi-model: Different customers get different isolation levels based on their compliance needs. Platinum customers get dedicated DB, standard customers get shared schema, basic customers get row-level. This adds complexity but optimizes cost.

### Tenant ID Propagation Architecture

Every request must carry tenant context through all layers:

1. API Gateway: Extract tenant ID from subdomain, header, or JWT claim. Validate tenant exists and is active. Reject requests for unknown/suspended tenants.

2. Service Mesh: Propagate tenant ID via HTTP headers or gRPC metadata. Service mesh middleware validates tenant context exists. If missing, reject or default to system context.

3. Application Code: Access tenant ID from request context. Use for data access filtering, feature flag evaluation, rate limit enforcement, and cache key scoping.

4. Database: Pass tenant ID via session variables or connection parameters (PostgreSQL SET, MySQL variable). Apply RLS policies or connection routing based on tenant ID.

5. Cache: Prefix cache keys with tenant ID. Use Redis key-space per tenant when isolation is critical.

6. Logging: Include tenant ID in all structured log entries. Enable per-tenant log correlation and filtering.

## Agent Protocol

### Trigger
Exact user phrases: multi-tenant, multi-tenancy, SaaS architecture, tenant isolation, tenant onboarding, tenant data, tenant migration, per-tenant config, tenant scaling, tenancy model, tenant routing, data isolation.

### Input Context
Before activating, verify:
- What isolation model is required (DB per tenant / schema per tenant / row-level)?
- What compliance requirements apply to tenant data separation?
- What is the tenant lifecycle (provision, onboard, suspend, delete)?
- How are cross-tenant operations handled (analytics, billing, migrations)?

### Output Artifact
Tenant isolation architecture document + lifecycle automation plan + cross-tenant operations guide.

### Response Format
```
## Multi-Tenant Architecture
### Isolation Model: {model}
### Tenants: {total count}
### Data Boundary: {strategy}

### Tenant Lifecycle
{flow: provision -> config -> activate -> operate -> suspend -> delete}

### Isolation Enforcement
{middleware, connection routing, encryption, caching}

### Cross-Tenant Operations
{analytics, migrations, backups - how they work across boundaries}

### Operational Runbooks
{suspend, data export, full delete}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Isolation model selected and justified
- [ ] Tenant ID propagation through entire request lifecycle
- [ ] Tenant provisioning automated
- [ ] Data isolation verified at storage layer
- [ ] Tenant-aware rate limiting and caching configured
- [ ] Cross-tenant operations designed
- [ ] Tenant deletion/suspension runbooks written
- [ ] Tenant migration strategy documented

### Max Response Length
7000 tokens

## Workflow

### Step 1: Isolation Model Selection
Evaluate three isolation models: DB per tenant (strongest isolation, highest cost, best for regulated data), schema per tenant (balanced isolation, shared DB, schema per tenant), row-level (simplest ops, shared everything, tenant_id column). Choose based on compliance requirements, tenant count, and operational complexity tolerance.

Decision matrix:
- Regulated data (HIPAA, PCI, GDPR high-risk): DB per tenant
- <50 tenants, enterprise customers: DB per tenant
- 50-500 tenants, mid-market: Schema per tenant
- 500+ tenants, B2C: Row-level with RLS
- Mixed compliance needs: Hybrid (DB per tenant for regulated, shared for rest)

The isolation model affects everything downstream: provisioning automation, backup strategy, cross-tenant analytics, cost allocation, and migration complexity. Choose carefully -- changing models later is expensive.

### Step 2: Tenant Lifecycle Automation
Implement tenant state machine: Prospect -> Provisioned -> Onboarded -> Active -> Suspended -> Deleted. Automate base infrastructure provisioning with IaC. Configure tenant-specific DNS, TLS, and monitoring. Onboard via API or admin UI. Support data export during suspension.

Tenant state machine:
- Prospect: Interest registered, no resources yet
- Provisioned: Infrastructure created (DB, buckets, queues), not configured
- Onboarded: Configuration completed, tenant admin user created, ready
- Active: Full operation, billing active
- Suspended: Non-payment or abuse. Data retained, access blocked. Grace period active.
- Deleted: Data purged after grace period. Irreversible.

Provisioning automation should be idempotent. If a step fails, retry from the last checkpoint. Use event-driven architecture (provision request -> message queue -> worker -> callback). Target provision time under 5 minutes.

### Step 3: Data Isolation Enforcement
Inject tenant ID middleware at the API gateway. Route database connections based on tenant isolation model. Encrypt data at rest per tenant when required. Apply row-level security policies for row-level model. Validate tenant boundaries on all data access.

Enforcement layers:
- API Gateway: Validate tenant ID in request, reject misrouted requests
- Application: Middleware extracts and injects tenant ID into downstream calls
- ORM/Data Layer: All queries include tenant_id filter (row-level) or use tenant-specific connection (DB/schema level)
- Database: Row-Level Security policies (PostgreSQL RLS, SQL Server Row-Level Security) as defense-in-depth
- Storage: Per-tenant encryption keys (KMS key per tenant) for maximum isolation

Testing data isolation: security tests should verify that Tenant A cannot access Tenant B data through any API, query, or export. Use penetration testing specifically targeting tenant boundary violations.

### Step 4: Tenant-Aware Infrastructure
Isolate cache keys with tenant namespace prefix. Apply rate limits per tenant. Configure resource quotas (API calls, storage, compute). Monitor tenant-level metrics. Implement tenant-specific feature flags.

Infrastructure isolation considerations:
- Cache: Redis key prefix per tenant, or separate Redis instance for large tenants. Cache eviction policies must not evict data across tenant boundaries.
- Queues: Tenant-tagged messages. Fair queue processing (one noisy tenant should not starve others).
- Rate Limiting: Per-tenant rate limits, separate from global limits. Burst allowance based on plan tier.
- Compute: Kubernetes with tenant-affinity scheduling for noisy-neighbor prevention. Resource quotas per namespace.
- Storage: Per-tenant buckets/folders with IAM policies. S3 bucket policy per tenant for direct access.

Tenant-level monitoring: track requests, errors, latency, and resource usage per tenant. Dashboard for customer-facing health. Tenant-level alerting on anomalies.

### Step 5: Cross-Tenant Operations
Design analytics pipeline that aggregates across tenants without exposing individual data. Implement batched migrations that iterate tenants. Build tenant-aware backup/restore. Handle tenant data export for GDPR right to portability.

Cross-tenant analytics: Use column-level access control or anonymization layer. Aggregate metrics at the platform level, never expose individual tenant data. Build a separate analytics data store (data warehouse) with appropriate access controls.

Backup and restore: Per-tenant backups for DB-per-tenant model. Tenant-tagged backup metadata for row-level. Ability to restore a single tenant without affecting others (point-in-time recovery at tenant granularity).

Data portability: Build exports as tenant-triggered async jobs. Format as JSON or CSV. Include all tenant-owned data. Compress and provide secure download link with expiration. Target export completion under 24 hours.

## Common Pitfalls

Pitfall 1: Tenant ID not propagated to all layers. If tenant ID is available at the API layer but not in logs, database queries, or cache keys, isolation is incomplete. Trace tenant ID end-to-end.

Pitfall 2: Row-level security without defense in depth. RLS policies are powerful but a misconfiguration can expose all tenants. Never rely solely on RLS - enforce tenant filtering in the application layer too.

Pitfall 3: Noisy neighbor problem. One tenant consuming excessive resources affects all tenants on shared infrastructure. Implement per-tenant rate limits, resource quotas, and fair scheduling.

Pitfall 4: Shared schema migration challenges. A schema migration that works for row-level tenants affects all tenants simultaneously. Use online schema change tools (gh-ost, pt-online-schema-change) with tenant-by-tenant rollout.

Pitfall 5: Tenant data not fully deletable. GDPR requires complete erasure. If tenant data is scattered across logs, caches, backups, and analytics stores, deletion is complex. Design for deletability from day one.

Pitfall 6: Over-isolating adds unnecessary cost. DB per tenant for a B2C app with 10,000 tenants means managing 10,000 database instances. Match isolation to compliance and security requirements, not paranoia.

Pitfall 7: Cache pollution. Cache keys without tenant prefix can serve Tenant A data to Tenant B. Always prefix cache keys with tenant ID. Clear tenant cache on suspension/deletion.

## Best Practices

Practice 1: Treat tenant context as a security boundary. Every request must have validated tenant context. Every data access must filter by tenant. Treat tenant boundary violations as security incidents.

Practice 2: Automate tenant provisioning completely. Manual tenant setup does not scale and introduces errors. Provisioning should be API-callable and complete in under 5 minutes.

Practice 3: Implement tenant throttling. One abusive tenant should not degrade service for others. Use token bucket rate limiting per tenant. Hard limit on concurrent connections per tenant.

Practice 4: Test tenant isolation with security tooling. Automated security tests should regularly probe for tenant boundary violations. Include in CI/CD pipeline. Penetration test annually.

Practice 5: Design for smooth tenant migration. Tenants may need to move between regions, isolation models, or instance sizes. Build migration capability into the architecture. Test with real data.

Practice 6: Use structured tenant IDs. Tenant IDs should be immutable, URL-safe, and include a check digit for validation. UUID v5 from domain name is a good pattern.

## Templates & Tools

### Tenant Provisioning Automation Template
```
## Tenant Provisioning Workflow

1. API receives provision request with tenant details
2. Validate: no duplicate, plan tier in allowed values, region available
3. Create tenant record in tenant registry DB
4. Provision infrastructure (Terraform workspace per tenant or tagged resources):
   - If DB-per-tenant: create DB instance
   - If schema-per-tenant: create schema, run migrations
   - If row-level: ensure tenant_id in tables, run any per-tenant seed data
5. Create tenant admin user with initial credentials
6. Configure DNS: tenant-specific subdomain (tenant.example.com)
7. Generate TLS certificate (automatic with ACME/LetsEncrypt)
8. Initialize tenant configuration defaults
9. Create monitoring alerts for tenant
10. Send welcome notification with access instructions
11. Update tenant state to Provisioned

Estimated time: 3-5 minutes
```

### Tenant Deletion Runbook
```
## Tenant Deletion (30-Day Grace Period)

### Day of Suspend Request
1. Set tenant state to Suspended
2. Block all API access (gateway returns 403 with suspension message)
3. Notify tenant admin with suspension reason and grace period end date
4. Export tenant data (if requested)
5. Stop tenant-specific billing

### During Grace Period (30 days)
- Data retained but inaccessible
- Scheduled reminders at day 7, day 21, day 28
- Re-activation available via support

### After Grace Period (Day 31)
1. Set tenant state to Deleting
2. Delete tenant data in order:
   - Application data in primary DB
   - File storage objects
   - Cache entries
   - Queue messages
   - Log entries (or anonymize)
   - Backup snapshots
3. Remove DNS records
4. Release reserved resources
5. Archive tenant record in tenant registry (soft-deleted)
6. Send deletion confirmation to tenant
7. Set tenant state to Deleted
```

### Tools Reference
- Terraform for tenant infrastructure provisioning
- Kubernetes with tenant namespaces for compute isolation
- AWS KMS / Azure Key Vault for per-tenant encryption key management
- PostgreSQL Row-Level Security for database isolation
- Redis with tenant key prefixes for cache isolation
- Kong / APISIX for API gateway tenant routing
- OpenPolicyAgent / OPA for tenant access policy enforcement
- Jaeger / OpenTelemetry for tenant-span tracing

## Case Studies

### Case Study 1: HIPAA-Compliant Multi-Tenant Healthcare Platform
A healthcare SaaS platform needed HIPAA compliance while serving 200 hospital customers. Each hospital required strict data isolation (PHI separation). The platform implemented DB-per-tenant for patient data (AES-256 encrypted at rest, per-tenant KMS keys) and shared schema for lookup data (states, ICD codes, drug databases). Tenant provisioning automated end-to-end with 5-minute setup time. Audit logging at tenant granularity. Passed HIPAA audit with zero findings on data isolation controls.

### Case Study 2: B2B SaaS Scaling from 50 to 5000 Tenants
A B2B SaaS company started with DB-per-tenant for their initial 50 enterprise customers. When expanding to SMB market (target: 5000 tenants), the operational cost of managing 5000 databases was unsustainable. They migrated to a hybrid model: row-level for SMB tenants (4800), DB-per-tenant for enterprise (200). Migration took 4 months. Cost per tenant dropped 70%. Operational complexity reduced to manageable levels.

### Case Study 3: Multi-Tenant Data Breach Near-Miss
A SaaS company with row-level tenant isolation discovered during a security audit that their GraphQL resolver was not filtering by tenant_id. A malicious tenant could potentially query other tenants data. The vulnerability was caught in audit before exploitation. Remediation: added tenant ID middleware at GraphQL layer, implemented RLS policies as defense-in-depth, and added automated tenant boundary tests to CI/CD. Incident response: treated as security incident, notified affected tenants, accelerated penetration testing schedule.

## Rules
- Tenant ID must flow through every request via middleware.
- Isolation model must match compliance requirements (HIPAA = DB per tenant).
- DB per tenant for regulated data; row-level for B2C SaaS under 10k tenants.
- Tenant deletion is soft-delete with 30-day grace period.
- Cross-tenant queries must never leak tenant boundaries.
- Tenant provisioning must be fully automated and idempotent.
- Cache keys always prefixed with tenant ID.
- Rate limits and resource quotas enforced per tenant.
- Tenant tenant context validated at every service boundary.
- Tenant state changes logged with audit trail.
- Tenant migration capability designed into architecture from day one.
- Backup and restore granular per tenant.
- Tenant data fully deletable (logs, caches, backups all covered).
- Noisy neighbor detection alerts configured for shared infrastructure.
- Tenant boundary testing included in security test suite.
- Tenant-level metrics monitored and alerting configured.

## References
  - references/multi-tenant-advanced.md -- Multi-Tenant Advanced Topics
  - references/multi-tenant-architecture.md -- Multi-Tenant Architecture Patterns
  - references/multi-tenant-architecture-patterns.md -- Multi-Tenant Architecture Deep Reference
  - references/multi-tenant-cost-allocation.md -- Multi-Tenant Cost Allocation
  - references/multi-tenant-fundamentals.md -- Multi-Tenant Fundamentals
  - references/tenant-isolation.md -- Tenant Isolation Models
  - references/tenant-lifecycle.md -- Tenant Lifecycle Management
  - references/tenant-provisioning.md -- Tenant Provisioning
## Handoff
For compliance requirements on tenant isolation, hand off to `enterprise-compliance-audit`. For cost allocation per tenant, hand off to `enterprise-cost-governance`.
