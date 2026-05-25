# Role Engineering

## Role Design Process

```
Phase 1: Discovery ──> Phase 2: Modeling ──> Phase 3: Definition ──> Phase 4: Implementation ──> Phase 5: Maintenance
```

### Phase 1: Discovery

Interview stakeholders and inventory every action in the system.

```yaml
# Action inventory template
actions:
  - resource: document
    operations:
      - create: "Create a new document"
      - read: "View document content and metadata"
      - update: "Modify document content"
      - delete: "Permanently remove document"
      - approve: "Approve document for publication"
      - share: "Share document with other users"
      - export: "Download document as PDF"

  - resource: workspace
    operations:
      - create: "Create new workspace"
      - read: "View workspace details"
      - update: "Modify workspace settings"
      - delete: "Delete workspace and all contents"
      - invite: "Invite users to workspace"

  - resource: user
    operations:
      - create: "Create new user account"
      - read: "View user profile"
      - update: "Modify user profile"
      - deactivate: "Suspend user account"
      - role_change: "Change user role"
```

### Phase 2: Modeling

Group job functions into role candidates:

```yaml
# Role candidates derived from job functions
role_candidates:
  viewer:
    job_functions:
      - "Browse documents"
      - "Read workspace content"
    derived_permissions:
      - document.read
      - workspace.read

  editor:
    job_functions:
      - "Create and edit documents"
      - "Manage own documents"
    derived_permissions:
      - document.create
      - document.read
      - document.update
      - workspace.read

  manager:
    job_functions:
      - "Manage team documents"
      - "Approve documents"
      - "Invite team members"
      - "View reports"
    derived_permissions:
      - document.create
      - document.read
      - document.update
      - document.approve
      - workspace.read
      - workspace.invite
      - report.read
      - report.create
```

### Phase 3: Definition

Define each role with precise permissions:

```yaml
viewer:
  description: "Read-only access to shared resources"
  category: functional
  scope: self
  permissions:
    - document.read
    - workspace.read
  constraints: []
  typical_users: ["External collaborators", "Stakeholders", "Clients"]

editor:
  description: "Create and edit content within their scope"
  category: functional
  scope: team
  permissions:
    - document.create
    - document.read
    - document.update
    - workspace.read
  constraints:
    - "Cannot delete resources"
    - "Cannot change permissions"
  typical_users: ["Team members", "Content creators"]

manager:
  description: "Manage team resources and members"
  category: functional
  scope: department
  permissions:
    - document.*
    - workspace.*
    - user.read
    - user.invite
    - report.*
  constraints:
    - "Cannot delete workspace"
    - "Cannot change user roles above viewer"
  typical_users: ["Team leads", "Department heads"]
```

### Phase 4: Implementation

Translate role definitions into code:

```javascript
const ROLE_DEFINITIONS = [
  {
    name: 'viewer',
    type: 'functional',
    scope: 'self',
    permissions: ['document.read', 'workspace.read'],
    maxAssignees: null, // no limit
    approvalRequired: 'manager',
    sodConflicts: [],
  },
  {
    name: 'editor',
    type: 'functional',
    scope: 'team',
    permissions: ['document.create', 'document.read', 'document.update', 'workspace.read'],
    maxAssignees: null,
    approvalRequired: 'manager',
    sodConflicts: [],
  },
  {
    name: 'manager',
    type: 'functional',
    scope: 'department',
    permissions: ['document.*', 'workspace.*', 'user.read', 'user.invite', 'report.*'],
    maxAssignees: null,
    approvalRequired: 'org-admin',
    sodConflicts: ['auditor'],
  },
];
```

### Phase 5: Maintenance

```javascript
// Periodic role review
async function reviewRoles() {
  for (const role of ROLE_DEFINITIONS) {
    const assignees = await getRoleAssignees(role.name);
    const usage = await getPermissionUsage(role.permissions);

    console.log(`${role.name}: ${assignees.length} users`);
    console.log(`  Usage rate: ${usage.used}/${usage.total} permissions`);

    if (usage.rate < 0.3) {
      console.log(`  ⚠ Low usage: consider merging or removing role`);
    }
    if (assignees.length === 0) {
      console.log(`  ⚠ No assignees: consider archiving role`);
    }
  }
}
```

## Naming Conventions

### Role names
| Pattern | Examples | When |
|---------|----------|------|
| Single word | `admin`, `editor`, `viewer` | Simple hierarchy |
| Scope-prefixed | `org-admin`, `global-auditor` | Multi-tenant |
| Department-prefixed | `eng-lead`, `sales-manager` | Departmental roles |
| Function-suffixed | `billing-admin`, `support-agent` | Task-specific |

### Permission names
```
{resource}:{action}[.{sub_action}]
```

Examples:
- `document:read`
- `document:write`
- `document:delete`
- `workspace:manage`
- `user:admin:deactivate`
- `report:generate:scheduled`

## Role Typology

| Type | Description | Examples | Review Cadence |
|------|-------------|----------|----------------|
| **Functional** | Day-to-day job functions | viewer, editor, manager | Quarterly |
| **Administrative** | System management | org-admin, billing-admin | Monthly |
| **Service** | Machine-to-machine | deploy-bot, integration-svc | Quarterly |
| **Emergency** | Break-glass situations | emergency-admin | Per-use |
| **Temporary** | Project/contract-based | consultant, intern | Per-assignment |

## Role Lifecycle

```
Created ──> Active ──> Deprecated ──> Archived
               │
          (periodic review)
```

```yaml
role_lifecycle:
  created:
    trigger: "Security team approval"
    actions:
      - "Register in role catalog"
      - "Define permissions"
      - "Document purpose"
    approvers: ["IAM team lead", "Security architect"]

  active:
    trigger: "Role assigned to users"
    actions:
      - "Monitor usage metrics"
      - "Quarterly access certification"
    reviews: "Every 90 days"

  deprecated:
    trigger: "Role no longer needed"
    actions:
      - "No new assignments"
      - "Notify existing assignees"
      - "Set deprecation date"
    notice_period: "30 days"

  archived:
    trigger: "All assignments removed"
    actions:
      - "Remove from active registry"
      - "Archive in historical registry"
      - "Retain for audit (7 years)"
    retention: "7 years from archive date"
```

## Role Mining

Discover roles by analyzing existing access patterns:

```javascript
async function mineRoles() {
  // Collect all current user-permission assignments
  const assignments = await prisma.permissionAssignment.findMany();

  // Group users by their permission sets
  const groups = {};
  for (const a of assignments) {
    const key = [...a.permissions].sort().join(',');
    if (!groups[key]) groups[key] = { permissions: a.permissions, users: [] };
    groups[key].users.push(a.userId);
  }

  // Propose roles for groups with 3+ users
  for (const [permKey, group] of Object.entries(groups)) {
    if (group.users.length >= 3) {
      console.log(`Proposed role: [${group.permissions.join(', ')}]`);
      console.log(`  Users: ${group.users.length}`);
    }
  }
}
```

## Anti-Patterns

| Anti-pattern | Problem | Solution |
|-------------|---------|----------|
| **Role explosion** | Hundreds of similar roles | Use hierarchy + attributes |
| **Super-role** | One role with everything | Split into functional + admin |
| **Permission creep** | Roles gain permissions over time | Regular review, remove unused |
| **Role-per-person** | Unique role for each user | Use attributes for exceptions |
| **Magic role names** | Unclear naming | Documented naming convention |
| **Orphan roles** | No active members | Quarterly cleanup |
| **Hidden admin** | Non-admin with admin powers | Audit trails, SoD checks |
