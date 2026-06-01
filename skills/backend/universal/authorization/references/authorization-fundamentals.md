# Authorization Fundamentals

## Core Concepts

**Authorization** determines what an authenticated user is allowed to do. It answers the question "can user X perform action Y on resource Z?" This is distinct from **authentication** (who are you?) and **auditing** (what did you do?).

### The Authorization Triad
| Concept | Example | Source |
|---------|---------|--------|
| **Subject** | User, service account, device | Auth token / session |
| **Action** | read, write, delete, approve, export | Request method + path |
| **Resource** | Invoice #123, workspace "acme" | URL params + DB lookup |

### Access Control Models

**ACL (Access Control Lists)** — Every resource lists who can access it.
```
File: report.pdf
  ACL: alice:rwd, bob:r, charlie:rw
```
- Best for: Document management, file sharing
- Problems: Not scalable beyond hundreds of users/resources

**RBAC (Role-Based Access Control)** — Users inherit permissions through roles.
```
User: alice → Role: editor → Permissions: document.read, document.write
```
- Best for: Enterprise apps, clear org hierarchy
- NIST Levels: Core (L1), Hierarchical (L2), Constrained with SoD (L3)

**ABAC (Attribute-Based Access Control)** — Policies evaluate attributes.
```
Policy: Allow document.read IF user.department == document.department
```
- Best for: Multi-tenant, fine-grained, context-aware scenarios

**ReBAC (Relationship-Based Access Control)** — Access derives from relationships.
```
Relation: document → parent → folder → parent → workspace
User: alice → member → workspace
→ alice can read document
```
- Best for: Social, collaboration, hierarchical org data

## Permission Naming

```
{resource}:{action}          # document:read
{resource}:{scope}:{action}   # invoice:finance:approve
{domain}:{resource}:{action}  # billing:invoice:write
```

Hierarchy convention:
```
document:*       — all actions on documents
*.read           — read on all resources
billing:*:*      — all actions on all billing resources
```

## Default Deny Principle

```
Request → Is subject authenticated?
  ├── No → 401 Unauthorized
  └── Yes → Does any policy explicitly allow this action?
      ├── Yes → Allow (200)
      └── No → Deny (403 Forbidden)
```

Never rely on "deny rules" to block access. Always base decisions on explicit allow rules.

## Enforcement Points

| Layer | Mechanism | Circumventable? |
|-------|-----------|-----------------|
| UI | Hide/disable buttons | Yes — direct API calls |
| API Gateway | Reject requests by path | Yes — service-to-service |
| Application Middleware | Policy check per request | No — domain layer |
| Service/Data Layer | RLS, query filters | No — database level |
| Infrastructure | Network policies | No — network level |

Must enforce at application middleware AND data layer. UI hiding is UX only.

## Role Design Principles

1. **Least privilege**: Every role has exactly the permissions needed, nothing more.
2. **Separation of duties**: No single role can complete a sensitive end-to-end process.
3. **Role minimalism**: Keep roles under 20. Use attributes for rare exceptions.
4. **Flat until hierarchy is needed**: Start with flat roles. Add hierarchy when org structure demands it.
5. **Named by job function**: `order-manager`, not `role-1` or `super-user`.

## Common Permission Types

| Type | Guard | Example |
|------|-------|---------|
| Functional | API handler | `report.export` |
| Data | Query filter | See only own department records |
| Field | Response transformer | Mask salary field for non-HR |
| Environmental | Request context | `approve` only during business hours |
| Admin | Dual control | Requires secondary approval |
