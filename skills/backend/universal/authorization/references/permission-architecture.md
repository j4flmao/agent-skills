# Permission Architecture

## Permission Levels

```
Global (platform-wide)
  └── Organization / Tenant
        └── Workspace / Project
              └── Resource / Entity
                    └── Field / Attribute
```

Each level scopes the permission:

| Level | Example | Scope Filter |
|-------|---------|-------------|
| Global | `export.all_data` | No filter |
| Org | `workspace.create` | `WHERE org_id = :current_org` |
| Workspace | `workspace.settings.read` | `WHERE ws_id = :current_ws` |
| Resource | `document.delete` | `WHERE doc_id = :target` |
| Field | `user.salary.read` | Column-level |

## Granularity Spectrum

```
Coarse                          Fine
  │                              │
  v                              v
role:* ── role:action ── role:action:condition
  │          │                   │
workspace.*  workspace.read      workspace.read WHERE dept matches
```

### Coarse
```javascript
// One permission covers everything
permissions: ['admin.*']
// Pro: Fast to check, easy to understand
// Con: No precision, all-or-nothing
```

### Medium (recommended default)
```javascript
// Action-per-resource
permissions: ['workspace.read', 'workspace.write', 'workspace.delete']
// Pro: Balanced
// Con: Still doesn't cover conditions
```

### Fine
```javascript
// Condition-based
permissions: ['workspace.read:dept_match', 'workspace.write:own_only']
// Pro: Maximum precision
// Con: Complex to manage, slower to evaluate
```

## Permission Naming Convention

```
{resource}.{action}[.{sub_action}][:{condition_tag}]

Examples:
  document.read
  document.write
  document.delete
  document.export.pdf
  document.share.external:dept_only
  workspace.manage.billing
  user.admin.deactivate
  report.generate.scheduled:premium_tier_only
  *
```

| Component | Required | Description |
|-----------|----------|-------------|
| `resource` | Yes | The entity/domain being protected |
| `action` | Yes | The operation: create, read, update, delete, execute, approve, export, share, manage |
| `sub_action` | No | Further refinement of the action |
| `condition_tag` | No | Reference to an ABAC condition that further restricts |

## Permission Types

### Functional permissions
Control what features a user can access:
```javascript
'dashboard.read'
'report.generate'
'integration.configure'
'export.data'
```

### Data permissions
Control what data a user can see:
```javascript
'document.read'              // Can they see the document at all?
'document.read.sensitive'   // Can they see sensitive fields?
'user.list'                  // Can they see the user directory?
```

### Administrative permissions
Control management functions:
```javascript
'workspace.manage'
'user.invite'
'user.role.change'
'billing.view'
'audit.log.read'
```

## Permission Registration

Every permission in the system must be registered:

```javascript
const PERMISSION_REGISTRY = {
  // Metadata
  version: '1.0.0',
  updatedAt: '2026-05-25',

  // Permissions organized by domain
  document: {
    read: {
      description: 'View document content and metadata',
      defaultRoles: ['admin', 'manager', 'editor', 'viewer'],
      notes: 'Respects document classification for fine-grained control',
    },
    write: {
      description: 'Modify document content',
      defaultRoles: ['admin', 'manager', 'editor'],
      notes: 'ABAC condition: must be in same department as document',
    },
    delete: {
      description: 'Permanently delete document',
      defaultRoles: ['admin', 'manager'],
      abacRequired: true,
      notes: 'Requires confirmation and audit',
    },
    share: {
      description: 'Share document with other users',
      defaultRoles: ['admin', 'manager', 'editor'],
      subPermissions: {
        internal: { description: 'Share within org' },
        external: { description: 'Share outside org', defaultRoles: ['admin'] },
      },
    },
  },

  workspace: {
    create: { description: 'Create new workspace', defaultRoles: ['admin', 'manager'] },
    read:   { description: 'View workspace',         defaultRoles: ['admin', 'manager', 'editor', 'viewer'] },
    delete: { description: 'Delete workspace',        defaultRoles: ['admin'] },
  },
};
```

## Permission Evaluation Order

```javascript
function evaluateAccess(user, action, resource, context) {
  // 1. Super admin bypass
  if (user.role === 'super-admin') return true;

  // 2. Check role-based permissions
  const rolePerms = getRolePermissions(user.role);
  if (!hasRequiredPermission(rolePerms, action)) return false;

  // 3. Check scope
  if (!checkScope(user, resource)) return false;

  // 4. Check ABAC conditions (if any)
  const conditions = getConditions(action, resource.type);
  if (conditions && !evaluateAll(conditions, { user, resource, context })) {
    return false;
  }

  // 5. Check active restrictions
  if (isUserSuspended(user)) return false;
  if (isResourceArchived(resource)) return false;

  return true;
}
```

## Permission Caching Strategy

| Cache Type | TTL | Invalidated By |
|------------|-----|----------------|
| Role → permissions mapping | 5 min | Role definition change |
| User → roles mapping | 5 min | Role assignment change |
| User scope info | 15 min | Org/department change |
| ABAC evaluation | Do not cache | Context varies per request |

## Anti-Patterns

| Anti-pattern | Why It Hurts | Fix |
|-------------|--------------|-----|
| Per-user permissions | Untrackable, unmanageable | Assign roles, use ABAC for exceptions |
| Permission inheritance bypass | Breaks audit trail | Always go through role hierarchy |
| UI-only permission checks | Security by obscurity | Must enforce server-side |
| Flat role without hierarchy | Role explosion (50+ roles) | Design hierarchy, max 20 roles |
| Hardcoded user IDs in checks | Non-portable, fragile | Use role + attribute system |
| One role per user per session | Limits flexibility | Allow multiple role activation |
