# Enterprise Org Structure RBAC

## Multi-Org Hierarchy

```
Holding Company (Group)
  ├── Region: APAC
  │   ├── Subsidiary: Singapore Pte Ltd
  │   │   ├── Department: Engineering
  │   │   │   ├── Team: Platform
  │   │   │   ├── Team: Product
  │   │   │   └── Team: QA
  │   │   ├── Department: Sales
  │   │   │   ├── Team: Enterprise
  │   │   │   └── Team: SMB
  │   │   └── Department: Finance
  │   └── Subsidiary: Malaysia Sdn Bhd
  │       ├── Department: Operations
  │       └── Department: HR
  └── Region: EMEA
      ├── Subsidiary: UK Ltd
      │   └── Department: Engineering
      └── Subsidiary: DE GmbH
```

## RBAC Scope Mapping

### Org levels as scopes

```javascript
const ORG_LEVELS = {
  holding: {
    level: 0,
    label: 'Holding Company',
    roles: ['super-admin', 'global-auditor', 'global-report-viewer'],
  },
  region: {
    level: 1,
    label: 'Region',
    roles: ['region-admin', 'region-manager'],
  },
  subsidiary: {
    level: 2,
    label: 'Subsidiary',
    roles: ['org-admin', 'billing-admin', 'support-admin', 'manager'],
  },
  department: {
    level: 3,
    label: 'Department',
    roles: ['manager', 'lead'],
  },
  team: {
    level: 4,
    label: 'Team',
    roles: ['lead', 'member'],
  },
};

// Org tree stored in database
const ORG_TREE = [
  {
    id: 'holding-1',
    name: 'Acme Corp',
    type: 'holding',
    children: [
      {
        id: 'region-apac',
        name: 'APAC',
        type: 'region',
        parentId: 'holding-1',
        children: [
          {
            id: 'sub-sg',
            name: 'Singapore Pte Ltd',
            type: 'subsidiary',
            parentId: 'region-apac',
            children: [
              { id: 'dept-eng', name: 'Engineering', type: 'department', parentId: 'sub-sg' },
              { id: 'dept-sales', name: 'Sales', type: 'department', parentId: 'sub-sg' },
            ],
          },
        ],
      },
    ],
  },
];
```

### Scope resolution

```javascript
function resolveOrgScope(user) {
  const roleDef = ROLE_HIERARCHY.get(user.role);
  if (!roleDef) return { orgIds: [], type: 'none' };

  switch (roleDef.scope) {
    case 'global':
      // Super-admin: all orgs
      return { orgIds: getAllOrgIds(), type: 'global' };

    case 'region':
      // Region admin: orgs in their region
      const region = getUserRegion(user);
      return { orgIds: getRegionOrgIds(region), type: 'region' };

    case 'org':
      // Org admin: their subsidiary + children
      return { orgIds: expandOrgTree(user.orgId), type: 'org' };

    case 'dept':
      // Manager: their department
      return { orgIds: [user.orgId, user.deptId].filter(Boolean), type: 'dept' };

    case 'team':
      // Lead: their team
      return { orgIds: [user.teamId].filter(Boolean), type: 'team' };

    case 'self':
      // Member: own resources only
      return { orgIds: [], type: 'self' };
  }
}

// Expand org tree to include all descendants
function expandOrgTree(orgId) {
  const result = [orgId];
  const children = getChildOrgs(orgId);
  for (const child of children) {
    result.push(...expandOrgTree(child.id));
  }
  return result;
}
```

## Subsidiary Permission Models

### Model A: Fully autonomous subsidiaries
Each subsidiary has its own admin who manages users and roles independently.

```javascript
// Org-admin can create/assign roles within their org
const SUBSIDIARY_ADMIN_PERMS = {
  'user.create':   { scope: 'org' },
  'user.read':     { scope: 'org' },
  'user.update':   { scope: 'org' },
  'user.deactivate': { scope: 'org' },
  'role.assign':   { scope: 'org', // Can only assign roles below admin level
                     constraint: { maxRole: 'manager' }},
  'workspace.*':   { scope: 'org' },
  'billing.read':  { scope: 'org' },
};
```

### Model B: Centralized control with local delegation
Holding company sets global policies; subsidiaries manage day-to-day.

```javascript
// Centralized: holding sets global roles
const GLOBAL_ROLES = ['super-admin', 'global-auditor'];
// Subsidiary: local roles (within global framework)
const LOCAL_ROLES = ['org-admin', 'manager', 'lead', 'member', 'viewer'];

// Permission inheritance from holding → subsidiary
function getAvailableRoles(orgType) {
  switch (orgType) {
    case 'holding':     return GLOBAL_ROLES;
    case 'region':      return [...GLOBAL_ROLES, 'region-admin'];
    case 'subsidiary':  return [...GLOBAL_ROLES, ...LOCAL_ROLES];
    default:            return LOCAL_ROLES;
  }
}
```

### Model C: Shared services model
Some services (IT, Finance, HR) are shared across subsidiaries.

```javascript
// Shared service roles
const SHARED_SERVICE_ROLES = {
  'shared-it': {
    name: 'IT Support',
    scope: 'org', // Access to ALL orgs for IT tasks
    permissions: [
      'user.read',           // Read user info across orgs
      'user.update.profile', // Update profiles
      'workspace.read',      // Read workspace configs
      'infrastructure.*',    // IT infrastructure
    ],
    restrictions: [
      'Cannot access business data',
      'Cannot change roles/permissions',
      'All actions logged with cross-org flag',
    ],
  },
  'shared-finance': {
    name: 'Finance Shared Services',
    scope: 'org',
    permissions: ['billing.*', 'invoice.*', 'payment.*', 'report.financial'],
    restrictions: ['Read-only for non-own subsidiary data'],
  },
  'shared-hr': {
    name: 'HR Shared Services',
    scope: 'org',
    permissions: ['user.create', 'user.read', 'user.update',
                  'org.structure.read', 'report.headcount'],
    restrictions: ['Cannot deactivate users', 'Cannot change roles'],
  },
};
```

## Data Isolation

### Query scoping by org level
```javascript
async function getDocuments(user) {
  const scope = resolveOrgScope(user);

  switch (scope.type) {
    case 'global':
      // No filter — super-admin sees everything
      return prisma.document.findMany();

    case 'region':
      // Filter by region
      return prisma.document.findMany({
        where: { org: { region: { in: scope.orgIds } } },
      });

    case 'org':
      // Filter by org tree (subsidiary + descendants)
      return prisma.document.findMany({
        where: { orgId: { in: scope.orgIds } },
      });

    case 'dept':
      // Filter by department
      return prisma.document.findMany({
        where: { departmentId: { in: scope.orgIds } },
      });

    case 'team':
      // Filter by team
      return prisma.document.findMany({
        where: { teamId: { in: scope.orgIds } },
      });

    case 'self':
      // Own documents only
      return prisma.document.findMany({
        where: { ownerId: user.id },
      });
  }
}
```

### Cross-org data sharing
```javascript
// Explicit cross-org permission grant
async function grantCrossOrgAccess(grantorId, targetUserId, targetOrgId, permissions) {
  // Only super-admin or org-admin can grant cross-org access
  const grantor = await getUser(grantorId);
  if (!['super-admin', 'org-admin'].includes(grantor.role)) {
    throw new Error('Insufficient permissions to grant cross-org access');
  }

  // Create cross-org grant (separate from regular role assignment)
  await prisma.crossOrgGrant.create({
    data: {
      grantorId,
      targetUserId,
      targetOrgId,
      permissions,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      createdAt: new Date(),
    },
  });

  await auditLog('cross_org_grant', {
    grantorId, targetUserId, targetOrgId, permissions
  });
}
```

## Org Structuring Rules

| Rule | Rationale |
|------|-----------|
| Each org unit has exactly one parent | Prevents ambiguous hierarchy |
| Max hierarchy depth: 7 levels | Cognitive limit, performance |
| Roles scope to their org level and below | Admin at holding level sees all subsidiaries |
| Cross-org access requires explicit grant | Prevents data leakage |
| Org admin cannot create another org admin | Prevents privilege escalation |
| Subsidiary structure changes require root approval | Organizational integrity |
| Shared service roles are scoped to function | Least privilege for cross-org roles |
| Org tree changes must be audited | Compliance requirements |

## Migration: Flat Org → Hierarchical RBAC

```
Before: org-admin (one role for all subsidiaries)
            ↓
After:  super-admin (holding level)
        region-admin (regional level)
        org-admin (subsidiary level)
        manager (department level)
        lead (team level)
```

Migration steps:
1. Audit current role assignments.
2. Define org hierarchy in database.
3. Map existing users to new org levels.
4. Create new scoped roles.
5. Migrate admins to appropriate level (not all stay org-admin).
6. Validate access after migration.
7. Remove old flat roles.
