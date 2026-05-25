# RBAC Hierarchy & Admin Patterns

## Role Hierarchy Design

### General hierarchy (multiple inheritance)

```
                    super-admin
                   /           \
          org-admin             system-admin
          /        \                 |
       manager   billing-admin   devops-admin
       /     \        |
     lead   finance  
      |
    member
```

### Limited hierarchy (single inheritance)
```
super-admin → org-admin → manager → lead → member
```
Use single inheritance when:
- Org structure is strictly hierarchical.
- No cross-functional roles needed.
- Simpler audit trail required.

### Multiple inheritance rules
```javascript
// Effective permission resolution
function resolvePermissions(roleName) {
  const visited = new Set();
  const permissions = [];

  function walk(role) {
    if (visited.has(role)) return;
    visited.add(role);

    // Add direct permissions
    const directPerms = PERMISSION_CATALOG.get(role) || [];
    permissions.push(...directPerms);

    // Walk parents (multiple inheritance)
    const roleDef = ROLE_HIERARCHY.get(role);
    if (roleDef?.parents) {
      for (const parent of roleDef.parents) {
        walk(parent);
      }
    }
  }

  walk(roleName);
  return [...new Set(permissions)];
}
```

## Scope Design

Each role has a scope that defines the data boundary:

| Scope | Super Admin | Org Admin | Manager | Lead | Member |
|-------|-------------|-----------|---------|------|--------|
| Global (all orgs) | ✓ | - | - | - | - |
| Org (one subsidiary) | ✓ | ✓ | - | - | - |
| Department | ✓ | ✓ | ✓ | - | - |
| Team | ✓ | ✓ | ✓ | ✓ | - |
| Own resources | ✓ | ✓ | ✓ | ✓ | ✓ |

## Admin Pattern Catalog

### Super Admin
```yaml
name: super-admin
type: administrative
scope: global
count_limit: 2
approval_required: board
attributes:
  standing_access: true       # Not JIT by default
  mfa_required: true
  ip_restricted: true
  all_actions_logged: true
  cannot_delete_audit: true
capabilities:
  - '*'
restrictions:
  - Cannot override audit log
  - Cannot change own role
  - All actions require MFA
```

### Org Admin
```yaml
name: org-admin
type: administrative
scope: org (single subsidiary/tenant)
count_limit: 5 per org
approval_required: org_head
attributes:
  standing_access: true
  mfa_required: true
capabilities:
  - 'user.*'              # Manage users within org
  - 'workspace.*'         # Manage workspaces
  - 'billing.read'        # View billing
  - 'report.*'            # All reports
  - 'settings.*'          # Org settings
excluded:
  - Cross-org operations
  - Delete org
  - Modify audit logs
```

### System Admin
```yaml
name: system-admin
type: administrative
scope: global (infrastructure only)
count_limit: 3
approval_required: cto
attributes:
  standing_access: true
  mfa_required: true
  ip_restricted: true
capabilities:
  - 'deployment.*'
  - 'infrastructure.*'
  - 'monitoring.*'
  - 'backup.*'
excluded:
  - User data access
  - Business operations
  - Modify application logic
```

### Billing Admin
```yaml
name: billing-admin
type: administrative
scope: org
count_limit: 3 per org
approval_required: finance_head
capabilities:
  - 'subscription.*'
  - 'invoice.read'
  - 'invoice.manage'
  - 'payment.*'
  - 'refund.initiate'
restrictions:
  - Cannot modify prices/plans
  - Cannot delete invoices
  - All financial actions need dual approval > $1000
```

### Support Admin
```yaml
name: support-admin
type: administrative
scope: org
capabilities:
  - 'user.read'
  - 'user.update.profile'
  - 'ticket.*'
  - 'document.read'        # Read-only
  - 'workspace.read'
restrictions:
  - Cannot delete users
  - Cannot change roles
  - Read-only on business data
  - Cannot export data
```

### Audit Admin
```yaml
name: audit-admin
type: administrative
scope: global-read
count_limit: 3
approval_required: compliance_officer
capabilities:
  - 'audit-log.*'         # Read all audit logs
  - 'user.read'           # View user info
  - 'report.access-history'
  - 'certification.*'     # Manage access certs
restrictions:
  - Strictly read-only
  - Cannot create/modify/delete any resource
  - Export limited to CSV with watermark
  - Immutable: cannot modify audit logs
```

## Admin Delegation Chain

```
Super Admin ──delegates──> Org Admin ──delegates──> Dept Manager
                                                          │
                                                    (delegated admin
                                                     for their dept)
```

Delegated admin rules:
- Cannot delegate powers they don't have.
- Cannot create another admin.
- All delegated actions show both delegator and delegate in audit.
- Delegation auto-expires after 90 days unless renewed.

## Audit Requirements for Admin Actions

| Action | Log Level | Notification | Approval Required |
|--------|-----------|-------------|-------------------|
| Super admin login | CRITICAL | Security team immediately | None (but logged) |
| Org admin created | HIGH | Org head | Pre-approved quota |
| Role changed | HIGH | Manager | Manager approval |
| Permission granted | MEDIUM | None | Manager approval |
| Permission revoked | MEDIUM | Affected user | None |
| Break-glass activated | CRITICAL | Security + system owners | Emergency only |
| Delegation created | MEDIUM | Delegator | Manager approval |
| Elevation requested | MEDIUM | Approver | Varies |
| Elevation granted | HIGH | Security team | Manager approval |

## Role Naming Conventions

| Convention | Example | When |
|------------|---------|------|
| `{level}` | `admin`, `manager`, `member` | Simple hierarchy |
| `{scope}-{level}` | `org-admin`, `global-viewer` | Multi-scope |
| `{domain}-{function}` | `billing-admin`, `support-agent` | Functional roles |
| `{domain}-{level}` | `engineering-lead`, `sales-manager` | Departmental |

## Role Lifecycle

```
Proposal → Review → Creation → Assignment → Active
                                              │
                                        (periodic review)
                                              │
                                       Deactivation ← Archival
```

| Phase | Actions | Owner |
|-------|---------|-------|
| Proposal | Define permissions, scope, hierarchy position | Product owner |
| Review | SoD check, overlap analysis, naming review | Security team |
| Creation | Add to registry, assign approver | IAM team |
| Assignment | Assign users, verify no SoD conflict | Manager |
| Active | Monitor usage, log decisions | System |
| Deactivation | Remove assignments, archive definition | IAM team |

## Common Mistakes

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| Too many admin roles | Admin confusion, privilege creep | Max 5 admin role types |
| Standing super-admin access | Security risk if credentials stolen | Make super-admin JIT |
| No admin scope boundaries | Cross-org data leaks | Always scope by org/dept |
| No admin count limits | Admin explosion | Hard limits per role type |
| No break-glass procedure | System outage if auth fails | Documented break-glass flow |
| Skipping SoD for admins | Fraud, compliance failure | Mandatory SoD for financial ops |
