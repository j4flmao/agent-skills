# RBAC Migration & Audit

## Migration: Flat Permissions → RBAC

### Phase 1: Audit current state

```javascript
// Analyze current permission assignments
async function auditCurrentPermissions() {
  // Collect all unique permission sets
  const users = await prisma.user.findMany({
    include: { permissions: true },
  });

  const permissionClusters = {};

  for (const user of users) {
    const permSet = user.permissions
      .map(p => `${p.resource}.${p.action}`)
      .sort()
      .join(',');

    if (!permissionClusters[permSet]) {
      permissionClusters[permSet] = {
        permissions: user.permissions.map(p => `${p.resource}.${p.action}`),
        users: [],
        count: 0,
      };
    }
    permissionClusters[permSet].users.push(user.email);
    permissionClusters[permSet].count++;
  }

  // Sort by frequency
  const sorted = Object.values(permissionClusters)
    .sort((a, b) => b.count - a.count);

  // Output proposed roles
  console.log('=== Proposed Roles (by frequency) ===');
  for (const cluster of sorted) {
    if (cluster.count >= 3) {
      console.log(`Role candidate (${cluster.count} users):`);
      console.log(`  Permissions: ${cluster.permissions.join(', ')}`);
      console.log(`  Example users: ${cluster.users.slice(0, 3).join(', ')}`);
      console.log('');
    }
  }

  // Find outliers — users with unique permission sets
  const outliers = sorted.filter(c => c.count === 1);
  if (outliers.length > 0) {
    console.log('=== Outliers (unique permission sets) ===');
    for (const o of outliers) {
      console.log(`  ${o.users[0]}: ${o.permissions.join(', ')}`);
    }
  }

  return sorted;
}
```

### Phase 2: Design target roles

```javascript
const TARGET_ROLES = [
  {
    name: 'viewer',
    permissions: ['document.read', 'report.read', 'dashboard.read'],
    matchStrategy: (userPerms) => {
      // User who only has read permissions
      return userPerms.every(p => p.endsWith('.read'));
    },
  },
  {
    name: 'editor',
    permissions: ['document.create', 'document.read', 'document.update',
                  'report.read', 'dashboard.read'],
    matchStrategy: (userPerms) => {
      const editorOnly = ['document.create', 'document.update'];
      return editorOnly.every(e => userPerms.includes(e))
        && !userPerms.includes('document.delete');
    },
  },
  {
    name: 'manager',
    permissions: ['document.*', 'report.*', 'user.read', 'user.invite',
                  'dashboard.read', 'workspace.read'],
    matchStrategy: (userPerms) => {
      return userPerms.includes('user.invite')
        || userPerms.includes('document.approve');
    },
  },
];

function assignRole(userPermissions) {
  // Most restrictive first
  const candidates = TARGET_ROLES.filter(r => r.matchStrategy(userPermissions));

  if (candidates.length === 0) {
    // Custom role needed — outlier
    return { role: null, reason: 'No matching role', permissions: userPermissions };
  }

  // Pick the most restrictive match
  return { role: candidates[0].name, reason: 'Automatically matched' };
}
```

### Phase 3: Dry run

```javascript
async function dryRunMigration() {
  const users = await prisma.user.findMany({
    include: { permissions: true },
  });

  const results = {
    matched: 0,
    unmatched: 0,
    conflicts: [],
    stats: {},
  };

  for (const user of users) {
    const permSet = user.permissions.map(p => `${p.resource}.${p.action}`);
    const assignment = assignRole(permSet);

    if (assignment.role) {
      results.matched++;
      results.stats[assignment.role] = (results.stats[assignment.role] || 0) + 1;
    } else {
      results.unmatched++;
      results.conflicts.push({
        user: user.email,
        permissions: permSet,
        reason: assignment.reason,
      });
    }
  }

  console.log(`Matched: ${results.matched}`);
  console.log(`Unmatched: ${results.unmatched}`);
  console.log('Role distribution:', results.stats);

  if (results.conflicts.length > 0) {
    console.log('\nManual review needed:');
    for (const c of results.conflicts) {
      console.log(`  ${c.user}: [${c.permissions.join(', ')}]`);
    }
  }

  return results;
}
```

### Phase 4: Execute migration

```sql
-- Migration SQL
BEGIN;

-- 1. Create role table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create permission table
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id),
    permission VARCHAR(100) NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- 3. Create user-role assignment
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,      -- NULL = permanent
    PRIMARY KEY (user_id, role_id)
);

-- 4. Insert roles
INSERT INTO roles (name, description) VALUES
    ('viewer', 'Read-only access'),
    ('editor', 'Create and edit content'),
    ('manager', 'Manage team and content'),
    ('org-admin', 'Organization administration');

-- 5. Assign roles based on current permissions
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
    u.id,
    r.id,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM users u
CROSS JOIN roles r
WHERE r.name = CASE
    WHEN u.permissions @> ARRAY['user.invite'] THEN 'manager'
    WHEN u.permissions @> ARRAY['document.update'] THEN 'editor'
    ELSE 'viewer'
END;

-- 6. Keep old permissions table for audit
-- CREATE TABLE permissions_archive AS SELECT * FROM user_permissions;

-- 7. Drop old permissions table
-- DROP TABLE user_permissions;

COMMIT;
```

## Privilege Creep Detection

```javascript
// Detect users who accumulated more permissions than their role provides
async function detectPrivilegeCreep() {
  const users = await prisma.user.findMany({
    include: {
      roles: { include: { role: true } },
      directPermissions: true,
    },
  });

  const issues = [];

  for (const user of users) {
    const rolePerms = new Set();
    for (const ur of user.roles) {
      const perms = await prisma.rolePermission.findMany({
        where: { roleId: ur.roleId },
      });
      perms.forEach(p => rolePerms.add(p.permission));
    }

    const directPerms = user.directPermissions.map(p => `${p.resource}.${p.action}`);

    // Direct permissions that aren't in role
    const excess = directPerms.filter(p => !rolePerms.has(p));
    if (excess.length > 0) {
      issues.push({
        user: user.email,
        role: user.roles.map(r => r.role.name).join(', '),
        excessPermissions: excess,
        risk: assessExcessRisk(excess),
      });
    }
  }

  // Flag high-risk issues
  const HIGH_RISK_ACTIONS = ['delete', 'export', 'deactivate', 'admin'];
  for (const issue of issues) {
    if (issue.excessPermissions.some(p =>
      HIGH_RISK_ACTIONS.some(r => p.includes(r))
    )) {
      console.log(`HIGH RISK: ${issue.user} has excess: ${issue.excessPermissions.join(', ')}`);
    }
  }

  return issues;
}
```

## Quarterly Access Certification

```javascript
async function createCertificationCampaign() {
  const campaign = await prisma.certificationCampaign.create({
    data: {
      name: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()} Access Review`,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
  });

  // Create certification tasks for each user
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  for (const user of users) {
    // Assign their manager as reviewer
    const reviewer = user.managerId
      ? user.managerId
      : await findOrgAdmin(user.orgId);

    await prisma.certificationTask.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        reviewerId: reviewer,
        currentRoles: user.roles.map(r => r.role.name),
        status: 'pending',
        dueDate: campaign.dueDate,
      },
    });
  }

  return campaign;
}

// Manager certifies or revokes
async function certifyAccess(taskId, reviewerId, decision, notes) {
  const task = await prisma.certificationTask.findUnique({
    where: { id: taskId },
  });

  if (task.reviewerId !== reviewerId) {
    throw new Error('Not authorized to certify this user');
  }

  await prisma.certificationTask.update({
    where: { id: taskId },
    data: {
      status: decision, // 'certified' or 'revoked'
      reviewedAt: new Date(),
      notes,
    },
  });

  if (decision === 'revoked') {
    // Remove all roles
    await prisma.userRole.deleteMany({
      where: { userId: task.userId },
    });

    // Notify user
    await notifyUser(task.userId, {
      type: 'access_revoked',
      message: `Access reviewed by ${reviewerId}: ${notes}`,
    });
  }
}
```

## Automated Remediation

```javascript
// Weekly cron: detect and auto-remediate
async function weeklyAccessReview() {
  // 1. Detect dormant users (>90 days no login)
  const dormant = await prisma.user.findMany({
    where: {
      lastLoginAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      roles: { some: {} },
    },
  });

  for (const user of dormant) {
    await notifyManager(user, `${user.email} has not logged in for 90 days`);
    // Auto-downgrade to viewer after 120 days
    if (Date.now() - user.lastLoginAt.getTime() > 120 * 24 * 60 * 60 * 1000) {
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
      await prisma.userRole.create({
        data: { userId: user.id, roleId: viewerRole.id, assignedBy: 'system' },
      });
    }
  }

  // 2. Detect over-privileged service accounts
  const serviceAccounts = await prisma.serviceAccount.findMany({
    where: {
      lastUsedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    include: { roles: true },
  });

  for (const sa of serviceAccounts) {
    if (sa.roles.some(r => ['admin', 'super-admin'].includes(r.role.name))) {
      await notifySecurityTeam(`Service account ${sa.name} unused for 30 days with admin role`);
    }
  }
}
```

## RBAC Metrics & Dashboard

```javascript
async function getRBACMetrics() {
  const totalUsers = await prisma.user.count();
  const usersWithRoles = await prisma.user.count({
    where: { roles: { some: {} } },
  });

  const roleDistribution = await prisma.userRole.groupBy({
    by: ['roleId'],
    _count: true,
  });

  const excessPermissions = await prisma.directPermission.count({
    where: {
      user: {
        roles: { some: {} },
      },
    },
  });

  return {
    coverage: `${((usersWithRoles / totalUsers) * 100).toFixed(1)}%`,
    roles: Object.fromEntries(
      roleDistribution.map(r => [r.roleId, r._count])
    ),
    excessPermissions,
    lastCertification: await getLastCertificationDate(),
    recommendations: [
      excessPermissions > 0
        ? `${excessPermissions} users have excess permissions. Review.`
        : null,
      totalUsers - usersWithRoles > 0
        ? `${totalUsers - usersWithRoles} users have no role. Assign.` : null,
    ].filter(Boolean),
  };
}
```

## Migration checklist

- [ ] Current permissions audited and clustered.
- [ ] Target roles defined with clear ownership.
- [ ] SoD conflicts identified and resolved.
- [ ] Dry run completed — all users mapped to roles.
- [ ] Outliers reviewed manually.
- [ ] Migration SQL reviewed and tested on staging.
- [ ] Old permissions archived for audit trail.
- [ ] Users notified of role changes.
- [ ] Access certification scheduled for 30 days post-migration.
- [ ] Privilege creep detection set up as weekly cron.
- [ ] Dashboard metrics configured.
