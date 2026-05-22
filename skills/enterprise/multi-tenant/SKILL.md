---
name: enterprise-multi-tenant
description: >
  Use this skill when designing or managing multi-tenant SaaS architectures.
  This skill enforces: tenant isolation, lifecycle management, data boundary enforcement.
  Do NOT use for: single-tenant deployments, B2C monoliths, infrastructure provisioning.
version: "1.0.0"
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
{flow: provision → config → activate → operate → suspend → delete}

### Isolation Enforcement
{middleware, connection routing, encryption, caching}

### Cross-Tenant Operations
{analytics, migrations, backups — how they work across boundaries}

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

### Step 2: Tenant Lifecycle Automation
Implement tenant state machine: Prospect → Provisioned → Onboarded → Active → Suspended → Deleted. Automate base infrastructure provisioning with IaC. Configure tenant-specific DNS, TLS, and monitoring. Onboard via API or admin UI. Support data export during suspension.

### Step 3: Data Isolation Enforcement
Inject tenant ID middleware at the API gateway. Route database connections based on tenant isolation model. Encrypt data at rest per tenant when required. Apply row-level security policies for row-level model. Validate tenant boundaries on all data access.

### Step 4: Tenant-Aware Infrastructure
Isolate cache keys with tenant namespace prefix. Apply rate limits per tenant. Configure resource quotas (API calls, storage, compute). Monitor tenant-level metrics. Implement tenant-specific feature flags.

### Step 5: Cross-Tenant Operations
Design analytics pipeline that aggregates across tenants without exposing individual data. Implement batched migrations that iterate tenants. Build tenant-aware backup/restore. Handle tenant data export for GDPR right to portability.

## Rules
- Tenant ID must flow through every request via middleware.
- Isolation model must match compliance requirements (HIPAA = DB per tenant).
- DB per tenant for regulated data; row-level for B2C SaaS under 10k tenants.
- Tenant deletion is soft-delete with 30-day grace period.
- Cross-tenant queries must never leak tenant boundaries.
- Tenant provisioning must be fully automated and idempotent.
- Cache keys always prefixed with tenant ID.
- Rate limits and resource quotas enforced per tenant.

## References
- `references/tenant-isolation.md` — Isolation model comparison and implementation
- `references/tenant-lifecycle.md` — Tenant state machine and operations

## Handoff
For compliance requirements on tenant isolation, hand off to `enterprise-compliance-audit`. For cost allocation per tenant, hand off to `enterprise-cost-governance`.
