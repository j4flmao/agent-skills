# RBAC vs ABAC

## RBAC (Role-Based Access Control)

### Structure
```
User → Role → Permissions
```

- Users are assigned roles.
- Roles have fixed permission sets.
- Permission checks: does the user's role have this permission?

### When to Use
- Simple hierarchy (admin, manager, user, guest).
- Permissions don't vary by resource attributes.
- Fewer than 50 permission combinations.
- Audit requirements: who did what is easy to report.

### Implementation
```typescript
const permissions = {
  admin: ['order:create', 'order:read', 'order:update', 'order:delete', 'user:manage'],
  manager: ['order:create', 'order:read', 'order:update'],
  user: ['order:create', 'order:read'],
  guest: ['order:read'],
};

function checkPermission(user: User, action: string): boolean {
  return permissions[user.role]?.includes(action) ?? false;
}
```

## ABAC (Attribute-Based Access Control)

### Structure
```
User Attributes + Resource Attributes + Environment → Policy → Allow/Deny
```

- Access decisions based on any combination of attributes.
- Policies are rules evaluated at runtime.
- Much more flexible, significantly more complex.

### When to Use
- Multi-tenant systems (user belongs to tenant, can only see own tenant's data).
- Document-level permissions (user can edit docs they created).
- Time-based access (consultants can access during business hours only).
- Location-based access (support team can access EU data only).

### Implementation
```typescript
interface PolicyContext {
  user: { id: string; department: string; location: string; roles: string[] };
  resource: { ownerId: string; tenantId: string; classification: string };
  environment: { time: Date; ip: string };
}

const policies: Policy[] = [
  {
    name: 'owner-full-access',
    effect: 'allow',
    condition: (ctx: PolicyContext) => ctx.resource.ownerId === ctx.user.id,
  },
  {
    name: 'finance-read-report',
    effect: 'allow',
    condition: (ctx: PolicyContext) =>
      ctx.user.department === 'finance' &&
      ctx.resource.classification === 'report',
  },
];

function evaluatePolicies(context: PolicyContext): boolean {
  const matched = policies.filter(p => p.condition(context));
  return matched.some(p => p.effect === 'allow');
}
```

## Decision Guide

| Factor | Choose RBAC | Choose ABAC |
|--------|------------|-------------|
| Role hierarchy | Fixed, simple | Dynamic, complex |
| Permission granularity | Broad | Fine-grained |
| Number of permission rules | <50 | >50 |
| Attribute-based conditions | None | Required |
| Audit complexity | Simple | Complex |
| Policy change frequency | Low | High |
| Implementation effort | Low | High |
