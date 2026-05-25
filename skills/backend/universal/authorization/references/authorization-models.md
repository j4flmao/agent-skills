# Authorization Models Comparison

## Overview

| Model | Core Concept | Granularity | Complexity | Audit |
|-------|-------------|-------------|------------|-------|
| ACL | Who can do what on which resource | Per-resource | Low | Per-resource entries |
| RBAC | Users have roles, roles have permissions | Role-level | Low-Medium | Role assignments |
| ABAC | Policies evaluate subject+resource+environment attributes | Attribute-level | High | Attribute snapshots |
| ReBAC | Relationship tuples define access | Relationship-level | High | Relationship graph |

## Decision Guide

### When to use RBAC

```
Start → Need access control?
  ↓
  ↓→ Do you have < 20 distinct job functions? ──→ Core RBAC (Level 1)
  ↓
  ↓→ Does your org have hierarchy (manager, director, VP)?
  │   ↓
  │   → Is compliance (SOX, SOC 2) required?
  │   │   ↓
  │   │   → Yes → Constrained RBAC (Level 3) with SoD
  │   │   → No  → Hierarchical RBAC (Level 2)
  │   ↓
  ↓   → Simple flat roles → Core RBAC (Level 1)
  ↓
  ↓→ Do you need document/row-level permissions?
  │   ↓
  │   → ABAC or RBAC + ABAC hybrid
  ↓
  ↓→ Is access based on relationships (org A owns doc, user is in org A)?
      ↓
      → ReBAC
```

### When RBAC is not enough

| Problem | Solution |
|---------|----------|
| "Manager can approve but not their own expenses" | Add ABAC condition (self-approval blocked) |
| "Only during business hours" | Add ABAC environment condition |
| "Limit by region" | Add ABAC location attribute |
| "Different per customer in multi-tenant" | Scope RBAC by tenant + ABAC per-tenant policies |
| "User can see doc because their team owns the folder" | ReBAC relationship tuples |

## Model Details

### ACL (Access Control List)

```
Resource: invoice-123
  user:alice  → read, write
  user:bob    → read
  group:admin → read, write, delete
```

**Pros:** Simple, intuitive, per-resource precision.
**Cons:** Does not scale — every resource needs entries. No inheritance. Hard to audit.

### RBAC (INCITS 359)

```
User ──assigned──> Role ──has──> Permissions
                   │
            Hierarchy (Level 2)
                   │
            Constraints (Level 3)
```

**Pros:** Predictable, auditable, well-understood. NIST standard.
**Cons:** Role explosion at scale. No context awareness. Hard to handle exceptions.

### ABAC (NIST SP 800-162)

```
Policy = Target + Condition + Effect

Subject: {role: manager, dept: eng}
Resource: {type: invoice, amount: 5000, dept: eng}
Action: approve
Environment: {time: 14:00, risk: 20}

Policy: "Allow approve if subject.dept == resource.dept
         AND resource.amount < 10000
         AND environment.risk < 50"
```

**Pros:** Highly flexible, context-aware, no role explosion.
**Cons:** Complex to implement, debug, and audit. Slower evaluation.

### ReBAC (Google Zanzibar / SpiceDB)

```
Tuple: (object#relation@user)
(doc:123#viewer@alice)
(doc:123#owner@bob)
(folder:456#viewer@doc:123)  → alice can see folder because she can see doc:123
```

**Pros:** Native relationship modeling, efficient graph traversal, scalable.
**Cons:** Overkill for most apps. Requires dedicated storage and API.

## Hybrid Models

### RBAC + ABAC (most common in production)
```yaml
# RBAC defines coarse access
roles:
  editor:
    permissions:
      - document.read
      - document.write

# ABAC adds fine-grained conditions
policies:
  - target: {role: editor, action: document.write}
    condition:
      subject.department == resource.department
```

### RBAC + ReBAC
```yaml
# RBAC controls admin functions
# ReBAC controls user-to-resource relationships
roles:
  admin:
    permissions:
      - workspace.*
      - member.manage

relationships:
  - (workspace:123#member@alice)
  - (folder:456#parent@workspace:123)
  - alice can access folder:456 through workspace membership
```

### ABAC + ReBAC
```yaml
# Relationships provide the graph
# ABAC provides attribute conditions on top
```

## Migration Path

```
ACL ──> Core RBAC ──> Hierarchical RBAC ──> +ABAC ──> +ReBAC
  (100s users)  (1000s)      (10,000s)      (100,000s)  (1M+)
```

Start simple. Add complexity only when RBAC constraints become painful.
